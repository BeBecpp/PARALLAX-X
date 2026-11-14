# DECISION_MEMO — PARALLAX X (Stage 3 synthesis, for Nero's approval)

2026-11-14, 11:00 UTC+8. Planning only, no code written. Inputs:
- `FACT_AUDIT.md`, `DATA_FEASIBILITY_MATRIX.md`, `CONCEPT_OPTIONS.md`
- 7 independent simulated advisor reviews in `ADVISORY_REVIEWS.md`. All seven returned **CONDITIONAL**, and all seven conditions are absorbed below.

> **Rule reminder (Submission Guide):** AI "should not be used to come up with your idea." This memo is decision support from AI research and simulated critique. **Nero and the team must make, own and be able to defend the final choice**, and disclose AI assistance accurately. Where you disagree with anything here, change it.

---

## 1. The thesis

> **PARALLAX X shows where on Earth a specific Mars landform's terrain is reproduced, and proves the search works.**
>
> - **What it compares:** a fingerprint of a real NASA Mars DTM against Earth windows at the scale both planets' data can genuinely resolve.
> - **How it earns trust:** it must re-find published analogs hidden among thousands of windows.
> - **What it finds:** under-characterized candidates in Mongolia's Gobi.
> - **What it admits:** it states exactly where the analogy breaks down, and which mission questions the public data cannot answer.

**Why it survived review:**

- **It answers the brief's actual verbs.** It *identifies* Earth locations: named coordinates from a search, not a hand-picked shortlist. It *characterizes* them with matched-scale metrics plus a breakdown table, and it targets *new* ones ("look beyond… surprise us").
- **It meets every advisor condition.** The method is pre-registered. Resolution is matched spectrally. Controls are process-discriminating. The output is called a "morphometric candidate". There is no 30 m rover claim and no PAX physics.
- **Its novelty claim is narrow but checkable.** Among the 2026 public repos we reviewed (14 Nov), none:
  1. uses a HiRISE DTM;
  2. shows paired, same-scale, DEM-derived Mars|Earth 3D;
  3. tests recall of published analogs at **effective-resolution-matched** scale;
  4. lets the field-test objective change the **measurement scale**, which then changes which candidates are even evaluable.

  We credit Terrestrial Analog Finder (TAF), TerraNova and PTAE for the window-search and control ideas we build on.

## 2. Primary scientific contribution (testable, not decorative)

**Research question.** Can a matched-scale terrain fingerprint, pre-registered before computing, built from the Medusae Fossae Formation (MFF) yardang DTM, re-find held-out published Earth yardang analogs among declustered Earth windows? Does it rank them above a random-window null **and** above process-different look-alikes (strike ridges, linear dunes)? Does it do better than a slope-histogram-only baseline? If yes, which Gobi windows does it surface?

**Honest result sentence (placeholders until computed):**

> "With a fingerprint fixed in advance ([W] km windows, terrain matched to [E] m effective resolution, NASADEM), held-out published analogs [Lut, Qaidam, Puna] ranked at the [P1/P2/P3]th percentile of [N] declustered Earth windows (null median 50th). Strike-ridge and dune controls ranked [Q1/Q2]. [GOBI-1] fell inside the known-analog envelope in [S]% of perturbations. It is a morphometric candidate for field checking, not described as a Mars analog in the literature we searched."

**If the recall test fails, we show that.** The product then becomes an honest method audit, and the fallback is Option 1 (see §7). We never tune after seeing the held-out results.

## 3. The single memorable interaction

**"Fair comparison" plus the "Scale lens":**

1. **The fair-comparison transition.** The user opens a real HiRISE 1 m Mars terrain in 3D and presses **Compare with Earth**. The Mars terrain *visibly softens* to the resolution Earth data can also resolve, with the caption: *"Matched to [E] m — the finest scale both planets' data truly resolve."* The Earth candidate then appears beside it at identical km extent, exaggeration and scale bar. Every step is real data, the transition is honest, and it is visually striking.
2. **The Scale lens (mission objective control).**
   - Toggle **Landform study (≥ 150 m)** ↔ **Rover field test (≥ 5 m)**. The objective sets the baseline a test needs. The app recomputes which data can answer it at that baseline.
   - At rover scale, the Mars side shows HiRISE slope-class *proxies* at a 5 m baseline, as discrete, sourced, material-tagged profiles: 15° loose / 30° outcrop (Hoover et al. 2012).
   - Each Earth candidate becomes **"Not evaluable at rover scale: only 30 m public data. To qualify: drone/lidar survey ≥ [x] km²."**
   - This consequence is computed from data availability, not forced. It is also a genuine finding with practical impact: it says what a field team would need to collect next.
   - If the Utah add-on (§6, high-value) ships, its inverted-channel pair *stays* evaluable at rover scale (1 m lidar). Rankings and connectivity at the 5 m baseline appear there, together with the "30 m hides the hazard" degradation demo.

## 4. What is proven vs proposed

| Class | Statement |
|---|---|
| **Observed** | HiRISE and CTX elevations (PDS/USGS); NASADEM and GLO-30 elevations; 3DEP lidar (if built). Each comes with its product ID, posting, datum and NoData fraction |
| **Derived (deterministic)** | Detrended relief; differential slope at a stated baseline; TPI at a stated radius; anisotropy; distribution distances; recall percentiles; perturbation stability |
| **Proposed / hypothesis** | That the top Gobi windows are *process* analogs (wind-eroded, poorly indurated). Unproven until the geology + wind + imagery checklist passes; until then the label is "morphometric candidate" |
| **Hypothetical** | Rover slope profiles: published landing/traverse criteria used as screening thresholds, explicitly **not** a mobility simulation |
| **Not claimed** | Trafficability, rocks below the effective resolution, soil strength, a habitability or environmental twin, NASA endorsement, a "% Mars match", "first" or "discovered" |
| **Language-generated** | None in the core. Explanatory text is deterministic templates built from computed values |

## 5. Data decision (shortlist)

| Role | Dataset | Status |
|---|---|---|
| Mars hero 3D, "what 30 m misses", rover-scale proxy | **HiRISE DTM `DTEEC_009609_1675_010453_1675_A01`** (MFF yardangs, 1 m, **PDS**, NASA Resources-tab ✓) | VERIFIED: 339 MB, label read |
| Mars regional fingerprint | **USGS CTX DTM `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W`** (20 m, CC0) | VERIFIED: 6.3 MB. True-scale latitude still to check with `gdalinfo` |
| Earth search (primary) | **NASADEM** pulled from **LP DAAC via Earthdata Search** (NASA Resources-tab ✓). Nero creates a free Earthdata login | Collection VERIFIED. Tile access is a human step |
| Earth cross-check | **Copernicus GLO-30** (ESA partner resource; COG; range reads) | VERIFIED |
| Search domains (2) | **D1 Gobi discovery box** (pre-registered from aridity/land cover, *not* from known yardang locations); **D2 Lut domain** (contains the published Kaluts analog) | Boxes to be fixed in the pre-registration file |
| Held-out positives | Lut Kaluts (Ehsani & Quiel 2008); Qaidam (Xiao 2017; Wang 2018), 1–2 tiles; Puna (de Silva 2010), 1–2 tiles | Window labels fixed **before** computing, from the papers' figures |
| Process-different negatives | Gobi-Altai strike-ridge window; a linear-dune field (Namib or Rub' al Khali), 1 tile; random-window null | To choose before computing |
| Rover-scale add-on (gated) | HiRISE `DTEEC_020673_1750_020528_1750_A01` (Aeolis Dorsa) ↔ 3DEP 1 m Green River/Hanksville | VERIFIED tiles |

**Two independent NASA Resources-tab routes** (PDS for Mars, Earthdata for Earth) each **change a visible result**: the Mars mesh, the "what 30 m misses" metric and the rover-scale proxy (HiRISE), and the ranking (NASADEM).

## 6. Scope tiers

**Must-work core.** This answers the challenge even if all animation fails, and contains no LLM.

1. One ROI (MFF yardangs), offline pipeline, pre-registration committed first.
2. Ranked, named Earth candidates (clusters with coordinates) from D1 and D2, plus held-out positives, negatives, null, recall result and baseline comparison. Shown honestly whatever the outcome.
3. Location-first web app with: select (real MOLA-shaded locator + DTM footprint) → real loading → HiRISE 3D → **Compare** (matched-resolution paired 3D, one WebGL context) → persistent "where it breaks down" caption → evidence drawer.
4. Scale lens toggle (landform ↔ rover) with honest eligibility outcomes.
5. Static fallback: hillshade pair + table when WebGL is slow or fails.
6. Static deploy on Vercel, public, ≤ 30 MB assets.

**High-value improvements** (only after the MVP gate):

- Utah/Aeolis Dorsa rover-scale pair with the "30 m hides the hazard" demo.
- GLO-30 DEM-source cross-check.
- Rank-stability panel (Dirichlet weights, window size).
- Imagery confirmation of the top Gobi candidate (Worldview/Sentinel-2).
- Geology + wind checklist per candidate.

**Stretch:**

- Optional Claude explainer behind a server route, with a strict evidence payload and deterministic fallback.
- Extra ROI.
- Power-spectrum plot in the drawer.
- Mobile-specific layout.

## 7. Feasibility gate (can force a pivot) and kill switches

| Gate | Deadline (UTC+8) | Pass condition | If it fails |
|---|---|---|---|
| **G0 Data** | Nov 14 16:00 | HiRISE + CTX + ≥ 1 NASADEM tile reprojected, masked, detrended, matched; one heightfield exported | Switch the Mars ROI to a smaller verified product. If Earthdata access is blocked, use NASADEM from Planetary Computer, keep the citation to LP DAAC, and document it |
| **G1 Render** | Nov 14 20:00 | Public Vercel URL renders the real Mars heightfield, location-first | Drop to static hillshade + table and stop all animation work |
| **G2 Science** | Nov 15 01:00 | Full search, controls, null and recall result computed (any outcome) | Shrink D1, then compute with fewer windows; never fabricate |
| **G3 MVP** | Nov 15 10:00 | Compare, breakdown, scale lens and drawer working on the deployed URL | No Utah add-on; freeze features |
| **G4 Freeze** | Nov 15 14:00 | Feature freeze | — |
| **G5 Hand-in** | Nov 15 18:30 (hard deadline 19:30) | Public URL + repo + ≤ 30 s video + ≤ 7 slides + disclosures | Submit what exists; the NASA page stays editable until 23:59 |

**Kill switches:**

- (a) **Recall fails** → present it as the result. Reframe to "honest analog-screening audit" and Option 1 dossiers; the Gobi becomes an "unverified look-alike".
- (b) **WebGL < 20 fps** → static hillshade pair + MP4 turntable rendered from the same real data.
- (c) **Earthdata blocked** → Planetary Computer mirror plus a provenance note. HiRISE/PDS alone still satisfies the NASA rule.

## 8. Where computation runs

- **Offline (Nero's laptop, Python CPU: GDAL/rasterio, numpy, scipy, pyproj):** all raster work, features, search, controls, null, perturbations, heightfield export, templated explanation text.
- **Browser:** three.js rendering of precomputed Uint16 heightfields; UI state; the scale-lens eligibility logic; reading precomputed tables.
- **Vercel:** static hosting only. **No API route in the core.** No backend, no database, no object storage (assets ≤ 30 MB).
- **Why no AI training:**
  - The question is distributional similarity on measured terrain. That is deterministic and auditable; a trained model would add opacity.
  - There are no labels to train on, apart from a handful of published analogs that we need as *held-out tests*.
  - There is no time to validate a model.
  - The owner rejected it.

## 9. The judge challenge: "What if the ranking never changes when you swap rovers?"

At 30 m it *shouldn't* change. Slope limits are defined at 1–5 m baselines (Golombek et al. 2012), and 30 m data smooths those slopes away. So we don't pretend to rank Earth sites for rovers with 30 m data. Instead the objective changes the **scale**, and the honest consequence is that no Gobi candidate can be evaluated at rover scale with public data. That itself tells a field team what to survey next. Where 1 m data exist on both sides (Utah, if built), we show the rover-scale comparison. A no-change there is reported as a finding, not hidden.

## 10. Refutation of the pack's preliminary favourite (doc 10)

Doc 10 favoured a mission-conditioned workbench over a curated candidate list. The evidence refutes two parts of it:

1. **Curated candidates fail the brief.** The brief demands new analogs and warns against famous ones. A curated list is the weakest answer, so identification must come from a search with a recall test.
2. **Mission conditioning by weights or slope sliders is prior art and is invalid at 30 m.** PTAE and EarthTwin already use weights, and the slider was rejected by six of seven advisors (E kept it only conditionally). We keep doc 10's evidence-chain discipline and its 3D/location-first UX.
