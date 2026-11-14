"use client";

import { useState, type ReactNode } from "react";
import type { CompareScene, Feature, Results, Site } from "@/lib/types";
import { formatCoord, fracToPercent, rankPhrase } from "@/lib/format";
import { fmt, shortName } from "@/components/analysis/primitives";
import type { EvidenceSection, RightPanelProps, WorkspaceMode } from "./types";
import { ACTIVE_GLOW, Icon, MicroLabel, PanelTitle, PillTabs, SectionLabel, Segmented } from "./panels/ui";

// "Explainable analysis" column. Every number is read from results.json; nothing is estimated here.

type FeatureId = Feature["id"];
type ListTab = "candidates" | "sites";
type InfoTab = "algorithm" | "metrics" | "evidence";

const SHORT: Record<FeatureId, string> = {
  F1: "Relief",
  F2: "Slope",
  F3: "Slope",
  F4: "TPI",
  F5: "Elongation",
};

/** Baseline length label without rounding away precision: 1980 → "1.98 km", 180 → "180 m". */
function fmtBaseline(m: number): string {
  if (m >= 1000) return `${Number((m / 1000).toFixed(2))} km`;
  return `${Math.round(m)} m`;
}

/** Short feature label with its baseline, e.g. "Slope 180 m". */
function featureShort(f: Feature): string {
  if (f.id === "F2" || f.id === "F3" || f.id === "F4") return `${SHORT[f.id]} ${fmtBaseline(f.baseline_m)}`;
  return SHORT[f.id] ?? f.name;
}

/** "Gobi G-1 — morphometric candidate (…)" → "Gobi G-1" */
function sceneName(s: CompareScene): string {
  return s.label.split(" — ")[0].trim();
}

function signed(v: number, digits: number): string {
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return `±${s}`;
  return `${v > 0 ? "+" : "−"}${s}`;
}

function siteRole(site: Site): string {
  return site.role === "positive" ? "published yardang analog" : "process-different control";
}

/* ------------------------------------------------------------------ */

export function RightPanel({ results, mode, selectedSceneId, onSelectScene, onOpenEvidence }: RightPanelProps) {
  const scenes = results.compare_scenes;
  const marsScene = scenes.find((s) => s.kind === "mars") ?? null;
  const selected = selectedSceneId ? (scenes.find((s) => s.id === selectedSceneId && s.kind !== "mars") ?? null) : null;
  const featureById = new Map(results.features.map((f) => [f.id, f] as const));

  return (
    <aside
      aria-label="Explainable analysis"
      className="flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain border-l border-hairline bg-surface"
    >
      <div className="border-b border-hairline px-5 pb-4 pt-5">
        <PanelTitle icon="bars" title="Explainable analysis" sub="Terrain fingerprint comparison · computed values" />
      </div>

      <Section>
        <MetricCards results={results} featureById={featureById} mars={marsScene} earth={selected} />
      </Section>

      <Section>
        <Ranking results={results} selectedSceneId={selectedSceneId} onSelectScene={onSelectScene} />
      </Section>

      <Section>
        <ValidationCard results={results} onOpenEvidence={onOpenEvidence} />
      </Section>

      <Section>
        <InfoTabs results={results} selected={selected} onOpenEvidence={onOpenEvidence} />
      </Section>

      <Section last>
        <WhyCard results={results} mode={mode} selected={selected} featureById={featureById} />
      </Section>
    </aside>
  );
}

function Section({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return <section className={`px-5 py-4 ${last ? "pb-6" : "border-b border-hairline"}`}>{children}</section>;
}

/* ------------------------------------------------------------------ */
/* Metric cards                                                         */
/* ------------------------------------------------------------------ */

const METRICS: { id: FeatureId; label: string; icon: "relief" | "slope" | "elongation"; digits: number }[] = [
  { id: "F1", label: "Relief", icon: "relief", digits: 1 },
  { id: "F2", label: "Slope", icon: "slope", digits: 2 },
  { id: "F5", label: "Elongation", icon: "elongation", digits: 3 },
];

function unitOf(f: Feature | undefined): string {
  if (!f) return "";
  if (f.units === "deg") return "°";
  if (f.units === "m") return " m";
  return "";
}

function MetricCards({
  results,
  featureById,
  mars,
  earth,
}: {
  results: Results;
  featureById: Map<FeatureId, Feature>;
  mars: CompareScene | null;
  earth: CompareScene | null;
}) {
  const marsRaw = mars?.median_raw ?? results.mars?.median_raw ?? null;
  const earthRaw = earth?.median_raw ?? null;
  const windowKm = Number(results.run.parameters.window_km);
  const windowLabel = Number.isFinite(windowKm) ? `${Math.round(windowKm)} km` : "scene";
  return (
    <div className="@container">
    <div className="grid grid-cols-1 gap-2 @[360px]:grid-cols-3">
      {METRICS.map((m) => {
        const f = featureById.get(m.id);
        const mv = marsRaw?.[m.id];
        const ev = earthRaw?.[m.id];
        const unit = unitOf(f).trim();
        const sub =
          m.id === "F1" ? "F1 · median" : m.id === "F2" ? `F2 · ${f ? fmtBaseline(f.baseline_m) : ""} base` : "F5 · coherence 0–1";
        const tip = `${f?.name ?? m.label}: median over the ${windowLabel} window${f ? ` (${f.description})` : ""}.`;
        return (
          <div
            key={m.id}
            title={tip}
            className="flex min-w-0 items-center gap-3 rounded-[10px] border border-hairline bg-surface-soft px-3 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)] @[360px]:flex-col @[360px]:items-stretch @[360px]:gap-0"
          >
            <div className="min-w-0 flex-1 @[360px]:contents">
              <div className="flex items-center gap-1.5 text-muted @[360px]:order-1">
                <Icon name={m.icon} className="h-[14px] w-[14px] shrink-0 text-copper" />
                <span className="truncate text-[11px] font-medium uppercase tracking-[0.14em]">{m.label}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted @[360px]:order-3">{sub}</p>
            </div>
            <p className="num shrink-0 truncate text-[20px] font-medium leading-none text-copper-light @[360px]:order-2 @[360px]:mt-1.5 @[380px]:text-[22px]">
              {typeof mv === "number" ? mv.toFixed(m.digits) : "—"}
              <span className="ml-0.5 text-[13px] text-copper/80">{unit}</span>
            </p>
            {earth ? (
              <div className="shrink-0 border-l border-hairline pl-3 @[360px]:order-4 @[360px]:mt-2 @[360px]:border-l-0 @[360px]:border-t @[360px]:pl-0 @[360px]:pt-1.5">
                <p className="num truncate text-[14px] leading-tight text-earth">
                  {typeof ev === "number" ? ev.toFixed(m.digits) : "—"}
                  <span className="ml-0.5 text-[11px]">{unit}</span>
                </p>
                {typeof ev === "number" && typeof mv === "number" ? (
                  <p className="num text-[11px] text-muted" title="Earth minus Mars">
                    Δ {signed(ev - mv, m.digits)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-copper" aria-hidden /> Mars · {mars ? sceneName(mars).replace(/\s*\(Mars\)$/, "") : "fingerprint"}
        </span>
        {earth ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-earth" aria-hidden /> <span className="truncate">Earth · {sceneName(earth)}</span>
          </span>
        ) : (
          <span>Select an Earth window to compare</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Earth analog ranking                                                 */
/* ------------------------------------------------------------------ */

function Ranking({
  results,
  selectedSceneId,
  onSelectScene,
}: {
  results: Results;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
}) {
  const scenes = results.compare_scenes;
  const selectedIsSite = scenes.some((s) => s.id === selectedSceneId && (s.kind === "positive" || s.kind === "negative"));
  const [tab, setTab] = useState<ListTab>(selectedIsSite ? "sites" : "candidates");
  const nNull = results.null_set.n_windows;

  const candidateRows = results.candidates.map((c) => {
    const s = scenes.find((x) => x.id === c.compare_scene_id) ?? null;
    return {
      key: c.id,
      sceneId: s?.id ?? null,
      thumb: s?.thumb ?? null,
      name: s ? sceneName(s) : c.id,
      sub: `morphometric candidate · ${formatCoord(c.centroid, "Earth")}`,
      pct: s?.pct_full ?? c.best_pct,
      pctLabel: "pct",
      title: c.label,
    };
  });
  const siteRows = results.sites.map((site) => {
    const s = scenes.find((x) => x.site_id === site.id) ?? null;
    return {
      key: site.id,
      sceneId: s?.id ?? null,
      thumb: s?.thumb ?? null,
      name: `${site.id} ${shortName(site.name)}`,
      sub: `${siteRole(site)} · ${site.n_windows} windows`,
      pct: site.median_pct_full,
      pctLabel: "site median",
      title: `${site.name} — ${site.n_windows} windows${site.note ? `. ${site.note}` : ""}`,
    };
  });
  const rows = tab === "candidates" ? candidateRows : siteRows;

  return (
    <div>
      <SectionLabel icon="rank">Earth analog ranking</SectionLabel>
      <div className="mt-3">
        <Segmented
          label="Ranking list"
          value={tab}
          onChange={setTab}
          items={[
            { id: "candidates", label: "Candidates" },
            { id: "sites", label: "Reference sites" },
          ]}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const active = r.sceneId !== null && r.sceneId === selectedSceneId;
          return (
            <li key={r.key}>
              <button
                type="button"
                disabled={!r.sceneId}
                onClick={() => r.sceneId && onSelectScene(r.sceneId)}
                aria-pressed={active}
                title={r.title}
                style={active ? { boxShadow: ACTIVE_GLOW } : undefined}
                className={`group flex w-full items-center gap-3 rounded-[10px] border px-2.5 py-2 text-left transition-colors duration-200 motion-reduce:transition-none ${
                  active ? "border-copper bg-copper/[0.07]" : "border-hairline bg-surface-soft hover:border-[#3a4550] hover:bg-[#1b222b]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Thumb src={r.thumb} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-[12px] text-muted">{r.sub}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`num block text-[18px] font-medium leading-none ${active ? "text-copper-light" : "text-ink"}`}>{fmt(r.pct, 2)}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-muted">{r.pctLabel}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] leading-snug text-muted">
        {tab === "candidates"
          ? `Percentile among ${nNull.toLocaleString("en-US")} declared Earth windows (higher = closer to the Mars fingerprint). Not a probability; validation did not pass.`
          : `Median percentile of each site's windows among ${nNull.toLocaleString("en-US")} declared Earth windows. P1–P3 are published yardang fields; N1–N2 are look-alike controls. Selecting a site shows its median-rank window.`}
      </p>
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  if (!src) return <span className="h-[44px] w-[64px] shrink-0 rounded-[6px] border border-hairline bg-[#0d1218]" aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden width={64} height={44} className="h-[44px] w-[64px] shrink-0 rounded-[6px] border border-hairline object-cover" />
  );
}

/* ------------------------------------------------------------------ */
/* Validation                                                           */
/* ------------------------------------------------------------------ */

function ValidationCard({ results, onOpenEvidence }: { results: Results; onOpenEvidence: (s: EvidenceSection) => void }) {
  const threshold = Number(results.run.parameters.pass_percentile);
  const hasThreshold = Number.isFinite(threshold);
  const pass = results.decision.pass;
  const { mean_pos_full: full, mean_pos_b0: b0 } = results.decision;
  const rows = results.sites;
  return (
    <div className="rounded-[12px] border border-hairline bg-surface-soft p-4 shadow-[0_6px_20px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MicroLabel>Pre-registered validation</MicroLabel>
          <p className="mt-1 font-display text-[22px] font-semibold uppercase leading-none tracking-[0.04em] text-ink">{pass ? "Passed" : "Failed"}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenEvidence("validation")}
          className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-[13px] font-medium text-copper-light hover:bg-copper/10"
        >
          Details <Icon name="link" className="h-[13px] w-[13px]" />
        </button>
      </div>

      <div className="mt-7 flex gap-2 text-[12px]">
        <div className="shrink-0 space-y-0">
          {rows.map((s) => (
            <div key={s.id} className="flex h-[22px] items-center gap-1.5" title={s.name}>
              <span className={`num font-semibold ${s.role === "positive" ? "text-copper-light" : "text-muted"}`}>{s.id}</span>
              <span className="max-w-[64px] truncate text-muted">{shortName(s.name).split(" ")[0]}</span>
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {hasThreshold ? (
            <span className="num absolute -top-[18px] -translate-x-1/2 whitespace-nowrap text-[10px] text-ink/80" style={{ left: `${threshold}%` }}>
              pass ≥ {threshold}
            </span>
          ) : null}
          {rows.map((s) => {
            const v = s.median_pct_full;
            return (
              <div key={s.id} className="relative flex h-[22px] items-center">
                <span className="absolute inset-x-0 h-px bg-[#2b343e]" />
                {typeof v === "number" ? (
                  <>
                    <span
                      className={`absolute h-[3px] rounded-full ${s.role === "positive" ? "bg-copper/45" : "bg-[#6f7a85]/45"}`}
                      style={{ left: 0, width: `${Math.min(100, Math.max(0, v))}%` }}
                    />
                    <span
                      className={`absolute h-[9px] w-[9px] -translate-x-1/2 rounded-full ring-2 ring-surface-soft ${s.role === "positive" ? "bg-copper" : "bg-[#8a949e]"}`}
                      style={{ left: `${Math.min(100, Math.max(0, v))}%` }}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
          {hasThreshold ? (
            <span
              aria-hidden
              className="absolute -bottom-1 -top-1 border-l border-dashed border-[#A4B0BC]/50"
              style={{ left: `${threshold}%` }}
            />
          ) : null}
          <div className="num relative mt-1 h-[14px] text-[10px] text-muted" aria-hidden>
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2" style={{ left: "50%" }}>
              50
            </span>
            <span className="absolute right-0">100</span>
          </div>
        </div>
        <div className="shrink-0">
          {rows.map((s) => (
            <div key={s.id} className="num flex h-[22px] items-center justify-end text-ink">
              {fmt(s.median_pct_full, 1)}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">
        Site median percentile; dashed line = pass threshold{hasThreshold ? ` (${threshold})` : ""}. Copper = published yardangs, grey = controls.
      </p>
      {typeof full === "number" && typeof b0 === "number" ? (
        <div className="mt-3 rounded-[8px] border border-hairline bg-[#0d1218] px-3 py-2.5">
          <MicroLabel>Mean yardang-site percentile</MicroLabel>
          <div className="mt-1.5 flex items-baseline gap-2 text-[13px] text-muted">
            <span>Full fingerprint</span>
            <span className="num text-[17px] text-ink">{fmt(full, 1)}</span>
            <span className="px-1">vs</span>
            <span>slope-only</span>
            <span className="num text-[17px] text-ink">{fmt(b0, 1)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Algorithm | Metrics | Evidence                                       */
/* ------------------------------------------------------------------ */

const EVIDENCE: { id: EvidenceSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "terrain", label: "Terrain analysis" },
  { id: "candidates", label: "Candidates" },
  { id: "method", label: "Method" },
  { id: "validation", label: "Validation" },
  { id: "sources", label: "Sources" },
];

function InfoTabs({
  results,
  selected,
  onOpenEvidence,
}: {
  results: Results;
  selected: CompareScene | null;
  onOpenEvidence: (s: EvidenceSection) => void;
}) {
  const [tab, setTab] = useState<InfoTab>("algorithm");
  return (
    <div>
      <PillTabs
        label="Analysis detail"
        value={tab}
        onChange={setTab}
        items={[
          { id: "algorithm", label: "Algorithm" },
          { id: "metrics", label: "Metrics" },
          { id: "evidence", label: "Evidence" },
        ]}
      />
      <div className="mt-3" role="tabpanel">
        {tab === "algorithm" ? <AlgorithmTab results={results} /> : null}
        {tab === "metrics" ? <MetricsTab results={results} selected={selected} /> : null}
        {tab === "evidence" ? (
          <div className="grid grid-cols-2 gap-2">
            {EVIDENCE.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEvidence(e.id)}
                className="flex items-center justify-between gap-2 rounded-[8px] border border-hairline bg-surface-soft px-3 py-2.5 text-left text-[14px] text-ink transition-colors duration-200 hover:border-copper/60 hover:bg-[#1b222b] motion-reduce:transition-none"
              >
                <span className="truncate">{e.label}</span>
                <Icon name="link" className="h-[13px] w-[13px] shrink-0 text-copper-light" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AlgorithmTab({ results }: { results: Results }) {
  const { n_windows, by_domain } = results.null_set;
  const domains = Object.entries(by_domain)
    .map(([k, v]) => `${k} ${v.toLocaleString("en-US")}`)
    .join(", ");
  return (
    <div>
      <div className="num rounded-[8px] border border-hairline bg-[#0b0f14] px-3 py-3 text-[13px] leading-relaxed text-ink">
        <span className="text-copper-light">D</span> = mean<sub className="text-[10px] text-muted">k</sub> W1( F<sub className="text-[10px] text-muted">k</sub>(Mars), F
        <sub className="text-[10px] text-muted">k</sub>(window) )
      </div>
      <ul className="mt-3 space-y-1.5 text-[13px] leading-snug">
        {results.features.map((f) => (
          <li key={f.id} className="flex gap-2" title={f.description}>
            <span className="num w-6 shrink-0 font-semibold text-copper-light">{f.id}</span>
            <span className="text-ink">
              {f.name}
              {/baseline/i.test(f.name) ? null : (
                <span className="text-muted">
                  {" "}
                  · {f.id === "F1" ? "sub-window " : f.id === "F5" ? "σ " : "radius "}
                  {fmtBaseline(f.baseline_m)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1 border-t border-hairline pt-3 text-[13px] leading-snug text-muted">
        <li>
          <span className="text-ink">W1</span> = Wasserstein-1 distance between per-feature value distributions.
        </li>
        <li>
          <span className="text-ink">percentile</span> = share of null windows farther from Mars ({n_windows.toLocaleString("en-US")} windows{domains ? `: ${domains}` : ""}).
        </li>
        <li>
          <span className="text-ink">B0</span> = slope-only baseline (F2).
        </li>
      </ul>
    </div>
  );
}

function MetricsTab({ results, selected }: { results: Results; selected: CompareScene | null }) {
  const w1 = selected?.per_feature_w1 ?? null;
  if (!selected || !w1) {
    return (
      <div className="rounded-[8px] border border-dashed border-hairline px-4 py-5 text-center text-[13px] text-muted">
        Pick a candidate or reference site to see its per-feature distance to Mars.
      </div>
    );
  }
  const vals = results.features.map((f) => w1[f.id]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const max = Math.max(...vals, 1e-9);
  const minV = Math.min(...vals);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[13px] text-ink">{sceneName(selected)}</p>
        <p className="shrink-0 text-[12px] text-muted">W1 to Mars · smaller = closer</p>
      </div>
      <ul className="mt-2 space-y-2">
        {results.features.map((f) => {
          const v = w1[f.id];
          const ok = typeof v === "number" && Number.isFinite(v);
          return (
            <li key={f.id} className="grid grid-cols-[118px_1fr_52px] items-center gap-2 text-[13px]" title={f.name}>
              <span className="truncate">
                <span className="num font-semibold text-ink">{f.id}</span> <span className="text-muted">{featureShort(f)}</span>
              </span>
              <span className="relative h-[10px] rounded-full bg-[#1c232c]">
                {ok ? (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${v === minV ? "bg-copper" : "bg-earth/80"}`}
                    style={{ width: `${Math.max(2, (v / max) * 100)}%` }}
                  />
                ) : null}
              </span>
              <span className="num text-right text-ink">{ok ? v.toFixed(3) : "—"}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span>
          Percentile <span className="num text-ink">{fmt(selected.pct_full, 2)}</span>
        </span>
        <span>
          Slope-only (B0) <span className="num text-ink">{fmt(selected.pct_b0, 2)}</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Why this site? (deterministic text)                                  */
/* ------------------------------------------------------------------ */

const CAVEAT =
  "Geometry is not geology: the pre-registered test did not separate published yardang fields from look-alikes, so this is a morphometric candidate that needs imagery, geologic and field checks.";

function WhyCard({
  results,
  mode,
  selected,
  featureById,
}: {
  results: Results;
  mode: WorkspaceMode;
  selected: CompareScene | null;
  featureById: Map<FeatureId, Feature>;
}) {
  const compare = mode === "compare";
  return (
    <div className="rounded-[12px] border border-hairline bg-surface-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel icon="spark">{compare ? "Why this site?" : "Why this scene?"}</SectionLabel>
        <span className="rounded-full border border-hairline bg-[#0d1218] px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Computed summary — not AI
        </span>
      </div>
      <div className="mt-3 space-y-2.5 text-[14px] leading-[1.55] text-[#d9dcdf]">
        {compare && selected ? (
          <SceneSummary results={results} scene={selected} featureById={featureById} />
        ) : compare ? (
          <p className="text-muted">Select a candidate or reference site to generate its summary from the computed distances.</p>
        ) : (
          <HiriseSummary results={results} />
        )}
      </div>
    </div>
  );
}

function SceneSummary({ results, scene, featureById }: { results: Results; scene: CompareScene; featureById: Map<FeatureId, Feature> }) {
  const w1 = scene.per_feature_w1 ?? {};
  const ranked = Object.entries(w1)
    .filter(([k, v]) => featureById.has(k as FeatureId) && Number.isFinite(v))
    .sort((a, b) => a[1] - b[1]);
  const nNull = results.null_set.n_windows.toLocaleString("en-US");
  const label = (id: string) => {
    const f = featureById.get(id as FeatureId);
    return f ? `${id} ${featureShort(f).toLowerCase()}` : id;
  };
  const closest = ranked.slice(0, 2);
  const farthest = ranked.length > 2 ? ranked[ranked.length - 1] : null;
  const site = scene.site_id ? results.sites.find((s) => s.id === scene.site_id) : undefined;
  const isCandidate = scene.kind === "candidate";
  return (
    <>
      <p>
        <span className="font-medium text-ink">{sceneName(scene)}</span>
        {site ? ` (${siteRole(site)}, median-rank window)` : ""} sits at percentile{" "}
        <span className="num text-copper-light">{fmt(scene.pct_full, 2)}</span> among {nNull} Earth windows ({rankPhrase(scene.pct_full)}).
      </p>
      {closest.length ? (
        <p>
          Closest to the Mars fingerprint:{" "}
          {closest.map(([id, v], i) => (
            <span key={id}>
              {i > 0 ? " and " : ""}
              <span className="text-ink">{label(id)}</span> (W1 <span className="num">{v.toFixed(3)}</span>)
            </span>
          ))}
          {farthest ? (
            <>
              . Largest difference: <span className="text-ink">{label(farthest[0])}</span> (W1 <span className="num">{farthest[1].toFixed(3)}</span>).
            </>
          ) : (
            "."
          )}
        </p>
      ) : null}
      <p className="border-l-2 border-copper/50 pl-3 text-[13px] text-muted">
        {isCandidate
          ? CAVEAT
          : "Reference site: its rank is part of the pre-registered test, which did not pass — published yardang fields were not separated from look-alike controls."}
      </p>
    </>
  );
}

function HiriseSummary({ results }: { results: Results }) {
  const h = results.hirise;
  return (
    <>
      <p>
        At a 4 m slope baseline, <span className="num text-copper-light">{fracToPercent(h.frac_area_slope_gt15_baseline_4m)}</span> of the HiRISE scene is steeper than 15°; at the 180 m fingerprint baseline only <span className="num text-ink">{fracToPercent(h.frac_area_slope_gt15_baseline_180m)}</span> is (&gt;30°:{" "}
        <span className="num">{fracToPercent(h.frac_area_slope_gt30_baseline_4m)}</span> vs <span className="num">{fracToPercent(h.frac_area_slope_gt30_baseline_180m)}</span>).
      </p>
      <p>Most steep scarp faces PAX drives across are shorter than the 180 m baseline and are smoothed out at that scale. The Earth search therefore used the fingerprint of the separate CTX yardang area, not this HiRISE scene.</p>
      <p className="border-l-2 border-copper/50 pl-3 text-[13px] text-muted">{h.note}</p>
    </>
  );
}
