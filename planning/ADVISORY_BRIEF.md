# ADVISORY BRIEF — shared input packet for independent reviewers (2026-11-14)

You are reviewing a **plan**, not code. Nothing has been built or computed yet. No result below is a measured outcome.

## Context
- Event: NASA Space Apps Challenge 2026, local event Ulaanbaatar (UTC+8).
- Build window: about 30 hours, from Nov 14 until the local hand-in **by Nov 15 19:30**. Local judging runs 19:30–20:30; NASA's final deadline is 23:59.
- Team: **one core developer (Nero)** using Claude Code/Cursor, on an ordinary laptop with no GPU. Teammates can do QA, science review and the pitch.
- Challenge: "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars". The brief asks teams to "identify and characterize **new** terrestrial analogs", says "not simply to rediscover well-known analog sites … Look beyond Antarctica, Atacama, Iceland, Hawaii … Surprise us", and requires explaining **where the analogy breaks down**. Its considerations include terrain, slope, roughness and scale.
- Judging: Impact, Creativity, Validity, Relevance, Presentation, each scored 1–5. The local judges are 2 educated generalists (a teacher and a professor).
- Hard rules:
  - Use at least 1 NASA source from the challenge Resources tab. The NASA sources listed are only Earthdata Search, Worldview, PDS, LRO and Diviner; Mars data is available only via PDS.
  - Demo is a video of 30 s or less, or at most 7 slides.
  - Public links, English.
  - AI images and videos need a visible watermark; no NASA branding in AI content.
  - No likeness of anyone under 18.
- Fixed owner preferences:
  - Location-first UX: select a Mars region → honest loading → large, genuinely DEM-derived interactive 3D → compare Earth on demand → mission experiment → evidence drawer on demand.
  - Premium, restrained look: graphite background, one copper accent, Earth blue used only for the comparison. No neon dashboards, no fake AI "thinking", no fake percentage scores.
  - No custom ML training. Claude API only as an optional explainer, never the source of measurements.
  - Vercel Next.js with Three.js rendering in the browser and offline preprocessing.

## Verified data facts (checked 2026-11-14 via labels, HEAD requests and STAC/TNM APIs)

**HiRISE DTMs (PDS)**
- 1 m posting, float32 PDS3 `.IMG`. NoData is about −3.4e38. Projection is equirectangular on a local sphere. Heights are above the areoid. Paired orthoimages exist. No login.
- Each file is 333–700 MB.
- Verified products:
  - Jezero `DTEEC_023524_1985_023379_1985_U01`: 21.5×8.3 km bbox. Delta coverage is uncertain.
  - Gale `DTEEC_001488_1750_001752_1750_U02`.
  - Oxia Planum `DTEEC_063839_1980_064261_1980_H01`.
  - **Aeolis Dorsa inverted/meander ridges** `DTEEC_020673_1750_020528_1750_A01`: 19.3×7.6 km.
  - **Medusae Fossae yardangs** `DTEEC_009609_1675_010453_1675_A01`: 13.3×6.5 km.

**USGS CTX DTMs**
- 20 m posting, aligned to MOLA, Cloud-Optimized GeoTIFF on public S3, CC0, no login.
- Each file is 6–18 MB with a 36–93 km footprint.
- Fully cover the Jezero, Oxia and Medusae Fossae HiRISE DTMs; cover Aeolis Dorsa only partially.
- These are USGS derived products made from PDS CTX images.

**Global Mars DEMs**
- MOLA (463 m) and the HRSC blend (200 m) are too coarse for landforms of 50 m to 2 km.

**Earth DEMs**
- **Copernicus GLO-30** (ESA, a partner resource): about 30 m. It is a surface model (DSM), irrelevant in deserts. Tiles of 1°×1° are 36–41 MB on public S3 with no login.
- **NASADEM** (NASA, in Earthdata Search): 30 m. Earthdata login is needed at LP DAAC; the copy on Microsoft Planetary Computer needs no login.
- **USGS 3DEP 1 m lidar**: verified tiles over Utah's Green River / Hanksville inverted-channel analogs, 10×10 km tiles of about 260–330 MB each, no login.
- No public lidar exists for Mongolia; only 30 m global DEMs cover it.

**Literature (verified DOIs)**
- Inverted channels in Utah: Williams, Irwin & Zimbelman 2009 (Geomorphology); Clarke & Stoker 2011 (IJA).
- Yardangs:
  - Puna ignimbrite yardangs as Medusae Fossae analogs: de Silva et al. 2010 (PSS).
  - Lut Kaluts, DEM morphometry: Ehsani & Quiel 2008 (RSE).
  - Qaidam: Xiao et al. 2017 (ESR); Wang et al. 2018 (JGR Planets).
- Functional analog concept (suitability depends on the objective): Foucher et al. 2021 (PSS).
- Kilometre-scale roughness method: Kreslavsky & Head 2000 (JGR).
- Landing slope criteria at 2–5 m baselines: Golombek et al. 2012 (MSL).
- Mongolia: only Tsenkher crater (Komatsu et al. 2019, Geol. Mag.) and periglacial LPSC abstracts. **I found no Mars-analog literature on Gobi yardangs**, so they are under-characterized. Coordinates would have to be chosen from imagery by the team.

**Compute**
- Offline preprocessing of all the above is estimated at 2–4 hours on a laptop CPU.
- Vercel Hobby: 4.5 MB function body limit, 100 MB CLI upload.

## Prior art (2026 public repos, inspected 2026-11-14)
- **TerraNova**: scores 78k global 0.5° cells; ROC-AUC with negative controls; Monte Carlo robustness; real-DEM Three.js 3D of the **Earth side only**; a 15° slope traverse tool; a hardware readiness matrix. Mars targets are literature values; HiRISE/CTX ingestion is "not implemented".
- **EarthTwin**: matched 200 m grid built from MOLA-HRSC; 18 curated sites; per-mission weights; 15° filter; "why not others"; no real 3D.
- **PTAE**: multi-baseline differential slope (Kreslavsky), with Mars only at ≥960 m baselines; 5 negative controls with AUC; random-weight robustness; mission sliders that only change weights; procedural (fake) 3D.
- **Terrestrial Analog Finder (shishir-kuet)**: **CTX 20 m + GLO-30 on a shared 30 m grid in 12 km windows; relief, slope percentiles, roughness, hypsometric integral; Wasserstein slope-histogram distances; sensitivity to weights, resolution and window size; side-by-side hillshades.** No objective conditioning, no 3D, no negative controls.
- **Analog Atlas**: Cesium globes for all 3 worlds; a 500 m grid slope; a landing-zone metric.
- **MissionMatch/ELSEWHERE**: claims 1.14 M Earth windows at about 1 km; slope priority; LLM chat.
- **NASA Analog Explorer**: 11 image pairs with sliders; no metrics.
- No reviewed project uses HiRISE DTMs or Earth lidar. None changes its **feature set or baselines** by test objective. None shows paired same-scale DEM 3D of Mars next to Earth.

## Concept options under review
1. **Evidence-first Atlas**: a hand-curated candidate list with matched-scale dossiers. Safe, but weak on "new".
2. **Mission-conditioned Workbench**: the field-test objective or rover limit changes the ranking, with 3D compare.
3. **Counterfactual route Sandbox**: rover routes on the DTM. High risk; risks implying mobility physics.
4. **Terrain-fingerprint Search**: CTX→30 m Mars fingerprint compared against windows of the same physical size across declared Earth search domains. A recall test asks whether published analogs rank high, plus negative controls. It surfaces under-characterized candidates such as Gobi yardangs. The search engine itself is **not novel** (see TAF and TerraNova).
5. **PROPOSED LEAD: hybrid "two-tier, objective-conditioned analog finder"**, made of the parts below.
   - **ROI catalogue (2 supported regions):**
     - **Medusae Fossae yardangs**: CTX 20 m plus HiRISE 1 m. This is the "discovery" ROI: search Earth domains including the Gobi, Lut, Qaidam and Puna.
     - **Aeolis Dorsa inverted channels**: HiRISE 1 m, compared with Utah 3DEP 1 m. This is the rover-scale ROI.
   - **Tier 1, regional screening at 30 m:** fingerprint windows of equal km size. Use NASADEM as the primary DEM (NASA, Earthdata) and GLO-30 as a DEM-source cross-check. Mars comes from CTX 20 m, with HiRISE from PDS for the NASA-rule citation. Includes a positive-control recall test and negative controls (a random-window null plus a same-climate, different-process site).
   - **Tier 2, fine-scale comparison at 2–5 m:** HiRISE 1 m against 3DEP 1 m, only where both exist (Utah).
   - **Objective conditioning changes the features and baselines, not just the weights:**
     - *Landform/process analog*: relative relief, TPI and directional anisotropy (yardang elongation) at landform scale, roughly 300 m–2 km.
     - *Mobility test site*: the slope distribution at the shortest valid baseline (≥2–3× posting), plus the fraction of terrain above a rover slope limit (examples: 15°, 30°, from published landing/traverse criteria). The rover limit becomes a user slider that re-classes terrain on both planets and re-ranks by **class-mix agreement** (does the Earth site reproduce the Mars site's proportion of hard terrain?).
     - The rankings under each objective are reported with rank stability. No rank flip is forced; whatever happens is reported.
   - **Paired same-scale 3D** (Mars vs Earth heightfields with the same exaggeration and scale bar), a "where the analogy breaks down" section, and an evidence drawer.
   - **Optional extras:** a Claude explainer, and PAX following a computed least-cost path. Both are optional.

## Your task
Review options 1–5, **focusing your attack on Option 5**. Be skeptical and concrete. Prioritize hard objections over compliments.
