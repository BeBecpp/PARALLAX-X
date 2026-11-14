"use client";

import { useEffect, useRef } from "react";
import { AboutText, Credits, REPO_URL } from "./site-footer";
import { AI_USE_TEXT } from "./evidence-drawer";

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090C11]/80 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Research and methods"
        className="fade-in max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[12px] border border-hairline bg-surface p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-copper-light">Research / Methods</p>
            <h2 className="mt-1 font-display text-[26px] font-semibold tracking-[-0.01em]">About PARALLAX X</h2>
          </div>
          <button ref={ref} type="button" onClick={onClose} className="min-h-[44px] rounded-[8px] border border-hairline px-4 text-[15px] text-muted hover:text-ink">
            Close
          </button>
        </div>
        <div className="mt-4">
          <AboutText />
        </div>
        <h3 className="mt-6 text-[15px] font-medium">Data credits</h3>
        <div className="mt-2">
          <Credits />
        </div>
        <h3 className="mt-6 text-[15px] font-medium">AI use</h3>
        <p className="mt-2 text-[14px] text-muted">{AI_USE_TEXT}</p>
        <p className="mt-6 text-[14px] text-muted">
          Code:{" "}
          <a className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-copper" href={REPO_URL} target="_blank" rel="noreferrer">
            {REPO_URL.replace("https://", "")}
          </a>
        </p>
        <p className="mt-2 text-[14px] text-muted">NASA Space Apps 2026 project. Not affiliated with or endorsed by NASA.</p>
      </div>
    </div>
  );
}
