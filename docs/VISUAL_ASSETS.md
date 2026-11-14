# Visual assets and concept films

## Concept films by Khuslen (V01D-404)

- **Originals.** The five originals live, unchanged, at **https://github.com/V01D-404/All-demo-and-loading**. That
  repository has no licence file and no README.
- **What PARALLAX X ships.** Only five small poster stills, in `public/media/films/`. Each was extracted at the time
  noted below and scaled to 960 px wide.
- **Playback.** The website streams the films from the creator's repository *only after a visitor presses play*
  (`preload="none"`). Nothing autoplays.
- **Inspection.** All five were inspected frame by frame for this release. No NASA insignia was seen.

| # | Original file | Title / role | Length · size | What it shows (verified) | AI disclosure in the file | Used in PARALLAX X | Poster |
|---|---|---|---|---|---|---|---|
| 05 | [`sp-MA0PXF2Ej67IDvi0kpA.mp4`](https://github.com/V01D-404/All-demo-and-loading/blob/main/sp-MA0PXF2Ej67IDvi0kpA.mp4) | **Brand film** (featured) | 22 s · 1280×720 · with sound | A cartoon rover on Mars, close-ups, arrival on a green Earth meadow, then the PARALLAX X logo: "Find the right Earth experiment for Mars", "NASA Space Apps Challenge 2026 · Ulaanbaatar" | Watermark "AI-GENERATED CONCEPT TRAILER" | README hero poster and link; *Watch the brand film* in the welcome intro, the Select header and the About dialog; first item of the Films & concepts gallery | `brand-film-05-poster.jpg` (t = 18.6 s) |
| 01 | [`9pI2U-Trq3OJg750Em2SOA.mp4`](https://github.com/V01D-404/All-demo-and-loading/blob/main/9pI2U-Trq3OJg750Em2SOA.mp4) | Mission concept | 29 s · 1280×720 · narrated | A narrated storyboard: Mars and Earth globes, candidate search, a split Mars/Earth terrain tile, "rover slope limit" overlays, an evidence cards end card, and "Not affiliated with or endorsed by NASA" | "AI-GENERATED VIDEO & VOICE · CONCEPT FILM" | Films & concepts gallery, labelled "AI-generated storyboard — not recorded software capability" | `mission-concept-01-poster.jpg` (t = 10.5 s) |
| 02 | [`BhQdikMpZvAtfHuSe7zAGA.mp4`](https://github.com/V01D-404/All-demo-and-loading/blob/main/BhQdikMpZvAtfHuSe7zAGA.mp4) | Boot sequence concept | 17 s · 1920×1080 · with sound | A logo reveal, a terminal-style boot log (MOLA, HiRISE, CTX, "1,915 Earth windows", "validation report"), then an earlier select screen with the retired PAX mascot | "AI-GENERATED CONCEPT INTRO" | Films & concepts gallery only. It is **not** used as a loading screen: the existing vector intro is canonical, and a 17 s clip would block the tool | `boot-concept-02-poster.jpg` (t = 9.2 s) |
| 04 | [`XMBeQxLFT_O4OuPIsVrD5w.mp4`](https://github.com/V01D-404/All-demo-and-loading/blob/main/XMBeQxLFT_O4OuPIsVrD5w.mp4) | Expedition Lab interface concept | 28 s · 1280×720 · with sound | A concept "Mission Lab" UI showing Jezero Crater, Earth candidates C1–C3, Rover A/B slope limits and an evidence panel | "CONCEPT PREVIEW · AI-GENERATED VIDEO" | Films & concepts gallery, labelled "Early AI-generated interface concept — illustrative; not the implemented research workflow". Its metrics and rover-safety features were **not** copied into the app | `expedition-lab-concept-04-poster.jpg` (t = 14.8 s) |
| 03 | [`QxKAs5cM7ujcN5VVWQ8ycg.mp4`](https://github.com/V01D-404/All-demo-and-loading/blob/main/QxKAs5cM7ujcN5VVWQ8ycg.mp4) | Character study | 12.5 s · 1280×720 · with sound | A cartoon rover: "MARS · Jezero Crater · Sol 1,247", a light-ring transition, "EARTH · 225 million km later", a forest meadow, "PAX · from Mars to Earth" | No on-screen watermark seen; PARALLAX X labels it in the UI | Films & concepts gallery, labelled "AI-generated early motion exploration" | `character-study-03-poster.jpg` (t = 1.2 s) |

All five files carry an AAC audio track: mean levels around −15 to −18 dB, peaks near 0 dB. Film 01 includes an
AI-generated voice-over.

## How they are presented
- **Labels.**
  - Every film shows an "AI-generated concept" badge, its specific label, and a "Differs from the real app" note.
  - Examples: the green Earth is not the arid Gobi; Jezero, C1–C3 and rover slope limits are not the CTX/G-1…G-5
    workflow.
  - The films are never used as evidence or as a substitute for real app footage.
- **Performance and accessibility.**
  - No autoplay; sound plays only after the user presses play.
  - Visible controls, Esc to close, and keyboard-reachable film cards.
  - Posters are lazy-loaded.
  - If streaming fails, the player falls back to a link to the original on GitHub.
- **The app's own visuals.** The official interface keeps the canonical vector logo and the NASA/JPL rover model. The
  cartoon rover is concept art only.

## Rights status (open — needs team confirmation)

| Question | Status |
|---|---|
| Khuslen authorises PARALLAX X to link, stream and show poster stills of the five films | **To confirm** (assumed for this team project, not verified in writing) |
| Generation tool(s) and their terms permit redistribution and public display | **Unknown**: tools not yet named by the creator |
| Music and sound-effect sources and licences | **Unknown**: check before any further redistribution |
| AI voice in Film 01: tool and terms | **Unknown** |
| Licence of the V01D-404 repository | None declared. Public visibility on GitHub is not a redistribution licence |

Until these are confirmed, PARALLAX X does **not** copy the film files into this repository. It links and streams the
originals, and keeps only poster stills. If the team decides otherwise, the stills can be removed and the README links
kept.

## Other visual assets
- **Logo.** PARALLAX X wordmark, mark and app icon: vector, generated from `lib/brand.ts`.
- **Rover.** The 3D rover is the NASA/JPL-Caltech Perseverance model, modified. See [`ROVER_MODEL.md`](ROVER_MODEL.md).
- **Screenshots.** Real browser captures of the production site, in `docs/screenshots/`.
- **Recordings.** Real-time screencasts of earlier builds (animated WebP), in `docs/demo/`. They show the app, not
  concept art.
