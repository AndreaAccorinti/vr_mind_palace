/**
 * Viewer placement and comfort rules.
 *
 * WebXR owns the headset pose. Everything here describes the *origin* the
 * runtime's tracking space is attached to — the user's feet — so turning and
 * teleporting move the world under a stationary head rather than dragging the
 * camera. The scene layer applies this state to an `<XROrigin>`; this module
 * only does the arithmetic, so the same rules are testable without a headset.
 */

import {
  clamp,
  forward,
  horizontalDistance,
  normaliseYaw,
  yawTowards,
  type Transform,
  type Vec3,
} from './geometry.ts';

/** Seated users stay put; standing users may also walk physically. */
export type PostureMode = 'seated' | 'standing';

export type TurnDirection = 'left' | 'right';

/** Comfort default from docs/BLUEPRINT.md. Snap turning avoids vection. */
export const SNAP_TURN_DEGREES = 30;

/**
 * How far the origin is raised in seated mode, in metres.
 *
 * A seated user's head sits roughly this far below standing eye height, so
 * lifting the origin puts the room at a natural level without moving the
 * headset pose. It is a starting value to be confirmed on the device, not a
 * measured anthropometric constant.
 */
export const SEATED_EYE_OFFSET_METRES = 0.45;

/** Largest teleport hop, in metres. Keeps a single input from crossing a room. */
export const MAX_TELEPORT_DISTANCE_METRES = 12;

/** Where the viewer stands and which way they face. */
export interface ViewerPose {
  /** World-space floor position of the XR origin. */
  readonly position: Vec3;
  readonly yawDegrees: number;
}

export interface ViewerState {
  readonly pose: ViewerPose;
  readonly posture: PostureMode;
  /** The pose `recenter` returns to — the room's designed viewing spot. */
  readonly home: ViewerPose;
}

/** A rectangular floor region a viewer may teleport within, in world space. */
export interface FloorBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export function createViewerState(home: ViewerPose, posture: PostureMode = 'standing'): ViewerState {
  const pose = normalisePose(home);
  return { pose, posture, home: pose };
}

function normalisePose(pose: ViewerPose): ViewerPose {
  return { position: pose.position, yawDegrees: normaliseYaw(pose.yawDegrees) };
}

/**
 * Rotates the origin by one snap step.
 *
 * A positive yaw turns left in the Three.js convention, so turning right
 * subtracts. Position is untouched: the user pivots in place.
 */
export function snapTurn(
  state: ViewerState,
  direction: TurnDirection,
  degrees: number = SNAP_TURN_DEGREES,
): ViewerState {
  const delta = direction === 'left' ? degrees : -degrees;
  return {
    ...state,
    pose: { ...state.pose, yawDegrees: normaliseYaw(state.pose.yawDegrees + delta) },
  };
}

/** Whether a teleport request is inside the floor and within one hop. */
export function canTeleportTo(state: ViewerState, target: Vec3, bounds: FloorBounds): boolean {
  if (!target.every(Number.isFinite)) return false;
  if (target[0] < bounds.minX || target[0] > bounds.maxX) return false;
  if (target[2] < bounds.minZ || target[2] > bounds.maxZ) return false;
  return horizontalDistance(state.pose.position, target) <= MAX_TELEPORT_DISTANCE_METRES;
}

/**
 * Moves the origin to a floor point, keeping the user's facing.
 *
 * Out-of-range requests are clamped into the floor rather than rejected, so a
 * ray that lands just past a wall still produces a sensible move instead of
 * silently doing nothing. Height is taken from the floor, never from the ray,
 * which is what keeps the user from ending up inside or above the geometry.
 */
export function teleportTo(state: ViewerState, target: Vec3, bounds: FloorBounds): ViewerState {
  if (!target.every(Number.isFinite)) return state;
  const position: Vec3 = [
    clamp(target[0], bounds.minX, bounds.maxX),
    state.home.position[1],
    clamp(target[2], bounds.minZ, bounds.maxZ),
  ];
  return { ...state, pose: { ...state.pose, position } };
}

/**
 * Returns to the room's designed viewing spot.
 *
 * Recentring is the escape hatch for a drifting guardian origin or a user who
 * has physically walked away, so it restores position *and* facing.
 */
export function recenter(state: ViewerState): ViewerState {
  return { ...state, pose: state.home };
}

export function setPosture(state: ViewerState, posture: PostureMode): ViewerState {
  return { ...state, posture };
}

/** Moves the home pose when the viewer changes room, and recentres onto it. */
export function setHome(state: ViewerState, home: ViewerPose): ViewerState {
  const next = normalisePose(home);
  return { ...state, home: next, pose: next };
}

/**
 * The transform to apply to the XR origin object.
 *
 * Seated mode raises the origin so the room meets a seated head at a
 * comfortable level. Standing mode leaves the floor where the runtime put it.
 */
export function originTransform(state: ViewerState): Transform {
  const lift = state.posture === 'seated' ? SEATED_EYE_OFFSET_METRES : 0;
  const [x, y, z] = state.pose.position;
  return { position: [x, y + lift, z], yawDegrees: state.pose.yawDegrees };
}

/**
 * A viewing pose for a locus: standing `distanceMetres` in front of it, facing it.
 *
 * "In front of" is the locus's own forward direction, so an author places a prop
 * and gets a sensible place to stand without specifying a second transform.
 */
export function viewingPoseFor(
  locusWorld: Transform,
  distanceMetres: number,
  floorHeight = 0,
): ViewerPose {
  // Step out along the locus's own forward direction, then stand on the floor.
  const dir = forward(locusWorld);
  const position: Vec3 = [
    locusWorld.position[0] + dir[0] * distanceMetres,
    floorHeight,
    locusWorld.position[2] + dir[2] * distanceMetres,
  ];
  return { position, yawDegrees: yawTowards(position, locusWorld.position, locusWorld.yawDegrees) };
}
