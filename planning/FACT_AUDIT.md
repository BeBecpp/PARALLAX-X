# FACT_AUDIT — PARALLAX X (Stage 0, read-only)

All checks were made on 2026-11-14 (UTC+8). Sources were read in the built-in browser, and GitHub through the read-only API. The data and prior-art rows are filled in from the separate research passes (see `DATA_FEASIBILITY_MATRIX.md` and `ADVISORY_REVIEWS.md` §prior art).
Status labels: **CONFIRMED / ASSUMED / UNVERIFIED / CONTRADICTORY / BLOCKED**.

## A. Challenge text

| Claim | Status | Source | Implication |
|---|---|---|---|
| The task is to "identify and characterize **new** terrestrial analogs … present findings as a map, visualization, or other tool" | CONFIRMED | https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/ | The output must be Earth places plus characterization |
| The brief says "not simply to rediscover well-known analog sites"; "Look beyond … Antarctica, Atacama, Iceland, Hawaii"; "Surprise us" | CONFIRMED | same | A hand-picked list of famous sites works **against** the brief. A systematic search and/or an under-studied candidate is rewarded |
| Objectives include explaining **where the analogy breaks down** | CONFIRMED | same | "Breaks down" is an explicit deliverable, so it gets a first-class UI section |
| The considerations list 8 dimensions, terrain/slope/roughness among them, and say "scale: a single crater or valley can be the analog" | CONFIRMED | same | Terrain-only scope is legitimate if declared; scale is explicitly invited |
| Moon and Mars are weighted equally in the text ("or both") | CONFIRMED | same | Mars-only is a valid scoping choice |
| "More resources may be added" | CONFIRMED | same | Re-check the Resources tab before submission |

## B. Resources tab (verbatim list, 5 NASA + 6 partner)

NASA: **Earthdata Search** (search.earthdata.nasa.gov), **Worldview**, **Planetary Data System (PDS)** (pds.nasa.gov), **LRO** (pds-geosciences.wustl.edu/missions/lro/), **LRO Diviner**.
Partner: CSA RCM, CSA RADARSAT-1, CSA SAR Python tutorial, **ESA Copernicus Data Space Ecosystem**, ESA Open Science Catalog, JAXA G-Portal.

| Claim | Status | Implication |
|---|---|---|
| No Mars dataset is named. Mars enters only through generic **PDS** | CONFIRMED | HiRISE DTMs are PDS-archived, which satisfies the rule if we cite the PDS product (verify the PDS volume path per product) |
| Earth NASA DEMs (NASADEM, ASTER GDEM) are discoverable via **Earthdata Search** | ASSUMED (standard LP DAAC collections; confirm the product appears in Earthdata Search) | Two independent NASA Resources-tab routes, one Mars and one Earth: strong compliance |
| Copernicus DEM is distributed via the Copernicus Data Space Ecosystem (a partner resource) | ASSUMED, verify the product listing | Partner data counts as "encouraged", not as the NASA requirement |

## C. Official rules (GO Team / guides)

| Claim | Status | Source | Implication |
|---|---|---|---|
| Global Awards need at least 1 NASA source **from this challenge's Resources** | CONFIRMED | github.com/nasa/spaceapps/discussions/1827, /1849 | PDS (Mars) + Earthdata (Earth) |
| Cite all data, code, images and tools | CONFIRMED | #1827, Project Submission Guide | Keep a running reference list from hour 0 |
| AI-generated images/video need a **visible watermark**. AI code/data/audio is acknowledged in text and metadata. No NASA logos, flags or mission identifiers in AI content | CONFIRMED | #1849, https://www.spaceappschallenge.org/resources/project-submission-guide/ | Brand boards and PAX art need a watermark if used publicly. Better to use real app footage |
| AI "should not be used to come up with your idea"; the AI form field is not shown to judges | CONFIRMED | Submission Guide | **The team must own the thesis choice.** This plan is decision support; Nero and the team decide and must be able to defend the idea themselves |
| Demo is a video of **≤30 s** or **≤7 slides**, or the project is ineligible for Global Judging | CONFIRMED | Submission Guide; Judging Guide | Hard limit |
| Links must be public with no login. English is required everywhere (subtitles OK) | CONFIRMED | Submission Guide | Disable Vercel Deployment Protection; English captions |
| No image, video, audio or likeness of anyone under 18 | CONFIRMED | Submission Guide | Screen recording with captions, no faces or voices of minors |
| Form fields: Name, High-Level Summary, Demo link, Final Project link, Detailed Description, Use of SI, NASA Data, Partner Data & References, T&C, originality checkbox | CONFIRMED | Submission Guide; #1858 | — |
| Teams of ≤6. Criteria are Impact, Creativity, Validity, Relevance, Presentation, each scored 1–5 | CONFIRMED | Judging & Awards Guide | — |
| #1973 (30 s / 7 slides) was answered by a participant, not the GO Team | CONTRADICTORY as a source | #1973 | Rely on the official Submission Guide, which says the same |
| Work before the start beyond research risks disqualification (GO Team, Nov 13) | CONFIRMED | #2057 | Planning docs = research. Keep code after the start |

## D. Ulaanbaatar logistics (all times UTC+8)

| Claim | Status | Source | Implication |
|---|---|---|---|
| Development from Nov 14 09:00 | **CONTRADICTORY** | NASA project tab opens at 09:00 local; the local site /schedule says "16:00 official hackathon work begins"; the user-reported organizer Discord says 09:00 | Get **written confirmation** from the Local Lead (hello@spaceappsulaanbaatar.com) or Discord before relying on pre-16:00 code |
| Local hand-in | CONFIRMED in substance: "**by 19:30** Sun 15 Nov"; 18:30–19:30 is listed as final prep | nasa-space-apps-ulaanbaatar.vercel.app/judging, /faq, /schedule | Treat **18:30 as our internal freeze** and 19:30 as the hard deadline. The hand-in method is unpublished, so ask |
| Judging 19:30–20:30 | Time CONFIRMED; Zoom UNVERIFIED | /schedule | Ask about the format and per-team minutes |
| Awards 21:00–21:30; NASA final 23:59 | CONFIRMED | /schedule; official local event tab | The NASA page can still be edited after local judging, until 23:59 |
| Local judges: 2 (a teacher and a professor); top 3 become Global Nominees | CONFIRMED | /judging | The audience is educated generalists: clarity over jargon |

## E. Repository

| Claim | Status | Implication |
|---|---|---|
| `BeBecpp/PARALLAX-X` is public and empty, default branch `main`, created 2026-11-14 10:18 UTC+8 | CONFIRMED (api.github.com) | No writes made. The creation time is after the NASA 09:00 start |

## F. Platform

| Claim | Status | Source | Implication |
|---|---|---|---|
| Vercel Hobby functions: 2 GB / 1 vCPU, 300 s max, **4.5 MB** body limit | CONFIRMED | vercel.com/docs/functions/limitations | No raster work in functions |
| Hobby CLI upload of **100 MB** source/static; 100 deploys/day; 100 GB Fast Data Transfer/month | CONFIRMED | vercel.com/docs/limits | Static terrain assets must stay well under 100 MB total. Target ≤30 MB |
| Claude Haiku 5.5: $0.10 / $0.50 per MTok (≤100K prompt); Sonnet 5.5: $2 / $10 | CONFIRMED | platform.claude.com pricing | An optional explainer costs cents. Still optional |

## Three most consequential discoveries

1. **The brief penalises famous-site picking and asks "where the analogy breaks down".** The thesis needs a *discovery method* and an explicit dissimilarity section, not a gallery of Atacama/Utah.
2. **Mars data qualifies only through PDS.** HiRISE DTMs (PDS-archived) plus NASADEM/ASTER via Earthdata Search give two NASA Resources-tab routes. Cite exact PDS product paths.
3. **The local timing conflicts and the hand-in is "by 19:30".** Confirm the start time and hand-in method with the Local Lead now. Plan the internal freeze for 18:30.
