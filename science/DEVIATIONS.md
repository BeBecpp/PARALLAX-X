# Protocol deviations and additions (logged before results are viewed)

## 2026-11-14 ~11:45 UTC+8 — added independent-DEM cross-check (logged before the primary results were viewed)
- **What:** the identical pipeline (same polygons, windows, features, distance and decision rule) is re-run with
  Copernicus GLO-30 (ESA; AWS open data) in place of NASADEM, as `--dem glo30 --tag glo30`.
- **Why:** NASADEM (SRTM C-band) and GLO-30 (TanDEM-X X-band) are produced by different instruments and processing.
  If the ranking depends on one DEM's artefacts, the two runs will disagree.
- **Status:** sensitivity analysis only. The **pre-registered decision is the NASADEM primary run**. GLO-30 results
  are reported alongside it and cannot replace it.
- GLO-30 NoData: values ≤ −1000 and the file nodata value are masked, like NASADEM. GLO-30 is a DSM (includes
  vegetation and buildings); this matters little in hyper-arid windows.

## 2026-11-14 11:45 UTC+8 — ECDF subsample seeding (implementation detail; logged before any result was computed)
- The first primary run was stopped during tile reprojection, before any distance was computed, because it was too slow single-threaded.
- To parallelise window feature extraction across processes, each window's 500-value ECDF subsample is drawn with
  `numpy.random.default_rng(42 + crc32(window_id))` instead of one sequential `default_rng(42)` stream.
  It is still fixed, deterministic and seed-42-based. The features, distances and decision rule are unchanged.

## 2026-11-14 15:00 UTC+8 — W1 curve export for visualisation (post-hoc; cannot change any result)
- `science/pipeline/export_w1_curves.py` re-runs the frozen primary-run stages without changes, then writes the
  ECDF-normalised 199-quantile functions of Mars and each comparison window to `public/data/w1_curves.json`.
- It recomputes every per-feature W1 and refuses to export unless they equal the stored primary-run values.
  Result: max |recomputed − stored| = 0.0. The Mars raw quantiles were also checked against the stored fingerprint.
- Purpose: the animated "Watch the math" chart in the Evidence view. No decision, rank or percentile is affected.

## 2026-11-14 21:00 UTC+8 — Field-test context layers (post-hoc, descriptive; cannot change any result)
- `science/pipeline/fieldtest_posthoc.py` adds two descriptive layers. Both are written to
  `public/data/fieldtest.json`, and neither enters F1–F5, W1, the null distribution, the percentiles, the
  candidate ranking or the decision.
  1. **Local detrended RMS roughness.** On the same 30 m common grid with the same σ = 1 px low-pass:
     - the RMS of least-squares plane residuals is computed in non-overlapping 11×11 (330 m) and 33×33 (990 m)
       cell neighbourhoods;
     - only complete neighbourhoods are used, and each needs ≥ 90 % valid cells;
     - the summary is the median and the 90th percentile per window.
  2. **ESA WorldCover 2021 v200 (10 m) land-cover fractions.**
     - Footprint: the exact candidate footprints, i.e. the union of each cluster's 10 km windows.
     - Clusters are rebuilt from `search_primary.json` with the original rule; the script asserts they equal the
       published G-1…G-5.
     - Fractions are area-weighted (cos latitude). The data are read by HTTP range requests from the official ESA
       COG bucket.
- Results (median roughness, 330 m cells):
  - Mars CTX study area: 2.63 m;
  - G-1…G-5 clusters: 1.54–3.35 m.
- WorldCover: "Bare / sparse vegetation" covers 88.7–99.3 % of the candidate footprints, with no nodata.
- Land cover is not material type. Roughness at 30 m says nothing about rover-scale hazards, traction or drilling.
