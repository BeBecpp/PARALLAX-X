"""Acquire NASADEM 1-arcsecond tiles (Microsoft Planetary Computer mirror of NASA LP DAAC NASADEM_HGT v001)
and the Natural Earth country boundaries used to clip the Gobi search domain.

Every download is logged (URL, size, SHA-256, UTC time) into science/data/raw/acquisition_log.json.
Run:  science/.venv/Scripts/python science/acquire.py
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
NASADEM_DIR = RAW / "nasadem"
LOG = RAW / "acquisition_log.json"

STAC_BASE = "https://nasademeuwest.blob.core.windows.net/nasadem-cog/v001/"
TOKEN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/nasadem"
NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
    "ne_50m_admin_0_countries.geojson"
)


def tile_name(lat: int, lon: int) -> str:
    ns = "n" if lat >= 0 else "s"
    ew = "e" if lon >= 0 else "w"
    return f"NASADEM_HGT_{ns}{abs(lat):02d}{ew}{abs(lon):03d}"


def tiles_from_box(lat0: int, lat1: int, lon0: int, lon1: int) -> list[str]:
    """Integer-degree box [lat0, lat1) x [lon0, lon1); tile named by its SW corner."""
    return [tile_name(la, lo) for la in range(lat0, lat1) for lo in range(lon0, lon1)]


def required_tiles() -> dict[str, list[str]]:
    from config import TILE_GROUPS  # noqa: WPS433

    out: dict[str, list[str]] = {}
    for group, boxes in TILE_GROUPS.items():
        names: list[str] = []
        for b in boxes:
            names += tiles_from_box(*b)
        out[group] = sorted(set(names))
    return out


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path, token: str | None = None) -> dict:
    dest.parent.mkdir(parents=True, exist_ok=True)
    full = f"{url}?{token}" if token else url
    if dest.exists() and dest.stat().st_size > 0:
        status = "cached"
    else:
        for attempt in range(5):
            try:
                with requests.get(full, stream=True, timeout=120) as r:
                    if r.status_code == 404:
                        return {"url": url, "file": dest.name, "status": "missing_404"}
                    r.raise_for_status()
                    tmp = dest.with_suffix(dest.suffix + ".part")
                    with open(tmp, "wb") as f:
                        for chunk in r.iter_content(1 << 20):
                            f.write(chunk)
                    tmp.replace(dest)
                status = "downloaded"
                break
            except Exception as exc:  # network retry
                if attempt == 4:
                    return {"url": url, "file": dest.name, "status": f"error: {exc}"}
                time.sleep(2 + attempt * 3)
    return {
        "url": url,
        "file": str(dest.relative_to(RAW)).replace("\\", "/"),
        "status": status,
        "bytes": dest.stat().st_size,
        "sha256": sha256(dest),
        "retrieved_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def main() -> int:
    sys.path.insert(0, str(ROOT))
    groups = required_tiles()
    token = requests.get(TOKEN_URL, timeout=60).json()["token"]
    jobs = []
    for group, names in groups.items():
        for n in names:
            jobs.append((group, n))
    print(f"{len(jobs)} NASADEM tiles requested", flush=True)

    def run(job):
        group, n = job
        rec = download(STAC_BASE + n + ".tif", NASADEM_DIR / f"{n.lower()}.tif", token)
        rec["group"] = group
        print(f"  {group:12s} {n}: {rec['status']}", flush=True)
        return rec

    with ThreadPoolExecutor(max_workers=6) as ex:
        records = list(ex.map(run, jobs))
    records.append(download(NE_URL, RAW / "ne_50m_admin_0_countries.geojson"))
    LOG.write_text(json.dumps({"source": "Microsoft Planetary Computer nasadem collection (mirror of NASA LP DAAC NASADEM_HGT v001); Natural Earth 1:50m admin-0", "records": records}, indent=2))
    bad = [r for r in records if not str(r["status"]).startswith(("downloaded", "cached"))]
    print(f"done; problems: {len(bad)}", flush=True)
    for b in bad:
        print("  ", b)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
