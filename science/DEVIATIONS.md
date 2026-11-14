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
