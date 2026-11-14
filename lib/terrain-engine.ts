import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sampleBilinear } from "./heightfield";
import type { Heightfield } from "./types";
import {
  chooseStride,
  focalCell,
  getAlbedoRGBA,
  getMeshArrays,
  getNormalMapRGBA,
  getSlopeClassRGBA,
  SLOPE_BASELINE_M,
  type Tone,
} from "./terrain-compute";

export type Overlay = "hillshade" | "slope";

export interface ViewSpec {
  hf: Heightfield;
  /** "hillshade" = physically lit terrain (measured geometry + normal map); "slope" = unlit slope-class proxy. */
  overlay: Overlay;
  tone: Tone;
}

export interface EngineCallbacks {
  /** metres per CSS pixel at the orbit target (for the scale bar). */
  onCamera?: (metresPerPx: number) => void;
  /** Average fps measured over the first ~2 s of visible rendering. */
  onFpsProbe?: (fps: number) => void;
  onContextLost?: () => void;
  /** Rover demonstration state (throttled ~6 Hz). */
  onDrive?: (s: DriveState) => void;
}

export { SLOPE_BASELINE_M };

/** Named, data-derived camera viewpoints for the guided tour. */
export type Viewpoint = "overview" | "focus" | "grazing";
export interface PaxInfo {
  clips: string[];
}
export type CameraMode = "orbit" | "follow" | "closeup";
export type PaxScale = "true" | "cinematic";
export interface DriveState {
  playing: boolean;
  started: boolean;
  /** 0..1 along the demonstration loop */
  progress: number;
  /** path length along the measured surface (horizontal, metres) */
  pathLengthM: number;
  camera: CameraMode;
  scale: PaxScale;
  /** enlargement factor of the displayed PAX relative to its ~0.5 m model height */
  enlargement: number;
}

type TerrainMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

interface MeshEntry {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, TerrainMaterial>;
  lit: THREE.MeshStandardMaterial;
  basic: THREE.MeshBasicMaterial;
  textures: Map<string, THREE.DataTexture>;
  stride: number;
  meshSpacingM: number;
  /** focus point in mesh coordinates (x east, z south), metres */
  focus: [number, number];
  grid: { pos: Float32Array; cols: number; rows: number; ex: number; ey: number };
}

interface Pose {
  target: THREE.Vector3;
  position: THREE.Vector3;
}

const BG = 0x090c11;
const FOV = 36;
const POLAR = (57 * Math.PI) / 180; // from vertical: a confident oblique view
const AZIMUTH = (28 * Math.PI) / 180; // camera south-south-east of the terrain, looking NNW
const SUN_AZ = (292 * Math.PI) / 180; // light from WNW: grazing, scarps read clearly
const SUN_ALT = (24 * Math.PI) / 180;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class TerrainEngine {
  readonly renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private cb: EngineCallbacks;
  private scenes: THREE.Scene[] = [];
  private specs: ViewSpec[] = [];
  private meshes = new Map<string, MeshEntry>();
  private exaggeration = 2;
  private framedKey = "";
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
  private introDone = false;
  private tween: { from: Pose; to: Pose; t0: number; dur: number } | null = null;
  private readonly reducedMotion: boolean;
  private userInteracting = false;
  private backdrop: THREE.Texture;
  private pax: { root: THREE.Group; mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>; current: THREE.AnimationAction | null; unit: number } | null = null;
  private paxLoading: Promise<PaxInfo | null> | null = null;
  private paxVisible = false;
  private clock = new THREE.Clock();
  private quality = 2; // 2 = full, 1 = DPR 1, 0 = DPR 1 + no shadows
  private lastShadow = 0;
  private drive = { started: false, playing: false, t: 0, periodS: 48, lastEmit: 0 };
  private camMode: CameraMode = "orbit";
  private paxScaleMode: PaxScale = "cinematic";
  private path: THREE.CatmullRomCurve3 | null = null;
  private pathLine: THREE.Line | null = null;
  private pathLengthM = 0;
  private roverYaw = 0;
  private roverTilt = new THREE.Euler();

  constructor(container: HTMLElement, cb: EngineCallbacks = {}) {
    this.container = container;
    this.cb = cb;
    this.reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(BG, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // the sun and the terrain are static: re-render the shadow map only when the scene changes
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "3D terrain view (drag to orbit, scroll to zoom)");
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.cb.onContextLost?.();
    });
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.backdrop = makeBackdrop();
    for (let i = 0; i < 2; i++) this.scenes.push(this.makeScene());

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 200000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.9;
    this.controls.maxPolarAngle = (80 * Math.PI) / 180;
    this.controls.minPolarAngle = (8 * Math.PI) / 180;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener("change", () => (this.dirty = true));
    // user input always wins over any running camera tween
    this.controls.addEventListener("start", () => {
      this.userInteracting = true;
      this.tween = null;
      if (this.camMode !== "orbit") {
        this.camMode = "orbit";
        this.camera.near = Math.max(this.paxScaleMode === "true" ? 0.03 : 0.5, 0.03);
        this.camera.updateProjectionMatrix();
        this.emitDrive(true);
      }
    });
    this.controls.addEventListener("end", () => (this.userInteracting = false));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** One scene per viewport: identical lights so Mars and Earth are lit the same way. */
  private makeScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = this.backdrop;
    const hemi = new THREE.HemisphereLight(0x9fb2c4, 0x2a1f19, 0.75);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1e0, 2.6);
    sun.name = "sun";
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.shadow.radius = 3;
    scene.add(sun);
    scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0x8aa0b8, 0.35);
    fill.name = "fill";
    scene.add(fill);
    scene.fog = new THREE.Fog(BG, 1e9, 2e9);
    return scene;
  }

  private placeLights(scene: THREE.Scene, extent: number) {
    const sun = scene.getObjectByName("sun") as THREE.DirectionalLight;
    const fill = scene.getObjectByName("fill") as THREE.DirectionalLight;
    const r = extent * 2;
    sun.position.set(Math.sin(SUN_AZ) * Math.cos(SUN_ALT) * r, Math.sin(SUN_ALT) * r, -Math.cos(SUN_AZ) * Math.cos(SUN_ALT) * r);
    sun.target.position.set(0, 0, 0);
    fill.position.set(-sun.position.x * 0.6, r * 0.5, -sun.position.z * 0.6);
    // shadow camera tightly bounds the footprint (+ relief) for crisp scarp shadows
    const cam = sun.shadow.camera as THREE.OrthographicCamera;
    const half = extent * 0.75;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = r * 0.2;
    cam.far = r * 3;
    cam.updateProjectionMatrix();
    sun.shadow.needsUpdate = true;
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.dirty = true;
  }

  private dataTexture(data: Uint8Array, w: number, h: number, color: boolean): THREE.DataTexture {
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
    return tex;
  }

  private tex(entry: MeshEntry, key: string, make: () => THREE.DataTexture): THREE.DataTexture {
    let t = entry.textures.get(key);
    if (!t) entry.textures.set(key, (t = make()));
    return t;
  }

  private meshFor(spec: ViewSpec): MeshEntry {
    const id = spec.hf.meta.id;
    let entry = this.meshes.get(id);
    if (entry) return entry;
    const { width: w, height: h, extent_m } = spec.hf.meta;
    // ≤ ~700 vertices per side keeps integrated GPUs smooth; the full-resolution normal map
    // keeps the lighting detail of every measured cell.
    const stride = chooseStride(w, h, 700);
    const arr = getMeshArrays(spec.hf, stride);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(arr.positions, 3));
    geom.setAttribute("uv", new THREE.BufferAttribute(arr.uvs, 2));
    geom.setIndex(new THREE.BufferAttribute(arr.index, 1));
    geom.computeVertexNormals();
    geom.computeBoundingSphere();

    const lit = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0, normalMapType: THREE.ObjectSpaceNormalMap });
    const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
    edgeFade(lit);
    edgeFade(basic);
    const mesh = new THREE.Mesh<THREE.BufferGeometry, TerrainMaterial>(geom, lit);

    // Honest edge: the measured footprint fades into the atmosphere at its boundary (no pedestal,
    // no invented terrain beyond the data). Shadows: terrain shades itself under the grazing sun.
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);

    const [fx, fy] = focalCell(spec.hf);
    const focus: [number, number] = [((fx + 0.5) / w - 0.5) * extent_m[0], ((fy + 0.5) / h - 0.5) * extent_m[1]];
    entry = { group, mesh, lit, basic, textures: new Map(), stride, meshSpacingM: arr.meshSpacingM, focus, grid: { pos: arr.positions, cols: arr.cols, rows: arr.rows, ex: extent_m[0], ey: extent_m[1] } };
    this.meshes.set(id, entry);
    return entry;
  }

  /** Mesh vertex spacing (m) actually used for a heightfield, if built. */
  meshSpacing(id: string): number | null {
    return this.meshes.get(id)?.meshSpacingM ?? null;
  }

  private applyMaterial(entry: MeshEntry, spec: ViewSpec) {
    const { width: w, height: h } = spec.hf.meta;
    if (spec.overlay === "slope") {
      entry.basic.map = this.tex(entry, "slope", () => this.dataTexture(getSlopeClassRGBA(spec.hf, SLOPE_BASELINE_M), w, h, true));
      entry.basic.needsUpdate = true;
      entry.mesh.material = entry.basic;
    } else {
      entry.lit.map = this.tex(entry, `alb|${spec.tone}`, () => this.dataTexture(getAlbedoRGBA(spec.hf, spec.tone), w, h, true));
      entry.lit.normalMap = this.tex(entry, "nrm", () => this.dataTexture(getNormalMapRGBA(spec.hf), w, h, false));
      entry.lit.needsUpdate = true;
      entry.mesh.material = entry.lit;
    }
  }

  /** Show one view (full width) or two (split, linked camera). */
  setViews(specs: ViewSpec[]) {
    this.specs = specs.slice(0, 2);
    const keep = new Set(this.specs.map((s) => s.hf.meta.id));
    for (const sc of this.scenes) {
      for (const child of [...sc.children]) if (child.type === "Group") sc.remove(child);
    }
    this.specs.forEach((spec, i) => {
      const entry = this.meshFor(spec);
      this.applyMaterial(entry, spec);
      entry.group.scale.y = this.exaggeration;
      this.scenes[i].add(entry.group);
      this.placeLights(this.scenes[i], Math.max(...spec.hf.meta.extent_m));
    });
    for (const [id, entry] of this.meshes) {
      if (!keep.has(id)) {
        this.disposeEntry(entry);
        this.meshes.delete(id);
      }
    }
    // Re-frame only when the framed scene set changes (not on overlay/exaggeration toggles).
    const key = this.specs.map((s) => `${s.hf.meta.id}`).join("+") + `|${this.specs.length}`;
    const extentKey = this.specs.map((s) => Math.round(Math.max(...s.hf.meta.extent_m))).join(",");
    if (this.framedKey.split("#")[1] !== extentKey || this.framedKey.split("#")[0].split("|")[1] !== String(this.specs.length)) {
      const animate = this.introDone ? "smooth" : "intro";
      this.framedKey = `${key}#${extentKey}`;
      this.frame(animate);
      this.introDone = true;
    } else {
      this.framedKey = `${key}#${extentKey}`;
    }
    this.updateFog();
    if (this.pax) this.showPax(this.paxVisible);
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  setExaggeration(e: number) {
    if (e === this.exaggeration) return;
    this.exaggeration = e;
    for (const entry of this.meshes.values()) entry.group.scale.y = e;
    if (this.pax) this.showPax(this.paxVisible);
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  private extent(): number {
    return Math.max(1, ...this.specs.map((s) => Math.max(...s.hf.meta.extent_m)));
  }

  private relief(): number {
    let top = 0;
    for (const s of this.specs) top = Math.max(top, (s.hf.maxRel - s.hf.minRel) * this.exaggeration);
    return top;
  }

  /** Aspect-aware composition: terrain fills the viewport from a confident oblique angle,
   *  aimed partly toward the strongest-relief area of the (first) heightfield. */
  private composedPose(): Pose {
    const E = this.extent();
    const R = this.relief();
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const n = Math.max(1, this.specs.length);
    const aspect = Math.max(0.3, size.x / n / Math.max(1, size.y));
    const vfov = (FOV * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    // half-width of the rotated square footprint as seen from the camera azimuth
    const halfW = (E / 2) * (Math.abs(Math.cos(AZIMUTH)) + Math.abs(Math.sin(AZIMUTH)));
    const dW = (halfW * 0.97) / Math.tan(hfov / 2);
    const halfH = (E / 2) * Math.cos(POLAR) * 1.15 + R * Math.sin(POLAR) * 0.5;
    const dH = (halfH * 0.95) / Math.tan(vfov / 2);
    const d = Math.max(dW, dH, E * 0.55);
    const first = this.specs[0] ? this.meshes.get(this.specs[0].hf.meta.id) : undefined;
    const f = n === 1 && first ? first.focus : [0, 0];
    const blend = 0.3; // stay mostly centred so the whole tile reads, lean toward the focal relief
    const target = new THREE.Vector3(f[0] * blend, R * 0.3, f[1] * blend + E * 0.04);
    const position = new THREE.Vector3(
      target.x + d * Math.sin(POLAR) * Math.sin(AZIMUTH),
      target.y + d * Math.cos(POLAR),
      target.z + d * Math.sin(POLAR) * Math.cos(AZIMUTH),
    );
    return { target, position };
  }

  private frame(mode: "intro" | "smooth" | "none") {
    const E = this.extent();
    const to = this.composedPose();
    const d = to.position.distanceTo(to.target);
    this.controls.minDistance = E * 0.08;
    this.controls.maxDistance = Math.max(E * 3, d * 1.8);
    this.camera.near = Math.max(0.5, E / 4000);
    this.camera.far = E * 30;
    this.camera.updateProjectionMatrix();
    if (this.reducedMotion || mode === "none") {
      this.applyPose(to);
      return;
    }
    let from: Pose;
    if (mode === "intro") {
      // descend from high above the footprint into the oblique composition
      const off = to.position.clone().sub(to.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.radius *= 2.1;
      sph.phi = Math.max(0.12, sph.phi - 0.55);
      sph.theta -= 0.35;
      from = { target: to.target.clone().setY(0), position: to.target.clone().add(new THREE.Vector3().setFromSpherical(sph)) };
      this.applyPose(from);
    } else {
      from = { target: this.controls.target.clone(), position: this.camera.position.clone() };
    }
    this.tween = { from, to, t0: performance.now(), dur: mode === "intro" ? 1700 : 1000 };
    this.dirty = true;
  }

  private applyPose(p: Pose) {
    this.controls.target.copy(p.target);
    this.camera.position.copy(p.position);
    this.camera.lookAt(p.target);
    this.controls.update();
    this.dirty = true;
  }

  private updateFog() {
    const E = this.extent();
    const d = this.camera.position.distanceTo(this.controls.target) || E;
    for (const sc of this.scenes) {
      const fog = sc.fog as THREE.Fog;
      fog.near = d * 0.9;
      fog.far = d * 3.2 + E;
    }
  }

  /** Pose for a named data-derived viewpoint (single-view mode). */
  private viewpointPose(v: Viewpoint): Pose {
    if (v === "overview") return this.composedPose();
    const E = this.extent();
    const spec = this.specs[0];
    const entry = spec ? this.meshes.get(spec.hf.meta.id) : undefined;
    const [fx, fz] = entry ? entry.focus : [0, 0];
    const fy = spec ? this.heightAt(spec, fx, fz) : 0;
    const target = new THREE.Vector3(fx, fy, fz);
    const polar = v === "focus" ? (60 * Math.PI) / 180 : (73 * Math.PI) / 180;
    const az = v === "focus" ? AZIMUTH + 0.55 : AZIMUTH - 0.9;
    const d = v === "focus" ? E * 0.32 : E * 0.42;
    const position = new THREE.Vector3(
      target.x + d * Math.sin(polar) * Math.sin(az),
      target.y + d * Math.cos(polar),
      target.z + d * Math.sin(polar) * Math.cos(az),
    );
    return { target, position };
  }

  /** Cinematic camera move to a viewpoint (instant under reduced motion). */
  flyTo(v: Viewpoint, durMs = 1300) {
    if (!this.specs.length) return;
    const to = this.viewpointPose(v);
    if (this.reducedMotion) {
      this.applyPose(to);
      return;
    }
    this.tween = { from: { target: this.controls.target.clone(), position: this.camera.position.clone() }, to, t0: performance.now(), dur: durMs };
    this.dirty = true;
  }

  /** Displayed (exaggerated) height of the RENDERED terrain surface at mesh coords (x east, z south):
   *  exact barycentric interpolation on the same triangles the GPU draws, so objects sit on the ground. */
  private heightAt(spec: ViewSpec, x: number, z: number): number {
    const entry = this.meshes.get(spec.hf.meta.id);
    if (!entry) {
      const { width: w, height: h, extent_m } = spec.hf.meta;
      const v = sampleBilinear(spec.hf, (x / extent_m[0] + 0.5) * w - 0.5, (z / extent_m[1] + 0.5) * h - 0.5);
      return ((Number.isNaN(v) ? spec.hf.minRel : v) - spec.hf.minRel) * this.exaggeration;
    }
    const { pos, cols, rows } = entry.grid;
    const x0 = pos[0];
    const z0 = pos[2];
    const x1 = pos[(cols - 1) * 3];
    const z1 = pos[((rows - 1) * cols) * 3 + 2];
    const fc = Math.min(cols - 1.0001, Math.max(0, ((x - x0) / (x1 - x0)) * (cols - 1)));
    const fr = Math.min(rows - 1.0001, Math.max(0, ((z - z0) / (z1 - z0)) * (rows - 1)));
    const c = Math.floor(fc);
    const r = Math.floor(fr);
    const u = fc - c;
    const v = fr - r;
    const H = (i: number) => pos[i * 3 + 1];
    const a = H(r * cols + c);
    const b = H(r * cols + c + 1);
    const d = H((r + 1) * cols + c);
    const e = H((r + 1) * cols + c + 1);
    // triangles (a,d,b) and (b,d,e), split along the b-d diagonal (u + v = 1)
    const y = u + v <= 1 ? a + (b - a) * u + (d - a) * v : e + (d - e) * (1 - u) + (b - e) * (1 - v);
    return y * this.exaggeration;
  }

  /** Load the real PAX glTF (once) into the terrain scene. Resolves with its clip names. */
  loadPax(url: string): Promise<PaxInfo | null> {
    if (this.paxLoading) return this.paxLoading;
    this.paxLoading = new Promise((resolve) => {
      new GLTFLoader().load(
        url,
        (gltf) => {
          if (this.disposed) return resolve(null);
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
          model.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) m.castShadow = true;
          });
          const root = new THREE.Group();
          root.add(model);
          const mixer = new THREE.AnimationMixer(model);
          const actions = new Map<string, THREE.AnimationAction>();
          for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
          this.pax = { root, mixer, actions, current: null, unit: Math.max(1e-6, size.y) };
          this.playPax("Idle");
          if (this.paxVisible) this.showPax(true);
          resolve({ clips: gltf.animations.map((a) => a.name) });
        },
        undefined,
        () => resolve(null),
      );
    });
    return this.paxLoading;
  }

  /** Place PAX on the measured surface beside the focal relief, facing the camera, at an ILLUSTRATIVE size.
   *  Returns the enlargement factor relative to the model's own height (for the on-screen disclosure). */
  showPax(on: boolean): number | null {
    this.paxVisible = on;
    const scene = this.scenes[0];
    if (!this.pax) return null;
    if (!on || this.specs.length !== 1) {
      scene.remove(this.pax.root);
      this.dirty = true;
      return null;
    }
    const spec = this.specs[0];
    const entry = this.meshes.get(spec.hf.meta.id);
    const E = this.extent();
    const [fx, fz] = entry ? entry.focus : [0, 0];
    const x = fx + Math.sin(AZIMUTH) * E * 0.07;
    const z = fz + Math.cos(AZIMUTH) * E * 0.07;
    const heightM = this.paxScaleMode === "cinematic" ? E * 0.022 : this.pax.unit; // true scale: glTF metres
    this.pax.root.scale.setScalar(heightM / this.pax.unit);
    if (this.drive.started) this.placeRover();
    else {
      this.pax.root.position.set(x, this.heightAt(spec, x, z), z);
      this.pax.root.rotation.set(0, AZIMUTH, 0);
    }
    scene.add(this.pax.root);
    this.ensurePath();
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    return Math.round(heightM / this.pax.unit);
  }

  private enlargement(): number {
    if (!this.pax) return 1;
    return this.paxScaleMode === "cinematic" ? Math.round((this.extent() * 0.022) / this.pax.unit) : 1;
  }

  setPaxScale(mode: PaxScale) {
    this.paxScaleMode = mode;
    if (this.pax) this.showPax(this.paxVisible);
    this.emitDrive(true);
  }

  /** Hand-defined demonstration loop around the focal relief (NOT a computed route, NOT a safety path). */
  private ensurePath() {
    const spec = this.specs[0];
    if (!spec || this.specs.length !== 1) return;
    const entry = this.meshes.get(spec.hf.meta.id);
    if (!entry) return;
    const key = spec.hf.meta.id + "|" + this.exaggeration;
    if (this.path && this.pathLine?.userData.key === key) return;
    const E = this.extent();
    const [fx, fz] = entry.focus;
    const cx = Math.max(-E * 0.25, Math.min(E * 0.25, fx));
    const cz = Math.max(-E * 0.25, Math.min(E * 0.25, fz));
    const pts: THREE.Vector3[] = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const rr = E * 0.14 * (1 + 0.22 * Math.sin(3 * th + 0.7));
      pts.push(new THREE.Vector3(cx + Math.cos(th) * rr, 0, cz + Math.sin(th) * rr));
    }
    this.path = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    // horizontal length (m)
    const samples = this.path.getSpacedPoints(400);
    let L = 0;
    for (let i = 1; i < samples.length; i++) L += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
    this.pathLengthM = L;
    // faint path line draped on the rendered surface
    const lineGeom = new THREE.BufferGeometry().setFromPoints(
      samples.map((p) => new THREE.Vector3(p.x, this.heightAt(spec, p.x, p.z) / this.exaggeration + E * 0.0015 / this.exaggeration, p.z)),
    );
    if (this.pathLine) {
      this.pathLine.parent?.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
    }
    this.pathLine = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color: 0xdf9070, dashSize: E * 0.012, gapSize: E * 0.008, transparent: true, opacity: 0.85, fog: true }));
    this.pathLine.computeLineDistances();
    this.pathLine.userData.key = key;
    entry.group.add(this.pathLine); // inherits the vertical exaggeration scale
    this.pathLine.visible = this.drive.started;
  }

  /** Put PAX on the loop at the current progress, oriented along the path and tilted to the surface. */
  private placeRover() {
    const spec = this.specs[0];
    if (!spec || !this.pax || !this.path) return;
    const t = this.drive.t % 1;
    const p = this.path.getPointAt(t);
    const tan = this.path.getTangentAt(t);
    const y = this.heightAt(spec, p.x, p.z);
    this.pax.root.position.set(p.x, y, p.z);
    this.roverYaw = Math.atan2(tan.x, tan.z);
    // surface tilt sampled across the rover footprint (displayed, exaggerated surface)
    const L = Math.max(0.4, (this.extent() * 0.022 * (this.paxScaleMode === "cinematic" ? 1 : 0)) * 0.6 || 0.5);
    const fwd = new THREE.Vector2(tan.x, tan.z).normalize();
    const side = new THREE.Vector2(-fwd.y, fwd.x);
    const hF = this.heightAt(spec, p.x + fwd.x * L, p.z + fwd.y * L);
    const hB = this.heightAt(spec, p.x - fwd.x * L, p.z - fwd.y * L);
    const hR = this.heightAt(spec, p.x + side.x * L, p.z + side.y * L);
    const hL = this.heightAt(spec, p.x - side.x * L, p.z - side.y * L);
    const pitch = Math.atan2(hF - hB, 2 * L);
    const roll = Math.atan2(hR - hL, 2 * L);
    // smooth the tilt so the model doesn't jitter on facet edges
    this.roverTilt.x += (-pitch - this.roverTilt.x) * 0.25;
    this.roverTilt.z += (roll - this.roverTilt.z) * 0.25;
    this.pax.root.rotation.set(this.roverTilt.x, this.roverYaw, this.roverTilt.z, "YXZ");
    if (this.pathLine) this.pathLine.visible = true;
  }

  private emitDrive(force = false) {
    const now = performance.now();
    if (!force && now - this.drive.lastEmit < 160) return;
    this.drive.lastEmit = now;
    this.cb.onDrive?.({
      playing: this.drive.playing,
      started: this.drive.started,
      progress: this.drive.t % 1,
      pathLengthM: this.pathLengthM,
      camera: this.camMode,
      scale: this.paxScaleMode,
      enlargement: this.enlargement(),
    });
  }

  /** Start (or restart) the terrain-following demonstration from the beginning of the loop. */
  startDrive() {
    if (!this.pax) return;
    if (!this.paxVisible) this.showPax(true);
    this.ensurePath();
    this.drive.started = true;
    this.drive.playing = true;
    this.drive.t = 0;
    this.playPax("WheelSpin");
    if (this.camMode === "orbit") this.setCameraMode("follow");
    this.placeRover();
    this.emitDrive(true);
  }

  pauseDrive() {
    this.drive.playing = false;
    this.playPax("Idle");
    this.emitDrive(true);
  }

  resumeDrive() {
    if (!this.drive.started) return this.startDrive();
    this.drive.playing = true;
    this.playPax("WheelSpin");
    this.emitDrive(true);
  }

  restartDrive() {
    this.startDrive();
  }

  stopDrive() {
    this.drive.started = false;
    this.drive.playing = false;
    this.drive.t = 0;
    if (this.pathLine) this.pathLine.visible = false;
    this.playPax("Idle");
    this.setCameraMode("orbit");
    if (this.pax) this.showPax(this.paxVisible);
    this.emitDrive(true);
  }

  setCameraMode(m: CameraMode) {
    this.camMode = m;
    this.tween = null;
    // true-scale close views need a much nearer clip plane
    this.camera.near = m === "orbit" ? Math.max(0.5, this.extent() / 4000) : this.paxScaleMode === "true" ? 0.03 : Math.max(0.2, this.extent() / 20000);
    this.camera.updateProjectionMatrix();
    if (m === "orbit") this.frame("smooth");
    this.emitDrive(true);
    this.dirty = true;
  }

  /** Chase / close-up camera that tracks PAX smoothly. */
  private trackCamera(dt = 1 / 60) {
    if (!this.pax || this.camMode === "orbit" || !this.pax.root.parent) return;
    const size = this.paxScaleMode === "cinematic" ? this.extent() * 0.022 : this.pax.unit;
    const p = this.pax.root.position;
    const yaw = this.roverYaw;
    let back: number;
    let up: number;
    let sideOff: number;
    if (this.camMode === "follow") {
      back = size * 7;
      up = size * 3.2;
      sideOff = size * 1.2;
    } else {
      back = size * 1.8;
      up = size * 0.9;
      sideOff = size * 2.6;
    }
    const desired = new THREE.Vector3(
      p.x - Math.sin(yaw) * back + Math.cos(yaw) * sideOff,
      p.y + up,
      p.z - Math.cos(yaw) * back - Math.sin(yaw) * sideOff,
    );
    // never put the camera below the rendered ground
    const spec = this.specs[0];
    if (spec) desired.y = Math.max(desired.y, this.heightAt(spec, desired.x, desired.z) + size * 0.6);
    const look = new THREE.Vector3(p.x, p.y + size * 0.55, p.z);
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 5.5); // framerate-independent smoothing
    this.camera.position.lerp(desired, k);
    this.controls.target.lerp(look, k);
    this.camera.lookAt(this.controls.target);
    this.dirty = true;
  }

  /** Play a named PAX clip; one-shot clips return to Idle when finished. */
  playPax(name: string) {
    const p = this.pax;
    if (!p) return;
    const next = p.actions.get(name) ?? p.actions.get("Idle");
    if (!next) return;
    const once = !["Idle", "SleepMode", "WheelSpin", "DriveForward"].includes(name);
    if (next === p.current && !once) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    if (p.current && p.current !== next) next.crossFadeFrom(p.current, 0.35, false);
    next.play();
    p.current = next;
    if (once) {
      const onDone = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== next) return;
        p.mixer.removeEventListener("finished", onDone);
        if (p.current === next) this.playPax("Idle");
      };
      p.mixer.addEventListener("finished", onDone);
    }
  }

  /** Restore the composed view (animated unless reduced motion). */
  reset() {
    if (!this.specs.length) return;
    this.frame("smooth");
  }

  orbit(dAzimuth: number, dPolar: number) {
    this.tween = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.theta += dAzimuth;
    sph.phi = Math.min(this.controls.maxPolarAngle, Math.max(this.controls.minPolarAngle, sph.phi + dPolar));
    offset.setFromSpherical(sph);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.dirty = true;
  }

  dolly(factor: number) {
    this.tween = null;
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
    const half = this.extent() / 2;
    const t = this.controls.target;
    const cx = Math.min(half, Math.max(-half, t.x));
    const cz = Math.min(half, Math.max(-half, t.z));
    const cy = Math.min(this.relief() + half * 0.2, Math.max(-half * 0.2, t.y));
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

  /** Step down rendering cost on slow GPUs (measured, not guessed). Geometry/data are untouched. */
  private degrade(fps: number) {
    this.quality = fps < 20 ? 0 : Math.min(this.quality - 1, 1);
    this.renderer.setPixelRatio(1);
    if (this.quality === 0) {
      this.renderer.shadowMap.enabled = false;
      for (const e of this.meshes.values()) {
        e.lit.needsUpdate = true;
        e.basic.needsUpdate = true;
      }
    }
    this.resize();
    console.info(`[PARALLAX X] measured ${fps.toFixed(1)} fps -> render quality ${this.quality} (DPR 1${this.quality === 0 ? ", shadows off" : ""})`);
  }

  private stepTween(now: number) {
    const tw = this.tween;
    if (!tw || this.userInteracting) return;
    const t = Math.min(1, (now - tw.t0) / tw.dur);
    const k = easeInOutCubic(t);
    const target = tw.from.target.clone().lerp(tw.to.target, k);
    // interpolate in spherical coordinates around the moving target for a natural glide
    const a = new THREE.Spherical().setFromVector3(tw.from.position.clone().sub(tw.from.target));
    const b = new THREE.Spherical().setFromVector3(tw.to.position.clone().sub(tw.to.target));
    let dTheta = b.theta - a.theta;
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    const s = new THREE.Spherical(a.radius + (b.radius - a.radius) * k, a.phi + (b.phi - a.phi) * k, a.theta + dTheta * k);
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));
    this.camera.lookAt(target);
    this.dirty = true;
    if (t >= 1) this.tween = null;
  }

  private loop(now: number) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.pax && this.paxVisible && this.pax.root.parent) {
      this.pax.mixer.update(this.reducedMotion ? 0 : dt);
      if (this.drive.started) {
        if (this.drive.playing) this.drive.t = (this.drive.t + dt / this.drive.periodS) % 1;
        this.placeRover();
        this.trackCamera(dt);
        this.emitDrive();
        if (now - this.lastShadow > 140) {
          this.lastShadow = now;
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
      this.dirty = true;
    }
    this.stepTween(now);
    if (this.camMode === "orbit" || !this.drive.started) this.controls.update();
    this.clampTarget();
    if (this.dirty) this.updateFog();
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    if (!this.probeDone && visible && this.specs.length > 0) {
      this.render();
      this.dirty = false;
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
        const fps = (this.probeFrames * 1000) / this.probeTime;
        if (fps < 30 && this.quality > 0) {
          this.degrade(fps);
          this.probeTime = 0;
          this.probeFrames = 0;
          this.warmup = 0;
          return;
        }
        this.probeDone = true;
        this.cb.onFpsProbe?.(fps);
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
    entry.lit.dispose();
    entry.basic.dispose();
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
    this.backdrop.dispose();
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
    }
    if (this.pax) {
      this.pax.mixer.stopAllAction();
      this.pax.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

/** Soft fade of the terrain colour into the background over the outer ~7 % of the footprint. */
function edgeFade(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEdgeColor = { value: new THREE.Color(BG) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vEdgeUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvEdgeUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vEdgeUv;\nuniform vec3 uEdgeColor;")
      .replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\nfloat edgeD = max(abs(vEdgeUv.x - 0.5), abs(vEdgeUv.y - 0.5));\nfloat edgeK = smoothstep(0.36, 0.5, edgeD);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeColor, edgeK * 0.92);",
      );
  };
  mat.needsUpdate = true;
}

/** Atmospheric backdrop: deep graphite with a faint cool horizon haze (screen-space gradient). */
function makeBackdrop(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#07090d");
  grd.addColorStop(0.55, "#0e141b");
  grd.addColorStop(0.72, "#121a22");
  grd.addColorStop(1, "#090c11");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
