// Pure formatting helpers. They never invent numbers; they only render values
// read from public/data files.

/**
 * Percentiles in results.json are 0–100, higher = more similar to the Mars
 * fingerprint relative to the null set of Earth windows. A percentile is not
 * a probability and not a "% match".
 */
export function rankPhrase(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "not ranked";
  const p = Math.min(100, Math.max(0, pct));
  if (p >= 50) {
    const top = 100 - p;
    return `top ${formatShare(top)}`;
  }
  return `bottom ${formatShare(p)}`;
}

/** Conservative share formatting: rounds *up* so a rank is never overstated. */
function formatShare(share: number): string {
  if (share <= 0.1) return "0.1%";
  if (share < 1) return `${(Math.ceil(share * 10) / 10).toFixed(1)}%`;
  return `${Math.ceil(share - 1e-9)}%`;
}

/** e.g. "ranks in the top 4% of Earth windows" */
export function rankLabel(pct: number | null | undefined): string {
  const phrase = rankPhrase(pct);
  if (phrase === "not ranked") return "not ranked against Earth windows";
  return `ranks in the ${phrase} of Earth windows`;
}

/** Fraction (0–1) → percent string, e.g. 0.1389 → "13.9%". */
export function fracToPercent(f: number | null | undefined, digits = 1): string {
  if (f === null || f === undefined || !Number.isFinite(f)) return "—";
  const v = f * 100;
  if (v > 0 && v < Math.pow(10, -digits)) return `<${Math.pow(10, -digits).toFixed(digits)}%`;
  return `${v.toFixed(digits)}%`;
}

export function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
}

/** Earth longitudes: −180..180 → E/W. */
export function formatEarthLon(lon: number): string {
  const l = ((((lon + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(l).toFixed(2)}°${l >= 0 ? "E" : "W"}`;
}

/** Mars longitudes are reported in degrees east (0–360). */
export function formatMarsLon(lon: number): string {
  const l = ((lon % 360) + 360) % 360;
  return `${l.toFixed(2)}°E`;
}

export function formatCoord(lonlat: [number, number], planet: "Mars" | "Earth"): string {
  const [lon, lat] = lonlat;
  return `${formatLat(lat)} ${planet === "Mars" ? formatMarsLon(lon) : formatEarthLon(lon)}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMetres(m: number): string {
  if (m >= 1000) {
    const km = m / 1000;
    return `${Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.round(m)} m`;
}

/** Posting label, e.g. 3.0325 → "3.0 m", 1.0108 → "1.01 m". */
export function formatPosting(m: number): string {
  if (m < 2) return `${m.toFixed(2)} m`;
  if (m < 10) return `${m.toFixed(1)} m`;
  return `${Math.round(m)} m`;
}

/**
 * Largest "nice" length (1, 2, 5 × 10^n metres) whose on-screen width does
 * not exceed maxPx, given metres per pixel.
 */
export function niceScaleBar(metresPerPx: number, maxPx = 140): { metres: number; px: number; label: string } {
  if (!(metresPerPx > 0) || !Number.isFinite(metresPerPx)) return { metres: 0, px: 0, label: "" };
  const maxM = metresPerPx * maxPx;
  const pow = Math.pow(10, Math.floor(Math.log10(maxM)));
  let metres = pow;
  for (const m of [5, 2, 1]) {
    if (m * pow <= maxM) {
      metres = m * pow;
      break;
    }
  }
  return { metres, px: metres / metresPerPx, label: formatMetres(metres) };
}

export function shortHash(h: string | undefined | null, n = 12): string {
  if (!h) return "—";
  return h.length > n ? `${h.slice(0, n)}…` : h;
}
