import type { Heightfield } from "./types";
import { sampleBilinear } from "./heightfield";

/** Published discrete slope thresholds (Hoover, Golombek & Calef 2012). */
export const SLOPE_THRESHOLDS_DEG = { loose: 15, outcrop: 30 } as const;

/** Baseline (m) of the in-browser slope-class proxy (rover-scale lens). */
export const SLOPE_BASELINE_M = 4;

export type Tone = "mars" | "earth";

const RAMPS: Record<Tone, { dark: [number, number, number]; light: [number, number, number] }> = {
  // warm grey for Mars, cool grey for Earth (brand: no hue-coded science)
  mars: { dark: [38, 33, 30], light: [226, 213, 199] },
  earth: { dark: [29, 36, 42], light: [206, 215, 221] },
};

function filled(hf: Heightfield, i: number): number {
  const v = hf.heights[i];
  return Number.isNaN(v) ? hf.minRel : v;
}

/**
 * Horn (1981) hillshade, sun azimuth 315°, altitude 45°.
 * Returns shade in [0,1] per cell; zFactor = vertical exaggeration.
 */
export function computeHillshade(hf: Heightfield, zFactor = 1, azimuthDeg = 315, altitudeDeg = 45): Float32Array {
  const { width: w, height: h, posting_m: cs } = hf.meta;
  const out = new Float32Array(w * h);
  const zenith = ((90 - altitudeDeg) * Math.PI) / 180;
  const azMath = (((360 - azimuthDeg + 90) % 360) * Math.PI) / 180;
  const cosZ = Math.cos(zenith);
  const sinZ = Math.sin(zenith);
  for (let y = 0; y < h; y++) {
    const ym = y > 0 ? y - 1 : y;
    const yp = y < h - 1 ? y + 1 : y;
    for (let x = 0; x < w; x++) {
      const xm = x > 0 ? x - 1 : x;
      const xp = x < w - 1 ? x + 1 : x;
      const a = filled(hf, ym * w + xm);
      const b = filled(hf, ym * w + x);
      const c = filled(hf, ym * w + xp);
      const d = filled(hf, y * w + xm);
      const f = filled(hf, y * w + xp);
      const g = filled(hf, yp * w + xm);
      const hh = filled(hf, yp * w + x);
      const ii = filled(hf, yp * w + xp);
      const dzdx = (c + 2 * f + ii - (a + 2 * d + g)) / (8 * cs);
      const dzdy = (g + 2 * hh + ii - (a + 2 * b + c)) / (8 * cs);
      const slope = Math.atan(zFactor * Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const s = cosZ * Math.cos(slope) + sinZ * Math.sin(slope) * Math.cos(azMath - aspect);
      out[y * w + x] = s < 0 ? 0 : s;
    }
  }
  return out;
}

/** RGBA texture bytes of the hillshade with a planet tone ramp. No-data cells are dark. */
export function hillshadeRGBA(hf: Heightfield, zFactor: number, tone: Tone): Uint8Array {
  const shade = computeHillshade(hf, zFactor);
  const { dark, light } = RAMPS[tone];
  const n = shade.length;
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const nodata = Number.isNaN(hf.heights[i]);
    // slight lift so flat ground is mid-tone, not black
    const s = nodata ? 0 : 0.08 + 0.92 * shade[i];
    out[i * 4] = nodata ? 11 : dark[0] + (light[0] - dark[0]) * s;
    out[i * 4 + 1] = nodata ? 16 : dark[1] + (light[1] - dark[1]) * s;
    out[i * 4 + 2] = nodata ? 22 : dark[2] + (light[2] - dark[2]) * s;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * True (unexaggerated) slope in degrees per cell, measured as a centred
 * difference across `baselineM` metres in x and y (bilinear sampling).
 */
export function computeSlopeDeg(hf: Heightfield, baselineM: number): Float32Array {
  const { width: w, height: h, posting_m: p } = hf.meta;
  const half = baselineM / 2 / p; // in grid cells
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (Number.isNaN(hf.heights[i])) {
        out[i] = NaN;
        continue;
      }
      const xl = Math.max(0, x - half);
      const xr = Math.min(w - 1, x + half);
      const yt = Math.max(0, y - half);
      const yb = Math.min(h - 1, y + half);
      const dzdx = (sampleBilinear(hf, xr, y) - sampleBilinear(hf, xl, y)) / ((xr - xl) * p);
      const dzdy = (sampleBilinear(hf, x, yb) - sampleBilinear(hf, x, yt)) / ((yb - yt) * p);
      const g = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
      out[i] = Number.isFinite(g) ? (Math.atan(g) * 180) / Math.PI : NaN;
    }
  }
  return out;
}

/** 0 = below 15°, 1 = 15–30°, 2 = ≥30°, 255 = no data. */
export function classifySlope(slopeDeg: Float32Array): Uint8Array {
  const out = new Uint8Array(slopeDeg.length);
  for (let i = 0; i < slopeDeg.length; i++) {
    const s = slopeDeg[i];
    out[i] = Number.isNaN(s) ? 255 : s >= SLOPE_THRESHOLDS_DEG.outcrop ? 2 : s >= SLOPE_THRESHOLDS_DEG.loose ? 1 : 0;
  }
  return out;
}

/** Hatch patterns shared by the 3D texture and the CSS legend (period in texels). */
export const HATCH_PERIOD = 6;

export function isHatched(cls: number, x: number, y: number): boolean {
  if (cls === 1) return (x + y) % HATCH_PERIOD < 2;
  if (cls === 2) return (x + y) % HATCH_PERIOD < 2 || (x - y + 6 * 100000) % HATCH_PERIOD < 2;
  return false;
}

/**
 * Slope-class overlay texture: luminance + hatching (survives colour blindness).
 * Class 0 is dim, class 1 mid-light with diagonal hatch, class 2 bright with cross-hatch.
 */
export function slopeClassRGBA(hf: Heightfield, classes: Uint8Array): Uint8Array {
  const shade = computeHillshade(hf, 1);
  const { width: w, height: h } = hf.meta;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const cls = classes[i];
      let v: number;
      if (cls === 255) v = 0.05;
      else if (cls === 0) v = 0.1 + 0.32 * shade[i];
      else if (cls === 1) v = 0.62 + 0.18 * shade[i];
      else v = 0.9 + 0.1 * shade[i];
      if (cls !== 255 && isHatched(cls, x, y)) v *= cls === 2 ? 0.3 : 0.4;
      const g = Math.round(255 * Math.min(1, v));
      // faint warm tint so it still reads as Mars
      out[i * 4] = g;
      out[i * 4 + 1] = Math.round(g * 0.96);
      out[i * 4 + 2] = Math.round(g * 0.92);
      out[i * 4 + 3] = 255;
    }
  }
  return out;
}

export interface MeshArrays {
  positions: Float32Array;
  uvs: Float32Array;
  index: Uint32Array;
  cols: number;
  rows: number;
  /** Mesh vertex spacing in metres. */
  meshSpacingM: number;
}

/** Grid indices sampled with a stride, always including the last row/column. */
export function strideIndices(n: number, stride: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i += stride) idx.push(i);
  idx.push(n - 1);
  return idx;
}

/**
 * Terrain mesh arrays in metres: x east, y up (height above crop minimum,
 * unexaggerated; exaggeration is applied as a mesh scale), z south.
 * Centred on the crop centre. UV v follows data rows (north row = v 0).
 */
export function buildMeshArrays(hf: Heightfield, stride: number): MeshArrays {
  const { width: w, height: h } = hf.meta;
  const [ex, ey] = hf.meta.extent_m;
  const xs = strideIndices(w, stride);
  const ys = strideIndices(h, stride);
  const cols = xs.length;
  const rows = ys.length;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const gy = ys[r];
    for (let c = 0; c < cols; c++) {
      const gx = xs[c];
      const hv = hf.heights[gy * w + gx];
      positions[k * 3] = ((gx + 0.5) / w - 0.5) * ex;
      positions[k * 3 + 1] = (Number.isNaN(hv) ? hf.minRel : hv) - hf.minRel;
      positions[k * 3 + 2] = ((gy + 0.5) / h - 0.5) * ey;
      uvs[k * 2] = (gx + 0.5) / w;
      uvs[k * 2 + 1] = (gy + 0.5) / h;
      k++;
    }
  }
  const index = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let t = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      index[t++] = a;
      index[t++] = d;
      index[t++] = b;
      index[t++] = b;
      index[t++] = d;
      index[t++] = e;
    }
  }
  return { positions, uvs, index, cols, rows, meshSpacingM: hf.meta.posting_m * stride };
}

/** Choose a mesh stride keeping vertex count around ≤ maxSide² . */
export function chooseStride(width: number, height: number, maxSide = 1000): number {
  return Math.max(1, Math.ceil(Math.max(width, height) / maxSide));
}

// ---- memoised accessors (CPU work is done once per heightfield; the loading
// screen calls these so its "Building terrain mesh" step reflects real work) ----
const meshMemo = new WeakMap<Heightfield, Map<number, MeshArrays>>();
const texMemo = new WeakMap<Heightfield, Map<string, Uint8Array>>();

export function getMeshArrays(hf: Heightfield, stride = chooseStride(hf.meta.width, hf.meta.height)): MeshArrays {
  let m = meshMemo.get(hf);
  if (!m) meshMemo.set(hf, (m = new Map()));
  let a = m.get(stride);
  if (!a) m.set(stride, (a = buildMeshArrays(hf, stride)));
  return a;
}

function texCache(hf: Heightfield): Map<string, Uint8Array> {
  let m = texMemo.get(hf);
  if (!m) texMemo.set(hf, (m = new Map()));
  return m;
}

export function getHillshadeRGBA(hf: Heightfield, zFactor: number, tone: Tone): Uint8Array {
  const m = texCache(hf);
  const key = `hs|${zFactor}|${tone}`;
  let t = m.get(key);
  if (!t) m.set(key, (t = hillshadeRGBA(hf, zFactor, tone)));
  return t;
}

export function getSlopeClassRGBA(hf: Heightfield, baselineM: number): Uint8Array {
  const m = texCache(hf);
  const key = `slope|${baselineM}`;
  let t = m.get(key);
  if (!t) m.set(key, (t = slopeClassRGBA(hf, classifySlope(computeSlopeDeg(hf, baselineM)))));
  return t;
}

// ---- lit-terrain helpers (visual styling only; geometry stays the measured heights) ----

/**
 * Object-space surface normals of the TRUE (unexaggerated) heightfield, encoded RGB in [0,255].
 * Axes match the mesh: x east, y up, z south. Used as an ObjectSpaceNormalMap so lighting keeps
 * full-resolution relief detail even when the mesh is decimated; three.js applies the mesh's
 * vertical exaggeration through the normal matrix.
 */
export function normalMapRGBA(hf: Heightfield): Uint8Array {
  const { width: w, height: h, posting_m: cs } = hf.meta;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ym = y > 0 ? y - 1 : y;
    const yp = y < h - 1 ? y + 1 : y;
    for (let x = 0; x < w; x++) {
      const xm = x > 0 ? x - 1 : x;
      const xp = x < w - 1 ? x + 1 : x;
      const dzdx = (filled(hf, y * w + xp) - filled(hf, y * w + xm)) / ((xp - xm) * cs);
      const dzdz = (filled(hf, yp * w + x) - filled(hf, ym * w + x)) / ((yp - ym) * cs);
      let nx = -dzdx;
      let ny = 1;
      let nz = -dzdz;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * w + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

const ALBEDO: Record<Tone, { low: [number, number, number]; high: [number, number, number] }> = {
  // restrained visualization palette (NOT imagery): warm sandstone for Mars, cool slate for Earth
  mars: { low: [150, 112, 88], high: [214, 186, 160] },
  earth: { low: [112, 128, 136], high: [182, 196, 202] },
};

/** Albedo texture: planet tone with a gentle elevation gradient and a faint full-res cavity term. */
export function albedoRGBA(hf: Heightfield, tone: Tone): Uint8Array {
  const { width: w, height: h } = hf.meta;
  const shade = computeHillshade(hf, 1, 315, 60);
  const span = Math.max(1e-6, hf.maxRel - hf.minRel);
  const { low, high } = ALBEDO[tone];
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = hf.heights[i];
    if (Number.isNaN(v)) {
      out.set([9, 12, 17, 255], i * 4);
      continue;
    }
    const t = Math.min(1, Math.max(0, (v - hf.minRel) / span));
    const e = 0.25 + 0.75 * Math.pow(t, 0.8);
    const cav = 0.82 + 0.18 * shade[i];
    out[i * 4] = Math.round((low[0] + (high[0] - low[0]) * e) * cav);
    out[i * 4 + 1] = Math.round((low[1] + (high[1] - low[1]) * e) * cav);
    out[i * 4 + 2] = Math.round((low[2] + (high[2] - low[2]) * e) * cav);
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function getNormalMapRGBA(hf: Heightfield): Uint8Array {
  const m = texCache(hf);
  let t = m.get("nrm");
  if (!t) m.set("nrm", (t = normalMapRGBA(hf)));
  return t;
}

export function getAlbedoRGBA(hf: Heightfield, tone: Tone): Uint8Array {
  const m = texCache(hf);
  const key = `alb|${tone}`;
  let t = m.get(key);
  if (!t) m.set(key, (t = albedoRGBA(hf, tone)));
  return t;
}

/** Grid cell (x,y) of the strongest local relief (coarse 8x8 blocks): the default camera focus. */
export function focalCell(hf: Heightfield): [number, number] {
  const { width: w, height: h } = hf.meta;
  const B = 8;
  const bw = Math.floor(w / B);
  const bh = Math.floor(h / B);
  let best = -1;
  let bx = w / 2;
  let by = h / 2;
  for (let j = 1; j < B - 1; j++) {
    for (let i = 1; i < B - 1; i++) {
      let s = 0;
      let s2 = 0;
      let n = 0;
      for (let y = j * bh; y < (j + 1) * bh; y += 2) {
        for (let x = i * bw; x < (i + 1) * bw; x += 2) {
          const v = hf.heights[y * w + x];
          if (Number.isNaN(v)) continue;
          s += v;
          s2 += v * v;
          n++;
        }
      }
      if (n < 10) continue;
      const varr = s2 / n - (s / n) ** 2;
      if (varr > best) {
        best = varr;
        bx = (i + 0.5) * bw;
        by = (j + 0.5) * bh;
      }
    }
  }
  return [bx, by];
}
