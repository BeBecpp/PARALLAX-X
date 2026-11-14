"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Results } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks";
import { sfx } from "@/lib/audio";

/**
 * Animated, exact explanation of the pipeline's distance metric.
 * Data: public/data/w1_curves.json — the ECDF-normalised 199-quantile functions of Mars and each
 * comparison window, exported by science/pipeline/export_w1_curves.py, which re-ran the primary pipeline
 * and verified that the recomputed W1 equals the stored value (max difference reported in the file).
 */

interface W1Curves {
  max_abs_w1_diff: number;
  n_quantiles: number;
  levels: number[];
  normalisation: string;
  n_null_windows: number;
  mars: { q_norm: Record<string, number[]> };
  scenes: Record<string, { window_id: string; w1: Record<string, number>; q_norm: Record<string, number[]> }>;
}

const FEATS = ["F1", "F2", "F3", "F4", "F5"];
const VW = 760;
const VH = 330;
const PAD = { l: 52, r: 18, t: 18, b: 44 };

export function W1Explainer({ results }: { results: Results }) {
  const reduced = useReducedMotion();
  const [data, setData] = useState<W1Curves | null>(null);
  const [err, setErr] = useState(false);
  const scenes = results.compare_scenes.filter((s) => s.kind !== "mars");
  // default: a published yardang analog that ranked low (largest visible gap), then compare with G-1
  const [sceneId, setSceneId] = useState(scenes.find((s) => s.site_id === "P2")?.id ?? scenes[0]?.id ?? "cmp_g1");
  const [feat, setFeat] = useState("F1");
  const [sweep, setSweep] = useState(1);
  const raf = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch("/data/w1_curves.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: W1Curves) => alive && setData(d))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, []);

  // sweep animation: draws the gap between the two quantile functions left -> right
  useEffect(() => {
    if (!data) return;
    cancelAnimationFrame(raf.current);
    if (reduced) {
      raf.current = requestAnimationFrame(() => setSweep(1));
      return;
    }
    const t0 = performance.now();
    const dur = 2200;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setSweep(k < 0.08 ? 0 : (k - 0.08) / 0.92);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [data, sceneId, feat, reduced]);

  const scene = scenes.find((s) => s.id === sceneId);
  const curves = data?.scenes[sceneId];
  const m = data?.mars.q_norm[feat];
  const e = curves?.q_norm[feat];
  const fname = results.features.find((f) => f.id === feat)?.name ?? feat;

  const geom = useMemo(() => {
    if (!m || !e || !data) return null;
    const n = m.length;
    const x = (i: number) => PAD.l + (data.levels[i] ?? (i + 0.5) / n) * (VW - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - v) * (VH - PAD.t - PAD.b);
    const line = (q: number[]) => q.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    return { n, x, y, mPath: line(m), ePath: line(e) };
  }, [m, e, data]);

  if (err) return <p className="text-[15px] text-muted">The W1 curve data (w1_curves.json) is not available, so the animation is not shown.</p>;
  if (!data || !geom || !m || !e || !curves) return <div className="h-[380px] animate-pulse rounded-[10px] bg-surface" aria-busy="true" />;

  const upto = Math.max(0, Math.min(geom.n, Math.round(sweep * geom.n)));
  let acc = 0;
  for (let i = 0; i < upto; i++) acc += Math.abs(e[i] - m[i]);
  const running = acc / geom.n;
  const final = curves.w1[feat];
  const stored = scene?.per_feature_w1?.[feat];
  const area =
    upto > 1
      ? `M${geom.x(0)},${geom.y(m[0])}` +
        m.slice(0, upto).map((v, i) => `L${geom.x(i).toFixed(1)},${geom.y(v).toFixed(1)}`).join("") +
        e
          .slice(0, upto)
          .map((v, i) => [i, v] as const)
          .reverse()
          .map(([i, v]) => `L${geom.x(i).toFixed(1)},${geom.y(v).toFixed(1)}`)
          .join("") +
        "Z"
      : "";
  const sweepX = geom.x(Math.max(0, upto - 1));
  const D = FEATS.reduce((a, k) => a + curves.w1[k], 0) / FEATS.length;
  const maxW = Math.max(...FEATS.map((k) => curves.w1[k]), 0.01);
  const short = (s: (typeof scenes)[number]) => {
    const base = s.label.split(" — ")[0];
    if (s.kind === "candidate") return base;
    const name = base.split(/[\s,(]/)[0];
    return s.kind === "negative" ? `${name} (control)` : `${name} (known analog)`;
  };

  return (
    <div className="rounded-[12px] border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-copper-light">Watch the math · exact pipeline values</p>
          <h3 className="mt-1 font-display text-[24px] font-semibold text-ink">How close is one feature’s distribution? W1, step by step</h3>
        </div>
        <span className="rounded-full border border-hairline px-3 py-1 text-[12px] text-muted">re-computed W1 = stored W1 · max diff {data.max_abs_w1_diff.toExponential(0)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Earth window">
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === sceneId}
            onClick={() => {
              sfx("tick");
              setSceneId(s.id);
            }}
            className={`rounded-[8px] border px-3 py-1.5 text-[14px] ${s.id === sceneId ? "border-earth bg-earth/15 text-ink" : "border-hairline text-muted hover:text-ink"}`}
          >
            {short(s)}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Terrain feature">
        {FEATS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={k === feat}
            onClick={() => {
              sfx("tick");
              setFeat(k);
            }}
            className={`rounded-[8px] border px-3 py-1.5 text-[14px] ${k === feat ? "border-copper bg-copper/15 text-ink" : "border-hairline text-muted hover:text-ink"}`}
          >
            <span className="num">{k}</span> {results.features.find((f) => f.id === k)?.name}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} className="mt-4 w-full" role="img" aria-label={`Quantile functions of ${fname} for Mars and ${scene ? short(scene) : "Earth"}; W1 ${final.toFixed(3)}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={VW - PAD.r} y1={geom.y(v)} y2={geom.y(v)} stroke="#2C3946" strokeWidth={1} />
            <text x={PAD.l - 8} y={geom.y(v) + 4} textAnchor="end" fill="#A4B0BC" style={{ fontSize: 12 }} className="num">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <text key={p} x={PAD.l + p * (VW - PAD.l - PAD.r)} y={VH - PAD.b + 18} textAnchor="middle" fill="#A4B0BC" style={{ fontSize: 12 }} className="num">
            {p.toFixed(2)}
          </text>
        ))}
        <text x={(VW + PAD.l) / 2} y={VH - 6} textAnchor="middle" fill="#A4B0BC" style={{ fontSize: 12 }}>
          quantile level p (199 levels)
        </text>
        <text x={14} y={VH / 2} transform={`rotate(-90 14 ${VH / 2})`} textAnchor="middle" fill="#A4B0BC" style={{ fontSize: 12 }}>
          normalised value (null-window ECDF)
        </text>
        {area ? <path d={area} fill="rgba(224,166,106,0.28)" stroke="none" /> : null}
        <path d={geom.mPath} fill="none" stroke="#E8783D" strokeWidth={2.4} />
        <path d={geom.ePath} fill="none" stroke="#6FADC2" strokeWidth={2.4} />
        {sweep > 0 && sweep < 1 ? <line x1={sweepX} x2={sweepX} y1={PAD.t} y2={VH - PAD.b} stroke="#F1F4F7" strokeOpacity={0.5} strokeDasharray="3 3" /> : null}
        <g transform={`translate(${PAD.l + 12}, ${PAD.t + 8})`}>
          <rect width={14} height={3} y={5} fill="#E8783D" />
          <text x={20} y={10} fill="#F1F4F7" style={{ fontSize: 13 }}>
            Mars (CTX yardangs)
          </text>
          <rect width={14} height={3} y={25} fill="#6FADC2" />
          <text x={20} y={30} fill="#F1F4F7" style={{ fontSize: 13 }}>
            {scene ? short(scene) : "Earth"}
          </text>
          <rect width={14} height={10} y={41} fill="rgba(224,166,106,0.5)" />
          <text x={20} y={50} fill="#F1F4F7" style={{ fontSize: 13 }}>
            gap |Q_Earth − Q_Mars|
          </text>
        </g>
      </svg>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[10px] border border-hairline bg-bg/60 p-4">
          <p className="num text-[16px] leading-relaxed text-ink">
            W1<sub>{feat}</sub> = (1/199) · Σ<sub>p</sub> |Q<sub>Earth</sub>(p) − Q<sub>Mars</sub>(p)|
          </p>
          <p className="num mt-2 text-[30px] font-semibold text-[#f0c99a]" aria-live="polite">
            {(sweep >= 1 ? final : running).toFixed(4)}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            results.json value: <span className="num text-ink/90">{stored !== undefined ? stored.toFixed(4) : "—"}</span>
            {stored !== undefined && Math.abs(stored - final) < 1e-9 ? " ✓ identical" : ""}. Lower = more similar distribution of terrain geometry — not a geological match.
          </p>
        </div>
        <div className="rounded-[10px] border border-hairline bg-bg/60 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Fingerprint distance D (equal weights)</p>
          <div className="mt-2 space-y-1.5">
            {FEATS.map((k) => (
              <div key={k} className="grid grid-cols-[36px_1fr_56px] items-center gap-2 text-[13px]">
                <span className={`num ${k === feat ? "text-copper-light" : "text-muted"}`}>{k}</span>
                <span className="h-[8px] rounded-full bg-[#1f2730]">
                  <span className={`block h-full rounded-full ${k === feat ? "bg-copper" : "bg-[#55606b]"}`} style={{ width: `${(curves.w1[k] / maxW) * 100}%`, transition: "width 500ms" }} />
                </span>
                <span className="num text-right text-ink/90">{curves.w1[k].toFixed(3)}</span>
              </div>
            ))}
          </div>
          <p className="num mt-3 text-[14px] text-ink">
            D = mean(W1<sub>F1…F5</sub>) = <span className="text-[#f0c99a]">{D.toFixed(4)}</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            → percentile <span className="num text-ink">{scene?.pct_full?.toFixed(2) ?? "—"}</span> among {results.null_set.n_windows.toLocaleString("en-US")} null windows (slope-only B0 = W1<sub>F2</sub> → <span className="num">{scene?.pct_b0?.toFixed(2) ?? "—"}</span>). A rank, not a probability.
          </p>
        </div>
      </div>
    </div>
  );
}
