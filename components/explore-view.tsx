"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Loadable } from "@/lib/data";
import type { Heightfield, HeightfieldMeta, Results, SourceRecord } from "@/lib/types";
import type { DriveState, TerrainEngine, ViewSpec } from "@/lib/terrain-engine";
import { loadHeightfield } from "@/lib/heightfield";
import { SLOPE_BASELINE_M, SLOPE_THRESHOLDS_DEG } from "@/lib/terrain-compute";
import { formatCoord, formatMetres, formatPosting, fracToPercent, niceScaleBar } from "@/lib/format";
import { useNarrow, useReducedMotion } from "@/lib/hooks";
import { Button, Segmented } from "./ui";
import { Wordmark } from "./wordmark";
import { CompareSheet, compareItems, type CompareItem } from "./compare-sheet";
import { PaxExpedition } from "./pax-expedition";
import { AnalysisView } from "./analysis/analysis-view";
import { EvidenceDrawer, type EvidenceTab } from "./evidence-drawer";

const TerrainViewer = dynamic(() => import("./terrain-viewer"), { ssr: false });

type Mode = "explore" | "compare";
type Lens = "landform" | "rover";
type AB = "split" | "mars" | "earth";

function sourceBadge(m: HeightfieldMeta): string {
  if (/hirise/i.test(m.provider)) return `HiRISE ${m.source_id} · NASA PDS`;
  return `${m.source_id} · ${m.provider.replace(/\s*\(.*\)\s*$/, "")}`;
}

function ScaleBar({ mpp, tone = "ink" }: { mpp: number; tone?: "ink" | "copper" | "earth" }) {
  const bar = niceScaleBar(mpp, 140);
  if (!bar.px) return null;
  const color = tone === "copper" ? "#C97951" : tone === "earth" ? "#6A9BAD" : "#EAF0F4";
  return (
    <div className="flex items-end gap-2" aria-label={`Scale bar ${bar.label} at view centre`}>
      <div style={{ width: bar.px, borderColor: color }} className="h-[8px] border-x-2 border-b-2" />
      <span className="num text-[14px] leading-none text-ink">{bar.label}</span>
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative min-h-[44px] px-3 text-[15px] transition-colors duration-200 md:px-4 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
    >
      {label}
      {active ? <span className="absolute inset-x-3 bottom-[6px] h-[2px] rounded-full bg-copper md:inset-x-4" aria-hidden="true" /> : null}
    </button>
  );
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
  const narrow = useNarrow();
  const r = results.status === "ready" ? results.data : null;

  const [mode, setMode] = useState<Mode>("explore");
  const [res, setRes] = useState<"native" | "30m">("native");
  const [lens, setLens] = useState<Lens>("landform");
  const [ab, setAb] = useState<AB>("split");
  const [exaggeration, setExaggeration] = useState(hero.meta.vertical_exaggeration_default);
  const [hero30, setHero30] = useState<Heightfield | null>(null);
  const [marsCmp, setMarsCmp] = useState<Heightfield | null>(null);
  const [earthHf, setEarthHf] = useState<Heightfield | null>(null);
  const [selected, setSelected] = useState<CompareItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<EvidenceTab>("result");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mpp, setMpp] = useState(0);
  const [fade, setFade] = useState<{ src: string; visible: boolean } | null>(null);
  const [drive, setDrive] = useState<DriveState | null>(null);
  const [transitionLabel, setTransitionLabel] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisSection, setAnalysisSection] = useState<"overview" | "terrain" | "candidates" | "method" | "validation" | "sources">("overview");
  const openEvidence = (section: "overview" | "terrain" | "candidates" | "method" | "validation" | "sources") => {
    setAnalysisSection(section);
    setAnalysisOpen(true);
  };
  const engine = useRef<TerrainEngine | null>(null);

  const marsScene = r?.compare_scenes.find((s) => s.kind === "mars") ?? null;

  /** Snapshot-crossfade (600 ms) for meaningful Mars resolution changes; a cut under reduced motion. */
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

  // ---- derived view specs ----
  const marsSpec = useMemo<ViewSpec>(() => {
    if (lens === "rover") return { hf: hero, overlay: "slope", tone: "mars" };
    if (mode === "compare" && marsCmp) return { hf: marsCmp, overlay: "hillshade", tone: "mars" };
    if (mode === "explore" && res === "30m" && hero30) return { hf: hero30, overlay: "hillshade", tone: "mars" };
    return { hf: hero, overlay: "hillshade", tone: "mars" };
  }, [lens, mode, marsCmp, res, hero30, hero]);

  const earthSpec = useMemo<ViewSpec | null>(
    () => (mode === "compare" && selected && earthHf && lens === "landform" ? { hf: earthHf, overlay: "hillshade", tone: "earth" } : null),
    [mode, selected, earthHf, lens],
  );

  const pairActive = mode === "compare" && !!selected; // a Mars–Earth pair is on stage
  const effAb: AB = pairActive ? (narrow && ab === "split" ? "mars" : ab) : "mars";
  const roverPair = pairActive && lens === "rover";

  const views = useMemo<ViewSpec[]>(() => {
    if (earthSpec) {
      if (effAb === "split") return [marsSpec, earthSpec];
      if (effAb === "earth") return [earthSpec];
    }
    return [marsSpec];
  }, [marsSpec, earthSpec, effAb]);

  // ---- actions ----
  const toggle30 = async (want: "native" | "30m") => {
    if (want === res) return;
    if (want === "30m" && !hero30) {
      setBusy("Loading the 30 m aggregate…");
      try {
        const hf = await loadHeightfield("mars_hirise_hero_30m");
        setHero30(hf);
        crossfade(() => setRes("30m"));
      } catch {
        setNotice("The 30 m aggregate (mars_hirise_hero_30m) could not be loaded.");
      } finally {
        setBusy(null);
      }
      return;
    }
    crossfade(() => setRes(want));
  };

  const enterCompare = async () => {
    engine.current?.stopDrive();
    engine.current?.showPax(false);
    setSheetOpen(true);
    setNotice(null);
    if (!reduced) {
      setTransitionLabel("Moving to the yardang study area");
      window.setTimeout(() => setTransitionLabel(null), 1500);
    }
    if (!r || !marsScene) {
      setMode("compare");
      return;
    }
    setBusy("Loading the matched Mars scene…");
    try {
      const hf = await loadHeightfield(marsScene.heightfield_id);
      crossfade(() => {
        setMarsCmp(hf);
        setMode("compare");
      });
    } catch {
      setMode("compare");
      setNotice(`Matched Mars scene ${marsScene.heightfield_id} could not be loaded.`);
    } finally {
      setBusy(null);
    }
  };

  const exitCompare = () => {
    crossfade(() => {
      setMode("explore");
      setSelected(null);
      setEarthHf(null);
      setSheetOpen(false);
      setAb("split");
    });
  };

  const selectItem = async (it: CompareItem) => {
    if (!it.scene) return;
    setSelected(it);
    setEarthHf(null);
    setAb(narrow ? "earth" : "split");
    if (narrow) setSheetOpen(false);
    setBusy(`Loading ${it.name}…`);
    try {
      const hf = await loadHeightfield(it.scene.heightfield_id);
      setEarthHf(hf);
    } catch {
      setNotice(`Earth scene ${it.scene.heightfield_id} could not be loaded.`);
    } finally {
      setBusy(null);
    }
  };

  const onNavExplore = () => {
    if (mode === "compare") exitCompare();
  };
  const onNavCompare = () => {
    if (mode === "compare") setSheetOpen(true);
    else void enterCompare();
  };
  const onNavEvidence = () => openEvidence("overview");
  const getEngine = useCallback(() => engine.current, []);

  // re-compose the camera when the candidate tray opens/closes (viewport aspect changes)
  const sheetShown = mode === "compare" && sheetOpen && !narrow;
  useEffect(() => {
    const id = window.setTimeout(() => engine.current?.reset(), 320);
    return () => window.clearTimeout(id);
  }, [sheetShown]);

  const compareScene = async (sceneId: string) => {
    if (!r) return;
    const it = compareItems(r).find((x) => x.scene?.id === sceneId);
    if (mode !== "compare") await enterCompare();
    if (it) await selectItem(it);
  };

  const swap = useCallback(() => {
    if (!pairActive) return;
    setAb((a) => (a === "mars" ? "earth" : a === "earth" ? "mars" : "mars"));
  }, [pairActive]);

  // Re-frame when the canvas becomes half width (rover lens next to the Earth panel) or full again.
  const halfCanvas = roverPair && effAb === "split";
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => engine.current?.reset());
    });
    return () => cancelAnimationFrame(id);
  }, [halfCanvas]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        return;
      }
      if (drawerOpen) return;
      const eng = engine.current;
      const step = Math.PI / 36;
      switch (e.key) {
        case "ArrowLeft":
          eng?.orbit(step, 0);
          break;
        case "ArrowRight":
          eng?.orbit(-step, 0);
          break;
        case "ArrowUp":
          eng?.orbit(0, -step);
          break;
        case "ArrowDown":
          eng?.orbit(0, step);
          break;
        case "+":
        case "=":
          eng?.dolly(0.85);
          break;
        case "-":
        case "_":
          eng?.dolly(1 / 0.85);
          break;
        case "r":
        case "R":
          eng?.reset();
          break;
        case "s":
        case "S":
          swap();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, swap]);

  // Only a WebGL failure switches automatically. Low frame rate (e.g. a throttled tab during a
  // screen share) never silently replaces the real 3D: it shows a dismissible offer instead.
  const [lowFps, setLowFps] = useState<number | null>(null);
  const onFallback = useCallback(
    (reason: "webgl" | "fps", fps?: number) => {
      if (reason === "webgl") {
        onStatic("3D unavailable on this device (WebGL could not start). Showing a static hillshade instead.");
      } else {
        setLowFps(fps ?? 0);
      }
    },
    [onStatic, setLowFps],
  );

  // ---- captions (numbers only from results.json / metadata) ----
  const m = effAb === "earth" && earthSpec ? earthSpec.hf.meta : marsSpec.hf.meta;
  const exOptions = Array.from(new Set([1, hero.meta.vertical_exaggeration_default === 1 ? 2 : hero.meta.vertical_exaggeration_default]));
  const showSheet = mode === "compare" && sheetOpen;
  // persistent compare caption: specific breakdown items, looked up by id

  let caption: React.ReactNode = null;
  if (lens === "rover") {
    caption = (
      <div className="space-y-2">
        <p className="text-[15px] text-ink">
          Slope-class proxy at ~{SLOPE_BASELINE_M} m baseline; not trafficability (no rock, soil, slip or logistics data).
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted">
          <li className="flex items-center gap-2">
            <span className="swatch-0 inline-block h-4 w-6 rounded-[3px] border border-hairline" /> below {SLOPE_THRESHOLDS_DEG.loose}°
          </li>
          <li className="flex items-center gap-2">
            <span className="swatch-1 inline-block h-4 w-6 rounded-[3px] border border-hairline" /> {SLOPE_THRESHOLDS_DEG.loose}–{SLOPE_THRESHOLDS_DEG.outcrop}° (loose-material limit)
          </li>
          <li className="flex items-center gap-2">
            <span className="swatch-2 inline-block h-4 w-6 rounded-[3px] border border-hairline" /> ≥{SLOPE_THRESHOLDS_DEG.outcrop}° (outcrop limit)
          </li>
        </ul>
        <p className="text-[14px] text-muted">
          Thresholds: Hoover, Golombek &amp; Calef (2012). Classes computed in your browser from the {formatPosting(hero.meta.posting_m)} display grid.
        </p>
      </div>
    );
  }

  const lensControl = (
    <Segmented
      label="Scale lens"
      size="sm"
      value={lens}
      onChange={(v) => crossfade(() => setLens(v))}
      options={[
        { value: "landform", label: "Landform study (≥150 m)" },
        { value: "rover", label: "Rover-scale question (~5 m)" },
      ]}
    />
  );

  const inCompare = mode === "compare";
  const marsCoord = inCompare && marsCmp && marsScene && lens === "landform" ? formatCoord(marsScene.centroid, "Mars") : null;
  const earthMeta = earthHf?.meta ?? null;
  const heroTitle = inCompare && marsCmp && lens === "landform" ? "Yardang study area" : "HiRISE layered scarps";
  const heroSub =
    inCompare && marsCmp && lens === "landform"
      ? "CTX stereo terrain, 10 km window on the common 30 m analysis grid — the patch used for every Earth comparison."
      : lens === "rover"
        ? "HiRISE crop with slope-class proxy at ~4 m baseline."
        : res === "30m"
          ? "Same HiRISE crop, genuinely averaged to a 30 m grid."
          : "1 m stereo terrain model (NASA PDS). A separate patch ~10 km south of the yardang study area used for the Earth search.";

  return (
    <div className="fixed inset-0 bg-bg">
      {/* ---- full-bleed terrain ---- */}
      <div className="absolute bottom-0 left-0 top-[64px] transition-[right] duration-300" style={{ right: showSheet && !narrow ? 400 : 0 }}>
        <div className="absolute inset-y-0 left-0" style={{ width: roverPair && effAb === "split" ? "50%" : "100%" }}>
          <TerrainViewer
            views={views}
            exaggeration={exaggeration}
            onEngine={(e) => (engine.current = e)}
            onCamera={setMpp}
            onFallback={onFallback}
            onDrive={setDrive}
            minFps={minFps}
          />
          {fade ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fade.src}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ opacity: fade.visible ? 1 : 0, transition: "opacity 600ms ease-in-out" }}
            />
          ) : null}
        </div>

        {roverPair && effAb !== "mars" ? (
          <div className="absolute inset-y-0 right-0 flex items-center justify-center border-l border-hairline bg-bg p-8" style={{ width: effAb === "split" ? "50%" : "100%" }}>
            <div className="max-w-[440px]">
              <p className="text-[13px] uppercase tracking-[0.14em] text-earth">Earth · {selected?.name}</p>
              {selected?.centroid ? <p className="num mt-1 text-[15px] text-muted">{formatCoord(selected.centroid, "Earth")}</p> : null}
              <p className="mt-6 font-display text-[28px] font-semibold leading-tight">Not evaluable at this scale.</p>
              <p className="mt-3 text-[17px] leading-relaxed text-muted">
                Only 30 m public elevation exists here. Rover-relevant slopes, rocks and soil need a drone or lidar survey — this tool does not estimate trafficability.
              </p>
            </div>
          </div>
        ) : null}

        {pairActive && effAb === "split" ? <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-hairline" /> : null}

        {/* title block (top-left) */}
        <div className="pointer-events-none absolute left-5 top-5 max-w-[min(560px,calc(100%-40px))] md:left-8 md:top-7">
          {effAb !== "earth" ? (
            <>
              <p className="text-[13px] uppercase tracking-[0.16em] text-copper">Mars · Medusae Fossae Formation</p>
              <h1 className="mt-1 font-display text-[30px] font-semibold leading-[1.05] tracking-[-0.01em] md:text-[42px]" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>
                {heroTitle}
              </h1>
              <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-ink/85" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>
                {heroSub}
              </p>
              {marsCoord ? <p className="num mt-1 text-[14px] text-muted">{marsCoord}</p> : null}
            </>
          ) : selected ? (
            <>
              <p className="text-[13px] uppercase tracking-[0.16em] text-earth">Earth · {selected.kind === "candidate" ? "morphometric candidate" : selected.kind === "positive" ? "published yardang analog (control)" : "process-different control"}</p>
              <h1 className="mt-1 font-display text-[30px] font-semibold leading-[1.05] md:text-[42px]">{selected.name}</h1>
              {selected.centroid ? <p className="num mt-2 text-[15px] text-muted">{formatCoord(selected.centroid, "Earth")}</p> : null}
            </>
          ) : null}
        </div>
        {pairActive && effAb === "split" && earthSpec && selected ? (
          <div className="pointer-events-none absolute top-5 md:top-7" style={{ left: "calc(50% + 24px)" }}>
            <p className="text-[13px] uppercase tracking-[0.16em] text-earth">Earth · {selected.kind === "candidate" ? "morphometric candidate" : selected.kind === "positive" ? "published analog (control)" : "process-different control"}</p>
            <p className="mt-1 font-display text-[24px] font-semibold leading-tight md:text-[30px]">{selected.name}</p>
            {selected.centroid ? <p className="num mt-1 text-[14px] text-muted">{formatCoord(selected.centroid, "Earth")}</p> : null}
          </div>
        ) : null}

        {/* right column: PAX (explore) / status */}
        <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-3 md:right-6 md:top-6">
          {busy ? <div className="rounded-[8px] bg-bg/85 px-3 py-2 text-[14px] text-muted" aria-live="polite">{busy}</div> : null}
          {notice ? <div className="max-w-[360px] rounded-[8px] border border-hairline bg-bg/90 px-3 py-2 text-[14px] text-muted" role="status">{notice}</div> : null}
          {lowFps !== null ? (
            <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-[8px] border border-hairline bg-surface/95 px-4 py-2 text-[14px] text-ink">
              <span>3D is rendering slowly (~{lowFps.toFixed(0)} fps).</span>
              <button type="button" className="text-copper hover:underline" onClick={() => onStatic(`Static view chosen after slow 3D rendering (~${lowFps.toFixed(0)} fps).`)}>
                Use static view
              </button>
              <button type="button" aria-label="Dismiss" className="text-muted hover:text-ink" onClick={() => setLowFps(null)}>
                ✕
              </button>
            </div>
          ) : null}
          {mode === "explore" && lens === "landform" && !narrow ? (
            <PaxExpedition engine={getEngine} hero={hero} results={r} res={res} onSetRes={toggle30} onCompare={enterCompare} drive={drive} />
          ) : null}
          {inCompare ? <div className="pointer-events-auto">{lensControl}</div> : null}
        </div>

        {/* the scale moment */}
        {mode === "explore" && res === "30m" && lens === "landform" && r ? (
          <div className="pointer-events-none absolute left-1/2 top-[38%] w-[min(560px,calc(100%-32px))] -translate-x-1/2 rounded-[12px] border border-hairline bg-bg/80 p-5 text-center backdrop-blur fade-in">
            <p className="text-[13px] uppercase tracking-[0.16em] text-copper">The comparison scale</p>
            <p className="mt-2 font-display text-[22px] font-semibold leading-snug md:text-[26px]">
              At 30 m, steep terrain falls from <span className="num">{fracToPercent(r.hirise.frac_area_slope_gt15_baseline_4m)}</span> to{" "}
              <span className="num">{fracToPercent(r.hirise.frac_area_slope_gt15_baseline_180m)}</span> of this crop.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
              Area steeper than 15° at a 4 m vs a 180 m baseline. Ridges, scarp lips and small knobs vanish — exactly the detail a terrain-only Earth search cannot see.
            </p>
          </div>
        ) : null}

        {/* bottom strip */}
        <div className="absolute inset-x-0 bottom-0 border-t border-hairline/70 bg-bg/82 backdrop-blur">
          {inCompare && lens === "landform" ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-hairline/70 px-5 py-2 text-[14px] md:px-8">
              <span className="text-ink">
                <span className="font-semibold">Method validation did not pass.</span>{" "}
                <span className="text-muted">Gobi results are exploratory morphometric candidates, not confirmed Mars analogs.</span>{" "}
                <button type="button" className="text-copper hover:underline" onClick={() => openEvidence("validation")}>
                  Details
                </button>
              </span>
              <span className="text-muted">Geometry is not geology — candidates need imagery, material and field checks.</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 md:px-8">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
              {mpp > 0 ? <ScaleBar mpp={mpp} /> : null}
              <span className="num text-[14px] text-ink/85">
                {formatMetres(m.extent_m[0])} × {formatMetres(m.extent_m[1])} · grid ≈ {formatPosting(m.posting_m)} · vertical ×{exaggeration}
              </span>
              <span className="hidden max-w-[420px] truncate text-[14px] text-muted xl:inline" title={`${m.source_id} — ${m.provider}`}>
                <span className="num">{sourceBadge(m)}</span>
              </span>
              {earthMeta && effAb === "split" && earthSpec ? (
                <span className="hidden truncate text-[14px] text-earth xl:inline" title={`${earthMeta.source_id} — ${earthMeta.provider}`}>
                  Earth: <span className="num">{earthMeta.source_id}</span>
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mode === "explore" && lens === "landform" ? (
                <Segmented
                  label="Terrain detail"
                  size="sm"
                  value={res}
                  onChange={(v) => toggle30(v)}
                  options={[
                    { value: "native", label: "HiRISE detail" },
                    { value: "30m", label: "30 m comparison grid" },
                  ]}
                />
              ) : null}
              <Segmented label="Vertical exaggeration" size="sm" value={String(exaggeration)} onChange={(v) => setExaggeration(Number(v))} options={exOptions.map((e) => ({ value: String(e), label: `×${e}` }))} />
              <Button className="min-h-[40px] px-4 text-[14px]" onClick={() => engine.current?.reset()} title="Reset view (R)">
                Reset view
              </Button>
              {inCompare ? (
                <>
                  {pairActive && !narrow ? (
                    <Button className="min-h-[40px]" onClick={() => setAb(ab === "split" ? "mars" : "split")}>
                      {ab === "split" ? "Full screen" : "Split view"}
                    </Button>
                  ) : null}
                  {pairActive ? (
                    <Button className="min-h-[40px]" onClick={() => (ab === "split" ? setAb("mars") : swap())} title="Swap Mars and Earth (S)">
                      Swap (S)
                    </Button>
                  ) : null}
                  {!sheetOpen ? (
                    <Button className="min-h-[40px]" onClick={() => setSheetOpen(true)}>
                      Earth candidates
                    </Button>
                  ) : null}
                  <Button className="min-h-[40px]" onClick={exitCompare}>
                    Back to Mars
                  </Button>
                </>
              ) : (
                <Button variant="primary" className="min-h-[48px] px-6 text-[16px]" onClick={enterCompare}>
                  Compare with Earth
                </Button>
              )}
            </div>
          </div>
          {lens === "rover" ? <div className="border-t border-hairline/70 px-5 py-3 md:px-8">{caption}</div> : null}
        </div>

        {/* study-area transition */}
        {transitionLabel ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg/55 backdrop-blur-[2px] fade-in" aria-live="polite">
            <div className="text-center">
              <p className="text-[13px] uppercase tracking-[0.16em] text-copper">Changing terrain patch</p>
              <p className="mt-2 font-display text-[26px] font-semibold md:text-[34px]">{transitionLabel}</p>
              <p className="mt-2 text-[15px] text-muted">From the HiRISE scarps to the CTX yardang study area · common 30 m analysis grid</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---- header ---- */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-[64px] items-center justify-between gap-4 border-b border-hairline bg-bg/92 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Wordmark onClick={onHome} />
          <span className="hidden h-5 w-px bg-hairline lg:block" aria-hidden="true" />
          <span className="hidden text-[14px] text-muted lg:inline">Expedition 01 · Medusae Fossae</span>
        </div>
        <nav className="flex items-center" aria-label="Investigation steps">
          <NavItem label="Explore" active={mode === "explore"} onClick={onNavExplore} />
          <NavItem label="Compare" active={inCompare} onClick={onNavCompare} />
          <NavItem label="Evidence" active={analysisOpen} onClick={onNavEvidence} />
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEvidence("validation")}
            className="hidden min-h-[36px] items-center gap-2 rounded-[8px] border border-hairline px-3 text-[13px] text-ink hover:border-copper md:flex"
            title="Pre-registered validation outcome"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
            Validation: {r ? (r.decision.pass ? "passed" : "failed") : "…"}
          </button>
          <Button variant="quiet" onClick={onOpenAbout} className="hidden sm:inline-flex">
            About
          </Button>
        </div>
      </header>

      {showSheet ? (
        <div className="absolute bottom-0 right-0 top-[64px] z-30 w-full md:w-[400px]">
          <CompareSheet results={results} selectedKey={selected?.key ?? null} onSelect={selectItem} onClose={() => setSheetOpen(false)} />
        </div>
      ) : null}

      <p className="sr-only">Keyboard: arrow keys orbit, plus and minus zoom, R resets the view, S swaps Mars and Earth.</p>

      <EvidenceDrawer open={drawerOpen} tab={drawerTab} onTab={setDrawerTab} onClose={() => setDrawerOpen(false)} results={results} sources={sources} />
      {analysisOpen && r ? (
        <AnalysisView
          results={r}
          sources={sources.status === "ready" ? sources.data : []}
          initialSection={analysisSection}
          onClose={() => setAnalysisOpen(false)}
          onCompare={(id: string) => {
            setAnalysisOpen(false);
            compareScene(id);
          }}
        />
      ) : null}
    </div>
  );
}
