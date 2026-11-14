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
