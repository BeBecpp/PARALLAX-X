"use client";

import { useRef, useState, type ReactNode } from "react";
import type { CameraMode, DriveState } from "@/lib/terrain-engine";
import type { ProfileData, TimelinePanelProps } from "./types";
import { Icon, MicroLabel, PillTabs } from "./panels/ui";
import { ProfileChart } from "./panels/profile-chart";

// Bottom instrument: PAX demonstration-loop transport + terrain profile chart.
// Time readout is time-lapsed playback of the loop, never a travel time, speed or ETA.

type ChartTab = "elevation" | "slope";

function mmss(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "00:00";
  const t = Math.floor(s);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function TimelinePanel(props: TimelinePanelProps) {
  const { mode, profile, cursorFrac, onCursor } = props;
  return (
    <section aria-label="Mission simulation and terrain profile" className="@container flex h-full min-h-0 w-full flex-col overflow-hidden border-t border-hairline bg-surface">
      <SimulationRow {...props} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-hairline p-3 lg:flex-row">
        <ProfileCard profile={profile} cursorFrac={cursorFrac} onCursor={onCursor} compare={mode === "compare"} onPick={mode === "simulate" ? props.onSeek : undefined} />
        <StatsBox profile={profile} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Row A — mission simulation transport                                 */
/* ------------------------------------------------------------------ */

const CAMERAS: { id: CameraMode; label: string }[] = [
  { id: "follow", label: "Follow" },
  { id: "closeup", label: "Close-up" },
  { id: "orbit", label: "Orbit" },
];

function SimulationRow({
  mode,
  drive,
  paxStatus,
  periodS,
  onStart,
  onPause,
  onResume,
  onReplay,
  onStop,
  onSeek,
  onSkip,
  onSpeed,
  poiFracs,
  onCamera,
  onOpenSimulate,
}: TimelinePanelProps) {
  const compare = mode === "compare";
  const progress = drive ? Math.min(1, Math.max(0, drive.progress)) : 0;
  const period = Number.isFinite(periodS) && periodS > 0 ? periodS : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
      {/* title */}
      <div className={`flex min-w-0 items-start gap-3 ${compare ? "flex-1" : "@[860px]:min-w-[240px] @[860px]:flex-1"}`}>
        <span className="mt-[2px] text-copper" title="Mission simulation">
          <Icon name="rover" className="h-[19px] w-[19px]" />
        </span>
        <div className={compare ? "min-w-0" : "sr-only min-w-0 @[860px]:not-sr-only"}>
          <h2 className="font-display text-[18px] font-semibold uppercase leading-tight tracking-[0.02em] text-ink">Mission simulation</h2>
          <p className="truncate text-[13px] text-muted">
            {compare ? "Simulation runs on the HiRISE scene" : "PAX on Mars · HiRISE scarps · demonstration loop"}
          </p>
        </div>
      </div>

      {/* transport */}
      {compare ? (
        <button
          type="button"
          onClick={onOpenSimulate}
          className="inline-flex items-center gap-2 rounded-full border border-copper/70 bg-copper/10 px-5 py-2 text-[14px] font-medium text-copper-light transition-colors duration-200 hover:bg-copper/20 motion-reduce:transition-none"
        >
          <PlayGlyph className="h-3.5 w-3.5" /> Open Simulate
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <RoundButton label="Restart loop" onClick={onReplay} disabled={!drive}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <rect x="5" y="5" width="2.2" height="14" rx="1" />
                <path d="M19 5.8v12.4a.8.8 0 01-1.24.67L9.5 13.2a1.4 1.4 0 010-2.4l8.26-5.67A.8.8 0 0119 5.8z" />
              </svg>
            </RoundButton>
            <PlayButton drive={drive} paxStatus={paxStatus} onStart={onStart} onPause={onPause} onResume={onResume} />
            <RoundButton label="Skip to next point of interest" onClick={onSkip} disabled={!drive || paxStatus !== "ready"}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <rect x="16.8" y="5" width="2.2" height="14" rx="1" />
                <path d="M5 5.8v12.4a.8.8 0 001.24.67l8.26-5.67a1.4 1.4 0 000-2.4L6.24 5.13A.8.8 0 005 5.8z" />
              </svg>
            </RoundButton>
            <RoundButton label="Stop" onClick={onStop} disabled={!drive?.started}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </RoundButton>
          </div>
          <div role="radiogroup" aria-label="Playback speed (time-lapse)" className="inline-flex overflow-hidden rounded-[8px] border border-hairline bg-[#0d1218]">
            {[0.5, 1, 2].map((m, i) => {
              const active = (drive?.speed ?? 1) === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!drive}
                  title="Playback speed (time-lapse, not a rover speed)"
                  onClick={() => onSpeed(m)}
                  className={`num px-2.5 py-[6px] text-[13px] font-medium disabled:opacity-50 ${i > 0 ? "border-l border-hairline" : ""} ${active ? "bg-copper/15 text-copper-light" : "text-muted enabled:hover:text-ink"}`}
                >
                  {m}×
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <MicroLabel className="hidden @[1100px]:block">Camera</MicroLabel>
            <div role="radiogroup" aria-label="Camera" className="inline-flex overflow-hidden rounded-[8px] border border-hairline bg-[#0d1218]">
              {CAMERAS.map((c, i) => {
                const active = drive?.camera === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!drive}
                    onClick={() => onCamera(c.id)}
                    className={`px-3 py-[6px] text-[13px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                      i > 0 ? "border-l border-hairline" : ""
                    } ${active ? "bg-copper/15 text-copper-light" : "text-muted enabled:hover:bg-white/[0.04] enabled:hover:text-ink"}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          {mode === "explore" ? (
            <button type="button" onClick={onOpenSimulate} className="inline-flex items-center gap-1 text-[13px] font-medium text-copper-light hover:underline">
              Simulate mode <Icon name="link" className="h-[13px] w-[13px]" />
            </button>
          ) : null}
        </div>
      )}

      {/* progress */}
      <div className={`min-w-[240px] flex-1 @[1000px]:min-w-[300px] ${compare ? "opacity-60" : ""}`}>
        <div className="flex items-baseline justify-between gap-3 whitespace-nowrap">
          <MicroLabel>
            <span className="hidden @[1000px]:inline">Simulation </span>progress
          </MicroLabel>
          <p className="num text-[14px] text-ink">
            T+ {mmss(progress * period)} <span className="text-muted">/ {mmss(period)}</span>
          </p>
        </div>
        <SeekBar progress={progress} pois={poiFracs} disabled={compare || paxStatus !== "ready"} onSeek={onSeek} />
        <p className="mt-1.5 truncate text-[12px] text-muted" aria-live="polite">
          {drive?.poi ? `Point of interest ${drive.poi} — PAX pauses and looks around` : compare ? "time-lapsed playback" : "Drag to scrub · time-lapsed playback of a pre-authored path"}
        </p>
      </div>
    </div>
  );
}

/** Scrubbable timeline: pointer drag or arrow keys reposition PAX (and the linked profile cursor). */
function SeekBar({ progress, pois, disabled, onSeek }: { progress: number; pois: number[]; disabled: boolean; onSeek: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const fracAt = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return Math.min(0.999, Math.max(0, (clientX - r.left) / r.width));
  };
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Demonstration loop position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onSeek(fracAt(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging.current && !disabled) onSeek(fracAt(e.clientX));
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          onSeek(Math.min(0.999, Math.max(0, progress + (e.key === "ArrowRight" ? 0.02 : -0.02))));
        }
      }}
      className={`relative mt-2 h-[18px] touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-copper/60 rounded-full ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#1f2730]" />
      <div className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-copper/70 to-copper" style={{ width: `${progress * 100}%` }} />
      {pois.map((p, i) => (
        <span
          key={p}
          title={`Point of interest ${i + 1}`}
          className={`absolute top-1/2 h-[12px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${progress >= p ? "bg-[#f3f1ed]" : "bg-[#55606b]"}`}
          style={{ left: `${p * 100}%` }}
          aria-hidden
        />
      ))}
      <div
        className="absolute top-1/2 h-[16px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-copper bg-[#f3f1ed] shadow-[0_0_10px_rgba(198,106,75,0.45)]"
        style={{ left: `${progress * 100}%` }}
        aria-hidden
      />
    </div>
  );
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.6v12.8a1 1 0 001.52.85l10.2-6.4a1 1 0 000-1.7L9.52 4.75A1 1 0 008 5.6z" />
    </svg>
  );
}

function RoundButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-surface-soft text-ink transition-colors duration-200 enabled:hover:border-[#3a4550] enabled:hover:bg-[#1b222b] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

function PlayButton({
  drive,
  paxStatus,
  onStart,
  onPause,
  onResume,
}: {
  drive: DriveState | null;
  paxStatus: TimelinePanelProps["paxStatus"];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const loading = paxStatus === "loading";
  const error = paxStatus === "error";
  const playing = !!drive?.playing;
  const started = !!drive?.started;
  const label = loading ? "Loading PAX…" : error ? "PAX unavailable" : playing ? "Pause" : started ? "Resume" : "Start demonstration loop";
  const onClick = playing ? onPause : started ? onResume : onStart;
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={loading || error}
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-copper bg-copper/15 text-copper-light shadow-[0_0_0_4px_rgba(198,106,75,0.10),0_0_18px_rgba(198,106,75,0.25)] transition-colors duration-200 enabled:hover:bg-copper/25 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-copper/30 border-t-copper motion-reduce:animate-none" aria-hidden />
        ) : playing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" />
            <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" />
          </svg>
        ) : (
          <PlayGlyph className="ml-0.5 h-5 w-5" />
        )}
      </button>
      {loading || error ? (
        <span role="status" className="whitespace-nowrap text-[12px] leading-tight text-muted">
          {loading ? "Loading PAX…" : "PAX unavailable"}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row B — profile chart + stats                                        */
/* ------------------------------------------------------------------ */

function ProfileCard({
  profile,
  cursorFrac,
  onCursor,
  compare,
  onPick,
}: {
  profile: ProfileData | null;
  cursorFrac: number | null;
  onCursor: (f: number | null) => void;
  compare: boolean;
  /** simulate: click the chart to move PAX to that point of the loop */
  onPick?: (f: number) => void;
}) {
  const hover = useRef<number | null>(null);
  const [tab, setTab] = useState<ChartTab>("elevation");
  const series = profile ? (tab === "elevation" ? profile.elevation : profile.slope) : [];
  const hasData = series.some((s) => s.points.length > 1);
  const yTitle = tab === "elevation" ? "Elevation (m)" : `Slope (°) · ${profile?.slopeBaselineM ?? ""} m`;
  return (
    <div className="@container flex min-h-[180px] min-w-0 flex-[3] flex-col rounded-[10px] border border-hairline bg-surface-soft px-4 pb-2 pt-3 shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-[160px] flex-1 items-center gap-2">
          <span className="text-copper">
            <Icon name="profile" className="h-[16px] w-[16px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-semibold uppercase tracking-[0.06em] text-ink">{profile?.title ?? "Terrain profile"}</p>
            {profile?.note ? <p className="truncate text-[12px] text-muted" title={profile.note}>{profile.note}</p> : null}
          </div>
        </div>
        {hasData && series.length > 1 ? (
          <div className="hidden items-center gap-3 text-[12px] text-muted @[620px]:flex">
            {series.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <span className={`h-[3px] w-4 rounded-full ${s.tone === "mars" ? "bg-copper-light" : "bg-earth"}`} aria-hidden />
                {s.label}
              </span>
            ))}
          </div>
        ) : null}
        <PillTabs
          label="Profile series"
          size="sm"
          value={tab}
          onChange={setTab}
          items={[
            { id: "elevation", label: "Terrain profile" },
            { id: "slope", label: "Slope (°)" },
          ]}
        />
      </div>
      <div
        className={`mt-1 min-h-0 flex-1 ${onPick ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (onPick && hover.current !== null) onPick(Math.min(0.999, Math.max(0, hover.current)));
        }}
        title={onPick ? "Click to move PAX to this point of the loop" : undefined}
      >
        {profile && hasData ? (
          <ProfileChart
            series={series}
            unit={tab === "elevation" ? "m" : "°"}
            yTitle={yTitle}
            cursorFrac={cursorFrac}
            onCursor={(f) => {
              hover.current = f;
              onCursor(f);
            }}
          />
        ) : (
          <EmptyChart compare={compare} />
        )}
      </div>
    </div>
  );
}

function EmptyChart({ compare }: { compare: boolean }) {
  return (
    <div className="relative grid h-full min-h-[120px] place-items-center overflow-hidden rounded-[8px] border border-dashed border-hairline bg-[repeating-linear-gradient(0deg,transparent_0_27px,#1a2129_27px_28px)]">
      <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-30" aria-hidden>
        <path d="M0 60 L40 52 L80 58 L120 40 L160 46 L200 30 L240 44 L280 36 L320 50 L360 42 L400 48" fill="none" stroke="#c66a4b" strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
      <div className="relative text-center">
        <p className="font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-ink">No profile loaded</p>
        <p className="mt-1 text-[13px] text-muted">{compare ? "Select an Earth window to draw the Mars and Earth transects." : "The terrain transect appears once the scene heightfield is loaded."}</p>
      </div>
    </div>
  );
}

function StatsBox({ profile }: { profile: ProfileData | null }) {
  const rows = profile?.stats ?? [];
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-hairline bg-surface-soft px-4 py-3 lg:max-w-[340px] lg:min-w-[220px]">
      <MicroLabel>Profile statistics</MicroLabel>
      {rows.length ? (
        <dl className="mt-2 min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-[7px] text-[14px]">
              <dt className="truncate text-muted">{r.label}</dt>
              <dd className="num shrink-0 text-ink">
                {r.value}
                {r.unit ? <span className="ml-1 text-[12px] text-muted">{r.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-[13px] text-muted">Statistics are computed from the loaded profile.</p>
      )}
    </div>
  );
}
