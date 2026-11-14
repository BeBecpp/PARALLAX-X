"""Build the State-A locator: a real MOLA (MGS, NASA) shaded-relief crop with exact footprints.
Reads every 16th row of the USGS global 463 m MOLA DEM mosaic via HTTP range requests."""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import Window

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PUBLIC_DATA, WORK  # noqa: E402

URL = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
LON_MIN, LON_MAX = 120.0, 240.0   # degrees east, 0-360
LAT_MIN, LAT_MAX = -40.0, 25.0
DEC = 16


def main():
    cache = WORK / "mola_band.npy"
    with rasterio.open("/vsicurl/" + URL) as d:
        H, W = d.height, d.width
        row0 = int((90 - LAT_MAX) / 180 * H)
        row1 = int((90 - LAT_MIN) / 180 * H)
        rows = list(range(row0, row1, DEC))
        if cache.exists():
            band = np.load(cache)
        else:
            def rd(r):
                with rasterio.open("/vsicurl/" + URL) as dd:
                    return dd.read(1, window=Window(0, r, W, 1))[0, ::DEC]
            with ThreadPoolExecutor(max_workers=8) as ex:
                band = np.stack(list(ex.map(rd, rows))).astype(np.float32)
            np.save(cache, band)
    # file spans lon -180..180; convert to 0..360 and crop
    band = np.roll(band, band.shape[1] // 2, axis=1)  # now lon 0..360
    cpd = band.shape[1] / 360.0
    c0, c1 = int(LON_MIN * cpd), int(LON_MAX * cpd)
    z = band[:, c0:c1]
    px_m = 3396190 * np.radians(360.0 / band.shape[1])
    gy, gx = np.gradient(z, px_m, px_m)
    hs = np.clip(0.55 + (-gx * 0.6 + gy * 0.6) / np.sqrt(1 + gx ** 2 + gy ** 2) * 18, 0, 1)
    # graphite toning: dark, low contrast, subtle warmth (display only)
    base = np.array([24, 30, 38], float)
    hi = np.array([132, 120, 112], float)
    rgb = (base[None, None, :] + (hi - base)[None, None, :] * hs[..., None] ** 1.2).astype(np.uint8)
    img = Image.fromarray(rgb)
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    img.save(PUBLIC_DATA / "mola_locator.png", optimize=True)
    lat_top = 90 - rows[0] / H * 180
    lat_bot = 90 - (rows[-1] + DEC) / H * 180
    hirise = [(178.02631384, -12.480606186804), (178.13736988, -12.480606186804), (178.13736988, -12.70574135688), (178.02631384, -12.70574135688)]
    ctx = [(177.7246, -12.3121), (178.2342, -12.3121), (178.2342, -12.9283), (177.7246, -12.9283)]
    meta = {
        "image": "/data/mola_locator.png", "lon_min": LON_MIN, "lon_max": LON_MAX, "lat_min": float(lat_bot), "lat_max": float(lat_top),
        "width": img.size[0], "height": img.size[1],
        "footprints": [
            {"id": "ctx", "label": "CTX DTM scene (USGS)", "kind": "ctx", "polygon": ctx},
            {"id": "fingerprint", "label": "Yardang fingerprint area", "kind": "fingerprint",
             "polygon": [(177.742, -12.3671), (178.1952, -12.3432), (178.1952, -12.4761), (177.742, -12.4829)]},
            {"id": "hirise", "label": "HiRISE DTM (NASA PDS)", "kind": "hirise", "polygon": hirise},
        ],
        "source": "MGS MOLA global DEM 463 m (NASA/GSFC; USGS Astrogeology mosaic), every 16th sample, shaded for display only",
        "source_url": URL,
    }
    (PUBLIC_DATA / "locator.json").write_text(json.dumps(meta, indent=2))
    print(img.size, meta["lat_min"], meta["lat_max"])


if __name__ == "__main__":
    main()
