/**
 * Renderer-independent spatial math.
 *
 * Convention (docs/BLUEPRINT.md, "Architecture and data"):
 * right-handed, +Y up, metres. Positive yaw is a rotation about +Y following the
 * Three.js convention, and a neutral viewer faces -Z. This module must never
 * import Three.js: the scene layer converts these plain values into objects.
 */

/** A position or offset in metres. */
export type Vec3 = readonly [x: number, y: number, z: number];

/** A rigid placement: translation plus a yaw-only rotation. */
export interface Transform {
  readonly position: Vec3;
  readonly yawDegrees: number;
}

export const ORIGIN: Vec3 = [0, 0, 0];

export const IDENTITY: Transform = { position: ORIGIN, yawDegrees: 0 };

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;

export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;

/**
 * Normalises any angle to the half-open range [-180, 180).
 *
 * Snap turning accumulates yaw indefinitely, so every angle that reaches the
 * scene or storage passes through here to stay comparable and printable.
 */
export function normaliseYaw(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  // `-0` compares equal to `0` but serialises differently; keep it out of saved data.
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Rotates a vector about +Y. Matches Three.js `Object3D.rotation.y`. */
export function rotateY(v: Vec3, degrees: number): Vec3 {
  const theta = degToRad(degrees);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const [x, y, z] = v;
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Straight-line distance in metres. */
export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Horizontal distance, ignoring height. Used for teleport and reach checks. */
export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/** Applies a transform to a point expressed in that transform's local space. */
export function applyTransform(parent: Transform, local: Vec3): Vec3 {
  return addVec3(rotateY(local, parent.yawDegrees), parent.position);
}

/**
 * Composes two transforms: `compose(room, locus)` maps locus-local space to world
 * space. Composition is left-to-right, so world = room x locus x node.
 */
export function compose(parent: Transform, child: Transform): Transform {
  return {
    position: applyTransform(parent, child.position),
    yawDegrees: normaliseYaw(parent.yawDegrees + child.yawDegrees),
  };
}

/** Composes an ordered chain, outermost first. */
export function composeAll(transforms: readonly Transform[]): Transform {
  return transforms.reduce(compose, IDENTITY);
}

/** The unit forward direction of a transform. A yaw of 0 faces -Z. */
export function forward(transform: Transform): Vec3 {
  return rotateY([0, 0, -1], transform.yawDegrees);
}

/**
 * The yaw that makes a viewer standing at `from` face `target`.
 * Returns the viewer's current yaw when the two points coincide horizontally,
 * so recentring on top of a target never snaps the view to an arbitrary angle.
 */
export function yawTowards(from: Vec3, target: Vec3, fallbackYaw = 0): number {
  const dx = target[0] - from[0];
  const dz = target[2] - from[2];
  if (Math.hypot(dx, dz) < 1e-6) return normaliseYaw(fallbackYaw);
  // Forward at yaw 0 is -Z, so the angle is measured from that axis.
  return normaliseYaw(radToDeg(Math.atan2(-dx, -dz)));
}

/** Clamps a value into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
