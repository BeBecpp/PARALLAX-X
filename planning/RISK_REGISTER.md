# RISK_REGISTER — PARALLAX X

The source column gives the advisor letter (see `ADVISORY_REVIEWS.md`). I = impact, P = probability (H/M/L). "Fix" is the estimated time. Owner roles are suggestions only; no names are assigned.

| # | Risk | I | P | Fix | Mitigation / kill switch | Suggested owner role | Source |
|---|---|---|---|---|---|---|---|
| 1 | Scope overrun: one developer, about 31 h | H | H | — | 1-ROI core; gates G0–G5; cut order Claude → Utah → GLO-30 cross-check → stability panel → extra controls | Lead dev | F, G, A |
| 2 | Circular "discovery": windows or targets chosen after seeing data | H | H | 1 h | Pre-registration file committed **before** computing (domains, features, window, distance, controls, decision rule); Gobi coordinates verified only after the search | Science reviewer | D |
| 3 | Resolution mismatch: ranking measures sensor or production differences | H | H | 3 h | Spectral matching to CTX effective resolution; features restricted to ≥ 150 m baselines; posting **and** effective-resolution badges | Lead dev + GIS reviewer | B, G |
| 4 | Validity overclaim ("analog", "discovered", "%") | H | H | 0.5 h | Fixed vocabulary: "morphometric candidate", "not described as a Mars analog in literature we searched", no percentages of similarity; wording QA pass | Science reviewer | A, D, G |
| 5 | Recall test fails (published analogs rank low) | H | M | — | Report it; reframe as a method audit + Option 1 dossiers; never retune on held-out sites | Lead dev | D, G |
| 6 | 30 m aliasing: yardangs narrower than 3–5 effective pixels | H | M | 1.5 h | Measure ridge spacing in HiRISE; "what 30 m misses" panel; if unresolved, say so | GIS reviewer | A, B, D |
| 7 | Process confounders (strike ridges, linear dunes) rank as high as yardangs | H | M | 2–3 h | Process-different negatives included and shown; anisotropy plus relief features; geology/wind checklist | Science reviewer | A, D |
| 8 | Download time on venue or home network (HiRISE 339 MB + NASADEM/GLO-30 tiles) | H | M | — | Start downloads immediately after approval; COG range reads; keep D1 to ≤ 12 tiles | Lead dev | F |
| 9 | Mars CRS / NoData bugs (equirectangular local sphere, −3.4e38, CTX clon=0) | H | M | 2 h | `gdalinfo` first; mask before resampling; erode mask; local metric projection per window; synthetic slope tests | Lead dev | B, F |
| 10 | Integrated-GPU frame rate or WebGL failure on the judge laptop | M | M | 2 h | One renderer + scissor views; DPR ≤ 1.5; 512² meshes; fps probe → static fallback | Lead dev + QA | E, F |
| 11 | Local timing conflict (16:00 vs 09:00 start; hand-in method unknown) | H | M | 0.2 h | Email/Discord the Local Lead **now**; keep the repo's first commit after confirmation | Team lead | Audit |
| 12 | NASA-rule challenge ("is NASADEM via Planetary Computer from the Resources tab?") | M | L | 0.5 h | Pull the tiles used from LP DAAC via Earthdata Search; cite the LP DAAC record; HiRISE via PDS alone satisfies the rule | Lead dev | B, G |
| 13 | Concept overload for generalist judges | H | H | — | One ROI, one question per screen; jargon (TPI, Wasserstein, NASADEM) kept out of the main UI; drawer for depth | UX/pitch | E, G |
| 14 | Vercel Deployment Protection or case-sensitive paths block judges | H | L | 0.3 h | Production domain only; lowercase asset paths; test in incognito on mobile data | QA | F |
| 15 | AI-disclosure or branding violation (AI art, NASA marks, minors' likeness) | H | L | 0.5 h | Real app footage only; watermark any AI image; no NASA logos; no faces or voices of minors; disclosure slide | Pitch | Audit |
| 16 | AI-originated idea rule ("SI should not be used to come up with your idea") | M | M | — | Team reviews and owns the thesis decision; disclose AI use for research, critique and code accurately | Team | Audit |
| 17 | NASADEM artifacts and voids in low-relief Gobi | M | M | 1 h | Mask void-filled pixels (number-of-scenes layer); GLO-30 cross-check | Lead dev | B |
| 18 | Utah add-on DTM-noise mismatch (stereo vs lidar) | M | M | 2 h | Degrade lidar to 3–5 m; compare only at ≥ 5 m baselines; gated behind G3 | Lead dev | B, C |
