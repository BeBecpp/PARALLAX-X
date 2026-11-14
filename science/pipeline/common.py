"""Shared, deterministic raster helpers for the PARALLAX X science pipeline (no ML, no randomness
except where a fixed seed is documented)."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

SCIENCE = Path(__file__).resolve().parents[1]
ROOT = SCIENCE.parent
RAW = SCIENCE / "data" / "raw"
WORK = SCIENCE / "data" / "work"
OUT = SCIENCE / "out"
PUBLIC_DATA = ROOT / "public" / "data"


def masked_gaussian(z: np.ndarray, sigma_px: float) -> np.ndarray:
    """Gaussian low-pass that ignores NaNs (normalized convolution). NaN stays NaN."""
    valid = np.isfinite(z)
    if sigma_px <= 0:
        return z.copy()
    filled = np.where(valid, z, 0.0)
    num = ndimage.gaussian_filter(filled, sigma_px, mode="nearest")
    den = ndimage.gaussian_filter(valid.astype(float), sigma_px, mode="nearest")
    out = np.where(den > 1e-6, num / np.maximum(den, 1e-6), np.nan)
    out[~valid] = np.nan
    return out


def plane_detrend(z: np.ndarray) -> np.ndarray:
    """Subtract the least-squares plane fitted to valid cells."""
    rows, cols = np.indices(z.shape)
    v = np.isfinite(z)
    if v.sum() < 3:
        return z - np.nanmean(z)
    A = np.column_stack([cols[v], rows[v], np.ones(v.sum())])
    coef, *_ = np.linalg.lstsq(A, z[v], rcond=None)
    return z - (coef[0] * cols + coef[1] * rows + coef[2])


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def write_heightfield(z: np.ndarray, posting_m: float, out_dir: Path, hf_id: str, meta: dict) -> dict:
    """Write a uint16 little-endian heightfield (0 = no data, 1..65535 = linear heights) plus JSON metadata.
    Heights are stored relative to the array minimum; the original elevation reference is recorded."""
    out_dir.mkdir(parents=True, exist_ok=True)
    valid = np.isfinite(z)
    zmin = float(np.nanmin(z))
    zmax = float(np.nanmax(z))
    span = max(zmax - zmin, 1e-6)
    q = np.zeros(z.shape, dtype="<u2")
    q[valid] = (1 + np.round((z[valid] - zmin) / span * 65534)).astype("<u2")
    raw = q.tobytes(order="C")
    fname = f"{hf_id}.bin"
    (out_dir / fname).write_bytes(raw)
    rec = {
        "id": hf_id,
        "file": f"/data/terrain/{fname}",
        "width": int(z.shape[1]),
        "height": int(z.shape[0]),
        "posting_m": float(posting_m),
        "extent_m": [float(z.shape[1] * posting_m), float(z.shape[0] * posting_m)],
        "z_min_m": zmin,
        "z_max_m": zmax,
        "encoding": "uint16 LE row-major (north row first); 0 = no data; z = z_min_m + (v-1)/65534*(z_max_m-z_min_m)",
        "valid_fraction": float(valid.mean()),
        "sha256": sha256_bytes(raw),
        **meta,
    }
    (out_dir / f"{hf_id}.json").write_text(json.dumps(rec, indent=2))
    return rec


def block_mean(z: np.ndarray, f: int) -> np.ndarray:
    """Aggregate by an integer factor with NaN-aware mean (cells with <50 % valid -> NaN)."""
    h, w = (z.shape[0] // f) * f, (z.shape[1] // f) * f
    zz = z[:h, :w].reshape(h // f, f, w // f, f)
    valid = np.isfinite(zz)
    s = np.where(valid, zz, 0).sum(axis=(1, 3))
    n = valid.sum(axis=(1, 3))
    out = np.where(n >= 0.5 * f * f, s / np.maximum(n, 1), np.nan)
    return out
