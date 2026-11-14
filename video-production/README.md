# PARALLAX X: 29-second Space Apps demo video (production workspace)

This folder is separate from the web app. Nothing in the app was changed.

## V3: real rover + cinematic science (current)

| File | What it is |
|---|---|
| `PARALLAX_X_SPACE_APPS_2026_DEMO_V3_SCIENCE.mp4` | **V3 video**: 29.300 s, 1920×1080, 30 fps, H.264 + AAC, faststart |
| `PARALLAX_X_THEORY_BEHIND_THE_DEMO.md` | **Technical companion for judges**: data, F1–F5, ECDF, Wasserstein-1, validation (FAILED), rover animation logic, field-test formulas, stack, citations, timestamp links |
| `PARALLAX_X_DEMO_V3_CAPTIONS.srt` | V3 English captions (also burned in) |
| `PARALLAX_X_DEMO_V3_NARRATION_KOKORO.wav` | V3 raw Kokoro narration (`af_heart`), 24 kHz |
| `PARALLAX_X_DEMO_V3_AUDIO_MIX.wav` | V3 master: 48 kHz / 24-bit |
| `PARALLAX_X_DEMO_V3_EDIT_NOTES.md` | Timestamped shot list, captures, audio, rebuild, verification |
| `PARALLAX_X_DEMO_V3_CREDITS_AND_AI_DISCLOSURE.md` | Credits, AI disclosure, science notes, suggested description |
| `PARALLAX_X_DEMO_V3_FRAME_MONTAGE.jpg` | V3 frames, one per second |

To rebuild V3:

```bash
python3 scripts/make_timeline_v3.py
.venv-tts/bin/python scripts/music_v2.py timeline_v3.json
.venv-tts/bin/python scripts/mix_v2.py timeline_v3.json
./scripts/encode_v3.sh
```

## V2: rover-first revision (kept for comparison)

| File | What it is |
|---|---|
| `PARALLAX_X_SPACE_APPS_2026_DEMO_V2_ROVER.mp4` | **V2 video**: 29.300 s, 1920×1080, 30 fps, H.264 + AAC, faststart. Rover-first, with 7.8 s of real-app rover footage. |
| `PARALLAX_X_DEMO_V2_CAPTIONS.srt` | V2 English captions (also burned in) |
| `PARALLAX_X_DEMO_V2_NARRATION_KOKORO.wav` | V2 raw Kokoro narration (`af_heart`), 24 kHz, unprocessed |
| `PARALLAX_X_DEMO_V2_AUDIO_MIX.wav` | V2 master: 48 kHz / 24-bit, −14.6 LUFS, ≤ −1.3 dBTP after AAC |
| `PARALLAX_X_DEMO_V2_EDIT_NOTES.md` | V2 shot list, rover capture method, audio, rebuild steps |
| `PARALLAX_X_DEMO_V2_CREDITS_AND_AI_DISCLOSURE.md` | V2 credits, AI disclosure, science notes, suggested description |
| `PARALLAX_X_DEMO_V2_FRAME_MONTAGE.jpg` | V2 frames, one per second |
| `PARALLAX_X_DEMO_V1_vs_V2_MONTAGE.jpg` | V1 vs V2, every 2 s, side by side |

To rebuild V2:

```bash
python3 scripts/make_timeline_v2.py
.venv-tts/bin/python scripts/music_v2.py timeline_v2.json
.venv-tts/bin/python scripts/mix_v2.py timeline_v2.json
./scripts/encode_v2.sh
```

The rover footage is captured with `scripts/capture_rover.js`.

## V1 deliverables (`out/`, kept for comparison)

| File | What it is |
|---|---|
| `PARALLAX_X_SPACE_APPS_2026_DEMO_FINAL.mp4` | The finished video: 29.300 s, 1920×1080, 30 fps, H.264 + AAC, faststart |
| `PARALLAX_X_DEMO_CAPTIONS.srt` | English captions (also burned into the video) |
| `PARALLAX_X_DEMO_NARRATION_KOKORO.wav` | Raw Kokoro TTS narration (female, `af_heart`), 24 kHz, unprocessed, on the timeline |
| `PARALLAX_X_DEMO_AUDIO_MIX.wav` | Final mastered mix: 48 kHz / 24-bit, −15 LUFS, −1.5 dBTP |
| `PARALLAX_X_DEMO_CREDITS_AND_AI_DISCLOSURE.md` | Credits, rights, AI disclosure and data credits |
| `PARALLAX_X_DEMO_EDIT_NOTES.md` | Shot list, exact source timestamps, pipeline and rebuild steps |
| `PARALLAX_X_DEMO_FRAME_MONTAGE.jpg` | One frame per second |

## Rebuild

To rebuild from source, see `out/PARALLAX_X_DEMO_EDIT_NOTES.md`. The scripts are in `scripts/` and the edit decision
list is `timeline.json`.
