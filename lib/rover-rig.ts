import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Expedition rover rig.
 *
 * Asset: NASA/JPL-Caltech "Mars 2020 Perseverance Rover" glTF (NASA 3D Resources, published "free and without
 * copyright"), with the NASA insignia, the JPL logotype and the mission wordmarks painted out of its textures
 * (see docs/ROVER_MODEL.md). It is used as a realistic visual stand-in only: PARALLAX X is not affiliated with,
 * operated by or endorsed by NASA/JPL.
 *
 * The source model ships all six wheels as ONE mesh, so the rig splits that mesh into six wheel pivots (one per
 * wheel, clustered by triangle position) and spins each about its own axle from the distance actually travelled.
 * The remote-sensing mast head is panned/tilted procedurally. Nothing here is physics: no suspension travel,
 * no wheel–soil interaction, no traction.
 */

export const ROVER_URL = "/models/expedition-rover.glb";
const DRACO_PATH = "/draco/";
/** time in the source mast clips at which the mast is raised and the head unfolded */
const MAST_DEPLOYED_S = 2.7;
const DUST = new THREE.Color(0.9, 0.82, 0.74);

export interface RoverRig {
  /** Origin on the ground at the chassis centre; +Z is forward, +Y up; units are metres of the source model. */
  root: THREE.Group;
  heightM: number;
  lengthM: number;
  wheelRadiusM: number;
  /** Advance the wheels by a travelled distance (metres in model units) and step procedural motion. */
  update(dt: number, travelled: number): void;
  /** Mast-head survey sweep (pan left → right → centre), ~2.6 s. */
  scan(): void;
  /** Raise (rigged source clip, ~2.6 s) or stow the remote-sensing mast. */
  setMast(deployed: boolean, animate?: boolean): void;
  /** 0 = stowed, 1 = deployed */
  readonly mastProgress: number;
  dispose(): void;
}

/** 1×1 neutral textures so every rover material has the same shader features (one program instead of many). */
function neutralTextures() {
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.colorSpace = THREE.SRGBColorSpace;
  white.needsUpdate = true;
  const flat = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  flat.needsUpdate = true;
  return { white, flat };
}

const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

let draco: DRACOLoader | null = null;
let dracoUsers = 0;

function acquireDraco(): DRACOLoader {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
  }
  dracoUsers++;
  return draco;
}

function releaseDraco() {
  dracoUsers = Math.max(0, dracoUsers - 1);
  if (!dracoUsers && draco) {
    draco.dispose();
    draco = null;
  }
}

export function disposeObject(root: THREE.Object3D) {
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

/** 1-D k-means for the three wheel stations along the chassis. */
function kmeans1(values: number[], k: number): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  let c = Array.from({ length: k }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / k);
  for (let it = 0; it < 20; it++) {
    const sum = new Array(k).fill(0);
    const n = new Array(k).fill(0);
    for (const v of values) {
      let best = 0;
      for (let j = 1; j < k; j++) if (Math.abs(v - c[j]) < Math.abs(v - c[best])) best = j;
      sum[best] += v;
      n[best]++;
    }
    c = c.map((cj, j) => (n[j] ? sum[j] / n[j] : cj));
  }
  return c.sort((a, b) => a - b);
}

/**
 * Split the single six-wheel mesh into six pivots that can each spin about their own axle (local X).
 * No vertex data is copied: each wheel is an index subset over the original (shared) attributes, offset so that
 * its pivot sits at the wheel centre.
 */
function splitWheels(node: THREE.Object3D): { pivots: THREE.Group[]; radius: number } {
  const meshes: THREE.Mesh[] = [];
  node.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  if (!meshes.length) return { pivots: [], radius: 0.26 };
  node.updateMatrixWorld(true);
  const toNode = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const local = meshes.map((m) => new THREE.Matrix4().multiplyMatrices(toNode, m.matrixWorld));
  // pass 1: triangle centroids (x, z) in node space
  const cx: Float32Array[] = [];
  const cz: Float32Array[] = [];
  const v = new THREE.Vector3();
  meshes.forEach((m, mi) => {
    const g = m.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const nTri = (idx ? idx.count : pos.count) / 3;
    const ax = new Float32Array(nTri);
    const az = new Float32Array(nTri);
    for (let t = 0; t < nTri; t++) {
      let sx = 0;
      let sz = 0;
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + k) : t * 3 + k).applyMatrix4(local[mi]);
        sx += v.x;
        sz += v.z;
      }
      ax[t] = sx / 3;
      az[t] = sz / 3;
    }
    cx.push(ax);
    cz.push(az);
  });
  const sample: number[] = [];
  for (const a of cz) for (let t = 0; t < a.length; t += 7) sample.push(a[t]);
  const zs = kmeans1(sample, 3);
  const wheelOf = (x: number, z: number) => {
    let best = 0;
    for (let j = 1; j < 3; j++) if (Math.abs(z - zs[j]) < Math.abs(z - zs[best])) best = j;
    return (x < 0 ? 0 : 3) + best;
  };
  // pass 2: per wheel, per primitive index lists + bounds
  const lists: number[][][] = Array.from({ length: 6 }, () => meshes.map(() => []));
  const boxes = Array.from({ length: 6 }, () => new THREE.Box3());
  meshes.forEach((m, mi) => {
    const g = m.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    for (let t = 0; t < cx[mi].length; t++) {
      const w = wheelOf(cx[mi][t], cz[mi][t]);
      const out = lists[w][mi];
      for (let k = 0; k < 3; k++) {
        const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k;
        out.push(vi);
        boxes[w].expandByPoint(v.fromBufferAttribute(pos, vi).applyMatrix4(local[mi]));
      }
    }
  });
  const pivots: THREE.Group[] = [];
  let radiusSum = 0;
  for (let w = 0; w < 6; w++) {
    if (boxes[w].isEmpty()) continue;
    const centre = boxes[w].getCenter(new THREE.Vector3());
    const size = boxes[w].getSize(new THREE.Vector3());
    radiusSum += (size.y + size.z) / 4;
    const pivot = new THREE.Group();
    pivot.name = `wheel_${w}`;
    pivot.position.copy(centre);
    meshes.forEach((m, mi) => {
      const ids = lists[w][mi];
      if (!ids.length) return;
      const geo = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(m.geometry.attributes)) geo.setAttribute(name, attr);
      geo.setIndex(ids);
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.max(size.x, size.y, size.z));
      geo.boundingSphere.center.copy(centre).applyMatrix4(new THREE.Matrix4().copy(local[mi]).invert());
      const mesh = new THREE.Mesh(geo, m.material);
      mesh.castShadow = true;
      // child transform: node-space placement of the source mesh, re-expressed relative to the wheel centre
      mesh.matrixAutoUpdate = false;
      mesh.matrix.makeTranslation(-centre.x, -centre.y, -centre.z).multiply(local[mi]);
      pivot.add(mesh);
    });
    pivots.push(pivot);
  }
  for (const m of meshes) m.parent?.remove(m); // geometry attributes are now owned by the wheel subsets
  for (const p of pivots) node.add(p);
  return { pivots, radius: pivots.length ? radiusSum / pivots.length : 0.26 };
}

/**
 * Load the rover once per caller. `renderer` is used to pre-filter a small studio environment so the metal and
 * composite materials read correctly; the environment is applied to the rover materials only (never the terrain).
 */
export async function loadRover(renderer: THREE.WebGLRenderer, url = ROVER_URL): Promise<RoverRig> {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(acquireDraco());
  const t0 = performance.now();
  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } finally {
    releaseDraco();
  }

  const model = gltf.scene;
  const mark = (label: string) => console.info(`[PARALLAX X] rover ${label}: ${Math.round(performance.now() - t0)} ms`);
  await nextTask(); // keep the page responsive between setup steps

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  disposeObject(room);
  pmrem.dispose();
  mark("environment");
  await nextTask();

  // One material model for the whole rover: physical extensions (clearcoat, specular, IOR, transmission) are
  // folded into MeshStandardMaterial. That collapses dozens of shader variants into a handful, which is what
  // dominated first-frame time on integrated GPUs; transmission alone would add a full extra scene pass.
  const converted = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  const neutral = neutralTextures();
  const toStandard = (mat: THREE.Material): THREE.MeshStandardMaterial => {
    const hit = converted.get(mat);
    if (hit) return hit;
    const src = mat as THREE.MeshPhysicalMaterial;
    const out = new THREE.MeshStandardMaterial({
      name: src.name,
      color: src.color?.clone() ?? new THREE.Color(1, 1, 1),
      map: src.map ?? neutral.white,
      normalMap: src.normalMap ?? neutral.flat,
      normalScale: src.normalScale?.clone(),
      roughness: src.roughnessMap ? Math.min(1, (src.roughness ?? 1) * 0.75) : (src.roughness ?? 1),
      metalness: src.metalnessMap ? (src.metalness ?? 0) * 0.8 : (src.metalness ?? 0),
      transparent: src.transparent || (src.transmission ?? 0) > 0,
      opacity: (src.transmission ?? 0) > 0 ? Math.min(src.opacity ?? 1, 0.35) : (src.opacity ?? 1),
      side: THREE.FrontSide,
      envMap: envRT.texture,
      envMapIntensity: 0.55,
    });
    // light Mars dust on painted/composite surfaces (illustrative weathering, not a measured property)
    if (out.metalness < 0.5) out.color.multiply(DUST);
    converted.set(mat, out);
    return out;
  };
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = false;
    m.material = Array.isArray(m.material) ? m.material.map(toStandard) : toStandard(m.material);
  });
  // the originals are no longer referenced (their textures live on in the converted materials)
  for (const src of converted.keys()) {
    // textures we dropped (roughness/metalness/ao/emissive/alpha) are no longer referenced anywhere
    const p = src as THREE.MeshPhysicalMaterial;
    for (const t of [p.roughnessMap, p.metalnessMap, p.aoMap, p.emissiveMap, p.alphaMap]) if (t && t !== p.map && t !== p.normalMap) t.dispose();
    src.dispose();
  }
  mark(`materials (${new Set(converted.values()).size})`);
  await nextTask();

  const wheelsNode = model.getObjectByName("Wheels_objs");
  const { pivots, radius } = wheelsNode ? splitWheels(wheelsNode) : { pivots: [], radius: 0.26 };
  mark(`wheels split (${pivots.length})`);

  // Remote-sensing mast: the source rig's own clips raise the mast (0–1.5 s) and unfold the head (1.5–2.6 s).
  const mixer = new THREE.AnimationMixer(model);
  const mastClips = gltf.animations.filter((c) => c.name === "CylinderAction" || c.name === "topAction");
  for (const c of mastClips) {
    const a = mixer.clipAction(c);
    a.play();
  }
  const hasMast = mastClips.length === 2;
  let mastT = MAST_DEPLOYED_S;
  let mastTarget = MAST_DEPLOYED_S;
  mixer.setTime(mastT);
  // head pan happens on the node just below the deploy hinges, about the world vertical
  const panNode = model.getObjectByName("Cylinder002") ?? null;
  const pan0 = panNode ? panNode.quaternion.clone() : null;

  // ground the model (mast deployed): origin under the chassis centre, wheels touching y = 0
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(centre.x, box.min.y, centre.z));
  const root = new THREE.Group();
  root.name = "expedition-rover";
  root.add(model);

  let wheelAngle = 0;
  let scanT = -1;
  let idleT = 0;
  const qPan = new THREE.Quaternion();
  const qParent = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  return {
    root,
    heightM: size.y,
    lengthM: Math.max(size.z, size.x),
    wheelRadiusM: radius,
    update(dt, travelled) {
      if (travelled) {
        wheelAngle += travelled / Math.max(0.05, radius);
        for (const p of pivots) p.rotation.x = wheelAngle;
      }
      idleT += dt;
      if (hasMast && mastT !== mastTarget) {
        mastT = mastTarget > mastT ? Math.min(mastTarget, mastT + dt) : Math.max(mastTarget, mastT - dt * 1.5);
        mixer.setTime(mastT);
      }
      if (panNode && pan0 && mastT >= MAST_DEPLOYED_S - 1e-3) {
        let yaw: number;
        if (scanT >= 0) {
          scanT += dt;
          const u = Math.min(1, scanT / 2.6);
          yaw = Math.sin(u * Math.PI * 2) * 0.8; // ±46° survey sweep
          if (u >= 1) scanT = -1;
        } else {
          yaw = Math.sin(idleT * 0.35) * 0.1; // slow idle drift
        }
        // world vertical expressed in the pan node's parent frame (the source rig's local axes are arbitrary)
        panNode.parent!.getWorldQuaternion(qParent);
        root.getWorldQuaternion(qPan);
        axis.copy(UP).applyQuaternion(qPan).applyQuaternion(qParent.invert()).normalize();
        qPan.setFromAxisAngle(axis, yaw);
        panNode.quaternion.copy(pan0).premultiply(qPan);
      }
    },
    setMast(deployed, animate = true) {
      mastTarget = deployed ? MAST_DEPLOYED_S : 0;
      if (!animate) {
        mastT = mastTarget;
        mixer.setTime(mastT);
      }
    },
    get mastProgress() {
      return mastT / MAST_DEPLOYED_S;
    },
    scan() {
      scanT = 0;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      disposeObject(root);
      envRT.dispose();
    },
  };
}
