// Regenerates every static logo file from the single geometry source in lib/brand.ts.
// Run: node scripts/build-brand.mts   (Node ≥ 23 strips TypeScript types natively)
import { writeFileSync } from "node:fs";
import { appIconSvg, logoSvg, markSvg } from "../lib/brand.ts";

const files: [string, string][] = [
  ["public/brand/parallax-x-wordmark.svg", logoSvg()],
  ["public/brand/parallax-x-mark.svg", markSvg()],
  ["public/brand/parallax-x-app-icon.svg", appIconSvg()],
  ["app/icon.svg", appIconSvg()],
];
for (const [path, svg] of files) {
  writeFileSync(path, svg + "\n");
  console.log("wrote", path, svg.length, "bytes");
}
