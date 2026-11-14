"use client";

/**
 * Expedition rover product shot: the bundled rover glTF on a slow turntable with its own small WebGLRenderer.
 * Load with next/dynamic (ssr:false) so three.js stays out of the first paint; the caller keeps a poster underneath
 * and this canvas fades in only after the first real frame.
 *
 * Lifecycle: the loop runs only while on screen and the tab is visible; on unmount everything is disposed and the
 * context is force-lost, so only the terrain viewer's WebGL context exists after the user leaves this stage.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { disposeObject, loadRover, type RoverRig } from "@/lib/rover-rig";

export interface RoverStageProps {
  /** Increment to trigger a mast-head survey sweep. */
  scanCue?: number;
  /** Yaw (radians) of the three-quarter pose. */
  yaw?: number;
  /** Extra camera distance to leave room around the complete rover. */
  framePadding?: number;
  /** Slowly roll the wheels forward (illustrative motion, no translation). */
  rolling?: boolean;
  /** Start with the mast stowed and raise it (the source model's rigged clip) shortly after the first frame. */
  deployOnReady?: boolean;
  onReady?: () => void;
  onError?: (reason: string) => void;
  className?: string;
}

/** Soft radial contact shadow — a gradient on a plane, no shadow maps. */
function makeContactShadow(): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.7)");
  grd.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

export function RoverStage({ scanCue = 0, yaw = -0.62, framePadding = 1, rolling = false, deployOnReady = true, onReady, onError, className = "" }: RoverStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<RoverRig | null>(null);
  const rollRef = useRef(rolling);
  const cbRef = useRef({ onReady, onError });
  useEffect(() => {
    cbRef.current = { onReady, onError };
    rollRef.current = rolling;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const debug = new URLSearchParams(window.location.search).has("debugCapture");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: debug });
    } catch (e) {
      cbRef.current.onError?.(`WebGL unavailable: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    // product-cinematography rig: low warm Mars key, cool rim behind, soft fill
    const key = new THREE.DirectionalLight(0xffe2c8, 1.9);
    key.position.set(-3.2, 2.2, 3.0);
    const rim = new THREE.DirectionalLight(0xa9c6dc, 2.0);
    rim.position.set(3.0, 2.6, -3.2);
    const kick = new THREE.DirectionalLight(0xd9845a, 1.0);
    kick.position.set(3.4, 0.5, 1.4);
    const fill = new THREE.HemisphereLight(0xd6dde6, 0x22160f, 0.22);
    scene.add(key, rim, kick, fill);
    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 80);
    const pivot = new THREE.Group();
    scene.add(pivot);
    const shadow = makeContactShadow();
    scene.add(shadow);

    let disposed = false;
    let firstFrame = false;
    const tMount = performance.now();
    let radius = 2;
    const target = new THREE.Vector3(0, 1, 0);
    const frame = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
      const hf = Math.atan(Math.tan(vf) * camera.aspect);
      const dist = (radius / Math.sin(Math.min(vf, hf))) * 0.98 * framePadding;
      const elev = THREE.MathUtils.degToRad(11);
      camera.position.set(0, target.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    };

    loadRover(renderer)
      .then((rig) => {
        if (disposed) return rig.dispose();
        console.info(`[PARALLAX X] rover rig ready after ${Math.round(performance.now() - tMount)} ms`);
        rigRef.current = rig;
        if (deployOnReady && !reduced) {
          rig.setMast(false, false);
          window.setTimeout(() => rigRef.current?.setMast(true), 900);
        }
        pivot.add(rig.root);
        pivot.rotation.y = yaw;
        target.set(0, rig.heightM * 0.42, 0);
        radius = Math.max(rig.heightM * 0.6, rig.lengthM * 0.52);
        shadow.scale.set(rig.lengthM * 1.25, rig.lengthM * 1.25, 1);
        shadow.position.y = 0.002;
        frame();
        if (debug) (window as unknown as Record<string, unknown>).__rover = { scene, camera, rig, renderer };
        // compile every shader program off the critical path (KHR_parallel_shader_compile where available)
        renderer
          .compileAsync(scene, camera)
          .catch(() => undefined)
          .then(() => {
            if (!disposed) wake();
          });
      })
      .catch((err) => {
        if (!disposed) cbRef.current.onError?.(`Rover model failed to load: ${err instanceof Error ? err.message : String(err)}`);
      });

    const perf = { n: 0, sum: 0, strikes: 0, cap: 0 };
    let raf = 0;
    let onScreen = true;
    let elapsed = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      if (disposed || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(tick);
      if (last && perf.cap && now - last < perf.cap - 2) return;
      const interval = last ? now - last : 16.7;
      last = now;
      const dt = Math.min(interval / 1000, 0.1);
      elapsed += dt;
      const rig = rigRef.current;
      if (rig) {
        rig.update(reduced ? 0 : dt, rollRef.current && !reduced ? dt * 0.35 : 0);
        if (!reduced) pivot.rotation.y = yaw + Math.sin(elapsed * ((Math.PI * 2) / 22)) * 0.22;
      }
      renderer.render(scene, camera);
      if (!rig) return;
      if (!firstFrame) {
        firstFrame = true;
        console.info(`[PARALLAX X] rover first frame after ${Math.round(performance.now() - tMount)} ms`);
        host.dataset.ready = "1";
        cbRef.current.onReady?.();
        return;
      }
      // adaptive: cap at 30 fps on weak GPUs; hand back to the poster if even that cannot be held
      perf.n++;
      perf.sum += interval;
      if (perf.n >= 45) {
        const avg = perf.sum / perf.n;
        perf.n = 0;
        perf.sum = 0;
        if (!perf.cap && avg > 22) perf.cap = 1000 / 30;
        else if (avg > 55) {
          if (++perf.strikes >= 2) {
            sleep();
            cbRef.current.onError?.(`Rover preview frame rate too low (${Math.round(1000 / avg)} fps); showing poster`);
          }
        } else perf.strikes = 0;
      }
    };
    function wake() {
      if (raf || disposed || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    }
    function sleep() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) wake();
      else sleep();
    });
    io.observe(host);
    const onVis = () => (document.hidden ? sleep() : wake());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => {
      frame();
      if (!raf && rigRef.current) renderer.render(scene, camera);
    });
    ro.observe(host);
    const onLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) cbRef.current.onError?.("WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    frame();

    return () => {
      disposed = true;
      sleep();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      rigRef.current?.dispose();
      rigRef.current = null;
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (debug) delete (window as unknown as Record<string, unknown>).__rover;
    };
    // yaw and framePadding are mount-time framing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scanCue) rigRef.current?.scan();
  }, [scanCue]);

  return <div ref={hostRef} className={`h-full w-full ${className}`} />;
}

export default RoverStage;
