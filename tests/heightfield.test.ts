import { describe, expect, it } from "vitest";
import { decodeHeightfield, rawToElevation, sampleBilinear } from "../lib/heightfield";
import { buildMeshArrays, chooseStride, classifySlope, computeSlopeDeg, strideIndices } from "../lib/terrain-compute";
import type { HeightfieldMeta } from "../lib/types";

function meta(width: number, height: number, zMin: number, zMax: number, posting = 1): HeightfieldMeta {
  return {
    id: "test",
    file: "/x.bin",
    width,
    height,
    posting_m: posting,
    extent_m: [width * posting, height * posting],
    z_min_m: zMin,
    z_max_m: zMax,
    encoding: "uint16 LE",
    valid_fraction: 1,
    sha256: "",
    planet: "Mars",
    source_id: "TEST",
    source_url: "",
    provider: "test",
    crs: "",
    vertical_datum: "",
    terrain_description: "",
    display_note: "",
    vertical_exaggeration_default: 2,
  };
}

function encode(values: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(values.length * 2);
  const dv = new DataView(buf);
  values.forEach((v, i) => dv.setUint16(i * 2, v, true));
  return buf;
}

describe("decodeHeightfield", () => {
  it("decodes uint16 LE per the contract formula, relative to z_min", () => {
    const m = meta(2, 2, -2000, -1800);
    const hf = decodeHeightfield(encode([1, 65535, 32768, 0]), m);
    expect(hf.heights[0]).toBeCloseTo(0, 6); // v=1 -> z_min
    expect(hf.heights[1]).toBeCloseTo(200, 3); // v=65535 -> z_max
    expect(hf.heights[2]).toBeCloseTo(((32768 - 1) / 65534) * 200, 3);
    expect(Number.isNaN(hf.heights[3])).toBe(true); // 0 = no data
    expect(hf.minRel).toBeCloseTo(0, 6);
    expect(hf.maxRel).toBeCloseTo(200, 3);
  });

  it("is little-endian (byte order matters)", () => {
    const m = meta(1, 1, 0, 65534);
    const buf = new Uint8Array([0x02, 0x01]).buffer; // LE 0x0102 = 258
    const hf = decodeHeightfield(buf, m);
    expect(hf.heights[0]).toBeCloseTo(257, 6);
  });

  it("rejects truncated buffers", () => {
    expect(() => decodeHeightfield(new ArrayBuffer(4), meta(3, 3, 0, 1))).toThrow();
  });

  it("rawToElevation gives absolute metres and null for no-data", () => {
    const m = { z_min_m: -1977.4, z_max_m: -1815.1 };
    expect(rawToElevation(0, m)).toBeNull();
    expect(rawToElevation(1, m)).toBeCloseTo(-1977.4, 6);
    expect(rawToElevation(65535, m)).toBeCloseTo(-1815.1, 6);
  });

  it("bilinear sampling interpolates between cells", () => {
    const hf = decodeHeightfield(encode([1, 3, 5, 7]), meta(2, 2, 0, 65534));
    expect(sampleBilinear(hf, 0.5, 0.5)).toBeCloseTo((0 + 2 + 4 + 6) / 4, 6);
  });
});

describe("terrain geometry helpers", () => {
  it("stride indices always include the last sample", () => {
    expect(strideIndices(5, 2)).toEqual([0, 2, 4]);
    expect(strideIndices(6, 2)).toEqual([0, 2, 4, 5]);
    expect(chooseStride(1319, 1319)).toBe(2);
    expect(chooseStride(334, 334)).toBe(1);
    expect(chooseStride(989, 989)).toBe(1);
  });

  it("builds a centred mesh in metres with a valid index buffer", () => {
    const hf = decodeHeightfield(encode([1, 1, 1, 1, 65535, 1, 1, 1, 1]), meta(3, 3, 0, 10, 2));
    const m = buildMeshArrays(hf, 1);
    expect(m.cols * m.rows).toBe(9);
    expect(m.index.length).toBe(2 * 2 * 6);
    expect(Math.max(...m.index)).toBeLessThan(9);
    // centre vertex carries the peak (10 m above crop minimum)
    expect(m.positions[4 * 3 + 1]).toBeCloseTo(10, 4);
    expect(m.positions[4 * 3]).toBeCloseTo(0, 6);
  });

  it("classifies true slopes against the 15° and 30° thresholds", () => {
    // ramp rising 1 m per 1 m cell in x -> 45°
    const w = 6;
    const vals: number[] = [];
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) vals.push(1 + x * 1000);
    const hf = decodeHeightfield(encode(vals), meta(w, w, 0, 65534 / 1000, 1));
    const slope = computeSlopeDeg(hf, 2);
    expect(slope[2 * w + 2]).toBeCloseTo(45, 1);
    const cls = classifySlope(new Float32Array([5, 15, 29.9, 30, 60, NaN]));
    expect(Array.from(cls)).toEqual([0, 1, 1, 2, 2, 255]);
  });
});
