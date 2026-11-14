"use client";

import { Wordmark } from "./wordmark";

export interface LoadStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "done" | "skipped" | "error";
  progress?: number | null; // 0..1 when known
}

const POSTER = "/models/pax-rover-poster.webp";

/** Activity label for the step that is actually running. Never claims work that is not happening. */
const ACTIVITY: Record<string, string> = {
  fetch: "Downloading Mars elevation",
  mesh: "Preparing elevation geometry",
  results: "Loading Earth comparison results",
};

function StatusMark({ status }: { status: LoadStep["status"] }) {
  if (status === "done")
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M4 9.5 7.5 13 14 5.5" fill="none" stroke="#DF9070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "active")
    return (
      <span className="relative flex h-[18px] w-[18px] items-center justify-center" aria-hidden="true">
        <span className="h-[8px] w-[8px] rounded-full bg-copper pulse-soft" />
      </span>
    );
  if (status === "error")
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M5 5l8 8M13 5l-8 8" fill="none" stroke="#F3F1ED" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  return <span className="flex h-[18px] w-[18px] items-center justify-center" aria-hidden="true"><span className="h-[6px] w-[6px] rounded-full border border-muted/70" /></span>;
}

export function LoadingView({
  steps,
  showSteps,
  error,
  onRetry,
  onStatic,
}: {
  steps: LoadStep[];
  showSteps: boolean;
  error: string | null;
  onRetry: () => void;
  onStatic: () => void;
}) {
  const active = steps.find((s) => s.status === "active");
  const doneCount = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  // Overall bar: completed steps + the real fractional progress of the active one (if the server reports a size).
  const frac = steps.length ? (doneCount + (active && typeof active.progress === "number" ? active.progress : 0)) / steps.length : 0;
  const headline = error ? "Couldn’t load the terrain file." : active ? (ACTIVITY[active.id] ?? active.label) : "Preparing terrain";

  return (
    <div className="flex min-h-screen flex-col fade-in">
      <header className="mx-auto flex h-[64px] w-full max-w-[1360px] items-center px-6 md:h-[72px] md:px-10">
        <Wordmark height={28} />
      </header>
      <div className="mx-auto w-full max-w-[1360px] px-6 md:px-10">
        <div className="h-px w-full bg-hairline" />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[560px]">
          <div className="flex items-center gap-5">
            {/* Poster, not a second WebGL context, while the terrain mesh is being built */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={POSTER}
              alt=""
              width={128}
              height={96}
              className={`h-[96px] w-[128px] shrink-0 object-contain ${error ? "opacity-60 grayscale" : "pax-tilt"}`}
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 60%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 60%, transparent 100%)",
              }}
              draggable={false}
            />
            <div className="min-w-0">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted">
                {error ? "Load failed" : "Medusae Fossae · HiRISE layered scarps"}
              </p>
              <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[28px]" aria-live="polite">
                {headline}
              </h1>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[12px] border border-hairline bg-surface p-5" role="alert">
              <p className="num break-words text-[14px] text-muted">{error}</p>
              <p className="mt-3 text-[15px] text-ink">Check the connection and retry, or open the static version (no 3D).</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-[48px] items-center rounded-[10px] bg-copper px-5 text-[16px] font-semibold text-white transition-colors hover:bg-[#B45D40]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onStatic}
                  className="inline-flex min-h-[48px] items-center rounded-[10px] border border-hairline bg-surface-soft px-5 text-[16px] font-medium text-ink transition-colors hover:border-[#3d4a57]"
                >
                  View static version
                </button>
              </div>
            </div>
          ) : showSteps ? (
            <>
              <div
                className="mt-7 h-[3px] w-full overflow-hidden rounded-full bg-hairline"
                role="progressbar"
                aria-label="Terrain loading progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(frac * 100)}
              >
                <div className="h-full rounded-full bg-copper transition-[width] duration-200 ease-out" style={{ width: `${Math.max(2, Math.round(frac * 100))}%` }} />
              </div>
              <ol className="mt-6 divide-y divide-hairline border-y border-hairline">
                {steps.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 py-3">
                    <span className="mt-[2px]">
                      <StatusMark status={s.status} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className={`text-[16px] ${s.status === "pending" ? "text-muted" : "text-ink"}`}>{s.label}</span>
                        <span className="num shrink-0 text-[13px] text-muted">
                          {s.status === "active" && typeof s.progress === "number"
                            ? `${Math.round(s.progress * 100)}%`
                            : s.status === "done"
                              ? "done"
                              : s.status === "skipped"
                                ? "skipped"
                                : s.status === "error"
                                  ? "failed"
                                  : ""}
                        </span>
                      </div>
                      <p className="num mt-0.5 break-all text-[13px] leading-snug text-muted">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
