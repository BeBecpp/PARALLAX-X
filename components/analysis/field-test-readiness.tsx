"use client";

import { useEffect, useState } from "react";
import type { Results } from "@/lib/types";
import { loadFieldTest, type FieldTest, type Loadable } from "@/lib/data";

/**
 * Field-test readiness: what a rover field test at an Earth window could rely on, sorted by how well it is known.
 *   MEASURED      — computed here from real data (pre-registered fingerprint; post-hoc roughness; WorldCover 2021)
 *   INFERRED      — what those measurements suggest, with the limitation stated next to it
 *   UNKNOWN       — what only field work can establish (no estimate is computed or shown)
 * No mobility score, traction, battery, drilling or geology value is produced, and nothing is re-ranked.
 */

const f2 = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d));
const pc = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(v < 0.01 && v > 0 ? 2 : 1)}%`);

function Tier({ tone, title, note, children }: { tone: "measured" | "inferred" | "unknown"; title: string; note: string; children: React.ReactNode }) {
  const c = tone === "measured" ? "border-[#7FD1A0]/35 text-[#a8e3bf]" : tone === "inferred" ? "border-[#E0A66A]/40 text-[#f0c99a]" : "border-hairline text-muted";
  const dot = tone === "measured" ? "bg-[#7FD1A0]" : tone === "inferred" ? "bg-[#E0A66A]" : "border border-muted/70";
  return (
    <div className="rounded-[12px] border border-hairline bg-bg/40 p-4">
      <p className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${c}`}>
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" /> {title}
      </p>
      <p className="mt-2 text-[13px] text-muted">{note}</p>
      <ul className="mt-3 space-y-3">{children}</ul>
    </div>
  );
}

function Row({ k, v, sub }: { k: string; v: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <li>
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink/80">{k}</p>
      <p className="mt-0.5 text-[15px] leading-snug text-ink">{v}</p>
      {sub ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{sub}</p> : null}
    </li>
  );
}

export function useFieldTest(): Loadable<FieldTest> {
  const [ft, setFt] = useState<Loadable<FieldTest>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    loadFieldTest().then((v) => alive && setFt(v));
    return () => {
      alive = false;
    };
  }, []);
  return ft;
}

export function FieldTestReadiness({ results: r, itemKey, sceneId, kind }: { results: Results; itemKey: string; sceneId: string | null; kind: "candidate" | "positive" | "negative" }) {
  const ft = useFieldTest();
  if (ft.status === "loading") return <div className="h-[200px] rounded-[12px] border border-hairline bg-surface/40" aria-busy="true" />;
  if (ft.status !== "ready") return <p className="text-[14px] text-muted">Field-test context (fieldtest.json) is not published, so nothing is shown.</p>;
  const d = ft.data;
  const R = d.roughness;
  const mars = R.scenes.cmp_mars;
  const scene = sceneId ? R.scenes[sceneId] : undefined;
  const cluster = kind === "candidate" ? R.candidate_clusters[itemKey] : undefined;
  const wc = kind === "candidate" ? d.worldcover.candidates[itemKey] : undefined;
  const cand = r.candidates.find((c) => c.id === itemKey);
  const sceneRec = r.compare_scenes.find((s) => s.id === sceneId);
  const bare = wc?.cluster.fractions["Bare / sparse vegetation"];
  const top = wc ? Object.entries(wc.cluster.fractions).filter(([, v]) => v >= 0.001) : [];

  return (
    <div className="rounded-[14px] border border-hairline bg-[#0d1218] p-6 md:p-8" aria-label="Field-test readiness">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-copper-light">Field-test readiness · {itemKey}</p>
      <h4 className="mt-1 font-display text-[22px] font-semibold text-ink">What a rover field test here could rely on — and what it must still establish</h4>
      <p className="mt-1 max-w-[80ch] text-[14px] text-muted">
        Roughness and surface cover below are <span className="text-ink/90">post-hoc descriptive layers</span>: they are not part of the frozen F1–F5 fingerprint, do not change any rank, and do not
        alter the FAILED pre-registered verdict. No mobility, traction, battery or drilling estimate is computed.
      </p>

      <div className="mt-5 grid gap-4">
        <Tier tone="measured" title="Measured" note="Computed from real elevation and land-cover data.">
          <Row
            k="Terrain-shape fingerprint (pre-registered)"
            v={
              <>
                <span className="num">{f2(sceneRec?.pct_full, 2)}</span>th percentile of {r.null_set.n_windows.toLocaleString("en-US")} Earth windows
                {cand ? (
                  <>
                    {" "}
                    · cluster of <span className="num">{cand.n_windows}</span> windows, median <span className="num">{f2(cand.median_pct, 1)}</span>
                  </>
                ) : null}
              </>
            }
            sub="Similarity of 30 m terrain geometry only. The method failed its own validation, so this is an exploratory lead."
          />
          <Row
            k={`Local detrended RMS roughness (${R.neighbourhoods_m.join(" / ")} m cells)`}
            v={
              <>
                {cluster ? "Cluster" : "Window"} median <span className="num">{f2((cluster ?? scene)?.["330m"].median_m, 2)} m</span> / <span className="num">{f2((cluster ?? scene)?.["990m"].median_m, 2)} m</span>
                <span className="text-muted"> · Mars CTX study area </span>
                <span className="num">{f2(mars?.["330m"].median_m, 2)} m</span> / <span className="num">{f2(mars?.["990m"].median_m, 2)} m</span>
              </>
            }
            sub={`90th percentile ${f2((cluster ?? scene)?.["330m"].p90_m, 2)} m (330 m cells). RMS of plane-fit residuals on the common ${R.grid_m} m grid; complete cells only.`}
          />
          {wc ? (
            <Row
              k="Surface cover · ESA WorldCover 2021 (10 m)"
              v={top.map(([k, v], i) => (
                <span key={k}>
                  {i ? " · " : ""}
                  {k} <span className="num">{pc(v)}</span>
                </span>
              ))}
              sub={`Over the ${wc.footprint.n_windows} analysis windows (${Math.round(wc.footprint.area_km2)} km²). Global overall accuracy of the product 76.7 % ± 0.5; not assessed locally.`}
            />
          ) : (
            <Row k="Surface cover" v={<span className="text-muted">Not computed for reference / control sites.</span>} />
          )}
        </Tier>

        <Tier tone="inferred" title="Inferred, with limits" note="What the measurements suggest — each with its caveat.">
          <Row
            k="Kilometre-scale relief"
            v={
              (cluster ?? scene) && mars
                ? `Relief texture at 330–990 m is ${relWord((cluster ?? scene)!["330m"].median_m, mars["330m"].median_m)} the Mars study area.`
                : "—"
            }
            sub="Only relief longer than ~30 m is visible. It says nothing about rocks, ripples or wheel-scale obstacles."
          />
          {wc ? (
            <Row
              k="Little vegetation in 2021"
              v={bare !== undefined ? `${pc(bare)} classed bare / sparse vegetation.` : "—"}
              sub="A satellite land-cover class, not a material: it does not say sand, gravel, rock or crust. Seasonal and inter-annual change are not captured."
            />
          ) : null}
          <Row k="Access & logistics" v={<span className="text-muted">Not assessed.</span>} sub="Roads, permits, land use and seasonal access need local information." />
        </Tier>

        <Tier tone="unknown" title="Unknown — needs field tests" note="Nothing is estimated here; these require measurements on site.">
          <Row k="Rover-scale roughness & rocks" v="Needs ≤ 1 m lidar / photogrammetry or a rock-abundance survey." />
          <Row k="Surface material" v="Sand, gravel, rock or crust: imagery, geologic maps and sampling." />
          <Row k="Soil strength / wheel traction" v="Cone penetrometer or bevameter, and wheel–soil trials." />
          <Row k="Drilling suitability" v="Lithology, induration and test cores." />
          <Row k="Thermal & battery conditions" v="Local temperature and solar records or on-site logging." />
        </Tier>
      </div>

      <p className="mt-5 text-[12px] leading-snug text-muted">
        Land cover: {d.worldcover.attribution}. Licence {d.worldcover.license.split(" - ")[0]}. {d.worldcover.citation}. Roughness: computed from NASADEM (Earth) and the USGS CTX stereo DTM (Mars) on the
        pipeline&apos;s common 30 m grid — see <span className="num">science/pipeline/fieldtest_posthoc.py</span>. The rover shown in the app is an illustrative terrain-following demonstration, not a
        mobility model.
      </p>
    </div>
  );
}

/** Wording for a ratio of two medians; no threshold is used to rank or select anything. */
function relWord(earth: number | null, mars: number | null): string {
  if (!earth || !mars) return "not comparable with";
  const k = earth / mars;
  const pctTxt = `${Math.round(Math.abs(k - 1) * 100)}%`;
  if (Math.abs(k - 1) < 0.1) return `within 10% of`;
  return k > 1 ? `${pctTxt} rougher than` : `${pctTxt} smoother than`;
}

/** Side-by-side descriptive table for the five candidates, in their existing fingerprint order (no re-ranking). */
export function FieldTestTable({ results: r }: { results: Results }) {
  const ft = useFieldTest();
  if (ft.status !== "ready") return null;
  const d = ft.data;
  const mars = d.roughness.scenes.cmp_mars;
  return (
    <div className="overflow-x-auto rounded-[10px] border border-hairline">
      <table className="w-full border-collapse text-left text-[14px]">
        <caption className="sr-only">Descriptive field-test context per candidate</caption>
        <thead>
          <tr className="border-b border-hairline bg-[#0e131a] text-[13px] text-muted">
            <th className="px-3 py-2 font-medium">Candidate</th>
            <th className="px-3 py-2 font-medium">Fingerprint pct (best window)</th>
            <th className="px-3 py-2 font-medium">Roughness median, 330 m cells</th>
            <th className="px-3 py-2 font-medium">Bare / sparse veg. (2021)</th>
            <th className="px-3 py-2 font-medium">Soil, traction, drilling, thermal</th>
          </tr>
        </thead>
        <tbody>
          {r.candidates.map((c) => {
            const rough = d.roughness.candidate_clusters[c.id]?.["330m"];
            const wc = d.worldcover.candidates[c.id];
            return (
              <tr key={c.id} className="border-b border-hairline/60 last:border-b-0">
                <th scope="row" className="px-3 py-2 font-semibold text-ink">
                  {c.id}
                </th>
                <td className="num px-3 py-2 text-ink">{f2(c.best_pct, 2)}</td>
                <td className="num px-3 py-2 text-ink">{f2(rough?.median_m, 2)} m</td>
                <td className="num px-3 py-2 text-ink">{pc(wc?.cluster.fractions["Bare / sparse vegetation"])}</td>
                <td className="px-3 py-2 text-muted">unknown — field test</td>
              </tr>
            );
          })}
          <tr className="bg-copper/5">
            <th scope="row" className="px-3 py-2 font-semibold text-copper-light">
              Mars CTX
            </th>
            <td className="px-3 py-2 text-muted">reference</td>
            <td className="num px-3 py-2 text-ink">{f2(mars?.["330m"].median_m, 2)} m</td>
            <td className="px-3 py-2 text-muted">n/a</td>
            <td className="px-3 py-2 text-muted">—</td>
          </tr>
        </tbody>
      </table>
      <p className="border-t border-hairline px-3 py-2 text-[12px] text-muted">Listed in the existing fingerprint order. Roughness and land cover are descriptive and post-hoc; no combined score or rover-weighted ranking is computed.</p>
    </div>
  );
}
