# Handoff for the separate video session

The competition video will be produced later, in a separate session (Claude Cloud with a Kokoro voice). This release
did **not** create a video, narration, voice track or slides.

## Live product
- URL: https://parallax-x-lyart.vercel.app
- The final deployed commit is recorded in the release report. To confirm what is live, check `git log -1` on `main`
  together with the Vercel deployment.

## Real screens to capture, in order
1. **Mars.** Welcome intro (optional) → Select → **CTX Yardang Study** → the Mars CTX terrain.
2. **Earth candidate.** Compare → Gobi **G-1**: matched scale, ranking card, transect.
3. **Evidence.** Evidence → *4 · Does it work?* (falsification reveal, FAIL) and *3 · Where on Earth?* (Why
   investigate this location?).
4. **Expedition Lab.** Compare → **Plan a field experiment** → Wheel mobility (unmeasured list, slip formula), then
   *Illustrative rover traverse*.
5. **Limits.** Explore → **The resolution paradox** (HiRISE native → 30 m: 13.9 % → 1.6 %).

## Shortcuts and timing
- **Demo button or J:** the five-act judge demo, about 30 s. **Esc** skips it.
- **M:** toggles sound. Sound is off until the user enables it.
- **First load.** On a cold first load the rover model (1.7 MB, Draco) can take several seconds on integrated GPUs.
  The demo now waits for the real load and skips the traverse if the model is not ready in time. Do a warm-up run
  before recording.
- **Capture size.** Record at 1920×1080. On the reference HD 4000 laptop, quality drops automatically.

## Scientific caveats to keep in narration and captions
- The pre-registered validation **FAILED**: known yardang sites ranked 64.6 / 17.4 / 85.7 (bar 90), and the full
  fingerprint scored 55.9 vs 63.0 for slope-only.
- G-1…G-5 are **exploratory** morphometric candidates, not confirmed analogs.
- The CTX yardang study drives the search. The **HiRISE** scene is a separate fine-scale demonstration.
- The rover is an **illustrative** terrain-following visualization. No mobility physics is modelled and no field test
  has been performed.
- Roughness and WorldCover are post-hoc and descriptive.
- Not affiliated with or endorsed by NASA.

## Concept films (Khuslen, V01D-404)
- **Films.**
  - 05 brand film (22 s)
  - 01 mission concept (29 s, AI voice)
  - 02 boot concept (17 s)
  - 04 interface concept (28 s; Jezero/C1–C3/rover limits, not our workflow)
  - 03 character study (12.5 s)
- **Links and rights.** See [`VISUAL_ASSETS.md`](VISUAL_ASSETS.md).
- **Use them sparingly.** Use concept footage sparingly, and label it on screen as AI-generated concept media. Keep
  the existing watermarks.
- **Rights first.** Confirm the soundtrack and voice rights and the creator's permission before reusing any of their
  audio.
