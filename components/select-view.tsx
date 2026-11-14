"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Loadable } from "@/lib/data";
import type { HeightfieldMeta, Locator, LocatorFootprint, SourceRecord } from "@/lib/types";
import { formatLat, formatMarsLon, formatPosting } from "@/lib/format";
import { ValidationBanner } from "./validation-banner";
import { Wordmark } from "./wordmark";
import { SiteFooter } from "./site-footer";
import type { PaxCue, PaxCueName } from "./pax-stage";

// three.js + the 4.6 MB GLB load only on the client, after first paint. The poster covers the gap.
const PaxStage = dynamic(() => import("./pax-stage"), { ssr: false });

export const PAX_POSTER = "/models/pax-rover-poster.webp";

type FootprintStyle = { stroke: string; fill: string; dash?: string; width: number; name: string; role: string };

const FOOTPRINT_STYLE: Record<LocatorFootprint["kind"], FootprintStyle> = {
  hirise: {
    stroke: "#DF9070",
    fill: "rgba(223,144,112,0.30)",
    width: 2,
    name: "HiRISE layered scarps",
    role: "3D explorer",
  },
  fingerprint: {
    stroke: "#F3F1ED",
    fill: "rgba(243,241,237,0.07)",
    dash: "5 3",
    width: 1.5,
    name: "CTX yardang study area",
    role: "Earth comparison",
  },
  ctx: {
    stroke: "#9DA6AF",
    fill: "none",
    dash: "1.5 3",
    width: 1.1,
    name: "CTX terrain model extent",
    role: "USGS stereo DTM scene",
  },
};

/** Mean Mars radius (km), used only to draw the inset's km scale. */
const MARS_RADIUS_KM = 3389.5;

function Swatch({ kind, size = 22 }: { kind: LocatorFootprint["kind"]; size?: number }) {
  const st = FOOTPRINT_STYLE[kind] ?? FOOTPRINT_STYLE.ctx;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <rect x="2" y="2" width="18" height="18" rx="2" fill={st.fill === "none" ? "transparent" : st.fill} stroke={st.stroke} strokeWidth={st.width + 0.3} strokeDasharray={st.dash} />
    </svg>
  );
}

/** Vector inset: footprints at true relative size (they are a few pixels wide on the overview). */
function FootprintInset({ footprints, hover, setHover }: { footprints: LocatorFootprint[]; hover: string | null; setHover: (id: string | null) => void }) {
  const all = footprints.flatMap((f) => f.polygon);
  if (!all.length) return null;
  let lonMin = Math.min(...all.map((p) => p[0]));
  let lonMax = Math.max(...all.map((p) => p[0]));
  let latMin = Math.min(...all.map((p) => p[1]));
  let latMax = Math.max(...all.map((p) => p[1]));
  const padLon = (lonMax - lonMin) * 0.12;
  const padLat = (latMax - latMin) * 0.12;
  lonMin -= padLon;
  lonMax += padLon;
  latMin -= padLat;
  latMax += padLat;
  const midLat = (latMin + latMax) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const aspect = ((lonMax - lonMin) * kx) / (latMax - latMin); // width / height
  const MAX = 124;
  const W = Math.round(aspect >= 1 ? MAX : MAX * aspect);
  const H = Math.round(aspect >= 1 ? MAX / aspect : MAX);
  const tx = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * W;
  const ty = (lat: number) => ((latMax - lat) / (latMax - latMin)) * H;
  const kmPerDegLon = ((Math.PI / 180) * MARS_RADIUS_KM) * kx;
  const kmAcross = (lonMax - lonMin) * kmPerDegLon;
  const barKm = kmAcross > 40 ? 10 : kmAcross > 20 ? 5 : 2;
  const barPx = (barKm / kmAcross) * W;
  const order: LocatorFootprint["kind"][] = ["ctx", "fingerprint", "hirise"];
  const sorted = [...footprints].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const VW = Math.max(W, 96);
  return (
    <div className="rounded-[10px] border border-hairline bg-bg/95 p-3">
      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted">True relative size</p>
      <svg viewBox={`0 0 ${VW} ${H + 24}`} width={VW} className="block max-w-full" role="img" aria-label="Footprints at true relative size">
        {sorted.map((f) => {
          const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
          const on = hover === f.id;
          return (
            <polygon
              key={f.id}
              points={f.polygon.map(([lo, la]) => `${tx(lo).toFixed(1)},${ty(la).toFixed(1)}`).join(" ")}
              fill={on ? "rgba(223,144,112,0.38)" : st.fill}
              stroke={st.stroke}
              strokeWidth={on ? st.width + 1 : st.width}
              strokeDasharray={st.dash}
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: "fill 160ms linear" }}
            >
              <title>{`${st.name} — ${st.role}`}</title>
            </polygon>
          );
        })}
        <line x1={2} y1={H + 14} x2={2 + barPx} y2={H + 14} stroke="#F3F1ED" strokeWidth={2} />
        <text x={8 + barPx} y={H + 18.5} fill="#9DA6AF" style={{ fontSize: 12, fontFamily: "var(--font-jetbrains), monospace" }}>
          {barKm} km
        </text>
      </svg>
    </div>
  );
}

function LocatorMap({ locator, hoverId, setHoverId }: { locator: Loadable<Locator>; hoverId: string | null; setHoverId: (id: string | null) => void }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (locator.status === "loading") {
    return <div className="aspect-[960/520] w-full rounded-[12px] border border-hairline bg-surface" aria-busy="true" />;
  }
  if (locator.status !== "ready" || imgFailed) {
    return (
      <div className="flex aspect-[960/520] w-full items-center justify-center rounded-[12px] border border-dashed border-hairline bg-surface/40 p-6 text-center">
        <div>
          <p className="text-[16px] text-ink">Mars locator map not available yet.</p>
          <p className="mt-1 text-[15px] text-muted">
            The MOLA shaded-relief locator (locator.json) has not been published by the data pipeline. No placeholder map is shown.
          </p>
        </div>
      </div>
    );
  }
  const L = locator.data;
  const toX = (lon: number) => ((lon - L.lon_min) / (L.lon_max - L.lon_min)) * 1000;
  const toY = (lat: number) => ((L.lat_max - lat) / (L.lat_max - L.lat_min)) * 1000;
  const pts = L.footprints.flatMap((f) => f.polygon);
  const cLon = pts.length ? (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2 : null;
  const cLat = pts.length ? (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2 : null;
  const mx = cLon !== null ? toX(cLon) / 10 : 0; // %
  const my = cLat !== null ? toY(cLat) / 10 : 0; // %

  return (
    <figure>
      <div className="relative overflow-hidden rounded-[12px] border border-hairline bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={L.image}
          alt={`MOLA shaded relief of Mars, ${formatLat(L.lat_min)}–${formatLat(L.lat_max)}, ${formatMarsLon(L.lon_min)}–${formatMarsLon(L.lon_max)}, with the supported Medusae Fossae site marked`}
          className="block w-full select-none"
          style={{ filter: "grayscale(1) sepia(0.22) contrast(0.96) brightness(0.86)" }}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
        {/* soft edge vignette so overlays stay legible */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 85% at 55% 45%, transparent 55%, rgba(9,12,17,0.55) 100%)" }} />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="group" aria-label="Supported footprints">
          {L.footprints.map((f) => {
            const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
            const p = f.polygon.map(([lon, lat]) => `${toX(lon).toFixed(2)},${toY(lat).toFixed(2)}`).join(" ");
            return (
              <polygon key={f.id} points={p} fill={st.fill} stroke={st.stroke} strokeWidth={st.width} vectorEffect="non-scaling-stroke">
                <title>{`${st.name} — ${st.role}`}</title>
              </polygon>
            );
          })}
        </svg>
        {cLon !== null && cLat !== null ? (
          <>
            {/* leader from the site to the true-size inset (bottom-left); the inset panel covers its end */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
              <line x1={`${mx - 0.9}%`} y1={`${my + 1.6}%`} x2={`${mx - 5}%`} y2={`${my + 9}%`} stroke="#F3F1ED" strokeOpacity={0.5} strokeWidth={1} />
              <line x1={`${mx - 5}%`} y1={`${my + 9}%`} x2="6%" y2={`${my + 9}%`} stroke="#F3F1ED" strokeOpacity={0.5} strokeWidth={1} />
            </svg>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-200 ${hoverId ? "border-copper-light" : "border-copper"}`}
              style={{ left: `${mx}%`, top: `${my}%` }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-light"
              style={{ left: `${mx}%`, top: `${my}%` }}
            />
            <div className="pointer-events-none absolute -translate-y-1/2 pl-6" style={{ left: `${mx}%`, top: `${my}%` }}>
              <p className="whitespace-nowrap font-display text-[15px] font-semibold leading-tight text-ink [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] md:text-[17px]">Medusae Fossae</p>
              <p className="num whitespace-nowrap text-[12px] text-ink/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] md:text-[13px]">
                {formatLat(cLat)} · {formatMarsLon(cLon)}
              </p>
            </div>
          </>
        ) : null}
        <div className="absolute bottom-3 left-3 hidden md:block">
          <FootprintInset footprints={L.footprints} hover={hoverId} setHover={setHoverId} />
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded-[6px] bg-bg/75 px-2 py-1 text-[13px] text-muted num">
          {formatLat(L.lat_max)} · {formatMarsLon(L.lon_min)}
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-[6px] bg-bg/75 px-2 py-1 text-[13px] text-muted num">
          {formatLat(L.lat_min)} · {formatMarsLon(L.lon_max)}
        </div>
      </div>
      <figcaption className="mt-3 text-[14px] leading-relaxed text-muted">
        Base map: {L.source}. One supported Mars region in this prototype; no global HiRISE coverage is implied.
      </figcaption>
    </figure>
  );
}

const subscribeSmall = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** 3D PAX with its poster underneath: poster shows while three/GLB load, on small screens, and on any failure. */
function PaxShowcase({ cue }: { cue: PaxCue | null }) {
  const small = useSyncExternalStore(
    subscribeSmall,
    () => window.matchMedia("(max-width: 639px)").matches,
    () => true, // server/prerender: poster only
  );
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const use3D = !small && !failed;
  return (
    <figure className="relative h-full w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[14px]"
        style={{ background: "radial-gradient(ellipse 62% 58% at 50% 46%, #171D25 0%, rgba(18,24,32,0.55) 45%, rgba(9,12,17,0) 78%)" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PAX_POSTER}
        alt={use3D && ready ? "" : "PAX, the PARALLAX X rover character"}
        className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
        style={{
          opacity: use3D && ready ? 0 : 1,
          WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
        }}
        draggable={false}
      />
      {use3D ? (
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }} role="img" aria-label="PAX, the PARALLAX X rover character, animated in 3D">
          <PaxStage cue={cue} onReady={() => setReady(true)} onError={() => setFailed(true)} />
        </div>
      ) : null}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-1 text-[13px] text-muted">
        <span>
          <span className="font-medium text-ink/90">PAX</span> · expedition guide
        </span>
        <span>Character, not to scale</span>
      </figcaption>
    </figure>
  );
}

function ArrowRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-[3px]">
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  onExplore: () => void;
  onOpenAbout: () => void;
  /** True while real loading has started but the loading screen is not shown yet. */
  busy?: boolean;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cue, setCue] = useState<PaxCue | null>(null);
  const lastTilt = useRef(0);

  const fire = useCallback((name: PaxCueName) => setCue((c) => ({ name, n: (c?.n ?? 0) + 1 })), []);
  const inspect = useCallback(() => {
    const now = Date.now();
    if (now - lastTilt.current < 9000) return;
    lastTilt.current = now;
    fire("tilt");
  }, [fire]);

  const explore = () => {
    if (busy) return;
    fire("wave");
    onExplore(); // never wait for the animation
  };

  const footprints = locator.status === "ready" ? locator.data.footprints : [];
  const byKind = (k: LocatorFootprint["kind"]) => footprints.find((f) => f.kind === k);
  const ctxProduct = sources.status === "ready" ? sources.data.find((s) => s.id === "ctx")?.product_id : undefined;
  const legend: { kind: LocatorFootprint["kind"]; detail: string; product?: string }[] = [
    {
      kind: "hirise",
      detail: `Wind-eroded layered scarps${heroMeta?.source_posting_m ? ` · ${formatPosting(heroMeta.source_posting_m)} posting` : ""}`,
      product: heroMeta?.source_id,
    },
    { kind: "fingerprint", detail: "Yardang fingerprint · matched against Earth DEMs", product: ctxProduct },
  ];

  return (
    <div className="relative flex min-h-screen flex-col fade-in">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse 120% 95% at 50% 30%, rgba(9,12,17,0) 55%, rgba(0,0,0,0.5) 100%)" }} />

      <header className="mx-auto flex h-[64px] w-full max-w-[1360px] items-center justify-between px-6 md:h-[72px] md:px-10">
        <Wordmark height={28} />
        <button
          type="button"
          onClick={onOpenAbout}
          className="-mr-3 inline-flex min-h-[44px] items-center rounded-[8px] px-3 text-[15px] text-muted transition-colors hover:text-ink"
        >
          Research <span className="mx-1.5 text-hairline">/</span> Methods
        </button>
      </header>
      <div className="mx-auto w-full max-w-[1360px] px-6 md:px-10">
        <div className="h-px w-full bg-hairline" />
      </div>

      <main className="mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-1 gap-x-12 gap-y-8 px-6 pb-10 pt-8 md:px-10 lg:grid-cols-[minmax(0,1.42fr)_minmax(340px,1fr)] lg:pt-9 xl:gap-x-16">
        {/* Left column on desktop; flattened into the grid on small screens so the CTA comes early */}
        <div className="contents lg:flex lg:flex-col lg:gap-8">
          <section className="order-1">
            <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-copper-light">
              Expedition 01 <span className="mx-1 text-muted">/</span> Medusae Fossae
            </p>
            <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.03] tracking-[-0.025em] text-ink sm:text-[52px] xl:text-[62px]">
              One landscape. <br className="hidden sm:inline" />
              Two worlds. <br className="hidden sm:inline" />
              <span className="text-muted">A harder question.</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-muted md:text-[19px]">
              Explore real Martian terrain, then test which Earth landscapes truly resemble its shape.
            </p>
          </section>
          <section className="order-3" aria-label="Mars locator map" onPointerEnter={inspect}>
            <LocatorMap locator={locator} hoverId={hoverId} setHoverId={setHoverId} />
          </section>
        </div>

        {/* Right column: PAX focal object above the site card */}
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-4 h-[260px] sm:h-[340px] lg:order-none lg:h-[clamp(230px,calc(100vh-480px),440px)]">
            <PaxShowcase cue={cue} />
          </div>

          <section
            aria-labelledby="site-card"
            className="order-2 rounded-[12px] border border-hairline bg-surface p-5 md:p-6"
            onPointerEnter={inspect}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted">Select location</p>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted">1 supported site</p>
            </div>
            <h2 id="site-card" className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[26px]">
              Medusae Fossae Formation<span className="text-copper-light">, Mars</span>
            </h2>

            <ul className="mt-4 space-y-1" aria-label="Map legend">
              {legend.map((row) => {
                const fp = byKind(row.kind);
                const st = FOOTPRINT_STYLE[row.kind];
                const on = !!fp && hoverId === fp.id;
                return (
                  <li key={row.kind}>
                    <div
                      className={`-mx-2 flex items-start gap-3 rounded-[8px] px-2 py-2 transition-colors duration-150 ${on ? "bg-surface-soft" : ""}`}
                      onMouseEnter={() => fp && setHoverId(fp.id)}
                      onMouseLeave={() => setHoverId(null)}
                      title={row.product}
                    >
                      <span className="mt-[1px]">
                        <Swatch kind={row.kind} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium leading-snug text-ink">
                          {st.name} <span className="font-normal text-muted">— {st.role}</span>
                        </span>
                        <span className="block text-[14px] leading-snug text-muted">{row.detail}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[14px] leading-snug text-muted">Two different terrain patches, a few km apart — not one scene at two resolutions.</p>

            <button
              type="button"
              onClick={explore}
              aria-busy={busy}
              className="group mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[10px] bg-copper px-6 text-[17px] font-semibold text-white transition-colors duration-150 hover:bg-[#B45D40] active:bg-[#A65338] disabled:cursor-wait"
            >
              {busy ? "Preparing terrain…" : "Explore Mars Terrain"}
              {busy ? null : <ArrowRight />}
            </button>
          </section>
        </div>
      </main>

      <section aria-label="Pre-registered validation outcome" className="mx-auto w-full max-w-[1360px] px-6 pb-10 md:px-10">
        <div className="grid gap-3 border-t border-hairline pt-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted">Honest result</p>
            <p className="mt-1 text-[15px] text-ink">What the method could not show</p>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-hairline">
            <ValidationBanner />
          </div>
        </div>
      </section>

      <SiteFooter onOpenAbout={onOpenAbout} />
    </div>
  );
}
