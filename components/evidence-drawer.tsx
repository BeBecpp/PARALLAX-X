"use client";

import { useEffect, useRef } from "react";
import type { Loadable } from "@/lib/data";
import type { Results, RobustnessCheck, SourceRecord } from "@/lib/types";
import { rankLabel, shortHash, formatCoord } from "@/lib/format";
import { NotAvailable } from "./ui";

export type EvidenceTab = "result" | "method" | "sources" | "limits" | "ai";

const TABS: { id: EvidenceTab; label: string }[] = [
  { id: "result", label: "Result" },
  { id: "method", label: "Method" },
  { id: "sources", label: "Sources" },
  { id: "limits", label: "Limits" },
  { id: "ai", label: "AI use" },
];

import { AI_USE_TEXT } from "@/lib/ai-disclosure";
export { AI_USE_TEXT };

const PIPELINE = [
  ["Source", "Public terrain models: HiRISE / CTX stereo DTMs (Mars), NASADEM (Earth)."],
  ["Mask & project", "No-data masked; each window projected to a local metric grid."],
  ["Match scale", "Both planets resampled to a common grid that both data sets resolve."],
  ["Features", "Shape statistics F1–F5 computed per window (table below)."],
  ["Distance", "Each Earth window compared with the Mars fingerprint, feature by feature."],
  ["Rank", "Percentile against the null set of Earth windows (higher = more similar). Not a probability."],
];

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border-b border-hairline py-2 pr-3 text-[14px] font-medium text-muted ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return <td className={`border-b border-hairline py-2 pr-3 align-top text-[14px] ${right ? "text-right" : ""} ${mono ? "num" : ""}`}>{children}</td>;
}

function checkPass(c: RobustnessCheck): boolean | null {
  if (typeof c.pass === "boolean") return c.pass;
  if (typeof c.decision_pass === "boolean") return c.decision_pass;
  if (c.decision && typeof c.decision.pass === "boolean") return c.decision.pass;
  return null;
}

function RobustnessBlock({ title, check, r }: { title: string; check: RobustnessCheck | null | undefined; r: Results }) {
  if (!check) {
    return (
      <div className="rounded-[8px] border border-dashed border-hairline p-3 text-[14px]">
        <span className="font-medium text-ink">{title}</span> <span className="text-muted">— pending (not yet published by the pipeline).</span>
      </div>
    );
  }
  const pass = checkPass(check);
  const summary = check.decision?.summary ?? check.summary;
  const names = new Map(r.sites.map((s) => [s.id, s.name]));
  let rows: [string, number | null][] = [];
  if (Array.isArray(check.sites)) {
    rows = check.sites.map((s) => [s.name ?? names.get(s.id ?? "") ?? s.id ?? "—", s.median_pct_full ?? s.median_pct ?? null]);
  } else if (check.sites && typeof check.sites === "object") {
    rows = Object.entries(check.sites).map(([k, v]) => [names.get(k) ?? k, typeof v === "number" ? v : null]);
  }
  return (
    <div className="rounded-[8px] border border-hairline p-3">
      <p className="text-[14px] font-medium text-ink">
        {title}
        {pass !== null ? <span className="ml-2 text-muted">— decision: {pass ? "pass" : "did not pass"}</span> : null}
      </p>
      {summary ? <p className="mt-1 text-[14px] text-muted">{summary}</p> : null}
      {Array.isArray(check.criteria) ? (
        <ul className="mt-1 space-y-0.5 text-[14px] text-muted">
          {check.criteria.map((c) => (
            <li key={c.id}>
              <span className="num">({c.id})</span> {c.pass ? "met" : "not met"}: <span className="num text-ink">{c.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {typeof check.spearman_rank_corr_with_nasadem === "number" ? (
        <p className="mt-1 text-[14px] text-muted">
          Rank agreement with the NASADEM run (Spearman ρ over <span className="num">{check.n_common_windows}</span> windows):{" "}
          <span className="num text-ink">{check.spearman_rank_corr_with_nasadem.toFixed(3)}</span>
        </p>
      ) : null}
      {rows.length ? (
        <table className="mt-2 w-full">
          <thead>
            <tr>
              <Th>Site</Th>
              <Th right>Median pct</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([n, v]) => (
              <tr key={n}>
                <Td>{n}</Td>
                <Td right mono>
                  {v === null ? "—" : v.toFixed(1)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function ResultTab({ r }: { r: Results }) {
  return (
    <div className="space-y-6">
      <div className={`rounded-[8px] border p-4 ${r.decision.pass ? "border-copper" : "border-hairline"}`}>
        <p className="text-[14px] uppercase tracking-[0.1em] text-muted">Pre-registered decision</p>
        <p className="mt-1 font-display text-[20px] font-semibold">
          {r.decision.pass ? "Validation passed" : "Validation failed — candidates are exploratory"}
        </p>
        {!r.decision.pass ? (
          <p className="mt-1 text-[14px] text-muted">
            The pre-registered test checks whether published yardang sites rank highly. They did not, so the method is not validated
            and Gobi rankings are shown as exploratory morphometric candidates only. This is a method-audit result, reported as declared in advance.
          </p>
        ) : null}
        <p className="mt-2 text-[15px] text-ink">{r.decision.summary}</p>
        {r.run.status === "partial" ? <p className="mt-2 text-[14px] text-muted">Run status: partial.</p> : null}
      </div>
      <section>
        <h3 className="mb-2 text-[15px] font-medium">Criteria</h3>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Criterion · measured value</Th>
              <Th right>Result</Th>
            </tr>
          </thead>
          <tbody>
            {r.decision.criteria.map((c) => (
              <tr key={c.id}>
                <Td>
                  <span className="num text-muted">{c.id}</span> {c.description}
                  <div className="num mt-1 text-ink">{c.value}</div>
                </Td>
                <Td right>{c.pass ? "pass" : "fail"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-2 text-[15px] font-medium">Reference sites</h3>
        <p className="mb-2 text-[14px] text-muted">
          Percentile vs the null set of <span className="num">{r.null_set.n_windows}</span> Earth windows; higher = more similar to the Mars fingerprint. B0 = baseline comparison.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px]">
            <thead>
              <tr>
                <Th>Site</Th>
                <Th right>Windows</Th>
                <Th right>Median pct</Th>
                <Th right>B0</Th>
              </tr>
            </thead>
            <tbody>
              {r.sites.map((s) => (
                <tr key={s.id}>
                  <Td>
                    {s.name}
                    <div className="text-[14px] text-muted">{s.role === "positive" ? "published yardang analog (control)" : "process-different control"}</div>
                  </Td>
                  <Td right mono>
                    {s.n_windows}
                  </Td>
                  <Td right mono>
                    {s.median_pct_full === null ? "—" : s.median_pct_full.toFixed(1)}
                  </Td>
                  <Td right mono>
                    {s.median_pct_b0 === null ? "—" : s.median_pct_b0.toFixed(1)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-[15px] font-medium">Robustness checks</h3>
        <RobustnessBlock title="Sensitivity: 6 km windows" check={r.sensitivity_6km} r={r} />
        <RobustnessBlock title="Earth DEM swap: Copernicus GLO-30" check={r.glo30_check} r={r} />
      </section>
      {r.candidates.length ? (
        <section>
          <h3 className="mb-2 text-[15px] font-medium">Morphometric candidates</h3>
          <ul className="space-y-2 text-[14px]">
            {r.candidates.map((c) => (
              <li key={c.id} className="border-b border-hairline pb-2">
                <span className="font-medium text-ink">Gobi {c.id}</span>{" "}
                <span className="num text-ink">{formatCoord(c.centroid, "Earth")}</span> — {c.label} — {rankLabel(c.best_pct)} (best window), <span className="num">{c.n_windows}</span> windows,{" "}
                <span className="num">{c.area_km2.toFixed(0)}</span> km²
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MethodTab({ r }: { r: Results | null }) {
  return (
    <div className="space-y-6">
      <ol className="space-y-2">
        {PIPELINE.map(([t, d], i) => (
          <li key={t} className="flex gap-3 text-[14px]">
            <span className="num w-5 shrink-0 text-muted">{i + 1}</span>
            <span>
              <span className="font-medium text-ink">{t}.</span> <span className="text-muted">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      {r ? (
        <>
          <section>
            <h3 className="mb-2 text-[15px] font-medium">Features</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Feature</Th>
                  <Th right>Baseline</Th>
                </tr>
              </thead>
              <tbody>
                {r.features.map((f) => (
                  <tr key={f.id}>
                    <Td mono>{f.id}</Td>
                    <Td>
                      {f.name} <span className="text-muted">({f.units})</span>
                      <div className="text-muted">{f.description}</div>
                    </Td>
                    <Td right mono>
                      {f.baseline_m} m
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="space-y-1 text-[14px]">
            <h3 className="mb-2 text-[15px] font-medium">Pre-registration</h3>
            <p>
              <span className="text-muted">Commit </span>
              <span className="num break-all">{r.run.prereg_commit}</span>
            </p>
            <p>
              <span className="text-muted">Protocol file SHA-256 </span>
              <span className="num break-all">{r.run.prereg_file_sha256}</span>
            </p>
            <p>
              <span className="text-muted">Run (UTC) </span>
              <span className="num">{r.run.run_utc}</span>
            </p>
            {r.run.code_commit ? (
              <p>
                <span className="text-muted">Code commit </span>
                <span className="num break-all">{r.run.code_commit}</span>
              </p>
            ) : null}
          </section>
          {r.diagnostics?.groups?.length ? (
            <section>
              <h3 className="mb-1 text-[15px] font-medium">Post-hoc diagnostics</h3>
              <p className="mb-2 text-[14px] text-muted">{r.diagnostics.status ?? "Descriptive only; does not alter the pre-registered decision."}</p>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Group</Th>
                    <Th right>Windows</Th>
                    <Th right>Median pct</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.diagnostics.groups.map((g) => (
                    <tr key={g.group}>
                      <Td>{g.group}</Td>
                      <Td right mono>
                        {g.n}
                      </Td>
                      <Td right mono>
                        {typeof g.median_pct === "number" ? g.median_pct.toFixed(1) : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {Object.keys(r.run.parameters).length ? (
            <section>
              <h3 className="mb-2 text-[15px] font-medium">Parameters</h3>
              <table className="w-full">
                <tbody>
                  {Object.entries(r.run.parameters).map(([k, v]) => (
                    <tr key={k}>
                      <Td mono>{k}</Td>
                      <Td right mono>
                        {String(v)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : (
        <NotAvailable what="Feature table and pre-registration hash" />
      )}
    </div>
  );
}

function SourcesTab({ sources }: { sources: Loadable<SourceRecord[]> }) {
  if (sources.status !== "ready") return <NotAvailable what="Source records (sources.json)" />;
  return (
    <ul className="space-y-4">
      {sources.data.map((s) => (
        <li key={s.id} className="rounded-[8px] border border-hairline p-3 text-[14px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{s.provider}</span>
            <span className={s.planet?.toLowerCase() === "mars" ? "text-[#e3a585]" : "text-[#9cc3d1]"}>{s.planet}</span>
          </div>
          <a href={s.url} target="_blank" rel="noreferrer" className="num mt-1 block break-all text-ink underline decoration-hairline underline-offset-4 hover:decoration-copper">
            {s.product_id}
          </a>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted">
            <dt>Posting</dt>
            <dd className="num text-ink">{s.posting_m ?? "—"}{typeof s.posting_m === "number" ? " m" : ""}</dd>
            {s.effective_resolution_note ? (
              <>
                <dt>Resolution</dt>
                <dd className="text-ink">{s.effective_resolution_note}</dd>
              </>
            ) : null}
            <dt>Licence</dt>
            <dd className="text-ink">{s.licence}</dd>
            <dt>Used for</dt>
            <dd className="text-ink">{s.usage}</dd>
            <dt>Retrieved</dt>
            <dd className="num text-ink">{s.retrieved_utc}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function LimitsTab({ r }: { r: Results }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[15px] font-medium">Where the analogy breaks down</h3>
        <ul className="space-y-3">
          {r.breakdown.map((b) => (
            <li key={b.id} className="text-[14px]">
              <p className="font-medium text-ink">{b.title}</p>
              <p className="text-muted">{b.text}</p>
              {b.source ? <p className="mt-1 text-[14px] text-muted">Source: {b.source}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      {r.run.caveats.length ? (
        <section>
          <h3 className="mb-2 text-[15px] font-medium">Run caveats</h3>
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-muted">
            {r.run.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {r.hirise.note ? (
        <section>
          <h3 className="mb-2 text-[15px] font-medium">HiRISE resolution note</h3>
          <p className="text-[14px] text-muted">{r.hirise.note}</p>
        </section>
      ) : null}
    </div>
  );
}

export function EvidenceDrawer({
  open,
  tab,
  onTab,
  onClose,
  results,
  sources,
}: {
  open: boolean;
  tab: EvidenceTab;
  onTab: (t: EvidenceTab) => void;
  onClose: () => void;
  results: Loadable<Results>;
  sources: Loadable<SourceRecord[]>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  const r = results.status === "ready" ? results.data : null;
  return (
    <aside
      role="dialog"
      aria-label="Evidence"
      className="drawer-in fixed inset-0 z-40 flex flex-col border-l border-hairline bg-bg md:inset-y-0 md:left-auto md:right-0 md:w-[440px]"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="font-display text-[20px] font-semibold">Evidence</h2>
        <button ref={closeRef} type="button" onClick={onClose} className="min-h-[40px] rounded-[8px] px-3 text-[15px] text-muted hover:text-ink" aria-label="Close evidence drawer">
          Close
        </button>
      </div>
      <div role="tablist" aria-label="Evidence sections" className="flex gap-1 overflow-x-auto border-b border-hairline px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[15px] ${tab === t.id ? "border-copper text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5" role="tabpanel">
        {tab === "result" ? r ? <ResultTab r={r} /> : <NotAvailable what="Results (results.json)" /> : null}
        {tab === "method" ? <MethodTab r={r} /> : null}
        {tab === "sources" ? <SourcesTab sources={sources} /> : null}
        {tab === "limits" ? r ? <LimitsTab r={r} /> : <NotAvailable what="Limits (results.json)" /> : null}
        {tab === "ai" ? <p className="text-[15px] leading-relaxed text-ink">{AI_USE_TEXT}</p> : null}
        {r ? (
          <p className="mt-8 text-[14px] text-muted">
            Pre-registration <span className="num">{shortHash(r.run.prereg_commit, 10)}</span>
          </p>
        ) : null}
      </div>
    </aside>
  );
}
