"use client";

import { useMemo, useState } from "react";
import type { Heightfield, Results } from "@/lib/types";
import type { CameraMode, DriveState, PaxScale, TerrainEngine } from "@/lib/terrain-engine";
import { focalCell } from "@/lib/terrain-compute";
import { formatMetres, formatPosting, fracToPercent } from "@/lib/format";

const PAX_URL = "/models/pax-rover.glb";

/** Local relief (max − min, metres) of the strongest-relief block — computed from the measured heightfield. */
function focalRelief(hf: Heightfield): number | null {
  const { width: w, height: h } = hf.meta;
  const [cx, cy] = focalCell(hf);
  const bw = Math.floor(w / 8);
  const bh = Math.floor(h / 8);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = Math.max(0, Math.floor(cy - bh / 2)); y < Math.min(h, cy + bh / 2); y++) {
    for (let x = Math.max(0, Math.floor(cx - bw / 2)); x < Math.min(w, cx + bw / 2); x++) {
      const v = hf.heights[y * w + x];
      if (Number.isNaN(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  return Number.isFinite(hi - lo) ? hi - lo : null;
}

type Status = "idle" | "loading" | "ready" | "error";

function Pill({ active, onClick, children, label }: { active?: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`min-h-[40px] rounded-[8px] border px-3 text-[14px] transition-colors duration-200 ${
        active ? "border-copper bg-copper/15 text-ink" : "border-hairline bg-bg/40 text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PaxExpedition({
  engine,
  hero,
  results,
  onSetRes,
  onCompare,
  drive,
  tourOnly = false,
}: {
  engine: () => TerrainEngine | null;
  hero: Heightfield;
  results: Results | null;
  onSetRes: (r: "native" | "30m") => void;
  onCompare: () => void;
  drive: DriveState | null;
  tourOnly?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"tour" | "drive">("tour");
  const [step, setStep] = useState(0);
  const [enlarge, setEnlarge] = useState<number | null>(null);
  const relief = useMemo(() => focalRelief(hero), [hero]);
  const m = hero.meta;

  const ensurePax = async (): Promise<boolean> => {
    const e = engine();
    if (!e) return false;
    if (status === "ready") return true;
    setStatus("loading");
    const info = await e.loadPax(PAX_URL);
    if (!info) {
      setStatus("error");
      return false;
    }
    console.info("[PARALLAX X] PAX glTF loaded in terrain scene; clips:", info.clips.join(", "));
    setStatus("ready");
    setEnlarge(e.showPax(true));
    return true;
  };

  const tour = [
    {
      title: "A real Martian landscape",
      body: `This is measured elevation: a ${formatMetres(m.extent_m[0])} × ${formatMetres(m.extent_m[1])} crop of the HiRISE stereo terrain model (NASA PDS, ${formatPosting(m.source_posting_m ?? 1)} posts) — wind-eroded, layered Medusae Fossae deposits.`,
      run: (e: TerrainEngine) => {
        onSetRes("native");
        e.flyTo("overview");
        e.playPax("Wave");
      },
    },
    {
      title: "The strongest relief",
      body:
        relief !== null
          ? `PAX points the camera at the steepest part of the crop: ${formatMetres(relief)} of local relief within a ${formatMetres(m.extent_m[0] / 8)} block, read straight from the heightfield.`
          : "PAX points the camera at the steepest part of the crop.",
      run: (e: TerrainEngine) => {
        onSetRes("native");
        e.flyTo("focus");
        e.playPax("HeadTurn");
      },
    },
    {
      title: "What a 30 m grid loses",
      body: results
        ? `The same crop averaged to 30 m — the scale at which Earth and Mars can be compared fairly. Area steeper than 15°: ${fracToPercent(results.hirise.frac_area_slope_gt15_baseline_4m)} at a 4 m baseline, only ${fracToPercent(results.hirise.frac_area_slope_gt15_baseline_180m)} at 180 m.`
        : "The same crop averaged to 30 m — the scale at which Earth and Mars can be compared fairly.",
      run: (e: TerrainEngine) => {
        onSetRes("30m");
        e.flyTo("grazing");
        e.playPax("CuriousTilt");
      },
    },
    {
      title: "Searching Earth",
      body: results
        ? `The Earth search used a different patch: the CTX yardang area ~10 km north, on a common 30 m grid, against ${results.null_set.n_windows.toLocaleString("en-US")} Earth windows. Its pre-registered validation ${results.decision.pass ? "passed" : "did not pass"}.`
        : "The Earth search used a different patch: the CTX yardang area ~10 km north, on a common 30 m grid.",
      run: (e: TerrainEngine) => {
        onSetRes("native");
        e.flyTo("overview");
        e.playPax("Idle");
      },
    },
  ];

  const goStep = async (i: number) => {
    if (!(await ensurePax())) return;
    const e = engine();
    if (!e) return;
    e.stopDrive();
    setStep(i);
    tour[i].run(e);
  };

  const startDrive = async () => {
    if (!(await ensurePax())) return;
    onSetRes("native");
    engine()?.startDrive();
  };

  const cam = (c: CameraMode) => engine()?.setCameraMode(c);
  const scale = (s: PaxScale) => {
    const e = engine();
    if (!e) return;
    e.setPaxScale(s);
    setEnlarge(s === "cinematic" ? (e.showPax(true) ?? null) : 1);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex min-h-[44px] items-center gap-2 rounded-[10px] border border-hairline bg-surface/90 px-4 text-[15px] text-ink backdrop-blur"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-copper" aria-hidden="true" /> PAX expedition
      </button>
    );
  }

  return (
    <section aria-label="PAX expedition" className="pointer-events-auto w-[min(360px,calc(100vw-24px))] rounded-[12px] border border-hairline bg-surface/92 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] uppercase tracking-[0.14em] text-muted">PAX expedition</p>
          <p className="mt-1 font-display text-[19px] font-semibold leading-tight">{tab === "tour" ? "Guided terrain tour" : "Terrain-following demo"}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[36px] px-2 text-[14px] text-muted hover:text-ink" aria-label="Collapse PAX panel">
          Hide
        </button>
      </div>

      <div className={`mt-3 flex gap-2 ${tourOnly ? "hidden" : ""}`} role="tablist">
        <Pill active={tab === "tour"} onClick={() => setTab("tour")}>
          Tour
        </Pill>
        <Pill active={tab === "drive"} onClick={() => setTab("drive")}>
          Drive demo
        </Pill>
      </div>

      {status === "error" ? <p className="mt-3 text-[14px] text-muted">The PAX model could not be loaded. The terrain remains fully usable.</p> : null}

      {tab === "tour" ? (
        <div className="mt-3">
          {status !== "ready" ? (
            <button
              type="button"
              onClick={() => goStep(0)}
              className="min-h-[46px] w-full rounded-[8px] bg-copper px-4 text-[15px] font-medium text-[#120c09] transition-colors hover:brightness-110 disabled:opacity-60"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Loading PAX (4.6 MB)…" : "Start the tour with PAX"}
            </button>
          ) : (
            <>
              <ol className="flex gap-1" aria-label="Tour steps">
                {tour.map((t, i) => (
                  <li key={t.title} className="flex-1">
                    <button
                      type="button"
                      onClick={() => goStep(i)}
                      aria-current={i === step ? "step" : undefined}
                      className={`h-[6px] w-full rounded-full ${i === step ? "bg-copper" : i < step ? "bg-copper/40" : "bg-hairline"}`}
                      aria-label={`Step ${i + 1}: ${t.title}`}
                    />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[13px] text-muted">
                Step {step + 1} of {tour.length}
              </p>
              <p className="mt-1 font-display text-[18px] font-semibold">{tour[step].title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{tour[step].body}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" className="min-h-[40px] px-2 text-[14px] text-muted hover:text-ink disabled:opacity-40" disabled={step === 0} onClick={() => goStep(step - 1)}>
                  ← Back
                </button>
                {step < tour.length - 1 ? (
                  <button type="button" className="min-h-[40px] rounded-[8px] border border-hairline px-4 text-[14px] text-ink hover:border-copper" onClick={() => goStep(step + 1)}>
                    Next →
                  </button>
                ) : (
                  <button type="button" className="min-h-[40px] rounded-[8px] bg-copper px-4 text-[14px] font-medium text-[#120c09]" onClick={onCompare}>
                    Compare with Earth
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {!drive?.started ? (
              <button
                type="button"
                onClick={startDrive}
                disabled={status === "loading"}
                className="min-h-[44px] flex-1 rounded-[8px] bg-copper px-4 text-[15px] font-medium text-[#120c09] hover:brightness-110 disabled:opacity-60"
              >
                {status === "loading" ? "Loading PAX…" : "Start"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (drive.playing ? engine()?.pauseDrive() : engine()?.resumeDrive())}
                  className="min-h-[44px] flex-1 rounded-[8px] bg-copper px-4 text-[15px] font-medium text-[#120c09] hover:brightness-110"
                >
                  {drive.playing ? "Pause" : "Resume"}
                </button>
                <button type="button" onClick={() => engine()?.restartDrive()} className="min-h-[44px] rounded-[8px] border border-hairline px-4 text-[14px] text-ink hover:border-copper">
                  Replay
                </button>
                <button type="button" onClick={() => engine()?.stopDrive()} className="min-h-[44px] rounded-[8px] border border-hairline px-3 text-[14px] text-muted hover:text-ink">
                  Stop
                </button>
              </>
            )}
          </div>
          {drive?.started ? (
            <div aria-label="Progress along the demonstration loop" className="h-[4px] w-full overflow-hidden rounded-full bg-hairline">
              <div className="h-full bg-copper" style={{ width: `${(drive.progress * 100).toFixed(1)}%` }} />
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[13px] text-muted">Camera</p>
            <div className="flex flex-wrap gap-2">
              <Pill active={drive?.camera === "follow"} onClick={() => cam("follow")}>
                Follow
              </Pill>
              <Pill active={drive?.camera === "closeup"} onClick={() => cam("closeup")}>
                Close-up
              </Pill>
              <Pill active={!drive || drive.camera === "orbit"} onClick={() => cam("orbit")}>
                Free orbit
              </Pill>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[13px] text-muted">PAX size</p>
            <div className="flex flex-wrap gap-2">
              <Pill active={drive?.scale === "true"} onClick={() => scale("true")}>
                True scale (≈0.5 m)
              </Pill>
              <Pill active={!drive || drive.scale === "cinematic"} onClick={() => scale("cinematic")}>
                Cinematic{enlarge && enlarge > 1 ? ` (×${enlarge})` : ""}
              </Pill>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            Hand-drawn demonstration loop{drive?.pathLengthM ? ` (${formatMetres(drive.pathLengthM)})` : ""}. PAX follows the rendered HiRISE surface height; playback is time-lapsed. This is a visualization — no traction, slip, obstacle or safety physics is modelled.
          </p>
        </div>
      )}
    </section>
  );
}
