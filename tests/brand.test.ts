import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appIconSvg, BRAND, LOGO, logoSvg, markSvg, wordLayout } from "@/lib/brand";

// One logo system: every static brand file must be byte-identical to what lib/brand.ts generates
// (regenerate with `node scripts/build-brand.mts`).
describe("brand system", () => {
  it("static brand files are generated from the single geometry source", () => {
    expect(readFileSync("public/brand/parallax-x-wordmark.svg", "utf8").trim()).toBe(logoSvg());
    expect(readFileSync("public/brand/parallax-x-mark.svg", "utf8").trim()).toBe(markSvg());
    expect(readFileSync("public/brand/parallax-x-app-icon.svg", "utf8").trim()).toBe(appIconSvg());
    expect(readFileSync("app/icon.svg", "utf8").trim()).toBe(appIconSvg());
  });

  it("wordmark spells PARALLAX and the signature X sits after it", () => {
    const { glyphs, width } = wordLayout();
    expect(glyphs.map((g) => g.ch).join("")).toBe("PARALLAX");
    expect(LOGO.sigX).toBeGreaterThan(width);
    for (let i = 1; i < glyphs.length; i++) expect(glyphs[i].x).toBeGreaterThan(glyphs[i - 1].x);
  });

  it("uses only the brand palette (no stray colours)", () => {
    const allowed = new Set([...Object.values(BRAND), "#FFD2B0", "#FFE3CC", "#FFF1E4"].map((c) => c.toUpperCase()));
    for (const svg of [logoSvg(), markSvg(), appIconSvg()]) {
      for (const c of svg.match(/#[0-9A-Fa-f]{6}/g) ?? []) expect(allowed.has(c.toUpperCase())).toBe(true);
    }
  });
});
