# PARALLAX X — Where on Earth does this Mars terrain live?

**NASA Space Apps Challenge 2026 · Ulaanbaatar · Challenge: "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"**

**Live app:** https://parallax-x-lyart.vercel.app · **Source:** https://github.com/BeBecpp/PARALLAX-X

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

## Expedition Lab: from planetary evidence to field experiments

**Product thesis.** PARALLAX X is an evidence-first Mars–Earth analog explorer that turns terrain measurements into
transparent field-test questions.

### The three questions
- **Where?** The CTX yardang study area in Medusae Fossae drives the search. Its pre-registered fingerprint (F1–F5,
  Wasserstein-1) ranks 1,915 declared Earth windows. The result is five *exploratory* Gobi candidates; none is a
  confirmed analog.
- **Why?** For each candidate, *Why investigate this location?* shows:
  - which terrain-shape features are closest to Mars (measured);
  - post-hoc roughness (derived) and land cover (contextual);
  - everything that is still unknown.
- **What next?** **Plan a field experiment** opens Expedition Lab with the candidate preserved. It generates a
  deterministic protocol (`lib/expedition.ts`, unit-tested) for one of three experiments:
  - **Wheel mobility** (the primary experiment);
  - **Rock sampling & drilling**;
  - **Thermal & energy**.

  Every value comes from `results.json` / `fieldtest.json`. Traction, sinkage, soil strength, rock type, drillability
  and battery behaviour are shown as **Not measured** or **Field verification required**, and acceptance thresholds
  are **TO BE DEFINED** from real mission requirements. A plan can be copied or downloaded as Markdown.

### Evidence classes
Every value carries one of these labels:
- **Measured:** computed from documented source data.
- **Derived:** an explicit calculation based on measured inputs.
- **Contextual:** from an external source, with its scale and limitations.
- **Not measured:** no sufficient evidence.
- **Field verification required:** an open scientific or engineering question.

### What is measured, and what is not
The protocols are *proposals*. **No field test has been performed.** The rover traverse shown from the lab runs on the
separate HiRISE Mars scene. It is labelled "Illustrative terrain-following visualization · not a validated mobility
simulation", and it never drives on a Gobi candidate.

### Post-hoc descriptive layers
These come from `science/pipeline/fieldtest_posthoc.py` (logged in `science/DEVIATIONS.md`, Python tests in
`science/tests/`):
- **Local detrended RMS roughness:** the RMS of plane-fit residuals in 330 m and 990 m cells on the common 30 m grid.
- **ESA WorldCover 2021 v200 land-cover fractions:** computed inside the exact candidate footprints.

Neither layer enters F1–F5, the ranking or the FAILED decision.

### The Resolution Paradox and the judge demo
- **The Resolution Paradox** (Explore → left panel) shows the same HiRISE crop at its native posting and on the 30 m
  grid: 13.9 % of the area is steeper than 15° at a 4 m baseline, against 1.6 % at 180 m.
- **The judge demo** (Demo button or **J**) runs five acts in about 30 s: question → search → matched-scale evidence →
  Expedition Lab → FAILED validation. It ends on "Similarity is not proof. Evidence comes first."

## What you can do in the app
0. **Welcome intro:** a skippable branded opening. The orbital-X logo assembles, then a welcome line, then the rover over the real HiRISE hillshade, then the destination selector. It plays once per session and respects reduced motion. Every logo instance is generated from one vector source, `lib/brand.ts`.
1. **Select:** a Mars region navigator on the real MOLA map. The exact data footprints are drawn at true size; click anywhere to check coverage ("Not yet available" outside the published study area). Choose one of two real scenes: **HiRISE Scarp Explorer** (fine-scale 3D showcase) or **CTX Yardang Study** (the area used in the Mars–Earth ranking).
2. **Arrive:** a camera descent from the locator onto the terrain.
3. **Explore:** HiRISE (NASA PDS) terrain in interactive 3D under a low sun, with the expedition rover parked on the measured surface. It raises its mast using the source model's own rigged clip. Toggle between a cinematic view (illustrative haze, labelled) and a survey view with the exact data-footprint outline. A HI/LO performance mode covers integrated GPUs.
4. **Simulate:** a realistic six-wheel rover follows a hand-drawn loop over the HiRISE mesh. The 3D model is NASA/JPL-Caltech's Perseverance, with the insignia removed; see [docs/ROVER_MODEL.md](docs/ROVER_MODEL.md). Each wheel spins from the distance travelled, the throttle eases into points of interest, and the mast camera surveys at each stop. Controls: play, pause, replay, stop, skip to point of interest, scrub the timeline (the linked terrain profile follows), 0.5×/1×/2× time-lapse, follow / close-up / orbit cameras. It is a visualization, not mobility physics.
5. **Compare:** Mars and Earth at the same 10 km extent, the same 30 m grid, identical processing and the same declared vertical exaggeration. Includes Gobi candidates, published yardang controls and process-different controls, with live transects and a ranking from `results.json`.
6. **Evidence:** a question-led journey (what we measured → how we compared fairly → where on Earth → does it work → sources and next steps). It includes **Watch the math**, an animated chart of the exact ECDF-normalised quantile curves behind each W1 (re-computed and checked equal to the stored run).
7. **Research analyst:** rule-based answers built from `results.json` with the fields cited. Not an AI model.
8. **Guided demo:** one click runs a deterministic 30-second walkthrough (Select → rover → Compare → FAILED validation → takeaway). Esc skips it.
9. **Sound:** synthesized in the browser, off until you enable it (M toggles). See [`docs/AUDIO_CREDITS.md`](docs/AUDIO_CREDITS.md).

Every number is read from [`public/data/results.json`](public/data/results.json).

**Screenshots** (real production captures at 1920×1080, 1440×900, 1366×768 and 390×844): [`docs/screenshots/`](docs/screenshots/).
**Recordings** (real-time browser screencasts of the production site, animated WebP; the frame rate is limited by the capture machine's integrated GPU): [guided demo](docs/demo/parallax-x-guided-demo.webp), [welcome intro](docs/demo/welcome-intro.webp), [rover simulation](docs/demo/rover-simulation.webp).

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
