# PARALLAX X demo V2 (rover-first): credits, rights and AI disclosure

**File:** `PARALLAX_X_SPACE_APPS_2026_DEMO_V2_ROVER.mp4` (29.300 s, 1920×1080, 30 fps)
**Project:** NASA Space Apps Challenge 2026 entry (Ulaanbaatar). It uses NASA, USGS and ESA data.
**It is not affiliated with or endorsed by NASA.**
**App:** https://parallax-x-lyart.vercel.app · **Code:** https://github.com/BeBecpp/PARALLAX-X

## Picture

| Source | Video time | Notes |
|---|---|---|
| **Real PARALLAX X screen capture** | 2.00–25.00 s (78 %) | Live site in Chromium, deterministic 30 fps. Nothing is generated or mocked; only crops, slow zooms and text overlays were added. |
| └ Rover act | 10.70–18.50 s | The app's **illustrative terrain-following visualization** on the separate **HiRISE** Mars scene (`DTEEC_009609_1675_010453_1675_A01`). The rover is enlarged for visibility. It is **not a mobility-physics simulation**, **not at a Gobi site**, and **not a field test**. This is labelled on screen throughout. The 3D rover model is NASA/JPL-Caltech (NASA 3D Resources), modified to remove insignia, and is not NASA-endorsed. |
| **AI-generated concept film 05** by **Khuslen (V01D-404)** | Open: 0.00–2.00 s (source 0.50–2.50 s). Logo: 25.00–27.10 s (source 17.20–19.30 s). | The original "AI-GENERATED CONCEPT TRAILER" watermark is kept, plus the on-screen notice "AI-GENERATED CONCEPT FOOTAGE · BRAND FILM BY KHUSLEN (V01D-404)". The original audio is muted. The film's NASA Space Apps subline is masked out. The cartoon rover in the opening is concept art, not the app. |
| End card | 27.10–29.30 s | Canonical vector wordmark over a blurred real app terrain frame |

## Sound

| Element | Origin |
|---|---|
| Narration | **AI-generated voice**: Kokoro-82M TTS (Apache-2.0), voice `af_heart`, local offline inference. No human voice and no paid voice service. |
| Music | Original score synthesized in code for this video (`scripts/music_v2.py`). No samples, stock music or film themes. |
| SFX | Original synthesized design: impacts, whooshes, scan sweeps, and a motor hum, terrain grains and servo whirs that accompany the rover's on-screen motion. **These are not recordings of Mars or of any real rover, and not telemetry.** |
| Film 05 audio | Not used |

**Mix:** −14.6 LUFS integrated, true peak −1.3 dBTP measured in the encoded MP4. The ASR transcript of the final mix matches the script.
**Listening:** the mix was **not auditioned by ear** in this session, which has no audio output. Please listen before
submitting.

## Scientific accuracy notes (the promo's emphasis changed; the science did not)

- **Candidates.** The Gobi windows G-1…G-5 are **exploratory morphometric candidates, not confirmed geological
  analogs**. This is shown on screen.
- **Validation.** **The pre-registered validation of the terrain-fingerprint screening did not pass.** This short
  promo does not feature that result, but it does not hide or contradict it either. It is stated in the video metadata
  and in the suggested description below, and in full in the app's Evidence view and the repository docs
  (`docs/LIMITATIONS.md`, `science/prereg.md`).
- **Expedition Lab.** It outputs **proposed** protocols. **No field test has been performed.** This is shown on screen.

## AI use

- Narration: Kokoro TTS (AI voice).
- Concept footage: Khuslen's AI-generated film 05, watermarked.
- App development: Claude Code (Anthropic) was the primary assistant. It also produced this edit, capture, score and
  mix under the team's brief.
- ChatGPT was used to a smaller extent for research and concept discussion.
- The website itself makes no runtime AI calls.

## Suggested upload description

> PARALLAX X compares a real Mars CTX terrain model (Medusae Fossae Formation) with 1,915 declared Earth windows and
> surfaces five exploratory Gobi candidates (not confirmed analogs; the pre-registered validation of the screening did
> not pass — see the app's Evidence view). The rover shown is the app's illustrative terrain-following visualization
> on a separate HiRISE Mars scene, not a mobility-physics simulation. Expedition Lab turns candidates into *proposed*
> rover field-test protocols; no field test has been performed. Narration: AI-generated voice (Kokoro TTS). Opening
> and logo shots: AI-generated concept footage by Khuslen (V01D-404). Original synthesized music and SFX. 3D rover
> model: NASA/JPL-Caltech. NASA Space Apps Challenge 2026 entry; not affiliated with or endorsed by NASA.
> https://parallax-x-lyart.vercel.app

## Open item

- **Khuslen's written permission.** It still needs to be recorded, as for V1 (see the repo's `docs/VISUAL_ASSETS.md`).
