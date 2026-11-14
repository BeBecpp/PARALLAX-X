"use client";

/**
 * PAX — the owner's real articulated GLB character, rendered with its own small WebGLRenderer.
 * Load with next/dynamic (ssr:false) so three.js stays out of the first paint. The caller keeps a
 * poster image underneath; this canvas fades in only after the first real frame is drawn.
 *
 * Lifecycle rules: render loop runs only while on screen and the tab is visible; on unmount every
 * geometry/material/texture is disposed and the context is force-lost, so only one WebGL context
 * (the terrain viewer's) exists once the user leaves the Select stage.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type PaxCueName = "wave" | "tilt" | "turn";
export interface PaxCue {
  name: PaxCueName;
  /** Increment to re-trigger the same clip. */
  n: number;
}

const CLIP_FOR_CUE: Record<PaxCueName, string> = { wave: "Wave", tilt: "CuriousTilt", turn: "HeadTurn" };
const MODEL_URL = "/models/pax-rover.glb";

export interface PaxStageProps {
  cue?: PaxCue | null;
  /** Yaw (radians) of the three-quarter pose; negative turns PAX toward screen-left. */
  yaw?: number;
  onReady?: (clipNames: string[]) => void;
  onError?: (reason: string) => void;
  className?: string;
}

let loggedClips = false;

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}

/** Soft radial contact shadow — a gradient on a plane, no shadow maps. */
function makeContactShadow(): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.62)");
  grd.addColorStop(0.45, "rgba(0,0,0,0.32)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

export function PaxStage({ cue, yaw = -0.5, onReady, onError, className = "" }: PaxStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<((c: PaxCueName) => void) | null>(null);
  const cbRef = useRef({ onReady, onError });
  useEffect(() => {
    cbRef.current = { onReady, onError };
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
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envRT = pmrem.fromScene(room, 0.04);
    room.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;

    // Product-cinematography rig: warm key front-left, cool rim behind-right, soft fill.
    const key = new THREE.DirectionalLight(0xfff1e2, 2.1);
    key.position.set(-2.2, 3.0, 3.2);
    const rim = new THREE.DirectionalLight(0xbcd2e6, 2.4);
    rim.position.set(2.6, 2.2, -2.8);
    const warmKick = new THREE.DirectionalLight(0xdf9070, 0.9);
    warmKick.position.set(3.0, 0.6, 1.0);
    const fill = new THREE.HemisphereLight(0xdfe6ee, 0x1a1410, 0.45);
    scene.add(key, rim, warmKick, fill);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
    const pivot = new THREE.Group(); // yaw/turntable applied here
    scene.add(pivot);
    const shadow = makeContactShadow();
    scene.add(shadow);

    let mixer: THREE.AnimationMixer | null = null;
    let idle: THREE.AnimationAction | null = null;
    const actions = new Map<string, THREE.AnimationAction>();
    let current: THREE.AnimationAction | null = null;
    let model: THREE.Object3D | null = null;
    let disposed = false;
    let firstFrame = false;
    let frameRadius = 0.6;
    let clipNames: string[] = [];
    const target = new THREE.Vector3(0, 0.45, 0);

    const frame = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Fit bounding sphere in both vertical and horizontal FOV.
      const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
      const hf = Math.atan(Math.tan(vf) * camera.aspect);
      const dist = (frameRadius / Math.sin(Math.min(vf, hf))) * 1.02;
      const elev = THREE.MathUtils.degToRad(9);
      camera.position.set(0, target.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    };

    const playCue = (c: PaxCueName) => {
      if (!mixer || !idle || reduced) return;
      const next = actions.get(CLIP_FOR_CUE[c]);
      if (!next || next === current) return;
      next.reset();
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.play();
      (current ?? idle).crossFadeTo(next, 0.35, false);
      current = next;
    };
    playRef.current = playCue;

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        model = gltf.scene;
        // Materials: keep the face screen readable, make the emissive eyes/antenna actually glow.
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false; // skinned/animated parts can leave their static bounds
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            if (/EyeGlow|AntennaTipGlow/.test(sm.name)) {
              // Bypass ACES so the eyes stay copper-orange instead of desaturating; keep intensity near 1 so the
              // green channel doesn't clip toward yellow.
              sm.toneMapped = false;
              sm.emissiveIntensity = /Bright/.test(sm.name) ? 1.25 : 1.1;
            }
          }
        });
        // Center + scale from the real bounds (glTF is Y-up). Normalise height to 1.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const s = 1 / (size.y || 1);
        model.scale.setScalar(s);
        const box2 = new THREE.Box3().setFromObject(model);
        const c2 = box2.getCenter(new THREE.Vector3());
        model.position.set(-c2.x, -box2.min.y, -c2.z);
        pivot.add(model);
        pivot.rotation.y = yaw;
        const sz = box2.getSize(new THREE.Vector3());
        target.set(0, sz.y * 0.47, 0);
        frameRadius = Math.max(sz.y * 0.54, Math.hypot(sz.x, sz.z) * 0.5);
        shadow.scale.set(Math.max(sz.x, sz.z) * 1.7, Math.max(sz.x, sz.z) * 1.25, 1);
        shadow.position.set(0, 0.001, 0);
        frame();

        mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
        idle = actions.get("Idle") ?? null;
        if (idle) {
          idle.setLoop(THREE.LoopRepeat, Infinity);
          idle.play();
          current = idle;
        }
        mixer.addEventListener("finished", (e) => {
          const done = (e as unknown as { action: THREE.AnimationAction }).action;
          if (done !== current || !idle) return;
          idle.reset();
          idle.enabled = true;
          idle.setEffectiveWeight(1);
          idle.play();
          done.crossFadeTo(idle, 0.5, false);
          current = idle;
        });
        const names = gltf.animations.map((a) => a.name);
        if (!loggedClips) {
          loggedClips = true;
          console.info(`[PAX] GLB loaded — clips: ${names.join(", ")}`);
        }
        if (debug) (window as unknown as Record<string, unknown>).__pax = { scene, camera, model, mixer, actions, renderer, playCue, stats, get current() { return current?.getClip().name; } };
        clipNames = names;
        wake();
      },
      undefined,
      (err) => {
        if (!disposed) cbRef.current.onError?.(`PAX model failed to load: ${err instanceof Error ? err.message : String(err)}`);
      },
    );

    // Render loop, active only while visible. Adaptive: if the GPU can't hold ~45 fps, cap PAX at 30 fps
    // (its motion is slow); if it can't hold ~20 fps even then, hand back to the poster so PAX never
    // degrades the page on weak integrated graphics.
    const stats = { fps: 0, frames: 0, t0: 0, cap: 0, renderMs: 0 };
    const perf = { n: 0, sum: 0, strikes: 0 };
    let raf = 0;
    let onScreen = true;
    let elapsed = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      if (disposed || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(tick);
      if (last && stats.cap && now - last < stats.cap - 2) return;
      const interval = last ? now - last : 16.7;
      last = now;
      const dt = Math.min(interval / 1000, 0.1);
      elapsed += dt;
      mixer?.update(dt);
      if (model && !reduced) pivot.rotation.y = yaw + Math.sin(elapsed * ((Math.PI * 2) / 16)) * 0.14;
      const r0 = performance.now();
      renderer.render(scene, camera);
      stats.renderMs = stats.renderMs * 0.9 + (performance.now() - r0) * 0.1;
      stats.frames++;
      if (now - stats.t0 >= 1000) {
        stats.fps = Math.round((stats.frames * 1000) / (now - stats.t0));
        stats.frames = 0;
        stats.t0 = now;
      }
      if (!model) return;
      if (!firstFrame) {
        firstFrame = true;
        host.dataset.ready = "1";
        cbRef.current.onReady?.(clipNames);
        return;
      }
      perf.n++;
      perf.sum += interval;
      if (perf.n >= 45) {
        const avg = perf.sum / perf.n;
        perf.n = 0;
        perf.sum = 0;
        if (!stats.cap && avg > 22) stats.cap = 1000 / 30;
        else if (avg > 50) {
          if (++perf.strikes >= 2) {
            sleep();
            cbRef.current.onError?.(`PAX frame rate too low (${Math.round(1000 / avg)} fps); showing poster`);
          }
        } else perf.strikes = 0;
      }
    };
    function wake() {
      if (raf || disposed || !onScreen || document.hidden) return;
      last = 0;
      perf.n = 0;
      perf.sum = 0;
      stats.t0 = performance.now();
      stats.frames = 0;
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
      if (!raf && model) renderer.render(scene, camera);
    });
    ro.observe(host);
    const onLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) cbRef.current.onError?.("WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    frame();
    wake();

    return () => {
      disposed = true;
      playRef.current = null;
      sleep();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      disposeObject(scene);
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (debug) delete (window as unknown as Record<string, unknown>).__pax;
    };
    // yaw is a mount-time pose; changing it later is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cue) playRef.current?.(cue.name);
  }, [cue]);

  return <div ref={hostRef} className={`h-full w-full ${className}`} />;
}

export default PaxStage;
