# DATA_FEASIBILITY_MATRIX — dataset source ledger (checked 2026-11-14)

"VERIFIED" means the research pass confirmed it from a PDS label, an HTTP HEAD request, or a STAC/TNM API response on 2026-11-14. Nothing has been downloaded in full or processed yet. All sizes are on-disk file sizes, not processed asset sizes.

## Mars

| Region | Product | ID | Posting | Footprint | Size | CRS / datum / NoData | Access | Licence | Status |
|---|---|---|---|---|---|---|---|---|---|
| **Medusae Fossae yardangs** (primary) | HiRISE DTM (PDS) | `DTEEC_009609_1675_010453_1675_A01` | 1.01 m (per label) | 13.3 × 6.5 km bbox, −12.5°, 178.0°E | 338.6 MB `.IMG` | Equirectangular (local sphere) · areoid (Mars 2000) · NoData ≈ −3.4e38 | `hirise-pds.lpl.arizona.edu/PDS/DTM/…`, no login | NASA/PDS public | VERIFIED |
| Medusae Fossae | USGS CTX DTM (COG) | `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W` | 20.16 m | 36 × 30 km, fully covers the HiRISE DTM | 6.3 MB | Mars 2015 sphere equirectangular clon=0 (**true-scale latitude UNVERIFIED**, run `gdalinfo`) · areoid · −32767 | `astrogeo-ard` S3, no login | CC0 | VERIFIED |
| **Aeolis Dorsa inverted/meander ridges** (rover-scale) | HiRISE DTM (PDS) | `DTEEC_020673_1750_020528_1750_A01` | 1 m | 19.3 × 7.6 km, −5.07°, 154.9°E | 577.4 MB | as above | PDS, no login | public | VERIFIED |
| Aeolis Dorsa | USGS CTX DTM | `P19_008621_1750_XI_05S205W__B17_016269_1751_XN_04S205W` | 20 m | 51 × 33 km; **only partial** HiRISE overlap | 9.3 MB | as above | S3 | CC0 | VERIFIED |
| Jezero (backup, recognisable) | HiRISE DTM | `DTEEC_023524_1985_023379_1985_U01` | 1 m | 21.5 × 8.3 km; delta coverage **UNVERIFIED** | 700.3 MB | as above | PDS | public | VERIFIED |
| Jezero | USGS CTX DTM | `P18_007925_1987_XN_18N282W__P19_008650_1987_XI_18N282W` | 20 m | 93 × 41 km | 18.1 MB | as above | S3 | CC0 | VERIFIED |
| Oxia Planum (backup) | HiRISE + CTX | `DTEEC_063839_1980_064261_1980_H01` / `N05_064261_…` | 1 m / 20 m | 14.4×5.9 / 74×38 km | 333 MB / 13.6 MB | as above | PDS / S3 | public / CC0 | VERIFIED |
| Context only | MOLA 463 m, HRSC-MOLA 200 m | — | 463 / 200 m | global | 2.1 / 11.4 GB | — | USGS | public | VERIFIED; **do not download whole** |
| — | NASA Mars Trek DEM download | — | — | — | — | — | WMTS tiles only | — | **UNVERIFIED** as a DEM source, so viewer use only |

## Earth

| Region | Product | Tiles / IDs | Posting | Size | CRS / datum | Access | Licence | Status |
|---|---|---|---|---|---|---|---|---|
| All search domains | **NASADEM** (NASA, via Earthdata Search) | 1° tiles | 1″ ≈ 30 m | about 25–40 MB per tile (**UNVERIFIED**) | WGS84 · EGM96 (per docs) | LP DAAC (Earthdata login) **or** Microsoft Planetary Computer STAC `nasadem` (no login, VERIFIED collection exists) | NASA public | VERIFIED listing |
| All search domains | **Copernicus GLO-30** (ESA, partner resource) | 1° COG tiles, e.g. N30E059, N44E108 | 1″ ≈ 30 m | 36–41 MB | WGS84 · EGM2008 · it is a **DSM** | public S3 `copernicus-dem-30m` | Copernicus DEM licence (attribution) | VERIFIED |
| Lut Kaluts, Iran (known-analog control) | GLO-30 / NASADEM | N30E059 (+ neighbours, extent **UNVERIFIED**) | 30 m | about 40 MB per tile | — | — | — | VERIFIED tile |
| Qaidam Basin yardangs, China (control, alternative) | GLO-30 / NASADEM | tiles **TBD** | 30 m | — | — | — | — | coordinates to verify from Xiao et al. 2017 |
| Puna ignimbrite yardangs, AR/CL (closest lithology) | GLO-30 / NASADEM | tiles **TBD** | 30 m | — | — | — | — | coordinates to verify from de Silva et al. 2010 |
| **Mongolian Gobi** (search domain; under-characterized) | GLO-30 / NASADEM | about 6–12 tiles (**to choose from imagery before computing**) | 30 m | about 0.25–0.5 GB | — | — | — | DEM coverage VERIFIED (whole country); candidate coordinates **UNVERIFIED** |
| Green River / Hanksville, Utah (rover-scale control) | **USGS 3DEP 1 m lidar** | TNM 10×10 km tiles (6 at Green River, 18 at Hanksville) | 1 m | about 260–330 MB per tile | UTM NAD83 · NAVD88 | public S3 `prd-tnm`, no login | public domain | VERIFIED |
| Negative controls | GLO-30 / NASADEM | e.g. Dariganga volcanic field or flat eastern steppe (MN); a humid vegetated plain | 30 m | — | — | — | — | to choose **before** computing |

## NASA Resources-tab compliance

| Route | Resources-tab entry | What it feeds | Status |
|---|---|---|---|
| HiRISE DTM | **PDS** | Mars 3D hero mesh, fine-tier features, and the Mars fingerprint cross-check | VERIFIED as PDS-archived (cite the exact PDS volume path) |
| NASADEM | **Earthdata Search** | Earth search features (primary DEM) | ASSUMED listed in Earthdata Search; **human check: search "NASADEM" at search.earthdata.nasa.gov and screenshot it** |
| Copernicus GLO-30 | ESA Copernicus Data Space (partner) | DEM-source cross-check | ASSUMED listed; verify |
| USGS CTX DTM | not on the Resources tab (USGS product made from PDS CTX images) | Mars regional fingerprint at 20 m | Allowed as "other data". Cite separately and do **not** count it as the NASA requirement |

## Scale decisions (the gate)

| Comparison | Common grid | Valid baselines | Allowed claims | Forbidden claims |
|---|---|---|---|---|
| Tier 1: CTX 20 m ↔ NASADEM/GLO-30 30 m | 30 m local metric | ≥ 90 m (3× posting); landform metrics at 300 m–2 km | landform-scale relief, TPI, elongation/anisotropy, slope distribution *at 90 m+ baselines* | rover hazards, rocks, metre-scale slopes, soil |
| Tier 2: HiRISE 1 m ↔ 3DEP 1 m | 2–5 m local metric (HiRISE effective resolution is a few metres) | ≥ 5–10 m | slope classes at a 5–10 m baseline, roughness at 10–50 m | rocks < ~5 m, traction, trafficability |
| 3D rendering | heightfield 512²–1024² per scene | — | shape of terrain at the displayed scale, with exaggeration labelled | treating render detail as measurement |

## Feasibility estimate (budget, not measured)
- Downloads: about 0.3–0.6 GB HiRISE (1–2 files) + about 25 MB CTX + about 0.5–1 GB Earth tiles + about 0.6 GB 3DEP (2 tiles). Total ~1.5–2.5 GB. **On a slow connection this is the single largest schedule risk**, so start downloads first.
- CPU: reprojection, feature rasters and window statistics take ~1–3 h, with debugging the dominant cost.
- Web assets: 6–10 heightfields (16-bit PNG or Float32, 0.5–2 MB each) + heat-map PNG overlays + JSON manifests. Total target **≤ 30 MB**.

## Gaps requiring a human check
1. The CTX true-scale latitude (`gdalinfo`).
2. NASADEM listed in Earthdata Search (screenshot).
3. Exact yardang field extents at Lut, Qaidam and Puna, taken from the cited papers' figures.
4. Gobi candidate search domain, chosen from imagery **before** running the search and recorded with a timestamp (prevents cherry-picking).
5. Whether Jezero's HiRISE DTM covers the delta, if Jezero is used.
6. The NASADEM tile size and the Planetary Computer access path.
