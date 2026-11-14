"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Results, SourceRecord } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks";
import { OverviewSection } from "./section-overview";
import { TerrainSection } from "./section-terrain";
import { CandidatesSection } from "./section-candidates";
import { MethodSection } from "./section-method";
import { ValidationSection } from "./section-validation";
import { SourcesSection } from "./section-sources";

export type AnalysisNav = "overview" | "terrain" | "candidates" | "method" | "validation" | "sources";

export const ANALYSIS_SECTIONS: { id: AnalysisNav; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "terrain", label: "1 · What did we measure?" },
  { id: "method", label: "2 · How did we compare fairly?" },
  { id: "candidates", label: "3 · Where on Earth?" },
  { id: "validation", label: "4 · Does it work?" },
  { id: "sources", label: "5 · Sources & what next" },
];

export interface AnalysisViewProps {
  /** Parsed public/data/results.json. Every number shown is read from here. */
  results: Results;
  /** Parsed public/data/sources.json (null if not published). */
  sources: SourceRecord[] | null;
  /** Called on close button or Escape. Focus returns to the element focused before opening. */
  onClose: () => void;
  /** Section to scroll to on open. Defaults to "overview". */
  initialSection?: AnalysisNav;
  /** When provided, the candidate explorer shows "View in 3D comparison" for the selected item. */
  onCompare?: (compareSceneId: string) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

export function AnalysisView({ results, sources, onClose, initialSection = "overview", onCompare }: AnalysisViewProps) {
  const [active, setActive] = useState<AnalysisNav>(initialSection);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  // Focus management: remember opener, focus close button, restore on unmount. Lock body scroll.
  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Initial section.
  useEffect(() => {
    if (initialSection === "overview") return;
    const el = mainRef.current?.querySelector<HTMLElement>(`#${initialSection}`);
    el?.scrollIntoView({ block: "start" });
  }, [initialSection]);

  // Scroll spy.
  useEffect(() => {
    const root = mainRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id as AnalysisNav);
      },
      { root, rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    ANALYSIS_SECTIONS.forEach((s) => {
      const el = root.querySelector(`#${s.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const go = useCallback(
    (id: AnalysisNav) => {
      setActive(id);
      const el = mainRef.current?.querySelector<HTMLElement>(`#${id}`);
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      const heading = el?.querySelector<HTMLElement>("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    },
    [reduced],
  );

  // Simple focus trap inside the dialog.
  const onTrap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !rootRef.current) return;
    const nodes = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const pass = results.decision.pass;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-title"
      onKeyDown={onTrap}
      className="fixed inset-0 z-50 flex animate-[fade-in_240ms_cubic-bezier(0.22,1,0.36,1)_both] bg-bg text-ink motion-reduce:animate-none"
    >
      {/* Desktop section nav */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-hairline px-5 py-7 md:flex">
        <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted">PARALLAX X</p>
        <h1 id="analysis-title" className="mt-1 font-display text-[24px] font-semibold text-ink">
          Analysis
        </h1>
        <nav aria-label="Analysis sections" className="mt-8">
          <ol className="space-y-1">
            {ANALYSIS_SECTIONS.map((s, i) => {
              const on = s.id === active;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={on ? "location" : undefined}
                    className={`group flex min-h-[42px] w-full items-center gap-3 rounded-[8px] border-l-2 px-3 text-left text-[15px] transition-colors duration-200 motion-reduce:transition-none ${
                      on ? "border-copper bg-surface text-ink" : "border-transparent text-muted hover:bg-surface/60 hover:text-ink"
                    }`}
                  >
                    <span className={`num text-[13px] ${on ? "text-copper-light" : "text-muted/70"}`}>{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-[10px] border border-hairline p-4">
            <p className="text-[13px] uppercase tracking-[0.12em] text-muted">Pre-registered test</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-ink">{pass ? "PASS" : "FAIL"}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">Earth sites are exploratory candidates only.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] w-full items-center justify-center rounded-[8px] border border-hairline text-[15px] text-muted transition-colors duration-200 hover:border-[#3d4a57] hover:text-ink motion-reduce:transition-none"
          >
            Back to terrain
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile header + nav */}
        <div className="border-b border-hairline md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-display text-[20px] font-semibold">Analysis</p>
          </div>
          <nav aria-label="Analysis sections" className="flex gap-1 overflow-x-auto px-3 pb-3">
            {ANALYSIS_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === active ? "location" : undefined}
                className={`min-h-[36px] shrink-0 rounded-[8px] px-3 text-[14px] ${s.id === active ? "bg-surface text-ink shadow-[inset_0_0_0_1px_#c66a4b]" : "text-muted"}`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close analysis (Escape)"
          title="Close (Esc)"
          className="absolute right-3 top-2.5 z-10 inline-flex h-10 items-center gap-2 rounded-[8px] border border-hairline bg-bg/90 px-3 text-[14px] text-muted transition-colors duration-200 hover:border-[#3d4a57] hover:text-ink motion-reduce:transition-none md:right-6 md:top-5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Close</span>
          <kbd className="num hidden rounded border border-hairline px-1 text-[12px] text-muted lg:inline">Esc</kbd>
        </button>

        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain text-[17px]" tabIndex={-1}>
          <div className="mx-auto max-w-[920px] space-y-32 px-5 pb-28 pt-12 md:px-10 md:pt-16">
            <OverviewSection results={results} sources={sources} />
            <TerrainSection results={results} />
            <MethodSection results={results} sources={sources} />
            <CandidatesSection results={results} sources={sources} onCompare={onCompare} />
            <ValidationSection results={results} />
            <SourcesSection sources={sources} />
            <footer className="border-t border-hairline pt-6 text-[14px] text-muted">
              All values are read from results.json and sources.json produced by the pre-registered pipeline. Percentiles are ranks among declared Earth
              windows, not probabilities.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AnalysisView;
