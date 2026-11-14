"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audio, type AudioState } from "@/lib/audio";

export function useAudioState(): AudioState {
  return useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getServerSnapshot);
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      {on ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="m16 9.5 5 5m0-5-5 5" />
      )}
    </svg>
  );
}

/**
 * Global sound toggle. Sound is OFF until the user turns it on (no autoplay); "M" mutes/unmutes.
 * All sounds are synthesized in the browser — see docs/AUDIO_CREDITS.md.
 */
export function SoundControl({ compact = false }: { compact?: boolean }) {
  const st = useAudioState();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "m" || e.key === "M") {
        audio.toggle();
        e.preventDefault();
      } else if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  if (!st.supported) return null;
  return (
    <div ref={box} className="relative">
      <div className={`flex items-center overflow-hidden rounded-[10px] border ${st.enabled ? "border-copper/70 bg-copper/10" : "border-hairline bg-surface/60"}`}>
        <button
          type="button"
          onClick={() => audio.toggle()}
          aria-pressed={st.enabled}
          aria-label={st.enabled ? "Mute sound (M)" : "Enable sound (M)"}
          title={st.enabled ? "Sound on — click or press M to mute" : "Sound off — click or press M to enable"}
          className={`flex min-h-[40px] items-center gap-2 px-3 text-[13px] font-semibold uppercase tracking-[0.08em] ${st.enabled ? "text-copper-light" : "text-ink/85 hover:text-ink"}`}
        >
          <SpeakerIcon on={st.enabled} />
          {compact ? null : <span className="hidden 2xl:inline">{st.enabled ? "Sound on" : "Enable sound"}</span>}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Sound settings"
          className="min-h-[40px] border-l border-hairline px-2 text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open ? (
        <div role="dialog" aria-label="Sound settings" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-[12px] border border-hairline bg-surface p-4 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-ink">Sound</p>
            <button type="button" onClick={() => audio.toggle()} className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${st.enabled ? "border-copper text-copper-light" : "border-hairline text-muted"}`}>
              {st.enabled ? "On" : "Off"}
            </button>
          </div>
          <label className="mt-4 block text-[13px] text-muted">
            Volume <span className="num text-ink/80">{Math.round(st.volume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(st.volume * 100)}
              onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
              className="mt-2 w-full accent-[#C66A4B]"
              aria-label="Volume"
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-[13px] text-ink/90">
            <span>
              Wind bed <span className="text-muted">(synthesized, very low)</span>
            </span>
            <input type="checkbox" checked={st.ambient} onChange={(e) => audio.setAmbient(e.target.checked)} className="h-4 w-4 accent-[#C66A4B]" />
          </label>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            All sounds are generated live in your browser (Web Audio). None are recordings, and none come from Mars or from our study sites. Press <kbd className="rounded border border-hairline px-1">M</kbd> to mute.
          </p>
          {st.error ? <p className="mt-2 text-[12px] text-copper-light">Audio unavailable: {st.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
