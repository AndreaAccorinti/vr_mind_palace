/**
 * Dimensions of the room shells the renderer can build.
 *
 * These live in the domain because teleport bounds, viewing distances and the
 * "is this locus reachable" question are product rules, not rendering details.
 * The scene layer builds geometry from the same numbers so the walls a user sees
 * and the floor they can teleport onto cannot drift apart.
 */

import { yawTowards, type Vec3 } from './geometry.ts';
import type { RoomTemplateId, Room } from './palace.ts';
import type { FloorBounds, ViewerPose } from './viewer.ts';

export interface RoomTemplate {
  readonly id: RoomTemplateId;
  /** Interior floor size in metres, along local X and Z. */
  readonly widthMetres: number;
  readonly depthMetres: number;
  readonly wallHeightMetres: number;
  /** Height of the plinth each mnemonic prop stands on. */
  readonly plinthHeightMetres: number;
  /** How far a viewer stands from a locus by default. */
  readonly viewingDistanceMetres: number;
  /** Margin kept between the teleportable floor and the walls. */
  readonly floorMarginMetres: number;
}

export const ROOM_TEMPLATES: Readonly<Record<RoomTemplateId, RoomTemplate>> = {
  'gallery-6x6': {
    id: 'gallery-6x6',
    widthMetres: 6,
    depthMetres: 6,
    wallHeightMetres: 3.2,
    plinthHeightMetres: 1.05,
    // How far a viewer stands from a plinth when inspecting it. Far enough that
    // the body-anchored cue panel, which sits about 1.2 m ahead, never lands on
    // the prop. A starting value for device testing, not a verified figure.
    viewingDistanceMetres: 2.3,
    floorMarginMetres: 0.6,
  },
};

export function templateOf(room: Room): RoomTemplate {
  return ROOM_TEMPLATES[room.templateId];
}

/**
 * The world-space rectangle a viewer may teleport within.
 *
 * Only axis-aligned rooms are supported in M0. A rotated room would need the
 * bounds expressed in room-local space and the teleport test rotated with it;
 * the fixture keeps `yawDegrees` at 0 so this stays honest.
 */
export function floorBoundsOf(room: Room): FloorBounds {
  const template = templateOf(room);
  const halfWidth = template.widthMetres / 2 - template.floorMarginMetres;
  const halfDepth = template.depthMetres / 2 - template.floorMarginMetres;
  const [originX, , originZ] = room.origin;
  return {
    minX: originX - halfWidth,
    maxX: originX + halfWidth,
    minZ: originZ - halfDepth,
    maxZ: originZ + halfDepth,
  };
}

/** True when `floorBoundsOf` describes this room correctly. */
export function hasAxisAlignedBounds(room: Room): boolean {
  return Math.abs(room.yawDegrees % 360) < 1e-6;
}

/**
 * Where a viewer arrives in a room, and where `recentre` returns them to.
 *
 * The back edge of the teleportable floor, facing the room's centre, so the
 * whole route is visible on arrival. Selecting a locus deliberately does NOT
 * move the viewer — moving the camera for them is the forced motion the comfort
 * rules rule out — so this pose has to be a good view of everything.
 */
export function roomEntryPose(room: Room): ViewerPose {
  const bounds = floorBoundsOf(room);
  const [, originY] = room.origin;
  const position: Vec3 = [(bounds.minX + bounds.maxX) / 2, originY, bounds.maxZ];
  return { position, yawDegrees: yawTowards(position, room.origin, room.yawDegrees) };
}
