"use client";

import { useEffect, useRef, useState } from "react";
import type { CompareScene, Results } from "@/lib/types";
import { sfx } from "@/lib/audio";

/**
 * Research Analyst — RULE-BASED, not AI. Every sentence is a fixed template filled with numbers read
 * from results.json at runtime, and each answer lists the exact fields it used. No model, no network call,
 * no generated metrics. (A live LLM explainer was intentionally omitted: the site is a static export with
 * no server-side key; see docs/AI_USAGE.md.)
 */

type Answer = { lines: string[]; sources: string[]; caveat?: string };
export type QId = "why" | "differ" | "fail" | "robust" | "next";

const QUESTIONS: { id: QId; q: string }[] = [
  { id: "why", q: "Why did this Earth window rank where it did?" },
  { id: "differ", q: "Which terrain features differ most from Mars?" },
  { id: "fail", q: "Why did the pre-registered validation fail?" },
  { id: "robust", q: "Is the failure robust to window size and DEM?" },
  { id: "next", q: "What would be needed to find a real analog?" },
];

const f1 = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d));
const short = (s: CompareScene) => s.label.split(" — ")[0];

export function analystAnswer(r: Results, id: QId, scene: CompareScene | null): Answer {
  const feats = r.features;
  const name = (k: string) => feats.find((f) => f.id === k)?.name ?? k;
  const unit = (k: string) => feats.find((f) => f.id === k)?.units ?? "";
  const mars = r.mars?.median_raw ?? r.compare_scenes.find((s) => s.kind === "mars")?.median_raw ?? {};
  const nNull = r.null_set.n_windows;
  if ((id === "why" || id === "differ") && (!scene || !scene.per_feature_w1)) {
    return { lines: ["Select an Earth window in Compare first (or pick one below)."], sources: [] };
  }
  switch (id) {
    case "why": {
      const s = scene!;
      const w = Object.entries(s.per_feature_w1!).sort((a, b) => a[1] - b[1]);
      const D = w.reduce((a, [, v]) => a + v, 0) / w.length;
      return {
        lines: [
          `${short(s)} sits at the ${f1(s.pct_full, 2)}th percentile of ${nNull.toLocaleString("en-US")} declared Earth null windows: its fingerprint distance D = ${D.toFixed(4)} is smaller than ${f1(s.pct_full, 2)}% of theirs.`,
          `Closest features (smallest W1): ${w.slice(0, 2).map(([k, v]) => `${name(k)} ${v.toFixed(3)}`).join(", ")}.`,
          `Farthest: ${w.slice(-2).reverse().map(([k, v]) => `${name(k)} ${v.toFixed(3)}`).join(", ")}.`,
          `With the slope-only baseline B0 it would rank at the ${f1(s.pct_b0, 2)}th percentile.`,
        ],
        sources: [`results.json › compare_scenes[${s.id}].pct_full / pct_b0 / per_feature_w1`, "results.json › null_set.n_windows", "docs/METHOD.md (D = mean of five W1)"],
        caveat: s.kind === "candidate" ? "Rank reflects 30 m terrain geometry only. It is not a validated analog, a geological match or a probability." : undefined,
      };
    }
    case "differ": {
      const s = scene!;
      const rows = Object.entries(s.per_feature_w1!).sort((a, b) => b[1] - a[1]);
      return {
        lines: rows.map(([k, v]) => {
          const m = mars[k];
          const e = s.median_raw?.[k];
          return `${name(k)}: W1 ${v.toFixed(3)} · median Mars ${f1(m, 2)} ${unit(k)} vs ${short(s)} ${f1(e, 2)} ${unit(k)}`;
        }),
        sources: [`results.json › compare_scenes[${s.id}].per_feature_w1 / median_raw`, "results.json › mars.median_raw"],
        caveat: "W1 is measured on ECDF-normalised values (0–1); medians are in raw units for orientation only.",
      };
    }
    case "fail": {
      const crit = r.decision.criteria;
      const h = r.hirise;
      const att = r.diagnostics?.ctx_ridge_spectrum?.f2_gradient_attenuation_at;
      const att250 = att ? att["250"] ?? Object.values(att)[0] : undefined;
      return {
        lines: [
          ...crit.map((c) => `Criterion ${c.id} ${c.pass ? "met" : "NOT met"}: ${c.value}.`),
          `Steep (>15°) area on the HiRISE scarps: ${(h.frac_area_slope_gt15_baseline_4m * 100).toFixed(1)}% at a 4 m baseline vs ${(h.frac_area_slope_gt15_baseline_180m * 100).toFixed(1)}% at 180 m — most diagnostic relief is below the 30 m comparison scale.`,
          ...(att250 !== undefined ? [`Post-hoc: the 180 m slope operator keeps only ${(Number(att250) * 100).toFixed(0)}% of the gradient of ~250 m ridges (descriptive, does not change the decision).`] : []),
        ],
        sources: ["results.json › decision.criteria", "results.json › hirise", ...(att250 !== undefined ? ["results.json › diagnostics.ctx_ridge_spectrum (post-hoc)"] : [])],
        caveat: "The decision rule was frozen before results were viewed and has not been re-tuned.",
      };
    }
    case "robust": {
      const s6 = r.sensitivity_6km;
      const g = r.glo30_check;
      return {
        lines: [
          `6 km windows: ${s6 ? (s6.decision_pass ?? s6.pass ? "PASS" : "FAIL") : "not run"}${s6?.criteria?.[0] ? ` — ${s6.criteria[0].value}` : ""}.`,
          `Independent DEM (${g?.dem ?? "GLO-30"}): ${g ? (g.decision_pass ?? g.pass ? "PASS" : "FAIL") : "not run"}${g?.criteria?.[0] ? ` — ${g.criteria[0].value}` : ""}.`,
          ...(g?.spearman_rank_corr_with_nasadem ? [`Window ranks agree between DEMs: Spearman ρ = ${g.spearman_rank_corr_with_nasadem.toFixed(3)} over ${g.n_common_windows?.toLocaleString("en-US") ?? "—"} windows.`] : []),
        ],
        sources: ["results.json › sensitivity_6km", "results.json › glo30_check", "science/DEVIATIONS.md (logged before results)"],
      };
    }
    case "next":
      return {
        lines: [
          "Higher-resolution Earth elevation (≤ 5 m lidar or stereo) to resolve the ~250–480 m ridge spacing and the metre-scale scarps.",
          "Geology and material properties (lithology, induration) — morphology alone cannot separate yardangs from dunes or folded ridges.",
          "Wind regime data and field validation at the exploratory Gobi candidates before calling any of them an analog.",
          ...r.run.caveats.slice(0, 2),
        ],
        sources: ["results.json › run.caveats", "docs/LIMITATIONS.md"],
        caveat: "Recommendations are team-authored research next steps, not computed results.",
      };
  }
}

export function AnalystPanel({ results, selectedSceneId, onClose }: { results: Results; selectedSceneId: string | null; onClose: () => void }) {
  const earth = results.compare_scenes.filter((s) => s.kind !== "mars");
  const [sceneId, setSceneId] = useState<string>(selectedSceneId ?? earth[0]?.id ?? "");
  const [q, setQ] = useState<QId>("why");
  const ref = useRef<HTMLDivElement>(null);
  const scene = earth.find((s) => s.id === sceneId) ?? null;
  const a = analystAnswer(results, q, scene);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label="Research analyst (rule-based)"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[min(560px,100%)] flex-col border-l border-hairline bg-surface shadow-[-20px_0_60px_rgba(0,0,0,0.5)] outline-none slide-in-right"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <p className="font-display text-[20px] font-semibold uppercase tracking-[0.03em] text-ink">Research analyst</p>
            <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-hairline px-2.5 py-0.5 text-[12px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-earth" aria-hidden="true" /> Rule-based · deterministic templates over results.json · not an AI model
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close analyst (Escape)" className="rounded-[8px] border border-hairline px-2.5 py-1 text-[13px] text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
            Earth window
            <select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="mt-1.5 block w-full rounded-[8px] border border-hairline bg-bg px-3 py-2 text-[14px] normal-case tracking-normal text-ink">
              {earth.map((s) => (
                <option key={s.id} value={s.id}>
                  {short(s)} · {s.kind} · {f1(s.pct_full, 2)} pct
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-col gap-2">
            {QUESTIONS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  sfx("click");
                  setQ(x.id);
                }}
                className={`rounded-[10px] border px-3 py-2 text-left text-[14px] transition-colors ${q === x.id ? "border-copper bg-copper/10 text-ink" : "border-hairline bg-bg/50 text-ink/85 hover:border-[#3d4a57]"}`}
              >
                {x.q}
              </button>
            ))}
          </div>
          <div key={`${q}-${sceneId}`} className="mt-5 rounded-[12px] border border-hairline bg-bg/60 p-4 fade-in">
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-ink/90">
              {a.lines.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-copper" aria-hidden="true" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            {a.caveat ? <p className="mt-3 rounded-[8px] border border-[#E0A66A]/40 bg-[#E0A66A]/10 px-3 py-2 text-[13px] text-[#f0c99a]">{a.caveat}</p> : null}
            {a.sources.length ? (
              <div className="mt-3 border-t border-hairline pt-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Grounded in</p>
                <ul className="mt-1 space-y-0.5">
                  {a.sources.map((s) => (
                    <li key={s} className="num text-[12px] text-ink/70">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
