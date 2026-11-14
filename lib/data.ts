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

export function dataOf<T>(l: Loadable<T>): T | null {
  return l.status === "ready" ? l.data : null;
}
