"""Projection / physical-scale sanity on real tiles (requires downloaded data; skipped otherwise)."""
import sys
from pathlib import Path

import numpy as np
import pytest
from pyproj import Geod, Transformer

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "pipeline"))
sys.path.insert(0, str(HERE))
import config as cfg  # noqa: E402

RAW = HERE / "data" / "raw"
need = pytest.mark.skipif(not (RAW / "nasadem" / "nasadem_hgt_n43e100.tif").exists(), reason="raw data not present")


@need
def test_earth_window_is_10km_on_the_ellipsoid():
    from search import earth_tile
    z, tr, crs = earth_tile("NASADEM_HGT_n43e100")
    inv = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    g = Geod(ellps="WGS84")
    # window at the tile centre: corners 333 px apart
    H, W = z.shape
    r, c = H // 2, W // 2
    x0, y0 = tr * (c, r)
    x1, y1 = tr * (c + 333, r)
    x2, y2 = tr * (c, r + 333)
    lon0, lat0 = inv.transform(x0, y0)
    lon1, lat1 = inv.transform(x1, y1)
    lon2, lat2 = inv.transform(x2, y2)
    ew = g.inv(lon0, lat0, lon1, lat1)[2]
    ns = g.inv(lon0, lat0, lon2, lat2)[2]
    assert abs(ew - 9990) < 10 and abs(ns - 9990) < 10
    assert abs(tr.a - 30.0) < 1e-6 and abs(tr.e + 30.0) < 1e-6


@need
def test_mars_grid_true_scale():
    from search import mars_grid
    z, mask, tr, crs, (lon_c, lat_c), _ = mars_grid()
    g = Geod(a=cfg.MARS_RADIUS_M, b=cfg.MARS_RADIUS_M)
    geo = "+proj=longlat +R=3396190 +no_defs"
    inv = Transformer.from_crs(crs, geo, always_xy=True)
    r, c = np.argwhere(mask).mean(axis=0).astype(int)
    x0, y0 = tr * (c, r)
    x1, y1 = tr * (c + 100, r)
    x2, y2 = tr * (c, r + 100)
    a = inv.transform(x0, y0)
    b = inv.transform(x1, y1)
    d = inv.transform(x2, y2)
    ew = g.inv(a[0], a[1], b[0], b[1])[2]
    ns = g.inv(a[0], a[1], d[0], d[1])[2]
    assert abs(ew - 3000) < 5 and abs(ns - 3000) < 5
    assert 150 < mask.sum() * 0.0009 < 250  # polygon area km² (~26 x 7.5 km)
