# PARALLAX X — Where on Earth does this Mars terrain live?

**NASA Space Apps Challenge 2026 · Ulaanbaatar · Challenge: "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"**

**Live app:** _LIVE_URL_ · **Source:** https://github.com/BeBecpp/PARALLAX-X

PARALLAX X is a reproducible, evidence-first search for **Earth terrain that resembles a specific Martian landform**: the wind-carved yardangs of the Medusae Fossae Formation (MFF). You pick the Mars site, explore real NASA HiRISE elevation data in 3D, and compare it with Earth terrain at the same physical scale. Then you see **how far the evidence goes, and where it stops**.

## The result, stated plainly

The study design, including the pass/fail rule, was **pre-registered and committed before any Mars–Earth distance was computed** (commit `32b5c48`, [`science/prereg.md`](science/prereg.md)).

**Pre-registered validation: FAIL.**

| Test (pre-registered) | Outcome |
|---|---|
| ≥ 2 of 3 published Earth yardang fields rank ≥ 90th percentile | **0 of 3**: Lut Kaluts 64.6, Qaidam 17.4, Puna 85.7 (median window percentile) |
| Full 5-feature fingerprint beats a slope-only baseline | **No**: 55.9 vs 63.0 |
| Yardang fields rank above process-different look-alikes | **No**: Namib linear dunes 85.1 rank higher; Kalpin thrust ridges 45.4 |

- **Sensitivity:** the result is the same with 6 km windows (FAIL). An independent-DEM rerun with Copernicus GLO-30 is reported in the app's evidence drawer.
- **What it means:** at the scale where 30 m public Earth elevation data can be compared fairly with Mars (slope baselines ≥ 150 m), this terrain-geometry fingerprint **cannot reliably separate yardangs from other terrain**, and it confuses them with linear dunes.
- **A measured diagnostic, post-hoc and not used to change anything:** the MFF yardang ridges in the CTX DTM repeat every ~250–480 m. At the pre-registered 180 m baseline, a 250 m ridge keeps only ~26% of its slope signal.
- **Scale effect on Mars itself:** on the 1 m HiRISE crop, **13.9%** of the area is steeper than 15° at a ~4 m baseline, but only **1.6%** at the 180 m baseline. Fine terrain disappears at 30 m.

**Gobi output.** The search still ranked windows in the Trans-Altai Gobi (Mongolia). The top five clusters (e.g. G-1 near 44.27°N, 97.59°E) are shown as **exploratory morphometric candidates**. Because validation failed, they carry **no** analog claim. They need imagery, geology and field checks.

We think an honest failure is a useful contribution. It shows which questions public 30 m data **can** and **cannot** answer about Mars analogs, and what data would be needed: higher-resolution Earth DEMs and process-aware evidence.

## What you can do in the app
1. **Select:** a real MOLA map with the exact supported footprint (one supported Mars region).
2. **Explore:** HiRISE (NASA PDS) terrain in interactive 3D, with scale bar, posting and source.
3. **Compare:** Mars and Earth at the same 10 km extent, the same 30 m grid, identical processing and the same vertical exaggeration. Includes Gobi candidates, published yardang controls and process-different controls.
4. **Scale lens:** a "Landform study (≥150 m)" vs "Rover-scale (~5 m)" question. At rover scale the Earth side says **"Not evaluable — only 30 m public data."**
5. **Evidence drawer:** results, method, sources, limitations and AI-use disclosure. Every number is read from [`public/data/results.json`](public/data/results.json).

## How it works (no AI training)
Offline Python (GDAL/rasterio, NumPy, SciPy) runs the full chain:
- masks NoData and reprojects each DEM to a local metric grid (30 m);
- applies an identical smoothing to both planets;
- computes five terrain features (relief, slope at 180 m and 600 m, topographic position, ridge elongation);
- measures the 1-D Wasserstein distance to the Mars fingerprint and ranks against a declared null.

The web app is a static Next.js site with three.js rendering in the browser. No server, no database, no live AI calls. Details: [`docs/METHOD.md`](docs/METHOD.md).

## Data
- **NASA PDS** HiRISE DTM `DTEEC_009609_1675_010453_1675_A01` (NASA Resources-tab source).
- **USGS** CTX DTM `P16_007460_…_13S182W`.
- **NASA NASADEM** (LP DAAC product, retrieved from the Microsoft Planetary Computer mirror).
- **Copernicus GLO-30** (ESA).
- **MOLA** (context map).
- **Natural Earth**.

Full list with licences: [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Honesty notes
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): geometry ≠ geology; percentiles are not probabilities; no rover trafficability.
- [`docs/PRIOR_ART.md`](docs/PRIOR_ART.md): related 2026 projects. We are not the first to match Earth and Mars terrain.
- [`docs/AI_USAGE.md`](docs/AI_USAGE.md): AI (Claude) assisted research, simulated critique and code. No AI model was trained, and no AI-generated imagery is used in the app.
- [`science/DEVIATIONS.md`](science/DEVIATIONS.md): protocol changes, each logged before results were viewed.

Not affiliated with or endorsed by NASA.

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
science/.venv/Scripts/python -m pytest science/tests -q   # science tests (needs downloaded data for 3 of them)
```
Reproducing the science: see [`docs/METHOD.md`](docs/METHOD.md#reproduce).
