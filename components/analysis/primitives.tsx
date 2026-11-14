"use client";

import { useId, useState, type ReactNode } from "react";

// Shared, presentation-only building blocks for the Analysis overlay.
// Nothing here produces numbers: every value is passed in from results.json / sources.json.

export const COLORS = {
  copper: "#c66a4b",
  copperLight: "#df9070",
  earth: "#789da8",
  earthLight: "#9cc3d1",
  ink: "#f3f1ed",
  muted: "#9da6af",
  hairline: "#2b343e",
  grid: "#1f2730",
  surface: "#121820",
  neutral: "#6f7a85",
} as const;

/** Fixed-decimal formatting for values read from data; em dash for missing. */
export function fmt(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const out = v.toFixed(digits);
  // Never let rounding display a percentile below 100 as "100" (conservative: truncate with one more digit).
  if (v < 100 && Number(out) >= 100) {
    const k = Math.pow(10, digits + 1);
    return (Math.floor(v * k) / k).toFixed(digits + 1);
  }
  return out;
}

export function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}

/** Short label for a diagnostics/site group name: "P1 Lut Kaluts yardangs, Iran" → "Lut Kaluts yardangs". */
export function shortName(name: string): string {
  return name.split(/[,(]/)[0].trim();
}

/** Truncate at a word boundary, adding an ellipsis when shortened. */
export function truncWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const i = cut.lastIndexOf(" ");
  return (i > 8 ? cut.slice(0, i) : cut) + "…";
}

/** Group id from a diagnostics group string ("D1 Gobi (search)" → "D1"). */
export function groupId(group: string): string {
  return group.split(" ")[0];
}

export function SectionHeader({ id, kicker, title, lead }: { id: string; kicker: string; title: string; lead?: ReactNode }) {
  return (
    <header className="mb-10">
      <p className="text-[14px] font-medium uppercase tracking-[0.14em] text-copper-light">{kicker}</p>
      <h2 id={`${id}-title`} className="mt-3 font-display text-[34px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink md:text-[40px]">
        {title}
      </h2>
      {lead ? <div className="mt-5 max-w-[68ch] text-[18px] leading-[1.6] text-muted">{lead}</div> : null}
    </header>
  );
}

export function SubHeader({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-display text-[24px] font-semibold leading-tight text-ink md:text-[26px]">{title}</h3>
      {note ? <div className="mt-2 max-w-[70ch] text-[16px] leading-[1.6] text-muted">{note}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[10px] border border-hairline bg-surface ${className}`}>{children}</div>;
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "copper" | "earth" }) {
  const c =
    tone === "copper" ? "border-copper/60 text-copper-light" : tone === "earth" ? "border-earth/60 text-[#9cc3d1]" : "border-hairline text-muted";
  return <span className={`inline-flex items-center rounded-[6px] border px-2 py-[2px] text-[14px] leading-tight ${c}`}>{children}</span>;
}

/** Calm pass/fail marker: typography, not alarm colours. */
export function Verdict({ pass }: { pass: boolean | null | undefined }) {
  if (pass === null || pass === undefined) return <span className="text-muted">pending</span>;
  return pass ? (
    <span className="font-semibold text-ink">Met</span>
  ) : (
    <span className="font-semibold text-copper-light">Not met</span>
  );
}

/** Chart wrapper: figure + caption + accessible data-table toggle. */
export function ChartFigure({
  title,
  caption,
  status,
  table,
  children,
  legend,
}: {
  title: string;
  caption?: ReactNode;
  status?: string;
  table?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const tid = useId();
  return (
    <figure className="mt-2">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <figcaption className="font-display text-[19px] font-semibold text-ink">{title}</figcaption>
        {status ? <Tag tone="neutral">{status}</Tag> : null}
      </div>
      {caption ? <div className="mb-4 max-w-[72ch] text-[16px] leading-[1.6] text-muted">{caption}</div> : null}
      {legend ? <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted">{legend}</div> : null}
      <div className="rounded-[10px] border border-hairline bg-surface px-3 py-4 md:px-5">{children}</div>
      {table ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showTable}
            aria-controls={tid}
            onClick={() => setShowTable((s) => !s)}
            className="inline-flex min-h-[36px] items-center gap-2 rounded-[8px] px-2 text-[14px] font-medium text-muted transition-colors duration-200 hover:text-ink motion-reduce:transition-none"
          >
            <span aria-hidden className={`inline-block transition-transform duration-200 motion-reduce:transition-none ${showTable ? "rotate-90" : ""}`}>
              ›
            </span>
            {showTable ? "Hide data table" : "Show data table"}
          </button>
          {showTable ? (
            <div id={tid} className="mt-2 overflow-x-auto rounded-[10px] border border-hairline">
              {table}
            </div>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}

export function LegendItem({ children, swatch }: { children: ReactNode; swatch: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="18" height="14" aria-hidden>
        {swatch}
      </svg>
      {children}
    </span>
  );
}

/** Simple data table with consistent styling. */
export function DataTable({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <table className="w-full border-collapse text-left text-[15px]">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr className="border-b border-hairline bg-[#0e131a]">
          {head.map((h, i) => (
            <th key={i} scope="col" className="px-3 py-2 text-[14px] font-medium text-muted">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-hairline/60 last:border-b-0">
            {r.map((c, j) =>
              j === 0 ? (
                <th key={j} scope="row" className="px-3 py-2 font-normal text-ink">
                  {c}
                </th>
              ) : (
                <td key={j} className="num px-3 py-2 text-ink">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** HTML tooltip positioned over an SVG with a fixed viewBox (coordinates in viewBox units). */
export function ChartTooltip({ x, y, vbW, vbH, children }: { x: number; y: number; vbW: number; vbH: number; children: ReactNode }) {
  const left = (x / vbW) * 100;
  const top = (y / vbH) * 100;
  const alignRight = left > 62;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-max max-w-[300px] rounded-[8px] border border-hairline bg-[#0d1218] px-3 py-2 text-[14px] leading-snug text-ink shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${alignRight ? "calc(-100% - 12px)" : "12px"}, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

/** Expandable technical detail (native details/summary for accessibility). */
export function Expand({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-[8px] border border-hairline bg-[#0e131a] open:bg-[#0e131a]">
      <summary className="flex min-h-[40px] cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-medium text-muted transition-colors duration-200 hover:text-ink motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
        {summary}
      </summary>
      <div className="border-t border-hairline px-4 py-4 text-[15px] leading-[1.6] text-muted">{children}</div>
    </details>
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="break-words text-copper-light underline decoration-copper/40 underline-offset-[3px] hover:decoration-copper-light">
      {children}
    </a>
  );
}

/** Linear scale helper. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** "Nice" ticks for a numeric domain. */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return [lo];
  const span = hi - lo;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export function tickLabel(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(0);
  if (a >= 1) return Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
  return v.toFixed(2).replace(/0$/, "");
}
