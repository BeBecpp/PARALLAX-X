"use client";

import { useEffect, useRef, useState } from "react";
import { FILM_REPO, FILMS, filmPage, filmUrl, type Film } from "@/lib/films";

/**
 * Films & concepts: the team's five AI-generated concept films (Khuslen / V01D-404), always labelled as concept media.
 * Nothing autoplays; video bytes are fetched only after the user presses play (preload="none"), streamed from the
 * creator's original repository. Esc closes; a failed stream falls back to the original GitHub page.
 */
export function FilmGallery({ open, initial = "brand", onClose }: { open: boolean; initial?: string; onClose: () => void }) {
  const [sel, setSel] = useState(initial);
  const [failed, setFailed] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // stop playback whenever the dialog closes or the film changes
  useEffect(() => {
    const v = video.current;
    return () => v?.pause();
  }, [sel, open]);

  if (!open) return null;
  const film: Film = FILMS.find((f) => f.id === sel) ?? FILMS[0];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Films and concepts"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-[min(1180px,100%)] flex-col overflow-hidden rounded-[16px] border border-hairline bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)] outline-none fade-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-copper-light">Films &amp; concepts</p>
            <p className="mt-0.5 font-display text-[20px] font-semibold text-ink">Team concept films by Khuslen (V01D-404)</p>
            <p className="mt-0.5 text-[12px] text-muted">AI-generated creative media. Not footage of this app and not a scientific simulation; the research tool shows real elevation data only.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close films (Escape)" className="shrink-0 rounded-[8px] border border-hairline px-2.5 py-1 text-[13px] text-muted hover:text-ink">
            Close <kbd className="num ml-1 text-[11px]">Esc</kbd>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-4 md:p-5">
            <div className="relative aspect-video w-full overflow-hidden rounded-[12px] border border-hairline bg-black">
              {failed === film.id ? (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div>
                    <p className="text-[15px] text-ink">The film could not be streamed here.</p>
                    <a href={filmPage(film)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[14px] text-copper-light hover:underline">
                      Watch it on the creator&apos;s GitHub ↗
                    </a>
                  </div>
                </div>
              ) : (
                <video
                  key={film.id}
                  ref={video}
                  className="h-full w-full"
                  controls
                  preload="none"
                  playsInline
                  poster={film.poster}
                  src={filmUrl(film)}
                  onError={() => setFailed(film.id)}
                  aria-label={`${film.title}: ${film.label}`}
                />
              )}
              <span className="pointer-events-none absolute left-3 top-3 rounded-[6px] border border-[#E0A66A]/50 bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f3cfa3]">
                AI-generated concept
              </span>
            </div>
            <div className="mt-3">
              <p className="flex flex-wrap items-baseline gap-x-3 font-display text-[18px] font-semibold text-ink">
                <span className="num text-copper-light">Film {film.n}</span> {film.title}
                <span className="num text-[12px] font-normal text-muted">
                  {film.durationS}s · {film.resolution} · sound (press play)
                </span>
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[#f3cfa3]">{film.label}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink/85">{film.summary}</p>
              {film.mismatch ? <p className="mt-1 text-[12px] leading-snug text-muted">Differs from the real app: {film.mismatch}</p> : null}
              <p className="mt-2 text-[12px] text-muted">
                Credit: Khuslen (V01D-404) · original file{" "}
                <a href={filmPage(film)} target="_blank" rel="noreferrer" className="num text-copper-light hover:underline">
                  {film.file}
                </a>{" "}
                · generation and audio tools: to be confirmed by the creator.
              </p>
            </div>
          </div>

          <aside className="border-t border-hairline p-4 lg:border-l lg:border-t-0" aria-label="All films">
            <ul className="space-y-2">
              {FILMS.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSel(f.id)}
                    aria-current={f.id === film.id}
                    className={`flex w-full gap-3 rounded-[10px] border p-2 text-left transition-colors ${f.id === film.id ? "border-copper bg-copper/10" : "border-hairline hover:border-[#3d4a57]"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.poster} alt="" loading="lazy" className="aspect-video w-[104px] shrink-0 rounded-[6px] object-cover" />
                    <span className="min-w-0">
                      <span className="num block text-[11px] text-copper-light">Film {f.n}</span>
                      <span className="block text-[13px] font-semibold leading-tight text-ink">{f.title}</span>
                      <span className="num block text-[11px] text-muted">{f.durationS}s</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <a href={FILM_REPO} target="_blank" rel="noreferrer" className="mt-3 block text-[12px] text-muted hover:text-ink">
              All originals: github.com/V01D-404/All-demo-and-loading ↗
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
