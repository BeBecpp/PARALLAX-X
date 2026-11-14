# DEPLOYMENT_DECISION

## Decision: Option A — a static Next.js site on Vercel, Three.js in the browser, offline Python preprocessing. No API route in the core.

```
NASA PDS (HiRISE) ─┐   USGS S3 (CTX COG) ─┐   LP DAAC/Earthdata (NASADEM) ─┐   Copernicus S3 (GLO-30 COG, cross-check)
                   ▼                      ▼                                ▼
        OFFLINE on Nero's laptop (Python CPU: GDAL/rasterio, numpy, scipy, pyproj)
        ingest → mask → local metric reprojection → detrend → spectral matching → features
        → window search, controls, null, perturbations → clusters → heightfields + JSON
                   ▼
        STATIC ARTIFACTS in /public (≤ 30 MB in total; first load ≤ 10 MB)
        heightfields: Uint16 .bin + JSON {extent_m, z_scale, z_offset, posting, eff_res}
        results.json (candidates, recall, controls), sources.json, explanations.json (templated)
        locator image (MOLA, downsampled); static fallback hillshades (WebP)
                   ▼
        VERCEL (static hosting, Hobby, public production domain)
                   ▼
        BROWSER: plain three.js, a single WebGL renderer with scissor viewports;
        UI state and scale-lens logic from precomputed tables
```

## The six required answers
1. **What does Vercel execute?** Nothing dynamic. It serves the static build and assets from its CDN.
2. **What does the browser execute?** Mesh generation from heightfields, rendering, camera, UI state, the eligibility logic for the scale lens, and the fps probe that switches to the fallback.
3. **Which offline tasks need Python?** All raster work: ingest, masks, reprojection, matching, features, the search, controls, the null, stability runs, export, and the templated text.
4. **What fails if Claude is down?** Nothing. Claude is not in the core.
5. **Where are the data files?** In `/public` inside the repo, kept small. Raw NASA/USGS data is **not** committed (the GitHub 100 MiB per-file limit applies). The pipeline scripts plus SourceRecords make the assets reproducible.
6. **What does the weakest device get?** If fps < 20, on mobile, or on WebGL failure: a static hillshade pair, the results table, the drawer and an MP4 turntable rendered from the same data.

## Why not B or C
- **B (object storage/CDN)** is only needed if assets exceed about 100 MB. The budget is ≤ 30 MB, so B would add credentials and CORS setup for no gain.
- **C (Python API service)** has no dynamic requirement. Every result is precomputable for a fixed ROI catalogue, so C would only add cold starts and failure surface.

## Vercel facts that matter (verified 2026-11-14)
- Hobby functions: 2 GB / 1 vCPU, 300 s, **4.5 MB body limit**. Irrelevant here, because the core has no functions.
- CLI upload limit is 100 MB on Hobby. Git-based deploys are subject to GitHub limits.
- 100 GB/month Fast Data Transfer, which is ample for judging.
- **Deployment Protection:** share only the production domain. Check it in incognito.
- Client-side WebGL uses the visitor's GPU, not Vercel's resources. Vercel cannot make the 3D smooth; asset size and draw calls do.

## Engineering rules
- **Library:** plain three.js, plus a small UI layer in Next.js/React. Use react-three-fiber only if Nero is already fluent in it.
- **Rendering:**
  - DPR ≤ 1.5; no shadows; no post-processing.
  - 512² display meshes, up to 1024² for the hero.
  - Dispose geometries on transitions.
- **Assets:**
  - Uint16 little-endian binaries with scale and offset. Don't rely on browser 16-bit PNG decoding.
  - Lowercase file paths, to avoid 404s on Vercel's case-sensitive Linux.
- **Backups:** a local `next build && next start` copy on the presenting laptop, plus the 30 s video file stored locally.

## Optional stretch (only after freeze, only with approval)
A Claude explainer means dropping static export and adding one server route. The API key lives in a Vercel environment variable. The input is a strict JSON evidence payload. Prompt rules: no new numbers or geology; cite only the sources in the payload. Rate-capped, and it falls back to the deterministic text on any error. Model: Haiku 5.5 is cheapest (about $0.10/$0.50 per MTok). Disclose it in "AI use".
