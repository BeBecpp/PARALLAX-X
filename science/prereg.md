# PARALLAX X — Pre-registration (frozen before any Mars–Earth distance is computed)

- **Frozen:** 2026-11-14 ~12:00 UTC+8. This file and `science/config.py` are committed **before** the scoring code exists.
- **Input data was downloaded and visually inspected only** (hillshade previews used to place the reference polygons). No feature distance, ranking or score of any kind has been computed.
- Any later change is logged in `science/DEVIATIONS.md` **before** results are viewed, or is labelled a new, post-hoc run.

## 1. Question
Does a fixed terrain-geometry fingerprint of Medusae Fossae Formation (MFF) yardangs on Mars:
1. rank pre-declared Earth yardang reference areas above the null distribution of Earth search windows,
2. rank them above process-different look-alikes (linear dunes, thrust/strike ridges), and
3. beat a slope-distribution-only baseline (B0)?

Which windows in a pre-declared Mongolian Gobi domain score highest? Those are reported as **morphometric candidates** only.

## 2. Inputs (SHA-256)
| Input | ID | SHA-256 |
|---|---|---|
| CTX DTM (USGS, CC0) | `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W_dtm.tif` | `e97bd67eb5bd9a12b4fdcbdef74dd206a78784e1a7b64fba109d23bbd9b70419` |
| HiRISE DTM (NASA PDS) | `DTEEC_009609_1675_010453_1675_A01.IMG` | `88584963703dd2287c083e038f712734a50974cd0eb2e618284335f3c6ff71c7` |
| NASADEM_HGT v001 1″ tiles (43) + Natural Earth 1:50m admin-0 | per-file hashes in `science/data/raw/acquisition_log.json` (published as `science/acquisition_log.json`) | aggregate `71bbc5f4997f32fa883a2b050b01f0b36465a278209c0d86ae0e8a244a45c0b4` |

NASADEM was retrieved from the **Microsoft Planetary Computer `nasadem` collection, a mirror of NASA LP DAAC NASADEM_HGT v001**. It was not downloaded through an Earthdata login.

## 3. Mars target (fingerprint area)
- **Region:** the grooved yardang band in the northern part of the CTX scene. It was chosen from the CTX hillshade because it shows the N–S elongated ridges and grooves of MFF yardangs. The smooth plains to the south are excluded.
- **Polygon in CTX pixel coordinates (col,row):** (50,160) (1380,90) (1380,480) (50,500).
- **Same polygon in lon/lat, Mars sphere R = 3,396,190 m:** (177.742, −12.3671) (178.1952, −12.3432) (178.1952, −12.4761) (177.742, −12.4829). That is about 26 × 7.5 km.
- **HiRISE DTM:** lies south of this polygon (lat −12.48 to −12.71), within the same CTX scene. It is **not** part of the fingerprint. It is used for:
  - (a) the 1 m terrain viewer;
  - (b) a measured "what a 30 m grid misses" statistic;
  - (c) the fine-scale side of the scale lens.
  - Its terrain is described as wind-eroded layered MFF deposits.

## 4. Earth domains and labelled areas (window membership = window centre inside the polygon)
| ID | Role | Definition | A priori basis |
|---|---|---|---|
| D1 | **Search domain** | 42–45°N, 95–101°E, **clipped to Mongolia** (Natural Earth 1:50m) | Trans-Altai Gobi, the most arid part of Mongolia (rainfall statement *needs verification*). Chosen without knowledge of any Gobi yardang locations |
| D2 | **Search domain** | 29–32°N, 57–60°E | Lut Desert, Iran. Contains P1 |
| P1 | Positive (held out) | Lut Kaluts polygon (57.80, 30.80) (58.55, 30.80) (58.75, 30.00) (58.35, 30.00) | Yardang field: Ehsani & Quiel 2008, *RSE* 112:3284, doi:10.1016/j.rse.2008.04.007. Polygon placed on the striated field visible in the NASADEM hillshade |
| P2 | Positive (held out) | Qaidam: 92.0–93.0°E, 38.0–38.45°N | Qaidam yardang fields: Xiao et al. 2017, *ESR* 164:84; Wang et al. 2018, *JGR Planets* 123:2336. Placed on the streamlined NW–SE forms in the hillshade |
| P3 | Positive (held out), **low-confidence location** | Puna: −67.50 to −67.20°E, −26.65 to −26.45°N (Campo de Piedra Pómez area) | de Silva et al. 2010, *PSS* 58:459. These yardangs are decametre-scale, so they **may be unresolvable at 30 m**. The location comes from general knowledge and *needs verification* against the paper's figures |
| N1 | Negative: linear dunes | Namib: 15.02–15.30°E, −24.05 to −25.90°N | N–S linear dunes, clearly visible in the hillshade |
| N2 | Negative: thrust/strike ridges | Kalpin polygon (78.00, 40.00) (78.00, 40.45) (78.70, 40.80) (79.40, 40.85) (79.40, 40.70) (78.95, 40.45) (78.40, 40.05) | Parallel arcuate fold-thrust ridges (Tarim margin), clearly visible in the hillshade |

**Null set:** all valid D1 and D2 windows, excluding P1 windows. P1 windows are scored but never enter the null.

## 5. Processing (identical for Mars and Earth)
1. **Mask** NoData before any resampling: CTX −32767; NASADEM −32768. NASADEM's void-fill quality layer is not in the mirror, so void-filled cells cannot be masked; this is a documented limitation.
2. **Reproject** to a local metric grid at **30 m**, using average resampling.
   - Mars CTX: equidistant cylindrical on a sphere R = 3,396,190 m, true scale at the polygon's centre latitude, lon_0 at its centre.
   - Earth: each 1° tile goes to an azimuthal equidistant projection centred on that tile.
3. **Smooth** with an identical Gaussian, σ = 1 pixel (30 m), normalized for masked data, on both planets. This is a conservative common low-pass filter. Radially averaged power spectra of CTX and NASADEM are computed and reported **descriptively only**; they are not used to tune anything. No claim of exact effective-resolution matching is made.
4. **Windows:** non-overlapping 333 × 333 px (9.99 km), step = window size, inside each tile's grid. Reject windows with more than 5% invalid cells. A 6 km (200 px) window is run as **sensitivity only**.
5. **Detrend:** subtract a least-squares plane per window (per sub-window for F1). For Mars the plane is fitted over the polygon.

## 6. Features (all baselines ≥ 150 m)
| ID | Definition |
|---|---|
| F1 | Detrended relief: P95 − P5 of elevation in each 66 × 66 px (1.98 km) sub-window, each with its own plane removed. Units: m |
| F2 | Slope at L = 180 m: atan(√(gx² + gy²)), with gx = (z[i, j+3] − z[i, j−3]) / 180 m, and gy likewise. Units: degrees |
| F3 | Slope at L = 600 m: the same with offset 10 px. Units: degrees |
| F4 | TPI: z minus the mean z within a disk of radius 17 px (510 m). Units: m |
| F5 | Gradient coherence: √((Jxx − Jyy)² + 4Jxy²) / (Jxx + Jyy), where J is the gradient structure tensor (gradients as in F2) smoothed with a Gaussian σ = 10 px (300 m). Dimensionless, 0–1. Orientation-invariant elongation |

Only interior pixels whose full stencil is valid are used.

## 7. Distance, score and percentile
- **Normalization:** for each feature, values are mapped through the empirical CDF of the pooled **null-window** values (a fixed random subsample, seed 42), giving values in [0, 1]. Mars values outside the Earth range clip to 0 or 1.
- **Per-feature distance:** 1-D Wasserstein (W1) between the Mars distribution and the window distribution in normalized space, computed as the mean absolute difference of 199 quantiles.
- **Full score D** = the unweighted mean of the W1 values for F1–F5. **B0** = W1 of F2 only.
- **Percentile** of a window = 100 × (number of null windows with a larger distance + 0.5 × ties) / N_null. Higher means more similar.

## 8. Controls and decision rule
- **Site percentile** = the **median** window percentile inside the polygon. The best window is also reported, but not used in the decision, to avoid look-elsewhere inflation.
- **The method PASSES only if all of these hold:**
  - (a) at least 2 of 3 positives have a site percentile ≥ 90, under D;
  - (b) the mean positive site percentile under D is greater than under B0;
  - (c) the mean positive site percentile under D is greater than both N1's and N2's site percentiles under D.
- **Otherwise it FAILS,** and the app and README report the failure prominently.
- If a positive has no valid windows, the rule is evaluated with it counted as failing, and this is logged.

## 9. Candidates (D1 only)
- Seeds: D1 windows with percentile ≥ 95.
- Each seed is merged with 8-adjacent D1 windows that have percentile ≥ 90 (in the same tile grid).
- Report up to 5 clusters by best percentile, with centroid coordinates.
- Label: **"morphometric candidate — terrain geometry only; not described as a Mars analog in literature we searched; requires imagery, geology and field checks."**

## 10. Outputs
- `science/out/results.json`, containing windows, sites, decision, candidates, spectra and the run manifest.
- Web assets in `public/data/`.
- Every number shown in the app is read from these files.
