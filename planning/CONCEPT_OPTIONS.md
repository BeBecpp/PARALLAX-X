# CONCEPT_OPTIONS — PARALLAX X (Stage 1, independent)

Written 2026-11-14, **before** reading `docs/10_PRELIMINARY_FINDINGS_TO_CHALLENGE.md`. Planning only, no code.
Data facts referenced here are confirmed or refuted in `FACT_AUDIT.md` and `DATA_FEASIBILITY_MATRIX.md`.

## The question each concept has to answer

The challenge asks teams to **identify and characterize new potential terrestrial analogs**. So every concept has to output Earth places plus evidence. A Mars viewer only supports that. Hard gates: (1) it identifies Earth candidates; (2) it uses only verified data; (3) it invents no geology; (4) it uses at least one NASA source from the challenge Resources tab.

---

## Option 1 — Evidence-first Analog Dossiers ("Atlas")

- **Promise:** For a chosen Mars region, get a short, hand-curated list of Earth candidates. Each one comes with a dossier: a terrain fingerprint at matched scale, literature support, data coverage and limits.
- **User / question:** a student or field planner asking "which Earth sites are documented analogs for this Mars landform, and how similar is their terrain, measured rather than eyeballed?"
- **Proof artifact:** a per-candidate dossier: matched-scale slope/relief/roughness distributions, source ledger, and a literature citation.
- **20-second judge moment:** two histograms overlaid (Mars vs Earth slope at 30 m) next to the 3D terrain.
- **Challenge fit:** it characterizes analogs well, but candidate *identification* is hand-picked from literature. The "new analogs" requirement is weak.
- **Data:** 1 Mars DTM, 3–5 Earth DEM crops.
- **Uncertain claims:** none beyond the standard DEM caveats. Very safe.
- **Journey:** select → load → 3D → candidate list → dossier.
- **Not a clone because:** physical-scale-matched measurement rather than photos (Analog Explorer). The difference is weak against PTAE/EarthTwin.
- **Complexity / science risk / presentation risk / 3D potential:** Low / Low / Medium (looks like a gallery) / Medium.
- **MVP:** 1 Mars ROI, 3 Earth candidates, one 3D viewer. **Stretch:** second ROI.
- **Without Claude/ML:** fully works.

## Option 2 — Mission-conditioned Analog Workbench

- **Promise:** Choose a Mars region and a field-test objective, and see which Earth candidates best reproduce the terrain conditions that objective needs. Change the objective or rover limit and watch the evidence update.
- **User / question:** a field-test planner asking "for a mobility test of rover X against Mars terrain Y, which Earth site exercises the same terrain conditions?"
- **Proof artifact:** a ranking whose terms are traceable to features. A/B mission profiles yield recomputed values.
- **20-second judge moment:** drag the slope limit and watch the terrain recolor into classes on both planets while the candidate order updates (or holds, with the reason shown).
- **Challenge fit:** strong on characterization. Identification is still a hand-picked shortlist unless combined with a search.
- **Data:** same as Option 1. Hypothetical rover profiles must be labeled, or tied to published rover specifications.
- **Uncertain claims:** the transfer from mission objective to feature weights is a design choice, not validated science. At 30 m, slope is a baseline-dependent proxy.
- **Not a clone because:** no reviewed repo conditions on objective with recomputed class coverage (to verify in prior-art audit).
- **Complexity / risk:** Medium / Medium / Low / High.
- **Without Claude/ML:** fully works.

## Option 3 — Counterfactual Field-Test Sandbox (routes)

- **Promise:** Plan a rover route across the Mars DTM, then find the Earth site whose terrain makes an equivalent route exercise the same slope/roughness profile.
- **Proof artifact:** route elevation/slope profiles compared on Mars vs Earth.
- **20-second moment:** PAX drives a computed least-cost path on the real mesh, and the profile charts align.
- **Challenge fit:** weakest. The Earth identification becomes secondary to route simulation.
- **Uncertain claims:** many. Route cost is a proxy, and the 30 m Earth data cannot resolve the obstacles that matter for wheels. It risks implying mobility physics.
- **Complexity / risk:** High / High / Medium / Very high.
- **Verdict up front:** keep only as an optional overlay. It cannot be the thesis.

## Option 4 (my proposal) — Scale-honest Terrain Fingerprint Search ("Analog Finder with a recall test")

- **Promise:** Compute a multiscale terrain fingerprint of a real Mars region, then **search** defined Earth regions using same-size windows at the same meter scale. Rank the windows, prove the search works by checking that it **re-finds a published analog** (positive control) and rejects a negative control, and surface **under-characterized** high-ranking candidates for follow-up.
- **User / question:** "Given this Mars terrain, where on Earth (within a stated search domain) is the terrain statistically most similar at a scale both datasets genuinely resolve, and can the method be trusted?"
- **Proof artifact:** (a) a candidate map produced by a search, not hand-picking; (b) a recall result such as "the published analog ranks #k of N windows"; (c) a 3D side-by-side at matched scale for the top hits.
- **20-second judge moment:** a heat map over the Earth search domain, with the known analog lit up as a check and a previously unlisted candidate flagged next to it. Click → 3D terrain pair.
- **Challenge fit:** best. It literally identifies Earth locations, characterizes them, and tests the method.
- **Data:** a Mars DTM at ~20–30 m (CTX, or HiRISE downsampled) plus 30 m or 90 m global Earth DEM tiles over the search domain. The Resources-tab NASA source can be NASADEM / ASTER GDEM / Mars Trek / HiRISE, depending on the audit.
- **Uncertain claims:** terrain statistics ≠ geologic process. A high-ranking window is a *candidate deserving characterization*, not a discovery. The ranking depends on window size and scale, so this must be shown.
- **Not a clone because:** TerraNova scores global cells, so the search itself is not unique. The positive-control recall test plus matched meter-scale Mars fingerprint plus honest 3D still need to be checked against prior art.
- **Complexity / risk:** Medium-high (download and preprocess many tiles) / Medium / Low / High.
- **MVP:** 1 Mars ROI, one Earth search domain (e.g., US Colorado Plateau, where the published analog lies, plus a Mongolian Gobi domain), and 3 top candidates in 3D.
- **Without Claude/ML:** fully works. Window statistics and distribution distances are deterministic.

## Option 5 — Hybrid (to evaluate after the advisory panel): Option 4 as engine + Option 2 as interaction

The search engine generates the candidates (identification). The objective toggle changes which fingerprint components and thresholds count (functional analog). Honest 3D compare and an evidence drawer complete it. Routes are dropped or reduced to an overlay.

---

## Planning-heuristic scores (internal weights from the pack, not NASA's)

| Option | Fit 25 | Validity 25 | Novelty 20 | Demonstrable 20 | Visual 10 | Weighted | Hard gates |
|---|---|---|---|---|---|---|---|
| 1 Atlas | 3 | 5 | 2 | 5 | 3 | **3.65** | pass (weak "new") |
| 2 Workbench | 3.5 | 4 | 3.5 | 4 | 4.5 | **3.78** | pass |
| 3 Sandbox | 2 | 2 | 3 | 2 | 5 | **2.55** | at risk (identification secondary, physics implication) |
| 4 Finder | 5 | 4 | 3.5 | 3 | 4 | **4.00** | pass if tile acquisition is verified |
| 5 Hybrid | 5 | 4 | 4 | 2.5 | 4.5 | **4.00** | pass, scope risk |

Scores are 1–5 judgements with roughly ±0.5 uncertainty each. The spread between Options 2, 4 and 5 is inside the noise, so the decision must rest on data feasibility and the advisory panel, not on these numbers.

## Why my favourite (4/5) might be WRONG

1. **Tile acquisition and time.** Searching even a modest domain needs tens to hundreds of DEM tiles. If downloads need Earthdata login or are slow, the search shrinks to a handful of tiles, and the "discovery" becomes hand-picking in disguise.
2. **Scale collapse.** At 30 m the fingerprint loses the meter-scale features that make a site a useful *rover* analog. Many arid regions may look statistically alike, so "similar at 30 m" may be weakly informative.
3. **Recall test may fail.** The published analog may not rank highly. That is an honest result, but it weakens the demo. We must decide beforehand to report it either way.
4. **TerraNova overlap.** If TerraNova already scans Earth windows against Mars statistics, novelty shrinks to the controls and the UX.
5. **Ranking ≠ analog.** Terrain statistics cannot distinguish an inverted channel from a sand-capped ridge formed by a different process. The planetary scientist will object.

---

## INITIAL_RECOMMENDATION (before the advisory panel)

My initial lead was **Option 5**. I sent it to seven independent simulated advisors (see `ADVISORY_REVIEWS.md`). All seven returned CONDITIONAL. Their conditions reshaped it into the final thesis in `DECISION_MEMO.md`:

- cut the 30 m rover slider and PAX driving;
- match effective resolution spectrally;
- pre-register the method;
- add process-discriminating negative controls;
- use "morphometric candidate" wording;
- one ROI as the core;
- make the objective change the measurement scale, not the weights.

Two research findings changed the scores above:

- Terrestrial Analog Finder (shishir-kuet) already implements the Option 4 search engine (CTX + GLO-30 on 30 m windows, W1). The **novelty of Option 4 fell to about 2.5**.
- The brief explicitly penalises famous sites, so **Option 1's fit fell to about 2.5**.
