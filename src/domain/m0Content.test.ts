/**
 * Integrity checks for the M0 fixture.
 *
 * These guard the content invariants the blueprint names, so a careless edit to
 * the demo data fails here rather than as a broken room in a headset. The same
 * checks become M1's semantic validation pass over imported content.
 */

import { describe, expect, it } from 'vitest';
import { isAnimationAllowedOn, isAssetId, isAnimationId } from './assets.ts';
import { m0Content } from './m0Content.ts';
import { floorBoundsOf, hasAxisAlignedBounds, templateOf } from './roomTemplates.ts';
import {
  itemAtLocus,
  lociOfRoom,
  locusWorldTransform,
  MAX_VISIBLE_NODES,
  orderedRooms,
  visibleNodes,
} from './palace.ts';
import { viewingPoseFor } from './viewer.ts';

const ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

describe('the M0 fixture matches the v1 contract', () => {
  it('declares the v1 content kind and version', () => {
    expect(m0Content.schemaVersion).toBe(1);
    expect(m0Content.kind).toBe('loci-content');
  });

  it('uses schema-shaped IDs everywhere', () => {
    expect(m0Content.palace.id).toMatch(ID_PATTERN);
    for (const room of m0Content.rooms) expect(room.id).toMatch(ID_PATTERN);
    for (const locus of m0Content.loci) expect(locus.id).toMatch(ID_PATTERN);
    for (const item of m0Content.items) {
      expect(item.id).toMatch(ID_PATTERN);
      for (const node of item.mnemonic.nodes) expect(node.id).toMatch(ID_PATTERN);
    }
  });

  it('is the one-room, three-prop scope M0 asks for', () => {
    expect(m0Content.rooms).toHaveLength(1);
    expect(m0Content.loci).toHaveLength(3);
    expect(m0Content.items).toHaveLength(3);
  });

  it('contains only synthetic demo material, never personal content', () => {
    for (const item of m0Content.items) expect(item.source.kind).toBe('demo');
  });
});

describe('referential integrity', () => {
  it('has unique IDs', () => {
    const ids = [
      ...m0Content.rooms.map((room) => room.id),
      ...m0Content.loci.map((locus) => locus.id),
      ...m0Content.items.map((item) => item.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every locus at a room that exists', () => {
    const roomIds = new Set(m0Content.rooms.map((room) => room.id));
    for (const locus of m0Content.loci) expect(roomIds.has(locus.roomId)).toBe(true);
  });

  it('points every item at a locus that exists', () => {
    const locusIds = new Set(m0Content.loci.map((locus) => locus.id));
    for (const item of m0Content.items) expect(locusIds.has(item.locusId)).toBe(true);
  });

  it('lists every locus exactly once in its room order', () => {
    for (const room of m0Content.rooms) {
      const listed = [...room.locusOrder].sort();
      const actual = m0Content.loci.filter((l) => l.roomId === room.id).map((l) => l.id).sort();
      expect(listed).toEqual(actual);
    }
  });

  it('lists every room in the palace order', () => {
    expect(orderedRooms(m0Content).map((room) => room.id)).toEqual([...m0Content.palace.roomOrder]);
  });

  it('keeps at most one active item per locus, as v1 requires', () => {
    for (const locus of m0Content.loci) {
      expect(m0Content.items.filter((item) => item.locusId === locus.id).length).toBeLessThanOrEqual(1);
    }
  });

  it('resolves every pronunciation hook to a node of the same item', () => {
    for (const item of m0Content.items) {
      const nodeIds = new Set(item.mnemonic.nodes.map((node) => node.id));
      for (const hook of item.mnemonic.pronunciation) expect(nodeIds.has(hook.nodeId)).toBe(true);
    }
  });
});

describe('scene recipes stay inside the allowed catalogue', () => {
  it('names only known assets and animations', () => {
    for (const item of m0Content.items) {
      for (const node of item.mnemonic.nodes) {
        expect(isAssetId(node.assetId)).toBe(true);
        expect(isAnimationId(node.animation)).toBe(true);
      }
    }
  });

  it('only uses animations the asset supports', () => {
    for (const item of m0Content.items) {
      for (const node of item.mnemonic.nodes) {
        expect(isAnimationAllowedOn(node.animation, node.assetId)).toBe(true);
      }
    }
  });

  it('keeps node scale within the schema range', () => {
    for (const item of m0Content.items) {
      for (const node of item.mnemonic.nodes) {
        expect(node.scale).toBeGreaterThanOrEqual(0.1);
        expect(node.scale).toBeLessThanOrEqual(4);
      }
    }
  });

  it('never instantiates more than the visible-node budget', () => {
    for (const item of m0Content.items) {
      expect(visibleNodes(item.mnemonic).length).toBeLessThanOrEqual(MAX_VISIBLE_NODES);
    }
  });

  it('keeps the meaning prop visible before any sound chunk is chosen', () => {
    const water = m0Content.items.find((item) => item.id === 'water-mizu');
    expect(water).toBeDefined();
    expect(visibleNodes(water!.mnemonic, 0).map((node) => node.id)).toContain('jug');
  });
});

describe('the room is physically coherent', () => {
  const room = m0Content.rooms[0]!;

  it('has bounds the teleport rule can describe', () => {
    expect(hasAxisAlignedBounds(room)).toBe(true);
  });

  it('places every locus inside the room walls', () => {
    const template = templateOf(room);
    for (const locus of lociOfRoom(m0Content, room.id)) {
      const world = locusWorldTransform(room, locus);
      expect(Math.abs(world.position[0])).toBeLessThan(template.widthMetres / 2);
      expect(Math.abs(world.position[2])).toBeLessThan(template.depthMetres / 2);
    }
  });

  it('gives every locus a viewing spot on the teleportable floor', () => {
    // If a viewing spot fell outside the floor, recentring would put the user
    // somewhere they could never teleport back to.
    const template = templateOf(room);
    const bounds = floorBoundsOf(room);
    for (const locus of lociOfRoom(m0Content, room.id)) {
      const pose = viewingPoseFor(
        locusWorldTransform(room, locus),
        template.viewingDistanceMetres,
        room.origin[1],
      );
      expect(pose.position[0]).toBeGreaterThanOrEqual(bounds.minX);
      expect(pose.position[0]).toBeLessThanOrEqual(bounds.maxX);
      expect(pose.position[2]).toBeGreaterThanOrEqual(bounds.minZ);
      expect(pose.position[2]).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it('keeps the loci far enough apart to be distinct targets', () => {
    const loci = lociOfRoom(m0Content, room.id).map((l) => locusWorldTransform(room, l));
    for (let i = 0; i < loci.length; i += 1) {
      for (let j = i + 1; j < loci.length; j += 1) {
        const a = loci[i]!.position;
        const b = loci[j]!.position;
        expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(1.2);
      }
    }
  });

  it('gives each locus its own item', () => {
    for (const locus of lociOfRoom(m0Content, room.id)) {
      expect(itemAtLocus(m0Content, locus.id)).toBeDefined();
    }
  });
});

describe('placement is a function of saved data alone', () => {
  it('does not move a locus when the room order is reversed', () => {
    const room = m0Content.rooms[0]!;
    const before = lociOfRoom(m0Content, room.id).map((l) => locusWorldTransform(room, l));
    const reordered = { ...room, locusOrder: [...room.locusOrder].reverse() };
    const after = lociOfRoom({ ...m0Content, rooms: [reordered] }, room.id)
      .map((l) => locusWorldTransform(reordered, l))
      .reverse();
    expect(after).toEqual(before);
  });
});
