"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Loadable } from "@/lib/data";
import type { CompareScene, Heightfield, Results, SourceRecord } from "@/lib/types";
import type { CameraMode, DriveState, TerrainEngine, ViewSpec } from "@/lib/terrain-engine";
import { loadHeightfield, sampleBilinear } from "@/lib/heightfield";
import { slopeLayerBaseline } from "@/lib/terrain-compute";
import { formatCoord, formatMetres, niceScaleBar } from "@/lib/format";
import { useReducedMotion } from "@/lib/hooks";
import { Wordmark } from "./wordmark";
import { PaxExpedition } from "./pax-expedition";
import { AnalysisView } from "./analysis/analysis-view";
import { LeftPanel, ICONS, type Layer } from "./workspace/left-panel";
import { RightPanel } from "./workspace/right-panel";
import { TimelinePanel } from "./workspace/timeline-panel";
import type { EvidenceSection, ProfileData, ProfileSeries, WorkspaceMode } from "./workspace/types";

const TerrainViewer = dynamic(() => import("./terrain-viewer"), { ssr: false });
const PAX_URL = "/models/pax-rover.glb";
const VIEW_GAP = 12;

function Svg({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function NavPill({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-2 rounded-[10px] border px-4 text-[14px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 xl:px-5 xl:text-[15px] ${
        active
          ? "border-copper bg-copper/15 text-ink shadow-[0_0_0_1px_rgba(198,106,75,0.55),0_0_22px_rgba(198,106,75,0.28)]"
          : "border-hairline bg-surface/60 text-muted hover:text-ink"
      }`}
    >
      <Svg d={icon} className="h-[18px] w-[18px]" />
      {label}
    </button>
  );
}

function ScaleBar({ mpp }: { mpp: number }) {
  const bar = niceScaleBar(mpp, 150);
  if (!bar.px) return null;
  return (
    <div className="flex flex-col gap-1" aria-label={`Scale bar ${bar.label}`}>
      <div className="flex justify-between text-[12px] text-ink/90" style={{ width: bar.px }}>
        <span className="num">0</span>
        <span className="num">{bar.label}</span>
      </div>
      <div style={{ width: bar.px }} className="h-[6px] border-x-2 border-b-2 border-ink/90" />
    </div>
  );
}

function ToolButton({ label, d, onClick }: { label: string; d: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="grid h-[38px] w-[38px] place-items-center rounded-[8px] border border-hairline bg-bg/75 text-ink/90 backdrop-blur hover:border-copper hover:text-ink">
      <Svg d={d} className="h-[18px] w-[18px]" />
    </button>
  );
}

const TOOL = {
  reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  zin: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3M11 8v6M8 11h6",
  zout: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3M8 11h6",
  orbit: "M12 3a9 9 0 1 0 9 9M21 3v6h-6",
  full: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
};

// ---- real profile helpers ----
function slopeSeries(points: { d: number; v: number }[], baselineM: number): { d: number; v: number }[] {
  if (points.length < 3) return [];
  const step = points[1].d - points[0].d || 1;
  const k = Math.max(1, Math.round(baselineM / 2 / step));
  const out: { d: number; v: number }[] = [];
  for (let i = k; i < points.length - k; i++) {
    const dz = points[i + k].v - points[i - k].v;
    const dd = points[i + k].d - points[i - k].d;
    if (Number.isFinite(dz) && dd > 0) out.push({ d: points[i].d, v: (Math.atan(Math.abs(dz) / dd) * 180) / Math.PI });
  }
  return out;
}

function transect(hf: Heightfield): { d: number; v: number }[] {
  const { width: w, height: h, posting_m } = hf.meta;
  const row = Math.floor(h / 2);
  const pts: { d: number; v: number }[] = [];
  for (let x = 0; x < w; x++) {
    const v = hf.heights[row * w + x];
    if (!Number.isNaN(v)) pts.push({ d: x * posting_m, v });
  }
  return pts;
}

function statsFor(series: ProfileSeries[], slope: ProfileSeries[], baselineM: number): ProfileData["stats"] {
  const s0 = series[0]?.points ?? [];
  if (!s0.length) return [];
  const vals = s0.map((p) => p.v);
  const sl = slope[0]?.points.map((p) => p.v) ?? [];
  const mean = sl.length ? sl.reduce((a, b) => a + b, 0) / sl.length : NaN;
  const rows: ProfileData["stats"] = [
    { label: "Distance", value: (s0[s0.length - 1].d / 1000).toFixed(2), unit: "km" },
    { label: "Δ Elevation", value: Math.round(Math.max(...vals) - Math.min(...vals)).toLocaleString("en-US"), unit: "m" },
    { label: `Mean slope (${Math.round(baselineM)} m)`, value: Number.isFinite(mean) ? mean.toFixed(1) : "—", unit: "°" },
    { label: "Max slope", value: sl.length ? Math.max(...sl).toFixed(1) : "—", unit: "°" },
  ];
  if (series[1]) {
    const v1 = series[1].points.map((p) => p.v);
    rows.push({ label: `Δ Elevation (${series[1].label})`, value: Math.round(Math.max(...v1) - Math.min(...v1)).toLocaleString("en-US"), unit: "m" });
  }
  return rows;
}

export function ExploreView({
  hero,
  results,
  sources,
  onHome,
  onOpenAbout,
  onStatic,
  minFps,
}: {
  hero: Heightfield;
  results: Loadable<Results>;
  sources: Loadable<SourceRecord[]>;
  onHome: () => void;
  onOpenAbout: () => void;
  onStatic: (reason: string) => void;
  minFps: number;
}) {
  const reduced = useReducedMotion();
  const r = results.status === "ready" ? results.data : null;

  const [mode, setMode] = useState<WorkspaceMode>("explore");
  const [layer, setLayer] = useState<Layer>("hillshade");
  const [lens, setLens] = useState<"landform" | "rover">("landform");
  const [res, setRes] = useState<"native" | "30m">("native");
  const [exaggeration, setExaggeration] = useState(hero.meta.vertical_exaggeration_default);
  const [hero30, setHero30] = useState<Heightfield | null>(null);
  const [marsCmp, setMarsCmp] = useState<Heightfield | null>(null);
  const [earthHf, setEarthHf] = useState<Heightfield | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [solo, setSolo] = useState<"none" | "mars" | "earth">("none");
  const [drive, setDrive] = useState<DriveState | null>(null);
  const [paxStatus, setPaxStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pathPts, setPathPts] = useState<{ x: number; z: number; d: number }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mpp, setMpp] = useState(0);
  const [analysis, setAnalysis] = useState<EvidenceSection | null>(null);
  const [transition, setTransition] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [lowFps, setLowFps] = useState<number | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [fade, setFade] = useState<{ src: string; visible: boolean } | null>(null);
  const engine = useRef<TerrainEngine | null>(null);
  const getEngine = useCallback(() => engine.current, []);

  const marsScene = r?.compare_scenes.find((s) => s.kind === "mars") ?? null;
  const selScene: CompareScene | null = r?.compare_scenes.find((s) => s.id === selId) ?? null;

  const crossfade = useCallback(
    (apply: () => void) => {
      const src = !reduced ? engine.current?.snapshot() : null;
      if (src) {
        setFade({ src, visible: true });
        apply();
        requestAnimationFrame(() => requestAnimationFrame(() => setFade({ src, visible: false })));
        window.setTimeout(() => setFade(null), 700);
      } else apply();
    },
    [reduced],
  );

  // ---- view specs (geometry is always a measured heightfield) ----
  const inCompare = mode === "compare";
  const roverCompare = inCompare && lens === "rover";
  const marsSpec = useMemo<ViewSpec>(() => {
    if (lens === "rover") return { hf: hero, overlay: "slope", tone: "mars" };
    if (inCompare && marsCmp) return { hf: marsCmp, overlay: layer, tone: "mars" };
    if (mode === "explore" && res === "30m" && hero30) return { hf: hero30, overlay: layer, tone: "mars" };
    return { hf: hero, overlay: layer, tone: "mars" };
  }, [lens, inCompare, marsCmp, mode, res, hero30, hero, layer]);
  const earthSpec = useMemo<ViewSpec | null>(() => (inCompare && earthHf && lens === "landform" ? { hf: earthHf, overlay: layer, tone: "earth" } : null), [inCompare, earthHf, lens, layer]);
  const views = useMemo<ViewSpec[]>(() => {
    if (earthSpec) {
      if (solo === "mars") return [marsSpec];
      if (solo === "earth") return [earthSpec];
      return [marsSpec, earthSpec];
    }
    return [marsSpec];
  }, [marsSpec, earthSpec, solo]);
  const nViews = views.length;

  // ---- actions ----
  const ensurePax = useCallback(async (): Promise<boolean> => {
    const e = engine.current;
    if (!e) return false;
    setPaxStatus((s) => (s === "ready" ? s : "loading"));
    const info = await e.loadPax(PAX_URL);
    if (!info) {
      setPaxStatus("error");
      return false;
    }
    setPaxStatus("ready");
    return true;
  }, []);

  const loadEarth = useCallback(
    async (sceneId: string) => {
      if (!r) return;
      const scene = r.compare_scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      setSelId(sceneId);
      setBusy(`Loading ${scene.label.split(" — ")[0]}…`);
      try {
        const hf = await loadHeightfield(scene.heightfield_id);
        crossfade(() => setEarthHf(hf));
      } catch {
        setNotice(`Earth scene ${scene.heightfield_id} could not be loaded.`);
      } finally {
        setBusy(null);
      }
    },
    [r, crossfade],
  );

  const goCompare = async () => {
    engine.current?.stopDrive();
    engine.current?.showPax(false);
    setTourOpen(false);
    setLens("landform");
    setSolo("none");
    if (!reduced && mode !== "compare") {
      setTransition("Moving to the yardang study area");
      window.setTimeout(() => setTransition(null), 1500);
    }
    setMode("compare");
    // the 10 km comparison windows have ~150-200 m of relief: show them at a declared ×4 (same for both planets)
    if (mode !== "compare") setExaggeration((e) => Math.max(e, 4));
    if (!r || !marsScene) return;
    if (!marsCmp) {
      try {
        setMarsCmp(await loadHeightfield(marsScene.heightfield_id));
      } catch {
        setNotice("The matched Mars scene could not be loaded.");
      }
    }
    if (!selId && r.candidates[0]) await loadEarth(r.candidates[0].compare_scene_id);
  };

  const goExplore = () => {
    engine.current?.stopDrive();
    if (mode === "compare") setExaggeration(hero.meta.vertical_exaggeration_default);
    setMode("explore");
    setSolo("none");
  };

  const goSimulate = async () => {
    setTourOpen(false);
    setExaggeration(hero.meta.vertical_exaggeration_default);
    setLens("landform");
    setRes("native");
    setMode("simulate");
    if (await ensurePax()) {
      engine.current?.showPax(true);
      setPathPts(engine.current?.getPathSamples(240) ?? null);
    }
  };

  const startTour = () => {
    if (mode !== "explore") goExplore();
    setLens("landform");
    setTourOpen(true);
  };

  const setResolution = async (want: "native" | "30m") => {
    if (want === res) return;
    if (want === "30m" && !hero30) {
      setBusy("Loading the 30 m aggregate…");
      try {
        const hf = await loadHeightfield("mars_hirise_hero_30m");
        setHero30(hf);
        crossfade(() => setRes("30m"));
      } catch {
        setNotice("The 30 m aggregate could not be loaded.");
      } finally {
        setBusy(null);
      }
      return;
    }
    crossfade(() => setRes(want));
  };

  const selectScene = async (id: string) => {
    if (mode !== "compare") await goCompare();
    setSolo("none");
    await loadEarth(id);
  };

  const openEvidence = (s: EvidenceSection) => setAnalysis(s);

  useEffect(() => {
    if (engine.current) engine.current.viewGap = VIEW_GAP;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || analysis) return;
      const eng = engine.current;
      const step = Math.PI / 36;
      if (e.key === "ArrowLeft") eng?.orbit(step, 0);
      else if (e.key === "ArrowRight") eng?.orbit(-step, 0);
      else if (e.key === "ArrowUp") eng?.orbit(0, -step);
      else if (e.key === "ArrowDown") eng?.orbit(0, step);
      else if (e.key === "+" || e.key === "=") eng?.dolly(0.85);
      else if (e.key === "-" || e.key === "_") eng?.dolly(1 / 0.85);
      else if (e.key === "r" || e.key === "R") eng?.reset();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analysis]);

  useEffect(() => {
    const id = window.setTimeout(() => engine.current?.reset(), 60);
    return () => window.clearTimeout(id);
  }, [nViews, roverCompare]);

  const onFallback = useCallback(
    (reason: "webgl" | "fps", fps?: number) => {
      if (reason === "webgl") onStatic("3D unavailable on this device (WebGL could not start). Showing a static hillshade instead.");
      else setLowFps(fps ?? 0);
    },
    [onStatic],
  );

  // ---- real profile data ----
  const profile = useMemo<ProfileData | null>(() => {
    if (mode === "simulate" && pathPts?.length) {
      const { width: w, height: h, extent_m } = hero.meta;
      const pts = pathPts
        .map((p) => ({ d: p.d, v: sampleBilinear(hero, (p.x / extent_m[0] + 0.5) * w - 0.5, (p.z / extent_m[1] + 0.5) * h - 0.5) }))
        .filter((p) => Number.isFinite(p.v));
      const base = Math.max(8, 4 * hero.meta.posting_m);
      const elevation: ProfileSeries[] = [{ id: "pax", label: "Mars (HiRISE)", tone: "mars", points: pts }];
      const slope: ProfileSeries[] = [{ id: "pax-s", label: "Mars (HiRISE)", tone: "mars", points: slopeSeries(pts, base) }];
      return { title: "PAX demonstration loop — terrain profile", note: "HiRISE DTM elevation (m above the Mars areoid) sampled along the hand-drawn loop", elevation, slope, slopeBaselineM: base, stats: statsFor(elevation, slope, base) };
    }
    if (inCompare && marsCmp) {
      const base = 180;
      const elevation: ProfileSeries[] = [{ id: "mars", label: "Mars (CTX)", tone: "mars", points: transect(marsCmp) }];
      if (earthHf && selScene) elevation.push({ id: "earth", label: selScene.label.split(" — ")[0], tone: "earth", points: transect(earthHf) });
      const slope = elevation.map((s) => ({ ...s, id: s.id + "-s", points: slopeSeries(s.points, base) }));
      return { title: "Centre transect, west → east", note: "Relative elevation, plane-detrended · CTX (Mars) vs NASADEM (Earth) · common 30 m grid", elevation, slope, slopeBaselineM: base, stats: statsFor(elevation, slope, base) };
    }
    const hf = res === "30m" && hero30 ? hero30 : hero;
    const base = slopeLayerBaseline(hf);
    const label = res === "30m" ? "Mars (30 m aggregate)" : "Mars (HiRISE)";
    const elevation: ProfileSeries[] = [{ id: "hero", label, tone: "mars", points: transect(hf) }];
    const slope: ProfileSeries[] = [{ id: "hero-s", label, tone: "mars", points: slopeSeries(elevation[0].points, base) }];
    return { title: "Centre transect, west → east", note: "HiRISE DTM elevation (m above the Mars areoid)", elevation, slope, slopeBaselineM: base, stats: statsFor(elevation, slope, base) };
  }, [mode, pathPts, hero, inCompare, marsCmp, earthHf, selScene, res, hero30]);

  const cursorFrac = mode === "simulate" && drive?.started ? drive.progress : cursor;

  const headerFor = (spec: ViewSpec, planet: "Mars" | "Earth") => {
    const m = spec.hf.meta;
    const rel = /detrended/i.test(m.vertical_datum);
    const title =
      planet === "Mars"
        ? spec.hf === marsCmp
          ? "Yardang study area"
          : spec.hf === hero30
            ? "HiRISE scarps · 30 m aggregate"
            : lens === "rover"
              ? "HiRISE scarps · slope classes"
              : "HiRISE layered scarps"
        : (selScene?.label.split(" — ")[0] ?? "Earth");
    const sub =
      planet === "Mars"
        ? spec.hf === marsCmp
          ? "Target terrain · CTX stereo DTM"
          : "Showcase terrain · HiRISE 1 m DTM"
        : selScene?.kind === "candidate"
          ? "Morphometric candidate · NASADEM"
          : selScene?.kind === "positive"
            ? "Published yardang analog (control)"
            : "Process-different control";
    const elev = rel ? `Relief: 0 – ${Math.round(m.z_max_m - m.z_min_m).toLocaleString("en-US")} m` : `Elevation: ${Math.round(m.z_min_m).toLocaleString("en-US")} – ${Math.round(m.z_max_m).toLocaleString("en-US")} m`;
    const area = `Area: ${formatMetres(m.extent_m[0])} × ${formatMetres(m.extent_m[1])}`;
    const coord = planet === "Mars" ? (spec.hf === marsCmp && marsScene ? formatCoord(marsScene.centroid, "Mars") : null) : selScene ? formatCoord(selScene.centroid, "Earth") : null;
    return { title, sub, elev, area, coord };
  };

  const frames = views.map((spec, i) => ({ spec, planet: (spec === earthSpec ? "Earth" : "Mars") as "Mars" | "Earth", i }));
  const nFrames = roverCompare ? 2 : nViews;
  const frameStyle = (i: number): React.CSSProperties =>
    nFrames === 1 ? { left: 0, width: "100%" } : { left: `calc((100% + ${VIEW_GAP}px) * ${i} / ${nFrames})`, width: `calc((100% - ${VIEW_GAP * (nFrames - 1)}px) / ${nFrames})` };

  const layerButtons: [Layer, string][] = [
    ["hillshade", "Relief"],
    ["elevation", "Elevation"],
    ["slopemap", "Slope"],
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      {/* ===== top navigation ===== */}
      <header className="z-20 flex h-[68px] shrink-0 items-center gap-4 border-b border-hairline bg-bg/95 px-4 xl:px-6">
        <Wordmark onClick={onHome} height={30} />
        <nav className="mx-auto flex items-center gap-2" aria-label="Workspace">
          <NavPill label="Explore" icon={ICONS.globe} active={mode === "explore" && !analysis} onClick={goExplore} />
          <NavPill label="Compare" icon={ICONS.layers} active={mode === "compare" && !analysis} onClick={() => void goCompare()} />
          <NavPill label="Simulate" icon={ICONS.route} active={mode === "simulate" && !analysis} onClick={() => void goSimulate()} />
          <NavPill label="Evidence" icon={ICONS.chart} active={!!analysis} onClick={() => openEvidence("overview")} />
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openEvidence("sources")} className="hidden min-h-[40px] items-center gap-2 rounded-[10px] border border-hairline bg-surface/60 px-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink/90 hover:border-copper lg:flex">
            <Svg d={ICONS.db} className="h-[16px] w-[16px]" /> Data sources
          </button>
          <button
            type="button"
            onClick={() => openEvidence("validation")}
            className="hidden min-h-[40px] items-center gap-2 rounded-[10px] border border-copper/70 px-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-copper-light hover:bg-copper/10 xl:flex"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-copper" aria-hidden="true" />
            Validation: {r ? (r.decision.pass ? "passed" : "failed") : "…"}
          </button>
          <button type="button" onClick={onOpenAbout} className="min-h-[40px] px-2 text-[13px] text-muted hover:text-ink">
            About
          </button>
        </div>
      </header>

      {/* ===== three-column workspace ===== */}
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(250px,19%)_minmax(0,1fr)_minmax(300px,24%)] lg:overflow-hidden">
        <div className="order-2 min-h-0 lg:order-1">
          <LeftPanel
            results={r}
            mode={mode}
            hero={hero.meta}
            layer={layer}
            onLayer={setLayer}
            lens={lens}
            onLens={(l) => crossfade(() => setLens(l))}
            exaggeration={exaggeration}
            onExaggeration={setExaggeration}
            res={res}
            onRes={setResolution}
            paxStatus={paxStatus}
            onCompare={() => void goCompare()}
            onExplore={goExplore}
            onSimulate={() => void goSimulate()}
            onTour={startTour}
            onOpenEvidence={openEvidence}
          />
        </div>

        <div className="order-1 flex min-h-[640px] min-w-0 flex-col gap-3 lg:order-2 lg:min-h-0">
          <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-[12px]">
            <div className="absolute inset-y-0 left-0" style={{ width: roverCompare ? `calc(50% - ${VIEW_GAP / 2}px)` : "100%" }}>
              <TerrainViewer views={views} exaggeration={exaggeration} onEngine={(e) => (engine.current = e)} onCamera={setMpp} onFallback={onFallback} onDrive={setDrive} minFps={minFps} />
              {fade ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fade.src} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: fade.visible ? 1 : 0, transition: "opacity 600ms ease-in-out" }} />
              ) : null}
            </div>

            {frames.map(({ spec, planet, i }) => {
              const hd = headerFor(spec, planet);
              return (
                <div key={`${planet}-${i}`} className="pointer-events-none absolute inset-y-0" style={frameStyle(i)}>
                  <div className="absolute inset-0 rounded-[12px] border border-hairline shadow-[inset_0_0_80px_rgba(0,0,0,0.35)]" />
                  <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between gap-3 rounded-t-[12px] border-b border-hairline/80 bg-surface/88 px-4 py-3 backdrop-blur">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${planet === "Mars" ? "border-copper/60 bg-copper/15 text-copper" : "border-earth/60 bg-earth/15 text-earth"}`}>
                        <Svg d={ICONS.globe} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-[20px] font-semibold uppercase leading-none tracking-[0.04em]">{planet}</p>
                        <p className="mt-1 truncate text-[13px] text-ink/85">
                          {hd.title} <span className="text-muted">· {hd.sub}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`hidden shrink-0 text-right text-[13px] leading-snug text-ink/85 ${nFrames > 1 ? "xl:block" : "md:block"}`}>
                      <p className="num">{hd.elev}</p>
                      <p className="num">{hd.area}</p>
                    </div>
                    {inCompare && earthSpec ? (
                      <button
                        type="button"
                        onClick={() => setSolo(solo === "none" ? (planet === "Mars" ? "mars" : "earth") : "none")}
                        title={solo === "none" ? "Expand this view" : "Back to split view"}
                        aria-label={solo === "none" ? "Expand this view" : "Back to split view"}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-hairline text-ink/80 hover:border-copper"
                      >
                        <Svg d={TOOL.full} className="h-[17px] w-[17px]" />
                      </button>
                    ) : null}
                  </div>
                  {i === 0 ? (
                    <div className="pointer-events-auto absolute left-3 top-[86px] flex flex-col gap-2">
                      <ToolButton label="Reset view (R)" d={TOOL.reset} onClick={() => engine.current?.reset()} />
                      <ToolButton label="Zoom in (+)" d={TOOL.zin} onClick={() => engine.current?.dolly(0.82)} />
                      <ToolButton label="Zoom out (−)" d={TOOL.zout} onClick={() => engine.current?.dolly(1 / 0.82)} />
                      <ToolButton label="Orbit (← →)" d={TOOL.orbit} onClick={() => engine.current?.orbit(Math.PI / 12, 0)} />
                    </div>
                  ) : null}
                  {hd.coord ? <p className="num absolute right-4 top-[78px] rounded-[6px] bg-bg/70 px-2 py-[2px] text-[13px] text-ink/85">{hd.coord}</p> : null}
                  <div className="absolute bottom-[60px] left-4">{mpp > 0 ? <ScaleBar mpp={mpp} /> : null}</div>
                  <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 rounded-b-[12px] border-t border-hairline/80 bg-surface/88 px-4 py-2 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span className="mr-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted">Layers</span>
                      {layerButtons.map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          disabled={lens === "rover"}
                          onClick={() => setLayer(v)}
                          className={`min-h-[34px] rounded-[8px] border px-3 text-[12px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 disabled:opacity-40 ${
                            layer === v
                              ? planet === "Mars"
                                ? "border-copper bg-copper/15 text-ink shadow-[0_0_14px_rgba(198,106,75,0.25)]"
                                : "border-earth bg-earth/15 text-ink shadow-[0_0_14px_rgba(120,157,168,0.25)]"
                              : "border-hairline bg-bg/60 text-muted hover:text-ink"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <span className="num shrink-0 rounded-[6px] border border-hairline px-2 py-[2px] text-[12px] text-ink/85">vertical ×{exaggeration}</span>
                  </div>
                </div>
              );
            })}

            {roverCompare ? (
              <div className="absolute inset-y-0 right-0 flex items-center justify-center rounded-[12px] border border-hairline bg-surface/70 p-8" style={{ width: `calc(50% - ${VIEW_GAP / 2}px)` }}>
                <div className="max-w-[420px]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-earth">Earth · {selScene?.label.split(" — ")[0] ?? "candidate"}</p>
                  <p className="mt-4 font-display text-[30px] font-semibold leading-tight">Not evaluable at this scale.</p>
                  <p className="mt-3 text-[16px] leading-relaxed text-muted">
                    Only ~30 m public elevation exists here. Rover-relevant slopes, rocks and soil need a drone or lidar survey. The Mars side shows slope classes at ~4 m (Hoover, Golombek &amp; Calef 2012) — a proxy, not trafficability.
                  </p>
                </div>
              </div>
            ) : null}

            {mode === "explore" && tourOpen && lens === "landform" ? (
              <div className="absolute bottom-[64px] right-4 z-10">
                <PaxExpedition engine={getEngine} hero={hero} results={r} onSetRes={setResolution} onCompare={() => void goCompare()} drive={drive} tourOnly />
              </div>
            ) : null}
            {mode === "explore" && res === "30m" && lens === "landform" && r ? (
              <div className="pointer-events-none absolute left-1/2 top-[110px] w-[min(560px,calc(100%-40px))] -translate-x-1/2 rounded-[12px] border border-copper/50 bg-bg/80 p-4 text-center shadow-[0_0_30px_rgba(198,106,75,0.18)] backdrop-blur fade-in">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-copper">The comparison scale</p>
                <p className="mt-1 font-display text-[22px] font-semibold leading-snug">
                  Steep terrain: <span className="num">{(r.hirise.frac_area_slope_gt15_baseline_4m * 100).toFixed(1)}%</span> at 4 m →{" "}
                  <span className="num">{(r.hirise.frac_area_slope_gt15_baseline_180m * 100).toFixed(1)}%</span> at 180 m
                </p>
                <p className="mt-1 text-[14px] text-ink/80">Same crop averaged to 30 m: scarp lips, ridges and knobs vanish — the detail an Earth–Mars terrain search cannot see.</p>
              </div>
            ) : null}
            {mode === "simulate" ? (
              <div className="pointer-events-none absolute left-1/2 top-[86px] -translate-x-1/2 rounded-[8px] border border-hairline bg-bg/80 px-3 py-[6px] text-[13px] text-ink/85 backdrop-blur">
                Terrain-following demonstration · hand-drawn loop · {drive?.scale === "true" ? "true scale (≈0.5 m)" : `PAX enlarged ×${drive?.enlargement ?? "…"} for visibility`} · not mobility physics
              </div>
            ) : null}

            <div className="pointer-events-none absolute right-4 top-[110px] flex flex-col items-end gap-2">
              {busy ? <div className="rounded-[8px] bg-bg/85 px-3 py-2 text-[13px] text-muted" aria-live="polite">{busy}</div> : null}
              {notice ? <div className="max-w-[340px] rounded-[8px] border border-hairline bg-bg/90 px-3 py-2 text-[13px] text-muted">{notice}</div> : null}
              {lowFps !== null ? (
                <div className="pointer-events-auto flex items-center gap-3 rounded-[8px] border border-hairline bg-surface/95 px-3 py-2 text-[13px] text-ink">
                  <span>3D rendering slowly (~{lowFps.toFixed(0)} fps)</span>
                  <button type="button" className="text-copper hover:underline" onClick={() => onStatic(`Static view chosen after slow 3D rendering (~${lowFps.toFixed(0)} fps).`)}>
                    Static view
                  </button>
                  <button type="button" aria-label="Dismiss" className="text-muted" onClick={() => setLowFps(null)}>
                    ✕
                  </button>
                </div>
              ) : null}
            </div>

            {transition ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[12px] bg-bg/60 backdrop-blur-[2px] fade-in" aria-live="polite">
                <div className="text-center">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-copper">Changing terrain patch</p>
                  <p className="mt-2 font-display text-[30px] font-semibold">{transition}</p>
                  <p className="mt-2 text-[15px] text-muted">HiRISE scarps → CTX yardang study area · common 30 m analysis grid</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 lg:h-[32%] lg:min-h-[230px] xl:h-[34%] xl:min-h-[290px]">
            <TimelinePanel
              mode={mode}
              drive={drive}
              paxStatus={paxStatus}
              periodS={48}
              onStart={() => {
                if (mode !== "simulate") void goSimulate().then(() => engine.current?.startDrive());
                else void ensurePax().then((ok) => ok && engine.current?.startDrive());
              }}
              onPause={() => engine.current?.pauseDrive()}
              onResume={() => engine.current?.resumeDrive()}
              onReplay={() => engine.current?.restartDrive()}
              onStop={() => engine.current?.stopDrive()}
              onCamera={(m: CameraMode) => engine.current?.setCameraMode(m)}
              onOpenSimulate={() => void goSimulate()}
              profile={profile}
              cursorFrac={cursorFrac}
              onCursor={setCursor}
            />
          </div>
        </div>

        <div className="order-3 min-h-0">
          {r ? (
            <RightPanel results={r} mode={mode} selectedSceneId={inCompare ? selId : null} onSelectScene={(id) => void selectScene(id)} onOpenEvidence={openEvidence} />
          ) : (
            <div className="h-full rounded-[12px] border border-hairline bg-surface/90 p-5 text-[14px] text-muted">Results not available.</div>
          )}
        </div>
      </div>

      <p className="sr-only">Keyboard: arrow keys orbit, plus and minus zoom, R resets the view.</p>

      {analysis && r ? (
        <AnalysisView
          results={r}
          sources={sources.status === "ready" ? sources.data : null}
          initialSection={analysis}
          onClose={() => setAnalysis(null)}
          onCompare={(id: string) => {
            setAnalysis(null);
            void selectScene(id);
          }}
        />
      ) : null}
    </div>
  );
}
