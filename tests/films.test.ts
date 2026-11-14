import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_FILM, FILMS, filmPage, filmUrl } from "@/lib/films";

describe("concept films", () => {
  it("lists all five Khuslen films, brand film first", () => {
    expect(FILMS.map((f) => f.n).sort()).toEqual(["01", "02", "03", "04", "05"]);
    expect(BRAND_FILM.n).toBe("05");
    expect(new Set(FILMS.map((f) => f.file)).size).toBe(5);
  });
  it("labels every film as AI-generated and ships its poster", () => {
    for (const f of FILMS) {
      expect(f.label).toMatch(/AI-generated/);
      expect(existsSync(`public${f.poster}`)).toBe(true);
      expect(filmUrl(f)).toMatch(/^https:\/\/raw\.githubusercontent\.com\/V01D-404\/All-demo-and-loading\/main\//);
      expect(filmPage(f)).toMatch(/^https:\/\/github\.com\/V01D-404\/All-demo-and-loading\/blob\/main\//);
    }
    expect(FILMS.find((f) => f.n === "04")!.mismatch).toMatch(/Jezero/);
  });
  it("never autoplays and fetches no video until play", () => {
    const src = readFileSync("components/film-gallery.tsx", "utf8");
    expect(src).toContain('preload="none"');
    expect(src).not.toMatch(/autoPlay/);
  });
  it("film bytes are not copied into the repository", () => {
    for (const f of FILMS) expect(existsSync(`public/media/films/${f.file}`)).toBe(false);
  });
});
