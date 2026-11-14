"""Numerical tests for the post-hoc detrended RMS roughness (science/pipeline/fieldtest_posthoc.py).

Run:  science/.venv/Scripts/python.exe -m pytest science/tests -q   (or: python science/tests/test_roughness.py)
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fieldtest_posthoc import detrended_rms, summarise  # noqa: E402


def test_plane_has_zero_roughness():
    r, c = np.mgrid[0:33, 0:33]
    z = 5.0 + 0.3 * c - 0.7 * r
    v = detrended_rms(z, np.ones_like(z, bool), 11)
    assert v.size == 9 and np.allclose(v, 0, atol=1e-9)


def test_checkerboard_rms_is_amplitude():
    # +/-a checkerboard on a tilted plane: the plane fit removes the tilt; residual RMS ~= a
    r, c = np.mgrid[0:22, 0:22]
    a = 2.0
    z = 0.5 * c + 0.2 * r + a * np.where((r + c) % 2 == 0, 1.0, -1.0)
    v = detrended_rms(z, np.ones_like(z, bool), 11)
    assert v.size == 4 and np.allclose(v, a, rtol=0.02)


def test_partial_edge_neighbourhoods_are_discarded():
    z = np.zeros((25, 25))
    assert detrended_rms(z, np.ones_like(z, bool), 11).size == 4  # 2 x 2 complete blocks; 3-cell strips dropped


def test_invalid_cells_threshold():
    z = np.zeros((11, 11))
    valid = np.ones_like(z, bool)
    valid[:2, :] = False  # 22 of 121 invalid (18 %) -> below the 90 % valid requirement
    assert detrended_rms(z, valid, 11).size == 0
    z2 = np.zeros((11, 11))
    z2[0, :5] = np.nan  # 5 NaN cells (4 %) -> kept, NaNs ignored
    assert detrended_rms(z2, np.ones_like(z2, bool), 11).size == 1


def test_units_follow_input_metres():
    rng = np.random.default_rng(0)
    z = rng.normal(0, 1.0, (330, 330))
    s1 = summarise(detrended_rms(z, np.ones_like(z, bool), 11))
    s10 = summarise(detrended_rms(10 * z, np.ones_like(z, bool), 11))
    assert abs(s10["median_m"] - 10 * s1["median_m"]) < 1e-2


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
