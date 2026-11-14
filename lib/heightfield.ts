import type { Heightfield, HeightfieldMeta } from "./types";

/**
 * Decode a heightfield per docs/DATA_CONTRACT.md:
 * uint16 little-endian, row-major, north row first; 0 = no data;
 * z = z_min_m + (v-1)/65534 * (z_max_m - z_min_m).
 * Returned heights are relative to z_min_m (metres); no-data cells are NaN.
 */
export function decodeHeightfield(buffer: ArrayBuffer, meta: HeightfieldMeta): Heightfield {
  const n = meta.width * meta.height;
  if (buffer.byteLength < n * 2) {
    throw new Error(
      `Heightfield ${meta.id}: expected ${n * 2} bytes, got ${buffer.byteLength}`,
    );
  }
  const view = new DataView(buffer);
  const heights = new Float32Array(n);
  const range = meta.z_max_m - meta.z_min_m;
  const scale = range / 65534;
  let minRel = Infinity;
  let maxRel = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = view.getUint16(i * 2, true);
    if (v === 0) {
      heights[i] = NaN;
    } else {
      const z = (v - 1) * scale;
      heights[i] = z;
      if (z < minRel) minRel = z;
      if (z > maxRel) maxRel = z;
    }
  }
  if (!Number.isFinite(minRel)) {
    minRel = 0;
    maxRel = 0;
  }
  return { meta, heights, minRel, maxRel };
}

/** Absolute elevation (m) for a raw uint16 sample; null for no-data. */
export function rawToElevation(v: number, meta: Pick<HeightfieldMeta, "z_min_m" | "z_max_m">): number | null {
  if (v === 0) return null;
  return meta.z_min_m + ((v - 1) / 65534) * (meta.z_max_m - meta.z_min_m);
}

export type ProgressFn = (loaded: number, total: number | null) => void;

/** fetch() with real byte progress via ReadableStream. */
export async function fetchWithProgress(url: string, onProgress?: ProgressFn): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const lenHeader = res.headers.get("content-length");
  const total = lenHeader ? Number(lenHeader) : null;
  if (!res.body || typeof res.body.getReader !== "function") {
    const buf = await res.arrayBuffer();
    onProgress?.(buf.byteLength, buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
  }
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out.buffer;
}

export async function fetchHeightfieldMeta(id: string): Promise<HeightfieldMeta> {
  const res = await fetch(`/data/terrain/${id}.json`);
  if (!res.ok) throw new Error(`Heightfield metadata ${id} not found (HTTP ${res.status})`);
  return (await res.json()) as HeightfieldMeta;
}

const cache = new Map<string, Promise<Heightfield>>();

/**
 * Load (and cache) a heightfield. Progress callbacks only fire for the first
 * request that actually downloads the file.
 */
export function loadHeightfield(
  id: string,
  hooks?: { onMeta?: (m: HeightfieldMeta) => void; onProgress?: ProgressFn },
): Promise<Heightfield> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = (async () => {
    const meta = await fetchHeightfieldMeta(id);
    hooks?.onMeta?.(meta);
    const buf = await fetchWithProgress(meta.file, hooks?.onProgress);
    return decodeHeightfield(buf, meta);
  })();
  cache.set(id, p);
  p.catch(() => cache.delete(id));
  return p;
}

/** Sample relative height with bilinear interpolation (grid coordinates). NaN-aware. */
export function sampleBilinear(hf: Heightfield, gx: number, gy: number): number {
  const { width: w, height: h } = hf.meta;
  const x = Math.min(Math.max(gx, 0), w - 1);
  const y = Math.min(Math.max(gy, 0), h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = hf.heights[y0 * w + x0];
  const b = hf.heights[y0 * w + x1];
  const c = hf.heights[y1 * w + x0];
  const d = hf.heights[y1 * w + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
