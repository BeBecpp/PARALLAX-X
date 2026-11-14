"""Export the HiRISE (NASA PDS) hero terrain + its genuinely aggregated 30 m version, and measure
"what a 30 m grid misses" from the 1 m data.

Outputs public/data/terrain/mars_hirise_hero.* , mars_hirise_hero_30m.* , science/out/hirise_stats.json
"""
from __future__ import annotations

import json
import sys

import numpy as np
import rasterio
from rasterio.windows import Window

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import OUT, PUBLIC_DATA, RAW, block_mean, masked_gaussian, plane_detrend, write_heightfield  # noqa: E402

PID = "DTEEC_009609_1675_010453_1675_A01"
SRC = RAW / f"{PID}.IMG"
PDS_URL = (
    "https://hirise-pds.lpl.arizona.edu/PDS/DTM/PSP/ORB_009600_009699/"
    "PSP_009609_1675_PSP_010453_1675/DTEEC_009609_1675_010453_1675_A01.IMG"
)
CROP_M = 4000.0  # hero crop size (m)


def find_crop(ds, size_px: int) -> tuple[int, int]:
    """Choose the fully valid square crop with the highest relief variance in the southern half
    (where the layered/eroded terrain is) using a decimated scan. Deterministic."""
    dec = 16
    a = ds.read(1, out_shape=(ds.height // dec, ds.width // dec)).astype(float)
    a[a < -1e30] = np.nan
    s = size_px // dec
    best, best_rc = -1.0, None
    for r in range(a.shape[0] // 2, a.shape[0] - s, 4):
        for c in range(0, a.shape[1] - s, 4):
            blk = a[r : r + s, c : c + s]
            if np.isfinite(blk).mean() < 0.999:
                continue
            v = float(np.nanstd(plane_detrend(blk)))
            if v > best:
                best, best_rc = v, (r * dec, c * dec)
    if best_rc is None:
        raise RuntimeError("no fully valid crop found")
    return best_rc


def main() -> None:
    with rasterio.open(SRC) as ds:
        posting = abs(ds.transform.a)
        size_px = int(round(CROP_M / posting))
        r0, c0 = find_crop(ds, size_px)
        z = ds.read(1, window=Window(c0, r0, size_px, size_px)).astype(np.float64)
        crs_wkt = ds.crs.to_wkt()
        x0, y0 = ds.transform * (c0, r0)
    z[z < -1e30] = np.nan
    assert np.isfinite(z).mean() > 0.999

    # hero: 1 m data area-averaged to 1024 grid for the browser (display posting ~3.9 m)
    f_hero = int(np.ceil(size_px / 1024))
    hero = block_mean(z, f_hero)
    hero_post = posting * f_hero
    # genuinely aggregated 30 m version of the same crop (block mean of the 1 m posts)
    f30 = int(round(30.0 / posting))
    z30 = block_mean(z, f30)
    post30 = posting * f30

    meta_common = {
        "planet": "Mars",
        "source_id": PID,
        "source_url": PDS_URL,
        "provider": "NASA Planetary Data System (HiRISE, MRO; University of Arizona)",
        "crs": "Equirectangular, Mars local sphere R=3395582 m, standard parallel -10, central meridian 178.08 (from PDS label)",
        "crop_origin_projected_m": [float(x0), float(y0)],
        "vertical_datum": "Mars 2000 areoid (PDS label); heights stored relative to crop minimum",
        "terrain_description": "Wind-eroded layered Medusae Fossae Formation deposits (HiRISE stereo DTM)",
    }
    hero_rec = write_heightfield(
        hero, hero_post, PUBLIC_DATA / "terrain", "mars_hirise_hero",
        {**meta_common, "display_note": f"1.01 m DTM posts area-averaged x{f_hero} for display",
         "source_posting_m": posting, "vertical_exaggeration_default": 2.0},
    )
    rec30 = write_heightfield(
        z30, post30, PUBLIC_DATA / "terrain", "mars_hirise_hero_30m",
        {**meta_common, "display_note": f"same crop, 1.01 m posts block-averaged x{f30} to ~30 m (real aggregation, not a blur shader)",
         "source_posting_m": posting, "vertical_exaggeration_default": 2.0},
    )

    # What a 30 m grid misses: fraction of detrended relief variance at wavelengths < ~150 m.
    zd = plane_detrend(z)
    # Gaussian with sigma = lambda/(2*pi) -> ~ -3 dB near 150 m; residual = short-wavelength part
    lp = masked_gaussian(zd, sigma_px=(150.0 / posting) / (2 * np.pi))
    resid = zd - lp
    frac_short = float(np.nanvar(resid) / np.nanvar(zd))
    # slope distribution at 5 m and 180 m baselines on the 1 m data (for the scale lens)
    def slope(arr, h, post):
        gx = (arr[h:-h, 2 * h:] - arr[h:-h, : -2 * h]) / (2 * h * post)
        gy = (arr[2 * h:, h:-h] - arr[: -2 * h, h:-h]) / (2 * h * post)
        return np.degrees(np.arctan(np.hypot(gx, gy)))
    s5 = slope(zd, 2, posting)  # baseline ~4 m
    zs = block_mean(zd, f30)
    s180 = slope(zs, 3, post30)
    def q(a):
        a = a[np.isfinite(a)]
        return {p: float(np.percentile(a, p)) for p in (5, 25, 50, 75, 95, 99)}
    stats = {
        "source_id": PID,
        "crop_px": [int(r0), int(c0), size_px],
        "posting_m": posting,
        "short_wavelength_variance_fraction_lt150m": frac_short,
        "slope_deg_baseline_4m_on_1m_posts": q(s5),
        "slope_deg_baseline_180m_on_30m_aggregate": q(s180),
        "frac_area_slope_gt15_baseline_4m": float(np.nanmean(s5 > 15)),
        "frac_area_slope_gt30_baseline_4m": float(np.nanmean(s5 > 30)),
        "frac_area_slope_gt15_baseline_180m": float(np.nanmean(s180 > 15)),
        "frac_area_slope_gt30_baseline_180m": float(np.nanmean(s180 > 30)),
        "note": "HiRISE stereo DTM effective resolution is coarser than its 1 m posting (Kirk et al. 2021: ~10-20 image pixels); 4 m baseline slopes are near that limit and are reported as a fine-scale proxy only.",
        "heightfields": [hero_rec["id"], rec30["id"]],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "hirise_stats.json").write_text(json.dumps(stats, indent=2))
    print(json.dumps({k: stats[k] for k in ("crop_px", "short_wavelength_variance_fraction_lt150m", "frac_area_slope_gt15_baseline_4m", "frac_area_slope_gt15_baseline_180m")}, indent=1))


if __name__ == "__main__":
    main()
