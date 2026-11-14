"use client";

import { useEffect, useRef } from "react";
import { TerrainEngine, webglAvailable, type ViewSpec } from "@/lib/terrain-engine";

export interface TerrainViewerProps {
  views: ViewSpec[];
  exaggeration: number;
  onEngine?: (engine: TerrainEngine | null) => void;
  onCamera?: (metresPerPx: number) => void;
  /** reason: "webgl" (unavailable/lost) or "fps" (measured fps below threshold) */
  onFallback?: (reason: "webgl" | "fps", fps?: number) => void;
  minFps?: number;
}

export default function TerrainViewer({ views, exaggeration, onEngine, onCamera, onFallback, minFps = 20 }: TerrainViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TerrainEngine | null>(null);
  const cbs = useRef({ onCamera, onFallback, onEngine, minFps });
  useEffect(() => {
    cbs.current = { onCamera, onFallback, onEngine, minFps };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!webglAvailable()) {
      cbs.current.onFallback?.("webgl");
      return;
    }
    let engine: TerrainEngine;
    try {
      engine = new TerrainEngine(el, {
        onCamera: (m) => cbs.current.onCamera?.(m),
        onFpsProbe: (fps) => {
          if (fps < cbs.current.minFps) cbs.current.onFallback?.("fps", fps);
        },
        onContextLost: () => cbs.current.onFallback?.("webgl"),
      });
    } catch {
      cbs.current.onFallback?.("webgl");
      return;
    }
    engineRef.current = engine;
    cbs.current.onEngine?.(engine);
    return () => {
      cbs.current.onEngine?.(null);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setExaggeration(exaggeration);
  }, [exaggeration]);

  useEffect(() => {
    engineRef.current?.setViews(views);
  }, [views]);

  return <div ref={host} className="absolute inset-0" />;
}
