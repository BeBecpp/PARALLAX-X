"use client";

import { useEffect, useState } from "react";
import { loadResults } from "@/lib/data";
import type { Results } from "@/lib/types";

/** Short place name from a site's full name ("Lut Kaluts yardangs, Iran" -> "Lut"). */
function short(name: string): string {
  return name.split(/[\s,]/)[0];
}

/**
 * Persistent statement of the pre-registered outcome. Every number is read from results.json;
 * nothing is hard-coded. Shown on the landing page and throughout Explore/Compare.
 */
export function ValidationBanner({ results, compact = false, onDetails }: { results?: Results | null; compact?: boolean; onDetails?: () => void }) {
  const [own, setOwn] = useState<Results | null>(null);
  useEffect(() => {
    if (results !== undefined) return;
    let alive = true;
    loadResults()
      .then((l) => {
        if (alive && l.status === "ready") setOwn(l.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [results]);
  const r = results ?? own;
  if (!r) return null;

  const pos = r.sites.filter((s) => s.role === "positive");
  const dunes = r.sites.find((s) => s.id === "N1");
  const ridges = r.sites.find((s) => s.id === "N2");
  const thr = Number(r.run.parameters?.pass_percentile ?? 90);
  const f = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toFixed(1));
  const verdict = r.decision.pass ? "PASSED" : "FAILED";

  return (
    <div
      role="status"
      className={`border-l-2 ${r.decision.pass ? "border-[#6A9BAD]" : "border-[#C97951]"} bg-surface/95 ${compact ? "px-4 py-2" : "px-5 py-4"} text-ink`}
    >
      <p className={compact ? "text-[14px] leading-snug" : "text-[15px] leading-relaxed"}>
        <span className="font-semibold tracking-wide">Pre-registered validation: {verdict}.</span>{" "}
        <span className="text-muted">Published yardang sites ranked</span>{" "}
        <span className="num">
          {pos.map((s, i) => (
            <span key={s.id}>
              {i ? " · " : ""}
              {short(s.name)} {f(s.median_pct_full)}
            </span>
          ))}
        </span>{" "}
        <span className="text-muted">(needed ≥{thr.toFixed(0)} for 2 of 3).</span>{" "}
        <span className="text-muted">Full fingerprint</span> <span className="num">{f(r.decision.mean_pos_full)}</span>{" "}
        <span className="text-muted">vs slope-only baseline</span> <span className="num">{f(r.decision.mean_pos_b0)}</span>.{" "}
        {dunes ? (
          <>
            <span className="text-muted">{short(dunes.name)} dune control</span> <span className="num">{f(dunes.median_pct_full)}</span>
            {ridges ? (
              <>
                , <span className="text-muted">{short(ridges.name)} ridge control</span> <span className="num">{f(ridges.median_pct_full)}</span>
              </>
            ) : null}
            .{" "}
          </>
        ) : null}
        <span className="font-medium">Gobi results are exploratory morphometric candidates, not confirmed Mars analogs.</span>
        {onDetails ? (
          <>
            {" "}
            <button type="button" onClick={onDetails} className="text-copper underline-offset-2 hover:underline">
              Evidence
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
