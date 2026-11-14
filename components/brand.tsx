"use client";

import { useId } from "react";
import { BRAND, GLYPH_STROKE, LOGO, MARK_VIEWBOX, SIGNATURE, slantTransform, wordLayout } from "@/lib/brand";

/**
 * Canonical PARALLAX X logo components. Geometry and colours come from lib/brand.ts — the same source that
 * generates /public/brand/*.svg, the favicon and the social preview — so every instance is identical.
 */

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-x`} x1="0" y1="0" x2="35" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={BRAND.copperBright} />
        <stop offset="1" stopColor={BRAND.copperDeep} />
      </linearGradient>
      <linearGradient id={`${id}-o`} x1="-15" y1="47" x2="40" y2="-10" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={BRAND.copperBright} stopOpacity="0" />
        <stop offset="0.55" stopColor={BRAND.copperBright} stopOpacity="0.85" />
        <stop offset="1" stopColor="#FFD2B0" />
      </linearGradient>
      <radialGradient id={`${id}-g`}>
        <stop offset="0" stopColor="#FFE3CC" stopOpacity="0.9" />
        <stop offset="1" stopColor={BRAND.copperBright} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** The copper X signature + orbit + light point. `animate` draws the orbit and lights the point (intro). */
function Signature({ id, tx = 0, animate = false }: { id: string; tx?: number; animate?: boolean }) {
  const d = SIGNATURE.dot;
  return (
    <g transform={`translate(${tx} 0)`}>
      <g transform={slantTransform()}>
        <g className={animate ? "brand-x-in" : undefined}>
          {SIGNATURE.x.paths.map((p) => (
            <path key={p} d={p} fill={`url(#${id}-x)`} stroke={`url(#${id}-x)`} strokeWidth={GLYPH_STROKE} />
          ))}
        </g>
      </g>
      <path d={SIGNATURE.orbit} fill="none" stroke={`url(#${id}-o)`} strokeWidth="2.2" strokeLinecap="round" pathLength={1} className={animate ? "brand-orbit-draw" : undefined} />
      <g className={animate ? "brand-dot-in" : undefined}>
        <circle cx={d.cx} cy={d.cy} r={d.r * 3} fill={`url(#${id}-g)`} />
        <circle cx={d.cx} cy={d.cy} r={d.r} fill="#FFF1E4" />
      </g>
    </g>
  );
}

export function BrandLogo({ height = 28, onClick, animate = false, className = "" }: { height?: number; onClick?: () => void; animate?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const { glyphs } = wordLayout();
  const vb = LOGO.viewBox;
  const svg = (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} height={height} className={`block w-auto ${className}`} role="img" aria-label="PARALLAX X">
      <Defs id={id} />
      {glyphs.map((g, i) => (
        <g key={i} transform={slantTransform(g.x)}>
          <g className={animate ? "brand-glyph-in" : undefined} style={animate ? { animationDelay: `${0.9 + i * 0.07}s` } : undefined}>
            {g.paths.map((p) => (
              <path key={p} d={p} fill={BRAND.ink} fillRule="evenodd" stroke={BRAND.ink} strokeWidth={GLYPH_STROKE} />
            ))}
          </g>
        </g>
      ))}
      <Signature id={id} tx={LOGO.sigX} animate={animate} />
    </svg>
  );
  if (!onClick) return svg;
  return (
    <button type="button" onClick={onClick} className="-m-1 rounded-[8px] p-1" aria-label="PARALLAX X — back to site selection">
      {svg}
    </button>
  );
}

export function BrandMark({ size = 28, animate = false, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const v = MARK_VIEWBOX;
  return (
    <svg viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} width={(size * v.w) / v.h} height={size} className={className} aria-hidden="true">
      <Defs id={id} />
      <Signature id={id} animate={animate} />
    </svg>
  );
}
