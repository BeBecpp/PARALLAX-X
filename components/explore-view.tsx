"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ValidationBanner } from "./validation-banner";
import type { Loadable } from "@/lib/data";
import type { Heightfield, HeightfieldMeta, Results, SourceRecord } from "@/lib/types";
import type { TerrainEngine, ViewSpec } from "@/lib/terrain-engine";
import { loadHeightfield } from "@/lib/heightfield";
import { chooseStride, SLOPE_BASELINE_M, SLOPE_THRESHOLDS_DEG } from "@/lib/terrain-compute";
import { formatCoord, formatMetres, formatPosting, fracToPercent, niceScaleBar } from "@/lib/format";
import { useNarrow, useReducedMotion } from "@/lib/hooks";
import { Button, Segmented } from "./ui";
import { Wordmark } from "./wordmark";
import { CompareSheet, type CompareItem } from "./compare-sheet";
import { EvidenceDrawer, type EvidenceTab } from "./evidence-drawer";

const TerrainViewer = dynamic(() => import("./terrain-viewer"), { ssr: false });

type Mode = "explore" | "compare";
type Lens = "landform" | "rover";
type AB = "split" | "mars" | "earth";

function sourceBadge(m: HeightfieldMeta): string {
  if (/hirise/i.test(m.provider)) return `HiRISE ${m.source_id} · NASA PDS`;
  return `${m.source_id} · ${m.provider.replace(/\s*\(.*\)\s*$/, "")}`;
}

function postingLine(m: HeightfieldMeta): string {
  const stride = chooseStride(m.width, m.height);
  let s = `display grid ≈ ${formatPosting(m.posting_m)}`;
  if (stride > 1) s += ` (3D mesh ${formatPosting(m.posting_m * stride)})`;
  if (m.source_posting_m) s += ` · ${/hirise/i.test(m.provider) ? "HiRISE" : "source"} posts ${formatPosting(m.source_posting_m)}`;
  return s;
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

function ViewLabel({ planet, title, coord, sub }: { planet: "Mars" | "Earth"; title: string; coord?: string | null; sub?: string }) {
  const c = planet === "Mars" ? "text-copper border-copper/60" : "text-earth border-earth/60";
  return (
    <div className="pointer-events-none rounded-[8px] border border-hairline bg-bg/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-[4px] border px-[6px] text-[14px] font-semibold tracking-[0.08em] ${c}`}>{planet.toUpperCase()}</span>
        <span className="text-[15px] text-ink">{title}</span>
      </div>
      {coord ? <div className="num mt-1 text-[14px] text-muted">{coord}</div> : null}
      {sub ? <div className="mt-[2px] text-[14px] text-muted">{sub}</div> : null}
    </div>
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
  const [optsOpen, setOptsOpen] = useState(false);
  const [fade, setFade] = useState<{ src: string; visible: boolean } | null>(null);
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
    setSheetOpen(true);
    setNotice(null);
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
  const breakdown3 = r ? (["shape", "air", "scale"].map((id) => r.breakdown.find((b) => b.id === id)).filter(Boolean) as Results["breakdown"]) : [];

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
  } else if (mode === "explore" && res === "30m") {
    caption = r ? (
      <p className="text-[15px] text-ink">
        What a 30 m grid sees: area steeper than 15° is{" "}
        <span className="num">{fracToPercent(r.hirise.frac_area_slope_gt15_baseline_4m)}</span> at a 4 m baseline vs{" "}
        <span className="num">{fracToPercent(r.hirise.frac_area_slope_gt15_baseline_180m)}</span> at a 180 m baseline.
      </p>
    ) : (
      <p className="text-[15px] text-ink">
        Same crop, really aggregated to ≈{formatPosting(m.posting_m)}. Slope statistics will appear here once results.json is published.
      </p>
    );
  } else if (mode === "compare") {
    caption = marsCmp ? (
      <p className="text-[15px] text-ink">Compared at a common {formatPosting(marsCmp.meta.posting_m)} grid — the scale both planets&apos; data resolve.</p>
    ) : (
      <p className="text-[15px] text-ink">Matched Mars comparison scene not available yet — still showing the HiRISE crop.</p>
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

  const marsTitle = mode === "compare" && marsCmp && lens === "landform" ? (marsScene?.label.replace(/\s*\(Mars\)\s*$/, "") ?? "Medusae Fossae") : "Medusae Fossae Formation — wind-eroded layered scarps (HiRISE scene, south of the yardang fingerprint area)";
  const marsCoord = mode === "compare" && marsCmp && marsScene && lens === "landform" ? formatCoord(marsScene.centroid, "Mars") : null;
  const earthMeta = earthHf?.meta ?? null;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      <header className="z-20 flex items-center justify-between gap-4 border-b border-hairline px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Wordmark onClick={onHome} />
          <span className="hidden truncate text-[15px] text-muted sm:inline">
            Mars <span aria-hidden="true">›</span> Medusae Fossae Formation{mode === "compare" ? " › Compare yardang fingerprint with Earth" : " › HiRISE scarps"}
          </span>
        </div>
        <div className="hidden lg:block">{lensControl}</div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={onOpenAbout} className="hidden sm:inline-flex">
            About
          </Button>
          <Button onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
            Evidence
          </Button>
        </div>
      </header>
      <div className="z-10 border-b border-hairline">
        <ValidationBanner results={r} compact onDetails={() => { setDrawerTab("result"); setDrawerOpen(true); }} />
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {/* canvas region: half width when the Earth half is a 'not evaluable' panel */}
          <div className="absolute inset-y-0 left-0" style={{ width: roverPair && effAb === "split" ? "50%" : "100%" }}>
            <TerrainViewer
              views={views}
              exaggeration={exaggeration}
              onEngine={(e) => (engine.current = e)}
              onCamera={setMpp}
              onFallback={onFallback}
              minFps={minFps}
            />
            {lowFps !== null ? (
              <div role="status" className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-hairline bg-surface/95 px-4 py-2 text-[14px] text-ink">
                <span>3D is rendering slowly here (~{lowFps.toFixed(0)} fps).</span>
                <button type="button" className="text-copper underline-offset-2 hover:underline" onClick={() => onStatic(`Static view chosen after slow 3D rendering (~${lowFps.toFixed(0)} fps).`)}>
                  Use static view
                </button>
                <button type="button" aria-label="Dismiss" className="text-muted hover:text-ink" onClick={() => setLowFps(null)}>
                  ✕
                </button>
              </div>
            ) : null}
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
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-center border-l border-hairline bg-bg p-8"
              style={{ width: effAb === "split" ? "50%" : "100%" }}
            >
              <div className="max-w-[420px]">
                <ViewLabel planet="Earth" title={selected?.name ?? "Earth"} coord={selected?.centroid ? formatCoord(selected.centroid, "Earth") : null} />
                <p className="mt-6 font-display text-[22px] font-semibold leading-snug">Not evaluable at this scale.</p>
                <p className="mt-3 text-[16px] text-muted">
                  Only 30 m public elevation data exist here. Higher-resolution survey (drone or lidar) required.
                </p>
              </div>
            </div>
          ) : null}

          {/* split divider + labels */}
          {pairActive && effAb === "split" ? <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-hairline" /> : null}
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
            {effAb !== "earth" ? (
              <ViewLabel planet="Mars" title={marsTitle} coord={marsCoord} sub={lens === "rover" ? "HiRISE crop · slope classes" : undefined} />
            ) : null}
            {effAb === "earth" && earthSpec && selected ? (
              <ViewLabel planet="Earth" title={selected.name} coord={selected.centroid ? formatCoord(selected.centroid, "Earth") : null} />
            ) : null}
          </div>
          {pairActive && effAb === "split" && earthSpec && selected ? (
            <div className="pointer-events-none absolute top-4" style={{ left: "calc(50% + 16px)" }}>
              <ViewLabel planet="Earth" title={selected.name} coord={selected.centroid ? formatCoord(selected.centroid, "Earth") : null} />
            </div>
          ) : null}

          {/* status messages */}
          <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2">
            {busy ? <div className="rounded-[8px] bg-bg/85 px-3 py-1 text-[14px] text-muted" aria-live="polite">{busy}</div> : null}
            {notice ? (
              <div className="max-w-[360px] rounded-[8px] border border-hairline bg-bg/90 px-3 py-2 text-[14px] text-muted" role="status">
                {notice}
              </div>
            ) : null}
          </div>

          {/* bottom bar */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3 md:inset-x-4 md:bottom-4">
            <div className="pointer-events-auto w-full max-w-[420px] space-y-1 rounded-[8px] border border-hairline bg-bg/88 p-3 sm:w-auto">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {mpp > 0 ? <ScaleBar mpp={mpp} /> : null}
                <span className="num text-[14px] text-muted">
                  {formatMetres(m.extent_m[0])} × {formatMetres(m.extent_m[1])} tile
                </span>
              </div>
              <p className={`num text-[14px] text-muted ${narrow && !optsOpen ? "hidden" : ""}`}>{postingLine(m)}</p>
              <p className="truncate text-[14px] text-ink" title={`${m.source_id} — ${m.provider}`}>
                <span className="num">{sourceBadge(m)}</span>
              </p>
              {earthMeta && effAb === "split" && earthSpec ? (
                <p className="truncate text-[14px] text-[#9cc3d1]" title={`${earthMeta.source_id} — ${earthMeta.provider}`}>
                  Earth: <span className="num">{sourceBadge(earthMeta)}</span> · grid ≈ {formatPosting(earthMeta.posting_m)}
                </p>
              ) : null}
              {narrow ? (
                <button type="button" className="min-h-[32px] text-[14px] text-muted underline underline-offset-4" onClick={() => setOptsOpen((o) => !o)} aria-expanded={optsOpen}>
                  {optsOpen ? "Hide view options" : "View options"}
                </button>
              ) : null}
              <div className={`flex flex-wrap items-center gap-2 pt-1 ${narrow && !optsOpen ? "hidden" : ""}`}>
                <Segmented
                  label="Vertical exaggeration"
                  size="sm"
                  value={String(exaggeration)}
                  onChange={(v) => setExaggeration(Number(v))}
                  options={exOptions.map((e) => ({ value: String(e), label: `Vertical ×${e}` }))}
                />
                {mode === "explore" && lens === "landform" ? (
                  <Segmented
                    label="Resolution"
                    size="sm"
                    value={res}
                    onChange={(v) => toggle30(v)}
                    options={[
                      { value: "native", label: "HiRISE grid" },
                      { value: "30m", label: "What a 30 m grid sees" },
                    ]}
                  />
                ) : null}
                <Button className="min-h-[32px] px-3 text-[14px]" onClick={() => engine.current?.reset()} title="Reset view (R)">
                  Reset
                </Button>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              <div className="flex w-full justify-end lg:hidden">{lensControl}</div>
              {mode === "explore" ? (
                <Button variant="primary" className="min-h-[48px] px-6 text-[16px]" onClick={enterCompare}>
                  Compare with Earth
                </Button>
              ) : (
                <>
                  {pairActive ? (
                    <>
                      {!narrow ? (
                        <Button onClick={() => setAb(ab === "split" ? "mars" : "split")} title="Split or full-screen">
                          {ab === "split" ? "Full screen" : "Split view"}
                        </Button>
                      ) : null}
                      <Button onClick={() => (ab === "split" ? setAb("mars") : swap())} title="Swap Mars and Earth (S)">
                        A/B swap (S)
                      </Button>
                    </>
                  ) : null}
                  {!sheetOpen ? <Button onClick={() => setSheetOpen(true)}>Earth list</Button> : null}
                  <Button onClick={exitCompare}>Back to Mars</Button>
                </>
              )}
            </div>
          </div>
        </div>
            {caption || (mode === "compare" && breakdown3.length) ? (
              <div className="shrink-0 border-t border-hairline bg-bg px-4 py-3 md:px-6">
                {caption}
                {mode === "compare" && lens === "landform" && breakdown3.length ? (
                  <div className="mt-2 border-t border-hairline pt-2">
                    <p className="text-[14px] font-medium text-muted">Where the analogy breaks down</p>
                    <ul className="mt-1 space-y-[2px]">
                      {breakdown3.map((b) => (
                        <li key={b.id} className="truncate text-[14px] text-ink" title={`${b.title}: ${b.text}`}>
                          <span className="font-medium">{b.title}:</span> <span className="text-muted">{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
        </div>

        {showSheet ? (
          <div className="absolute inset-0 z-30 md:static md:z-auto md:w-[400px] md:shrink-0">
            <CompareSheet results={results} selectedKey={selected?.key ?? null} onSelect={selectItem} onClose={() => setSheetOpen(false)} />
          </div>
        ) : null}
      </div>

      <p className="sr-only">Keyboard: arrow keys orbit, plus and minus zoom, R resets the view, S swaps Mars and Earth.</p>

      <EvidenceDrawer open={drawerOpen} tab={drawerTab} onTab={setDrawerTab} onClose={() => setDrawerOpen(false)} results={results} sources={sources} />
    </div>
  );
}
