// Repack the (already insignia-free) rover GLB with one 512 px WebP per texture (see docs/ROVER_MODEL.md).
import { readFileSync, writeFileSync } from "node:fs";
const [, , inPath, texPath, outPath] = process.argv;
const b = readFileSync(inPath);
const jl = b.readUInt32LE(12);
const j = JSON.parse(b.slice(20, 20 + jl).toString());
const bin = b.slice(20 + jl + 8, 20 + jl + 8 + b.readUInt32LE(20 + jl));
const tex = JSON.parse(readFileSync(texPath, "utf8"));
const keep = Object.keys(tex).map(Number);
const imgMap = new Map(keep.map((oi, ni) => [oi, ni]));
const imgBV = new Map(j.images.map((im, i) => [im.bufferView, i]));
for (const t of j.textures) {
  t.source = imgMap.get(t.source);
  if (t.source === undefined) throw new Error("texture lost its image");
  if (t.extensions) { delete t.extensions.EXT_texture_webp; if (!Object.keys(t.extensions).length) delete t.extensions; }
}
j.extensionsUsed = j.extensionsUsed.filter((e) => e !== "EXT_texture_webp");
const chunks = []; const newBV = []; const bvMap = new Map(); let off = 0;
const push = (data, bv) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const nb = { ...bv, byteOffset: off, byteLength: data.length }; delete nb.byteStride; if (bv.byteStride) nb.byteStride = bv.byteStride; newBV.push(nb); chunks.push(data); off += data.length; return newBV.length - 1; };
j.bufferViews.forEach((bv, i) => {
  if (imgBV.has(i)) return; // image views are re-added below
  bvMap.set(i, push(bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength), bv));
});
j.images = keep.map((oi) => {
  const im = j.images[oi];
  const data = Buffer.from(tex[oi].b64, "base64");
  return { name: im.name, mimeType: "image/webp", bufferView: push(data, { buffer: 0 }) };
});
j.bufferViews = newBV;
for (const a of j.accessors) if (a.bufferView !== undefined) a.bufferView = bvMap.get(a.bufferView);
for (const m of j.meshes) for (const p of m.primitives) { const d = p.extensions?.KHR_draco_mesh_compression; if (d) d.bufferView = bvMap.get(d.bufferView); }
const nb = Buffer.concat(chunks); const binPad = Buffer.concat([nb, Buffer.alloc((4 - (nb.length % 4)) % 4)]);
j.buffers = [{ byteLength: binPad.length }];
j.asset.extras = { ...(j.asset.extras || {}), textures: "downscaled to ≤512 px WebP for web delivery" };
let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + js.length + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
const out = Buffer.concat([head, jh, js, bh, binPad]); writeFileSync(outPath, out); console.log("wrote", outPath, out.length, "bytes,", j.images.length, "images");
