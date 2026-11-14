"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLocator, loadResults, loadSources, type Loadable } from "@/lib/data";
import { fetchHeightfieldMeta, loadHeightfield } from "@/lib/heightfield";
import { getHillshadeRGBA, getMeshArrays } from "@/lib/terrain-compute";
import { formatBytes } from "@/lib/format";
import type { Heightfield, HeightfieldMeta, Locator, Results, SourceRecord } from "@/lib/types";
import { SelectView } from "./select-view";
import { LoadingView, type LoadStep } from "./loading-view";
import { ExploreView } from "./explore-view";
import { StaticFallback } from "./static-fallback";
import { AboutDialog } from "./about-dialog";
import { Wordmark } from "./wordmark";
import { SiteFooter } from "./site-footer";

const HERO_ID = "mars_hirise_hero";
type Stage = "select" | "loading" | "explore" | "static";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function ParallaxApp() {
  const [stage, setStage] = useState<Stage>("select");
  const [locator, setLocator] = useState<Loadable<Locator>>({ status: "loading" });
  const [sources, setSources] = useState<Loadable<SourceRecord[]>>({ status: "loading" });
  const [results, setResults] = useState<Loadable<Results>>({ status: "loading" });
  const [heroMeta, setHeroMeta] = useState<HeightfieldMeta | null>(null);
  const [hero, setHero] = useState<Heightfield | null>(null);
  const [steps, setSteps] = useState<LoadStep[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staticReason, setStaticReason] = useState("");
  const [force3D, setForce3D] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    loadLocator().then(setLocator);
    loadSources().then(setSources);
    fetchHeightfieldMeta(HERO_ID)
      .then(setHeroMeta)
      .catch(() => setHeroMeta(null));
  }, []);

  const patch = (id: string, p: Partial<LoadStep>) => setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const startExplore = useCallback(async () => {
    const id = ++run.current;
    setStage("loading");
    setLoadError(null);
    setShowSteps(false);
    // Step list appears only if real work takes longer than 300 ms. No minimum duration.
    const timer = window.setTimeout(() => {
      if (run.current === id) setShowSteps(true);
    }, 300);
    setSteps([
      { id: "fetch", label: "Fetching Mars elevation", detail: heroMeta?.source_id ?? HERO_ID, status: "active", progress: 0 },
      { id: "mesh", label: "Building terrain mesh", detail: "waiting for elevation data", status: "pending" },
      { id: "results", label: "Loading Earth comparison results", detail: "results.json", status: "pending" },
    ]);
    try {
      const resultsP = loadResults();
      const hf = await loadHeightfield(HERO_ID, {
        onProgress: (loaded, total) =>
          patch("fetch", {
            detail: `${heroMeta?.source_id ?? HERO_ID} · ${formatBytes(loaded)}${total ? ` / ${formatBytes(total)}` : ""}`,
            progress: total ? loaded / total : null,
          }),
      });
      if (run.current !== id) return;
      patch("fetch", { status: "done", detail: `${hf.meta.source_id} · ${hf.meta.width} × ${hf.meta.height} grid` });
      patch("mesh", { status: "active", detail: "loading 3D engine" });
      await nextFrame();
      await import("./terrain-viewer"); // the three.js chunk
      const mesh = getMeshArrays(hf);
      getHillshadeRGBA(hf, hf.meta.vertical_exaggeration_default, "mars");
      patch("mesh", { status: "done", detail: `${(mesh.cols * mesh.rows).toLocaleString("en-US")} vertices · hillshade from ${(hf.meta.width * hf.meta.height).toLocaleString("en-US")} cells` });
      patch("results", { status: "active" });
      const res = await resultsP;
      if (run.current !== id) return;
      setResults(res);
      patch("results", {
        status: res.status === "ready" ? "done" : "skipped",
        detail:
          res.status === "ready"
            ? `${res.data.candidates.length} candidates · ${res.data.sites.length} reference sites`
            : "results.json not published yet — Earth comparison will show as unavailable",
      });
      window.clearTimeout(timer);
      setHero(hf);
      const qs = new URLSearchParams(window.location.search);
      const wantStatic = qs.has("static");
      if (qs.has("force3d") || window.sessionStorage.getItem("parallax-force3d") === "1") setForce3D(true);
      if (wantStatic) {
        setStaticReason("Static view requested (?static).");
        setStage("static");
      } else setStage("explore");
    } catch (e) {
      window.clearTimeout(timer);
      if (run.current !== id) return;
      setLoadError(e instanceof Error ? e.message : String(e));
      setShowSteps(true);
    }
  }, [heroMeta]);

  const goStatic = useCallback((reason: string) => {
    setStaticReason(reason);
    setStage("static");
  }, []);

  const home = () => {
    run.current++;
    setStage("select");
  };

  return (
    <>
      {stage === "select" ? (
        <SelectView locator={locator} sources={sources} heroMeta={heroMeta} onExplore={startExplore} onOpenAbout={() => setAboutOpen(true)} />
      ) : null}
      {stage === "loading" ? (
        <LoadingView
          steps={steps}
          showSteps={showSteps}
          error={loadError}
          onRetry={startExplore}
          onStatic={() => goStatic("The terrain could not be loaded, so no 3D view is available.")}
        />
      ) : null}
      {stage === "explore" && hero ? (
        <ExploreView
          hero={hero}
          results={results}
          sources={sources}
          onHome={home}
          onOpenAbout={() => setAboutOpen(true)}
          onStatic={goStatic}
          minFps={force3D ? 0 : 20}
        />
      ) : null}
      {stage === "static" ? (
        <div className="min-h-screen">
          <header className="flex items-center justify-between px-6 py-5 md:px-8">
            <Wordmark onClick={home} />
          </header>
          <StaticFallback
            hf={hero}
            results={results.status === "ready" ? results.data : null}
            reason={staticReason}
            onTry3D={
              hero
                ? () => {
                    setForce3D(true);
                    try {
                      window.sessionStorage.setItem("parallax-force3d", "1");
                    } catch {}
                    setStage("explore");
                  }
                : undefined
            }
          />
          <SiteFooter />
        </div>
      ) : null}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
