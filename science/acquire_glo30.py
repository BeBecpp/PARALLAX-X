"""Acquire Copernicus GLO-30 DEM tiles (ESA; AWS open data bucket copernicus-dem-30m) for the same 1° tiles
as NASADEM, for the independent-DEM cross-check. Logged with SHA-256 to science/acquisition_log_glo30.json.
Copernicus DEM © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS
by the European Union and ESA; all rights reserved (free licence, attribution required)."""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from acquire import RAW, download, required_tiles  # noqa: E402

BASE = "https://copernicus-dem-30m.s3.amazonaws.com/"


def glo_name(nasadem_tile: str) -> str:
    t = nasadem_tile.split("_")[-1]  # e.g. n43e100
    ns, lat, ew, lon = t[0], int(t[1:3]), t[3], int(t[4:7])
    return f"Copernicus_DSM_COG_10_{ns.upper()}{lat:02d}_00_{ew.upper()}{lon:03d}_00_DEM"


def main():
    jobs = [(g, n) for g, names in required_tiles().items() for n in names]

    def run(job):
        g, n = job
        name = glo_name(n)
        rec = download(f"{BASE}{name}/{name}.tif", RAW / "glo30" / f"{n.lower()}.tif")
        rec["group"] = g
        rec["glo30_name"] = name
        print(f"  {g:10s} {name}: {rec['status']}", flush=True)
        return rec

    with ThreadPoolExecutor(max_workers=6) as ex:
        recs = list(ex.map(run, jobs))
    (ROOT / "acquisition_log_glo30.json").write_text(json.dumps({"source": "Copernicus GLO-30 DEM, AWS open data (copernicus-dem-30m)", "records": recs}, indent=2))
    bad = [r for r in recs if not str(r["status"]).startswith(("downloaded", "cached"))]
    print("problems:", len(bad))
    for b in bad:
        print("  ", b)


if __name__ == "__main__":
    main()
