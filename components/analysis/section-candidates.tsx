"use client";

import { useState } from "react";
import type { CompareScene, Results, SourceRecord } from "@/lib/types";
import { formatCoord, rankPhrase } from "@/lib/format";
import { W1Bars } from "./charts";
import { Card, ExtLink, SectionHeader, Tag, fmt, fmtInt, groupId } from "./primitives";

type Item = {
  key: string;
  kind: "candidate" | "positive" | "negative";
  title: string;
  subtitle: string;
  centroid: [number, number] | null;
  centroidLabel: string;
  sceneCentroid: [number, number] | null;
  pctMain: number | null;
  pctMainLabel: string;
  pctBest: number | null;
  nWindows: number;
  areaKm2: number | null;
  label: string | null;
  note: string | null;
  citation: string | null;
  scene: CompareScene | null;
  windowId: string | null;
};

function tileOf(windowId: string | null): string | null {
  if (!windowId) return null;
  const m = windowId.match(/NASADEM_HGT_([ns]\d{2}[ew]\d{3})/i);
  return m ? m[1] : null;
}

function buildItems(r: Results): Item[] {
  const scenes = new Map(r.compare_scenes.map((s) => [s.id, s]));
  const cands: Item[] = r.candidates.map((c) => {
    const scene = scenes.get(c.compare_scene_id) ?? null;
    return {
      key: c.id,
      kind: "candidate",
      title: `Gobi ${c.id}`,
      subtitle: "Morphometric candidate",
      centroid: c.centroid,
      centroidLabel: "Cluster centroid",
      sceneCentroid: scene?.centroid ?? null,
      pctMain: c.best_pct,
      pctMainLabel: "Best window",
      pctBest: c.median_pct,
      nWindows: c.n_windows,
      areaKm2: c.area_km2,
      label: c.label,
      note: null,
      citation: null,
      scene,
      windowId: c.best_window ?? null,
    };
  });
  const siteItems: Item[] = r.sites.map((s) => {
    const scene = r.compare_scenes.find((cs) => cs.site_id === s.id) ?? null;
    // Representative window: nearest site window to the comparison scene centre.
    let windowId: string | null = null;
    if (scene) {
      let bd = Infinity;
      for (const w of r.windows) {
        if (w.label !== s.id) continue;
        const d = (w.lon - scene.centroid[0]) ** 2 + (w.lat - scene.centroid[1]) ** 2;
        if (d < bd) {
          bd = d;
          windowId = w.id;
        }
      }
    }
    return {
      key: s.id,
      kind: s.role,
      title: `${s.id} ${s.name.replace(/\s*\(.*\)$/, "")}`,
      subtitle: s.role === "positive" ? "Published yardang reference site" : "Process-different control",
      centroid: null,
      centroidLabel: "",
      sceneCentroid: scene?.centroid ?? null,
      pctMain: s.median_pct_full,
      pctMainLabel: "Median window",
      pctBest: s.best_pct_full,
      nWindows: s.n_windows,
      areaKm2: null,
      label: null,
      note: s.note ?? null,
      citation: s.citation,
      scene,
      windowId,
    };
  });
  return [...cands, ...siteItems];
}

export function CandidatesSection({ results: r, sources, onCompare }: { results: Results; sources: SourceRecord[] | null; onCompare?: (compareSceneId: string) => void }) {
  const items = buildItems(r);
  const [sel, setSel] = useState<string>(items[0]?.key ?? "");
  const it = items.find((i) => i.key === sel) ?? items[0];
  const nasadem = sources?.find((s) => s.id === "nasadem");
  const d1 = r.diagnostics?.groups?.find((g) => groupId(g.group) === "D1");
  const N = r.null_set.n_windows;

  const groupsList: { title: string; kinds: Item["kind"][] }[] = [
    { title: "Gobi candidates", kinds: ["candidate"] },
    { title: "Published yardang sites", kinds: ["positive"] },
    { title: "Controls", kinds: ["negative"] },
  ];

  return (
    <section id="candidates" aria-labelledby="candidates-title" className="scroll-mt-8">
      <SectionHeader
        id="candidates"
        kicker="Candidate explorer"
        title="Inspect each candidate and reference site"
        lead={
          <p>
            Gobi candidates are the highest-ranked clusters of search windows.
            {r.decision.pass ? " A high rank" : " Because the validation failed, a high rank"} says only that the terrain geometry is close to the Mars fingerprint at 30 m — not that the landform formed the same way.
          </p>
        }
      />
      {it ? (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Candidates and reference sites" className="space-y-6">
            {groupsList.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-[14px] font-medium uppercase tracking-[0.1em] text-muted">{g.title}</p>
                <ul className="space-y-1">
                  {items
                    .filter((i) => g.kinds.includes(i.kind))
                    .map((i) => {
                      const on = i.key === it.key;
                      return (
                        <li key={i.key}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSel(i.key)}
                            className={`flex min-h-[40px] w-full items-center justify-between gap-3 rounded-[8px] border px-3 text-left text-[15px] transition-colors duration-200 motion-reduce:transition-none ${
                              on ? "border-copper/60 bg-[#1a1f26] text-ink" : "border-transparent text-muted hover:bg-surface hover:text-ink"
                            }`}
                          >
                            <span className="truncate">{i.kind === "candidate" ? i.title : i.title.split(" ").slice(0, 3).join(" ")}</span>
                            <span className="num shrink-0 text-[14px]">{fmt(i.pctMain)}</span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
            <p className="text-[13px] leading-snug text-muted">Numbers are percentiles: best window for candidates, median window for sites.</p>
          </nav>

          <Card className="p-6 md:p-8" key={it.key}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Tag tone={it.kind === "candidate" ? "neutral" : it.kind === "positive" ? "copper" : "earth"}>{it.subtitle}</Tag>
                <h3 className="mt-3 font-display text-[28px] font-semibold leading-tight text-ink">{it.title}</h3>
              </div>
              {onCompare && it.scene ? (
                <button
                  type="button"
                  onClick={() => (it.scene ? onCompare(it.scene.id) : undefined)}
                  className="inline-flex min-h-[40px] items-center rounded-[8px] bg-copper px-4 text-[15px] font-medium text-[#0B1016] transition-colors duration-200 hover:bg-[#d68b66] motion-reduce:transition-none"
                >
                  View in 3D comparison
                </button>
              ) : null}
            </div>

            <p className="mt-5 text-[18px] leading-[1.55] text-ink">
              {it.pctMainLabel} ranks in the <span className="num">{rankPhrase(it.pctMain)}</span> of <span className="num">{fmtInt(N)}</span> declared
              Earth windows.
            </p>
            <p className="mt-1 text-[14px] text-muted">A rank relative to the searched windows only — not a probability or a &ldquo;% match&rdquo;.</p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-5 text-[15px] md:grid-cols-3">
              {it.centroid ? (
                <div>
                  <dt className="text-muted">{it.centroidLabel}</dt>
                  <dd className="num mt-1 text-ink">{formatCoord(it.centroid, "Earth")}</dd>
                </div>
              ) : null}
              {it.sceneCentroid ? (
                <div>
                  <dt className="text-muted">{it.kind === "candidate" ? "Best window centre" : "Representative window centre"}</dt>
                  <dd className="num mt-1 text-ink">{formatCoord(it.sceneCentroid, "Earth")}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">Percentile ({it.pctMainLabel.toLowerCase()})</dt>
                <dd className="num mt-1 text-ink">{fmt(it.pctMain)}</dd>
              </div>
              <div>
                <dt className="text-muted">{it.kind === "candidate" ? "Median window percentile" : "Best window percentile"}</dt>
                <dd className="num mt-1 text-ink">{fmt(it.pctBest)}</dd>
              </div>
              <div>
                <dt className="text-muted">Windows</dt>
                <dd className="num mt-1 text-ink">{it.nWindows}</dd>
              </div>
              {it.areaKm2 !== null ? (
                <div>
                  <dt className="text-muted">Area</dt>
                  <dd className="num mt-1 text-ink">{fmtInt(it.areaKm2)} km²</dd>
                </div>
              ) : null}
            </dl>

            {it.scene?.per_feature_w1 ? (
              <div className="mt-8 border-t border-hairline pt-6">
                <h4 className="font-display text-[19px] font-semibold text-ink">Distance to Mars, feature by feature</h4>
                <p className="mb-5 mt-2 max-w-[66ch] text-[15px] leading-[1.6] text-muted">
                  Wasserstein-1 (W1) distance between the Mars and window distributions for each feature, after mapping values through the pooled
                  Earth distribution (normalized units, 0–1). Smaller bars are closer to Mars.
                  {d1?.median_w1 ? " The blue tick marks the median Gobi search window for reference." : ""}
                </p>
                <W1Bars features={r.features} w1={it.scene.per_feature_w1} reference={d1?.median_w1} referenceLabel="Median Gobi window" />
                <p className="mt-3 text-[13px] text-muted">Values for the {it.kind === "candidate" ? "best" : "representative"} comparison window.</p>
              </div>
            ) : null}

            <div className="mt-8 grid gap-6 border-t border-hairline pt-6 md:grid-cols-2">
              <div>
                <h4 className="text-[15px] font-semibold text-ink">Data provenance</h4>
                <ul className="mt-2 space-y-1 text-[15px] leading-[1.55] text-muted">
                  {nasadem ? (
                    <>
                      <li>{nasadem.provider}</li>
                      <li>
                        Product: <span className="text-ink">{nasadem.product_id}</span>
                        {tileOf(it.windowId) ? (
                          <>
                            {" "}
                            · tile <span className="num text-ink">{tileOf(it.windowId)}</span>
                          </>
                        ) : null}
                      </li>
                      {it.windowId ? (
                        <li>
                          Window <span className="num break-all text-ink">{it.windowId}</span>
                        </li>
                      ) : null}
                      <li>
                        <ExtLink href={nasadem.url}>{nasadem.url}</ExtLink>
                      </li>
                    </>
                  ) : (
                    <li>Source records not available.</li>
                  )}
                  {it.citation ? <li className="pt-2">Reference: {it.citation}</li> : null}
                </ul>
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-ink">Limitations &amp; next steps</h4>
                {it.label ? <p className="mt-2 text-[15px] leading-[1.55] text-ink">{it.label.charAt(0).toUpperCase() + it.label.slice(1)}.</p> : null}
                {it.note ? <p className="mt-2 text-[15px] leading-[1.55] text-ink">{it.note}</p> : null}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-[1.55] text-muted marker:text-copper">
                  <li>Geometry only, at ≥ 180 m baselines: says nothing about rock type, age or wind regime.</li>
                  {it.kind === "candidate" ? (
                    <>
                      <li>Recommended: inspect optical imagery and geologic maps for wind-streamlined ridges.</li>
                      <li>Recommended: compare ridge orientation with prevailing wind data before any field visit.</li>
                    </>
                  ) : (
                    <li>Used as a pre-registered {it.kind === "positive" ? "positive reference" : "negative control"}; its polygon was placed before scoring.</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-muted">No candidates published.</p>
      )}
    </section>
  );
}
