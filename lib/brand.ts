/**
 * PARALLAX X brand system — the ONE source of truth for the logo geometry and colours.
 *
 * Vector reconstruction of the team's branding deck: an angular, italic geometric wordmark (the A drawn as a
 * crossbar-less Λ), followed by the copper "X" signature with its orbital swoosh and light point.
 * Every logo in the product (header, intro, loading screen, favicon, app icon, social preview, /public/brand files)
 * is generated from the data below — never redrawn by hand.
 *
 * Glyphs are filled outlines on an upright 40-unit cap height, slanted with one shared skew.
 */

export const BRAND = {
  graphite: "#0B1016",
  space: "#06080B",
  surface: "#121A22",
  ink: "#F3F1ED",
  muted: "#A4B0BC",
  copper: "#C97951",
  copperBright: "#FF8B3D",
  copperDeep: "#D2541C",
  earth: "#6A9BAD",
} as const;

export const CAP = 40;
export const SLANT = -12; // degrees (skewX)
/** outline added to the glyph fills: brings the 6.5 stroke to ~7.6, matching the deck's weight */
export const GLYPH_STROKE = 1.1;
const SKEW = Math.tan((-SLANT * Math.PI) / 180); // horizontal shift per unit of height above the baseline

type Glyph = { w: number; paths: string[] };

// stroke weight 6.5 on a 40-unit cap height
const GLYPHS: Record<"P" | "A" | "R" | "L" | "X", Glyph> = {
  P: { w: 31, paths: ["M0 40V0H19A12 12 0 0 1 19 24H6.5V40ZM6.5 6.5V17.5H19A5.5 5.5 0 0 0 19 6.5Z"] },
  A: { w: 36, paths: ["M0 40L14.5 0H21.5L36 40H29L18 9.6L7 40Z"] },
  R: { w: 31.5, paths: ["M0 40V0H19A12 12 0 0 1 19 24H6.5V40ZM6.5 6.5V17.5H19A5.5 5.5 0 0 0 19 6.5Z", "M15 24H22.6L31.5 40H23.9Z"] },
  L: { w: 26, paths: ["M0 0H6.5V33.5H26V40H0Z"] },
  X: { w: 35, paths: ["M0 0H7.8L35 40H27.2Z", "M27.2 0H35L7.8 40H0Z"] },
};

const WORD = "PARALLAX";
const TRACK = 5.5; // letter spacing
const GAP_TO_X = 12; // space before the copper signature X

export interface PlacedGlyph {
  ch: keyof typeof GLYPHS;
  x: number;
  paths: string[];
}

/** Word glyphs at their x offsets (upright coordinates, before the slant). */
export function wordLayout(): { glyphs: PlacedGlyph[]; width: number } {
  let x = 0;
  const glyphs: PlacedGlyph[] = [];
  for (const ch of WORD) {
    const g = GLYPHS[ch as keyof typeof GLYPHS];
    glyphs.push({ ch: ch as keyof typeof GLYPHS, x, paths: g.paths });
    x += g.w + TRACK;
  }
  return { glyphs, width: x - TRACK };
}

/** The signature X, its orbit and light point, in a local frame where the X occupies 0..35 × 0..40. */
export const SIGNATURE = {
  x: GLYPHS.X,
  // orbit: a tilted ellipse arc that starts as a faint tail under the lower-left leg, sweeps behind the right
  // side and over the top, ending at the light point above the left arm
  orbit: "M-15 47C10 49 44 33 51 13C55 1 47 -9 30 -9.5C21 -9.6 14 -7.5 9 -4.6",
  dot: { cx: 8.2, cy: -4.2, r: 2.3 },
  bounds: { minX: -16, minY: -14, maxX: 56, maxY: 50 },
};

export const LOGO = (() => {
  const { width } = wordLayout();
  const sigX = width + GAP_TO_X;
  // slant shifts the top of every glyph right by CAP * SKEW; the orbit extends beyond the X box
  const minX = Math.min(0, sigX + SIGNATURE.bounds.minX);
  const maxX = sigX + SIGNATURE.bounds.maxX + CAP * SKEW;
  return { sigX, wordWidth: width, viewBox: { x: minX - 2, y: SIGNATURE.bounds.minY, w: maxX - minX + 4, h: SIGNATURE.bounds.maxY - SIGNATURE.bounds.minY } };
})();

export const MARK_VIEWBOX = { x: -16, y: -14, w: 80, h: 64 };

/** skewX about the baseline (y = 40) so glyph bottoms stay put and tops lean right */
export const slantTransform = (tx = 0) => `translate(${tx} 0) translate(0 ${CAP}) skewX(${SLANT}) translate(0 ${-CAP})`;

// ---------------------------------------------------------------------------------------------------------------
// Static SVG markup (for /public/brand, app/icon.svg and the social preview). React components in
// components/brand.tsx render the same geometry.
// ---------------------------------------------------------------------------------------------------------------

function defs(id: string) {
  return `<defs><linearGradient id="${id}-x" x1="0" y1="0" x2="35" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BRAND.copperBright}"/><stop offset="1" stop-color="${BRAND.copperDeep}"/></linearGradient><linearGradient id="${id}-o" x1="-15" y1="47" x2="40" y2="-10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BRAND.copperBright}" stop-opacity="0"/><stop offset="0.55" stop-color="${BRAND.copperBright}" stop-opacity="0.85"/><stop offset="1" stop-color="#FFD2B0"/></linearGradient><radialGradient id="${id}-g"><stop offset="0" stop-color="#FFE3CC" stop-opacity="0.9"/><stop offset="1" stop-color="${BRAND.copperBright}" stop-opacity="0"/></radialGradient></defs>`;
}

function signatureMarkup(id: string, tx: number) {
  const d = SIGNATURE.dot;
  return `<g transform="translate(${tx} 0)"><g transform="${slantTransform()}">${SIGNATURE.x.paths.map((p) => `<path d="${p}" fill="url(#${id}-x)" stroke="url(#${id}-x)" stroke-width="${GLYPH_STROKE}"/>`).join("")}</g><path d="${SIGNATURE.orbit}" fill="none" stroke="url(#${id}-o)" stroke-width="2.2" stroke-linecap="round"/><circle cx="${d.cx}" cy="${d.cy}" r="${d.r * 3}" fill="url(#${id}-g)"/><circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="#FFF1E4"/></g>`;
}

export function logoSvg(opts: { title?: boolean } = {}): string {
  const id = "pxl";
  const { glyphs } = wordLayout();
  const vb = LOGO.viewBox;
  const word = glyphs.map((g) => `<g transform="${slantTransform(g.x)}">${g.paths.map((p) => `<path d="${p}" fill="${BRAND.ink}" fill-rule="evenodd" stroke="${BRAND.ink}" stroke-width="${GLYPH_STROKE}" stroke-linejoin="miter"/>`).join("")}</g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(2)} ${vb.y} ${vb.w.toFixed(2)} ${vb.h}" role="img" aria-label="PARALLAX X">${opts.title === false ? "" : "<title>PARALLAX X</title>"}${defs(id)}${word}${signatureMarkup(id, LOGO.sigX)}</svg>`;
}

export function markSvg(): string {
  const id = "pxm";
  const v = MARK_VIEWBOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" role="img" aria-label="PARALLAX X mark"><title>PARALLAX X mark</title>${defs(id)}${signatureMarkup(id, 0)}</svg>`;
}

/** Rounded-square app icon / favicon: the signature on matte graphite. */
export function appIconSvg(): string {
  const id = "pxi";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BRAND.graphite}"/><rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="${BRAND.copper}" stroke-opacity="0.35" stroke-width="1.5"/>${defs(id)}<g transform="translate(16.5 17) scale(0.72)">${signatureMarkup(id, 0)}</g></svg>`;
}
