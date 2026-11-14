"use client";

import type { ReactNode } from "react";
import type { Results, SourceRecord } from "@/lib/types";
import { DataTable, Expand, SectionHeader, fmt, fmtInt } from "./primitives";
import { W1Explainer } from "./w1-explainer";

function Step({ n, title, plain, children }: { n: number; title: string; plain: ReactNode; children: ReactNode }) {
  return (
    <li className="grid gap-4 border-t border-hairline py-7 md:grid-cols-[64px_1fr]">
      <span className="num text-[28px] font-medium leading-none text-copper-light" aria-hidden>
        {String(n).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-[22px] font-semibold text-ink">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <p className="mt-2 max-w-[68ch] text-[17px] leading-[1.6] text-[#d6d3ce]">{plain}</p>
        <Expand summary="Technical detail">{children}</Expand>
      </div>
    </li>
  );
}

export function MethodSection({ results: r, sources }: { results: Results; sources: SourceRecord[] | null }) {
  const p = r.run.parameters;
  const src = (id: string) => sources?.find((s) => s.id === id);
  const ctx = src("ctx");
  const nasadem = src("nasadem");
  const hirise = src("hirise");

  return (
    <section id="method" aria-labelledby="method-title" className="scroll-mt-8">
      <SectionHeader
        id="method"
        kicker="Scientific method"
        title="Seven steps, frozen before any result was computed"
        lead={
          <p>
            The study design was pre-registered and committed before any Mars–Earth distance was calculated. Each step below has a plain summary and
            the technical detail behind it.
          </p>
        }
      />
      <div className="mb-10">
        <W1Explainer results={r} />
      </div>
      <ol className="border-b border-hairline">
        <Step n={1} title="Acquire NASA and Earth elevation data" plain="Download public terrain models: a CTX stereo model of the Mars yardangs, a HiRISE model of a nearby scarp, and NASADEM tiles for Earth.">
          <ul className="space-y-2">
            {[ctx, hirise, nasadem].filter(Boolean).map((s) =>
              s ? (
                <li key={s.id}>
                  <span className="text-ink">{s.id.toUpperCase()}</span> — {s.product_id}
                  {s.posting_m !== null && s.posting_m !== undefined ? <> · posting {String(s.posting_m)} m</> : null}
                  {s.effective_resolution_note ? <> · {s.effective_resolution_note}</> : null}
                </li>
              ) : null,
            )}
          </ul>
        </Step>
        <Step n={2} title="Reproject and match scales" plain="Put both planets on the same 30 m grid and blur them identically, so neither side has an unfair resolution advantage.">
          <p>
            Grid <span className="num text-ink">{String(p.grid_m)} m</span>; Gaussian smoothing σ = <span className="num text-ink">{String(p.smoothing_sigma_m)} m</span> on
            both planets; windows of <span className="num text-ink">{String(p.window_km)} km</span>; windows with more than{" "}
            <span className="num text-ink">{fmt(Number(p.max_invalid_frac) * 100, 0)}%</span> invalid cells are dropped. Mars is reprojected to a local
            equidistant-cylindrical grid; each Earth tile to an azimuthal-equidistant grid centred on the tile.
          </p>
        </Step>
        <Step n={3} title="Extract terrain features" plain="Measure five shape properties everywhere: relief, slope at two scales, local height position, and how ridge-like the terrain is.">
          <div className="overflow-x-auto rounded-[8px] border border-hairline">
            <DataTable
              caption="Fingerprint features"
              head={["Feature", "Units", "Baseline", "Definition"]}
              rows={r.features.map((f) => [`${f.id} ${f.name}`, f.units, `${f.baseline_m} m`, <span key="d" className="font-sans">{f.description}</span>])}
            />
          </div>
          <p className="mt-3">Each region is plane-detrended first. All baselines are ≥ 150 m because a 30 m grid cannot support finer slopes.</p>
        </Step>
        <Step n={4} title="Compute distribution distances" plain="For each Earth window, measure how far each feature's distribution is from the Mars distribution, then average the five distances.">
          <p>
            Feature values are mapped through the empirical CDF of pooled null-window values (random subsample, seed{" "}
            <span className="num text-ink">{String(p.ecdf_sample_seed)}</span>). The per-feature distance is the one-dimensional Wasserstein-1 (W1)
            distance — the average gap between matching quantiles — computed from <span className="num text-ink">{String(p.n_quantiles)}</span>{" "}
            quantiles, so it is in normalized units between 0 and 1. Score D is the equal-weight mean of F1–F5. Baseline B0 is W1 of F2 (slope) alone.
          </p>
        </Step>
        <Step n={5} title="Rank windows" plain="Convert each window's distance to a percentile: the share of searched Earth windows that are farther from Mars.">
          <p>
            Percentiles are relative to the <span className="num text-ink">{fmtInt(r.null_set.n_windows)}</span> null windows (all Gobi and Lut windows,
            excluding the Kaluts reference polygon). Higher means more similar. A percentile is not a probability and not a &ldquo;% match&rdquo;.
          </p>
        </Step>
        <Step n={6} title="Compare with positive and negative controls" plain="Check that published Earth yardang fields rank high, and above look-alikes formed by other processes (dunes, fold ridges).">
          <p>Site percentile = median window percentile inside its polygon. PASS required all of:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {r.decision.criteria.map((c) => (
              <li key={c.id}>
                ({c.id}) {c.description}
              </li>
            ))}
          </ul>
          <p className="mt-2">Pass percentile: <span className="num text-ink">{String(p.pass_percentile)}</span>.</p>
        </Step>
        <Step n={7} title="Report validation and limitations" plain="Publish the pass/fail outcome as pre-registered, with robustness checks, deviations and limitations — whatever the result.">
          <dl className="grid gap-x-6 gap-y-2 md:grid-cols-[200px_1fr]">
            <dt>Pre-registration commit</dt>
            <dd className="num break-all text-ink">{r.run.prereg_commit}</dd>
            <dt>Pre-registration file SHA-256</dt>
            <dd className="num break-all text-ink">{r.run.prereg_file_sha256}</dd>
            {r.run.code_commit ? (
              <>
                <dt>Code commit</dt>
                <dd className="num break-all text-ink">{r.run.code_commit}</dd>
              </>
            ) : null}
            <dt>Run (UTC)</dt>
            <dd className="num text-ink">{r.run.run_utc}</dd>
          </dl>
          <p className="mt-3">
            Deviations from the pre-registration are logged in <span className="num text-ink">science/DEVIATIONS.md</span>.
            {r.glo30_check?.status ? <> GLO-30 check: {r.glo30_check.status}.</> : null}
            {r.diagnostics?.status ? <> Diagnostics: {r.diagnostics.status}.</> : null}
          </p>
        </Step>
      </ol>
    </section>
  );
}
