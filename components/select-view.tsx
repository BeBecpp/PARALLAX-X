"use client";

import { ValidationBanner } from "./validation-banner";

import { useState } from "react";
import type { Loadable } from "@/lib/data";
import type { HeightfieldMeta, Locator, LocatorFootprint, SourceRecord } from "@/lib/types";
import { formatLat, formatMarsLon, formatMetres, formatPosting } from "@/lib/format";
import { Button } from "./ui";
import { Wordmark } from "./wordmark";
import { SiteFooter } from "./site-footer";

const FOOTPRINT_STYLE: Record<LocatorFootprint["kind"], { stroke: string; dash?: string; width: number; label: string }> = {
  fingerprint: { stroke: "#C97951", dash: "5 4", width: 1.5, label: "Fingerprint region (Mars sample used for matching)" },
  hirise: { stroke: "#C97951", width: 2.25, label: "HiRISE stereo terrain model footprint" },
  ctx: { stroke: "#87929D", width: 1.25, dash: "2 3", label: "CTX terrain model footprint" },
};

/** Mean Mars radius (km), used only to draw the inset's km scale. */
const MARS_RADIUS_KM = 3389.5;

/** Vector inset: footprints at true relative size (they are a few pixels wide on the overview). */
function FootprintInset({ footprints, hover, setHover }: { footprints: LocatorFootprint[]; hover: string | null; setHover: (id: string | null) => void }) {
  const all = footprints.flatMap((f) => f.polygon);
  if (!all.length) return null;
  let lonMin = Math.min(...all.map((p) => p[0]));
  let lonMax = Math.max(...all.map((p) => p[0]));
  let latMin = Math.min(...all.map((p) => p[1]));
  let latMax = Math.max(...all.map((p) => p[1]));
  const padLon = (lonMax - lonMin) * 0.15;
  const padLat = (latMax - latMin) * 0.15;
  lonMin -= padLon;
  lonMax += padLon;
  latMin -= padLat;
  latMax += padLat;
  const midLat = (latMin + latMax) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const aspect = ((lonMax - lonMin) * kx) / (latMax - latMin); // width / height
  const MAX = 130;
  const W = Math.round(aspect >= 1 ? MAX : MAX * aspect);
  const H = Math.round(aspect >= 1 ? MAX / aspect : MAX);
  const tx = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * W;
  const ty = (lat: number) => ((latMax - lat) / (latMax - latMin)) * H;
  const kmPerDegLon = ((Math.PI / 180) * MARS_RADIUS_KM) * kx;
  const kmAcross = (lonMax - lonMin) * kmPerDegLon;
  const barKm = kmAcross > 40 ? 10 : kmAcross > 20 ? 5 : 2;
  const barPx = (barKm / kmAcross) * W;
  return (
    <div className="rounded-[8px] border border-hairline bg-bg/90 p-2">
      <svg viewBox={`0 0 ${Math.max(W, 90)} ${H + 22}`} width={Math.max(W, 90)} className="block max-w-full" role="img" aria-label="Footprints at true relative size">
        {footprints.map((f) => {
          const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
          const on = hover === f.id;
          return (
            <polygon
              key={f.id}
              points={f.polygon.map(([lo, la]) => `${tx(lo).toFixed(1)},${ty(la).toFixed(1)}`).join(" ")}
              fill={on ? "rgba(201,121,81,0.22)" : f.kind === "hirise" ? "rgba(201,121,81,0.12)" : "none"}
              stroke={st.stroke}
              strokeWidth={on ? st.width + 1 : st.width}
              strokeDasharray={st.dash}
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{f.label}</title>
            </polygon>
          );
        })}
        <text x={4} y={12} fill="#87929D" style={{ fontSize: 11 }}>Inset</text>
        <line x1={6} y1={H + 14} x2={6 + barPx} y2={H + 14} stroke="#EAF0F4" strokeWidth={2} />
        <text x={12 + barPx} y={H + 18} fill="#87929D" style={{ fontSize: 12, fontFamily: "var(--font-jetbrains), monospace" }}>
          {barKm} km
        </text>
      </svg>
    </div>
  );
}

function LocatorMap({ locator }: { locator: Loadable<Locator> }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  if (locator.status === "loading") {
    return <div className="aspect-[16/9] w-full rounded-[8px] border border-hairline bg-surface" aria-busy="true" />;
  }
  if (locator.status !== "ready" || imgFailed) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[8px] border border-dashed border-hairline bg-surface/40 p-6 text-center">
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
  const kinds = Array.from(new Set(L.footprints.map((f) => f.kind)));
  const hover = L.footprints.find((f) => f.id === hoverId) ?? null;
  const pts = L.footprints.flatMap((f) => f.polygon);
  const cLon = pts.length ? (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2 : null;
  const cLat = pts.length ? (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2 : null;

  return (
    <figure>
      <div className="relative overflow-hidden rounded-[8px] border border-hairline bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={L.image}
          alt={`MOLA shaded relief of Mars, ${formatLat(L.lat_min)}–${formatLat(L.lat_max)}, ${formatMarsLon(L.lon_min)}–${formatMarsLon(L.lon_max)}`}
          className="block w-full select-none"
          style={{ filter: "grayscale(1) contrast(0.92) brightness(0.92)" }}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="group" aria-label="Supported footprints">
          {L.footprints.map((f) => {
            const st = FOOTPRINT_STYLE[f.kind] ?? FOOTPRINT_STYLE.ctx;
            const pts = f.polygon.map(([lon, lat]) => `${toX(lon).toFixed(2)},${toY(lat).toFixed(2)}`).join(" ");
            const on = hoverId === f.id;
            return (
              <polygon
                key={f.id}
                points={pts}
                fill={on ? "rgba(201,121,81,0.18)" : "rgba(201,121,81,0.06)"}
                stroke={st.stroke}
                strokeWidth={on ? st.width + 1 : st.width}
                strokeDasharray={st.dash}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setHoverId(f.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{ transition: "fill 150ms linear", cursor: "default" }}
              >
                <title>{f.label}</title>
              </polygon>
            );
          })}
        </svg>
        {cLon !== null && cLat !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-copper"
            style={{ left: `${toX(cLon) / 10}%`, top: `${toY(cLat) / 10}%` }}
          />
        ) : null}
        <div className="absolute bottom-3 left-3 hidden md:block" title="Inset: footprints at true relative size">
          <FootprintInset footprints={L.footprints} hover={hoverId} setHover={setHoverId} />
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded-[6px] bg-bg/80 px-2 py-1 text-[14px] text-ink num">
          {hover ? hover.label : `${formatLat(L.lat_max)} · ${formatMarsLon(L.lon_min)}`}
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-[6px] bg-bg/80 px-2 py-1 text-[14px] text-muted num">
          {formatLat(L.lat_min)} · {formatMarsLon(L.lon_max)}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-muted">
        {kinds.map((k) => {
          const st = FOOTPRINT_STYLE[k] ?? FOOTPRINT_STYLE.ctx;
          return (
            <span key={k} className="inline-flex items-center gap-2">
              <svg width="28" height="10" aria-hidden="true">
                <line x1="1" y1="5" x2="27" y2="5" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} />
              </svg>
              {st.label}
            </span>
          );
        })}
        <span>Base map: {L.source}</span>
      </figcaption>
    </figure>
  );
}

export function SelectView({
  locator,
  sources,
  heroMeta,
  onExplore,
  onOpenAbout,
}: {
  locator: Loadable<Locator>;
  sources: Loadable<SourceRecord[]>;
  heroMeta: HeightfieldMeta | null;
  onExplore: () => void;
  onOpenAbout: () => void;
}) {
  const marsProducts =
    sources.status === "ready"
      ? sources.data.filter((s) => s.planet?.toLowerCase() === "mars" && s.product_id && s.product_id !== heroMeta?.source_id && !/mola/i.test(`${s.id} ${s.product_id}`))
      : [];

  return (
    <div className="min-h-screen fade-in">
      <header className="flex items-center justify-between px-6 py-5 md:px-8">
        <Wordmark />
        <nav className="flex items-center gap-1">
          <Button variant="quiet" onClick={onOpenAbout}>
            About
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-16 md:px-8">
        <h1 className="mt-6 max-w-[900px] font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.01em] md:text-[52px]">
          Where on Earth does this Mars terrain live?
        </h1>
        <p className="mt-4 max-w-[720px] text-[17px] text-muted md:text-[19px]">
          Choose a Mars site with real high-resolution terrain data. PARALLAX X ranks Earth landscapes by how closely
          their shape matches it, at a scale both planets&apos; data can resolve.
        </p>

        <div className="mt-6 max-w-[1100px]">
          <ValidationBanner />
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.7fr_1fr]">
          <LocatorMap locator={locator} />

          <section aria-labelledby="site-card" className="rounded-[8px] border border-hairline bg-surface p-6">
            <p className="text-[14px] uppercase tracking-[0.12em] text-muted">Supported site</p>
            <h2 id="site-card" className="mt-2 font-display text-[26px] font-semibold leading-tight">
              Medusae Fossae yardangs <span className="text-copper">— Mars</span>
            </h2>
            {heroMeta ? (
              <>
                <p className="mt-3 text-[15px] text-muted">
                  Two real scenes from one CTX image area: the <span className="text-ink">yardang fingerprint area</span> (CTX, used
                  for every Earth comparison) and, a few km south, <span className="text-ink">wind-eroded layered scarps</span> seen
                  at 1 m by HiRISE (3D explorer and fine-scale measurements). They are different terrain patches.
                </p>
                <dl className="mt-5 space-y-3 text-[15px]">
                  <div>
                    <dt className="text-[14px] text-muted">HiRISE stereo terrain model</dt>
                    <dd className="num break-all text-[14px] text-ink">{heroMeta.source_id}</dd>
                  </div>
                  {marsProducts.map((s) => (
                    <div key={s.id}>
                      <dt className="text-[14px] text-muted">{s.provider.split(" — ")[0]} {/ctx/i.test(s.id) ? "CTX terrain model" : ""}</dt>
                      <dd className="num break-all text-[14px] text-ink">{s.product_id}</dd>
                    </div>
                  ))}
                  <div className="flex gap-6">
                    {heroMeta.source_posting_m ? (
                      <div>
                        <dt className="text-[14px] text-muted">Source posts</dt>
                        <dd className="num text-ink">{formatPosting(heroMeta.source_posting_m)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-[14px] text-muted">Crop shown</dt>
                      <dd className="num text-ink">
                        {formatMetres(heroMeta.extent_m[0])} × {formatMetres(heroMeta.extent_m[1])}
                      </dd>
                    </div>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-muted">Loading product details…</p>
            )}
            <Button variant="primary" className="mt-6 w-full min-h-[48px] text-[16px]" onClick={onExplore}>
              Explore
            </Button>
            <p className="mt-4 text-[14px] text-muted">One supported Mars region in this prototype.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
