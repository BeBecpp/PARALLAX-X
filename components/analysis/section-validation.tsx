"use client";

import type { ReactNode } from "react";
import type { Criterion, Results, RobustnessCheck } from "@/lib/types";
import { Card, DataTable, SectionHeader, SubHeader, Verdict, fmt } from "./primitives";

function CriteriaTable({ criteria }: { criteria: Criterion[] | { id: string; description: string; value: string; pass: boolean }[] }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-hairline">
      <table className="w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">Pre-registered criteria</caption>
        <thead>
          <tr className="border-b border-hairline bg-[#0e131a] text-[14px] text-muted">
            <th scope="col" className="px-4 py-2 font-medium">
              Criterion
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Measured
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Outcome
            </th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c) => (
            <tr key={c.id} className="border-b border-hairline/60 align-top last:border-b-0">
              <th scope="row" className="px-4 py-3 font-normal text-ink">
                <span className="num text-muted">({c.id})</span> {c.description}
              </th>
              <td className="num px-4 py-3 text-ink">{c.value}</td>
              <td className="px-4 py-3">
                <Verdict pass={c.pass} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function decisionOf(c: RobustnessCheck): boolean | undefined {
  return c.decision_pass ?? c.pass ?? c.decision?.pass;
}

function Robustness({ title, check, extra }: { title: string; check: RobustnessCheck; extra?: ReactNode }) {
  const pass = decisionOf(check);
  const sites = Array.isArray(check.sites) ? check.sites : [];
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="font-display text-[20px] font-semibold text-ink">{title}</h4>
        <p className="text-[16px] text-muted">
          Decision: <span className="font-semibold text-ink">{pass === undefined ? "pending" : pass ? "PASS" : "FAIL"}</span>
        </p>
      </div>
      {extra ? <div className="mt-2 text-[16px] leading-[1.6] text-muted">{extra}</div> : null}
      {check.criteria?.length ? (
        <div className="mt-4">
          <CriteriaTable criteria={check.criteria} />
        </div>
      ) : null}
      {sites.length ? (
        <p className="num mt-3 text-[14px] text-muted">
          Site medians:{" "}
          {sites.map((s, i) => (
            <span key={s.id ?? i}>
              {i ? " · " : ""}
              {s.id} {fmt(s.median_pct_full ?? s.median_pct ?? null)}
            </span>
          ))}
        </p>
      ) : null}
    </Card>
  );
}

export function ValidationSection({ results: r }: { results: Results }) {
  const d = r.decision;
  const s6 = r.sensitivity_6km;
  const glo = r.glo30_check;
  const resolution = r.breakdown.find((b) => b.id === "resolution_limit");
  const others = r.breakdown.filter((b) => b.id !== "resolution_limit");
  const order = ["P1", "P2", "P3", "N1", "N2"];
  const sites = [...r.sites].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return (
    <section id="validation" aria-labelledby="validation-title" className="scroll-mt-8">
      <SectionHeader id="validation" kicker="Validation & findings" title={d.pass ? "The pre-registered validation passed" : "The pre-registered validation failed"} />

      <div className="rounded-[12px] border border-hairline bg-surface p-7 md:p-9">
        <p className="text-[14px] font-medium uppercase tracking-[0.14em] text-muted">Pre-registered decision</p>
        <p className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.01em] text-ink md:text-[52px]">{d.pass ? "PASS" : "FAIL"}</p>
        <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.6] text-[#d6d3ce]">{d.summary}</p>
      </div>

      <div className="mt-14 space-y-14">
        <div>
          <SubHeader title="Criteria" note={`All ${d.criteria.length} had to be met; ${d.criteria.filter((c) => c.pass).length} of ${d.criteria.length} were met.`} />
          <CriteriaTable criteria={d.criteria} />
        </div>

        <div>
          <SubHeader title="Reference sites" note="Median and best window percentiles, full fingerprint and slope-only baseline (B0)." />
          <div className="overflow-x-auto rounded-[10px] border border-hairline">
            <DataTable
              caption="Reference site results"
              head={["Site", "Role", "Windows", "Median (full)", "Median (B0)", "Best (full)"]}
              rows={sites.map((s) => [
                <span key="n">
                  <span className="font-semibold">{s.id}</span> {s.name}
                </span>,
                s.role,
                String(s.n_windows),
                fmt(s.median_pct_full),
                fmt(s.median_pct_b0),
                fmt(s.best_pct_full),
              ])}
            />
          </div>
        </div>

        <div>
          <SubHeader title="Robustness checks" note="Run to see whether the failure depends on window size or on the Earth elevation model." />
          <div className="space-y-5">
            {s6 ? <Robustness title={`Smaller windows (${fmt(s6.window_km ?? null, 0)} km)`} check={s6} /> : null}
            {glo ? (
              <Robustness
                title={`Independent DEM (${glo.dem ?? "GLO-30"})`}
                check={glo}
                extra={
                  <>
                    {typeof glo.spearman_rank_corr_with_nasadem === "number" ? (
                      <p>
                        Spearman rank correlation with NASADEM window ranks: <span className="num text-ink">{fmt(glo.spearman_rank_corr_with_nasadem, 3)}</span>
                        {typeof glo.n_common_windows === "number" ? (
                          <>
                            {" "}
                            over <span className="num text-ink">{glo.n_common_windows.toLocaleString("en-US")}</span> common windows
                          </>
                        ) : null}
                        .
                      </p>
                    ) : null}
                    {glo.status ? <p className="mt-1 text-[15px]">Status: {glo.status}.</p> : null}
                  </>
                }
              />
            ) : null}
          </div>
        </div>

        {resolution ? (
          <div>
            <SubHeader title="Why it may have failed: a resolution limit" note={r.diagnostics?.status ? `Post-hoc diagnostic — ${r.diagnostics.status}.` : "Post-hoc diagnostic."} />
            <Card className="p-6">
              <p className="text-[17px] leading-[1.65] text-[#d6d3ce]">{resolution.text}</p>
              {resolution.source ? <p className="mt-3 text-[14px] text-muted">Source: {resolution.source}</p> : null}
            </Card>
          </div>
        ) : null}

        <div>
          <SubHeader title="Where the Mars–Earth analogy breaks down" note="Even a perfect shape match would not make an Earth site equivalent to Mars." />
          <ul className="grid gap-4 md:grid-cols-2">
            {others.map((b) => (
              <li key={b.id} className="rounded-[10px] border border-hairline bg-surface p-5">
                <h4 className="font-display text-[18px] font-semibold text-ink">{b.title}</h4>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#d6d3ce]">{b.text}</p>
                {b.source ? <p className="mt-3 text-[13px] leading-snug text-muted">Source: {b.source}</p> : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SubHeader title="Run caveats" />
          <ul className="list-disc space-y-2 pl-5 text-[16px] leading-[1.6] text-[#d6d3ce] marker:text-muted">
            {r.run.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className="num mt-4 text-[14px] text-muted">
            Run {r.run.run_utc} · status {r.run.status}
            {r.run.exported_utc ? ` · exported ${r.run.exported_utc}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
