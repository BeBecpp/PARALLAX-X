"""Assemble public/data/results.json, sources.json and the 10 km comparison heightfields from the
search outputs. Every number the app shows comes from here (traceable to science/out/*.json)."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import config as cfg  # noqa: E402
from common import OUT, PUBLIC_DATA, ROOT, SCIENCE, WORK, plane_detrend, write_heightfield  # noqa: E402

TERRAIN = PUBLIC_DATA / "terrain"
NASADEM_URL = "https://planetarycomputer.microsoft.com/dataset/nasadem"
NASADEM_DOI = "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001"


def sha_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def git(*args) -> str:
    try:
        return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def window_array(w: dict, win_px: int) -> np.ndarray:
    z = np.load(WORK / "tiles" / f"{w['tile']}.npz")["z"].astype(np.float64)
    return z[w["r"] : w["r"] + win_px, w["c"] : w["c"] + win_px]


def mars_window(tag: str, win_px: int) -> np.ndarray:
    d = np.load(WORK / f"mars_grid_{tag}.npz")
    z, m = d["z"], d["mask"]
    rr, cc = np.nonzero(m)
    r0 = int(round(rr.mean())) - win_px // 2
    c0 = int(round(cc.mean())) - win_px // 2
    r0 = max(0, min(r0, z.shape[0] - win_px))
    c0 = max(0, min(c0, z.shape[1] - win_px))
    return z[r0 : r0 + win_px, c0 : c0 + win_px], (r0, c0)


def main():
    S = json.loads((OUT / "search_primary.json").read_text())
    H = json.loads((OUT / "hirise_stats.json").read_text())
    sens = OUT / "search_sens6km.json"
    S6 = json.loads(sens.read_text()) if sens.exists() else None
    win_px = S["window_px"]
    wins = {w["id"]: w for w in S["windows"]}
    feats_meta = [
        {"id": "F1", "name": "Local relief", "units": "m", "baseline_m": 1980,
         "description": "P95−P5 of plane-detrended elevation within each 1.98 km sub-window"},
        {"id": "F2", "name": "Slope at 180 m baseline", "units": "deg", "baseline_m": 180,
         "description": "atan of central-difference gradient magnitude, offsets ±3 cells (30 m grid)"},
        {"id": "F3", "name": "Slope at 600 m baseline", "units": "deg", "baseline_m": 600,
         "description": "same as F2 with offsets ±10 cells"},
        {"id": "F4", "name": "Topographic position (TPI)", "units": "m", "baseline_m": 510,
         "description": "elevation minus mean elevation within a 510 m radius disk"},
        {"id": "F5", "name": "Ridge elongation (gradient coherence)", "units": "0–1", "baseline_m": 300,
         "description": "structure-tensor coherence of 180 m-baseline gradients, smoothed at σ = 300 m; orientation-invariant"},
    ]

    # ---- comparison heightfields ------------------------------------------------------------
    scenes = []
    mz, (mr, mc) = mars_window("primary", win_px)
    rec = write_heightfield(plane_detrend(mz), cfg.GRID_M, TERRAIN, "cmp_mars", {
        "planet": "Mars", "source_id": "CTX DTM P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W",
        "source_url": "https://stac.astrogeology.usgs.gov/docs/data/mars/ctxdtms",
        "provider": "USGS Astrogeology (from NASA MRO CTX images archived in PDS)",
        "crs": "local equidistant cylindrical, Mars sphere R=3396190 m, true scale at -12.42°",
        "vertical_datum": "areoid; plane-detrended (relative heights)",
        "terrain_description": "Medusae Fossae Formation yardangs — 10 km window centred on the fingerprint area",
        "display_note": "CTX 20 m posts resampled (average) to 30 m + common Gaussian σ=30 m — identical processing to Earth windows",
        "source_posting_m": 20.2, "vertical_exaggeration_default": 2.0, "window_origin_px": [mr, mc]})
    scenes.append({"id": "cmp_mars", "label": "Medusae Fossae yardangs (Mars)", "kind": "mars", "heightfield_id": rec["id"],
                   "centroid": S["mars"]["centre_lonlat"], "pct_full": None, "pct_b0": None, "per_feature_w1": None})

    def earth_scene(w, sid, label, kind, site_id=None):
        z = window_array(w, win_px)
        r = write_heightfield(plane_detrend(z), cfg.GRID_M, TERRAIN, sid, {
            "planet": "Earth", "source_id": f"NASADEM_HGT v001 tile {w['tile']}", "source_url": NASADEM_DOI,
            "provider": "NASA JPL / LP DAAC NASADEM (retrieved from Microsoft Planetary Computer mirror)",
            "crs": "azimuthal equidistant centred on the 1° tile, WGS84", "vertical_datum": "EGM96 geoid; plane-detrended (relative heights)",
            "terrain_description": label, "display_note": "NASADEM 1″ resampled (average) to 30 m + common Gaussian σ=30 m",
            "source_posting_m": 30.0, "vertical_exaggeration_default": 2.0, "window_id": w["id"]})
        scenes.append({"id": sid, "label": label, "kind": kind, "heightfield_id": r["id"], "centroid": [w["lon"], w["lat"]],
                       "pct_full": w["pct"], "pct_b0": w["pct_b0"], "per_feature_w1": w["w1"], **({"site_id": site_id} if site_id else {})})

    cands = []
    for c in S["candidates"]:
        w = wins[c["best_window"]]
        sid = f"cmp_{c['id'].lower().replace('-', '')}"
        earth_scene(w, sid, f"Gobi {c['id']} — morphometric candidate ({w['lat']:.3f}°N, {w['lon']:.3f}°E)", "candidate")
        cands.append({**{k: c[k] for k in ("id", "centroid", "n_windows", "area_km2", "best_pct", "median_pct", "label")},
                      "best_window": c["best_window"], "compare_scene_id": sid})
    for s in S["sites"]:
        ws = [w for w in S["windows"] if w["site"] == s["id"]]
        if not ws:
            continue
        rep = min(ws, key=lambda w: abs(w["pct"] - s["median_pct_full"]))
        kind = "positive" if s["role"] == "positive" else "negative"
        earth_scene(rep, f"cmp_{s['id'].lower()}", f"{s['name']} — representative (median-rank) window", kind, s["id"])

    # ---- breakdown (where the analogy breaks down) ------------------------------------------
    hs = H
    breakdown = [
        {"id": "shape", "title": "Same shape at ≥180 m — not the same rock",
         "text": "This tool measures terrain geometry only. Medusae Fossae material is debated (volcanic ash/ignimbrite or other fine, weakly cemented deposits) and is likely more porous and weaker than the Earth sites; lithology and induration are not measured here.",
         "source": "de Silva et al. 2010, PSS 58:459 (ignimbrite yardangs as MFF analogs); lithology comparison needs verification per site"},
        {"id": "air", "title": "Different air and gravity",
         "text": "Mars has a surface pressure of roughly 0.6 kPa (≈1% of Earth's) and gravity of 3.71 m/s² (0.38 g). Wind erosion thresholds, abrasion rates and slope stability therefore differ; Earth gravity is identical at every Earth candidate.",
         "source": "NASA Mars Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html"},
        {"id": "time", "title": "Different age and history",
         "text": "Medusae Fossae deposits are generally considered Hesperian–Amazonian (billions of years); Earth yardang fields are far younger. Ages are not measured by this tool.",
         "source": "needs verification (published MFF stratigraphy)"},
        {"id": "earth", "title": "Earth-only processes",
         "text": "Rain, flowing water, frost and vegetation shape Earth deserts; NASADEM is a surface model, so any vegetation or buildings are included in heights.",
         "source": "NASADEM documentation; general knowledge"},
        {"id": "data", "title": "Different instruments",
         "text": "Mars heights come from CTX stereo photogrammetry; Earth heights from the SRTM radar mission reprocessed as NASADEM. Both were resampled to the same 30 m grid and smoothed identically, but their error structures differ.",
         "source": "USGS CTX DTM documentation; NASADEM user guide"},
        {"id": "scale", "title": "Fine detail is invisible at 30 m",
         "text": (f"On the HiRISE crop, {hs['frac_area_slope_gt15_baseline_4m']*100:.1f}% of the area is steeper than 15° at a ~4 m baseline, "
                  f"but only {hs['frac_area_slope_gt15_baseline_180m']*100:.1f}% at the 180 m baseline used in the Earth comparison."),
         "source": "computed: science/out/hirise_stats.json (HiRISE DTEEC_009609_1675_010453_1675_A01)"},
        {"id": "rover", "title": "Rover-scale questions are not evaluable on Earth here",
         "text": "Only ~30 m public elevation exists for the Gobi candidates. Rover-relevant slopes, rocks and soil need drone or lidar survey; this tool does not estimate trafficability.",
         "source": "Golombek et al. 2012, Space Sci Rev 170:641 (slope criteria at 2–5 m baselines)"},
    ]

    dec = S["decision"]
    passed = dec["pass"]
    summary = (("PASS — the pre-registered validation criteria were met. " if passed else
                "FAIL — the pre-registered validation criteria were NOT all met. ") +
               "; ".join(f"({c['id']}) {'met' if c['pass'] else 'not met'}: {c['value']}" for c in dec["criteria"]) +
               ". Gobi windows are exploratory morphometric candidates only.")

    prereg = SCIENCE / "prereg.md"
    caveats = [
        "NASADEM tiles were retrieved from the Microsoft Planetary Computer mirror of NASA LP DAAC NASADEM_HGT v001, not via an Earthdata login.",
        "NASADEM void-fill quality layer was not available in the mirror; void-filled cells could not be masked.",
        "Effective-resolution matching is a conservative identical Gaussian (σ = 30 m) on both planets; spectra are descriptive only.",
        "Site percentiles use the median window; ranks are relative to the declared Earth null windows, not probabilities.",
        "The Puna reference polygon location is low-confidence (pre-registered as such).",
        "Terrain geometry does not establish geologic process, lithology, age or habitability.",
    ]
    if dec.get("missing_sites"):
        caveats.append(f"Missing reference sites (counted as failing): {dec['missing_sites']}")
    sens_block = None
    if S6:
        sens_block = {"window_km": S6["window_km"], "decision_pass": S6["decision"]["pass"],
                      "sites": [{"id": s["id"], "median_pct_full": s["median_pct_full"], "median_pct_b0": s["median_pct_b0"], "n_windows": s["n_windows"]} for s in S6["sites"]],
                      "criteria": S6["decision"]["criteria"]}
    def glo30_block():
        p = OUT / "search_glo30.json"
        if not p.exists():
            return None
        G = json.loads(p.read_text())
        # rank agreement between DEMs on windows present in both runs
        a = {w["id"]: w["pct"] for w in S["windows"]}
        b = {w["id"]: w["pct"] for w in G["windows"]}
        common = sorted(set(a) & set(b))
        rho = float(np.corrcoef(np.argsort(np.argsort([a[i] for i in common])), np.argsort(np.argsort([b[i] for i in common])))[0, 1]) if common else None
        return {"dem": "Copernicus GLO-30", "decision_pass": G["decision"]["pass"], "criteria": G["decision"]["criteria"],
                "sites": [{"id": s["id"], "median_pct_full": s["median_pct_full"], "median_pct_b0": s["median_pct_b0"], "n_windows": s["n_windows"]} for s in G["sites"]],
                "candidates": [{"id": c["id"], "centroid": c["centroid"], "best_pct": c["best_pct"]} for c in G["candidates"]],
                "spearman_rank_corr_with_nasadem": rho, "n_common_windows": len(common),
                "status": "sensitivity only (logged in science/DEVIATIONS.md before primary results were viewed)"}

    dpath = OUT / "diagnostics.json"
    diag = json.loads(dpath.read_text()) if dpath.exists() else None
    if diag:
        c = diag["ctx_ridge_spectrum"]
        pk = sorted(round(x) for x in c["compensated_peak_wavelengths_m"][:3])
        breakdown.insert(0, {"id": "resolution_limit", "title": "The Mars yardangs here are near the analysis limit",
            "text": (f"Post-hoc diagnostic: the CTX yardang ridges repeat every ~{pk[0]}–{pk[-1]} m across-wind. At the pre-registered 180 m slope "
                     f"baseline and 30 m smoothing, a 250 m ridge keeps only ~{c['f2_gradient_attenuation_at']['250']*100:.0f}% of its gradient "
                     f"(~{c['f2_gradient_attenuation_at']['1000']*100:.0f}% for km-scale ridges such as the Lut Kaluts). This plausibly explains why the fingerprint "
                     "under-represents MFF elongation and failed validation; it does not change the result."),
            "source": "computed: science/out/diagnostics.json (post-hoc, descriptive)"})
    results = {
        "run": {"prereg_commit": "32b5c48c70da69360dd5676dd0779cae065ef1e2", "prereg_file_sha256": sha_file(prereg),
                "run_utc": S["run_utc"], "exported_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "code_commit": git("rev-parse", "HEAD"), "status": "complete",
                "parameters": {"grid_m": cfg.GRID_M, "window_km": S["window_km"], "smoothing_sigma_m": cfg.COMMON_SMOOTH_SIGMA_PX * cfg.GRID_M,
                               "max_invalid_frac": cfg.MAX_INVALID_FRAC, "n_quantiles": cfg.N_QUANTILES, "pass_percentile": cfg.PASS_PERCENTILE,
                               "ecdf_sample_seed": 42, "runtime_s": S["runtime_s"]},
                "caveats": caveats},
        "decision": {"pass": passed, "summary": summary, "criteria": dec["criteria"],
                     "mean_pos_full": dec["mean_pos_full"], "mean_pos_b0": dec["mean_pos_b0"]},
        "features": feats_meta,
        "null_set": {"n_windows": S["n_null"], "by_domain": S["null_by_domain"]},
        "mars": {"centre_lonlat": S["mars"]["centre_lonlat"], "n_samples": S["mars"]["n_samples"], "median_raw": S["mars"]["median_raw"]},
        "sites": S["sites"], "candidates": cands, "n_clusters_total": S["n_clusters_total"],
        "compare_scenes": scenes,
        "windows": [{"id": w["id"], "domain": w["domain"], "lon": w["lon"], "lat": w["lat"], "pct": round(w["pct"], 2),
                     "pct_b0": round(w["pct_b0"], 2), "label": w["site"] or w["domain"]} for w in S["windows"]],
        "hirise": {k: H[k] for k in ("short_wavelength_variance_fraction_lt150m", "frac_area_slope_gt15_baseline_4m", "frac_area_slope_gt30_baseline_4m",
                                     "frac_area_slope_gt15_baseline_180m", "frac_area_slope_gt30_baseline_180m", "note")},
        "sensitivity_6km": sens_block,
        "glo30_check": glo30_block(),
        "diagnostics": diag,
        "breakdown": breakdown,
    }
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DATA / "results.json").write_text(json.dumps(results, indent=1))

    acq = json.loads((SCIENCE / "acquisition_log.json").read_text())
    n_tiles = sum(1 for r in acq["records"] if r.get("group"))
    sources = [
        {"id": "hirise", "planet": "Mars", "provider": "NASA Planetary Data System — HiRISE (MRO), University of Arizona",
         "product_id": "DTEEC_009609_1675_010453_1675_A01",
         "url": "https://hirise-pds.lpl.arizona.edu/PDS/DTM/PSP/ORB_009600_009699/PSP_009609_1675_PSP_010453_1675/DTEEC_009609_1675_010453_1675_A01.IMG",
         "licence": "NASA PDS public data", "posting_m": 1.01, "effective_resolution_note": "stereo DTM; effective resolution coarser than posting (several m)",
         "crs": "Equirectangular, Mars local sphere R=3395582 m (PDS label)", "vertical_datum": "Mars 2000 areoid", "nodata": "−3.4028e38 (16#FF7FFFFB#)",
         "valid_fraction": None, "retrieved_utc": "2026-11-14", "usage": "3D hero terrain; measured fine-vs-coarse slope statistics; rover-scale lens",
         "resources_tab_route": "PDS (NASA Resources tab)"},
        {"id": "ctx", "planet": "Mars", "provider": "USGS Astrogeology — controlled MRO CTX DTMs (from NASA CTX images archived in PDS)",
         "product_id": "P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W",
         "url": "https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W/P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W_dtm.tif",
         "licence": "CC0", "posting_m": 20.2, "effective_resolution_note": "stereo DTM; coarser than posting",
         "crs": "Mars 2015 sphere equirectangular (clon=0, standard parallel 0)", "vertical_datum": "areoid", "nodata": "−32767",
         "valid_fraction": 0.80, "retrieved_utc": "2026-11-14", "usage": "Mars terrain fingerprint (yardang polygon) and Mars comparison window",
         "resources_tab_route": "not a Resources-tab item (USGS derived product; cited separately)"},
        {"id": "nasadem", "planet": "Earth", "provider": "NASA JPL / LP DAAC NASADEM_HGT v001 — retrieved from the Microsoft Planetary Computer mirror",
         "product_id": f"NASADEM_HGT v001, {n_tiles} 1°×1° tiles", "url": NASADEM_DOI, "mirror_url": NASADEM_URL,
         "licence": "NASA public data", "posting_m": 30.0, "effective_resolution_note": "SRTM C-band InSAR surface model; noise-limited in low relief",
         "crs": "WGS84 geographic, 1 arc-second", "vertical_datum": "EGM96", "nodata": "−32768", "valid_fraction": None,
         "retrieved_utc": "2026-11-14", "usage": "All Earth windows (search domains and controls)",
         "resources_tab_route": "NASADEM is a NASA LP DAAC product discoverable in Earthdata Search (NASA Resources tab); this copy came from a mirror"},
        {"id": "mola", "planet": "Mars", "provider": "MGS MOLA global DEM 463 m (NASA/GSFC; USGS Astrogeology mosaic)",
         "product_id": "Mars_MGS_MOLA_DEM_mosaic_global_463m", "url": "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
         "licence": "public domain", "posting_m": 463, "effective_resolution_note": "context map only (every 16th sample)", "crs": "equirectangular",
         "vertical_datum": "areoid", "nodata": None, "valid_fraction": None, "retrieved_utc": "2026-11-14", "usage": "location-selection map only",
         "resources_tab_route": "MOLA data are archived in PDS"},
        {"id": "naturalearth", "planet": "Earth", "provider": "Natural Earth 1:50m admin-0 countries", "product_id": "ne_50m_admin_0_countries",
         "url": "https://www.naturalearthdata.com/", "licence": "public domain", "posting_m": None, "effective_resolution_note": None,
         "crs": "WGS84", "vertical_datum": None, "nodata": None, "valid_fraction": None, "retrieved_utc": "2026-11-14",
         "usage": "clip the Gobi search domain to Mongolia", "resources_tab_route": "not applicable"},
    ]
    (PUBLIC_DATA / "sources.json").write_text(json.dumps(sources, indent=1))
    total = sum(p.stat().st_size for p in PUBLIC_DATA.rglob("*") if p.is_file())
    print(f"results.json written; scenes={len(scenes)} candidates={len(cands)} decision_pass={passed}; public/data total {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
