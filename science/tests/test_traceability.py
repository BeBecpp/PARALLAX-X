"""Traceability: recompute a displayed metric from the raw source through an independent resampling path.
The top Gobi candidate's F2 (slope at 180 m baseline) median stored in science/out/search_primary.json is
recomputed from the raw NASADEM GeoTIFF using pointwise pyproj transforms + bilinear interpolation
(instead of rasterio warp with average resampling). Tolerance: 10 % (different resampling kernels)."""
import json
import sys
from pathlib import Path

import numpy as np
import pytest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "pipeline"))
sys.path.insert(0, str(HERE))
OUTF = HERE / "out" / "search_primary.json"
need = pytest.mark.skipif(not OUTF.exists() or not (HERE / "data" / "raw" / "nasadem").exists(), reason="needs raw data + results")


@need
def test_top_candidate_f2_median_recomputed_from_raw():
    import rasterio
    from pyproj import CRS, Transformer
    from scipy.ndimage import map_coordinates

    import config as cfg
    from common import masked_gaussian
    from features import slope_deg

    S = json.loads(OUTF.read_text())
    wid = S["candidates"][0]["best_window"]
    w = next(x for x in S["windows"] if x["id"] == wid)
    path = HERE / "data" / "raw" / "nasadem" / f"{w['tile'].lower()}.tif"
    with rasterio.open(path) as src:
        z = src.read(1).astype(float)
        z[z == src.nodata] = np.nan
        b = src.bounds
        inv_tr = ~src.transform
    lon_c, lat_c = (b.left + b.right) / 2, (b.bottom + b.top) / 2
    aeqd = CRS.from_proj4(f"+proj=aeqd +lat_0={lat_c} +lon_0={lon_c} +datum=WGS84 +units=m +no_defs")
    # rebuild the window's metric grid from its stored centre and 30 m spacing
    to_m = Transformer.from_crs("EPSG:4326", aeqd, always_xy=True)
    to_ll = Transformer.from_crs(aeqd, "EPSG:4326", always_xy=True)
    xc, yc = to_m.transform(w["lon"], w["lat"])
    n = S["window_px"]
    xs = xc + (np.arange(n) - n / 2 + 0.5) * cfg.GRID_M
    ys = yc - (np.arange(n) - n / 2 + 0.5) * cfg.GRID_M
    X, Y = np.meshgrid(xs, ys)
    lon, lat = to_ll.transform(X, Y)
    col, row = inv_tr * (lon, lat)
    zi = map_coordinates(np.nan_to_num(z, nan=np.nanmean(z)), [row - 0.5, col - 0.5], order=1)
    zs = masked_gaussian(zi, cfg.COMMON_SMOOTH_SIGMA_PX)
    from common import plane_detrend
    s = slope_deg(plane_detrend(zs), cfg.SLOPE_H_F2, cfg.GRID_M)
    recomputed = float(np.nanmedian(s))
    stored = w["median_raw"]["F2"]
    print(f"window {wid}: stored F2 median {stored:.4f} deg, recomputed {recomputed:.4f} deg")
    assert abs(recomputed - stored) / stored < 0.10
