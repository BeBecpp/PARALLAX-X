"""Terrain features F1–F5 exactly as defined in science/prereg.md §6.
All inputs are float arrays on a square metric grid of spacing `post` metres, NaN = invalid."""
from __future__ import annotations

import numpy as np
from scipy import ndimage, signal

from common import plane_detrend


def slope_deg(z: np.ndarray, h: int, post: float) -> np.ndarray:
    """Slope at baseline L = 2*h*post using central differences; NaN where the stencil is invalid.
    Output has the same shape as z (border of width h is NaN)."""
    out = np.full(z.shape, np.nan)
    gx = (z[h:-h, 2 * h:] - z[h:-h, : -2 * h]) / (2 * h * post)
    gy = (z[2 * h:, h:-h] - z[: -2 * h, h:-h]) / (2 * h * post)
    out[h:-h, h:-h] = np.degrees(np.arctan(np.hypot(gx, gy)))
    return out


def gradients(z: np.ndarray, h: int, post: float) -> tuple[np.ndarray, np.ndarray]:
    gx = np.full(z.shape, np.nan)
    gy = np.full(z.shape, np.nan)
    gx[h:-h, h:-h] = (z[h:-h, 2 * h:] - z[h:-h, : -2 * h]) / (2 * h * post)
    gy[h:-h, h:-h] = (z[2 * h:, h:-h] - z[: -2 * h, h:-h]) / (2 * h * post)
    return gx, gy


def disk(r: int) -> np.ndarray:
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    return (x * x + y * y <= r * r).astype(float)


def tpi(z: np.ndarray, r_px: int) -> np.ndarray:
    """z minus mean z in a disk of radius r_px; NaN unless the whole disk is valid."""
    k = disk(r_px)
    valid = np.isfinite(z)
    zf = np.where(valid, z, 0.0)
    s = signal.fftconvolve(zf, k, mode="same")
    n = signal.fftconvolve(valid.astype(float), k, mode="same")
    full = n > k.sum() - 0.5
    out = np.where(full & valid, z - s / np.maximum(n, 1e-9), np.nan)
    out[:r_px, :] = np.nan
    out[-r_px:, :] = np.nan
    out[:, :r_px] = np.nan
    out[:, -r_px:] = np.nan
    return out


def coherence(z: np.ndarray, h: int, post: float, sigma_px: float) -> np.ndarray:
    """Structure-tensor coherence sqrt((Jxx-Jyy)^2+4Jxy^2)/(Jxx+Jyy), tensor smoothed by Gaussian sigma.
    NaN where the smoothing support touches invalid cells or the border."""
    gx, gy = gradients(z, h, post)
    valid = np.isfinite(gx) & np.isfinite(gy)
    gx0 = np.where(valid, gx, 0.0)
    gy0 = np.where(valid, gy, 0.0)
    jxx = ndimage.gaussian_filter(gx0 * gx0, sigma_px, mode="constant")
    jyy = ndimage.gaussian_filter(gy0 * gy0, sigma_px, mode="constant")
    jxy = ndimage.gaussian_filter(gx0 * gy0, sigma_px, mode="constant")
    vfrac = ndimage.gaussian_filter(valid.astype(float), sigma_px, mode="constant")
    tr = jxx + jyy
    c = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / np.maximum(tr, 1e-12)
    m = int(np.ceil(3 * sigma_px)) + h
    ok = (vfrac > 0.999) & (tr > 1e-12)
    out = np.where(ok, c, np.nan)
    out[:m, :] = np.nan
    out[-m:, :] = np.nan
    out[:, :m] = np.nan
    out[:, -m:] = np.nan
    return out


def relief_subwindows(z: np.ndarray, sub: int, mask: np.ndarray | None = None, min_valid: float = 0.95) -> np.ndarray:
    """F1: P95-P5 of plane-detrended elevation in non-overlapping sub x sub blocks."""
    vals = []
    H, W = z.shape
    for r in range(0, H - sub + 1, sub):
        for c in range(0, W - sub + 1, sub):
            blk = z[r : r + sub, c : c + sub]
            ok = np.isfinite(blk)
            if mask is not None:
                ok &= mask[r : r + sub, c : c + sub]
            if ok.mean() < min_valid:
                continue
            b = np.where(ok, blk, np.nan)
            d = plane_detrend(b)
            vals.append(float(np.nanpercentile(d, 95) - np.nanpercentile(d, 5)))
    return np.asarray(vals)


def all_features(z: np.ndarray, post: float, cfg, mask: np.ndarray | None = None) -> dict[str, np.ndarray]:
    """Compute F1..F5 value samples for a (smoothed) region. `mask` restricts which cells count
    (e.g. the Mars target polygon); the region is plane-detrended over its valid/masked cells first."""
    zz = z.copy()
    if mask is not None:
        zz = np.where(mask, zz, np.nan)
    zd = plane_detrend(zz)
    # for neighbourhood operators use the detrended surface but keep data outside mask as context
    zctx = plane_detrend_context(z, zz)
    sel = np.isfinite(zd) if mask is None else (mask & np.isfinite(zd))
    r_tpi = int(round(cfg.TPI_RADIUS_M / post))
    sig = cfg.ANISO_SIGMA_M / post
    f = {
        "F1": relief_subwindows(zd, int(round(cfg.RELIEF_SUBWINDOW_KM * 1000 / post)), mask=sel),
        "F2": slope_deg(zctx, cfg.SLOPE_H_F2, post)[sel],
        "F3": slope_deg(zctx, cfg.SLOPE_H_F3, post)[sel],
        "F4": tpi(zctx, r_tpi)[sel],
        "F5": coherence(zctx, cfg.SLOPE_H_F2, post, sig)[sel],
    }
    return {k: v[np.isfinite(v)] for k, v in f.items()}


def plane_detrend_context(z_full: np.ndarray, z_masked: np.ndarray) -> np.ndarray:
    """Fit the plane on the masked region, subtract it from the full array (keeps context cells)."""
    rows, cols = np.indices(z_full.shape)
    v = np.isfinite(z_masked)
    A = np.column_stack([cols[v], rows[v], np.ones(v.sum())])
    coef, *_ = np.linalg.lstsq(A, z_masked[v], rcond=None)
    return z_full - (coef[0] * cols + coef[1] * rows + coef[2])


QLEVELS = None


def quantiles(v: np.ndarray, n: int) -> np.ndarray:
    p = (np.arange(n) + 0.5) / n * 100.0
    if v.size == 0:
        return np.full(n, np.nan)
    return np.percentile(v, p)
