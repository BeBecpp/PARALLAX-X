"use client";

import type { Loadable } from "@/lib/data";
import type { CompareScene, Results } from "@/lib/types";
import { formatCoord, rankLabel, rankPhrase } from "@/lib/format";
import { NotAvailable } from "./ui";

export const LABEL_CANDIDATE = "morphometric candidate — not described as a Mars analog in literature we searched";
export const LABEL_POSITIVE = "published yardang analog (control)";
export const LABEL_NEGATIVE = "process-different control";

export interface CompareItem {
  key: string;
  name: string;
  kind: "candidate" | "positive" | "negative";
  centroid: [number, number] | null;
  pct: number | null;
  secondary: string | null;
  scene: CompareScene | null;
  citation?: string;
  note?: string;
  /** Descriptive label from results.json (candidates); falls back to the role label. */
  label?: string;
}

/** "Gobi G-1 — morphometric candidate (…)" -> "Gobi G-1" */
function shortName(sceneLabel: string | undefined, fallback: string): string {
  if (!sceneLabel) return fallback;
  return sceneLabel.split(" — ")[0] || fallback;
}

/** Build the list of selectable Earth comparison items from results.json. */
export function compareItems(r: Results): CompareItem[] {
  const scenes = new Map(r.compare_scenes.map((s) => [s.id, s]));
  const bySite = new Map(r.compare_scenes.filter((s) => s.site_id).map((s) => [s.site_id as string, s]));
  const items: CompareItem[] = r.candidates.map((c) => ({
    key: `cand:${c.id}`,
    name: shortName(scenes.get(c.compare_scene_id)?.label, c.id),
    label: c.label,
    kind: "candidate",
    // coordinates of the window actually shown (falls back to the cluster centroid)
    centroid: scenes.get(c.compare_scene_id)?.centroid ?? c.centroid,
    pct: c.best_pct,
    secondary: `median window ${rankPhrase(c.median_pct)} · ${c.n_windows} windows`,
    scene: scenes.get(c.compare_scene_id) ?? null,
  }));
  const sites = [...r.sites].sort((a, b) => (a.role === b.role ? 0 : a.role === "positive" ? -1 : 1));
  for (const s of sites) {
    const scene = bySite.get(s.id) ?? null;
    items.push({
      key: `site:${s.id}`,
      name: s.name,
      kind: s.role,
      centroid: scene?.centroid ?? null,
      pct: s.median_pct_full,
      secondary: s.median_pct_b0 !== null ? `baseline B0: ${rankPhrase(s.median_pct_b0)} · ${s.n_windows} windows` : `${s.n_windows} windows`,
      scene,
      citation: s.citation,
      note: s.note,
    });
  }
  return items;
}

function Item({ it, selected, onSelect }: { it: CompareItem; selected: boolean; onSelect: () => void }) {
  const label = it.kind === "candidate" ? (it.label ?? LABEL_CANDIDATE) : it.kind === "positive" ? LABEL_POSITIVE : LABEL_NEGATIVE;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={!it.scene}
        aria-pressed={selected}
        className={`w-full rounded-[8px] border p-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
          selected ? "border-copper bg-[#1f2b37]" : "border-hairline bg-surface hover:border-[#3d4a57]"
        }`}
      >
        <div className="text-[15px] font-medium text-ink">{it.name}</div>
        <div className="mt-1 text-[14px] text-ink">{rankLabel(it.pct)}</div>
        {it.secondary ? <div className="num text-[14px] text-muted">{it.secondary}</div> : null}
        {it.centroid ? <div className="num text-[14px] text-muted">{formatCoord(it.centroid, "Earth")}</div> : null}
        <div className="mt-2 text-[14px] leading-snug text-muted">{label}</div>
        {it.citation ? <div className="mt-1 text-[14px] leading-snug text-muted">Ref: {it.citation}</div> : null}
        {it.note ? <div className="mt-1 text-[14px] leading-snug text-muted">Note: {it.note}</div> : null}
        {!it.scene ? <div className="mt-1 text-[14px] text-muted">No comparison scene published for this item.</div> : null}
      </button>
    </li>
  );
}

export function CompareSheet({
  results,
  selectedKey,
  onSelect,
  onClose,
}: {
  results: Loadable<Results>;
  selectedKey: string | null;
  onSelect: (it: CompareItem) => void;
  onClose: () => void;
}) {
  const r = results.status === "ready" ? results.data : null;
  const items = r ? compareItems(r) : [];
  const cands = items.filter((i) => i.kind === "candidate");
  const refs = items.filter((i) => i.kind !== "candidate");
  return (
    <aside aria-label="Earth comparison" className="flex h-full flex-col border-l border-hairline bg-bg">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <h2 className="font-display text-[19px] font-semibold">Earth terrain, same scale</h2>
          {r ? (
            <p className="mt-1 text-[14px] text-muted">
              Ranked among <span className="num">{r.null_set.n_windows}</span> Earth windows. A rank is not a probability or a &ldquo;% match&rdquo;.
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="min-h-[36px] rounded-[8px] px-2 text-[15px] text-muted hover:text-ink" aria-label="Close comparison list">
          Close
        </button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {!r ? (
          <NotAvailable what="Earth comparison results" detail="results.json has not been published by the science pipeline yet, so no Earth candidates or reference sites can be listed." />
        ) : (
          <>
            {!r.decision.pass ? (
              <p className="rounded-[8px] border border-hairline bg-surface px-3 py-2 text-[14px] leading-snug text-ink" role="note">
                Validation failed: published yardang sites did not rank highly — candidates are exploratory.{" "}
                <span className="text-muted">See Evidence › Result.</span>
              </p>
            ) : null}
            <section>
              <h3 className="mb-2 text-[14px] uppercase tracking-[0.1em] text-muted">Morphometric candidates</h3>
              {cands.length ? (
                <ul className="space-y-2">
                  {cands.map((it) => (
                    <Item key={it.key} it={it} selected={selectedKey === it.key} onSelect={() => onSelect(it)} />
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-muted">No candidates in this run.</p>
              )}
            </section>
            <section>
              <h3 className="mb-2 text-[14px] uppercase tracking-[0.1em] text-muted">Reference sites (controls)</h3>
              <ul className="space-y-2">
                {refs.map((it) => (
                  <Item key={it.key} it={it} selected={selectedKey === it.key} onSelect={() => onSelect(it)} />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
