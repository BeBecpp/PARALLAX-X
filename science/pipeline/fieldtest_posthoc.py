"""POST-HOC, DESCRIPTIVE field-test context for the comparison windows (logged in science/DEVIATIONS.md).

Nothing here feeds the frozen F1–F5 fingerprint, the W1 distance, the percentiles, the candidate ranking or
the pre-registered decision. It reads the stored primary run and adds two descriptive layers:

1. Local detrended RMS roughness (metres) on the SAME 30 m common grid used by the fingerprint (identical
   resampling and sigma = 1 px Gaussian low-pass on Mars and Earth):
     * the window is tiled into non-overlapping N x N cell neighbourhoods (N = 11 -> 330 m; N = 33 -> 990 m);
     * in each neighbourhood a least-squares plane z = a + b*x + c*y is fitted to the valid cells and the
       roughness is the RMS of the residuals, sqrt(mean((z - plane)^2));
     * edge handling: only complete neighbourhoods that lie wholly inside the 10 km window are used (no
       padding, partial strips at the window edge are discarded); a neighbourhood needs >= 90 % valid cells
       (on Mars, valid = inside the CTX study polygon and finite);
     * the window statistic is the median and the 90th percentile over its neighbourhoods.
   It describes relief between ~30 m and the neighbourhood size. It says nothing about rover-scale
   (centimetre-to-metre) roughness, rocks or trafficability, which a 30 m grid cannot resolve.

2. ESA WorldCover 2021 v200 (10 m) land-cover fractions inside the exact candidate footprints:
     * footprint = union of the candidate cluster's 10 km analysis windows (reconstructed from the stored
       primary run with the same clustering rule and checked against the published candidates), each window
       polygon traced from its corners on the per-tile azimuthal-equidistant analysis grid;
     * WorldCover is read by HTTP range requests from the official ESA bucket (COG tiles, EPSG:4326);
     * fractions are area-weighted (cos latitude per pixel row) over pixels whose centres fall in the footprint.
   Land cover is a 2021 classification of surface cover; "Bare / sparse vegetation" says nothing about
   whether the surface is sand, gravel, rock or crust.

Usage:  python science/pipeline/fieldtest_posthoc.py
"""
from __future__ import annotations

import json
import sys
import time
from collections import deque
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import config as cfg  # noqa: E402
import search  # noqa: E402
from common import OUT, PUBLIC_DATA  # noqa: E402

NEIGHBOURHOODS = (11, 33)  # cells on the 30 m grid -> 330 m, 990 m
MIN_VALID = 0.9
WC_URL = "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
WC_LEGEND = {10: "Tree cover", 20: "Shrubland", 30: "Grassland", 40: "Cropland", 50: "Built-up", 60: "Bare / sparse vegetation",
             70: "Snow and ice", 80: "Permanent water bodies", 90: "Herbaceous wetland", 95: "Mangroves", 100: "Moss and lichen"}


# ------------------------------------------------------------------------------------------ roughness
def detrended_rms(z: np.ndarray, valid: np.ndarray, n: int) -> np.ndarray:
    """RMS of plane-fit residuals in every complete, non-overlapping n x n neighbourhood (metres)."""
    H, W = z.shape
    rows, cols = np.mgrid[0:n, 0:n]
    out = []
    for r in range(0, H - n + 1, n):
        for c in range(0, W - n + 1, n):
            blk = z[r:r + n, c:c + n]
            v = valid[r:r + n, c:c + n] & np.isfinite(blk)
            if v.mean() < MIN_VALID:
                continue
            A = np.column_stack([cols[v], rows[v], np.ones(int(v.sum()))]).astype(np.float64)
            coef, *_ = np.linalg.lstsq(A, blk[v].astype(np.float64), rcond=None)
            res = blk[v] - A @ coef
            out.append(float(np.sqrt(np.mean(res ** 2))))
    return np.array(out)


def summarise(vals: np.ndarray) -> dict:
    if not vals.size:
        return {"n": 0, "median_m": None, "p90_m": None}
    return {"n": int(vals.size), "median_m": round(float(np.median(vals)), 3), "p90_m": round(float(np.percentile(vals, 90)), 3)}


def roughness_of(z: np.ndarray, valid: np.ndarray) -> dict:
    return {f"{n * int(cfg.GRID_M)}m": summarise(detrended_rms(z, valid, n)) for n in NEIGHBOURHOODS}


# ------------------------------------------------------------------------------------------ clusters
def parse_id(wid: str):
    tile, gi, gj = wid.rsplit("_", 2)
    return tile, int(gi), int(gj)


def rebuild_clusters(stored: dict):
    """Same rule as search.clusters (seeds >= 95th pct in D1, 8-connected growth >= 90th within a tile)."""
    d1 = {parse_id(w["id"]): w for w in stored["windows"] if w["domain"] == "D1"}
    seen, out = set(), []
    for s in sorted([w for w in d1.values() if w["pct"] >= 95], key=lambda w: -w["pct"]):
        key = parse_id(s["id"])
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
                    if nk in d1 and nk not in seen and d1[nk]["pct"] >= 90:
                        seen.add(nk)
                        dq.append(nk)
        out.append({"windows": comp, "best": max(comp, key=lambda w: w["pct"])})
    out.sort(key=lambda c: -c["best"]["pct"])
    return out[:5]


def window_polygon(w: dict, win_px: int) -> Polygon:
    """Lon/lat outline of a stored window, traced along its edges on the tile's AEQD analysis grid."""
    _, tr, crs = search.earth_tile(w["tile"])
    inv = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    r, c = w["r"], w["c"]
    pts = []
    k = 16
    for t in range(k):
        pts.append((c + win_px * t / k, r))
    for t in range(k):
        pts.append((c + win_px, r + win_px * t / k))
    for t in range(k):
        pts.append((c + win_px * (1 - t / k), r + win_px))
    for t in range(k):
        pts.append((c, r + win_px * (1 - t / k)))
    return Polygon([inv.transform(*(tr * p)) for p in pts])


# ------------------------------------------------------------------------------------------ WorldCover
def wc_tile_name(lon: float, lat: float) -> str:
    la = int(np.floor(lat / 3) * 3)
    lo = int(np.floor(lon / 3) * 3)
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"


def worldcover_fractions(poly) -> dict:
    """Area-weighted class fractions of WorldCover 2021 v200 inside a lon/lat (multi)polygon."""
    minx, miny, maxx, maxy = poly.bounds
    tiles = sorted({wc_tile_name(x, y) for x in np.linspace(minx, maxx, 5) for y in np.linspace(miny, maxy, 5)})
    area = {}
    total = 0.0
    nodata = 0.0
    tags = {}
    for t in tiles:
        with rasterio.open(WC_URL.format(tile=t)) as src:
            tags = src.tags()
            b = src.bounds
            bx = (max(minx, b.left), max(miny, b.bottom), min(maxx, b.right), min(maxy, b.top))
            if bx[0] >= bx[2] or bx[1] >= bx[3]:
                continue
            win = from_bounds(*bx, transform=src.transform).round_offsets().round_lengths()
            data = src.read(1, window=win)
            wtr = src.window_transform(win)
            inside = ~geometry_mask([mapping(poly)], out_shape=data.shape, transform=wtr, all_touched=False)
            lat_rows = wtr.f + wtr.e * (np.arange(data.shape[0]) + 0.5)
            wgt = np.cos(np.radians(lat_rows))[:, None] * np.ones((1, data.shape[1]))
            wgt = wgt * inside
            total += float(wgt.sum())
            for cls in np.unique(data[inside]):
                a = float(wgt[data == cls].sum())
                if cls == 0:
                    nodata += a
                else:
                    area[int(cls)] = area.get(int(cls), 0.0) + a
    fr = {WC_LEGEND.get(k, str(k)): round(v / total, 4) for k, v in sorted(area.items(), key=lambda kv: -kv[1])}
    return {"tiles": tiles, "fractions": fr, "nodata_fraction": round(nodata / total, 5) if total else None, "tags": tags}


# ------------------------------------------------------------------------------------------ main
def main():
    t0 = time.time()
    stored = json.loads((OUT / "search_primary.json").read_text())
    results = json.loads((PUBLIC_DATA / "results.json").read_text())
    win_px = stored["window_px"]
    by_id = {w["id"]: w for w in stored["windows"]}

    # traceability: rebuilt clusters must equal the published candidates
    clusters = rebuild_clusters(stored)
    for n, (cl, cand) in enumerate(zip(clusters, results["candidates"]), 1):
        assert cand["id"] == f"G-{n}", cand["id"]
        assert cl["best"]["id"] == cand["best_window"], (cl["best"]["id"], cand["best_window"])
        assert len(cl["windows"]) == cand["n_windows"], (len(cl["windows"]), cand["n_windows"])
    print("clusters reproduce the published candidates", flush=True)

    # --- roughness: Mars study area + every comparison window
    search.DEM = "nasadem"
    mz, mmask, *_ = search.mars_grid()
    rough = {"cmp_mars": {"window": "CTX yardang study polygon (Mars)", **roughness_of(mz, mmask)}}
    from export_w1_curves import match_window  # exact per-feature W1 match, as used for w1_curves.json

    for s in results["compare_scenes"]:
        if s["kind"] == "mars":
            continue
        w = by_id[match_window(s, stored["windows"])]
        z, _, _ = search.earth_tile(w["tile"])
        blk = z[w["r"]:w["r"] + win_px, w["c"]:w["c"] + win_px].astype(np.float64)
        rough[s["id"]] = {"window": w["id"], **roughness_of(blk, np.isfinite(blk))}
        print(f"  roughness {s['id']}: {rough[s['id']]}", flush=True)

    # candidate clusters (all member windows pooled)
    cand_rough = {}
    for cand, cl in zip(results["candidates"], clusters):
        pooled = {n: [] for n in NEIGHBOURHOODS}
        for w in cl["windows"]:
            z, _, _ = search.earth_tile(w["tile"])
            blk = z[w["r"]:w["r"] + win_px, w["c"]:w["c"] + win_px].astype(np.float64)
            for n in NEIGHBOURHOODS:
                pooled[n].append(detrended_rms(blk, np.isfinite(blk), n))
        cand_rough[cand["id"]] = {f"{n * int(cfg.GRID_M)}m": summarise(np.concatenate(pooled[n])) for n in NEIGHBOURHOODS}

    # --- WorldCover inside the exact footprints
    wc = {}
    tags = {}
    for cand, cl in zip(results["candidates"], clusters):
        polys = [window_polygon(w, win_px) for w in cl["windows"]]
        union = unary_union(polys)
        best_poly = window_polygon(cl["best"], win_px)
        f_all = worldcover_fractions(union)
        f_best = worldcover_fractions(best_poly)
        tags = f_all.pop("tags") or tags
        f_best.pop("tags")
        wc[cand["id"]] = {
            "compare_scene_id": cand["compare_scene_id"],
            "footprint": {"n_windows": len(polys), "area_km2": cand["area_km2"],
                          "bbox": [round(v, 4) for v in union.bounds],
                          "windows": [w["id"] for w in cl["windows"]]},
            "cluster": f_all,
            "best_window": {"id": cl["best"]["id"], **f_best},
        }
        print(f"  worldcover {cand['id']}: {f_all['fractions']}", flush=True)

    payload = {
        "status": "POST-HOC DESCRIPTIVE — not part of the pre-registered fingerprint, ranking or decision",
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "roughness": {
            "name": "local detrended RMS roughness",
            "units": "m",
            "grid_m": cfg.GRID_M,
            "preprocessing": f"same as the fingerprint: average-resampled to {cfg.GRID_M:.0f} m, masked Gaussian sigma = {cfg.COMMON_SMOOTH_SIGMA_PX} px on Mars and Earth",
            "neighbourhoods_m": [n * int(cfg.GRID_M) for n in NEIGHBOURHOODS],
            "definition": "RMS of least-squares plane-fit residuals within non-overlapping N x N cell neighbourhoods; window statistic = median and 90th percentile over neighbourhoods",
            "edge_handling": "only complete neighbourhoods wholly inside the 10 km window; partial edge strips discarded; >= 90 % valid cells required (Mars: inside the CTX study polygon)",
            "limitations": "describes relief between ~30 m and the neighbourhood size; it cannot see rover-scale (cm–m) roughness, rocks or soil; Mars CTX and Earth NASADEM have different native resolution and noise before the common 30 m resampling",
            "scenes": rough,
            "candidate_clusters": cand_rough,
        },
        "worldcover": {
            "product": "ESA WorldCover 10 m 2021 v200",
            "year": 2021,
            "resolution_m": 10,
            "source_url": "https://esa-worldcover.org",
            "data_access": "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ (COG tiles, read by HTTP range requests)",
            "license": tags.get("license", "CC-BY 4.0"),
            "attribution": tags.get("copyright", "ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium"),
            "citation": "Zanaga, D. et al. (2022). ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221",
            "accuracy": "global overall accuracy 76.7 % ± 0.5 (ESA WorldCover Product Validation Report v2.0); class- and region-specific accuracy not assessed here",
            "legend": {str(k): v for k, v in WC_LEGEND.items()},
            "method": "area-weighted (cos latitude) fractions of pixels whose centres fall inside the union of the candidate's 10 km analysis windows",
            "caveat": "surface-cover classes only; 'Bare / sparse vegetation' does not indicate sand, gravel, rock, crust or soil strength",
            "candidates": wc,
        },
        "runtime_s": round(time.time() - t0, 1),
    }
    (PUBLIC_DATA / "fieldtest.json").write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote public/data/fieldtest.json in {payload['runtime_s']} s", flush=True)


if __name__ == "__main__":
    main()
