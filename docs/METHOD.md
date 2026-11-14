# Method

The study design was frozen in [`science/prereg.md`](../science/prereg.md) and committed (`32b5c48`, 2026-11-14 11:22 UTC+8) **before** any Mars–Earth distance was computed. Any deviation is logged in [`science/DEVIATIONS.md`](../science/DEVIATIONS.md). The results in this repository come from that frozen design.

## Question
Where on Earth, within declared search areas, does terrain *geometry* most resemble the yardangs of the Medusae Fossae Formation (MFF) on Mars? And can the method be trusted? To answer the second part, it must rank published Earth yardang fields above ordinary terrain and above look-alikes formed by different processes.

## Pipeline (`science/pipeline/`)
1. **Mars fingerprint** (`search.py: mars_grid`). The USGS CTX DTM (20 m) is masked (NoData −32767) and reprojected to a local equidistant-cylindrical grid on the Mars sphere (R = 3,396,190 m, true scale at the target latitude). It is resampled by averaging to 30 m and smoothed with a NaN-aware Gaussian (σ = 30 m). The pre-registered yardang polygon (about 26 × 7.5 km) defines which cells form the fingerprint.
2. **Earth windows** (`search.py: earth_windows`). Each NASADEM 1° tile is masked (−32768), reprojected to an azimuthal-equidistant grid centred on the tile, resampled to 30 m and smoothed identically. Non-overlapping 333 × 333-cell (9.99 km) windows with more than 5% invalid cells are dropped. Windows are labelled by domain and site using pre-registered polygons. The Gobi domain (D1) is clipped to Mongolia.
3. **Features** (`features.py`). Each region is plane-detrended first. All baselines are ≥ 150 m because a 30 m grid cannot support finer slopes.
   - F1 local relief (P95−P5 per 1.98 km sub-window)
   - F2 slope at 180 m baseline
   - F3 slope at 600 m baseline
   - F4 topographic position (510 m disk)
   - F5 ridge elongation (structure-tensor coherence at σ = 300 m)
4. **Distance.** Each feature's values are mapped through the empirical CDF of the pooled null-window values (random subsample, seed 42).
   - Per-feature 1-D Wasserstein (W1) distance between the Mars and window distributions, computed from 199 quantiles.
   - **Score D** = mean of F1–F5 (equal weights).
   - **Baseline B0** = W1 of F2 only.
5. **Percentiles.** A window's percentile is the share of null windows (all Gobi and Lut windows, excluding the Kaluts reference polygon) that are *farther* from the Mars fingerprint. Higher = more similar. A percentile is **not** a probability or a "% match".
6. **Validation** (pre-registered).
   - **Site percentile** = median window percentile inside its polygon.
   - **PASS requires all of:**
     - (a) ≥ 2 of 3 published yardang sites (Lut, Qaidam, Puna) at ≥ 90;
     - (b) mean positive percentile higher under D than under B0;
     - (c) mean positive percentile higher than both process-different controls (Namib linear dunes, Kalpin thrust ridges).
7. **Candidates.** Gobi windows at ≥ 95 seed clusters, which are joined to adjacent windows at ≥ 90. These are **morphometric candidates**, not confirmed analogs.
8. **HiRISE** (`export_hirise.py`). A 4 km crop of the 1 m HiRISE DTM provides:
   - the 3D hero terrain;
   - a genuinely aggregated 30 m version of the same crop, for the "fair comparison" view;
   - measured slope statistics at a ~4 m baseline vs a 180 m baseline, showing what a 30 m analysis cannot see.

## Tests (`science/tests/`)
- Analytic plane slope within 0.1°.
- Flat surface gives zero slope.
- NoData guard: no spikes at holes.
- TPI is zero on a plane.
- Coherence distinguishes parallel ridges from isotropic texture.
- Detrended relief of a plane is zero.
- Real-tile projection checks:
  - a 333-cell Earth window measures 9.99 km on the WGS84 ellipsoid;
  - a 100-cell Mars span measures 3 km on the Mars sphere.

Run them with: `science/.venv/Scripts/python -m pytest science/tests -q`.

## Reproduce
```
python -m venv science/.venv && science/.venv/Scripts/pip install numpy scipy rasterio pyproj shapely pillow requests pytest
science/.venv/Scripts/python science/acquire.py                 # NASADEM tiles + Natural Earth
# HiRISE + CTX: download the two URLs listed in docs/DATA_SOURCES.md into science/data/raw/
science/.venv/Scripts/python science/pipeline/export_hirise.py
science/.venv/Scripts/python science/pipeline/search.py --window-px 333 --tag primary
science/.venv/Scripts/python science/pipeline/search.py --window-px 200 --tag sens6km
science/.venv/Scripts/python science/pipeline/locator.py
science/.venv/Scripts/python science/pipeline/export_results.py
```
