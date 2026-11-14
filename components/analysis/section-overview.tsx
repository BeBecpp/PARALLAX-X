"use client";

import type { ReactNode } from "react";
import type { Results, SourceRecord } from "@/lib/types";
import { formatCoord, rankPhrase } from "@/lib/format";
import { Card, SectionHeader, Verdict, fmt, fmtInt } from "./primitives";

function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-hairline py-8 md:grid-cols-[220px_1fr] md:gap-10">
      <h3 className="font-display text-[20px] font-semibold leading-snug text-ink">{q}</h3>
      <div className="space-y-4 text-[17px] leading-[1.65] text-[#d6d3ce]">{children}</div>
    </div>
  );
}

export function OverviewSection({ results: r, sources }: { results: Results; sources: SourceRecord[] | null }) {
  const p = r.run.parameters;
  const ctx = sources?.find((s) => s.id === "ctx");
  const hirise = sources?.find((s) => s.id === "hirise");
  const nn = r.null_set;
  const top = [...r.candidates].sort((a, b) => b.best_pct - a.best_pct);
  const s6 = r.sensitivity_6km;
  const glo = r.glo30_check;
  const rho = glo?.spearman_rank_corr_with_nasadem;
  const passPct = Number(p.pass_percentile);

  return (
    <section id="overview" aria-labelledby="overview-title" className="scroll-mt-8">
      <SectionHeader
        id="overview"
        kicker="Overview"
        title="Our pre-registered fingerprint did not reliably distinguish published yardang analogs from terrain look-alikes."
        lead={
          <p>
            We compared the terrain geometry of wind-carved ridges (yardangs) in the Medusae Fossae Formation on Mars with windows of Earth terrain.
            The test we committed to in advance failed, so everything that ranks highly on Earth is an exploratory morphometric candidate, not a
            confirmed analog.
          </p>
        }
      />

      <QA q="What Mars region was analyzed?">
        <p>
          A pre-registered yardang polygon in the Medusae Fossae Formation (MFF), centred near{" "}
          <span className="num text-ink">{r.mars ? formatCoord(r.mars.centre_lonlat, "Mars") : "—"}</span>. Its elevation comes from a USGS CTX
          stereo terrain model{ctx?.posting_m ? <> posted at <span className="num text-ink">{fmt(Number(ctx.posting_m), 1)} m</span></> : null}, resampled
          to a common <span className="num text-ink">{String(p.grid_m)} m</span> grid and smoothed identically to the Earth data.
        </p>
        <p>
          Separately, a HiRISE terrain model{hirise?.posting_m ? <> (<span className="num text-ink">{fmt(Number(hirise.posting_m), 2)} m</span> posting)</> : null}{" "}
          of an MFF scarp is used as a high-resolution patch: it shows what fine-scale slopes a 30 m analysis cannot see. It is not part of the fingerprint.
        </p>
      </QA>

      <QA q="What Earth areas were searched?">
        <p>
          Two declared desert domains, not the whole planet: the Trans-Altai Gobi (D1, clipped to Mongolia) and the Lut Desert (D2, excluding the
          Kaluts reference polygon). Together they give <span className="num text-ink">{fmtInt(nn.n_windows)}</span> NASADEM windows of about{" "}
          <span className="num text-ink">{fmt(Number(p.window_km), 0)} km</span> each
          {Object.keys(nn.by_domain).length ? (
            <>
              {" "}
              (
              {Object.entries(nn.by_domain).map(([k, v], i) => (
                <span key={k}>
                  {i ? ", " : ""}
                  {k}: <span className="num text-ink">{fmtInt(v)}</span>
                </span>
              ))}
              )
            </>
          ) : null}
          . Every percentile in this app is relative to these windows only.
        </p>
      </QA>

      <QA q="What did the method find?">
        <p>
          The windows closest to the Mars fingerprint cluster in the Gobi domain
          {typeof r.n_clusters_total === "number" ? (
            <>
              {" "}
              (<span className="num text-ink">{r.n_clusters_total}</span> clusters in total)
            </>
          ) : null}
          . The highest-ranked are listed below. They are terrain-geometry matches only; we found no literature describing them as Mars analogs.
        </p>
        <ul className="divide-y divide-hairline rounded-[10px] border border-hairline bg-surface">
          {top.slice(0, 5).map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3 text-[16px]">
              <span className="font-semibold text-ink">{c.id}</span>
              <span className="num text-muted">{formatCoord(c.centroid, "Earth")}</span>
              <span className="text-muted">
                best window in the <span className="num text-ink">{rankPhrase(c.best_pct)}</span> · <span className="num">{c.n_windows}</span> windows
              </span>
            </li>
          ))}
        </ul>
      </QA>

      <QA q="How trustworthy is it?">
        <p>
          Not enough to call any Earth site an analog. Before computing any Mars–Earth distance, we required the method to rank published yardang
          fields above ordinary terrain and above process-different look-alikes. It did not:
        </p>
        <Card className="divide-y divide-hairline">
          {r.decision.criteria.map((c) => (
            <div key={c.id} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_auto] md:gap-6">
              <div>
                <p className="text-[16px] text-ink">
                  <span className="num text-muted">({c.id})</span> {c.description}
                </p>
                <p className="num mt-1 text-[15px] text-muted">Measured: {c.value}</p>
              </div>
              <div className="text-[16px] md:text-right">
                <Verdict pass={c.pass} />
              </div>
            </div>
          ))}
        </Card>
        <p>
          Robustness checks agree.{" "}
          {s6 ? (
            <>
              With smaller <span className="num text-ink">{fmt(s6.window_km ?? null, 0)} km</span> windows the decision is{" "}
              <span className="font-semibold text-ink">{s6.decision_pass ? "PASS" : "FAIL"}</span>.{" "}
            </>
          ) : null}
          {glo ? (
            <>
              Re-running on {glo.dem ?? "an independent DEM"} gives <span className="font-semibold text-ink">{glo.decision_pass ? "PASS" : "FAIL"}</span>
              {typeof rho === "number" ? (
                <>
                  , with window ranks that closely track NASADEM (Spearman rank correlation <span className="num text-ink">{fmt(rho, 2)}</span>)
                </>
              ) : null}
              .
            </>
          ) : null}{" "}
          A pass required site medians at or above the <span className="num text-ink">{passPct}</span>th percentile.
        </p>
      </QA>

      <QA q="What should happen next?">
        <p>We recommend, before any candidate is treated as more than a terrain-geometry match:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-copper">
          <li>Inspect high-resolution optical imagery of each candidate for streamlined, wind-aligned ridges.</li>
          <li>Check geologic maps for lithology and induration compared with Medusae Fossae material.</li>
          <li>Compare dominant wind directions with ridge orientation using reanalysis or station wind data.</li>
          <li>Repeat the analysis with higher-resolution Earth elevation models or drone lidar, so that decametre-scale yardangs can be resolved.</li>
          <li>Plan field checks only after the steps above support a candidate.</li>
        </ul>
      </QA>
    </section>
  );
}
