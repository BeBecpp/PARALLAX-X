# HACKATHON_PLAYBOOK — HACKATHON_SCHEDULE + PITCH_STORYBOARD + SUBMISSION_READY_CHECKLIST

All times are UTC+8. The plan was written at 11:00 on Nov 14. Hard limits: local hand-in **by 19:30 on Nov 15** (we freeze at 18:30), local judging 19:30–20:30, NASA final 23:59.

## 1. Schedule (gates come from DECISION_MEMO §7)

| When | Work | Gate / output |
|---|---|---|
| **Nov 14, as soon as Nero says APPROVED** | Email/Discord the Local Lead to confirm (a) work allowed before 16:00, (b) the hand-in method, (c) the presentation format and minutes per team. Nero creates a free Earthdata login (a human step). **Start downloads:** HiRISE MFF (339 MB), CTX (6 MB), NASADEM tiles for D2 and the control tiles. | Downloads running |
| +0:30 | Write the **pre-registration file** (domains, polygons, features, rule) and make it the first commit with the README | Timestamped pre-registration |
| → 16:00 | Pipeline: `gdalinfo` checks; masks; reprojection; synthetic slope tests; matching; features for Mars plus 1 Earth tile; first heightfield export | **G0 Data, 16:00** |
| → 20:00 | Next.js skeleton, location-first select screen, real loading, HiRISE 3D hero; deploy to Vercel | **G1 Render, 20:00** (public URL) |
| → 01:00 Nov 15 | Full search over D1 and D2, controls, null, B0, clusters; results JSON | **G2 Science, 01:00**: recall result exists, whatever it says |
| 01:00–07:00 | **Sleep.** The team may include minors, and tired work produces bugs. Optional overnight runs: GLO-30 cross-check, Dirichlet stability | — |
| 07:00–10:00 | Compare view (matched mesh, split, linked camera), candidate sheet, breakdown caption, scale lens | **G3 MVP, 10:00** |
| 10:00–14:00 | Evidence drawer; static fallback; a teammate checks the Gobi imagery (Worldview/Sentinel-2) and fills the geology/wind checklist. **Utah add-on only if G3 passed on time.** | **G4 Freeze, 14:00** |
| 14:00–16:30 | QA: incognito, mobile data, integrated-GPU laptop, wording search, 1080p/Zoom legibility. Record the 30 s video and caption it in English. Build ≤7 slides | Video + slides |
| 16:30–18:00 | NASA project page: fill and save every field and disclosure. Rehearse the 1-min and 3-min talks | Draft saved |
| **18:30** | **Internal freeze → hand in locally** | Submitted |
| 19:30–20:30 | Present | — |
| ≤23:30 | Final NASA page edits (stop well before 23:59) | Final |

## 2. 30-second video storyboard (real screen recording, English captions, no faces or voices of minors)

| Time | Screen | Caption |
|---|---|---|
| 0–4 s | Select: MOLA map, the Medusae Fossae footprint glows on hover, click Explore | "Where on Earth does this Mars terrain live?" |
| 4–9 s | Real loading steps → HiRISE 3D orbit | "Real NASA HiRISE elevation, 1 m posting" |
| 9–14 s | Compare: Mars detail softens to the matched scale | "Compared fairly, at the scale both planets' data resolve" |
| 14–20 s | Split view: Mars \| Gobi candidate; candidate list with known analogs ✓ | "Our search re-found published analogs, and flagged a Gobi site no paper we found describes" (use only if true; otherwise the honest result) |
| 20–25 s | Scale lens → Rover field test → "Not evaluable at rover scale" | "For rover tests, public Earth data isn't fine enough. Here's what to survey" |
| 25–30 s | Breakdown caption + evidence drawer → URL | "Where the analogy breaks down, with sources. parallax-x.vercel.app" (actual URL) |

## 3. Submission deck (≤7 slides, as an alternative or supplement to the video)
1. Title + one-line thesis
2. The question & why "new" analogs are hard (brief quote)
3. Method in one picture: NASA PDS + Earthdata → matched scale → fingerprint search → controls
4. Result: recall table (positives vs null vs negatives vs baseline). This comes **before** the 3D
5. Gobi candidate: coordinates, imagery, "morphometric candidate", where it breaks down
6. Scale lens: what public data can and cannot tell a rover team
7. Sources, AI-use disclosure, links

## 4. Talk outlines
**1 minute:**
- Problem: the brief asks for new analogs, not famous ones.
- Method: a real HiRISE/CTX fingerprint compared against Earth windows at matched scale, set in advance.
- Proof: it re-found published analogs, beat a simple baseline and rejected look-alikes. Report the real numbers.
- Finding: a Gobi candidate.
- Honesty: where the analogy breaks down, and that rover-scale evaluation needs new data.
- Demo click-through.

**3 minutes:** the same arc plus:
- why we matched resolution (one sentence on stereo effective resolution);
- the pre-registration;
- one live click into the evidence drawer;
- what we'd do next: field check, drone DEM, a geology map review.

**Likely questions, short answers:**
- *DEM-production artifact?* → "We matched effective resolution spectrally, cross-checked NASADEM against GLO-30, and the process-different controls ranked low." Say this only if all of it is true.
- *30 m and rovers?* → "We don't claim it. That's why the app says 'not evaluable at rover scale'."
- *What would have falsified the Gobi?* → "Falling outside the known-analog envelope, or ranking below the dune and strike-ridge controls. We pre-registered that rule."
- *Remove HiRISE?* → "The 3D hero, the 'what 30 m misses' metric and the rover-scale proxy all disappear."
- *Useful given 0.38 g and weak MFF rock?* → "It's a terrain-morphology candidate for field checking and method training, not an environmental twin. The breakdown table says so."
- *Did you train AI?* → "No, deliberately. The ranking is deterministic and auditable. AI assisted research, critique and coding, as disclosed."

## 5. Submission-ready checklist (from the official Submission Guide, 2026-11-14)
- [ ] All members registered for the Ulaanbaatar event (≤6), none waitlisted
- [ ] Project Name · High-Level Summary · Detailed Description, all in English
- [ ] **Demo link: video ≤30 s OR ≤7 slides.** Over the limit makes the project ineligible for Global Judging
- [ ] Final Project link: the public Vercel production URL. Opens in incognito with no login
- [ ] Public GitHub repo with README, pre-registration file, pipeline scripts and a sources table
- [ ] **NASA Data field:** HiRISE DTM via **PDS** (product ID + URL) and **NASADEM via Earthdata Search/LP DAAC** (DOI/record). Both are actually used in results
- [ ] **Partner/Other References:** Copernicus GLO-30 (ESA; if used), USGS CTX DTM (DOI 10.5066/P9JKVWR3), USGS 3DEP (if used), MOLA locator, and every paper cited (DOIs), library and font
- [ ] **Use of SI field + in-project disclosure:** which AI tools were used for research, critique, code and text, and how. Visible watermark on any AI-generated image or video. No NASA logos, flags or mission insignia in AI content
- [ ] No image, video, audio or likeness of anyone under 18
- [ ] Terms and Conditions + originality checkboxes
- [ ] Local hand-in done by 18:30 (deadline 19:30) using the method the organizers confirmed
- [ ] Final NASA edits saved before 23:30

## 6. Role options (to agree as a team; nobody assigned here)
- **Lead developer / integration:** Nero, by owner decision.
- **Science reviewer:** pre-registration polygons from the papers, the wording QA, the breakdown table.
- **GIS checker:** spot-checks CRS and footprints, then the Gobi imagery and geology/wind checklist.
- **QA:** devices, incognito, fps, broken links.
- **Pitch/video:** 30 s capture, captions, ≤7 slides, talk rehearsal.
- **Submission steward:** NASA page fields, disclosures, deadlines.
