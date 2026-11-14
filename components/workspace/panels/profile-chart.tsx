"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { COLORS, niceTicks, tickLabel } from "@/components/analysis/primitives";
import type { ProfileSeries } from "../types";

// Responsive SVG profile chart (distance on x, elevation or slope on y). Values come from props only.

const M = { l: 58, r: 18, t: 14, b: 40 };

/** Linear interpolation of a series at distance d (series sorted by d). */
function valueAt(points: { d: number; v: number }[], d: number): number | null {
  if (!points.length) return null;
  if (d <= points[0].d) return points[0].v;
  const last = points[points.length - 1];
  if (d >= last.d) return last.v;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].d <= d) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  if (!Number.isFinite(a.v)) return Number.isFinite(b.v) ? b.v : null;
  if (!Number.isFinite(b.v)) return a.v;
  const t = b.d === a.d ? 0 : (d - a.d) / (b.d - a.d);
  return a.v + (b.v - a.v) * t;
}

function pathOf(points: { d: number; v: number }[], x: (d: number) => number, y: (v: number) => number): string {
  let s = "";
  let pen = false;
  for (const p of points) {
    if (!Number.isFinite(p.v)) {
      pen = false;
      continue;
    }
    s += `${pen ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`;
    pen = true;
  }
  return s;
}

export function ProfileChart({
  series,
  unit,
  yTitle,
  cursorFrac,
  onCursor,
}: {
  series: ProfileSeries[];
  unit: string;
  yTitle: string;
  cursorFrac: number | null;
  onCursor: (frac: number | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points);
  const finite = all.filter((p) => Number.isFinite(p.v) && Number.isFinite(p.d));
  const dMax = finite.length ? Math.max(...finite.map((p) => p.d)) : 0;
  const dMin = finite.length ? Math.min(...finite.map((p) => p.d)) : 0;
  let vLo = finite.length ? Math.min(...finite.map((p) => p.v)) : 0;
  let vHi = finite.length ? Math.max(...finite.map((p) => p.v)) : 1;
  if (vHi - vLo < 1e-6) {
    vHi += 1;
    vLo -= 1;
  }
  const pad = (vHi - vLo) * 0.08;
  const yTicks0 = niceTicks(vLo - pad, vHi + pad, 4);
  const yStep = yTicks0.length > 1 ? yTicks0[1] - yTicks0[0] : vHi - vLo;
  const y0 = Math.floor((vLo - pad) / yStep) * yStep;
  const y1 = Math.ceil((vHi + pad) / yStep) * yStep;
  const yTicks = niceTicks(y0, y1, 4);

  const kmMax = dMax / 1000;
  const kmMin = dMin / 1000;
  const xTicks = niceTicks(kmMin, kmMax, Math.max(3, Math.min(10, Math.floor(size.w / 110))));

  const W = size.w;
  const H = size.h;
  const iw = Math.max(1, W - M.l - M.r);
  const ih = Math.max(1, H - M.t - M.b);
  const span = dMax - dMin || 1;
  const x = (d: number) => M.l + ((d - dMin) / span) * iw;
  const y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0 || 1)) * ih;

  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left - M.l) / iw));
    setHover(f);
    onCursor(f);
  };
  const handleLeave = () => {
    setHover(null);
    onCursor(null);
  };

  const mars = series.find((s) => s.tone === "mars") ?? null;
  const ready = W > 0 && H > 0 && finite.length > 1;
  const digits = unit === "°" ? 1 : yStep < 1 ? 2 : yStep < 10 ? 1 : 0;

  const hoverD = hover !== null ? dMin + hover * span : null;
  const cursorD = cursorFrac !== null && Number.isFinite(cursorFrac) ? dMin + Math.min(1, Math.max(0, cursorFrac)) * span : null;
  const tipLeftPct = hover !== null ? ((M.l + hover * iw) / W) * 100 : 0;

  return (
    <div ref={wrapRef} className="relative h-full min-h-[120px] w-full">
      {ready ? (
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 touch-none select-none"
          onPointerMove={handleMove}
          onPointerLeave={handleLeave}
          role="img"
          aria-label={`${yTitle} along the profile, ${tickLabel(kmMin)}–${tickLabel(kmMax)} km`}
        >
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.copper} stopOpacity="0.32" />
              <stop offset="100%" stopColor={COLORS.copper} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* grid + y ticks */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeWidth={1} />
              <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill={COLORS.muted} className="num">
                {tickLabel(t)}
              </text>
            </g>
          ))}
          {/* x ticks */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={x(t * 1000)} x2={x(t * 1000)} y1={M.t + ih} y2={M.t + ih + 4} stroke={COLORS.hairline} />
              <text x={x(t * 1000)} y={M.t + ih + 17} textAnchor="middle" fontSize={12} fill={COLORS.muted} className="num">
                {tickLabel(t)}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={W - M.r} y1={M.t + ih} y2={M.t + ih} stroke={COLORS.hairline} />
          <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + ih} stroke={COLORS.hairline} />
          {/* axis titles */}
          <text x={M.l + iw / 2} y={H - 4} textAnchor="middle" fontSize={11} fill={COLORS.muted} letterSpacing="0.12em">
            DISTANCE (KM)
          </text>
          <text transform={`translate(13 ${M.t + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={COLORS.muted} letterSpacing="0.12em">
            {yTitle.toUpperCase()}
          </text>

          {/* series */}
          {mars ? (
            <path
              d={`${pathOf(mars.points, x, y)}L${x(mars.points[mars.points.length - 1].d).toFixed(1)},${(M.t + ih).toFixed(1)}L${x(mars.points[0].d).toFixed(1)},${(M.t + ih).toFixed(1)}Z`}
              fill={`url(#fill-${gid})`}
            />
          ) : null}
          {series.map((s) => (
            <path
              key={s.id}
              d={pathOf(s.points, x, y)}
              fill="none"
              stroke={s.tone === "mars" ? COLORS.copperLight : COLORS.earth}
              strokeWidth={s.tone === "mars" ? 1.8 : 1.6}
              strokeLinejoin="round"
            />
          ))}

          {/* rover / external cursor */}
          {cursorD !== null ? (
            <g pointerEvents="none">
              <line x1={x(cursorD)} x2={x(cursorD)} y1={M.t} y2={M.t + ih} stroke={COLORS.copper} strokeWidth={1.5} />
              {series.map((s) => {
                const v = valueAt(s.points, cursorD);
                return v === null ? null : (
                  <circle key={s.id} cx={x(cursorD)} cy={y(v)} r={4.5} fill={s.tone === "mars" ? COLORS.copper : COLORS.earth} stroke="#0b0f14" strokeWidth={2} />
                );
              })}
            </g>
          ) : null}

          {/* hover cursor */}
          {hoverD !== null ? (
            <g pointerEvents="none">
              <line x1={x(hoverD)} x2={x(hoverD)} y1={M.t} y2={M.t + ih} stroke={COLORS.ink} strokeOpacity={0.45} strokeDasharray="3 3" />
              {series.map((s) => {
                const v = valueAt(s.points, hoverD);
                return v === null ? null : <circle key={s.id} cx={x(hoverD)} cy={y(v)} r={3.5} fill={COLORS.ink} stroke={s.tone === "mars" ? COLORS.copper : COLORS.earth} strokeWidth={2} />;
              })}
            </g>
          ) : null}
        </svg>
      ) : null}

      {ready && hoverD !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-2 z-10 w-max rounded-[8px] border border-hairline bg-[#0d1218]/95 px-3 py-2 text-[13px] leading-snug text-ink shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
          style={{ left: `${tipLeftPct}%`, transform: tipLeftPct > 62 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <p className="num text-muted">{(hoverD / 1000).toFixed(2)} km</p>
          {series.map((s) => {
            const v = valueAt(s.points, hoverD);
            return (
              <p key={s.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${s.tone === "mars" ? "bg-copper" : "bg-earth"}`} aria-hidden />
                <span className="text-muted">{s.label}</span>
                <span className="num ml-auto pl-3">
                  {v === null ? "—" : v.toFixed(digits)}
                  {unit === "°" ? "°" : ` ${unit}`}
                </span>
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
