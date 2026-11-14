import { describe, expect, it } from "vitest";
import { formatCoord, formatPosting, fracToPercent, niceScaleBar, rankLabel, rankPhrase } from "../lib/format";

describe("percentile rank labels", () => {
  it("derives 'top N%' from a percentile, rounding up so ranks are never overstated", () => {
    expect(rankPhrase(96)).toBe("top 4%");
    expect(rankPhrase(96.8)).toBe("top 4%");
    expect(rankPhrase(96.2)).toBe("top 4%");
    expect(rankPhrase(90)).toBe("top 10%");
    expect(rankPhrase(99.5)).toBe("top 0.5%");
    expect(rankPhrase(99.97)).toBe("top 0.1%");
    expect(rankPhrase(100)).toBe("top 0.1%");
  });

  it("uses 'bottom N%' for low percentiles (controls expected to rank low)", () => {
    expect(rankPhrase(12)).toBe("bottom 12%");
    expect(rankPhrase(0)).toBe("bottom 0.1%");
  });

  it("handles missing values honestly", () => {
    expect(rankPhrase(null)).toBe("not ranked");
    expect(rankLabel(undefined)).toBe("not ranked against Earth windows");
  });

  it("builds the full sentence", () => {
    expect(rankLabel(97)).toBe("ranks in the top 3% of Earth windows");
  });
});

describe("number formatting", () => {
  it("formats fractions as percentages", () => {
    expect(fracToPercent(0.13891)).toBe("13.9%");
    expect(fracToPercent(0)).toBe("0.0%");
    expect(fracToPercent(0.0004)).toBe("<0.1%");
    expect(fracToPercent(null)).toBe("—");
  });

  it("formats postings", () => {
    expect(formatPosting(1.0108370780499)).toBe("1.01 m");
    expect(formatPosting(3.0325112341497)).toBe("3.0 m");
    expect(formatPosting(30.325)).toBe("30 m");
  });

  it("formats coordinates per planet convention", () => {
    expect(formatCoord([103.5, 43.25], "Earth")).toBe("43.25°N 103.50°E");
    expect(formatCoord([-70.1, -24], "Earth")).toBe("24.00°S 70.10°W");
    expect(formatCoord([178.08, -12.5], "Mars")).toBe("12.50°S 178.08°E");
  });

  it("picks nice scale-bar lengths", () => {
    const b = niceScaleBar(10, 140); // 1400 m max -> 1 km
    expect(b.metres).toBe(1000);
    expect(b.px).toBe(100);
    expect(b.label).toBe("1 km");
    expect(niceScaleBar(1, 140).label).toBe("100 m");
    expect(niceScaleBar(0.3, 140).metres).toBe(20);
  });
});
