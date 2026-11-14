"use client";

import { useEffect, useState } from "react";

export interface DemoCaption {
  i: number;
  n: number;
  title: string;
  body: string;
  /** performance.now() when this caption appeared */
  t0: number;
  /** demo length (ms) and the start of this caption within it (ms) */
  total: number;
  start: number;
}

/** Caption bar for the scripted guided demo. Escape or "Skip" ends it at once. */
export function DemoOverlay({ caption, onSkip }: { caption: DemoCaption; onSkip: () => void }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => {
      cancelAnimationFrame(id);
      setGrown(false);
    };
  }, [caption.i]);
  const from = caption.start / caption.total;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div key={caption.i} className="pointer-events-auto w-[min(820px,100%)] overflow-hidden rounded-[14px] border border-copper/50 bg-bg/90 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(232,120,61,0.15)] backdrop-blur fade-in">
        <div className="flex items-start gap-4 px-5 py-4">
          <span className="num mt-1 shrink-0 rounded-full border border-copper/60 px-2.5 py-0.5 text-[12px] font-semibold text-copper-light">
            {caption.i}/{caption.n}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[20px] font-semibold leading-tight text-ink">{caption.title}</p>
            <p className="mt-1 text-[15px] leading-snug text-ink/80">{caption.body}</p>
          </div>
          <button type="button" onClick={onSkip} className="shrink-0 rounded-[8px] border border-hairline px-3 py-1.5 text-[13px] font-semibold text-muted hover:border-copper hover:text-ink">
            Skip demo <span className="text-[11px] opacity-70">Esc</span>
          </button>
        </div>
        <div className="h-[3px] bg-[#1f2730]">
          <div
            className="h-full bg-copper"
            style={{
              width: `${(grown ? 1 : from) * 100}%`,
              transition: grown ? `width ${Math.max(0, caption.total - caption.start)}ms linear` : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
