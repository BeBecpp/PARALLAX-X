# PARALLAX X: 29.3-second demo video credits, rights and AI disclosure

**File:** `PARALLAX_X_SPACE_APPS_2026_DEMO_FINAL.mp4` (29.300 s, 1920×1080, 30 fps, H.264 + AAC)
**Project:** PARALLAX X, a NASA Space Apps Challenge 2026 entry (Ulaanbaatar). It uses NASA, USGS and ESA data.
**It is not affiliated with or endorsed by NASA.**
**Live app:** https://parallax-x-lyart.vercel.app · **Code:** https://github.com/BeBecpp/PARALLAX-X (app release `2b9556c`)

---

## 1. What is in the picture

| Source | Seconds in the video | Share | What it is |
|---|---|---|---|
| **Real PARALLAX X screen capture** | 2.30 to 24.10 (21.8 s) | 74 % | Genuine frames of the deployed app at `parallax-x-lyart.vercel.app`, rendered by headless Chromium 1920×1080 with WebGL (SwiftShader). Nothing is generated, mocked or retouched; only crops, slow zooms and text overlays were added. |
| **AI-generated concept film 05 (brand film)** by **Khuslen (V01D-404)** | 0.00 to 2.30 and 24.10 to 27.00 (5.2 s) | 18 % | AI-generated concept footage. The original "AI-GENERATED CONCEPT TRAILER" watermark is kept visible (letterbox preserved, no crop). A second, larger on-screen notice is also shown: "AI-GENERATED CONCEPT FOOTAGE · BRAND FILM BY KHUSLEN (V01D-404)". |
| **End card** | 27.00 to 29.30 (2.3 s, with a 0.5 s dissolve) | 8 % | The canonical PARALLAX X vector wordmark from `public/brand/parallax-x-wordmark.svg`, over a blurred, darkened frame of the real app's Mars CTX terrain. |

**Excerpts from Film 05** (`sp-MA0PXF2Ej67IDvi0kpA.mp4`, 22.016 s, 1280×720 at 24 fps; sha256 `5be6681966eb3cdf…`):
- **Opening.** Source **0.50 to 2.80 s**: Mars landscape and concept rover. Shown at video 0.00 to 2.30.
- **Logo.** Source **17.10 to 20.00 s**: logo reveal. Shown at video 24.10 to 27.00. The lower part of the frame (y ≥ 655 px)
  is masked to black. This hides the film's own tagline and its "NASA SPACE APPS CHALLENGE 2026 · ULAANBAATAR" subline,
  so no NASA wordmark or text appears inside AI-generated footage.
- **Frame rate.** Both excerpts were motion-interpolated from 24 to 30 fps (FFmpeg `minterpolate`, mci) and scaled to
  1920×1080 with the letterbox intact.
- **Audio.** The film's original audio is **muted and not used**.
- **Other films.** Films 01, 02, 03 and 04 are **not used**.

**Real app scenes shown**, all live captures:
1. **Select:** MOLA region navigator, CTX Yardang Study → target locked → *Explore & compare* → camera descent.
2. **Compare:** Mars CTX DTM versus Gobi G-1 in matched-scale 3D, the analog ranking G-1 to G-5, and the "Percentile among
   1,915 declared Earth windows … Not a probability" note.
3. **Evidence:** *VALIDATION: FAILED* → *4 · Does it work?*: the pre-registered decision FAIL and the animated falsification
   bars (P1 64.6, P2 17.4, P3 85.7, pass ≥ 90).
4. **Expedition Lab:** *Plan a field experiment* → Wheel mobility protocol for G-1, the "Proposal for a future experiment. No
   field test has been performed" banner, and the NOT MEASURED list.
5. **Falsification summary:** the FAILED stamp and the *resolution paradox* bars: on the same HiRISE scarps, 13.9 % of the
   area is steeper than 15° at a 4 m baseline versus 1.6 % at 180 m. This is presented as a scale effect, not as a hazard
   probability.

**What is not shown.** The illustrative rover traverse is not shown, and no rover driving is implied. The app UI shows
the 3D rover model on the Select screen with its own credit ("Rover model: NASA/JPL-Caltech, insignia removed · not
NASA-endorsed"). See the repo's `docs/ROVER_MODEL.md`.

## 2. What is in the sound

| Element | Origin | Rights |
|---|---|---|
| **Narration (female, US English)** | **AI-generated with Kokoro-82M TTS** (`hexgrad/Kokoro-82M`, snapshot `f3ff3571`). Voice `af_heart`, `lang_code='a'`, speed 1.1, local offline inference. Spoken in 8 separate sentences. | Kokoro-82M weights: **Apache-2.0**. Python packages: `kokoro` 0.9.4 (Apache-2.0), `misaki` 0.9.4 (Apache-2.0), PyTorch 2.15 CPU (BSD/Apache), spaCy `en_core_web_sm` 3.8.0 (MIT). eSpeak NG 1.51 (GPL-3.0) and `phonemizer-fork` (GPL-3.0) are used only as production-time tools; no GPL code ships in the video. **No paid or cloud voice service was used.** |
| **Music** | **Original score composed and synthesized for this video** (`scripts/music.py`). It uses numpy/scipy additive synthesis: detuned saw-ensemble pads, an analog-style arpeggio, a sub drone, a bass pulse, bells and an algorithmic reverb. Key D minor, resolving to D major, at 96 BPM. | Original work of the PARALLAX X team, made with an AI coding assistant. **No samples, loops, stock tracks or third-party recordings.** No recognizable film themes. |
| **Sound effects** | **Synthesized** with the same script: band-pass noise whooshes, a riser, sine UI clicks and ticks, a narrow-band scan sweep, a shimmer, a soft low tone at the FAILED reveal, and a low impact. | Original; no third-party material. |
| **Concept-film audio** | **Not used** (muted). | Not applicable. |

**Mix and master:**
- **Voice.** High-pass, light presence lift and soft 3:1 compression; each sentence is leveled to equal loudness.
- **Music.** Ducked 13 dB under the voice by a side-chain envelope. During narration the voice is ≈ 14 dB above the
  music + SFX bed.
- **Master.** **−15.1 LUFS integrated**, **−1.5 dBTP true peak** (EBU R128 measurement of the encoded MP4).
- **Intelligibility check.** An automatic transcript (faster-whisper `small.en`) of the final MP4 audio matches the
  narration script word for word.

## 3. AI disclosure for this video

- **Narration.** The voice is **AI-generated speech** (Kokoro TTS). It is not a human voice actor.
- **Concept footage.** The **opening shot and the logo reveal are AI-generated concept footage** by team member Khuslen
  (V01D-404). They are watermarked and labelled on screen whenever they are visible. They are illustrative brand
  storytelling, **not software capability**. The cartoon rover in the opening is not the app's rover and is not a
  simulation.
- **App footage.** Everything between 2.3 s and 24.1 s is the real app. **The website makes no runtime AI or LLM calls.**
  Rankings are deterministic.
- **Development.** **Claude Code** (Anthropic) was the primary development assistant for the app. In this session it
  also wrote the capture, edit, music, mix and caption scripts and produced this video under the team's brief.
  **ChatGPT** (OpenAI) was used to a smaller extent for research discussion and concept refinement (see the repo's
  `docs/AI_USAGE.md`). The AI role-play "advisers" mentioned in the project are not real experts.

Suggested description text for the video upload:

> PARALLAX X compares a real Mars CTX terrain model (Medusae Fossae Formation) with 1,915 declared Earth windows. Five
> Gobi candidates (G-1 to G-5) are exploratory, not confirmed Mars analogs. Our pre-registered validation FAILED, and we
> show that. Expedition Lab turns the uncertainty into *proposed* rover field-test protocols; no field test was
> performed. Narration: AI-generated voice (Kokoro TTS). Opening and logo shots: AI-generated concept footage by
> Khuslen (V01D-404), watermarked. Music and SFX: original synthesized score. NASA Space Apps Challenge 2026 entry. Not
> affiliated with or endorsed by NASA. App: https://parallax-x-lyart.vercel.app

## 4. Data credits (data shown in the app footage)

- **Mars.**
  - CTX stereo DTM `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W`: NASA/JPL/MSSS (MRO CTX), USGS
    Astrogeology controlled DTM.
  - HiRISE DTM `DTEEC_009609_1675_010453_1675_A01`: NASA/JPL/University of Arizona (MRO HiRISE), via NASA PDS.
  - MGS MOLA 463 m global mosaic: NASA/GSFC, USGS Astrogeology. Used for the location map.
- **Earth.**
  - NASADEM_HGT v001: NASA JPL / LP DAAC (doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001).
  - Copernicus GLO-30: ESA Copernicus DEM, © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided
    under COPERNICUS by the EU and ESA. Used for the sensitivity check.
  - ESA WorldCover 2021 v200: © ESA WorldCover project 2021, CC BY 4.0.
  - Natural Earth: public domain.
- **Rover 3D model.** NASA/JPL-Caltech (NASA 3D Resources), modified to remove insignia. It is visible inside the app UI.
- **Full provenance:** the repo's `docs/DATA_SOURCES.md` and `public/data/sources.json`.

## 5. Rights status and open items (to confirm with the team)

| Item | Status |
|---|---|
| Khuslen (V01D-404) permission to **edit and publicly stream** excerpts of Film 05 in this demo | **To confirm in writing.** The repo's `docs/VISUAL_ASSETS.md` lists permission as "assumed for this team project, not verified in writing". Please record a one-line confirmation from Khuslen, for example in an issue or chat screenshot. |
| Film 05 soundtrack and voice rights | **Not needed for this video**: the original audio is muted and replaced. |
| V01D-404 repository licence | None declared. Use here relies on team-member permission, not on an open licence. |
| Kokoro voice | Apache-2.0 model; output use permitted. Disclosed as AI voice. |
| Music and SFX | Original, synthesized in this session; no third-party licence needed. |
| NASA insignia or wordmarks in AI footage | None. The film's "NASA Space Apps Challenge" subline is masked out. |
