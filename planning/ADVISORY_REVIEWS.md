# ADVISORY_REVIEWS — seven independent simulated critiques (2026-11-14)

**Disclosure:** these are **AI role-based simulated advisors**, not credentialed human experts. Each was a separate subagent with its own context. Each received the same packet (`ADVISORY_BRIEF.md`: verified facts, prior art, options 1–5) and was **not shown the other advisors' conclusions**. Each was told to attack Option 5, the proposed lead. The reports below are lightly condensed; claims they marked UNSUPPORTED stay marked.

---

## E. Premium Interaction & 3D Visualization Director — **CONDITIONAL**

- **Strongest concern:** Option 5 asks a generalist judge to hold about 9 concepts at once (2 ROIs, 2 tiers, 2 objectives, 2 DEMs, CTX vs HiRISE, heat map, slider, controls, PAX). A 30 s video carries one.
- **Fatal flaw (conditional):** a resolution mismatch in the paired 3D. A 1 m HiRISE mesh next to a 30 m Gobi mesh makes Earth look blurry and visually argues *against* the analogy. Both sides must be shown at the same posting, with a badge saying which.
- **Different from prior art:** same-scale DEM-derived Mars|Earth 3D, and an objective that changes features/baselines. The search, heat map and controls belong to TAF and TerraNova, so keep them in the background.
- **Demo must prove (in the first 8 s, with no charts):** this Mars landform → this Earth place has the same shape at the same scale → here is where it breaks down. The plan as written does not achieve this; it drifts to a dashboard.
- **Improvements:**
  1. One WebGL renderer with two scissor viewports and a linked orbit. Shared exaggeration, km extent, scale bar and posting badge. Default to a single hero view; Compare splits the screen; an A/B crossfade key for the video. ~1.5 h of resampling + 3–4 h of viewport work. A 12 km window at 30 m is 400² ≈ 320 KB.
  2. The first screen asks one question, "Which Mars landform should Earth stand in for?", with two catalogue cards (real hillshade thumbnails + MOLA locator). **No globe**, because a globe promises coverage that does not exist. ~1.5 h.
  3. Loading that shows only real stages, with real byte progress and the product ID. Skip it under 300 ms. ~1 h.
- **Placement:** a segmented control above the canvas, "Looks alike | Drives alike". The slope slider appears only in "Drives alike" and re-colours both terrains with luminance plus hatching. Heat map → a "Top 5 Earth windows" strip plus the drawer. "Where the analogy breaks down" is a **persistent 3-line caption** in the compare view. Evidence drawer on the right.
- **Craft:** one grotesk plus tabular mono; ≥18 px text in the video; copper must meet 4.5:1 contrast; hillshade instead of thin contours (which turn to mush under Zoom compression); reduced motion → cuts instead of camera flights; keyboard orbit; a text table alternative; hatching for colour-blind users. The brand board's glow and glossy mascot belong to the rejected register; the deck montage's restraint is the right register.
- **Cut immediately:** PAX and the least-cost path. Remove "Tier 1/2", "NASADEM/GLO-30" and "TPI" from the main UI.
- **Missing evidence:** do the Gobi hits actually look like yardangs (not dunes or fans)? Does the slider change anything? Integrated-GPU frame rate, Zoom legibility, Aeolis Dorsa–Utah overlap usability.
- **Risks:** concept overload H/H; resolution-mismatch visuals H/M; WebGL M/M; slider shows no change H/M.
- **Conditions:** storyboard locked by hour 6 on a single Discovery pair; matched posting; one context; PAX cut; heat map in the drawer; honest "stable" fallback or drop the slider from the video.

---

## A. Planetary geologist / field-analog researcher — **CONDITIONAL**

- **Strongest concern:** Option 5 rests its "new" claim on its weakest tier, a 30 m morphometric match in the Gobi. Relief, TPI and anisotropy are shared by yardangs, linear dunes, Gobi-Altai strike ridges/hogbacks, and dissected fans.
- **Fatal flaw (conditional):** at 30 m, Gobi anisotropy may record *structural grain*, not wind erosion. Ridges spaced more closely than about 150–300 m are aliased on both planets (CTX effective resolution is coarser than its 20 m posting; UNSUPPORTED rule of thumb). Without process-discriminating negative controls, a high Gobi rank is meaningless, and the professor judge can see that.
- **Different from prior art:** paired same-scale 3D of HiRISE 1 m with 3DEP 1 m; features and baselines that vary with the objective. The 30 m search is not new (TAF). Utah is a **positive control, not a discovery** (Williams 2009; Clarke & Stoker 2011).
- **Red-team answer ("two processes, same ridges"):** it should not say "Mars analog". Call the Tier-1 output a **"morphometric candidate"**. Upgrade it to "candidate process analog" only if (a) a geologic map shows poorly indurated fine-grained or volcaniclastic substrate, (b) ridge orientation is parallel to a documented prevailing wind, and (c) ridge spacing is at least 5× the effective DEM resolution. For "new", say "**not described as a Mars analog in the literature we searched**", never "discovered".
- **Improvements:**
  1. Process-discriminating negatives: a Gobi-Altai strike-ridge window, a linear-dune window (Namib or Rub' al Khali) and a random null. About 3 tiles, 2–3 h.
  2. A geology + wind + imagery checklist per candidate (geologic map, ERA5 or literature wind vs yardang azimuth, Sentinel-2/Worldview image). A teammate's task, 3–4 h.
  3. A **resolution sanity panel**: HiRISE yardangs degraded to 30 m next to CTX, so judges can see what survives at screening scale. About 1.5 h.
- **Cut immediately:** the mobility objective and slope slider on Tier 1. At a 30 m grid the shortest valid baseline is 60–90 m, while rover criteria use 2–5 m (Golombek 2012). Also drop the PAX path.
- **Breakdown section must cover:**
  - lithology: Medusae Fossae Formation (MFF) likely more porous and weaker than the Earth analogs;
  - induration;
  - wind regime: a thin atmosphere (about 0.6 kPa) means a higher saltation threshold;
  - age: Hesperian/Amazonian vs Quaternary;
  - 0.38 g;
  - water, frost and vegetation on Earth;
  - DSM vs stereo DTM smoothing.
- **Risks:** validity overclaim H/H; one-developer scope H/H; 30 m aliasing H/M.
- **Conditions:** one objective (landform) on Tier 1; process-different negatives reported even if the Gobi ranks poorly; "morphometric candidate" label; Utah 3D as the dependable centrepiece; breakdown content before polish. **Fallback:** Option 1 with the Gobi as a flagged unverified look-alike.
- Sources: Qaidam analog (AGU 2015, https://ui.adsabs.harvard.edu/abs/2015AGUFM.P31A2053W); THEMIS note on Gobi yardangs (https://themis.mars.asu.edu/zoom-20040714a); de Silva 2010 (https://ri.conicet.gov.ar/handle/11336/14545); MFF vs Puna weakness (https://scholarsarchive.byu.edu/etd/10119/).

---

## D. Research-methods / statistics red team — **CONDITIONAL (fatal as currently written)**

- **Strongest concern:** the design confirms itself. Domains, positive controls and the Gobi target are all chosen by people who already know where yardangs are, and nothing is calibrated against a null.
- **Fatal flaws as written:**
  - (a) Choosing Gobi coordinates from imagery and then "finding" them is circular.
  - (b) The Tier-1 mobility slider on 30 m data produces meaningful-looking but invalid numbers.
  - Red-team answer: the ranking is meaningless if top-k changes under random weights, and right now nobody can tell whether it does.
- **Different from prior art:** HiRISE↔lidar paired 3D; objective-dependent features (value not yet shown). Tier 1 ≈ TAF. Tier 2 with N=1 is a rediscovery, not a ranking.
- **Demo must prove:**
  - (1) Under choices locked in advance, **held-out** published analogs (Puna, Lut, Qaidam) rank far above a declustered random-window null.
  - (2) The full method beats a plain slope-histogram W1 baseline.
  - (3) Gobi candidates stay near the top under perturbation.
  - (4) Conditioning is falsifiable: the rank correlation between the two objectives is lower than between random feature subsets. Otherwise conditioning adds nothing, and we say so.
- **Improvements:**
  1. **Pre-registration** (a timestamped file before any distances are computed): domains, window km, equal-area metric projection, features, robust normalization (median/MAD or rank, fitted on Earth windows), distance rule, controls, decision rule. Tune only on Lut, test on Puna and Qaidam. Pick Gobi coordinates **only after** the search, to verify. About 1 h.
  2. **Null + stability:** decluster windows (≥1 window-width apart); empirical percentile vs random windows; report candidates as spatial clusters; top-k Jaccard / rank-biased overlap under Dirichlet weights, feature ablation, the NASADEM↔GLO-30 swap and 2 window sizes; per-feature W1 on rank-normalized values. 1–2 h CPU.
  3. **Hard negatives + analog envelope:** fluvial badlands or bajadas plus a dune field. A humid vegetated control is uninformative because the DSM sees the canopy. Earth-analog-to-Earth-analog distances define an "analog-close" envelope. About 1 h.
- **Cut immediately:** the Tier-1 rover slider and class-mix re-ranking. Mobility is Tier 2 only, labelled N=1.
- **Missing:** yardang widths vs effective resolution (need ≥3–5 px); 1″ grids are not 30 m E-W, so reproject to a common metric grid; degrade HiRISE and lidar to a common 3–5 m; N after declustering.
- **Risks:** circularity H/H; scale invalidity of Tier-1 mobility H/H; DEM-source rank flips M/M; time H/M.
- **Honest slide sentence (placeholders):** "Using a fingerprint locked in advance ([W] km windows, NASADEM 30 m), the held-out published analog [SITE] ranked at the [P]th percentile of [N] declustered Earth windows (random-window median: [Q]th). [GOBI_SITE] fell inside the known-analog envelope and stayed in the top-[k] in [S]% of weight, DEM and window perturbations. It is a candidate for field checking, not a confirmed analog."


---

## B. Planetary GIS / remote sensing — **CONDITIONAL**

- **Strongest concern:** at the same posting, Mars stereo DTMs hold several times less real detail than Earth DEMs. Without matching them, Option 5 ranks interpolation artifacts, not terrain.
- **Fatal flaw (mobility as written):**
  - Stereo DTM effective resolution is about **10–20 image pixels** (Kirk et al. 2021, *Remote Sensing* 13:3511). That makes HiRISE about 2.5–10 m effective and CTX much coarser than its 20 m posting. USGS notes that 300 m craters are visible in CTX DTMs but many 150 m craters are not.
  - 3DEP lidar is genuinely about 1 m, so Earth looks systematically rougher and class-mix mostly measures sensor differences.
  - Tier 1 has the same problem: CTX@30 m is smoother than NASADEM, which is smoother than GLO-30 (downsampled from TanDEM-X; Guth et al.).
  - Red-team answer: "On Mars you'd be inventing detail; on Earth you'd be observing more than Mars can show."
- **Different from prior art:** only paired same-scale HiRISE-vs-lidar 3D and objective-dependent *baselines*. Tier 1 ≈ TAF, so present it as "a re-implementation of TAF's approach plus controls".
- **Demo must prove:** (1) resolution matching (radially averaged power spectra of CTX, NASADEM and GLO-30 before and after); (2) published analogs above a random null *at matched resolution*; (3) one honest 3D pair stating both posting **and** effective resolution.
- **Improvements:**
  1. **Spectrally match Earth to Mars:** estimate roll-off, Gaussian-filter the Earth DEMs to CTX, and limit Tier-1 features to baselines ≥ ~150 m. ~3 h, no new data.
  2. **Degrade lidar to HiRISE effective resolution (~3–5 m):** report slopes at 5, 10 and 20 m, with an "unreliable" badge below 5 m. ~2 h + 1–2 tiles.
  3. **Reprojection and masks:**
     - Use a local AEQD/TM projection per window.
     - Check the CTX true-scale latitude: if it is 0°, there is ~2.4% E-W error at 12.5°S, which biases anisotropy.
     - Mask HiRISE −3.4e38 NoData **before** resampling, because bilinear resampling turns it into spikes. Erode the mask by the kernel radius and reject windows with more than 5% NoData.
     - Mask NASADEM void-filled pixels using the number-of-scenes layer. SRTM is noise-limited in low relief.
     - Detrend each window with a plane.
     - For Three.js: 16-bit heights, area-average downsampling, ortho UVs at pixel centres.
     - ~2 h.
- **Cut immediately:** the PAX least-cost path.
- **Rules note:** the Resources tab lists **Earthdata Search**, not Planetary Computer. Find NASADEM in Earthdata Search, pull at least the tiles you use from LP DAAC with a free login, and cite the LP DAAC record. HiRISE via PDS satisfies the rule on its own.
- **Missing:**
  - effective resolution of the chosen products (USGS `qa_metrics.txt`);
  - filled patches in the Aeolis HiRISE DTM;
  - CTX CRS centre latitude;
  - vegetation over the Utah tiles (use bare-earth);
  - whether the Planetary Computer NASADEM is identical to LP DAAC's.
- **Risks:** resolution mismatch H/H; reprojection/anisotropy bias M/M; NoData spikes H/M; NASADEM provenance L/M.
- Sources: https://mdpi.com/2072-4292/13/17/3511 ; https://stac.astrogeology.usgs.gov/docs/data/mars/ctxdtms ; https://www.uahirise.org/dtm/about.php ; https://arxiv.org/pdf/2302.08425 ; https://www.imagico.de/map/srtm1_en.php ; https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001

---

## C. Rover mobility / field-testing engineer — **CONDITIONAL GO**

- **Strongest concern:** a 30 m mobility metric claims a resolution the data lack.
- **Fatal flaw unless mobility is restricted to Tier 2:**
  - At a 60–90 m baseline, desert terrain smooths to well under 15°, so class-mix becomes "0 ≈ 0" for every candidate. The ranking "won't change" because of a resolution artifact, and calling that "stable" would be dishonest.
  - Slope limits are **material-dependent**: MSL used <30° on outcrop and <15° on cohesionless material, on 1 m HiRISE slope maps (Hoover, Golombek & Calef 2012).
  - The brief's 15° looks like MSL's descent/touchdown constraint at 2–5 m, not a traverse limit. Mixing up landing and driving limits loses the professor.
- **Different from prior art:** the slope filter (TerraNova) and 30 m slope percentiles (TAF) are not new. HiRISE↔lidar at a matched baseline in paired 3D, and the objective changing the **baseline**, are new.
- **Demo must prove:**
  1. Mobility metrics only at a baseline where limits mean something.
  2. A measurable Tier-2 change, or an honest explanation of why not.
  3. **"30 m hides the hazard":** the same Utah tile degraded from 1 m to 30 m visibly loses its hazard fraction. This is the strongest Validity point.
  4. 3D labelled "geometry, not drivability".
- **Improvements:**
  1. Resolution gate plus a degradation test at 1, 3 and 30 m. In Tier 1, replace the slider with "this baseline cannot support rover-scale claims". 2–3 h.
  2. **Discrete, sourced, material-tagged profiles**: "L: 15°, loose" and "R: 30°, outcrop" (Hoover 2012). Never name them "Curiosity" or "Perseverance". Report Kendall tau. 1–2 h.
  3. Replace proportion-only class-mix with **connectivity**: the fraction reachable below the limit from the window centre (flood fill), at a common 2–3 m effective resolution. ~2 h.
- **Cut immediately:** PAX. "With PAX, yes, it implies traction you never measured; without it, no." At most a static line: "slope-only geometric path; no vehicle dynamics".
- **Missing:** rock size-frequency (needs cm-scale imagery); soil; logistics, permits and access (none characterized for any Gobi site); Aeolis DTM coverage of the ridges; a pre-registered expectation of invariance at 30 m.
- **Labels:** every slope layer reads "slope-class proxy at X m baseline; not trafficability (no rock, soil, slip, logistics data)". A null rank change is reported as an expected resolution limit, not as robustness.
- Sources: Hoover et al. 2012 GSA (https://studio.m-anage.com/gsa/2012NC/webprogram/Paper202917.html); Golombek et al. 2012 (https://authors.library.caltech.edu/35374); MSL workshop report (marsoweb). The 30° Curiosity tilt figure is secondary only. Wheel-scale rock thresholds: UNSUPPORTED.

---

## F. Cloud architect / reliability engineer — **CONDITIONAL**

- **Strongest concern:** Option 5 is three products, and the 2–4 h pipeline estimate ignores about 4–6 GB of downloads and the cost of debugging the Mars CRS.
- **Fatal flaw (conditional):** rover-scale re-ranking ranks only a handful of Utah tiles, which is not discovery. A single-threshold class-mix score is one gameable scalar with many ties.
- **Different from prior art:** HiRISE↔3DEP paired 3D; objective-dependent feature *sets*.
- **Demo must prove:** (1) both heightfields really DEM-derived, rendered at the same scale on an integrated GPU at ≥30 fps; (2) the recall test passes (Lut and Puna high, the null and same-climate controls low); (3) one breakdown statement backed by a number.
- **Improvements:**
  1. **Assets as raw little-endian Uint16 `.bin` + JSON scale/offset.** Browsers may decode 16-bit PNG to 8-bit, causing terracing (UNSUPPORTED, but cheap to avoid). 1024² source, a 512² displaced plane plus normal map, no Draco. ~20 MB total.
  2. **Slider math in the browser** from cumulative 1° slope histograms per window (~1.8 MB for 5k windows × 2 baselines as Uint16). Draw the heat map as a client canvas from the regular window grid; avoid GeoJSON.
  3. **Range reads** (`/vsicurl/`) on COGs (GLO-30, CTX). **Cut Earth domains to 2.** Start downloads tonight in parallel: at 3–10 Mbps bulk downloads alone take 1.5–4 h, and a realistic pipeline is **6–10 h**.
- **Cut immediately:** the **live Claude route**. It needs a server, a secret and a runtime failure path, and `output:'export'` cannot host route handlers. Pre-generate labelled text offline instead (saves ~3 h).
- **Engineering rules:**
  - Plain three.js unless the developer is fluent in R3F/drei `<View>`.
  - One renderer with scissor viewports, DPR ≤ 1.5, no shadows or post-processing.
  - Measure fps over the first 2 s. Below 20 fps, on mobile, or on WebGL failure, show a static hillshade pair plus an MP4 turntable.
  - **Lowercase asset paths.**
  - First load ≤ 10 MB.
  - Share only the production domain (Standard Protection gates preview URLs), and test it in incognito on mobile data.
  - Keep a local `next start` build and the 30 s video as backup.
- **Time realism:** pipeline 6–10 + metrics 4–6 + viewer 4–6 + slider/heat map 3–4 + drawer 2–3 + deploy/QA 2 = **21–31 h vs ~19 available**. Cut order: Claude → PAX → NASADEM cross-check → domains to 2 → rank-stability analysis.
- **Gate:** one ROI pair rendering from real processed bins by hour 8; otherwise fall back to Option 1 plus a single viewer.
- Sources: https://vercel.com/docs/limits ; https://vercel.com/docs/deployment-protection ; GitHub 100 MiB per-file limit.

---

## G. Skeptical local judge / responsible-AI reviewer — **CONDITIONAL**

| Opt | Imp | Cre | Val | Rel | Pres | Reason |
|---|---|---|---|---|---|---|
| 1 Atlas | 3 | 2 | 4 | 3 | 4 | Credible, but rediscovers famous sites. |
| 2 Workbench | 3 | 3 | 3 | 4 | 4 | PTAE already has weight sliders. |
| 3 Sandbox | 2 | 4 | 1 | 3 | 4 | Implies physics that is never modelled. |
| 4 Fingerprint | 3 | 3 | 4 | 4 | 3 | Most defensible science, but the engine is TAF's. |
| 5 Hybrid | 4 | 4 | 3 | 5 | 2 | Best rubric fit on paper; too much to explain or build. |

- **Compliance:**
  - NASADEM counts only if the ranking is actually computed from it. Credit it as "NASADEM (NASA LP DAAC, Earthdata Search)".
  - Using HiRISE only "for the citation" is a red flag: **PDS data must visibly change a result.**
  - Earth candidates must be **named coordinates with numbers**, not just a heat map.
- **What makes a judge's eyes glaze over:** Wasserstein, TPI, hypsometric integral, AUC, areoid, weight matrices, or a spinning 3D model with no question attached.
- **Top-3 moment:** the same-scale Mars|Earth 3D pair, plus "We hid Lut, Qaidam and Puna among N windows; the method put them in the top K, and next to them is a Mongolian site no paper describes", plus one honest line on where the analogy breaks down.
- **Gobi:** a strength (local relevance, "surprise us") and a risk (no literature, 30 m only). It survives only if the recall test passes first and Worldview/Landsat imagery confirms the landform.
- **Red-team answer:** it does not deserve a high score if what judges remember is the 3D view and the Claude text. Validity comes from the ranked list, the recall test, the negatives and the breakdown table.
- **Hardest Q&A:**
  1. Is the match an artifact of the two DEMs' different production methods?
  2. Aren't 30 m slopes meaningless for rovers?
  3. What result would have shown the Gobi is *not* an analog?
  4. Which result changes if you remove HiRISE?
  5. What can anyone actually do with a Gobi match, given friable MFF, 0.38 g and a thin atmosphere?
- **Improvements:**
  1. Build Medusae Tier 1 end to end first (~10 h). Start Tier 2 only if Tier 1 ships by hour 18.
  2. Pre-register the recall test (~1 h).
  3. Confirm the Gobi pick with imagery, and compare HiRISE 1 m against CTX 20 m to show what 30 m misses, so PDS changes a result (~2 h).
- **Cut:** PAX path, then Claude.
- **Conditions:** one ROI end to end by hour 18; the mobility objective labelled invalid below a stated baseline; the recall result shown even if it fails; ≤7 slides, with the ranked Earth list before the 3D.

---

## Cross-advisor synthesis — conflicts and resolutions

| Topic | Positions | Resolution | Basis |
|---|---|---|---|
| Rover slope slider at 30 m | **Six of seven reject it outright** (A, B, C, D, F, G); E keeps it only conditionally | **Cut from Tier 1.** Mobility only where ≥1 m data exist on *both* sides, as discrete sourced profiles | Golombek 2012 baselines; Kirk 2021 effective resolution; Hoover 2012 material dependence |
| PAX driving a path | All 7 cut it | **Cut** from the product. The mascot appears only as a static brand mark on the intro and end card | Implies unmodelled physics |
| Live Claude route | F cuts it, G deprioritises it, others are silent | **Not in the core.** Deterministic templated explanations. A live route is optional stretch after the freeze, if ever | Removes the only server dependency |
| Centrepiece: Utah 1 m (A) vs Medusae–Gobi discovery (E, G) | A: Utah is the dependable showpiece. E, G: discovery sells relevance; Utah is a "rediscovery" | **Medusae–Gobi discovery is the core.** Utah is a gated high-value add that shows the rover-scale tier and the "30 m hides the hazard" test | Brief demands "new"; G's ordering; F's time budget |
| Resolution display | E: matched posting badges. B: match *effective* resolution spectrally | **Both:** spectral matching in the pipeline, plus posting *and* effective-resolution badges in the UI | B is stricter; E is satisfied by it |
| Meaning of "mission conditioning" | Weights (prior art) vs feature sets vs baselines | **The objective selects the measurement scale (baseline).** Scale decides which data can answer the question, and so which candidates are even *evaluable*. Eligibility changes are real, not forced | C and B baselines; Foucher 2021 functional analogs |
| Discovery wording | A: "morphometric candidate". D: "candidate for field checking" | **"Morphometric candidate — not described as a Mars analog in the literature we searched; needs field checking"** | A + D |
| Circularity | D: pre-register, and pick Gobi coordinates only after the search | **Pre-register** the domain box, features, window, distance, controls and decision rule **before** computing. Timestamp the file in the repo | D |
| Scope | F: 21–31 h needed vs 19 h available. G: gate at hour 18 | **1 ROI core, 2 Earth search domains, plus held-out control tiles.** Utah is gated | F + G |
