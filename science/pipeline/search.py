"""PARALLAX X terrain-fingerprint search — implements science/prereg.md exactly.

Stages:
  1. Mars fingerprint from the CTX DTM target polygon (local metric grid, 30 m, common smoothing)
  2. Earth windows from NASADEM tiles (per-tile AEQD, 30 m, common smoothing), labelled by domain/site
  3. Normalisation via ECDF of pooled null-window samples (seed 42), W1 per feature, D and B0
  4. Percentiles vs null, site medians, decision rule, D1 candidate clusters
  5. Export results + comparison heightfields

Usage:  python science/pipeline/search.py [--window-px 333] [--tag primary]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
from pyproj import CRS, Transformer
from rasterio.warp import Resampling, calculate_default_transform, reproject
from shapely.geometry import Point, Polygon, shape
from shapely.prepared import prep

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import config as cfg  # noqa: E402
from acquire import tiles_from_box  # noqa: E402
from common import OUT, RAW, WORK, masked_gaussian, plane_detrend  # noqa: E402
from features import all_features, quantiles  # noqa: E402

FEATS = ["F1", "F2", "F3", "F4", "F5"]
NQ = cfg.N_QUANTILES

SITES = {
    "P1": dict(name="Lut Kaluts yardangs, Iran", role="positive",
               poly=[(57.80, 30.80), (58.55, 30.80), (58.75, 30.00), (58.35, 30.00)],
               citation="Ehsani & Quiel 2008, Remote Sensing of Environment 112:3284-3294, doi:10.1016/j.rse.2008.04.007"),
    "P2": dict(name="Qaidam Basin yardangs, China", role="positive",
               poly=[(92.0, 38.0), (93.0, 38.0), (93.0, 38.45), (92.0, 38.45)],
               citation="Xiao et al. 2017, Earth-Science Reviews 164:84-101, doi:10.1016/j.earscirev.2016.11.003; Wang et al. 2018, JGR Planets 123:2336-2364, doi:10.1029/2018JE005719"),
    "P3": dict(name="Puna ignimbrite yardangs, Argentina (low-confidence location)", role="positive",
               poly=[(-67.50, -26.65), (-67.20, -26.65), (-67.20, -26.45), (-67.50, -26.45)],
               citation="de Silva et al. 2010, Planetary and Space Science 58:459-471, doi:10.1016/j.pss.2009.10.002",
               note="Decametre-scale yardangs may be unresolvable at 30 m; location from general knowledge, needs verification."),
    "N1": dict(name="Namib Sand Sea linear dunes (control)", role="negative",
               poly=[(15.02, -24.05), (15.30, -24.05), (15.30, -25.90), (15.02, -25.90)],
               citation="Process-different control: aeolian depositional linear dunes (identified in NASADEM hillshade)"),
    "N2": dict(name="Kalpin fold-thrust ridges, China (control)", role="negative",
               poly=[(78.00, 40.00), (78.00, 40.45), (78.70, 40.80), (79.40, 40.85), (79.40, 40.70), (78.95, 40.45), (78.40, 40.05)],
               citation="Process-different control: tectonic strike/thrust ridges (identified in NASADEM hillshade)"),
}
GROUP_SITE = {"D2_lut": "P1", "P2_qaidam": "P2", "P3_puna": "P3", "N1_namib": "N1", "N2_kalpin": "N2"}
SEARCH_GROUPS = {"D1_gobi": "D1", "D2_lut": "D2"}

MARS_POLY_LONLAT = [(177.742, -12.3671), (178.1952, -12.3432), (178.1952, -12.4761), (177.742, -12.4829)]
MARS_R = cfg.MARS_RADIUS_M


@dataclass
class Win:
    id: str
    group: str
    domain: str
    site: str
    in_null: bool
    lon: float
    lat: float
    tile: str
    r: int
    c: int
    gi: int
    gj: int
    valid: float
    q: dict = field(default_factory=dict)       # raw quantiles per feature
    sample: dict = field(default_factory=dict)  # raw random sample per feature (for ECDF)


# ----------------------------------------------------------------------------------------- Mars
def mars_grid():
    """CTX -> local equidistant cylindrical (true scale at polygon centre) at 30 m, masked, smoothed."""
    lon_c = float(np.mean([p[0] for p in MARS_POLY_LONLAT]))
    lat_c = float(np.mean([p[1] for p in MARS_POLY_LONLAT]))
    dst_crs = CRS.from_proj4(f"+proj=eqc +lat_ts={lat_c} +lat_0=0 +lon_0={lon_c} +R={MARS_R} +units=m +no_defs")
    with rasterio.open(RAW / "ctx_mff_dtm.tif") as src:
        z = src.read(1).astype(np.float32)
        z[z == src.nodata] = np.nan
        tr, w, h = calculate_default_transform(src.crs, dst_crs, src.width, src.height, *src.bounds, resolution=cfg.GRID_M)
        dst = np.full((h, w), np.nan, np.float32)
        reproject(z, dst, src_transform=src.transform, src_crs=src.crs, src_nodata=np.nan,
                  dst_transform=tr, dst_crs=dst_crs, dst_nodata=np.nan, resampling=Resampling.average)
    zsm = masked_gaussian(dst.astype(np.float64), cfg.COMMON_SMOOTH_SIGMA_PX)
    # polygon mask in the local grid
    geo = CRS.from_proj4(f"+proj=longlat +R={MARS_R} +no_defs")
    t = Transformer.from_crs(geo, dst_crs, always_xy=True)
    poly_xy = [t.transform(lo, la) for lo, la in MARS_POLY_LONLAT]
    inv = ~tr
    poly_px = Polygon([inv * xy for xy in poly_xy])
    rr, cc = np.indices(zsm.shape)
    pp = prep(poly_px)
    mask = np.array([pp.contains(Point(c + 0.5, r + 0.5)) for r, c in zip(rr.ravel(), cc.ravel())]).reshape(zsm.shape)
    # sanity: physical size of a pixel on the sphere at the centre (east-west and north-south)
    return zsm, mask, tr, dst_crs, (lon_c, lat_c), poly_px


# ---------------------------------------------------------------------------------------- Earth
DEM = "nasadem"  # or "glo30" (independent-DEM cross-check); set from --dem


def earth_tile(tile: str):
    """Reproject one Earth DEM tile to an AEQD grid centred on the tile, 30 m; cached as .npz."""
    sub = "tiles" if DEM == "nasadem" else f"tiles_{DEM}"
    cache = WORK / sub / f"{tile}.npz"
    path = RAW / DEM / f"{tile.lower()}.tif"
    with rasterio.open(path) as src:
        b = src.bounds
        lon_c, lat_c = (b.left + b.right) / 2, (b.bottom + b.top) / 2
        dst_crs = CRS.from_proj4(f"+proj=aeqd +lat_0={lat_c} +lon_0={lon_c} +datum=WGS84 +units=m +no_defs")
        tr, w, h = calculate_default_transform(src.crs, dst_crs, src.width, src.height, *b, resolution=cfg.GRID_M)
        if cache.exists():
            d = np.load(cache)
            return d["z"], tr, dst_crs
        z = src.read(1).astype(np.float32)
        z[z == src.nodata] = np.nan
        z[z < -1000] = np.nan
        dst = np.full((h, w), np.nan, np.float32)
        reproject(z, dst, src_transform=src.transform, src_crs=src.crs, src_nodata=np.nan,
                  dst_transform=tr, dst_crs=dst_crs, dst_nodata=np.nan, resampling=Resampling.average)
    zsm = masked_gaussian(dst.astype(np.float64), cfg.COMMON_SMOOTH_SIGMA_PX).astype(np.float32)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.savez(cache, z=zsm)
    return zsm, tr, dst_crs


def load_mongolia():
    gj = json.loads((RAW / "ne_50m_admin_0_countries.geojson").read_text(encoding="utf-8"))
    for f in gj["features"]:
        p = f["properties"]
        if p.get("ADMIN") == "Mongolia" or p.get("NAME") == "Mongolia":
            return prep(shape(f["geometry"]))
    raise RuntimeError("Mongolia not found in Natural Earth file")


def earth_windows(win_px: int, rng: np.random.Generator):
    mongolia = load_mongolia()
    site_polys = {k: prep(Polygon(v["poly"])) for k, v in SITES.items()}
    wins: list[Win] = []
    for group, boxes in cfg.TILE_GROUPS.items():
        tiles = [t for b in boxes for t in tiles_from_box(*b)]
        for tile in tiles:
            t0 = time.time()
            z, tr, crs = earth_tile(tile)
            inv = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
            H, W = z.shape
            n_kept = 0
            for gi, r in enumerate(range(0, H - win_px + 1, win_px)):
                for gj, c in enumerate(range(0, W - win_px + 1, win_px)):
                    blk = z[r : r + win_px, c : c + win_px]
                    vf = float(np.isfinite(blk).mean())
                    if vf < 1 - cfg.MAX_INVALID_FRAC:
                        continue
                    x, y = tr * (c + win_px / 2, r + win_px / 2)
                    lon, lat = inv.transform(x, y)
                    pt = Point(lon, lat)
                    site = ""
                    for sid, sp in site_polys.items():
                        if sp.contains(pt):
                            site = sid
                    if group in SEARCH_GROUPS:
                        domain = SEARCH_GROUPS[group]
                        if domain == "D1" and not mongolia.contains(pt):
                            continue
                        if group == "D2_lut" and site not in ("", "P1"):
                            site = ""
                    else:
                        if site != GROUP_SITE[group]:
                            continue  # control groups: only windows inside their polygon
                        domain = group.split("_")[0]
                    in_null = group in SEARCH_GROUPS and site != "P1"
                    w = Win(id=f"{tile}_{gi}_{gj}", group=group, domain=domain, site=site, in_null=in_null,
                            lon=float(lon), lat=float(lat), tile=tile, r=r, c=c, gi=gi, gj=gj, valid=vf)
                    f = all_features(blk.astype(np.float64), cfg.GRID_M, cfg)
                    for k in FEATS:
                        v = f[k]
                        w.q[k] = quantiles(v, NQ)
                        w.sample[k] = rng.choice(v, size=min(500, v.size), replace=False) if v.size else np.array([])
                    wins.append(w)
                    n_kept += 1
            print(f"  {group:10s} {tile}: {n_kept:4d} windows ({time.time()-t0:.1f}s)", flush=True)
    return wins


# ------------------------------------------------------------------------------------- scoring
def ecdf_maps(null_wins: list[Win]):
    maps = {}
    for k in FEATS:
        pooled = np.sort(np.concatenate([w.sample[k] for w in null_wins if w.sample[k].size]))
        maps[k] = pooled
    return maps


def to_norm(vals: np.ndarray, pooled: np.ndarray) -> np.ndarray:
    # mid-rank ECDF in [0,1]
    lo = np.searchsorted(pooled, vals, side="left")
    hi = np.searchsorted(pooled, vals, side="right")
    return (lo + hi) / (2.0 * pooled.size)


def score(wins, mars_q, maps):
    mars_n = {k: to_norm(mars_q[k], maps[k]) for k in FEATS}
    for w in wins:
        w1 = {k: float(np.mean(np.abs(to_norm(w.q[k], maps[k]) - mars_n[k]))) for k in FEATS}
        w.w1 = w1
        w.D = float(np.mean([w1[k] for k in FEATS]))
        w.B0 = w1["F2"]


def percentiles(wins, attr):
    null = np.array([getattr(w, attr) for w in wins if w.in_null])
    for w in wins:
        d = getattr(w, attr)
        gt = np.sum(null > d)
        eq = np.sum(null == d)
        setattr(w, "pct_" + attr, float(100.0 * (gt + 0.5 * eq) / null.size))
    return null.size


def site_summary(wins):
    out = []
    for sid, s in SITES.items():
        ws = [w for w in wins if w.site == sid]
        pf = [w.pct_D for w in ws]
        pb = [w.pct_B0 for w in ws]
        out.append({
            "id": sid, "name": s["name"], "role": s["role"], "polygon": s["poly"], "n_windows": len(ws),
            "median_pct_full": float(np.median(pf)) if ws else None,
            "median_pct_b0": float(np.median(pb)) if ws else None,
            "best_pct_full": float(np.max(pf)) if ws else None,
            "citation": s["citation"], **({"note": s["note"]} if "note" in s else {}),
        })
    return out


def decide(sites):
    by = {s["id"]: s for s in sites}
    pos = [by[k] for k in ("P1", "P2", "P3")]
    pos_full = [s["median_pct_full"] if s["median_pct_full"] is not None else 0.0 for s in pos]
    pos_b0 = [s["median_pct_b0"] if s["median_pct_b0"] is not None else 0.0 for s in pos]
    n_hi = sum(p >= cfg.PASS_PERCENTILE for p in pos_full)
    mean_full, mean_b0 = float(np.mean(pos_full)), float(np.mean(pos_b0))
    n1, n2 = by["N1"]["median_pct_full"], by["N2"]["median_pct_full"]
    crit = [
        {"id": "a", "description": f"At least 2 of 3 published yardang sites have median window percentile >= {cfg.PASS_PERCENTILE:.0f}",
         "value": f"{n_hi} of 3 (" + ", ".join(f"{s['id']} {p:.1f}" for s, p in zip(pos, pos_full)) + ")", "pass": n_hi >= 2},
        {"id": "b", "description": "Mean positive percentile with the full fingerprint exceeds the slope-only baseline (B0)",
         "value": f"full {mean_full:.1f} vs B0 {mean_b0:.1f}", "pass": mean_full > mean_b0},
        {"id": "c", "description": "Mean positive percentile exceeds both process-different controls (linear dunes, thrust ridges)",
         "value": f"positives {mean_full:.1f} vs dunes {n1 if n1 is None else round(n1,1)}, ridges {n2 if n2 is None else round(n2,1)}",
         "pass": (n1 is not None and n2 is not None and mean_full > n1 and mean_full > n2)},
    ]
    missing = [s["id"] for s in pos if s["n_windows"] == 0]
    return {"pass": all(c["pass"] for c in crit), "criteria": crit, "missing_sites": missing,
            "mean_pos_full": mean_full, "mean_pos_b0": mean_b0}


def clusters(wins, win_km):
    d1 = {(w.tile, w.gi, w.gj): w for w in wins if w.domain == "D1"}
    seen, out = set(), []
    seeds = sorted([w for w in d1.values() if w.pct_D >= 95], key=lambda w: -w.pct_D)
    for s in seeds:
        key = (s.tile, s.gi, s.gj)
        if key in seen:
            continue
        comp, dq = [], deque([key])
        seen.add(key)
        while dq:
            k = dq.popleft()
            comp.append(d1[k])
            t, i, j = k
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    nk = (t, i + di, j + dj)
                    if nk in d1 and nk not in seen and d1[nk].pct_D >= 90:
                        seen.add(nk)
                        dq.append(nk)
        best = max(comp, key=lambda w: w.pct_D)
        out.append({"windows": comp, "best": best})
    out.sort(key=lambda c: -c["best"].pct_D)
    res = []
    for n, c in enumerate(out[:5], 1):
        ws = c["windows"]
        res.append({
            "id": f"G-{n}", "centroid": [float(np.mean([w.lon for w in ws])), float(np.mean([w.lat for w in ws]))],
            "n_windows": len(ws), "area_km2": float(len(ws) * win_km ** 2),
            "best_pct": c["best"].pct_D, "median_pct": float(np.median([w.pct_D for w in ws])),
            "best_window": c["best"].id,
            "label": "morphometric candidate — terrain geometry only; not described as a Mars analog in literature we searched; requires imagery, geology and field checks",
        })
    return res, len(out)


# ---------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--window-px", type=int, default=333)
    ap.add_argument("--tag", default="primary")
    ap.add_argument("--dem", default="nasadem", choices=["nasadem", "glo30"])
    a = ap.parse_args()
    global DEM
    DEM = a.dem
    t0 = time.time()
    rng = np.random.default_rng(42)
    print("Mars fingerprint ...", flush=True)
    mz, mmask, mtr, mcrs, mcentre, mpoly = mars_grid()
    mf = all_features(mz, cfg.GRID_M, cfg, mask=mmask)
    mars_q = {k: quantiles(mf[k], NQ) for k in FEATS}
    print("  Mars samples:", {k: int(v.size) for k, v in mf.items()}, flush=True)
    print("Earth windows ...", flush=True)
    wins = earth_windows(a.window_px, rng)
    null = [w for w in wins if w.in_null]
    maps = ecdf_maps(null)
    score(wins, mars_q, maps)
    n_null = percentiles(wins, "D")
    percentiles(wins, "B0")
    sites = site_summary(wins)
    dec = decide(sites)
    win_km = a.window_px * cfg.GRID_M / 1000
    cands, n_clusters = clusters(wins, win_km)
    OUT.mkdir(parents=True, exist_ok=True)
    payload = {
        "tag": a.tag, "window_px": a.window_px, "window_km": win_km, "run_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "runtime_s": round(time.time() - t0, 1), "n_null": n_null,
        "null_by_domain": {d: sum(1 for w in null if w.domain == d) for d in ("D1", "D2")},
        "mars": {"centre_lonlat": mcentre, "n_samples": {k: int(v.size) for k, v in mf.items()},
                 "quantiles_raw": {k: mars_q[k].tolist() for k in FEATS},
                 "median_raw": {k: float(np.median(mf[k])) for k in FEATS}},
        "sites": sites, "decision": dec, "candidates": cands, "n_clusters_total": n_clusters,
        "windows": [{"id": w.id, "group": w.group, "domain": w.domain, "site": w.site, "in_null": w.in_null,
                     "lon": round(w.lon, 5), "lat": round(w.lat, 5), "tile": w.tile, "r": w.r, "c": w.c,
                     "valid": round(w.valid, 4), "D": w.D, "B0": w.B0, "pct": w.pct_D, "pct_b0": w.pct_B0,
                     "w1": w.w1, "median_raw": {k: float(w.q[k][NQ // 2]) for k in FEATS}} for w in wins],
    }
    (OUT / f"search_{a.tag}.json").write_text(json.dumps(payload))
    np.savez(WORK / f"mars_grid_{a.tag}.npz", z=mz, mask=mmask, transform=np.array(list(mtr)[:6]))
    print(json.dumps({"n_null": n_null, "decision": dec, "sites": [(s["id"], s["n_windows"], s["median_pct_full"], s["median_pct_b0"]) for s in sites],
                      "candidates": [(c["id"], c["centroid"], c["n_windows"], round(c["best_pct"], 2)) for c in cands]}, indent=1, default=str))
    print(f"runtime {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
