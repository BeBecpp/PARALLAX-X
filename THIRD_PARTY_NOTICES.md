# Third-party notices and licence status

PARALLAX X combines the team's original code with third-party data, models, media and software. Each keeps its own
terms. Nothing here implies endorsement by NASA, JPL, USGS, ESA or any other provider.

## Licence status
- **The team's original code** (application, science pipeline, tests and documentation) has **no open-source licence
  yet**. Licensing it (for example under MIT) needs the agreement of every contributor who owns rights in it. That
  agreement has not been confirmed, so no `LICENSE` file is included.
- **To license it, the team must:**
  1. agree on a licence;
  2. add a `LICENSE` file with the copyright line (for example `Copyright (c) 2026 PARALLAX X team`);
  3. update this section.
- **What the code licence will not cover:** the data, the rover model, the concept films or the dependencies below.

## Data
| Item | Source | Terms / credit |
|---|---|---|
| HiRISE DTM `DTEEC_009609_1675_010453_1675_A01` | NASA PDS (University of Arizona HiRISE) | NASA PDS data; credit NASA/JPL/University of Arizona |
| CTX DTM `P16_007460_1688_XI_11S182W__K17_060021_1670_XN_13S182W` | USGS Astrogeology (from NASA MRO CTX images) | CC0 per USGS listing |
| NASADEM_HGT v001 | NASA JPL / LP DAAC, doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001 | NASA data; credit NASA JPL |
| Copernicus GLO-30 | ESA / Copernicus, AWS `copernicus-dem-30m` | © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA |
| ESA WorldCover 10 m 2021 v200 | https://esa-worldcover.org (Zanaga et al. 2022, doi:10.5281/zenodo.7254221) | **CC BY 4.0**. © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. Used for land-cover *context* only; not soil or rock type |
| MGS MOLA 463 m mosaic | NASA/GSFC, USGS Astrogeology mosaic | NASA data |
| Natural Earth `ne_50m_admin_0_countries` | naturalearthdata.com | Public domain |

Details: [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## 3D model
- **Model.** "Mars 2020 Perseverance Rover", NASA/JPL-Caltech, from NASA 3D Resources. It is published "free and
  without copyright".
- **Use.** It is used under the NASA Images and Media Usage Guidelines.
- **Modifications.** The NASA insignia, the JPL logotype and the mission wordmarks were removed from its textures, and
  the textures were re-encoded.
- **Endorsement.** No NASA endorsement is implied.
- **More.** See [`docs/ROVER_MODEL.md`](docs/ROVER_MODEL.md).

## Concept films
- **What.** Five AI-generated concept films by team member Khuslen (V01D-404), at
  https://github.com/V01D-404/All-demo-and-loading. They are streamed from that repository, and only poster stills are
  stored here.
- **Rights.** The redistribution licence, the generation-tool terms and the soundtrack and voice rights are **not yet
  confirmed**. See [`docs/VISUAL_ASSETS.md`](docs/VISUAL_ASSETS.md#rights-status-open--needs-team-confirmation).

## Audio
- All interface sounds are synthesized in the browser. No recordings are used. See
  [`docs/AUDIO_CREDITS.md`](docs/AUDIO_CREDITS.md).

## Software dependencies (runtime)
| Package | Licence |
|---|---|
| next | MIT |
| react, react-dom | MIT |
| three (including the bundled Draco decoder in `public/draco/`, Apache-2.0 from Google Draco) | MIT (three.js) / Apache-2.0 (Draco) |
| Inter, Space Grotesk, JetBrains Mono (via next/font) | SIL Open Font License 1.1 |

Development-only tools (TypeScript, ESLint, Tailwind CSS, Vitest) and the Python science stack (NumPy, SciPy, rasterio,
pyproj, shapely, Pillow, pytest) are used under their own open-source licences.

## Screenshots and recordings
- The images in `docs/screenshots/` and `docs/demo/` are captures of this application.
- They contain rendered NASA, USGS and ESA data with the credits above.
