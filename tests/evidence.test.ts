import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Results } from "@/lib/types";
import { analystAnswer, type QId } from "@/components/analyst-panel";

const results = JSON.parse(readFileSync("public/data/results.json", "utf8")) as Results;
const curves = JSON.parse(readFileSync("public/data/w1_curves.json", "utf8")) as {
  max_abs_w1_diff: number;
  levels: number[];
  mars: { q_norm: Record<string, number[]> };
  scenes: Record<string, { w1: Record<string, number>; q_norm: Record<string, number[]> }>;
};
const FEATS = ["F1", "F2", "F3", "F4", "F5"];

describe("w1_curves.json (animated W1 explainer data)", () => {
  it("was exported only after an exact match with the stored run", () => {
    expect(curves.max_abs_w1_diff).toBe(0);
  });
  it("its curves reproduce every published per-feature W1 (to the 5-decimal rounding of the file)", () => {
    for (const s of results.compare_scenes.filter((x) => x.kind !== "mars")) {
      const c = curves.scenes[s.id];
      expect(c, s.id).toBeTruthy();
      for (const k of FEATS) {
        expect(c.w1[k]).toBeCloseTo(s.per_feature_w1![k], 12);
        const m = curves.mars.q_norm[k];
        const e = c.q_norm[k];
        const w1 = e.reduce((a, v, i) => a + Math.abs(v - m[i]), 0) / e.length;
        expect(Math.abs(w1 - s.per_feature_w1![k])).toBeLessThan(2e-5);
      }
    }
  });
});

describe("rule-based research analyst", () => {
  const qs: QId[] = ["why", "differ", "fail", "robust", "next"];
  it("answers every question for every Earth window and cites its sources", () => {
    for (const s of results.compare_scenes.filter((x) => x.kind !== "mars"))
      for (const q of qs) {
        const a = analystAnswer(results, q, s);
        expect(a.lines.length).toBeGreaterThan(0);
        if (q !== "next") expect(a.sources.length).toBeGreaterThan(0);
      }
  });
  it("states the stored percentile and the correctly computed D", () => {
    const g1 = results.compare_scenes.find((x) => x.id === "cmp_g1")!;
    const a = analystAnswer(results, "why", g1).lines.join(" ");
    expect(a).toContain(g1.pct_full!.toFixed(2));
    const D = FEATS.reduce((t, k) => t + g1.per_feature_w1![k], 0) / 5;
    expect(a).toContain(D.toFixed(4));
  });
  it("reports the failed criteria verbatim from results.json", () => {
    const a = analystAnswer(results, "fail", null).lines.join(" ");
    for (const c of results.decision.criteria) expect(a).toContain(c.value);
    expect(results.decision.pass).toBe(false);
  });
});
