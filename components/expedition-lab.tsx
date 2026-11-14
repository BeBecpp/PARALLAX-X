"use client";

import { useMemo, useState } from "react";
import type { FieldTest } from "@/lib/data";
import type { Results } from "@/lib/types";
import {
  buildDossier,
  candidateOf,
  dossierToMarkdown,
  EVIDENCE_HELP,
  EVIDENCE_LABEL,
  EXPERIMENTS,
  whyThisLocation,
  type Dossier,
  type Evidence,
  type EvidenceClass,
  type ExperimentId,
} from "@/lib/expedition";
import { formatLat } from "@/lib/format";
import { sfx } from "@/lib/audio";

/**
 * EXPEDITION LAB — Planetary Analog Field-Test Planner.
 * Presentation only: every value comes from lib/expedition.ts (results.json + fieldtest.json) and every unknown is
 * shown as unknown. Left = mission & experiment, right = field-test protocol; the 3D viewports stay in the centre.
 */

const CLS_STYLE: Record<EvidenceClass, string> = {
  measured: "border-[#7FD1A0]/45 bg-[#7FD1A0]/10 text-[#b5ead0]",
  derived: "border-[#8FB8D6]/45 bg-[#8FB8D6]/10 text-[#c4dcee]",
  contextual: "border-[#B8A3D9]/45 bg-[#B8A3D9]/10 text-[#d9ccef]",
  "not-measured": "border-[#5a6672] bg-[#1a222b] text-[#b7c0c9]",
  "field-required": "border-[#E0A66A]/55 bg-[#E0A66A]/10 text-[#f3cfa3]",
};

export function EvidenceChip({ cls }: { cls: EvidenceClass }) {
  return (
    <span title={EVIDENCE_HELP[cls]} className={`inline-flex shrink-0 items-center rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-[0.1em] ${CLS_STYLE[cls]}`}>
      {EVIDENCE_LABEL[cls]}
    </span>
  );
}

function EvidenceRow({ e }: { e: Evidence }) {
  return (
    <li className="rounded-[10px] border border-hairline bg-bg/50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">{e.label}</p>
        <EvidenceChip cls={e.cls} />
      </div>
      <p className="num mt-1 text-[13px] leading-snug text-ink/90">{e.value}</p>
      {e.note ? <p className="mt-1 text-[12px] leading-snug text-muted">{e.note}</p> : null}
      {e.source ? <p className="num mt-1 truncate text-[11px] text-muted/80" title={e.source}>{e.source}</p> : null}
    </li>
  );
}

function H({ n, children }: { n?: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-copper-light">
      {n ? <span className="num text-muted">{n}</span> : null}
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* LEFT — mission & experiment                                          */
/* ------------------------------------------------------------------ */
export function LabMissionPanel({
  results: r,
  candidateId,
  experiment,
  onCandidate,
  onExperiment,
  onBack,
}: {
  results: Results;
  candidateId: string;
  experiment: ExperimentId;
  onCandidate: (id: string) => void;
  onExperiment: (e: ExperimentId) => void;
  onBack: () => void;
}) {
  const cand = candidateOf(r, candidateId);
  const scene = r.compare_scenes.find((s) => s.id === cand?.sceneId);
  const why = useMemo(() => whyThisLocation(r, candidateId), [r, candidateId]);
  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-[12px] border border-copper/30 bg-surface/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] lab-in" aria-label="Expedition Lab mission">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[20px] font-semibold uppercase tracking-[0.06em] text-ink">Expedition Lab</p>
          <button type="button" onClick={onBack} className="min-h-[34px] rounded-[8px] border border-hairline px-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted hover:border-copper hover:text-ink">
            ← Compare
          </button>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">From planetary evidence to real-world field experiments.</p>
      </div>

      <div className="rounded-[12px] border border-hairline bg-bg/60 p-3">
        <H>Selected Earth candidate</H>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="font-display text-[26px] font-semibold leading-none text-ink">{candidateId}</p>
          <p className="num text-right text-[12px] text-ink/85">
            {cand ? `${formatLat(cand.lat)} · ${cand.lon.toFixed(2)}°E` : "—"}
          </p>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-muted">Gobi, Mongolia · exploratory morphometric candidate — not a confirmed Mars analog.</p>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
          <div>
            <dt className="text-muted">Rank</dt>
            <dd className="num text-ink">{scene?.pct_full?.toFixed(2) ?? "—"} pct</dd>
          </div>
          <div>
            <dt className="text-muted">Windows</dt>
            <dd className="num text-ink">{cand?.nWindows ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Area</dt>
            <dd className="num text-ink">{cand ? Math.round(cand.areaKm2) : "—"} km²</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Candidate">
          {r.candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === candidateId}
              onClick={() => onCandidate(c.id)}
              className={`num min-h-[30px] rounded-[7px] border px-2 text-[12px] font-semibold ${c.id === candidateId ? "border-copper bg-copper/15 text-ink" : "border-hairline text-muted hover:text-ink"}`}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      <div>
        <H>Choose an experiment</H>
        <div className="mt-2 space-y-2" role="radiogroup" aria-label="Field experiment">
          {EXPERIMENTS.map((e) => {
            const on = e.id === experiment;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  sfx("select");
                  onExperiment(e.id);
                }}
                className={`group w-full rounded-[10px] border p-3 text-left transition-colors ${on ? "border-copper bg-copper/10 shadow-[0_0_0_1px_rgba(201,121,81,0.35)]" : "border-hairline bg-bg/40 hover:border-[#3d4a57]"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="num text-[12px] text-copper-light">{e.n}</span>
                    <span className="font-display text-[16px] font-semibold text-ink">{e.title}</span>
                  </span>
                  {e.id === "mobility" ? <span className="rounded-full border border-copper/40 px-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-copper-light">Primary</span> : null}
                </span>
                <span className="mt-1 block text-[12px] leading-snug text-muted">{e.question}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <H>Why investigate this location?</H>
        <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/80">Why it may be interesting</p>
        <ul className="mt-1.5 space-y-1.5">
          {why.matches.map((m) => (
            <li key={m.label} className="flex items-start justify-between gap-2 text-[12px]">
              <span className="text-ink/90">
                {m.label} <span className="num text-muted">({m.value.match(/W1 = [\d.]+/)?.[0]})</span>
              </span>
              <EvidenceChip cls={m.cls} />
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[11px] leading-snug text-muted">Closest of the five terrain-shape distributions to Mars. A rank among {r.null_set.n_windows.toLocaleString("en-US")} declared windows is not analog confidence — the method failed its pre-registered validation.</p>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/80">What we still don&apos;t know</p>
        <ul className="mt-1.5 space-y-1.5">
          {why.uncertain.map((u) => (
            <li key={u.label} className="flex items-start justify-between gap-2 text-[12px]">
              <span className="text-ink/90">{u.label}</span>
              <EvidenceChip cls={u.cls} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto rounded-[10px] border border-hairline bg-bg/40 p-3">
        <H>Evidence classes</H>
        <ul className="mt-2 space-y-1.5">
          {(Object.keys(EVIDENCE_LABEL) as EvidenceClass[]).map((c) => (
            <li key={c} className="flex items-start gap-2 text-[11px] leading-snug text-muted">
              <EvidenceChip cls={c} />
              <span>{EVIDENCE_HELP[c]}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* RIGHT — field-test protocol                                          */
/* ------------------------------------------------------------------ */
export function LabProtocolPanel({
  results: r,
  fieldtest,
  candidateId,
  experiment,
  onShowRover,
  onResolution,
}: {
  results: Results;
  fieldtest: FieldTest | null;
  candidateId: string;
  experiment: ExperimentId;
  onShowRover: () => void;
  onResolution: () => void;
}) {
  const d = useMemo(() => buildDossier(r, fieldtest, candidateId, experiment), [r, fieldtest, candidateId, experiment]);
  const [copied, setCopied] = useState(false);
  if (!d) return <aside className="rounded-[12px] border border-hairline bg-surface p-5 text-muted">Candidate not found in results.json.</aside>;
  const md = () => dossierToMarkdown(d);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md());
      setCopied(true);
      sfx("tick");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const blob = new Blob([md()], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `parallax-x_${d.candidate.id}_${d.experiment}_field-test-plan.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const isMob = d.experiment === "mobility";
  return (
    <aside key={`${candidateId}-${experiment}`} className="flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain border-l border-copper/25 bg-surface lab-in" aria-label="Field-test protocol">
      <div className="sticky top-0 z-10 border-b border-hairline bg-surface/95 px-5 pb-3 pt-4 backdrop-blur">
        <H n={EXPERIMENTS.find((e) => e.id === d.experiment)?.n}>Field-test protocol · {d.candidate.id}</H>
        <p className="mt-1 font-display text-[19px] font-semibold leading-tight text-ink">{EXPERIMENTS.find((e) => e.id === d.experiment)?.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink/85">{d.question}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="min-h-[32px] rounded-[8px] border border-hairline px-2.5 text-[12px] font-semibold text-ink/90 hover:border-copper">
            {copied ? "Copied ✓" : "Copy plan"}
          </button>
          <button type="button" onClick={download} className="min-h-[32px] rounded-[8px] border border-hairline px-2.5 text-[12px] font-semibold text-ink/90 hover:border-copper">
            Download .md
          </button>
          {isMob ? (
            <button type="button" onClick={onShowRover} className="min-h-[32px] rounded-[8px] border border-copper/50 bg-copper/10 px-2.5 text-[12px] font-semibold text-copper-light hover:bg-copper/20">
              Illustrative rover traverse ↗
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <p className="rounded-[8px] border border-[#E0A66A]/35 bg-[#E0A66A]/8 px-3 py-2 text-[12px] leading-snug text-[#f0c99a]">{d.disclaimer}</p>

        <section>
          <H n="A">Terrain evidence available now</H>
          <ul className="mt-2 space-y-2">
            {d.evidence.filter((e) => e.cls !== "not-measured" && e.cls !== "field-required").map((e) => (
              <EvidenceRow key={e.label} e={e} />
            ))}
          </ul>
          {isMob ? (
            <button type="button" onClick={onResolution} className="mt-2 w-full rounded-[8px] border border-hairline px-3 py-2 text-left text-[12px] leading-snug text-muted hover:border-copper hover:text-ink">
              <span className="font-semibold text-ink">Resolution check →</span> on the separate HiRISE Mars scene, {(r.hirise.frac_area_slope_gt15_baseline_4m * 100).toFixed(1)} % of the crop is steeper than 15° at a 4 m baseline but only {(r.hirise.frac_area_slope_gt15_baseline_180m * 100).toFixed(1)} % at 180 m. Coarse data hides wheel-scale hazards.
            </button>
          ) : null}
        </section>

        <section>
          <H n="B">What this test must measure</H>
          <ul className="mt-2 grid gap-1.5">
            {d.unknowns.map((u) => (
              <li key={u} className="flex items-center justify-between gap-2 rounded-[8px] border border-hairline bg-bg/40 px-3 py-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">{u}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{/safety/i.test(u) ? "Not established" : "Not measured"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <H n="C">Key measurements</H>
          <ul className="mt-2 space-y-2">
            {d.formulas.map((f) => (
              <li key={f.name} className="rounded-[10px] border border-hairline bg-bg/50 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-ink">{f.name}</p>
                <p className="num mt-1 text-[15px] text-copper-light">{f.expr}</p>
                <p className="mt-1 text-[12px] leading-snug text-muted">{f.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/80">Instruments</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink/90 marker:text-copper">
            {d.instruments.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <section>
          <H n="D">Protocol</H>
          <details open className="mt-2 rounded-[10px] border border-hairline bg-bg/40 px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">Objective & hypothesis</summary>
            <p className="mt-2 text-[13px] leading-snug text-ink/90">{d.objective}</p>
            <p className="mt-2 text-[13px] leading-snug text-muted">
              <span className="text-ink/90">Hypothesis.</span> {d.hypothesis}
            </p>
          </details>
          {(
            [
              ["Rover configuration to document", d.roverConfig],
              ["Controlled procedure", d.procedure],
              ["Repeated-trial strategy", d.trials],
              ["Data-quality checks", d.qualityChecks],
              ["Evaluation criteria", d.criteria],
              ["Environmental conditions to record", d.environment],
              ["Safety & field access", d.safety],
              ["Earth → Mars limitations", d.limitations],
            ] as [string, string[]][]
          ).map(([t, xs]) => (
            <details key={t} className="mt-2 rounded-[10px] border border-hairline bg-bg/40 px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink">{t}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink/90 marker:text-copper">
                {xs.map((x) => (
                  <li key={x} className={/TO BE DEFINED/.test(x) ? "text-[#f0c99a]" : undefined}>
                    {x}
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <details className="mt-2 rounded-[10px] border border-hairline bg-bg/40 px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">Variables & units</summary>
            <ul className="mt-2 space-y-1 text-[12px]">
              {d.variables.map((v) => (
                <li key={v.name} className="flex justify-between gap-2">
                  <span className="text-ink/90">
                    {v.name} <span className="num text-muted">[{v.unit}]</span>
                  </span>
                  <span className="shrink-0 text-muted">{v.status}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="rounded-[12px] border border-copper/40 bg-copper/10 p-4">
          <H n="E">Why it matters</H>
          <p className="mt-2 font-display text-[16px] font-semibold leading-snug text-ink">{d.impact}</p>
        </section>

        <section>
          <H>Sources</H>
          <ul className="mt-2 space-y-1 text-[11px] leading-snug text-muted">
            {d.citations.map((c) => (
              <li key={c.text}>
                {c.text}
                {c.url ? (
                  <>
                    {" "}
                    <a className="text-copper-light hover:underline" href={c.url} target="_blank" rel="noreferrer">
                      link
                    </a>
                  </>
                ) : null}
              </li>
            ))}
            {fieldtest ? <li>Land cover: {fieldtest.worldcover.attribution} ({fieldtest.worldcover.license.split(" - ")[0]}).</li> : null}
          </ul>
        </section>
      </div>
    </aside>
  );
}

export type { Dossier };
