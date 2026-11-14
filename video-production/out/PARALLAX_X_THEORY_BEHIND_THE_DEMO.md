# PARALLAX X: the theory behind the 29-second demo (technical companion)

This is the written companion to the V3 demo video (`PARALLAX_X_SPACE_APPS_2026_DEMO_V3_SCIENCE.mp4`). The video has
29 seconds; this document has the details the video cannot show.

- **Sources.** Every statement points to the repository file that implements or documents it, at app release
  `2b9556c`.
- **Timestamps.** Times such as **[0:05]** refer to the V3 video.
- **Repository:** https://github.com/BeBecpp/PARALLAX-X
- **App:** https://parallax-x-lyart.vercel.app

---

## 1. The problem, and what an "analog" means here **[0:00–0:05]**

**Question.** Which declared Earth terrain windows have a terrain-geometry fingerprint closest to a wind-eroded Mars
study area? Such windows would be candidate places to rehearse Mars rover field work.

**Mars target.**
- The yardang field of the **Medusae Fossae Formation** (MFF), a pre-registered polygon of about 26 × 7.5 km inside a
  USGS CTX stereo DTM.
- Sources: `docs/METHOD.md`, `science/prereg.md`.

**What an "analog" is here.** In this project, a terrestrial analog candidate is **a terrain window whose distribution
of five slope/relief/shape descriptors resembles the Mars fingerprint at a 30 m grid**.

**What it is not.**
- It is not a claim about lithology, mineralogy, age, wind regime or formation process.
- Candidates are **exploratory morphometric candidates, not confirmed analogs**.
- Source: `docs/LIMITATIONS.md` §1–2.

## 2. Data provenance **[0:02–0:05, 0:10–0:17]**

| Role | Dataset | Provider | Native posting | Used for |
|---|---|---|---|---|
| Mars fingerprint | CTX DTM `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W` | NASA MRO Context Camera imagery → **USGS Astrogeology controlled stereo DTM** | ~20 m | Search reference |
| Earth windows (primary) | **NASADEM_HGT v001**, 43 1° tiles (doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001) | NASA JPL / LP DAAC, via the Microsoft Planetary Computer mirror | 1″ (~30 m) | All 1,915 Earth windows |
| Independent DEM check | **Copernicus GLO-30** (same tiles) | ESA / DLR / Airbus via AWS open data | 1″ | Sensitivity re-run (`science/DEVIATIONS.md`) |
| Rover scene + resolution study | **HiRISE DTM** `DTEEC_009609_1675_010453_1675_A01` | NASA PDS, MRO HiRISE / University of Arizona | 1.01 m | 3D rover visualization; 4 m vs 180 m slope statistics. **A separate scene ~10 km from the CTX study area, not the search target and not a Gobi site.** |
| Location map | MGS MOLA 463 m mosaic | NASA/GSFC, USGS | 463 m | Select-screen navigator only |
| Post-hoc context | ESA WorldCover 2021 v200 | ESA WorldCover consortium, CC BY 4.0 | 10 m | Land-cover fractions of candidate footprints (descriptive) |

**Search domain.** Only two **declared** Earth domains were searched: the Trans-Altai Gobi box clipped to Mongolia,
and the Lut box. This is **not a global survey** (`docs/LIMITATIONS.md` §8). Full provenance, URLs and SHA-256
hashes are in `docs/DATA_SOURCES.md` and `science/acquisition_log*.json`.

## 3. Grids, projection and scale honesty **[0:02–0:05]**

Sources: `docs/METHOD.md`; `science/config.py`; `science/pipeline/search.py`.

- **Mars.** NoData −32767 is masked. The DTM is reprojected to a local equidistant-cylindrical grid on the **Mars
  sphere** (R = 3,396,190 m), averaged to **30 m**, and smoothed with a NaN-aware Gaussian **σ = 30 m** (1 px).
- **Earth.** Each NASADEM tile is masked (−32768) and reprojected to an azimuthal-equidistant grid on **WGS84**. It is
  resampled to 30 m and smoothed identically.
- **Windows.** Non-overlapping **333 × 333 cells = 9.99 × 9.99 km**. Windows with more than 5 % invalid cells are
  dropped.
- **Minimum baseline.** No slope baseline is shorter than **150 m**; a 30 m grid cannot support finer slopes. Nothing
  at wheel scale is resolved at this stage.
- **Tests.** In `science/tests/`, a 333-cell Earth window is checked to measure 9.99 km on WGS84, and a 100-cell Mars
  span is checked to measure 3 km on the Mars sphere.

## 4. The five fingerprint features F1–F5 **[0:05–0:07.5]**

Source: `science/pipeline/features.py`; feature metadata in `public/data/results.json → features`. Each region is
plane-detrended first. These are **terrain-geometry descriptors only**.

| Key | Quantity | Implementation | Scale |
|---|---|---|---|
| **F1** | Local relief | P95 − P5 of plane-detrended elevation in non-overlapping blocks (`relief_subwindows`) | Documented as 1.98 km blocks. *Note:* the code computes `round(2.0 km / 30 m)` = 67 cells = 2.01 km, a ~1.5 % labelling difference; the video says "≈ 2 km". |
| **F2** | Slope | θ_L = atan(√((∂z/∂x)² + (∂z/∂y)²)), central differences at offsets ±3 cells (`slope_deg`) | L = 180 m |
| **F3** | Slope | Same, offsets ±10 cells | L = 600 m |
| **F4** | Topographic Position Index | TPI = z − mean(z over disk), valid only where the whole disk is valid (`tpi`) | Disk radius 17 cells = 510 m |
| **F5** | Ridge elongation (gradient coherence) | Structure tensor J = G_σ ∗ [gx², gx·gy; gx·gy, gy²] from 180 m-baseline gradients. Coherence C = √((Jxx − Jyy)² + 4Jxy²) / (Jxx + Jyy) = (λ₁ − λ₂)/(λ₁ + λ₂). Orientation-invariant; guarded where Jxx + Jyy ≈ 0 (`coherence`). | σ = 300 m |

**What the features are not.** None of F1–F5 measures rock type, soil, traction, mineralogy, water, or a learned
embedding. A high coherence indicates parallel ridge geometry. **It does not prove wind erosion** (equifinality,
`docs/LIMITATIONS.md` §1).

## 5. Comparing distributions: ECDF → Wasserstein-1 → D **[0:07.5–0:10]**

Source: `science/pipeline/search.py` (`ecdf_maps`, `to_norm`, `score`, `percentiles`); visualised by
`components/analysis/w1-explainer.tsx` using `public/data/w1_curves.json`.

1. **Quantiles.** Each region's feature values are summarised by **199 quantiles**, at levels p_i = (i + 0.5)/199
   (`features.quantiles`, `config.N_QUANTILES = 199`).
2. **Common unit scale.** The features have different units (m, °, unitless). Each is mapped through the **mid-rank
   empirical CDF** of pooled null-window samples (seed 42):
   **u(v) = (#{p < v} + #{p ≤ v}) / (2N)** (`to_norm`).
3. **Per-feature Wasserstein-1 (1-D optimal transport).**
   **W1_k = (1/199) Σᵢ | u(Q_E,k(pᵢ)) − u(Q_M,k(pᵢ)) |**, the mean gap between matched quantile functions. For 1-D
   distributions this equals the W1 distance between the two normalised distributions.
4. **Fingerprint distance.** **D = ⅕ (W1_F1 + W1_F2 + W1_F3 + W1_F4 + W1_F5)**, equal weights. **Baseline B0 = W1_F2**
   (slope only).
5. **Percentile.** A window's percentile is the share of null windows (all Gobi + Lut windows, excluding the Kaluts
   reference polygon) that are farther from Mars. The percentile is **a rank, not a probability and not a "% match"**.
6. **Candidates.** Gobi windows at percentile ≥ 95 seed clusters, which grow over adjacent windows at ≥ 90. This
   produced **five exploratory clusters, G-1…G-5**.

**What the app animates.** The Evidence view's "Watch the math" chart (shown at **[0:07.5]**) draws the real Mars and
Earth 199-quantile functions and sweeps the gap. The export script re-computed every W1 and refused to export unless
it matched the stored value (max |difference| = 0.0; `science/DEVIATIONS.md`).

**No machine learning.** There is no machine-learning model, neural network or trained embedding in the screening, and
the deployed site makes no runtime AI calls.

## 6. Controls and the pre-registered validation (FAILED) **[noted at 0:09–0:10]**

**Frozen design.** The decision rule, reference polygons and tests were frozen **before any Mars–Earth distance was
computed**. See `science/prereg.md` (commit `32b5c48`, "frozen study design before any Mars–Earth distance"); later
additions are logged in `science/DEVIATIONS.md`.

**PASS required all of:**
- **(a)** ≥ 2 of 3 published yardang sites at percentile ≥ 90;
- **(b)** mean positive percentile under D higher than under B0;
- **(c)** positives above both process-different controls.

**Result: FAIL.**

| Test | Measured | Required | Met? |
|---|---|---|---|
| (a) Known yardangs | Lut **64.6**, Qaidam **17.4**, Puna **85.7**: 0 of 3 at ≥ 90 | ≥ 2 of 3 | No |
| (b) Full vs slope-only | Mean positive percentile **55.9** (full D) vs **63.0** (slope-only B0) | D > B0 | No |
| (c) Controls | Namib linear dunes control **85.1** (above the positives' mean); Kalpin ridges 45.4 | Positives above both | No |

**Consequence.** The five-feature fingerprint did not recognise known Earth yardangs at this scale. The Gobi windows
are therefore **exploratory leads, not validated analogs**.

**How the video handles it.** The 30-second promo shows "EXPLORATORY SCREENING · PRE-REGISTERED VALIDATION NOT
PASSED" when the candidates appear. The full figures remain in the app's Evidence view, the README and this document.

## 7. Post-hoc descriptive context (not scoring) **[visible in Expedition Lab, 0:17.6–0:24.8]**

Sources: `docs/METHOD.md` "Post-hoc field-test context"; `science/pipeline/fieldtest_posthoc.py`;
`science/tests/test_roughness.py`; `public/data/fieldtest.json`.

- **Detrended RMS roughness.** On the same 30 m grid:
  **R_rms = √( mean( (zᵢ − (a + b·xᵢ + c·yᵢ))² ) )**, with a least-squares plane per non-overlapping **11 × 11 (330 m)**
  or **33 × 33 (990 m)** neighbourhood. Only neighbourhoods with ≥ 90 % valid cells are used. The window statistic is
  the median and P90.
- **ESA WorldCover 2021 v200.** Area-weighted (cos latitude) land-cover fractions over each candidate cluster's
  windows.
- **What they cannot do.** They cannot measure grain size, sand traction, minerals or rover suitability, and they
  **cannot change F1–F5, W1, the percentiles, the ranking or the FAIL decision**.

## 8. The resolution paradox: why 30 m cannot answer wheel-scale questions **[0:24.8–0:26.6]**

Source: `science/pipeline/export_hirise.py`; `public/data/results.json → hirise`.

On a 4 km crop of the 1 m HiRISE DTM, the share of area steeper than 15° is:
- **13.9 %** at a **~4 m** slope baseline;
- **1.6 %** at a **180 m** baseline.

The same terrain loses most of its steep area when measured at the comparison scale. This is a **scale effect**. It
is **not** a hazard probability or a drivability measure. MSL slope limits are defined on ~1 m HiRISE slope maps
(Hoover, Golombek & Calef 2012; Golombek et al. 2012).

## 9. The rover visualization: what is animated, and what is not **[0:10.2–0:17.6]**

Sources: `lib/rover-rig.ts`, `lib/terrain-engine.ts`, `docs/ROVER_MODEL.md`, `docs/LIMITATIONS.md` §13.

- **Model.** NASA/JPL-Caltech "Mars 2020 Perseverance Rover" glTF from NASA 3D Resources, Draco-compressed, with
  insignia removed. It is not NASA-endorsed.
- **Six wheel pivots.** The source groups all six wheels in one mesh. `splitWheels()` clusters the triangles into
  **six pivots**, each spinning about its own axle.
- **Wheel spin.** `wheelAngle += travelled / radius`, i.e. **Δθ = Δs / r**, from the distance actually travelled along
  the path. This is visual rolling only; **no wheel–soil slip is modelled**.
- **Ground following.** The chassis sits on the rendered HiRISE DEM surface. Pitch and roll come from **four surface
  samples** across the displayed wheelbase, smoothed (`placeRover`).
- **Mast.** It raises using the model's own rigged clip. The head pans procedurally at points of interest
  (`rover.scan()`); this pan is visible at **[0:15–0:17]**.
- **Path and camera.** The path is a **hand-drawn loop**, not a computed or safety-optimised route. The throttle is
  eased and playback is time-lapsed. Follow and Close-up cameras use exponential smoothing.
- **Scale.** "Cinematic" mode enlarges the rover (**×41 here**, shown on screen). True scale is a ~3 m body.
- **Not modelled.** Rocker-bogie articulation, corner steering, traction, slip, sinkage, soil deformation, obstacles,
  power, route safety.

## 10. Expedition Lab: proposed field tests, deterministic, not measured **[0:17.6–0:24.8]**

Sources: `lib/expedition.ts` (unit-tested), inputs `public/data/results.json` + `public/data/fieldtest.json`.

**How the protocol is built.**
- Expedition Lab **generates a deterministic protocol**. Every value is copied from those files, labelled with its
  evidence class (MEASURED / DERIVED / CONTEXTUAL), or marked **NOT MEASURED**.
- It **estimates nothing**: no traction, sinkage, drill performance, battery endurance or temperature.

**Wheel-mobility protocol: measurements to collect** (formulas as shown in the app):

| Quantity | Formula (from `lib/expedition.ts`) | Needs | Status |
|---|---|---|---|
| Wheel slip ratio | **s = 1 − v_ground / (r · ω)** (driven-wheel convention, r·ω > 0) | Calibrated effective radius r, encoder ω, independent ground speed | **Not measured** |
| Energy per distance | **E/d = ∫ V · I dt / d_measured** | Logged bus voltage and current; ground-truth distance | **Not measured** |
| Wheel sinkage | **z = h_reference − h_rut** | A documented reference surface and marked stations | **Not measured** |

**Also listed as unknowns:** soil bearing strength, shear strength, rock and obstacle distribution at wheel scale,
mobility safety, and lithology. Other protocols add drilling torque and wear, and thermal or electrical logging.

**Acceptance thresholds** are explicitly "TO BE DEFINED" from mission or hardware requirements; none are invented.

**Reference.** Slip and sinkage definitions follow Wong, *Theory of Ground Vehicles* (2008).

**No physical field test has been performed.**

## 11. Technology actually used

| Area | Stack |
|---|---|
| Web app | **Next.js 16.4.6**, **React 19.3.1**, **TypeScript 5.9.3**, Tailwind CSS 4.3.5, **Three.js 0.187.0** (WebGL), Draco glTF |
| Hosting | Static deployment on Vercel |
| Tests | Vitest (app); pytest (`science/tests/`) |
| Science pipeline | Python with **NumPy**, **SciPy** (`signal.fftconvolve`, `ndimage.gaussian_filter`), **rasterio** (GDAL), **pyproj**, **shapely** |
| Data exports | JSON (`results.json`, `fieldtest.json`, `w1_curves.json`, `sources.json`) |
| AI in development | **Claude Code** (Anthropic) was the primary coding assistant; ChatGPT was used for limited research and concept discussion (`docs/AI_USAGE.md`) |
| AI at runtime | **No runtime Claude or other AI API**, and **no trained ML model** in the screening |
| Video production only | **Kokoro-82M TTS** (AI voice), headless Chromium capture of the live app with a deterministic virtual clock, Python compositor, original synthesized score, FFmpeg |

## 12. What the demo illustrates vs what the science measured

| In the video | What it is | What it is not |
|---|---|---|
| Mars CTX and Gobi G-1 3D terrain **[0:05]** | Measured DEMs on a common 30 m grid | Not proof the places are geologically alike |
| F1–F5, ECDF, W1, D **[0:05–0:10]** | Exact implemented descriptors and distance | Not a probability, not a "% match", not ML |
| "1,915 windows · 5 exploratory candidates" **[0:09]** | Ranks within two declared domains | Not validated analogs; the pre-registered validation did not pass |
| Rover on HiRISE terrain **[0:10–0:17]** | Real 3D model on a measured 1 m DTM; Δθ = Δs/r wheel spin; 4-point surface tilt; enlarged ×41 | Not mobility physics, not a Gobi site, not a field test |
| Slip, sinkage and energy formulas **[0:18–0:25]** | Measurements a future field test must collect | Nothing computed; no thresholds; no field data |
| 13.9 % → 1.6 % **[0:25]** | A measured scale effect on one HiRISE crop | Not a hazard or drivability probability |
| Concept-film shots **[0:00–0:02, 0:26–0:28]** | AI-generated branding (Khuslen, V01D-404), watermarked | Not software, not data |

## Citations

- **NASA MRO CTX** (Malin et al. 2007); **USGS Astrogeology** controlled CTX DTMs.
- **NASA MRO HiRISE** (McEwen et al. 2007), via NASA PDS.
- **NASADEM**: NASA JPL (2020), doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001.
- **Copernicus GLO-30**: ESA, © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018.
- **ESA WorldCover 2021 v200**: Zanaga et al. 2022, doi:10.5281/zenodo.7254221, CC BY 4.0.
- **MGS MOLA**: NASA/GSFC, USGS mosaic.
- **Reference sites:**
  - Ehsani & Quiel 2008 (Lut).
  - Xiao et al. 2017 and Wang et al. 2018 (Qaidam).
  - de Silva et al. 2010 (Puna).
  - Golombek et al. 2012 and Hoover, Golombek & Calef 2012 (slope criteria).
  - Kirk et al. 2021 (DTM effective resolution).
  - Kreslavsky & Head 2000.
- **Wong, J. Y. (2008)** *Theory of Ground Vehicles*, 4th ed.
- **3D rover model**: NASA/JPL-Caltech, NASA 3D Resources (modified).

**Limitations.** The full list is in `docs/LIMITATIONS.md`, including instrument differences (CTX photogrammetry vs
SRTM radar), NASADEM void-fill, the low-confidence Puna polygon, Earth vs Mars gravity, and the absence of expert
review.
