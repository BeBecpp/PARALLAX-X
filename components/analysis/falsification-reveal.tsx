"use client";

import { useEffect, useRef, useState } from "react";
import type { Results } from "@/lib/types";
import { sfx } from "@/lib/audio";

/**
 * "The falsification": an animated, data-driven reveal of the pre-registered test.
 * Sequence: the pass bar is drawn first, then each reference site's real median percentile grows to its value,
 * the tally of known analogs that cleared the bar counts up, and only then the verdict stamps in.
 * Every number is read from results.json; nothing is scripted except the order and timing.
 * Starts when scrolled into view; Replay re-runs it; reduced motion shows the final state.
 */
export function FalsificationReveal({ results: r }: { results: Results }) {
  const thr = Number(r.run.parameters?.pass_percentile ?? 90);
  const needed = 2;
  const order = ["P1", "P2", "P3", "N1", "N2"];
  const sites = [...r.sites].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const positives = sites.filter((s) => s.role === "positive");
  const cleared = positives.filter((s) => (s.median_pct_full ?? 0) >= thr).length;
  const topControl = sites.filter((s) => s.role === "negative").sort((a, b) => (b.median_pct_full ?? 0) - (a.median_pct_full ?? 0))[0];
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(0); // 0 idle · 1 bar · 2 sites · 3 tally · 4 verdict

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers: number[] = [];
    const play = () => {
      timers.forEach(clearTimeout);
      if (reduced) {
        timers = [window.setTimeout(() => setStage(4), 0)];
        return;
      }
      timers = [
        window.setTimeout(() => setStage(1), 0),
        window.setTimeout(() => setStage(2), 600),
        window.setTimeout(() => setStage(3), 600 + sites.length * 260 + 900),
        window.setTimeout(() => {
          setStage(4);
          sfx(r.decision.pass ? "chime" : "neutral");
        }, 600 + sites.length * 260 + 1900),
      ];
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    if (run === 0) io.observe(el);
    else {
      timers.push(window.setTimeout(() => setStage(0), 0));
      timers.push(window.setTimeout(play, 60));
    }
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [run, sites.length, r.decision.pass]);

  const W = 100; // percent scale
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[14px] border border-hairline bg-[#0d1218] p-6 md:p-8" aria-label="Animated reveal of the pre-registered validation">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-copper-light">The falsification</p>
          <h3 className="mt-1 font-display text-[24px] font-semibold text-ink md:text-[28px]">Did the terrain fingerprint recognise known Earth yardangs?</h3>
          <p className="mt-1 max-w-[70ch] text-[14px] text-muted">
            Frozen before results: at least {needed} of {positives.length} published yardang analogs must rank at or above the {thr}th percentile of {r.null_set.n_windows.toLocaleString("en-US")} Earth windows. Controls (dunes, folded ridges) should not.
          </p>
        </div>
        <button type="button" onClick={() => setRun((n) => n + 1)} className="min-h-[38px] rounded-[8px] border border-hairline px-3 text-[13px] text-muted hover:border-copper hover:text-ink">
          Replay
        </button>
      </div>

      <div className="relative mt-6">
        {/* pass bar */}
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `calc(150px + (100% - 150px - 56px) * ${thr / W})` }}>
          <div className="h-full w-[2px] origin-top bg-ink/80 transition-transform duration-500" style={{ transform: `scaleY(${stage >= 1 ? 1 : 0})` }} />
          <span className={`absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-opacity duration-300 ${stage >= 1 ? "opacity-100" : "opacity-0"}`}>pass ≥ {thr}</span>
        </div>
        <ul className="space-y-3">
          {sites.map((s, i) => {
            const v = s.median_pct_full ?? 0;
            const pos = s.role === "positive";
            const ok = v >= thr;
            return (
              <li key={s.id} className="grid grid-cols-[150px_1fr_56px] items-center gap-0">
                <span className="pr-3 text-[14px] leading-tight">
                  <span className="num text-muted">{s.id}</span> <span className="text-ink">{s.name.split(/[,(]/)[0].trim()}</span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-muted">{pos ? "known analog" : "control"}</span>
                </span>
                <span className="relative h-[14px] overflow-hidden rounded-full bg-hairline/50">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${pos ? (ok ? "bg-[#7FD1A0]" : "bg-copper") : "bg-[#6A9BAD]"}`}
                    style={{ width: `${stage >= 2 ? (v / W) * 100 : 0}%`, transition: `width 900ms cubic-bezier(0.16,1,0.3,1) ${stage >= 2 ? i * 260 : 0}ms` }}
                  />
                </span>
                <span className={`num pl-3 text-right text-[15px] transition-opacity duration-300 ${stage >= 2 ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${stage >= 2 ? i * 260 + 500 : 0}ms` }}>
                  {v.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className={`transition-all duration-500 ${stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          <p className="text-[15px] text-ink/90">
            Known analogs at or above the bar: <span className="num text-[20px] font-semibold text-ink">{cleared}</span> of {positives.length} <span className="text-muted">(needed {needed})</span>
          </p>
          <p className="mt-1 text-[15px] text-ink/90">
            Full five-feature fingerprint <span className="num font-semibold">{(r.decision.mean_pos_full ?? NaN).toFixed(1)}</span> vs slope-only baseline <span className="num font-semibold">{(r.decision.mean_pos_b0 ?? NaN).toFixed(1)}</span>
            <span className="text-muted"> — the extra features did not help.</span>
          </p>
          {topControl ? (
            <p className="mt-1 text-[13px] text-muted">
              The {topControl.name.split(/[,(]/)[0].trim()} control ranked <span className="num text-ink/90">{(topControl.median_pct_full ?? 0).toFixed(1)}</span>, above {positives.filter((p) => (p.median_pct_full ?? 0) < (topControl.median_pct_full ?? 0)).length} of {positives.length} known analogs: at 30 m, shape alone does not separate wind erosion from other processes (equifinality).
            </p>
          ) : null}
        </div>
        <div
          className={`justify-self-start rounded-[10px] border-2 px-5 py-2 font-display text-[34px] font-bold uppercase tracking-[0.12em] transition-all duration-300 md:justify-self-end ${r.decision.pass ? "border-[#7FD1A0] text-[#a8e3bf]" : "border-copper text-copper-light"} ${stage >= 4 ? "rotate-[-4deg] scale-100 opacity-100" : "rotate-0 scale-125 opacity-0"}`}
          role="status"
        >
          {r.decision.pass ? "Passed" : "Failed"}
        </div>
      </div>

      <div className={`mt-6 border-t border-hairline pt-5 transition-opacity duration-700 ${stage >= 4 ? "opacity-100" : "opacity-0"}`}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">The resolution paradox · same HiRISE scarps, two measuring scales</p>
        <div className="mt-3 grid grid-cols-[110px_1fr_60px] items-center gap-y-2 text-[14px]">
          {[
            ["4 m baseline", r.hirise.frac_area_slope_gt15_baseline_4m],
            ["180 m baseline", r.hirise.frac_area_slope_gt15_baseline_180m],
          ].map(([label, f]) => (
            <div key={String(label)} className="contents">
              <span className="text-muted">{label}</span>
              <span className="relative h-[10px] overflow-hidden rounded-full bg-hairline/50">
                <span className="absolute inset-y-0 left-0 rounded-full bg-copper" style={{ width: `${stage >= 4 ? Math.max(1, (Number(f) / r.hirise.frac_area_slope_gt15_baseline_4m) * 100) : 0}%`, transition: "width 1200ms cubic-bezier(0.16,1,0.3,1) 300ms" }} />
              </span>
              <span className="num pl-3 text-right text-ink">{(Number(f) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted">Area steeper than 15°. The relief that makes these landforms distinctive lives below the 30 m comparison scale — which is why the fingerprint could not see it.</p>
      </div>
    </div>
  );
}
