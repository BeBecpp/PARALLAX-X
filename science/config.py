"""Frozen study configuration. Mirrors science/prereg.md. Do not edit after the prereg commit
except through a logged deviation (science/DEVIATIONS.md)."""

# Integer-degree boxes (lat0, lat1, lon0, lon1), half-open, tiles named by SW corner.
TILE_GROUPS = {
    # D1: Trans-Altai Gobi search domain (clipped to Mongolia at analysis time)
    "D1_gobi": [(42, 45, 95, 101)],
    # D2: Lut search domain (contains the Kaluts yardang field = positive P1)
    "D2_lut": [(29, 32, 57, 60)],
    # P2: Qaidam Basin yardang reference area (outside search domains)
    "P2_qaidam": [(37, 39, 91, 94)],
    # P3: Puna ignimbrite yardang reference area
    "P3_puna": [(-27, -25, -68, -66)],
    # N1: linear dunes (Namib Sand Sea)
    "N1_namib": [(-26, -24, 15, 16)],
    # N2: strike / thrust ridges (Kalpin fold-thrust belt, Tarim)
    "N2_kalpin": [(39, 41, 78, 80)],
}

MARS_RADIUS_M = 3_396_190.0  # IAU Mars 2015 sphere, as in the CTX product CRS

GRID_M = 30.0                # common analysis grid spacing
WINDOW_KM = 10.0             # primary window (non-overlapping, step = window)
WINDOW_KM_SENS = 6.0         # sensitivity window
MAX_INVALID_FRAC = 0.05      # reject windows with > 5 % invalid cells
COMMON_SMOOTH_SIGMA_PX = 1.0 # identical Gaussian low-pass applied to Mars and Earth after resampling

# Feature baselines (central differences with half-offset h pixels -> baseline L = 2*h*GRID_M)
SLOPE_H_F2 = 3    # L = 180 m  (>= 150 m minimum baseline)
SLOPE_H_F3 = 10   # L = 600 m
TPI_RADIUS_M = 500.0
RELIEF_SUBWINDOW_KM = 2.0
ANISO_SIGMA_M = 300.0

N_QUANTILES = 199
PASS_PERCENTILE = 90.0
