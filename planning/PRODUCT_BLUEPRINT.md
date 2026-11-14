# PRODUCT_BLUEPRINT — UX_INTERACTION_SPEC + BRAND_SYSTEM_REFINEMENT + ANIMATION_STORYBOARD + design-deck outline

No code. Durations and budgets are design targets to be measured on real hardware after APPROVED: BUILD.

---

## Part 1 — UX interaction spec (states A–F)

**Principle:** one question per screen. The jargon (TPI, Wasserstein, NASADEM, "Tier") lives only in the evidence drawer.

### State A — SELECT ("Which Mars landform should Earth stand in for?")

```
+--------------------------------------------------------------------------------+
| [X] PARALLAX X                                              Sources · About    |
|                                                                                |
|   Where on Earth does this Mars terrain live?                                  |
|   Choose a Mars site with real high-resolution terrain data.                   |
|                                                                                |
|   [ Large, calm Mars map: real MOLA shaded relief, graphite-toned ]            |
|        o  Medusae Fossae — wind-carved ridges (yardangs)    <- footprint outline|
|        o  Aeolis Dorsa — inverted river channels            <- only if Utah tier|
|                                                                                |
|   [ Card: Medusae Fossae · HiRISE 1 m DTM · 13 × 6.5 km ]   [ Explore  -> ]    |
|   Grey dot: "No compatible DTM in this prototype."                             |
+--------------------------------------------------------------------------------+
```

- The map is a static image of real MOLA data (USGS mosaic, downsampled). It is not a fake globe, and it implies no global coverage.
- Footprints are drawn at their true location and size. Hover shows the product ID and posting. Clicking anything outside a footprint does nothing, with a tooltip explaining why.
- The CTA is a single copper button.
- **Mobile:** the map stacks above the cards.
- **Empty state:** not applicable, because the catalogue ships static.

### State B — LOADING (truthful)

- Steps shown, each tied to real work:
  1. Fetching Mars elevation · `DTEEC_009609…` · 2.1 MB (real byte progress)
  2. Building terrain mesh · 262,144 vertices
  3. Loading Earth comparison results · 4 candidates
- During loading the camera fades from the map footprint to the terrain. The 0.8–1.2 s budget only plays if loading takes longer than that.
- If loading takes under 300 ms, the step list is skipped. There is no minimum duration and no "AI is thinking".
- **Failure:** "Couldn't load the terrain file. [Retry] · [View static version]". The static version is a hillshade image plus the results table.

### State C — EXPLORE (Mars hero)

```
+--------------------------------------------------------------------------------+
| [X] PARALLAX X   Mars › Medusae Fossae yardangs                   [Evidence ▸] |
|                                                                                |
|                 FULL-BLEED 3D TERRAIN (HiRISE, real heights)                   |
|                                                                                |
|  ▔▔▔▔ 1 km      Posting 1 m · effective ≈ [E_h] m · vertical ×[2] (toggle ×1)  |
|  Observed: HiRISE DTEEC_009609_1675_010453_1675_A01 (NASA PDS)                 |
|                                                                                |
|  [⟲ Reset]  [Shading ▾]                          [ Compare with Earth  -> ]    |
+--------------------------------------------------------------------------------+
```

- **Controls:** orbit (drag), pan (right-drag or two fingers), zoom (wheel or pinch), all bounded. Keyboard: arrows orbit, +/− zoom, R resets.
- **Material:** source-derived hillshade, with a neutral warm tint because the ortho may not be co-registered. If the ortho is used, label it "HiRISE orthoimage".
- **Optional "What 30 m sees" toggle:** a split slider that wipes the hero mesh between native resolution and E-matched resolution. This is the resolution sanity panel.

### State D — COMPARE (the "fair comparison" moment)

1. Press **Compare with Earth**. The Mars mesh crossfades to the E-matched version, and a caption appears: *"Matched to [E] m — the finest scale both planets' data truly resolve."*
2. A right-hand sheet lists the candidates:

```
 EARTH CANDIDATES (ranked among N Earth windows)
 1  Gobi cluster G-1 · 43.x°N 10x.x°E · top [p]%   CANDIDATE · not in literature we searched
 2  Lut Kaluts, Iran · top [p]%                     KNOWN ANALOG (held-out check ✓/✗)
 3  Qaidam, China · top [p]%                        KNOWN ANALOG (held-out check ✓/✗)
 4  Puna, Argentina · top [p]%                      KNOWN ANALOG (held-out check ✓/✗)
 —  Controls: strike ridges · dune field · random    ranked [q]% (expected low)
```

3. Pick a candidate. The view splits: Mars on the left, Earth on the right. Both sides share one renderer (scissor viewports) and a **linked camera**, with the same km extent, exaggeration and scale bar. Earth uses a subtle blue accent label.
4. A **persistent breakdown caption** sits at the bottom, three lines:
   *"Same shape at ≥[E] m. Different rock: MFF likely weaker and more porous. Different world: 0.38 g, ~0.6 kPa air, Earth has water and vegetation."*
5. An A/B swap key toggles full-screen Mars ↔ Earth, for the video and for small screens.

### State E — SCALE LENS (the mission experiment)

A segmented control above the canvas: **Landform study (≥150 m)** | **Rover field test (≥5 m)**.

When **Rover field test** is selected:
- The Mars side switches to the native HiRISE mesh with a slope-class overlay at a 5 m baseline. Profile chips: L 15° (loose) / R 30° (outcrop). Classes are encoded by luminance and hatching, so they survive colour blindness.
- The Earth side shows **"Not evaluable at rover scale — only 30 m public data for this site. To evaluate: drone/lidar survey."**
- If the Utah tier ships, Aeolis Dorsa ↔ Utah stays evaluable, and the connectivity numbers appear there.
- The label on every view: *"slope-class proxy at 5 m baseline; not trafficability."*

### State F — EVIDENCE drawer (right side, 440 px on desktop; full sheet on mobile)

Tabs: **Result · Method · Sources · Limits · AI use**.
- **Result:** recall table (positives vs null vs negatives vs baseline B0); pass/fail banner; candidate stability, if computed.
- **Method:** a pipeline diagram (source → mask/project → match → features → distance → rank); feature table with units and baselines; pre-registration hash and timestamp.
- **Sources:** SourceRecord table with links (PDS, LP DAAC/Earthdata, USGS, Copernicus) and DOIs.
- **Limits:** the full breakdown table and the "what [E] m misses" metric.
- **AI use:** an honest disclosure of AI assistance.

### Error and fallback matrix
| Condition | User sees |
|---|---|
| WebGL unavailable or fps < 20 | Static hillshade pair + numbers table + "3D unavailable on this device" |
| Asset 404 | Retry + static version |
| Reduced motion | Cuts instead of camera flights; no auto-orbit |
| Narrow screen | Single view with A/B swap; drawer as a full sheet |

---

## Part 2 — Brand system refinement

- **Keep:** the PARALLAX wordmark (slanted geometric) and the orbital **X** as the signature mark. Rebuild them as clean vectors: flat copper, **no glow, no gradient swoosh**. PAX appears only as a static flat illustration on the intro, About and end card. **It never drives on terrain, never talks and never sits in the UI chrome.** If the PAX art is AI-generated, it carries a visible "AI-generated" mark in public materials.
- **Tokens:**
  - Backgrounds: bg `#0D1118`, surface `#192028`, hairline `#313A43`.
  - Text: `#F2F0EB`, muted text `#9AA8B4`.
  - **Mars copper `#D46B44`**: one accent, used for the CTA, selection and Mars labels. Check 4.5:1 contrast on bg for text use; otherwise use it only for fills or large text.
  - **Earth blue `#628EAB`**: only on the Earth side of Compare.
  - Status colours are not hues; they are badge outlines plus text ("Observed", "Candidate"…).
- **Type:** Space Grotesk for display (OFL licence, to verify) and Inter for UI (OFL). JetBrains Mono or IBM Plex Mono with tabular figures for numbers and IDs. Minimum 14 px in the UI and ≥ 18 px for anything that must read in the video.
- **Space and shape:** 8 px grid, 24–32 px shell margins, 44 px touch targets, 8 px radius, no outer glows, at most one soft shadow level.
- **Terrain rendering:** hillshade, not contour lines (contours turn to mush on Zoom). Warm-grey ramp for Mars, cool-grey ramp for Earth. Exaggeration ×2 by default, labelled, with a toggle to ×1.
- **Voice:** precise, short, plain English. "Candidate", not "discovery"; "proxy", not "risk"; ranks, not percentages of similarity.

---

## Part 3 — Animation storyboard (targets, not measurements)

| # | Transition | Duration | Easing | Real event it reflects | Reduced motion |
|---|---|---|---|---|---|
| 1 | Landing fade-in | 400 ms | ease-out | first paint | instant |
| 2 | Footprint hover highlight | 150 ms | linear | — | same |
| 3 | Map → terrain camera move | 0.8–1.2 s, only while loading is still running | ease-in-out cubic | asset fetch and mesh build | cut |
| 4 | Loading step tick | 200 ms each | — | real promise resolution | same |
| 5 | **Mars detail softens to E** | 600 ms crossfade | ease-in-out | switching to the matched mesh | instant swap + caption |
| 6 | Split into Mars/Earth | 500 ms | ease-out | Earth mesh ready | cut |
| 7 | Scale-lens switch | 400 ms overlay fade | ease-out | eligibility recomputed | instant |
| 8 | Drawer open/close | 280 ms | ease-out | — | instant |
| 9 | A/B swap | 300 ms crossfade | linear | — | cut |

Never animate the score values (no counting-up numbers). No particles, no light trails, no idle orbit while the user reads.

---

## Part 4 — Internal design-direction deck outline (9 slides; NOT the ≤7-slide submission)

1. **Instrument, not dashboard.** One question per screen.
2. **Brand restraint.** Flat copper X, wordmark, PAX as a static mascot only.
3. **A: Select a real footprint.** MOLA locator, two honest cards.
4. **B: Loading that tells the truth.** Real stages, real bytes, skipped when fast.
5. **C: The terrain is the hero.** HiRISE 3D with posting and effective-resolution badges.
6. **D: The fair-comparison moment.** Detail softens to the matched scale, then the split view.
7. **E: Scale lens.** Landform vs rover; "not evaluable" is an honest answer.
8. **F: Evidence on demand.** Recall result, method, sources, limits, AI use.
9. **What we refuse to build.** Kill-list visuals: no glow, no % match, no driving mascot.
