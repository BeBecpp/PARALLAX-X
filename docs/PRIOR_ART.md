# Prior art and credit

These are public projects and resources we inspected on 2026-11-14 for the same NASA Space Apps 2026 challenge, plus closely related work. Several already do things PARALLAX X also does. **We do not claim to be first** at terrain matching, regional search, scoring, controls or 3D.

| Project / resource | What it already does | What we build on or differ in |
|---|---|---|
| **Terrestrial Analog Finder** (shishir-kuet), https://github.com/shishir-kuet/terrestrial-analog-finder | CTX ~20 m DTMs + Copernicus GLO-30 on a shared 30 m grid in 12 km windows; relief, slope percentiles, roughness, hypsometric integral; Wasserstein slope-histogram distances; sensitivity to weights, resolution and window size | The closest prior work. Our window search and W1 distances follow the same idea. We add a pre-registered decision rule with held-out published analogs, process-different negatives and a slope-only baseline; HiRISE-derived terrain; and paired 3D at a common scale |
| **TerraNova** (Yakiyo), https://github.com/Yakiyo/terra-nova | Global 0.5° Earth screening; ROC-AUC with negative controls; Monte Carlo robustness; real-DEM Three.js 3D (Earth side); traverse tool | Global screening and validation statistics predate us. We work at a much finer scale (30 m) against a real Mars DTM |
| **EarthTwin** (es-ratt), https://github.com/es-ratt/earthtwin | Matched 200 m grids from MOLA-HRSC and LOLA; curated sites; mission weights; "why not others"; missing-data disclosure | Missing-data honesty and matched grids predate us |
| **PTAE** (JFJubayer), https://github.com/JFJubayer/nasa-space-apps-2026-ptae | Multi-baseline differential slope (after Kreslavsky & Head); negative controls with AUC; random-weight robustness | Negative controls and multi-baseline slope predate us |
| **Analog Atlas** (itsak7m), **MissionMatch/ELSEWHERE** (Alaa-Alyy), **Planetary Analog Finder** (DipuHowlader) | Cesium globes, km-scale fingerprints, climate-based scoring | Different scales and approaches |
| **NASA Planetary Analog Explorer**, https://science.nasa.gov/solar-system/analog-explorer/ | Curated Earth–planet image pairs | Educational comparison; no terrain metrics |
| Kreslavsky & Head 2000, *JGR* 105(E11):26695, doi:10.1029/2000JE001259 | Kilometre-scale roughness and differential slope on Mars | The concept behind our baseline-explicit slopes. Our F2/F3 are central-difference gradient magnitudes, **not** their exact estimator |
| Foucher et al. 2021, *PSS* 197:105162, doi:10.1016/j.pss.2021.105162 | "Functional analogs": suitability depends on the objective | Basis for our scale lens |

### Other 2026 projects reviewed for positioning
We reviewed these only for positioning. No code, data contracts, branding or scoring methods were reused.

| Project | Note |
|---|---|
| **Nazeer** (omarmohamed456), https://github.com/omarmohamed456/Nazeer | Broad geology-class matching |
| **Analog Atlas** (itsak7m), https://github.com/itsak7m/analog-atlas | Listed above |
| **AnalogAtlas** (FionaL7), https://github.com/FionaL7/AnalogAtlas | Reviewed for positioning |
| **terra-nova** (Yakiyo), https://github.com/Yakiyo/terra-nova | Reviewed for positioning |

We do not claim to be the first team to match planetary analogs, use 3D terrain or suggest field experiments.

## What we think is distinctive

This is a combination, not a single new invention:
1. A **pre-registered** search, committed before any distance was computed, with a stated pass/fail rule.
2. Held-out published yardang sites as positives, process-different look-alikes as negatives, and a slope-only baseline. **The outcome is reported whether it passes or fails.**
3. Real **HiRISE (NASA PDS)** terrain used to *measure* what a 30 m grid cannot see.
4. Mars and Earth 3D shown at the same scale and resolution, and an explicit **scale-evaluability** lens.

Among the public 2026 repositories we inspected, none combined all four. That is a statement about what we inspected, not a novelty claim.

The newer addition, deterministic field-test protocols with explicit "not measured" states (Expedition Lab), is also a combination of known practices, not an invention claim.
