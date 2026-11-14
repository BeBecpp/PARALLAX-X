// Types mirror docs/DATA_CONTRACT.md (authoritative). Every displayed number
// comes from files of these shapes under public/data/.

export interface HeightfieldMeta {
  id: string;
  file: string;
  width: number;
  height: number;
  posting_m: number;
  extent_m: [number, number];
  z_min_m: number;
  z_max_m: number;
  encoding: string;
  valid_fraction: number;
  sha256: string;
  planet: "Mars" | "Earth";
  source_id: string;
  source_url: string;
  provider: string;
  crs: string;
  vertical_datum: string;
  terrain_description: string;
  display_note: string;
  source_posting_m?: number;
  vertical_exaggeration_default: number;
}

export interface Heightfield {
  meta: HeightfieldMeta;
  /** Heights in metres relative to z_min_m (row-major, north row first). NaN = no data. */
  heights: Float32Array;
  /** Minimum and maximum of valid relative heights. */
  minRel: number;
  maxRel: number;
}

export interface Criterion {
  id: string;
  description: string;
  value: string;
  pass: boolean;
}

export interface Feature {
  id: "F1" | "F2" | "F3" | "F4" | "F5";
  name: string;
  units: string;
  baseline_m: number;
  description: string;
}

export interface Site {
  id: string;
  name: string;
  role: "positive" | "negative";
  polygon: [number, number][];
  n_windows: number;
  median_pct_full: number | null;
  median_pct_b0: number | null;
  best_pct_full: number | null;
  citation: string;
  note?: string;
}

export interface Candidate {
  id: string;
  centroid: [number, number];
  n_windows: number;
  area_km2: number;
  best_pct: number;
  median_pct: number;
  compare_scene_id: string;
  label: string;
  best_window?: string;
}

export interface CompareScene {
  id: string;
  label: string;
  kind: "mars" | "candidate" | "positive" | "negative";
  heightfield_id: string;
  centroid: [number, number];
  pct_full: number | null;
  pct_b0: number | null;
  per_feature_w1: Record<string, number> | null;
  site_id?: string;
  /** Per-feature medians over the scene window in raw units (see features[].units). */
  median_raw?: Record<string, number> | null;
  /** Public path to a hillshade thumbnail (webp) of the scene heightfield. */
  thumb?: string | null;
}

export interface BreakdownItem {
  id: string;
  title: string;
  text: string;
  source: string | null;
}

export interface Results {
  run: {
    prereg_commit: string;
    prereg_file_sha256: string;
    run_utc: string;
    parameters: Record<string, number | string>;
    status: "complete" | "partial";
    caveats: string[];
    code_commit?: string;
    exported_utc?: string;
  };
  decision: { pass: boolean; summary: string; criteria: Criterion[]; mean_pos_full?: number; mean_pos_b0?: number };
  features: Feature[];
  null_set: { n_windows: number; by_domain: Record<string, number> };
  sites: Site[];
  candidates: Candidate[];
  compare_scenes: CompareScene[];
  windows: { id: string; domain: string; lon: number; lat: number; pct: number; pct_b0: number; label: string }[];
  hirise: {
    short_wavelength_variance_fraction_lt150m: number;
    frac_area_slope_gt15_baseline_4m: number;
    frac_area_slope_gt30_baseline_4m: number;
    frac_area_slope_gt15_baseline_180m: number;
    frac_area_slope_gt30_baseline_180m: number;
    note: string;
  };
  spectra?: unknown;
  breakdown: BreakdownItem[];
  /** Filled later by the pipeline; null/absent = pending. Shape is tolerant-rendered. */
  sensitivity_6km?: RobustnessCheck | null;
  glo30_check?: RobustnessCheck | null;
  /** Post-hoc, descriptive only. */
  diagnostics?: Diagnostics | null;
  n_clusters_total?: number;
  /** Mars fingerprint summary (centre, per-feature sample counts and medians in raw units). */
  mars?: MarsSummary | null;
}

export interface MarsSummary {
  centre_lonlat: [number, number];
  n_samples?: Record<string, number>;
  median_raw?: Record<string, number>;
}

export interface DiagnosticGroup {
  group: string;
  n: number;
  median_pct?: number | null;
  /** Per-feature medians in raw units (see features[].units). */
  median_raw?: Record<string, number>;
  /** Per-feature median W1 distance to Mars in normalized (ECDF) units. */
  median_w1?: Record<string, number>;
}

export interface RidgeSpectrum {
  segments?: number;
  segment_length_m?: number;
  compensated_peak_wavelengths_m?: number[];
  ew_variance_fraction_lt300m?: number;
  ew_variance_fraction_lt150m?: number;
  /** Fraction of gradient retained by the F2 operator at a given ridge wavelength (m, as string key). */
  f2_gradient_attenuation_at?: Record<string, number>;
  spectrum?: { wavelength_m: number[]; power_k2: number[] };
}

export interface Diagnostics {
  status?: string;
  groups?: DiagnosticGroup[];
  ctx_ridge_spectrum?: RidgeSpectrum | null;
}

export interface RobustnessCheck {
  pass?: boolean;
  decision_pass?: boolean;
  criteria?: { id: string; description: string; value: string; pass: boolean }[];
  spearman_rank_corr_with_nasadem?: number | null;
  window_km?: number;
  dem?: string;
  status?: string;
  n_common_windows?: number;
  decision?: { pass?: boolean; summary?: string };
  summary?: string;
  sites?: { id?: string; name?: string; median_pct_full?: number | null; median_pct?: number | null }[] | Record<string, number | null>;
  [k: string]: unknown;
}

export interface SourceRecord {
  id: string;
  planet: string;
  provider: string;
  product_id: string;
  url: string;
  licence: string;
  posting_m: number | string | null;
  effective_resolution_note: string;
  crs: string;
  vertical_datum: string;
  nodata: number | string | null;
  valid_fraction: number | null;
  retrieved_utc: string;
  usage: string;
  resources_tab_route?: string;
  mirror_url?: string;
}

export interface LocatorFootprint {
  id: string;
  label: string;
  kind: "fingerprint" | "hirise" | "ctx";
  polygon: [number, number][];
}

export interface Locator {
  image: string;
  lon_min: number;
  lon_max: number;
  lat_min: number;
  lat_max: number;
  /** pixel size of the locator image */
  width: number;
  height: number;
  footprints: LocatorFootprint[];
  source: string;
}
