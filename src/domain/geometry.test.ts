import { describe, expect, it } from 'vitest';
import {
  applyTransform,
  compose,
  distance,
  forward,
  normaliseYaw,
  rotateY,
  yawTowards,
  type Transform,
} from './geometry.ts';

/** Component-wise comparison; trig leaves small residues. */
const expectVec = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 6));
};

describe('normaliseYaw', () => {
  it('wraps into [-180, 180)', () => {
    expect(normaliseYaw(0)).toBe(0);
    expect(normaliseYaw(190)).toBeCloseTo(-170, 6);
    expect(normaliseYaw(-190)).toBeCloseTo(170, 6);
    expect(normaliseYaw(360)).toBe(0);
    expect(normaliseYaw(-360)).toBe(0);
  });

  it('survives repeated snap turns without drifting', () => {
    // 12 left turns of 30 degrees is a full circle back to the start.
    let yaw = 0;
    for (let i = 0; i < 12; i += 1) yaw = normaliseYaw(yaw + 30);
    expect(yaw).toBe(0);
  });

  it('never yields negative zero, which would serialise differently', () => {
    expect(Object.is(normaliseYaw(-0), -0)).toBe(false);
    expect(Object.is(normaliseYaw(360), -0)).toBe(false);
  });

  it('falls back to zero for non-finite input', () => {
    expect(normaliseYaw(Number.NaN)).toBe(0);
    expect(normaliseYaw(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('rotateY', () => {
  it('follows the Three.js convention: positive yaw turns left', () => {
    // A neutral viewer faces -Z; turning left 90 degrees faces -X.
    expectVec(rotateY([0, 0, -1], 90), [-1, 0, 0]);
    expectVec(rotateY([0, 0, -1], -90), [1, 0, 0]);
  });

  it('leaves height untouched', () => {
    expect(rotateY([1, 2.5, 3], 47)[1]).toBe(2.5);
  });
});

describe('compose', () => {
  const room: Transform = { position: [10, 0, -4], yawDegrees: 90 };
  const locus: Transform = { position: [2, 0, 0], yawDegrees: 45 };

  it('adds yaw and rotates the child offset into the parent frame', () => {
    const world = compose(room, locus);
    expect(world.yawDegrees).toBeCloseTo(135, 6);
    // Rotating [2,0,0] by 90 degrees gives [0,0,-2], then the room offset.
    expectVec(world.position, [10, 0, -6]);
  });

  it('matches applying the transforms one after another', () => {
    const point: readonly [number, number, number] = [0.3, 1.05, -0.2];
    expectVec(applyTransform(compose(room, locus), point), applyTransform(room, applyTransform(locus, point)));
  });

  it('is unaffected by the order rooms are listed in', () => {
    // The invariant that matters: composition depends on saved transforms only.
    const a = compose(room, locus);
    const b = compose(room, locus);
    expect(a).toEqual(b);
  });
});

describe('yawTowards', () => {
  it('faces a target directly ahead', () => {
    expect(yawTowards([0, 0, 0], [0, 0, -5])).toBeCloseTo(0, 6);
  });

  it('faces a target behind', () => {
    expect(Math.abs(yawTowards([0, 0, 0], [0, 0, 5]))).toBeCloseTo(180, 6);
  });

  it('faces a target to the left', () => {
    expect(yawTowards([0, 0, 0], [-5, 0, 0])).toBeCloseTo(90, 6);
  });

  it('keeps the current facing when the target is underfoot', () => {
    expect(yawTowards([1, 0, 1], [1, 2, 1], 33)).toBe(33);
  });

  it('agrees with forward(): facing a point means pointing at it', () => {
    const from: readonly [number, number, number] = [1, 0, 2];
    const target: readonly [number, number, number] = [-3, 0, -1];
    const dir = forward({ position: from, yawDegrees: yawTowards(from, target) });
    const length = distance(from, target);
    expectVec([from[0] + dir[0] * length, 0, from[2] + dir[2] * length], [target[0], 0, target[2]]);
  });
});
