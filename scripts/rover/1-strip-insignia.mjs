// Rebuild the NASA/JPL Perseverance GLB with insignia-free textures (see docs/ROVER_MODEL.md).
import { readFileSync, writeFileSync } from "node:fs";
const [, , inPath, outPath] = process.argv;
const b = readFileSync(inPath);
const jl = b.readUInt32LE(12);
const j = JSON.parse(b.slice(20, 20 + jl).toString());
const binLen = b.readUInt32LE(20 + jl);
const bin = b.slice(20 + jl + 8, 20 + jl + 8 + binLen);
const byName = (n, mime) => j.images.findIndex((im) => im.name === n && im.mimeType === mime);
const replace = new Map([
  [byName("mars_2020_03", "image/jpeg"), readFileSync("rover_clean/mars_2020_03.jpg")],
  [byName("arm_graphics", "image/jpeg"), readFileSync("rover_clean/arm_graphics.jpg")],
  [byName("blade", "image/jpeg"), readFileSync("rover_clean/blade.jpg")],
]);
const drop = new Set([byName("mars_2020_03", "image/webp"), byName("arm_graphics", "image/webp"), byName("blade", "image/webp")]);
if ([...replace.keys(), ...drop].some((i) => i < 0)) throw new Error("image not found");
// textures that pointed at a dropped webp fall back to the cleaned jpeg
for (const t of j.textures) {
  const w = t.extensions?.EXT_texture_webp;
  if (w && drop.has(w.source)) {
    if (t.source === undefined) throw new Error("texture without fallback");
    delete t.extensions.EXT_texture_webp;
    if (!Object.keys(t.extensions).length) delete t.extensions;
  }
}
const dropBV = new Set([...drop].map((i) => j.images[i].bufferView));
const imgMap = new Map();
const newImages = [];
j.images.forEach((im, i) => { if (!drop.has(i)) { imgMap.set(i, newImages.length); newImages.push(im); } });
for (const t of j.textures) {
  if (t.source !== undefined) t.source = imgMap.get(t.source);
  if (t.extensions?.EXT_texture_webp) t.extensions.EXT_texture_webp.source = imgMap.get(t.extensions.EXT_texture_webp.source);
}
const replBV = new Map([...replace].map(([i, data]) => [j.images[i].bufferView, data]));
j.images = newImages;
const bvMap = new Map();
const chunks = [];
let off = 0;
const newBV = [];
j.bufferViews.forEach((bv, i) => {
  if (dropBV.has(i)) return;
  const data = replBV.get(i) ?? bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const pad = (4 - (off % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  bvMap.set(i, newBV.length);
  newBV.push({ ...bv, byteOffset: off, byteLength: data.length });
  chunks.push(data);
  off += data.length;
});
j.bufferViews = newBV;
for (const a of j.accessors) if (a.bufferView !== undefined) a.bufferView = bvMap.get(a.bufferView);
for (const im of j.images) im.bufferView = bvMap.get(im.bufferView);
for (const m of j.meshes) for (const p of m.primitives) { const d = p.extensions?.KHR_draco_mesh_compression; if (d) d.bufferView = bvMap.get(d.bufferView); }
if ([...j.accessors, ...j.images].some((x) => x.bufferView === undefined && x.bufferView !== undefined)) throw new Error("bad map");
const newBin = Buffer.concat(chunks);
const binPad = Buffer.concat([newBin, Buffer.alloc((4 - (newBin.length % 4)) % 4)]);
j.buffers = [{ byteLength: binPad.length }];
j.asset.extras = { source: "NASA/JPL-Caltech 'Mars 2020 Perseverance Rover' (NASA 3D Resources)", modified: "NASA insignia, JPL logotype and mission wordmarks removed from textures for PARALLAX X" };
let js = Buffer.from(JSON.stringify(j));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(outPath, Buffer.concat([head, jh, js, bh, binPad]));
console.log("wrote", outPath, Buffer.concat([head, jh, js, bh, binPad]).length, "bytes; images", j.images.length);
