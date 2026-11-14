import type { Locator, Results, SourceRecord } from "./types";

export type Loadable<T> =
  | { status: "loading" }
  | { status: "missing" } // file not published yet (404) — show honest empty state
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

async function fetchJson<T>(url: string): Promise<Loadable<T>> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
    const text = await res.text();
    // Some static hosts answer missing files with an HTML page.
    if (text.trimStart().startsWith("<")) return { status: "missing" };
    return { status: "ready", data: JSON.parse(text) as T };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export const loadResults = () => fetchJson<Results>("/data/results.json");
export const loadSources = () => fetchJson<SourceRecord[]>("/data/sources.json");
export const loadLocator = () => fetchJson<Locator>("/data/locator.json");
export const loadFieldTest = () => fetchJson<FieldTest>("/data/fieldtest.json");

/** Post-hoc descriptive field-test context (science/pipeline/fieldtest_posthoc.py). Never feeds any rank. */
export interface RoughStat {
  n: number;
  median_m: number | null;
  p90_m: number | null;
}
export interface WorldCoverPart {
  tiles: string[];
  fractions: Record<string, number>;
  nodata_fraction: number | null;
}
export interface FieldTest {
  status: string;
  generated_utc: string;
  roughness: {
    name: string;
    units: string;
    grid_m: number;
    preprocessing: string;
    neighbourhoods_m: number[];
    definition: string;
    edge_handling: string;
    limitations: string;
    scenes: Record<string, { window: string; "330m": RoughStat; "990m": RoughStat }>;
    candidate_clusters: Record<string, { "330m": RoughStat; "990m": RoughStat }>;
  };
  worldcover: {
    product: string;
    year: number;
    resolution_m: number;
    source_url: string;
    data_access: string;
    license: string;
    attribution: string;
    citation: string;
    accuracy: string;
    legend: Record<string, string>;
    method: string;
    caveat: string;
    candidates: Record<
      string,
      {
        compare_scene_id: string;
        footprint: { n_windows: number; area_km2: number; bbox: number[]; windows: string[] };
        cluster: WorldCoverPart;
        best_window: WorldCoverPart & { id: string };
      }
    >;
  };
}

export function dataOf<T>(l: Loadable<T>): T | null {
  return l.status === "ready" ? l.data : null;
}
