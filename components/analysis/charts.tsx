"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { DiagnosticGroup, Feature, Results, Site } from "@/lib/types";
import { fracToPercent } from "@/lib/format";
import { COLORS, ChartTooltip, fmt, groupId, linear, niceTicks, shortName, tickLabel, truncWords } from "./primitives";

// Hand-written SVG charts. All values arrive as props read from results.json.

type Tip = { x: number; y: number; content: ReactNode } | null;

const AXIS = { stroke: COLORS.hairline, strokeWidth: 1 } as const;
const TICK_TEXT = { fill: COLORS.muted, fontSize: 13 } as const;

function roleColor(id: string): string {
  if (id.startsWith("P")) return COLORS.copperLight;
  if (id.startsWith("N")) return COLORS.earth;
  return COLORS.neutral;
}

function wrapWords(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    return kept;
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* a. Feature fingerprint: Mars median vs group medians (raw units)    */
/* ------------------------------------------------------------------ */

const GROUP_ORDER = ["P1", "P2", "P3", "N1", "N2", "D1", "D2"];

export function FingerprintChart({ features, marsMedian, groups }: { features: Feature[]; marsMedian: Record<string, number>; groups: DiagnosticGroup[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const ordered = useMemo(
    () => [...groups].sort((a, b) => GROUP_ORDER.indexOf(groupId(a.group)) - GROUP_ORDER.indexOf(groupId(b.group))),
    [groups],
  );
  const W = 880;
  const labelW = 236;
  const gap = 26;
  const panelW = (W - labelW - gap * (features.length - 1) - 8) / features.length;
  const headH = 66;
  const rowH = 32;
  const rows = 1 + ordered.length;
  const plotH = rows * rowH;
  const H = headH + plotH + 34;
  const rowY = (i: number) => headH + i * rowH + rowH / 2;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Median feature values for the Mars fingerprint and each Earth group, five features side by side. Full values in the data table below.">
        {/* row labels */}
        <g>
          <text x={0} y={rowY(0)} dy="0.35em" fill={COLORS.ink} fontSize={14} fontWeight={600}>
            Mars · MFF fingerprint
          </text>
          {ordered.map((g, i) => {
            const id = groupId(g.group);
            return (
              <g key={g.group}>
                <circle cx={6} cy={rowY(i + 1)} r={4.5} fill={roleColor(id)} />
                <text x={18} y={rowY(i + 1)} dy="0.35em" fill={COLORS.ink} fontSize={14}>
                  <tspan fontWeight={600}>{id}</tspan>
                  <tspan fill={COLORS.muted} fontSize={13}> {truncWords(shortName(g.group.slice(id.length + 1)), 27)}</tspan>
                </text>
              </g>
            );
          })}
        </g>
        {/* row separators */}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line key={i} x1={0} x2={W} y1={headH + (i + 1) * rowH} y2={headH + (i + 1) * rowH} stroke={COLORS.grid} strokeWidth={1} />
        ))}
        {features.map((f, fi) => {
          const x0 = labelW + fi * (panelW + gap);
          const vals = [marsMedian[f.id], ...ordered.map((g) => g.median_raw?.[f.id])].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          let lo = Math.min(0, ...vals);
          let hi = Math.max(0, ...vals);
          if (f.units === "0–1") {
            lo = 0;
            hi = 1;
          }
          const ticks = niceTicks(lo, hi, 3);
          const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
          const d0 = Math.min(lo, Math.floor(lo / step) * step);
          const d1 = Math.max(hi, Math.ceil(hi / step) * step);
          const sx = linear(d0, d1, x0 + 8, x0 + panelW - 8);
          const allTicks = niceTicks(d0, d1, 3);
          const mars = marsMedian[f.id];
          const nameLines = wrapWords(f.name.replace(/\s*\(.*\)$/, ""), 17);
          return (
            <g key={f.id}>
              <text x={x0} y={16} fill={COLORS.ink} fontSize={14} fontWeight={600}>
                {f.id} <tspan fill={COLORS.muted} fontWeight={400}>({f.units})</tspan>
              </text>
              {nameLines.map((l, li) => (
                <text key={li} x={x0} y={34 + li * 16} fill={COLORS.muted} fontSize={13}>
                  {l}
                </text>
              ))}
              {allTicks.map((t) => (
                <g key={t}>
                  <line x1={sx(t)} x2={sx(t)} y1={headH} y2={headH + plotH} stroke={t === 0 ? COLORS.hairline : COLORS.grid} strokeWidth={1} />
                  <text x={sx(t)} y={headH + plotH + 20} textAnchor="middle" {...TICK_TEXT}>
                    {tickLabel(t)}
                  </text>
                </g>
              ))}
              {typeof mars === "number" ? (
                <g>
                  <line x1={sx(mars)} x2={sx(mars)} y1={headH + 4} y2={headH + plotH - 4} stroke={COLORS.copper} strokeWidth={1.25} strokeDasharray="3 3" />
                  <rect
                    x={sx(mars) - 5.5}
                    y={rowY(0) - 5.5}
                    width={11}
                    height={11}
                    transform={`rotate(45 ${sx(mars)} ${rowY(0)})`}
                    fill={COLORS.copper}
                    tabIndex={0}
                    aria-label={`Mars ${f.name}: ${fmt(mars, 2)} ${f.units}`}
                    onMouseEnter={() => setTip({ x: sx(mars), y: rowY(0), content: <TipBody title={`Mars · ${f.name}`} lines={[`Median ${fmt(mars, 2)} ${f.units}`]} /> })}
                    onFocus={() => setTip({ x: sx(mars), y: rowY(0), content: <TipBody title={`Mars · ${f.name}`} lines={[`Median ${fmt(mars, 2)} ${f.units}`]} /> })}
                    onMouseLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                    className="outline-none"
                  />
                </g>
              ) : null}
              {ordered.map((g, gi) => {
                const v = g.median_raw?.[f.id];
                if (typeof v !== "number") return null;
                const id = groupId(g.group);
                const cx = sx(v);
                const cy = rowY(gi + 1);
                const content = (
                  <TipBody
                    title={`${g.group}`}
                    lines={[`${f.name}: median ${fmt(v, 2)} ${f.units}`, typeof mars === "number" ? `Mars median ${fmt(mars, 2)} ${f.units}` : "", `${g.n} windows`]}
                  />
                );
                return (
                  <circle
                    key={g.group}
                    cx={cx}
                    cy={cy}
                    r={5.5}
                    fill={roleColor(id)}
                    stroke={COLORS.surface}
                    strokeWidth={1.5}
                    tabIndex={0}
                    aria-label={`${g.group}, ${f.name}: ${fmt(v, 2)} ${f.units}`}
                    onMouseEnter={() => setTip({ x: cx, y: cy, content })}
                    onFocus={() => setTip({ x: cx, y: cy, content })}
                    onMouseLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                    className="outline-none"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {tip ? (
        <ChartTooltip x={tip.x} y={tip.y} vbW={W} vbH={H}>
          {tip.content}
        </ChartTooltip>
      ) : null}
    </div>
  );
}

function TipBody({ title, lines }: { title: string; lines: string[] }) {
  return (
    <>
      <p className="font-medium text-ink">{title}</p>
      {lines.filter(Boolean).map((l, i) => (
        <p key={i} className="num mt-[2px] text-[13px] text-muted">
          {l}
        </p>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* b. Where reference sites rank: beeswarm strip of window percentiles */
/* ------------------------------------------------------------------ */

function beeswarm(xs: number[], r: number): number[] {
  // Deterministic: place each point (in x order) at the smallest |offset| free of collisions.
  const idx = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const placed: { x: number; y: number }[] = [];
  const out = new Array<number>(xs.length).fill(0);
  const d = r * 2 + 0.6;
  for (const { x, i } of idx) {
    let chosen = 0;
    for (let k = 0; k < 60; k++) {
      const off = k === 0 ? 0 : (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * (r * 1.15);
      const ok = placed.every((p) => Math.abs(p.x - x) >= d || (p.x - x) ** 2 + (p.y - off) ** 2 >= d * d);
      if (ok) {
        chosen = off;
        break;
      }
    }
    placed.push({ x, y: chosen });
    out[i] = chosen;
  }
  return out;
}

export function SiteStripChart({ windows, sites, threshold, nNull }: { windows: Results["windows"]; sites: Site[]; threshold: number; nNull: number }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 880;
  const labelW = 206;
  const right = 20;
  const top = 40;
  const rowH = 84;
  const H = top + sites.length * rowH + 44;
  const sx = linear(0, 100, labelW, W - right);
  const r = 4.2;

  const rows = useMemo(
    () =>
      sites.map((s) => {
        const ws = windows.filter((w) => w.label === s.id);
        const xs = ws.map((w) => labelW + (w.pct / 100) * (W - right - labelW));
        const offs = beeswarm(xs, r);
        return { site: s, ws, xs, offs };
      }),
    [sites, windows],
  );

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Window percentiles for each reference site, with the pre-registered pass threshold at ${threshold}. Full values in the data table below.`}>
        <rect x={sx(threshold)} y={top - 8} width={sx(100) - sx(threshold)} height={sites.length * rowH + 8} fill={COLORS.copper} opacity={0.06} />
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={top - 8} y2={top + sites.length * rowH} stroke={COLORS.grid} />
            <text x={sx(t)} y={top + sites.length * rowH + 20} textAnchor="middle" {...TICK_TEXT}>
              {t}
            </text>
          </g>
        ))}
        <text x={(labelW + W - right) / 2} y={H - 4} textAnchor="middle" fill={COLORS.muted} fontSize={13}>
          Window percentile vs {nNull.toLocaleString("en-US")} declared Earth windows (higher = closer to the Mars fingerprint)
        </text>
        <line x1={sx(threshold)} x2={sx(threshold)} y1={top - 14} y2={top + sites.length * rowH} stroke={COLORS.ink} strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={sx(threshold)} y={top - 20} textAnchor="end" fill={COLORS.ink} fontSize={13}>
          Pass threshold · {threshold}
        </text>
        {rows.map(({ site, ws, xs, offs }, ri) => {
          const cy = top + ri * rowH + rowH / 2;
          const col = site.role === "positive" ? COLORS.copper : COLORS.earth;
          const med = site.median_pct_full;
          return (
            <g key={site.id}>
              {ri > 0 ? <line x1={0} x2={W} y1={top + ri * rowH} y2={top + ri * rowH} stroke={COLORS.grid} /> : null}
              <text x={0} y={cy - 9} fill={COLORS.ink} fontSize={14} fontWeight={600}>
                {site.id} <tspan fontWeight={400}>{truncWords(shortName(site.name), 26)}</tspan>
              </text>
              <text x={0} y={cy + 11} fill={COLORS.muted} fontSize={13}>
                {site.role === "positive" ? "Published yardangs" : "Control (look-alike)"} · n={site.n_windows}
              </text>
              {ws.map((w, i) => {
                const cx = xs[i];
                const y = cy + offs[i];
                return (
                  <circle
                    key={w.id}
                    cx={cx}
                    cy={y}
                    r={r}
                    fill={col}
                    fillOpacity={0.72}
                    stroke={COLORS.surface}
                    strokeWidth={0.8}
                    onMouseEnter={() => setTip({ x: cx, y, content: <TipBody title={`${site.id} window`} lines={[`Percentile ${fmt(w.pct)}`, `Slope-only (B0) ${fmt(w.pct_b0)}`, w.id]} /> })}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
              {typeof med === "number" ? (
                <g>
                  <line x1={sx(med)} x2={sx(med)} y1={cy - 26} y2={cy + 26} stroke={COLORS.ink} strokeWidth={2.5} />
                  <rect
                    x={sx(med) - 8}
                    y={cy - 28}
                    width={16}
                    height={56}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${site.name}: median window percentile ${fmt(med)}, ${site.n_windows} windows`}
                    onMouseEnter={() => setTip({ x: sx(med), y: cy - 20, content: <TipBody title={site.name} lines={[`Median percentile ${fmt(med)}`, `Best window ${fmt(site.best_pct_full)}`, `${site.n_windows} windows`]} /> })}
                    onFocus={() => setTip({ x: sx(med), y: cy - 20, content: <TipBody title={site.name} lines={[`Median percentile ${fmt(med)}`, `Best window ${fmt(site.best_pct_full)}`, `${site.n_windows} windows`]} /> })}
                    onMouseLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                    className="outline-none"
                  />
                  <text x={sx(med)} y={cy - 31} textAnchor="middle" fill={COLORS.ink} fontSize={13} className="num">
                    median {fmt(med)}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {tip ? (
        <ChartTooltip x={tip.x} y={tip.y} vbW={W} vbH={H}>
          {tip.content}
        </ChartTooltip>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* c. Full fingerprint vs slope-only baseline (B0): dumbbells          */
/* ------------------------------------------------------------------ */

export function DumbbellChart({ sites, threshold, meanFull, meanB0 }: { sites: Site[]; threshold: number; meanFull?: number; meanB0?: number }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 880;
  const labelW = 206;
  const plotR = 690;
  const top = 26;
  const rowH = 46;
  const items = [
    ...sites.map((s) => ({ key: s.id, label: `${s.id} ${truncWords(shortName(s.name), 25)}`, role: s.role, full: s.median_pct_full, b0: s.median_pct_b0 })),
    ...(typeof meanFull === "number" && typeof meanB0 === "number" ? [{ key: "mean", label: "Mean of positives", role: "mean" as const, full: meanFull, b0: meanB0 }] : []),
  ];
  const H = top + items.length * rowH + 36;
  const sx = linear(0, 100, labelW, plotR);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Median site percentile with the full five-feature fingerprint compared with the slope-only baseline B0. Values in the data table below.">
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={top - 10} y2={top + items.length * rowH} stroke={COLORS.grid} />
            <text x={sx(t)} y={top + items.length * rowH + 20} textAnchor="middle" {...TICK_TEXT}>
              {t}
            </text>
          </g>
        ))}
        <line x1={sx(threshold)} x2={sx(threshold)} y1={top - 14} y2={top + items.length * rowH} stroke={COLORS.ink} strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={sx(threshold)} y={top - 16} textAnchor="middle" fill={COLORS.muted} fontSize={13}>
          {threshold}
        </text>
        <text x={plotR + 24} y={top - 12} fill={COLORS.muted} fontSize={13}>
          Full · B0
        </text>
        {items.map((it, i) => {
          const cy = top + i * rowH + rowH / 2;
          const col = it.role === "positive" || it.role === "mean" ? COLORS.copper : COLORS.earth;
          const hasBoth = typeof it.full === "number" && typeof it.b0 === "number";
          const content = <TipBody title={it.label} lines={[`Full fingerprint ${fmt(it.full)}`, `Slope-only B0 ${fmt(it.b0)}`]} />;
          return (
            <g
              key={it.key}
              tabIndex={0}
              aria-label={`${it.label}: full fingerprint ${fmt(it.full)}, slope-only baseline ${fmt(it.b0)}`}
              onMouseEnter={() => setTip({ x: sx(it.full ?? 0), y: cy, content })}
              onFocus={() => setTip({ x: sx(it.full ?? 0), y: cy, content })}
              onMouseLeave={() => setTip(null)}
              onBlur={() => setTip(null)}
              className="outline-none"
            >
              {it.key === "mean" ? <line x1={0} x2={W} y1={top + i * rowH} y2={top + i * rowH} stroke={COLORS.hairline} /> : null}
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={0} y={cy} dy="0.35em" fill={COLORS.ink} fontSize={14} fontWeight={it.key === "mean" ? 600 : 400}>
                {it.label}
              </text>
              {hasBoth ? <line x1={sx(it.full as number)} x2={sx(it.b0 as number)} y1={cy} y2={cy} stroke={COLORS.neutral} strokeWidth={2} /> : null}
              {typeof it.b0 === "number" ? <circle cx={sx(it.b0)} cy={cy} r={6} fill={COLORS.surface} stroke={COLORS.muted} strokeWidth={2} /> : null}
              {typeof it.full === "number" ? <circle cx={sx(it.full)} cy={cy} r={6.5} fill={col} /> : null}
              <text x={plotR + 24} y={cy} dy="0.35em" fill={COLORS.ink} fontSize={14} className="num">
                {fmt(it.full)} <tspan fill={COLORS.muted}>· {fmt(it.b0)}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      {tip ? (
        <ChartTooltip x={tip.x} y={tip.y} vbW={W} vbH={H}>
          {tip.content}
        </ChartTooltip>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* d1. CTX ridge spectrum (log wavelength axis)                        */
/* ------------------------------------------------------------------ */

export function SpectrumChart({ wavelength, power, peaks, f2BaselineM }: { wavelength: number[]; power: number[]; peaks: number[]; f2BaselineM?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 880;
  const L = 64;
  const R = 20;
  const T = 44;
  const B = 50;
  const H = 330;
  const pts = useMemo(() => wavelength.map((w, i) => ({ w, p: power[i] })).filter((d) => d.w > 0 && Number.isFinite(d.p)).sort((a, b) => a.w - b.w), [wavelength, power]);
  if (pts.length < 2) return null;
  const lw0 = Math.log10(pts[0].w);
  const lw1 = Math.log10(pts[pts.length - 1].w);
  const sx = (w: number) => L + ((Math.log10(w) - lw0) / (lw1 - lw0)) * (W - L - R);
  const pMax = Math.max(...pts.map((d) => d.p));
  const yTicks = niceTicks(0, pMax * 1.15, 4);
  const yTop = Math.max(pMax * 1.15, yTicks[yTicks.length - 1]);
  const sy = linear(0, yTop, H - B, T);
  const path = pts.map((d, i) => `${i ? "L" : "M"}${sx(d.w).toFixed(1)},${sy(d.p).toFixed(1)}`).join("");
  const area = `${path}L${sx(pts[pts.length - 1].w).toFixed(1)},${sy(0)}L${sx(pts[0].w).toFixed(1)},${sy(0)}Z`;
  const xTicks = [50, 100, 200, 500, 1000, 2000, 5000].filter((t) => t >= pts[0].w && t <= pts[pts.length - 1].w);
  const sortedPeaks = [...peaks].filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  const pLo = sortedPeaks[0];
  const pHi = sortedPeaks[sortedPeaks.length - 1];

  const nearest = (vx: number) => {
    let best = 0;
    let bd = Infinity;
    pts.forEach((d, i) => {
      const dd = Math.abs(sx(d.w) - vx);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    return best;
  };
  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    setHover(nearest(vx));
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const cur = hover ?? Math.floor(pts.length / 2);
      setHover(Math.max(0, Math.min(pts.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1))));
    }
  };
  const h = hover !== null ? pts[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Across-wind ridge spectrum of the CTX Mars DTM: compensated power against wavelength on a logarithmic axis, with peak wavelengths marked.">
        {typeof pLo === "number" && typeof pHi === "number" ? (
          <g>
            <rect x={sx(pLo)} y={T} width={Math.max(2, sx(pHi) - sx(pLo))} height={H - B - T} fill={COLORS.copper} opacity={0.1} />
            {sortedPeaks.map((p, i) => (
              <line key={i} x1={sx(p)} x2={sx(p)} y1={T} y2={T + 10} stroke={COLORS.copperLight} strokeWidth={1.5} />
            ))}
            <text x={(sx(pLo) + sx(pHi)) / 2} y={T - 10} textAnchor="middle" fill={COLORS.copperLight} fontSize={13}>
              Compensated peaks {fmt(pLo, 0)}–{fmt(pHi, 0)} m
            </text>
          </g>
        ) : null}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke={COLORS.grid} />
            <text x={L - 8} y={sy(t)} dy="0.35em" textAnchor="end" {...TICK_TEXT}>
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={H - B} y2={H - B + 5} {...AXIS} />
            <text x={sx(t)} y={H - B + 20} textAnchor="middle" {...TICK_TEXT}>
              {t >= 1000 ? `${t / 1000} km` : `${t} m`}
            </text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} {...AXIS} />
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fill={COLORS.muted} fontSize={13}>
          Across-wind wavelength (log scale)
        </text>
        <text x={14} y={(T + H - B) / 2} transform={`rotate(-90 14 ${(T + H - B) / 2})`} textAnchor="middle" fill={COLORS.muted} fontSize={13}>
          Power × k² (relative)
        </text>
        {typeof f2BaselineM === "number" && f2BaselineM >= pts[0].w ? (
          <g>
            <line x1={sx(f2BaselineM)} x2={sx(f2BaselineM)} y1={T} y2={H - B} stroke={COLORS.ink} strokeWidth={1.25} strokeDasharray="5 4" />
            <text x={sx(f2BaselineM) - 6} y={T + 26} textAnchor="end" fill={COLORS.ink} fontSize={13}>
              F2 baseline {f2BaselineM} m
            </text>
          </g>
        ) : null}
        <path d={area} fill={COLORS.copper} opacity={0.12} />
        <path d={path} fill="none" stroke={COLORS.copper} strokeWidth={2} strokeLinejoin="round" />
        {h ? (
          <g>
            <line x1={sx(h.w)} x2={sx(h.w)} y1={T} y2={H - B} stroke={COLORS.muted} strokeWidth={1} />
            <circle cx={sx(h.w)} cy={sy(h.p)} r={4.5} fill={COLORS.ink} />
          </g>
        ) : null}
        <rect
          x={L}
          y={T}
          width={W - L - R}
          height={H - B - T}
          fill="transparent"
          tabIndex={0}
          aria-label="Spectrum readout. Use left and right arrow keys to step through wavelengths."
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="outline-none"
        />
      </svg>
      {h ? (
        <ChartTooltip x={sx(h.w)} y={sy(h.p)} vbW={W} vbH={H}>
          <TipBody title={`Wavelength ${fmt(h.w, 0)} m`} lines={[`Power × k² ${fmt(h.p, 2)}`]} />
        </ChartTooltip>
      ) : null}
    </div>
  );
}

/** Fraction of ridge gradient the F2 operator retains, per ridge wavelength. */
export function AttenuationBars({ attenuation }: { attenuation: Record<string, number> }) {
  const rows = Object.entries(attenuation)
    .map(([k, v]) => ({ w: Number(k), v }))
    .filter((d) => Number.isFinite(d.w) && Number.isFinite(d.v))
    .sort((a, b) => a.w - b.w);
  return (
    <ul className="space-y-3" aria-label="Fraction of ridge gradient retained by the 180 m slope operator">
      {rows.map((d) => (
        <li key={d.w} className="grid grid-cols-[110px_1fr_64px] items-center gap-4 text-[15px]">
          <span className="num text-ink">{d.w >= 1000 ? `${d.w / 1000} km` : `${d.w} m`} ridge</span>
          <span className="relative h-[10px] rounded-full bg-[#1c232c]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-copper" style={{ width: `${Math.max(0, Math.min(1, d.v)) * 100}%` }} />
          </span>
          <span className="num text-right text-ink">{fracToPercent(d.v, 0)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* d2. HiRISE fine vs coarse slope fractions                           */
/* ------------------------------------------------------------------ */

export function HiriseBars({ hirise }: { hirise: Results["hirise"] }) {
  const groups = [
    { label: "Area steeper than 15°", fine: hirise.frac_area_slope_gt15_baseline_4m, coarse: hirise.frac_area_slope_gt15_baseline_180m },
    { label: "Area steeper than 30°", fine: hirise.frac_area_slope_gt30_baseline_4m, coarse: hirise.frac_area_slope_gt30_baseline_180m },
  ];
  const max = Math.max(...groups.flatMap((g) => [g.fine, g.coarse]).filter((v) => Number.isFinite(v)), 0.0001);
  return (
    <div className="space-y-6" role="group" aria-label="HiRISE slope fractions at a 4 m baseline versus a 180 m baseline">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 text-[15px] font-medium text-ink">{g.label}</p>
          {[
            { k: "≈4 m baseline (HiRISE 1 m DTM)", v: g.fine, c: "bg-copper" },
            { k: "180 m baseline (analysis scale)", v: g.coarse, c: "bg-[#6f7a85]" },
          ].map((b) => (
            <div key={b.k} className="mb-2 grid grid-cols-[minmax(150px,240px)_1fr_64px] items-center gap-4 text-[15px]">
              <span className="text-muted">{b.k}</span>
              <span className="relative h-[14px] rounded-[4px] bg-[#1c232c]">
                <span className={`absolute inset-y-0 left-0 rounded-[4px] ${b.c}`} style={{ width: `${(b.v / max) * 100}%` }} />
              </span>
              <span className="num text-right text-ink">{fracToPercent(b.v)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Candidate explorer: per-feature W1 bars                             */
/* ------------------------------------------------------------------ */

export function W1Bars({ features, w1, reference, referenceLabel }: { features: Feature[]; w1: Record<string, number>; reference?: Record<string, number>; referenceLabel?: string }) {
  const vals = features.flatMap((f) => [w1[f.id], reference?.[f.id]]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const max = Math.max(...vals, 1e-6);
  const t0 = niceTicks(0, max, 4);
  const step = t0.length > 1 ? t0[1] - t0[0] : max;
  const dMax = Math.ceil(max / step - 1e-9) * step;
  const ticks = Array.from({ length: Math.round(dMax / step) + 1 }, (_, i) => i * step);
  return (
    <div>
      <ul className="space-y-3">
        {features.map((f) => {
          const v = w1[f.id];
          const ref = reference?.[f.id];
          return (
            <li key={f.id} className="grid grid-cols-[minmax(120px,210px)_1fr_64px] items-center gap-4 text-[15px]">
              <span className="text-ink">
                <span className="font-semibold">{f.id}</span> <span className="text-muted">{f.name.replace(/\s*\(.*\)$/, "")}</span>
              </span>
              <span className="relative h-[14px] rounded-[4px] bg-[#1c232c]" aria-label={`${f.name}: W1 ${fmt(v, 3)}${typeof ref === "number" ? `; ${referenceLabel ?? "reference"} ${fmt(ref, 3)}` : ""}`} role="img">
                {typeof v === "number" ? <span className="absolute inset-y-0 left-0 rounded-[4px] bg-[#7b8692]" style={{ width: `${(v / dMax) * 100}%` }} /> : null}
                {typeof ref === "number" ? (
                  <span className="absolute -top-[4px] h-[22px] w-[2px] bg-earth" style={{ left: `calc(${(ref / dMax) * 100}% - 1px)` }} title={`${referenceLabel ?? "Reference"}: ${fmt(ref, 3)}`} />
                ) : null}
              </span>
              <span className="num text-right text-ink">{fmt(v, 3)}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-[minmax(120px,210px)_1fr_64px] gap-4 text-[13px] text-muted">
        <span />
        <span className="num relative h-[18px]" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / dMax) * 100}%` }}>
              {tickLabel(t)}
            </span>
          ))}
        </span>
        <span />
      </div>
    </div>
  );
}
