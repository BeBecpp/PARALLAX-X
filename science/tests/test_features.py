"""Analytic tests for the terrain features (science/prereg.md §6). Run:
science/.venv/Scripts/python -m pytest science/tests -q"""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config as cfg  # noqa: E402
from common import block_mean, masked_gaussian, plane_detrend  # noqa: E402
from features import all_features, coherence, quantiles, relief_subwindows, slope_deg, tpi  # noqa: E402

POST = 30.0


def plane(n=200, sx=0.1, sy=0.05):
    r, c = np.indices((n, n))
    return sx * c * POST + sy * r * POST


def test_slope_on_analytic_plane_within_0p1_deg():
    z = plane(sx=0.2, sy=-0.1)
    expected = np.degrees(np.arctan(np.hypot(0.2, -0.1)))
    for h in (cfg.SLOPE_H_F2, cfg.SLOPE_H_F3):
        s = slope_deg(z, h, POST)
        v = s[np.isfinite(s)]
        assert v.size > 0
        assert np.max(np.abs(v - expected)) < 0.1


def test_flat_surface_zero_slope():
    z = np.full((120, 120), 1234.5)
    s = slope_deg(z, 3, POST)
    assert np.nanmax(s) < 1e-9


def test_nodata_guard_no_spikes():
    rng = np.random.default_rng(0)
    z = 100 + rng.normal(0, 1, (100, 100))
    z[40:60, 40:60] = np.nan                      # hole
    z_bad = z.copy()
    z_bad[np.isnan(z_bad)] = -3.4e38              # sentinel would explode if unmasked
    sm = masked_gaussian(z, 1.0)
    assert np.isnan(sm[50, 50])
    assert np.nanmax(np.abs(sm - 100)) < 10       # no spikes near the hole edge
    # block mean must not mix the hole into neighbours either
    bm = block_mean(z, 10)
    assert np.nanmax(np.abs(bm - 100)) < 5
    # slope never reads across invalid cells
    s = slope_deg(sm, 3, POST)
    assert np.all(np.isnan(s[45:55, 45:55]))


def test_tpi_zero_on_plane_and_positive_on_peak():
    z = plane()
    t = tpi(z, 17)
    assert np.nanmax(np.abs(t)) < 1e-6
    r, c = np.indices((101, 101))
    bump = 50 * np.exp(-((r - 50) ** 2 + (c - 50) ** 2) / (2 * 5 ** 2))
    t2 = tpi(bump, 17)
    assert t2[50, 50] > 30


def test_coherence_ridges_vs_isotropic():
    r, c = np.indices((200, 200))
    ridges = 20 * np.sin(2 * np.pi * c * POST / 600.0)         # parallel ridges, 600 m spacing
    coh_r = coherence(ridges, 3, POST, 10)
    rng = np.random.default_rng(1)
    noise = masked_gaussian(rng.normal(0, 10, (200, 200)), 4)  # isotropic texture
    coh_n = coherence(noise, 3, POST, 10)
    assert np.nanmedian(coh_r) > 0.95
    assert np.nanmedian(coh_n) < 0.6


def test_relief_subwindow_detrended():
    z = plane()  # pure plane -> zero detrended relief
    f1 = relief_subwindows(z, 66)
    assert f1.size == 9 and np.max(f1) < 1e-6


def test_all_features_runs_and_mask_respected():
    rng = np.random.default_rng(2)
    z = masked_gaussian(rng.normal(0, 20, (333, 333)), 3) + plane(333)
    m = np.zeros(z.shape, bool)
    m[50:280, 50:280] = True
    f = all_features(z, POST, cfg, mask=m)
    assert set(f) == {"F1", "F2", "F3", "F4", "F5"}
    for k, v in f.items():
        assert v.size > 0, k
        assert np.all(np.isfinite(v))


def test_quantiles_monotone():
    q = quantiles(np.arange(1000.0), 199)
    assert np.all(np.diff(q) > 0)
