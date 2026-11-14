import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { FieldTest } from "@/lib/data";
import type { Results } from "@/lib/types";
import { buildDossier, dossierToMarkdown, EXPERIMENTS, terrainEvidence, whyThisLocation } from "@/lib/expedition";

const r = JSON.parse(readFileSync("public/data/results.json", "utf8")) as Results;
const ft = JSON.parse(readFileSync("public/data/fieldtest.json", "utf8")) as FieldTest;

describe("pre-registered results are untouched", () => {
  it("keeps the FAILED verdict and its headline numbers", () => {
    expect(r.decision.pass).toBe(false);
    expect(r.null_set.n_windows).toBe(1915);
    expect(r.features.map((f) => f.id)).toEqual(["F1", "F2", "F3", "F4", "F5"]);
    expect(r.decision.mean_pos_full?.toFixed(1)).toBe("55.9");
    expect(r.decision.mean_pos_b0?.toFixed(1)).toBe("63.0");
    const med = Object.fromEntries(r.sites.map((s) => [s.id, s.median_pct_full?.toFixed(1)]));
    expect(med).toMatchObject({ P1: "64.6", P2: "17.4", P3: "85.7", N1: "85.1", N2: "45.4" });
    expect(r.candidates.map((c) => c.id)).toEqual(["G-1", "G-2", "G-3", "G-4", "G-5"]);
  });
  it("post-hoc file declares itself descriptive and covers every candidate", () => {
    expect(ft.status).toMatch(/POST-HOC DESCRIPTIVE/);
    for (const c of r.candidates) {
      expect(ft.roughness.candidate_clusters[c.id]).toBeDefined();
      expect(ft.worldcover.candidates[c.id].footprint.n_windows).toBe(c.n_windows);
    }
  });
});

describe("Expedition Lab dossiers", () => {
  it("builds a complete 10-part dossier for every candidate and experiment", () => {
    for (const c of r.candidates) {
      for (const e of EXPERIMENTS) {
        const d = buildDossier(r, ft, c.id, e.id)!;
        expect(d.candidate.id).toBe(c.id);
        expect(d.objective.length).toBeGreaterThan(20);
        expect(d.hypothesis.length).toBeGreaterThan(20);
        for (const k of ["evidence", "instruments", "procedure", "variables", "criteria", "limitations", "citations"] as const) expect(d[k].length).toBeGreaterThan(0);
        const md = dossierToMarkdown(d);
        for (let i = 1; i <= 10; i++) expect(md).toContain(`## ${i}.`);
        expect(md).toContain("No field test has been performed");
      }
    }
  });

  it("never fabricates performance values: every field variable is unmeasured", () => {
    for (const e of EXPERIMENTS) {
      const d = buildDossier(r, ft, "G-1", e.id)!;
      for (const v of d.variables) expect(["not measured", "to be planned"]).toContain(v.status);
    }
    const mob = buildDossier(r, ft, "G-1", "mobility")!;
    const byLabel = Object.fromEntries(mob.evidence.map((x) => [x.label, x]));
    expect(byLabel["Traction"]).toMatchObject({ value: "Not measured", cls: "not-measured" });
    expect(byLabel["Wheel sinkage"]).toMatchObject({ value: "Not measured", cls: "not-measured" });
    expect(byLabel["Rover mobility"]).toMatchObject({ value: "Requires physical testing", cls: "field-required" });
    const th = buildDossier(r, ft, "G-1", "thermal")!;
    expect(th.evidence.find((x) => /Battery/.test(x.label))?.cls).toBe("field-required");
  });

  it("quotes measured values exactly from the source files", () => {
    const ev = terrainEvidence(r, ft, "G-1");
    const scene = r.compare_scenes.find((s) => s.id === "cmp_g1")!;
    expect(ev.find((x) => x.label.startsWith("Fingerprint"))!.value).toContain(scene.pct_full!.toFixed(2));
    expect(ev.find((x) => x.label.startsWith("Detrended RMS"))!.value).toContain(ft.roughness.candidate_clusters["G-1"]["330m"].median_m!.toFixed(2));
    expect(ev.find((x) => x.label.startsWith("Detrended RMS"))!.cls).toBe("derived");
    expect(ev.find((x) => x.label.startsWith("Surface cover"))!.cls).toBe("contextual");
  });

  it("works without the post-hoc file (no derived/contextual layers, nothing invented)", () => {
    const d = buildDossier(r, null, "G-2", "mobility")!;
    expect(d.evidence.some((x) => x.label.startsWith("Detrended RMS"))).toBe(false);
    expect(d.evidence.some((x) => x.label.startsWith("Surface cover"))).toBe(false);
  });

  it("'Why this location' lists the three closest measured features and keeps unknowns open", () => {
    const w = whyThisLocation(r, "G-1");
    const w1 = Object.values(r.compare_scenes.find((s) => s.id === "cmp_g1")!.per_feature_w1!).sort((a, b) => a - b);
    expect(w.matches.map((m) => Number(m.value.match(/W1 = ([\d.]+)/)![1]))).toEqual(w1.slice(0, 3).map((v) => Number(v.toFixed(3))));
    expect(w.uncertain.every((u) => u.cls !== "measured")).toBe(true);
  });

  it("wheel mobility lists the six open physical properties and leaves thresholds TO BE DEFINED", () => {
    const d = buildDossier(r, ft, "G-3", "mobility")!;
    expect(d.unknowns).toEqual(["Wheel traction", "Soil bearing strength", "Wheel sinkage", "Soil shear strength", "Rock and obstacle distribution at wheel scale", "Mobility safety"]);
    expect(d.criteria.some((c) => /TO BE DEFINED/.test(c))).toBe(true);
    expect(d.formulas.map((f) => f.name)).toEqual(["Wheel slip ratio", "Energy per distance", "Wheel sinkage"]);
    for (const f of d.formulas) expect(f.note).toMatch(/Not (computed|measured)/);
    expect(d.candidate).toMatchObject({ id: "G-3", sceneId: "cmp_g3" });
    expect(d.impact).toMatch(/Real wheel–soil measurements are required/);
  });

  it("candidate and experiment are carried through and plans do not modify results", () => {
    const before = JSON.stringify(r);
    for (const c of r.candidates) for (const e of EXPERIMENTS) expect(buildDossier(r, ft, c.id, e.id)).toMatchObject({ experiment: e.id, candidate: { id: c.id } });
    expect(JSON.stringify(r)).toBe(before);
  });

  it("returns null for an unknown candidate", () => {
    expect(buildDossier(r, ft, "G-9", "mobility")).toBeNull();
  });
});
