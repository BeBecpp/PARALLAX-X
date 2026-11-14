import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Heightfield } from "./types";
import { chooseStride, getHillshadeRGBA, getMeshArrays, getSlopeClassRGBA, SLOPE_BASELINE_M, type Tone } from "./terrain-compute";

export type Overlay = "hillshade" | "slope";

export interface ViewSpec {
  hf: Heightfield;
  overlay: Overlay;
  tone: Tone;
}

export interface EngineCallbacks {
  /** metres per CSS pixel at the orbit target (for the scale bar). */
  onCamera?: (metresPerPx: number) => void;
  /** Average fps measured over the first ~2 s of visible rendering. */
  onFpsProbe?: (fps: number) => void;
  onContextLost?: () => void;
}

export { SLOPE_BASELINE_M };

interface MeshEntry {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  textures: Map<string, THREE.DataTexture>;
  stride: number;
  meshSpacingM: number;
}

const BG = 0x0b1016;
const FOV = 38;

export class TerrainEngine {
  readonly renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private cb: EngineCallbacks;
  private scenes: THREE.Scene[] = [new THREE.Scene(), new THREE.Scene()];
  private specs: ViewSpec[] = [];
  private meshes = new Map<string, MeshEntry>();
  private exaggeration = 2;
  private framedExtent = 0;
  private dirty = true;
  private raf = 0;
  private ro: ResizeObserver;
  private warmup = 0;
  private lastFrame = 0;
  private probeTime = 0;
  private probeFrames = 0;
  private probeDone = false;
  private lastMpp = -1;
  private disposed = false;

  constructor(container: HTMLElement, cb: EngineCallbacks = {}) {
    this.container = container;
    this.cb = cb;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(BG, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "3D terrain view");
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.cb.onContextLost?.();
    });
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 200000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = (82 * Math.PI) / 180;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener("change", () => (this.dirty = true));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.dirty = true;
  }

  private textureFor(entry: MeshEntry, spec: ViewSpec): THREE.DataTexture {
    const key = spec.overlay === "slope" ? "slope" : `hs|${this.exaggeration}|${spec.tone}`;
    let tex = entry.textures.get(key);
    if (!tex) {
      const { width: w, height: h } = spec.hf.meta;
      const data =
        spec.overlay === "slope"
          ? getSlopeClassRGBA(spec.hf, SLOPE_BASELINE_M)
          : getHillshadeRGBA(spec.hf, this.exaggeration, spec.tone);
      tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      tex.needsUpdate = true;
      entry.textures.set(key, tex);
    }
    return tex;
  }

  private meshFor(spec: ViewSpec): MeshEntry {
    const id = spec.hf.meta.id;
    let entry = this.meshes.get(id);
    if (!entry) {
      const stride = chooseStride(spec.hf.meta.width, spec.hf.meta.height);
      const arr = getMeshArrays(spec.hf, stride);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(arr.positions, 3));
      geom.setAttribute("uv", new THREE.BufferAttribute(arr.uvs, 2));
      geom.setIndex(new THREE.BufferAttribute(arr.index, 1));
      geom.computeBoundingSphere();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.scale.y = this.exaggeration;
      entry = { mesh, textures: new Map(), stride, meshSpacingM: arr.meshSpacingM };
      this.meshes.set(id, entry);
    }
    return entry;
  }

  /** Mesh vertex spacing (m) actually used for a heightfield, if built. */
  meshSpacing(id: string): number | null {
    return this.meshes.get(id)?.meshSpacingM ?? null;
  }

  /** Show one view (full width) or two (split, linked camera). */
  setViews(specs: ViewSpec[]) {
    const prevCount = this.specs.length;
    this.specs = specs.slice(0, 2);
    const keep = new Set(this.specs.map((s) => s.hf.meta.id));
    for (const sc of this.scenes) sc.clear();
    this.specs.forEach((spec, i) => {
      const entry = this.meshFor(spec);
      entry.mesh.material.map = this.textureFor(entry, spec);
      entry.mesh.material.needsUpdate = true;
      entry.mesh.scale.y = this.exaggeration;
      this.scenes[i].add(entry.mesh);
    });
    // dispose GPU resources of meshes that left the stage
    for (const [id, entry] of this.meshes) {
      if (!keep.has(id)) {
        this.disposeEntry(entry);
        this.meshes.delete(id);
      }
    }
    const extent = Math.max(0, ...this.specs.map((s) => Math.max(...s.hf.meta.extent_m)));
    if (Math.abs(extent - this.framedExtent) > extent * 0.05 || (prevCount > 0 && prevCount !== this.specs.length)) {
      this.framedExtent = extent;
      this.reset();
    }
    this.dirty = true;
  }

  setExaggeration(e: number) {
    if (e === this.exaggeration) return;
    this.exaggeration = e;
    this.setViews(this.specs);
  }

  private reliefTop(): number {
    let top = 0;
    for (const s of this.specs) top = Math.max(top, (s.hf.maxRel - s.hf.minRel) * this.exaggeration);
    return top;
  }

  reset() {
    const E = this.framedExtent || 4000;
    // keep the whole tile in view in narrow (split) viewports
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const n = Math.max(1, this.specs.length);
    const aspect = size.x / n / Math.max(1, size.y);
    const d = E * 1.5 * Math.max(1, 1.4 / aspect);
    const polar = (50 * Math.PI) / 180;
    const ty = this.reliefTop() * 0.35;
    // aim slightly south of the tile centre so the tile sits above the bottom info panels
    const tz = E * 0.2;
    this.controls.target.set(0, ty, tz);
    this.camera.position.set(0, ty + d * Math.cos(polar), tz + d * Math.sin(polar));
    this.controls.minDistance = E * 0.06;
    this.controls.maxDistance = Math.max(E * 2.6, d * 1.4);
    this.camera.near = Math.max(0.5, E / 5000);
    this.camera.far = E * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.dirty = true;
  }

  orbit(dAzimuth: number, dPolar: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.theta += dAzimuth;
    sph.phi = Math.min(this.controls.maxPolarAngle, Math.max(0.05, sph.phi + dPolar));
    offset.setFromSpherical(sph);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.dirty = true;
  }

  dolly(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const len = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, offset.length() * factor));
    offset.setLength(len);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.dirty = true;
  }

  /** Render now and return a PNG data URL (used for the crossfade overlay). */
  snapshot(): string | null {
    try {
      this.render();
      return this.renderer.domElement.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  private clampTarget() {
    const half = (this.framedExtent || 4000) / 2;
    const t = this.controls.target;
    const cx = Math.min(half, Math.max(-half, t.x));
    const cz = Math.min(half, Math.max(-half, t.z));
    const cy = Math.min(this.reliefTop() + half * 0.2, Math.max(-half * 0.2, t.y));
    if (cx !== t.x || cz !== t.z || cy !== t.y) {
      const delta = new THREE.Vector3(cx - t.x, cy - t.y, cz - t.z);
      t.add(delta);
      this.camera.position.add(delta);
    }
  }

  private render() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const W = size.x;
    const H = size.y;
    const n = Math.max(1, this.specs.length);
    this.renderer.setScissorTest(true);
    this.renderer.setViewport(0, 0, W, H);
    this.renderer.setScissor(0, 0, W, H);
    this.renderer.clear();
    const gap = n > 1 ? 2 : 0;
    const vw = (W - gap * (n - 1)) / n;
    this.camera.aspect = vw / H;
    this.camera.updateProjectionMatrix();
    for (let i = 0; i < this.specs.length; i++) {
      const x = i * (vw + gap);
      this.renderer.setViewport(x, 0, vw, H);
      this.renderer.setScissor(x, 0, vw, H);
      this.renderer.render(this.scenes[i], this.camera);
    }
    this.renderer.setScissorTest(false);
    const dist = this.camera.position.distanceTo(this.controls.target);
    const mpp = (2 * dist * Math.tan((FOV * Math.PI) / 360)) / H;
    if (Math.abs(mpp - this.lastMpp) > this.lastMpp * 0.01) {
      this.lastMpp = mpp;
      this.cb.onCamera?.(mpp);
    }
  }

  private loop(now: number) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.controls.update();
    this.clampTarget();
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    if (!this.probeDone && visible && this.specs.length > 0) {
      this.render();
      this.dirty = false;
      // skip warm-up frames (shader compile, texture upload, mipmaps)
      if (this.warmup < 5) {
        this.warmup++;
        this.lastFrame = now;
        return;
      }
      const dt = now - this.lastFrame;
      this.lastFrame = now;
      // Gaps ≥ 400 ms are browser throttling (background tab/pane), not render cost.
      if (dt < 400) {
        this.probeTime += dt;
        this.probeFrames++;
      }
      if (this.probeTime >= 2000) {
        this.probeDone = true;
        this.cb.onFpsProbe?.((this.probeFrames * 1000) / this.probeTime);
      }
      return;
    }
    if (this.dirty) {
      this.dirty = false;
      this.render();
    }
  }

  private disposeEntry(entry: MeshEntry) {
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
    for (const t of entry.textures.values()) t.dispose();
    entry.textures.clear();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    for (const entry of this.meshes.values()) this.disposeEntry(entry);
    this.meshes.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Quick WebGL capability check (no renderer created). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
