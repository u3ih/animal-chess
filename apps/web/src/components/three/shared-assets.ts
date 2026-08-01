import * as THREE from "three";

/**
 * Module-singleton geometries + materials shared across the 16 pieces (and board rings). Every
 * animal was previously built from per-part inline geometry/material, so a single lion spawned ~50
 * geometries + materials × 16 pieces ≈ 1000+ GPU objects. Sharing eliminates that churn (draw calls
 * are unchanged — that would need instancing) and lets us drop sphere tessellation.
 *
 * Only import this from the `dynamic(ssr:false)` canvas tree — it runs `new THREE.*` at module load.
 * Objects handed to a mesh via `geometry=`/`material=` props are NOT auto-disposed by r3f (desired),
 * so never mutate a shared material per-instance (hover/frame-animated materials stay inline).
 */

/** Unit sphere (r=1); scale per-mesh. 20×14 segs (was 32×24) ≈ 60% fewer verts. */
export const UNIT_SPHERE = new THREE.SphereGeometry(1, 20, 14);
/** Unit box (1×1×1); box UVs are 0..1 per face, so non-uniform scaling is lossless. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
/** The team neck scarf torus — one shape worn by every piece. */
export const COLLAR_TORUS = new THREE.TorusGeometry(0.21, 0.052, 12, 28);

const coneCache = new Map<number, THREE.ConeGeometry>();
/** Unit cone (r=1, h=1) at a radial segment count; scale [r, h, r] per-mesh. */
export function getConeGeometry(seg: number): THREE.ConeGeometry {
  let geo = coneCache.get(seg);
  if (!geo) {
    geo = new THREE.ConeGeometry(1, 1, seg);
    coneCache.set(seg, geo);
  }
  return geo;
}

const cylinderCache = new Map<string, THREE.CylinderGeometry>();
/** Two radii can't be unit-scaled together, so cache exact (rTop, rBottom, h) cylinders. */
export function getCylinderGeometry(rTop: number, rBottom: number, h: number, seg = 20): THREE.CylinderGeometry {
  const key = `${rTop}|${rBottom}|${h}|${seg}`;
  let geo = cylinderCache.get(key);
  if (!geo) {
    geo = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
    cylinderCache.set(key, geo);
  }
  return geo;
}

const capsuleCache = new Map<string, THREE.CapsuleGeometry>();
/** Capsule caps don't scale non-uniformly, so cache exact (r, len) capsules. */
export function getCapsuleGeometry(r: number, len: number): THREE.CapsuleGeometry {
  const key = `${r}|${len}`;
  let geo = capsuleCache.get(key);
  if (!geo) {
    geo = new THREE.CapsuleGeometry(r, len, 6, 12);
    capsuleCache.set(key, geo);
  }
  return geo;
}

const ringCache = new Map<string, THREE.RingGeometry>();
export function getRingGeometry(inner: number, outer: number, seg: number): THREE.RingGeometry {
  const key = `${inner}|${outer}|${seg}`;
  let geo = ringCache.get(key);
  if (!geo) {
    geo = new THREE.RingGeometry(inner, outer, seg);
    ringCache.set(key, geo);
  }
  return geo;
}

const standardCache = new Map<string, THREE.MeshStandardMaterial>();
/** Shared, immutable standard material keyed by look. Never mutate the returned instance. */
export function getStandardMaterial(color: string, rough = 0.5, metal = 0.02): THREE.MeshStandardMaterial {
  const key = `${color}|${rough}|${metal}`;
  let mat = standardCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    standardCache.set(key, mat);
  }
  return mat;
}

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Shared, immutable basic material keyed by (color, opacity, depthWrite). Never mutate the result. */
export function getBasicMaterial(color: string, opacity = 1, depthWrite = true): THREE.MeshBasicMaterial {
  const key = `${color}|${opacity}|${depthWrite}`;
  let mat = basicCache.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite });
    basicCache.set(key, mat);
  }
  return mat;
}
