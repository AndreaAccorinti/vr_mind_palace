import { describe, expect, it } from 'vitest';
import { distance, type Transform } from './geometry.ts';
import {
  canTeleportTo,
  createViewerState,
  MAX_TELEPORT_DISTANCE_METRES,
  originTransform,
  recenter,
  SEATED_EYE_OFFSET_METRES,
  setPosture,
  snapTurn,
  SNAP_TURN_DEGREES,
  teleportTo,
  viewingPoseFor,
  type FloorBounds,
} from './viewer.ts';

const bounds: FloorBounds = { minX: -2.4, maxX: 2.4, minZ: -2.4, maxZ: 2.4 };
const start = createViewerState({ position: [0, 0, 1], yawDegrees: 0 });

describe('snapTurn', () => {
  it('turns left by the comfort step and leaves position alone', () => {
    const turned = snapTurn(start, 'left');
    expect(turned.pose.yawDegrees).toBeCloseTo(SNAP_TURN_DEGREES, 6);
    expect(turned.pose.position).toEqual(start.pose.position);
  });

  it('turns right in the opposite direction', () => {
    expect(snapTurn(start, 'right').pose.yawDegrees).toBeCloseTo(-SNAP_TURN_DEGREES, 6);
  });

  it('returns to the starting yaw after a full circle', () => {
    let state = start;
    for (let i = 0; i < 360 / SNAP_TURN_DEGREES; i += 1) state = snapTurn(state, 'right');
    expect(state.pose.yawDegrees).toBeCloseTo(0, 6);
  });
});

describe('teleportTo', () => {
  it('moves to a point inside the floor', () => {
    expect(teleportTo(start, [1.5, 0, -1], bounds).pose.position).toEqual([1.5, 0, -1]);
  });

  it('keeps the current facing, so arriving never reorients the user', () => {
    const turned = snapTurn(start, 'left');
    expect(teleportTo(turned, [1, 0, 1], bounds).pose.yawDegrees).toBe(turned.pose.yawDegrees);
  });

  it('clamps a ray that lands past a wall instead of moving into it', () => {
    expect(teleportTo(start, [99, 0, -99], bounds).pose.position).toEqual([2.4, 0, -2.4]);
  });

  it('takes height from the floor, not from the ray', () => {
    // A ray hitting a raised prop must not leave the user standing in mid-air.
    expect(teleportTo(start, [1, 1.8, 1], bounds).pose.position[1]).toBe(0);
  });

  it('ignores a non-finite target rather than producing NaN coordinates', () => {
    expect(teleportTo(start, [Number.NaN, 0, 0], bounds)).toBe(start);
    expect(teleportTo(start, [0, 0, Number.POSITIVE_INFINITY], bounds)).toBe(start);
  });
});

describe('canTeleportTo', () => {
  it('accepts a reachable point inside the floor', () => {
    expect(canTeleportTo(start, [1, 0, 0], bounds)).toBe(true);
  });

  it('rejects a point outside the floor', () => {
    expect(canTeleportTo(start, [5, 0, 0], bounds)).toBe(false);
  });

  it('rejects a hop longer than one step', () => {
    const wide: FloorBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    expect(canTeleportTo(start, [MAX_TELEPORT_DISTANCE_METRES + 5, 0, 1], wide)).toBe(false);
  });
});

describe('recenter', () => {
  it('restores both position and facing', () => {
    const wandered = snapTurn(teleportTo(start, [2, 0, -2], bounds), 'left');
    const back = recenter(wandered);
    expect(back.pose).toEqual(start.home);
  });

  it('keeps the chosen posture', () => {
    const seated = setPosture(start, 'seated');
    expect(recenter(snapTurn(seated, 'left')).posture).toBe('seated');
  });
});

describe('originTransform', () => {
  it('leaves the floor alone when standing', () => {
    expect(originTransform(start).position[1]).toBe(0);
  });

  it('raises the origin when seated so the room meets a seated head', () => {
    const seated = setPosture(start, 'seated');
    expect(originTransform(seated).position[1]).toBeCloseTo(SEATED_EYE_OFFSET_METRES, 6);
  });

  it('does not move the user horizontally when posture changes', () => {
    const seated = originTransform(setPosture(start, 'seated'));
    const standing = originTransform(start);
    expect(seated.position[0]).toBe(standing.position[0]);
    expect(seated.position[2]).toBe(standing.position[2]);
  });
});

describe('viewingPoseFor', () => {
  it('stands the given distance in front of a locus', () => {
    // Facing +Z (yaw 180) puts the viewing spot on the +Z side.
    const locus: Transform = { position: [0, 0, -2.5], yawDegrees: 180 };
    const pose = viewingPoseFor(locus, 1.6);
    expect(distance(pose.position, [0, 0, -0.9])).toBeLessThan(1e-6);
  });

  it('faces back towards the locus', () => {
    const locus: Transform = { position: [0, 0, -2.5], yawDegrees: 180 };
    expect(Math.abs(viewingPoseFor(locus, 1.6).yawDegrees)).toBeCloseTo(0, 6);
  });

  it('works for a locus rotated off axis', () => {
    const locus: Transform = { position: [2.1, 0, -1.9], yawDegrees: 160 };
    const pose = viewingPoseFor(locus, 1.6, 0);
    // The standing spot is exactly the requested distance away, on the floor.
    expect(distance(pose.position, locus.position)).toBeCloseTo(1.6, 6);
    expect(pose.position[1]).toBe(0);
  });
});
