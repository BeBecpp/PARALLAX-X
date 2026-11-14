# SCIENCE_METHOD — and TEST_AND_VALIDATION_PLAN (no code; conceptual only)

## 1. Research question (measurable)
Given a fingerprint fixed in advance from the Medusae Fossae yardang DTMs:
1. Do held-out published Earth yardang analogs rank above a random-window null?
2. Do they also rank above process-different look-alikes?
3. Does the method beat a slope-histogram-only baseline?
4. Which windows in a pre-declared Gobi domain fall inside the known-analog envelope?

## 2. Pre-registration — commit this file BEFORE any distance is computed
The file is `prereg.yaml` or `.md`, committed and timestamped in the repo. It fixes:
- **Mars fingerprint area:** a polygon on the CTX DTM covering the yardang field. Drawn from the CTX hillshade and recorded with its coordinates.
- **Search domains:**
  - D1 Gobi box: lat/lon bounds and the stated selection criterion (aridity and sparse vegetation only).
  - D2 Lut box.
  - Control tiles: Qaidam, Puna, the dune field and the strike-ridge window.
- **Labels:** positive-analog window polygons taken from the cited papers' figures (Ehsani & Quiel 2008; Xiao et al. 2017; de Silva et al. 2010). Negative-control polygons.
- **Grid:** window size W = 10 km (sensitivity 6 km), step = W (declustered, non-overlapping), common grid spacing 30 m.
- **Projection:** local metric per window (Earth UTM zone; Mars sphere R = 3,396,190 m with a local equidistant projection).
- **Matching:** effective-resolution matching rule (§3.3). Features (§3.4) restricted to baselines ≥ 150 m.
- **Normalization and distance:** normalization (§3.5), distance (§3.6) and equal feature weights.
- **Decision rule (§5):** the "method passes" criterion is fixed now, before results exist.
- **No retuning:** no parameter is changed after held-out results are seen. Any later change is logged as a new, labelled run.

## 3. Pipeline (offline, Python CPU)

### 3.1 Ingest
| Data | Step |
|---|---|
| HiRISE `.IMG` | Read with GDAL's PDS driver; record the label |
| CTX COG | `gdalinfo`, confirming the true-scale latitude |
| NASADEM | LP DAAC HGT tiles plus the number-of-scenes layer |
| GLO-30 | COG range reads over the domains |

Record product ID, posting, CRS, datum, NoData value and valid fraction for every input.

### 3.2 Mask and project
- Mask NoData **before** any resampling: HiRISE ≤ −1e30; CTX −32767; NASADEM void-filled pixels.
- Erode the mask by the largest kernel radius.
- Reject windows with more than 5% NoData.
- Reproject each window to its local metric grid. Detrend with a least-squares plane, so absolute datums (areoid, EGM96, EGM2008) drop out.

### 3.3 Effective-resolution matching
- Estimate the radially averaged power spectrum on 3–4 windows per source.
- Find the wavelength λc where each spectrum departs from a power-law trend (its roll-off).
- Gaussian-filter the sharper sources (NASADEM, GLO-30, downsampled HiRISE) until their roll-off matches CTX's λc.
- Report E, the matched effective resolution, in the UI.
- Fallback rule if the spectra are noisy: use E = 3 × the CTX posting (about 60 m), citing Kirk et al. 2021 for stereo effective resolution. Prefer the measured value.

### 3.4 Features (each with units and baseline)
All slopes use the differential-slope convention: at baseline L, slope = atan(|z(x+L/2) − z(x−L/2)| / L), averaged over the x and y directions (after Kreslavsky & Head 2000).

| ID | Feature | Definition | Units | Why |
|---|---|---|---|---|
| F1 | Relief distribution | Distribution of detrended z within 2 km sub-windows; summarised by P5–P95 range | m | Landform amplitude |
| F2 | Slope distribution at L = 150 m | Distribution of differential slope | deg | Landform steepness at a baseline both datasets resolve |
| F3 | Slope distribution at L = 600 m | Same, at the longer baseline | deg | Multiscale shape (the ratio to F2 is implicit) |
| F4 | TPI distribution, r = 500 m | z minus the mean z within a 500 m annulus | m | Ridge/trough position |
| F5 | Anisotropy | Structure-tensor eigenvalue ratio λ2/λ1 of gradients, smoothed at 300 m, taken over the window distribution | ratio 0–1 | Elongation is the yardang signature. Orientation-invariant |
| F6 (optional) | Dominant spacing | Peak wavelength of the spectrum perpendicular to the dominant orientation | m | Yardang spacing; also the resolvability check |

The baseline method B0 uses F2 only.

### 3.5 Normalization
Each feature distribution is summarised by quantiles (P5, P25, P50, P75, P95). Those quantiles are rank-normalized against all Earth windows in the run. Robust (median/MAD) normalization is the pre-registered alternative, reported as sensitivity.

### 3.6 Distance
- Per feature: 1-D Wasserstein (W1) distance between the Mars and window distributions, computed on rank-normalized values.
- Score = the unweighted mean of the per-feature W1 values. **Equal weights, pre-registered.**
- Lower score = more similar. It is reported as a **rank and percentile** among windows, never as a percentage of similarity.

### 3.7 Clustering and candidates
- Windows in the top decile that are adjacent are merged into clusters.
- A candidate = a cluster. It is described by its centroid coordinates, area, median feature values and its percentile.

## 4. Controls and baselines
- **Positive, held out:** the best window in each labelled analog polygon (Lut, Qaidam, Puna) gives a percentile among N windows.
- **Negative, process-different:** strike-ridge windows (Gobi-Altai) and a linear-dune field window. These test whether F5 is fooled.
- **Null:** the distribution of all declustered windows. The percentile is computed against it.
- **Known-analog envelope:** the maximum pairwise distance between the Earth analog sites, measured in feature space. A Gobi cluster counts as "analog-close" only if it lies within this envelope of every positive.
- **Baseline B0:** slope-histogram W1 at L = 150 m only. The full method must beat B0 on mean positive percentile; otherwise the extra features add nothing, and we say so.
- **Objective-conditioning falsification:** applies only if the Utah tier ships. Prediction: Kendall τ between the landform-scale and rover-scale rankings is lower than τ between random feature subsets.

## 5. Decision rule (pre-registered)
**The method passes if both conditions hold:**
1. At least 2 of 3 held-out positives fall at or above the **90th percentile**.
2. The mean positive percentile exceeds that of B0 **and** that of both negative-control classes.

Otherwise the method **fails**, and the product shows a failure banner with the numbers. Pass or fail, the Gobi clusters are shown only with the "morphometric candidate" label.

## 6. Sensitivity and stability (high-value tier)
- Weights: 200 random Dirichlet(1) weight vectors.
- Window size: 6 km vs 10 km.
- DEM source: NASADEM vs GLO-30.
- Normalization: rank vs MAD.

For each, report top-10 Jaccard overlap and each candidate's stability as the percentage of runs in which it stays in the top-k.

## 7. Rover-scale tier (gated add-on: Aeolis Dorsa ↔ Utah)
- Both datasets are degraded to an effective resolution of 3–5 m (lidar Gaussian-filtered; HiRISE as is).
- Slopes at baselines of 5, 10 and 20 m. Anything below 5 m is badged "unreliable".
- Profiles: **L: 15°, loose / cohesionless**; **R: 30°, outcrop** (Hoover, Golombek & Calef 2012). Neither profile is named after a real rover.
- Metrics:
  - fraction of the window above the limit;
  - connectivity: the fraction reachable from the window centre below the limit, by flood fill.
- **Degradation demo:** the same Utah tile at 1, 5 and 30 m shows how its above-limit fraction collapses as resolution coarsens ("30 m hides the hazard").
- Label on every view: *"slope-class proxy at X m baseline; not trafficability (no rock, soil, slip or logistics data)."*

## 8. "Where the analogy breaks down": required content
Show three persistent lines in Compare, and the full table in the drawer. The table covers:
- **Lithology and induration:** MFF is possibly ignimbrite or ash, likely more porous and weaker.
- **Wind regime:** Mars has a thin atmosphere (~0.6 kPa) with a higher saltation threshold.
- **Age:** Hesperian/Amazonian on Mars vs Quaternary on Earth.
- **Gravity:** 0.38 g.
- **Earth-only factors:** water, frost and vegetation.
- **DEM provenance:** stereo DTM vs radar or optical DSM.
- **Scale:** the measured "what [E] m misses" value, taken from the HiRISE spectrum (the share of relief variance at wavelengths < λc).
- **Rover scale:** "no public data at rover scale for this candidate".

Cite sources in the drawer. Items without a source are marked as general knowledge to be checked.

## 9. Data classes in the UI (never blurred)
Badges: **Observed** (raw DEM), **Derived** (feature or score), **Proxy** (slope class), **Hypothetical** (rover profile), **Candidate** (Gobi cluster), **AI-assisted** (only if the stretch explainer ships). Every number carries its units and baseline.

## 10. Conceptual schemas (fields only, not code)
- **SourceRecord:** id, planet, provider, product_id, url, licence, posting_m, effective_res_m, crs, vertical_datum, nodata_value, valid_fraction, retrieved_at, resources_tab_route (PDS / Earthdata / none).
- **Window:** id, domain, centroid_lat, centroid_lon, size_km, source_ids, valid_fraction, features{F1..F6 quantiles}, score_full, score_b0, percentile_full, percentile_b0, label (positive / negative / unlabelled), cluster_id.
- **Candidate:** cluster_id, name_placeholder, centroid, area_km2, percentile, in_envelope (bool), stability_pct (optional), imagery_check (pending / pass / fail), geology_wind_check (pending / pass / fail), status_label ("morphometric candidate" | "candidate process analog"), breakdown_notes[].
- **Heightfield asset:** id, source_id, extent_m, grid_n, z_scale, z_offset, posting_m, effective_res_m, vertical_exaggeration_default, file.
- **RunManifest:** prereg_hash, run_id, timestamp, parameters, pass_fail, notes.

## 11. TEST_AND_VALIDATION_PLAN (to be run after APPROVED: BUILD)
| Test | Pass criterion |
|---|---|
| Synthetic plane | Known slope recovered to within 0.1° |
| Flat surface | Slope ≈ 0 |
| NoData | Mask works; no spikes after resampling (check max/min) |
| CRS sanity | HiRISE and CTX footprints overlay in the expected place; E-W and N-S spacing correct after reprojection |
| Traceability | Recompute one displayed window's F2 median by hand from the raw tile and match within tolerance; document it in the drawer |
| Matching | Power spectra before and after matching; λc values recorded |
| Recall / controls / B0 | Computed exactly as pre-registered; result shown whether pass or fail |
| Asset fidelity | The heightfield's min/max equals the source crop's min/max (after scale and offset) |
| UX | Select → compare in ≤ 3 clicks; screen-share legibility at 1080p and on Zoom; reduced-motion path |
| Performance | fps probe on an integrated-GPU laptop and on a phone; the fallback triggers correctly |
| Deploy | Production URL loads in incognito on mobile data; no 404s (lowercase paths); no login wall |
| Wording QA | Search all UI text for "match %", "first", "discover", "traversable", "validated"; must find 0 hits |
| Claude (stretch only) | No-data, hallucination-bait and timeout cases fall back to deterministic text |
