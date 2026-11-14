"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLogo } from "./brand";
import { sfx } from "@/lib/audio";

const RoverStage = dynamic(() => import("./rover-stage"), { ssr: false });

/**
 * Branded opening sequence. Phases (a small timer-driven state machine):
 *   0 ARRIVAL  — orbit light trail draws, the copper X lands, the wordmark assembles
 *   1 WELCOME  — "Welcome to PARALLAX X" + the three-verb promise
 *   2 MISSION  — the real expedition rover glTF raises its mast over the real HiRISE hillshade of the study site
 *   3 SELECT   — hand-off line, then the overlay dissolves into the destination selector underneath
 * Plays once per browser session, is skippable at every moment (button, Esc/Enter/Space, click), never blocks
 * on a timer longer than ~10 s, and collapses to a 1.4 s static card under prefers-reduced-motion.
 * No audio plays unless the user has already enabled sound (browsers require a gesture anyway).
 */

const KEY = "parallax-x-intro-seen";
const TIMELINE = [2300, 4700, 9300, 10600]; // ms: start of phase 1, 2, 3, end

export type IntroState = "pending" | "playing" | "done";

/** Decide on mount whether the intro runs (first visit this session, or ?intro forces it; ?nointro skips). */
export function useIntroGate(): [IntroState, () => void] {
  const [state, setState] = useState<IntroState>("pending");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(KEY) === "1";
    } catch {}
    const run = q.has("intro") || (!seen && !q.has("nointro"));
    // a microtask keeps this out of the effect body (no synchronous setState in an effect)
    queueMicrotask(() => setState(run ? "playing" : "done"));
  }, []);
  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {}
    setState("done");
  }, []);
  return [state, finish];
}

export function WelcomeIntro({ state, onDone, onBrandFilm }: { state: IntroState; onDone: () => void; onBrandFilm?: () => void }) {
  const [phase, setPhase] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [roverReady, setRoverReady] = useState(false);
  const [roverFailed, setRoverFailed] = useState(false);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, reduced ? 0 : 520);
  }, [onDone, reduced]);

  useEffect(() => {
    if (state !== "playing") return;
    const timers: number[] = [];
    if (reduced) {
      timers.push(window.setTimeout(() => setPhase(1), 0));
      timers.push(window.setTimeout(finish, 1400));
    } else {
      sfx("reveal");
      timers.push(window.setTimeout(() => setPhase(1), TIMELINE[0]));
      timers.push(window.setTimeout(() => (setPhase(2), sfx("whoosh")), TIMELINE[1]));
      timers.push(window.setTimeout(() => (setPhase(3), sfx("chime")), TIMELINE[2]));
      timers.push(window.setTimeout(finish, TIMELINE[3]));
    }
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
    };
  }, [state, reduced, finish]);

  if (state === "done") return null;
  const playing = state === "playing";
  // the brand phase is pure CSS, so it is pre-rendered and starts at first paint; JS only drives later phases

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden bg-[#06080B] text-ink transition-opacity duration-500 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"} ${playing ? "" : "intro-failsafe"}`}
      role="dialog"
      aria-modal="true"
      aria-label="PARALLAX X introduction"
      onClick={playing ? finish : undefined}
    >
      {(
        <>
          {/* ambient light sweeping across matte graphite */}
          <div aria-hidden="true" className="intro-ambient absolute inset-0" />
          <div aria-hidden="true" className="intro-grain absolute inset-0" />

          {/* PHASE 2 — mission reveal: real HiRISE hillshade (data) + real rover glTF */}
          <div aria-hidden={phase < 2} className={`absolute inset-0 transition-opacity duration-[1200ms] ${phase >= 2 ? "opacity-100" : "opacity-0"}`}>
            <div className="intro-terrain absolute inset-[-8%]" style={{ backgroundImage: "url(/data/thumbs/mars_hirise_hero_lg.webp)" }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_62%,rgba(6,8,11,0.05),rgba(6,8,11,0.85)_75%)]" />
            <div className="absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(180deg,#06080B,rgba(6,8,11,0))]" />
          </div>
          <div
            className={`absolute left-1/2 top-[54%] h-[min(56vh,520px)] w-[min(92vw,900px)] -translate-x-1/2 transition-all duration-[1400ms] ease-out ${phase >= 2 ? "-translate-y-1/2 opacity-100" : "-translate-y-[44%] opacity-0"}`}
          >
            {/* a real render of the same model covers the seconds the live model needs to decode; never a fake */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/models/expedition-rover-poster.webp" alt="" className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${roverReady ? "opacity-0" : "opacity-100"}`} draggable={false} />
            {playing && !reduced && !roverFailed ? (
              <div className={`absolute inset-0 transition-opacity duration-700 ${roverReady ? "opacity-100" : "opacity-0"}`}>
                <RoverStage yaw={-0.62} onReady={() => setRoverReady(true)} onError={() => setRoverFailed(true)} />
              </div>
            ) : null}
          </div>

          {/* PHASE 0/1 — brand */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-[900ms] ${phase >= 2 ? "-translate-y-[34vh] scale-[0.55] opacity-90" : ""}`}>
            <div className="intro-logo w-[min(78vw,760px)]">
              <BrandLogo animate height={120} className="h-auto w-full" />
            </div>
            <div className={`mt-8 text-center transition-all duration-700 ${phase === 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
              <p className="font-display text-[clamp(18px,2.2vw,28px)] font-semibold uppercase tracking-[0.32em] text-ink">Welcome to PARALLAX X</p>
              <p className="mt-3 text-[clamp(14px,1.3vw,18px)] tracking-[0.06em] text-muted">
                Explore Mars. <span className="text-ink/90">Compare Earth.</span> <span className="text-copper-light">Question the evidence.</span>
              </p>
            </div>
          </div>

          {/* PHASE 2/3 — captions */}
          <div className={`absolute inset-x-0 bottom-[9vh] text-center transition-all duration-700 ${phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-copper-light">{phase >= 3 ? "Phase 04 · Select your destination" : "Phase 03 · Mission reveal"}</p>
            <p className="mt-2 font-display text-[clamp(20px,2.4vw,32px)] font-semibold text-ink">{phase >= 3 ? "Choose a real Mars terrain to explore." : "Medusae Fossae Formation, Mars"}</p>
            <p className="mx-auto mt-2 max-w-[640px] px-6 text-[13px] leading-snug text-muted">
              Backdrop: HiRISE stereo-terrain hillshade of the study site (real data). Rover: 3D model NASA/JPL-Caltech with insignia removed, shown enlarged — a visualization, not affiliated with NASA.
            </p>
          </div>

          <div className="absolute left-6 top-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            <span className="num">0{Math.min(phase, 3) + 1}</span>
            <span className="h-px w-10 bg-hairline" />
            <span>{["Arrival", "Welcome", "Mission reveal", "Select destination"][Math.min(phase, 3)]}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="absolute right-5 top-4 z-10 inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-hairline bg-bg/60 px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink/90 backdrop-blur transition-colors hover:border-copper"
          >
            Skip intro <kbd className="num rounded border border-hairline px-1.5 text-[11px] text-muted">Esc</kbd>
          </button>
          {onBrandFilm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finish();
                onBrandFilm();
              }}
              className="absolute right-5 top-[64px] z-10 inline-flex min-h-[36px] items-center gap-2 rounded-[10px] border border-hairline bg-bg/50 px-3 text-[12px] font-semibold text-ink/80 backdrop-blur hover:border-copper hover:text-ink"
            >
              Watch the brand film <span className="text-[11px] font-normal text-muted">AI concept · 22 s</span>
            </button>
          ) : null}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-hairline/40">
            <div className="intro-progress h-full bg-copper/80" style={{ animationDuration: `${TIMELINE[3]}ms` }} />
          </div>
        </>
      )}
    </div>
  );
}
