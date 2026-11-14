# Data contract — science pipeline → web app

The pipeline in `science/` writes all files under `public/data/`. **The web app must read every displayed number from these files.** No scientific value may be hard-coded in UI components.

## Heightfields — `public/data/terrain/<id>.bin` + `<id>.json`
```ts
interface HeightfieldMeta {
  id: string;
  file: string;              // e.g. "/data/terrain/mars_hirise_hero.bin"
  width: number; height: number;   // grid cells
  posting_m: number;         // ground spacing of the displayed grid (m)
  extent_m: [number, number];// [x, y] physical size in metres
  z_min_m: number; z_max_m: number;
  encoding: string;          // uint16 LE, row-major, north row first; 0 = no data;
                             // z = z_min_m + (v-1)/65534*(z_max_m-z_min_m)
  valid_fraction: number;
  sha256: string;
  planet: "Mars" | "Earth";
  source_id: string; source_url: string; provider: string;
  crs: string; vertical_datum: string;
  terrain_description: string;
  display_note: string;
  source_posting_m?: number;
  vertical_exaggeration_default: number;
}
```
Known ids:
- `mars_hirise_hero`: about 4 m display grid of a 4 km HiRISE crop.
- `mars_hirise_hero_30m`: the same crop, really aggregated to about 30 m.
- `cmp_*`: 10 km comparison windows at 30 m. They are listed in `results.json` under `compare_scenes`, and all share the same extent.

## `public/data/results.json`
```ts
interface Results {
  run: { prereg_commit: string; prereg_file_sha256: string; run_utc: string;
         parameters: Record<string, number | string>; status: "complete" | "partial";
         caveats: string[] };
  decision: { pass: boolean; summary: string;
              criteria: { id: string; description: string; value: string; pass: boolean }[] };
  features: { id: "F1"|"F2"|"F3"|"F4"|"F5"; name: string; units: string; baseline_m: number; description: string }[];
  null_set: { n_windows: number; by_domain: Record<string, number> };
  sites: { id: string; name: string; role: "positive" | "negative"; polygon: [number, number][];
           n_windows: number; median_pct_full: number | null; median_pct_b0: number | null;
           best_pct_full: number | null; citation: string; note?: string }[];
  candidates: { id: string; centroid: [number, number] /* lon,lat */; n_windows: number; area_km2: number;
                best_pct: number; median_pct: number; compare_scene_id: string; label: string }[];
  compare_scenes: { id: string; label: string; kind: "mars" | "candidate" | "positive" | "negative";
                    heightfield_id: string; centroid: [number, number]; pct_full: number | null; pct_b0: number | null;
                    per_feature_w1: Record<string, number> | null; site_id?: string }[];
  windows: { id: string; domain: string; lon: number; lat: number; pct: number; pct_b0: number; label: string }[];
  hirise: { short_wavelength_variance_fraction_lt150m: number;
            frac_area_slope_gt15_baseline_4m: number; frac_area_slope_gt30_baseline_4m: number;
            frac_area_slope_gt15_baseline_180m: number; frac_area_slope_gt30_baseline_180m: number;
            note: string };
  spectra?: unknown;
  breakdown: { id: string; title: string; text: string; source: string | null }[];
}
```
Percentiles: higher = more similar to the Mars fingerprint, relative to the null set of Earth windows. **A percentile is not a probability and not a "% match".**

## `public/data/sources.json`
An array of `SourceRecord` objects: id, planet, provider, product_id, url, licence, posting_m, effective_resolution_note, crs, vertical_datum, nodata, valid_fraction, retrieved_utc, usage, resources_tab_route.

## `public/data/locator.json` + `public/data/mola_locator.png`
A real MOLA shaded-relief crop in equirectangular projection. `locator.json` gives:
```ts
{ image: string; lon_min: number; lon_max: number; lat_min: number; lat_max: number;  // degrees east 0-360
  footprints: { id: string; label: string; kind: "fingerprint" | "hirise" | "ctx"; polygon: [number, number][] }[];
  source: string }
```

## `public/data/fieldtest.json` (post-hoc, descriptive)
- **Producer.** `science/pipeline/fieldtest_posthoc.py`. The run is logged in `science/DEVIATIONS.md`.
- **What it never feeds.** Any rank or the decision.
- **Fields:**
  - `status`: always declares "POST-HOC DESCRIPTIVE".
  - `roughness`:
    - the definition, units (m), grid (30 m), neighbourhoods (330 / 990 m), edge handling and limitations;
    - `scenes[compare_scene_id]` and `candidate_clusters[G-n]`, each `{ "330m" | "990m": { n, median_m, p90_m } }`.
  - `worldcover`:
    - the product, year, licence, attribution, citation, accuracy, legend, method and caveat;
    - `candidates[G-n] = { compare_scene_id, footprint { n_windows, area_km2, bbox, windows[] }, cluster { tiles, fractions, nodata_fraction }, best_window { id, tiles, fractions, nodata_fraction } }`.

Consumers: the Expedition Lab (`lib/expedition.ts`) and the "Why investigate this location?" dossier. If the file is
missing, the lab still works and simply omits the derived and contextual rows.

