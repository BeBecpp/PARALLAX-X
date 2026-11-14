"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Loadable } from "@/lib/data";
import type { HeightfieldMeta, Locator, LocatorFootprint, SourceRecord } from "@/lib/types";
import { formatLat, formatMarsLon, formatPosting } from "@/lib/format";
import { sfx } from "@/lib/audio";
import { useReducedMotion } from "@/lib/hooks";
import { ValidationBanner } from "./validation-banner";
import { Wordmark } from "./wordmark";
import { SiteFooter } from "./site-footer";
import { SoundControl } from "./sound-control";
import type { PaxCue, PaxCueName } from "./pax-stage";

// three.js + the 4.6 MB GLB load only on the client, after first paint. The poster covers the gap.
const PaxStage = dynamic(() => import("./pax-stage"), { ssr: false });

export const PAX_POSTER = "/models/pax-rover-poster.webp";

/** The two real, selectable Mars scenes (both inside the one published study region). */
export type SceneChoice = "hirise" | "ctx";

type FootprintStyle = { stroke: string; fill: string; dash?: string; width: number; name: string; role: string };

const FOOTPRINT_STYLE: Record<LocatorFootprint["kind"], FootprintStyle> = {
  hirise: { stroke: "#E8783D", fill: "rgba(232,120,61,0.30)", width: 2, name: "HiRISE Scarp Explorer", role: "fine-scale 3D showcase" },
  fingerprint: { stroke: "#F1F4F7", fill: "rgba(241,244,247,0.10)", dash: "5 3", width: 1.6, name: "CTX Yardang Study", role: "used for the Mars–Earth ranking" },
  ctx: { stroke: "#A4B0BC", fill: "none", dash: "1.5 3", width: 1.1, name: "CTX terrain-model extent", role: "USGS stereo DTM scene (context)" },
};
const KIND_TO_SCENE: Partial<Record<LocatorFootprint["kind"], SceneChoice>> = { hirise: "hirise", fingerprint: "ctx" };

const MARS_RADIUS_KM = 3389.5;

const subscribeSmall = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/* ------------------------------------------------------------------ */
/* Region detail: real footprints at true relative size (clickable)     */
/* ------------------------------------------------------------------ */
function RegionDetail({ footprints, hover, setHover, choice, onPick }: { footprints: LocatorFootprint[]; hover: string | null; setHover: (id: string | null) => void; choice: SceneChoice; onPick: (s: SceneChoice) => void }) {
  const all = footprints.flatMap((f) => f.polygon);
  if (!all.length) return null;
  let lonMin = Math.min(...all.map((p) => p[0]));
  let lonMax = Math.max(...all.map((p) => p[0]));
  let latMin = Math.min(...all.map((p) => p[1]));
  let latMax = Math.max(...all.map((p) => p[1]));
  const padLon = (lonMax - lonMin) * 0.1;
  const padLat = (latMax - latMin) * 0.1;
  lonMin -= padLon;
  lonMax += padLon;
  latMin -= padLat;
  latMax += padLat;
  const midLat = (latMin + latMax) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const aspect = ((lonMax - lonMin) * kx) / (latMax - latMin);
  const H = typeof window !== "undefined" && window.innerHeight < 860 ? 120 : 200;
  const W = Math.round(H * aspect);
  const tx = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * W;
  const ty = (lat: number) => ((latMax - lat) / (latMax - latMin)) * H;
  const kmAcross = (lonMax - lonMin) * ((Math.PI / 180) * MARS_RADIUS_KM) * kx;
  const barKm = kmAcross > 40 ? 10 : 5;
  const barPx = (barKm / kmAcross) * W;
  const order: LocatorFootprint["kind"][] = ["ctx", "fingerprint", "hirise"];
  const sorted = [...footprints].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <div className="rounded-[12px] border border-hairline bg-bg/90 p-3 backdrop-blur">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/90">Medusae Fossae · data footprints</p>
        <p className="text-[12px] text-muted">true relative size</p>
      </div>
      <svg viewBox={`-6 -6 ${W + 12} ${H + 34}`} width={W + 12} className="mt-2 block max-w-full" role="group" aria-label="Selectable data footprints at true relative size">
        {sorted.map((f) => {
          const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
          const scene = KIND_TO_SCENE[f.kind];
          const on = hover === f.id || (scene && scene === choice);
          const pts = f.polygon.map(([lo, la]) => `${tx(lo).toFixed(1)},${ty(la).toFixed(1)}`).join(" ");
          return (
            <polygon
              key={f.id}
              points={pts}
              fill={on && scene ? (f.kind === "hirise" ? "rgba(232,120,61,0.45)" : "rgba(241,244,247,0.2)") : st.fill}
              stroke={st.stroke}
              strokeWidth={on ? st.width + 1.2 : st.width}
              strokeDasharray={st.dash}
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => scene && onPick(scene)}
              style={{ cursor: scene ? "pointer" : "default", transition: "fill 160ms linear" }}
              tabIndex={scene ? 0 : -1}
              role={scene ? "button" : undefined}
              aria-label={scene ? `Select ${st.name}` : st.name}
              onKeyDown={(e) => {
                if (scene && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onPick(scene);
                }
              }}
            >
              <title>{`${st.name} — ${st.role}`}</title>
            </polygon>
          );
        })}
        <line x1={0} y1={H + 18} x2={barPx} y2={H + 18} stroke="#F1F4F7" strokeWidth={2} />
        <text x={barPx + 6} y={H + 22.5} fill="#A4B0BC" style={{ fontSize: 12, fontFamily: "var(--font-jetbrains), monospace" }}>
          {barKm} km
        </text>
      </svg>
      <ul className="mt-2 space-y-1 text-[12px] leading-snug [@media(max-height:860px)]:hidden">
        {(["hirise", "fingerprint", "ctx"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2 text-muted">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" fill={FOOTPRINT_STYLE[k].fill === "none" ? "transparent" : FOOTPRINT_STYLE[k].fill} stroke={FOOTPRINT_STYLE[k].stroke} strokeDasharray={FOOTPRINT_STYLE[k].dash} />
            </svg>
            <span className="text-ink/90">{FOOTPRINT_STYLE[k].name}</span> · {FOOTPRINT_STYLE[k].role}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigator: MOLA regional map, hotspot, unsupported-area messaging    */
/* ------------------------------------------------------------------ */
function Navigator({
  locator,
  hover,
  setHover,
  choice,
  onPick,
  arriving,
}: {
  locator: Loadable<Locator>;
  hover: string | null;
  setHover: (id: string | null) => void;
  choice: SceneChoice;
  onPick: (s: SceneChoice) => void;
  arriving: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [cursor, setCursor] = useState<{ lon: number; lat: number; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ lon: number; lat: number; x: number; y: number } | null>(null);
  const toastTimer = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  if (locator.status === "loading") return <div className="h-full min-h-[360px] w-full rounded-[14px] border border-hairline bg-surface" aria-busy="true" />;
  if (locator.status !== "ready" || imgFailed) {
    return (
      <div className="flex min-h-[360px] w-full items-center justify-center rounded-[14px] border border-dashed border-hairline bg-surface/40 p-6 text-center">
        <p className="text-[16px] text-muted">The MOLA locator (locator.json) is not available, so no map is shown. No placeholder is drawn.</p>
      </div>
    );
  }
  const L = locator.data;
  const toX = (lon: number) => ((lon - L.lon_min) / (L.lon_max - L.lon_min)) * 100;
  const toY = (lat: number) => ((L.lat_max - lat) / (L.lat_max - L.lat_min)) * 100;
  const pts = L.footprints.flatMap((f) => f.polygon);
  const cLon = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
  const cLat = (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2;
  const mx = toX(cLon);
  const my = toY(cLat);

  const at = (e: React.PointerEvent | React.MouseEvent) => {
    const r = box.current!.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    return { lon: L.lon_min + fx * (L.lon_max - L.lon_min), lat: L.lat_max - fy * (L.lat_max - L.lat_min), x: fx * 100, y: fy * 100, px: Math.hypot((fx * 100 - mx) * r.width, (fy * 100 - my) * r.height) / 100 };
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[14px] border border-hairline bg-[#06080b]">
      {/* map plane: keeps the true 960:520 aspect so every overlay is in real lon/lat */}
      <div className="absolute inset-0 grid place-items-center" style={{ containerType: "size" }}>
        <div
          ref={box}
          className="relative"
          style={{
            aspectRatio: `${L.width} / ${L.height}`,
            width: `max(100cqw, calc(100cqh * ${L.width} / ${L.height}))`,
            flexShrink: 0,
            transformOrigin: `${mx}% ${my}%`,
            transform: arriving ? `translate(${50 - mx}%, ${50 - my}%) scale(9)` : "none",
            transition: arriving ? "transform 1900ms cubic-bezier(0.65, 0, 0.35, 1)" : "transform 400ms ease-out",
            cursor: "crosshair",
          }}
          onPointerMove={(e) => {
            const p = at(e);
            setCursor(p);
          }}
          onPointerLeave={() => setCursor(null)}
          onClick={(e) => {
            if (arriving) return;
            const p = at(e);
            if (p.px < 34) {
              onPick(choice);
              return;
            }
            sfx("tick");
            setToast(p);
            window.clearTimeout(toastTimer.current);
            toastTimer.current = window.setTimeout(() => setToast(null), 3200);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={L.image}
            alt={`MOLA shaded relief of Mars, ${formatLat(L.lat_min)}–${formatLat(L.lat_max)}, ${formatMarsLon(L.lon_min)}–${formatMarsLon(L.lon_max)}`}
            className="absolute inset-0 block h-full w-full select-none"
            style={{ filter: "grayscale(1) sepia(0.55) saturate(1.5) hue-rotate(-12deg) contrast(1.08) brightness(0.78)" }}
            onError={() => setImgFailed(true)}
            draggable={false}
          />
          {/* graticule every 10° (real coordinates) */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {Array.from({ length: 11 }, (_, i) => L.lon_min + i * 10)
              .filter((lo) => lo > L.lon_min && lo < L.lon_max)
              .map((lo) => (
                <line key={`lo${lo}`} x1={toX(lo)} x2={toX(lo)} y1={0} y2={100} stroke="#F1F4F7" strokeOpacity={0.08} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
              ))}
            {Array.from({ length: 7 }, (_, i) => -30 + i * 10).map((la) => (
              <line key={`la${la}`} x1={0} x2={100} y1={toY(la)} y2={toY(la)} stroke="#F1F4F7" strokeOpacity={la === 0 ? 0.16 : 0.08} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
            ))}
            {L.footprints.map((f) => {
              const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
              return <polygon key={f.id} points={f.polygon.map(([lo, la]) => `${toX(lo)},${toY(la)}`).join(" ")} fill={st.fill} stroke={st.stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 80% at 55% 45%, transparent 50%, rgba(6,8,11,0.6) 100%)" }} />
          {/* hotspot */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPick(choice);
            }}
            aria-label="Medusae Fossae Formation — the supported study region"
            className="group absolute h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
            style={{ left: `${mx}%`, top: `${my}%`, opacity: arriving ? 0 : 1 }}
          >
            <span className="absolute inset-0 rounded-full border-2 border-copper motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <span className="absolute inset-[14px] rounded-full border-2 border-copper-light bg-copper/25 shadow-[0_0_24px_rgba(232,120,61,0.75)]" />
            <span className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff2e8]" />
          </button>
          <div className="pointer-events-none absolute -translate-y-1/2 pl-10" style={{ left: `${mx}%`, top: `${my}%`, opacity: arriving ? 0 : 1, transition: "opacity 300ms" }}>
            <p className="whitespace-nowrap font-display text-[19px] font-semibold leading-tight text-ink [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">Medusae Fossae Formation</p>
            <p className="num whitespace-nowrap text-[13px] text-ink/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
              {formatLat(cLat)} · {formatMarsLon(cLon)} · supported study region
            </p>
          </div>
          {toast ? (
            <div className="pointer-events-none absolute z-10 w-[280px] -translate-x-1/2 rounded-[10px] border border-hairline bg-bg/95 px-3 py-2 text-[13px] shadow-xl fade-in" style={{ left: `${Math.min(85, Math.max(15, toast.x))}%`, top: `${Math.min(88, toast.y + 4)}%` }} role="status">
              <p className="font-semibold text-ink">Not yet available</p>
              <p className="text-muted">
                <span className="num">{formatLat(toast.lat)} · {formatMarsLon(toast.lon)}</span> is outside our published study coverage. No terrain is shown for it.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-[10px] border border-hairline bg-bg/80 px-3 py-2 backdrop-blur">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-copper-light">Mars region navigator</p>
        <p className="mt-0.5 text-[12px] text-muted">MOLA 463 m shaded relief · {formatLat(L.lat_max)}–{formatLat(L.lat_min)} · {formatMarsLon(L.lon_min)}–{formatMarsLon(L.lon_max)}</p>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 rounded-[10px] border border-hairline bg-bg/80 px-3 py-2 text-right backdrop-blur">
        <p className="text-[12px] uppercase tracking-[0.14em] text-muted">Cursor</p>
        <p className="num text-[14px] text-ink">{cursor ? `${formatLat(cursor.lat)} · ${formatMarsLon(cursor.lon)}` : "—"}</p>
      </div>
      <div className="absolute bottom-4 left-4 hidden md:block" style={{ opacity: arriving ? 0 : 1, transition: "opacity 300ms" }}>
        <RegionDetail footprints={L.footprints} hover={hover} setHover={setHover} choice={choice} onPick={onPick} />
      </div>
      <p className="pointer-events-none absolute bottom-4 right-4 max-w-[420px] rounded-[8px] bg-bg/75 px-3 py-1.5 text-right text-[12px] leading-snug text-muted">
        Base map: MGS MOLA (NASA/GSFC; USGS mosaic), shaded for display. One supported region; click elsewhere to check coverage.
      </p>
      {arriving ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center fade-in" aria-live="polite">
          <div className="absolute h-[180px] w-[180px] rounded-full border border-copper/60" />
          <div className="absolute h-px w-[260px] bg-copper/50" />
          <div className="absolute h-[260px] w-px bg-copper/50" />
          <div className="mt-[260px] rounded-[10px] border border-copper/50 bg-bg/80 px-4 py-2 text-center backdrop-blur">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-copper-light">Descending</p>
            <p className="num text-[15px] text-ink">
              Medusae Fossae · {formatLat(cLat)} · {formatMarsLon(cLon)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAX showcase                                                         */
/* ------------------------------------------------------------------ */
function PaxShowcase({ cue, line }: { cue: PaxCue | null; line: string }) {
  const small = useSyncExternalStore(subscribeSmall, () => window.matchMedia("(max-width: 1023px)").matches, () => true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const use3D = !small && !failed;
  return (
    <figure className="relative h-full w-full">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[14px]" style={{ background: "radial-gradient(ellipse 60% 62% at 50% 55%, rgba(232,120,61,0.16) 0%, rgba(23,29,37,0.6) 40%, rgba(9,12,17,0) 78%)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PAX_POSTER}
        alt={use3D && ready ? "" : "PAX, the PARALLAX X rover"}
        className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
        style={{ opacity: use3D && ready ? 0 : 1, WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)" }}
        draggable={false}
      />
      {use3D ? (
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }} role="img" aria-label="PAX, the PARALLAX X rover, animated in 3D">
          <PaxStage cue={cue} onReady={() => setReady(true)} onError={() => setFailed(true)} />
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[230px] rounded-[12px] rounded-bl-[3px] border border-copper/40 bg-bg/85 px-3 py-2 text-[14px] leading-snug text-ink/90 backdrop-blur" aria-live="polite">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-copper-light">PAX</span>
        {line}
      </div>
      <figcaption className="pointer-events-none absolute bottom-1 right-2 text-[12px] text-muted">Expedition rover · character, not to scale</figcaption>
    </figure>
  );
}

function SceneCard({ active, onClick, thumb, title, tag, rows, purpose }: { active: boolean; onClick: () => void; thumb: string; title: string; tag: string; rows: [string, string][]; purpose: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`group flex w-full gap-4 rounded-[12px] border p-3 text-left transition-all duration-200 ${active ? "border-copper bg-copper/10 shadow-[0_0_0_1px_rgba(232,120,61,0.5),0_0_26px_rgba(232,120,61,0.18)]" : "border-hairline bg-surface/70 hover:border-[#3d4a57]"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb} alt="" className="h-[92px] w-[92px] shrink-0 rounded-[8px] border border-hairline object-cover [@media(max-height:860px)]:h-[72px] [@media(max-height:860px)]:w-[72px]" draggable={false} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-[18px] font-semibold leading-tight text-ink">{title}</span>
          <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${active ? "border-copper" : "border-[#55606b]"}`}>{active ? <span className="h-2 w-2 rounded-full bg-copper" /> : null}</span>
        </span>
        <span className="mt-0.5 block text-[13px] font-medium text-copper-light">{tag}</span>
        <span className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
          {rows.map(([k, v], i) => (
            <span key={k} className={i === 2 ? "contents [@media(max-height:860px)]:hidden" : "contents"}>
              <span className="text-muted">{k}</span>
              <span className="num truncate text-ink/90">{v}</span>
            </span>
          ))}
        </span>
        <span className="mt-1.5 block text-[13px] leading-snug text-muted [@media(max-height:860px)]:hidden">{purpose}</span>
      </span>
    </button>
  );
}

function ArrowRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-[3px]">
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STEPS = ["Select", "Arrive", "Explore", "Compare", "Evidence"];

export function SelectView({
  locator,
  sources,
  heroMeta,
  onExplore,
  onOpenAbout,
  busy = false,
}: {
  locator: Loadable<Locator>;
  sources: Loadable<SourceRecord[]>;
  heroMeta: HeightfieldMeta | null;
  onExplore: (scene: SceneChoice, opts?: { demo?: boolean }) => void;
  onOpenAbout: () => void;
  /** True while real loading has started but the loading screen is not shown yet. */
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const [choice, setChoice] = useState<SceneChoice>("hirise");
  const [cue, setCue] = useState<PaxCue | null>(null);
  const [arriving, setArriving] = useState(false);
  const [line, setLine] = useState("Pick a real Mars scene and I’ll take you down to the surface.");

  const fire = useCallback((name: PaxCueName) => setCue((c) => ({ name, n: (c?.n ?? 0) + 1 })), []);

  const zooming = arriving && busy; // the arrival zoom only runs while the real load is in flight

  const pick = (s: SceneChoice) => {
    if (busy) return;
    setChoice(s);
    sfx("select");
    fire(s === "hirise" ? "turn" : "tilt");
    setLine(s === "hirise" ? "HiRISE scarps: 1 m stereo terrain. I can drive a demo loop there." : "CTX yardangs: the exact area we matched against 1,915 Earth windows.");
  };

  const go = (demo = false) => {
    if (busy) return;
    fire("wave");
    sfx("startup");
    window.setTimeout(() => sfx("whoosh"), 350);
    setLine(demo ? "Starting the guided demo — sit back." : "Descending to Medusae Fossae…");
    if (!reduced) setArriving(true);
    onExplore(demo ? "hirise" : choice, { demo }); // real loading starts now; the zoom covers it
  };

  const ctxProduct = sources.status === "ready" ? sources.data.find((s) => s.id === "ctx")?.product_id : undefined;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg fade-in lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <header className="z-20 flex h-[68px] shrink-0 items-center gap-4 border-b border-hairline bg-bg/95 px-4 xl:px-6">
        <Wordmark height={30} />
        <ol className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Mission flow">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <span className={`flex items-center gap-2 rounded-[10px] border px-3 py-[7px] text-[13px] font-semibold uppercase tracking-[0.08em] ${i === 0 ? "border-copper bg-copper/15 text-ink shadow-[0_0_18px_rgba(232,120,61,0.25)]" : "border-transparent text-muted"}`}>
                <span className="num text-[12px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </span>
              {i < STEPS.length - 1 ? <span className="text-[#3a4550]" aria-hidden="true">›</span> : null}
            </li>
          ))}
        </ol>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <SoundControl />
          <button type="button" onClick={onOpenAbout} className="min-h-[40px] px-2 text-[13px] text-muted hover:text-ink">
            Methods
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(400px,32%)]">
        <section className="order-2 h-[56vw] max-h-[560px] min-h-[300px] lg:order-1 lg:h-auto lg:max-h-none" aria-label="Mars region navigator">
          <Navigator locator={locator} hover={hover} setHover={setHover} choice={choice} onPick={pick} arriving={zooming} />
        </section>

        <aside className="order-1 flex min-h-0 flex-col gap-3 lg:order-2 lg:overflow-y-auto">
          <div className="relative hidden min-h-[150px] flex-1 overflow-hidden rounded-[14px] border border-hairline bg-surface/40 lg:block">
            <PaxShowcase cue={cue} line={line} />
          </div>
          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="whitespace-nowrap font-display text-[22px] font-semibold uppercase tracking-[0.03em] text-ink">Select location</h1>
              <p className="text-right text-[12px] font-medium uppercase tracking-[0.14em] text-muted">1 region · 2 real scenes</p>
            </div>
            <p className="mt-1 text-[14px] leading-snug text-muted [@media(max-height:860px)]:hidden">Medusae Fossae Formation, Mars — wind-carved terrain we tested against Earth.</p>
            <div role="radiogroup" aria-label="Mars scene" className="mt-3 space-y-2">
              <SceneCard
                active={choice === "hirise"}
                onClick={() => pick("hirise")}
                thumb="/data/thumbs/mars_hirise_hero_lg.webp"
                title="HiRISE Scarp Explorer"
                tag="Fine-scale 3D showcase · PAX drive"
                rows={[
                  ["Source", heroMeta?.source_id ?? "HiRISE DTM"],
                  ["Posting", heroMeta?.source_posting_m ? `${formatPosting(heroMeta.source_posting_m)} (shown at ${formatPosting(heroMeta.posting_m)})` : "—"],
                  ["Extent", heroMeta ? `${(heroMeta.extent_m[0] / 1000).toFixed(1)} × ${(heroMeta.extent_m[1] / 1000).toFixed(1)} km` : "—"],
                ]}
                purpose="Layered scarps. Not used in the Earth ranking."
              />
              <SceneCard
                active={choice === "ctx"}
                onClick={() => pick("ctx")}
                thumb="/data/thumbs/cmp_mars_lg.webp"
                title="CTX Yardang Study"
                tag="Mars–Earth comparison target"
                rows={[
                  ["Source", ctxProduct ?? "CTX stereo DTM (USGS)"],
                  ["Grid", "30 m common analysis grid"],
                  ["Extent", "10 × 10 km window"],
                ]}
                purpose="The yardang field fingerprinted against 1,915 Earth windows."
              />
            </div>
            <button
              type="button"
              onClick={() => go(false)}
              aria-busy={busy}
              className="group mt-3 inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[10px] bg-copper px-6 text-[17px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_0_28px_rgba(232,120,61,0.35)] transition-colors duration-150 hover:bg-[#d4692f] disabled:cursor-wait"
            >
              {busy ? "Descending…" : choice === "hirise" ? "Begin descent" : "Descend & compare"}
              {busy ? null : <ArrowRight />}
            </button>
            <button
              type="button"
              onClick={() => go(true)}
              disabled={busy}
              className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-hairline bg-bg/60 text-[14px] font-semibold text-ink/90 hover:border-copper disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-copper-light" fill="currentColor" aria-hidden="true">
                <path d="M8 5.6v12.8a1 1 0 001.52.85l10.2-6.4a1 1 0 000-1.7L9.52 4.75A1 1 0 008 5.6z" />
              </svg>
              Play 30-second guided demo
            </button>
            <p className="mt-2 text-[12px] leading-snug text-muted [@media(max-height:860px)]:hidden">Two different terrain patches ~10 km apart, not one scene at two resolutions. Both are real stereo elevation models.</p>
          </div>
        </aside>
      </main>

      <section aria-label="Pre-registered validation outcome" className="shrink-0 border-t border-hairline px-3 pb-3 pt-2">
        <div className="overflow-hidden rounded-[10px] border border-hairline">
          <ValidationBanner compact />
        </div>
      </section>
      <div className="lg:hidden">
        <SiteFooter onOpenAbout={onOpenAbout} />
      </div>
    </div>
  );
}
