# Audio credits

**Every sound in PARALLAX X is synthesized live in the browser with the Web Audio API** (`lib/audio.ts`).
No audio files are downloaded, hosted or hotlinked, and no third-party or commercial recordings are used,
so there is nothing to license or attribute.

| Cue | When it plays | How it is made |
|---|---|---|
| Click / tick | UI selection, scrubbing | short sine + triangle blips |
| Select | choosing a Mars scene | two-tone sine (660 → 990 Hz) |
| Mission start-up | "Begin descent" / guided demo | 55 → 110 Hz sine swell, soft fifth shimmer, band-passed noise breath |
| Descent whoosh | arrival zoom, moving to Compare | band-pass-swept white noise with a stereo pan + low sine drop |
| Terrain scan | 3D terrain ready | narrow band-pass noise sweep + three square-wave clicks |
| Earth reveal chime | an Earth window finishes loading | detuned sine partials (880 / 1320 / 1762 Hz) |
| Evidence reveal | opening analysis panels | two triangle notes |
| Neutral acknowledgement | the FAILED validation is shown | low, non-rising triangle + sine (196 / 147 Hz) — deliberately not a fanfare |
| Rover motor loop | while PAX is actually moving in Simulate | low-passed 46 Hz sawtooth with 7.5 Hz amplitude wobble, 182 Hz whine, band-passed grit |
| Wind bed (optional, off by default) | Settings → "Wind bed" | looping brown noise, low-pass ~420 Hz with slow LFOs |

**None of these sounds is a recording from Mars, from Perseverance, or from any of our study sites.**
The rover motor loop is not a recording of PAX or of any real rover.

## Behaviour
- **Off by default; no autoplay.** Nothing plays until the user presses **Enable sound** (or **M**). Browsers also block
  audio before a user gesture.
- **Global mute:** the header speaker button or the **M** key. **Volume** and the **wind bed** are in the sound menu.
- The on/off choice, volume and wind-bed setting are stored in `localStorage` (`parallax-x-audio`). A remembered "on" is
  only re-applied after the user's next click.
- If Web Audio is unavailable or fails, the sound control hides or shows an error, and the app keeps working silently.
- For Zoom presentations, share the browser tab **with audio** after pressing Enable sound. With sound off, the app is a
  silent presentation.

## Not used (considered)
- Mixkit / Freesound packs: not needed, so no third-party license applies.
- NASA Perseverance SuperCam Mars audio: not included. If it is ever added, it must be labelled as archival audio recorded by
  Perseverance in Jezero crater, not at Medusae Fossae, with NASA media-usage credit.
