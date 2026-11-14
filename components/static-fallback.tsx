"use client";

import { useEffect, useRef } from "react";
import type { Heightfield, Results } from "@/lib/types";
import { getHillshadeRGBA } from "@/lib/terrain-compute";
import { fracToPercent, formatCoord, formatMetres, formatPosting, rankLabel } from "@/lib/format";
import { Button, NotAvailable } from "./ui";

function HillshadeCanvas({ hf, exaggeration }: { hf: Heightfield; exaggeration: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { width: w, height: h } = hf.meta;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const rgba = getHillshadeRGBA(hf, exaggeration, hf.meta.planet === "Mars" ? "mars" : "earth");
    const img = new ImageData(new Uint8ClampedArray(rgba.buffer.slice(0) as ArrayBuffer), w, h);
    ctx.putImageData(img, 0, 0);
  }, [hf, exaggeration]);
  return <canvas ref={ref} className="block h-auto w-full rounded-[8px] border border-hairline" aria-label={`Hillshade of ${hf.meta.source_id}`} />;
}

export function StaticFallback({
  hf,
  results,
  reason,
  onTry3D,
}: {
  hf: Heightfield | null;
  results: Results | null;
  reason: string;
  onTry3D?: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-muted">{reason}</p>
          {onTry3D ? <Button onClick={onTry3D}>Try 3D anyway</Button> : null}
        </div>
        {hf ? (
          <>
            <HillshadeCanvas hf={hf} exaggeration={hf.meta.vertical_exaggeration_default} />
            <p className="mt-2 text-[14px] text-muted">
              Hillshade (sun from NW, 45°, vertical ×{hf.meta.vertical_exaggeration_default}) of{" "}
              <span className="num">{hf.meta.source_id}</span> · {formatMetres(hf.meta.extent_m[0])} across · grid ≈{" "}
              {formatPosting(hf.meta.posting_m)} · {hf.meta.provider}
            </p>
          </>
        ) : (
          <NotAvailable what="Terrain" />
        )}
      </div>
      <div className="space-y-6">
        <h2 className="font-display text-[22px] font-semibold">Numbers</h2>
        {results ? (
          <>
            <table className="w-full text-[15px]">
              <tbody>
                <tr className="border-b border-hairline">
                  <td className="py-2 text-muted">Area steeper than 15° · 4 m baseline</td>
                  <td className="num py-2 text-right">{fracToPercent(results.hirise.frac_area_slope_gt15_baseline_4m)}</td>
                </tr>
                <tr className="border-b border-hairline">
                  <td className="py-2 text-muted">Area steeper than 15° · 180 m baseline</td>
                  <td className="num py-2 text-right">{fracToPercent(results.hirise.frac_area_slope_gt15_baseline_180m)}</td>
                </tr>
                <tr className="border-b border-hairline">
                  <td className="py-2 text-muted">Area steeper than 30° · 4 m baseline</td>
                  <td className="num py-2 text-right">{fracToPercent(results.hirise.frac_area_slope_gt30_baseline_4m)}</td>
                </tr>
                <tr className="border-b border-hairline">
                  <td className="py-2 text-muted">Decision</td>
                  <td className="py-2 text-right">{results.decision.pass ? "Pre-registered test passed" : "Pre-registered test not passed"}</td>
                </tr>
              </tbody>
            </table>
            <div>
              <h3 className="text-[15px] font-medium">Earth candidates</h3>
              <ul className="mt-2 space-y-2 text-[15px]">
                {results.candidates.map((c) => (
                  <li key={c.id} className="border-b border-hairline pb-2">
                    <div>{c.label}</div>
                    <div className="num text-[14px] text-muted">
                      {formatCoord(c.centroid, "Earth")} · {rankLabel(c.best_pct)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <NotAvailable what="Results" />
        )}
      </div>
    </div>
  );
}
