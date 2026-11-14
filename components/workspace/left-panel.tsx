"use client";

import type { HeightfieldMeta, Results } from "@/lib/types";
import { formatCoord, formatMetres } from "@/lib/format";
import type { EvidenceSection, WorkspaceMode } from "./types";

export type Layer = "hillshade" | "elevation" | "slopemap";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${className}`} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z",
  rover: "M4 15h16M6 15v-3h12v3M8 12V9h8v3M10 9V7h4M6.5 18.5a1.5 1.5 0 1 0 0-.1M17.5 18.5a1.5 1.5 0 1 0 0-.1M12 18.5a1.5 1.5 0 1 0 0-.1",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  route: "M5 19a2 2 0 1 0 0-.1M19 5a2 2 0 1 0 0-.1M7 18c5 0 3-7 8-8 2-.4 3-2 3-3",
  play: "M8 5v14l11-7L8 5Z",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
};

export function SectionTitle({ icon, title, sub }: { icon: keyof typeof ICONS; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-[2px] text-copper">
        <Icon d={ICONS[icon]} className="h-6 w-6" />
      </span>
      <div>
        <h2 className="font-display text-[19px] font-semibold uppercase leading-tight tracking-[0.02em]">{title}</h2>
        {sub ? <p className="mt-[2px] text-[13px] leading-snug text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted">{children}</p>;
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[10px] border border-hairline bg-bg/60 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[34px] flex-1 rounded-[7px] px-2 text-[13px] transition-all duration-200 ${
              active ? "bg-copper/18 text-ink shadow-[0_0_0_1px_rgba(198,106,75,0.9),0_0_16px_rgba(198,106,75,0.22)]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ParamRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[7px]" title={hint}>
      <span className="text-[14px] text-ink/85">{label}</span>
      <span className="num rounded-[6px] border border-hairline bg-bg/60 px-2 py-[3px] text-[13px] text-ink">{value}</span>
    </div>
  );
}

export function LeftPanel({
  results,
  mode,
  hero,
  layer,
  onLayer,
  lens,
  onLens,
  exaggeration,
  onExaggeration,
  res,
  onRes,
  paxStatus,
  onCompare,
  onExplore,
  onSimulate,
  onTour,
  onOpenEvidence,
}: {
  results: Results | null;
  mode: WorkspaceMode;
  hero: HeightfieldMeta;
  layer: Layer;
  onLayer: (l: Layer) => void;
  lens: "landform" | "rover";
  onLens: (l: "landform" | "rover") => void;
  exaggeration: number;
  onExaggeration: (e: number) => void;
  res: "native" | "30m";
  onRes: (r: "native" | "30m") => void;
  paxStatus: "idle" | "loading" | "ready" | "error";
  onCompare: () => void;
  onExplore: () => void;
  onSimulate: () => void;
  onTour: () => void;
  onOpenEvidence: (s: EvidenceSection) => void;
}) {
  const mars = results?.compare_scenes.find((s) => s.kind === "mars");
  const p = results?.run.parameters ?? {};
  const inCompare = mode === "compare";
  const regionThumb = (mars as { thumb?: string } | undefined)?.thumb;
  const paxMsg =
    mode === "compare"
      ? "Pick a candidate on the right. Remember: shape alone failed the pre-registered test."
      : mode === "simulate"
        ? "Press play below. I follow the real HiRISE surface — a visualization, not rover physics."
        : "Ready! Explore the scarps, then compare Earth candidates.";

  return (
    <aside className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-[12px] border border-hairline bg-surface/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]" aria-label="Mission controls">
      <SectionTitle icon="target" title="Mission setup" sub="Target region, PAX and analysis parameters" />

      <div>
        <MicroLabel>Target region</MicroLabel>
        <div className="flex items-center gap-3 rounded-[10px] border border-hairline bg-bg/50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {regionThumb ? <img src={regionThumb} alt="CTX hillshade of the yardang study area" className="h-[58px] w-[76px] rounded-[7px] object-cover" /> : <div className="h-[58px] w-[76px] rounded-[7px] bg-bg" />}
          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-tight text-ink">Medusae Fossae, Mars</p>
            <p className="mt-[2px] text-[13px] text-muted">{inCompare ? "Yardang study area · CTX" : "Layered scarps · HiRISE"}</p>
            <p className="num mt-[2px] text-[13px] text-ink/80">{mars ? formatCoord(mars.centroid, "Mars") : "—"}</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted">One supported region. The HiRISE scarps and the CTX yardang area are different patches ~10 km apart.</p>
      </div>

      <div>
        <MicroLabel>PAX rover</MicroLabel>
        <div className={`flex items-center gap-3 rounded-[10px] border p-2 transition-all duration-300 ${mode === "simulate" ? "border-copper bg-copper/10 shadow-[0_0_18px_rgba(198,106,75,0.22)]" : "border-hairline bg-bg/50"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/models/pax-rover-poster.webp" alt="PAX rover (render of the 3D model)" className="h-[58px] w-[76px] rounded-[7px] bg-bg object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium leading-tight">PAX</p>
            <p className="mt-[2px] text-[13px] text-muted">Expedition guide · real 3D model</p>
            <p className="mt-[2px] text-[12px] text-muted">{paxStatus === "ready" ? "Loaded in terrain scene" : paxStatus === "loading" ? "Loading 4.6 MB model…" : paxStatus === "error" ? "Model unavailable" : "Not loaded"}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onTour} className="min-h-[38px] rounded-[8px] border border-hairline bg-bg/50 text-[13px] text-ink hover:border-copper">
            Guided tour
          </button>
          <button
            type="button"
            onClick={onSimulate}
            className={`min-h-[38px] rounded-[8px] border text-[13px] transition-all ${mode === "simulate" ? "border-copper bg-copper/15 text-ink" : "border-hairline bg-bg/50 text-ink hover:border-copper"}`}
          >
            Simulate drive
          </button>
        </div>
      </div>

      <div>
        <MicroLabel>Comparison parameters</MicroLabel>
        <ParamRow label="Analysis window" value={p.window_km ? `${Number(p.window_km).toFixed(2)} km` : "—"} hint="Non-overlapping Earth windows; 6 km sensitivity run also reported" />
        <ParamRow label="Common grid" value={p.grid_m ? `${p.grid_m} m` : "—"} hint="Mars CTX and Earth NASADEM resampled to the same grid" />
        <ParamRow label="Smoothing (both planets)" value={p.smoothing_sigma_m ? `σ ${p.smoothing_sigma_m} m` : "—"} />
        <ParamRow label="Slope baselines" value="180 / 600 m" hint="F2 and F3; nothing finer than ~150 m is compared" />
        <ParamRow label="Display tile" value={`${formatMetres((inCompare && mars ? 333 * 30 : hero.extent_m[0]))}`} />
      </div>

      <div className="space-y-3">
        <div>
          <MicroLabel>Terrain layer</MicroLabel>
          <Seg
            label="Terrain layer"
            value={layer}
            onChange={onLayer}
            options={[
              { value: "hillshade", label: "Relief" },
              { value: "elevation", label: "Elevation" },
              { value: "slopemap", label: "Slope" },
            ]}
          />
        </div>
        <div>
          <MicroLabel>Scale lens</MicroLabel>
          <Seg
            label="Scale lens"
            value={lens}
            onChange={onLens}
            options={[
              { value: "landform", label: "Landform ≥150 m" },
              { value: "rover", label: "Rover-scale ~5 m" },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <MicroLabel>Vertical</MicroLabel>
            <Seg
              label="Vertical exaggeration"
              value={String(exaggeration)}
              onChange={(v) => onExaggeration(Number(v))}
              options={[
                { value: "1", label: "×1" },
                { value: "2", label: "×2" },
                { value: "4", label: "×4" },
              ]}
            />
          </div>
          {mode === "explore" ? (
            <div>
              <MicroLabel>Detail</MicroLabel>
              <Seg
                label="Terrain detail"
                value={res}
                onChange={onRes}
                options={[
                  { value: "native", label: "HiRISE" },
                  { value: "30m", label: "30 m" },
                ]}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto space-y-4">
        {inCompare ? (
          <button type="button" onClick={() => onOpenEvidence("overview")} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-copper text-[15px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_10px_30px_rgba(198,106,75,0.35)] transition hover:brightness-110">
            <Icon d={ICONS.chart} /> Analyze the evidence
          </button>
        ) : (
          <button type="button" onClick={onCompare} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-copper text-[15px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_10px_30px_rgba(198,106,75,0.35)] transition hover:brightness-110">
            <span aria-hidden="true">»</span> Compare Earth analogs
          </button>
        )}
        {inCompare ? (
          <button type="button" onClick={onExplore} className="min-h-[40px] w-full rounded-[10px] border border-hairline text-[14px] text-muted hover:text-ink">
            Back to Mars terrain
          </button>
        ) : null}
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/models/pax-rover-poster.webp" alt="" aria-hidden="true" className="h-[86px] w-[86px] shrink-0 object-contain" />
          <div className="relative mb-2 rounded-[10px] border border-hairline bg-bg/70 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-copper">PAX</p>
            <p className="mt-1 text-[13px] leading-snug text-ink/90">{paxMsg}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
