/**
 * The learning-content model.
 *
 * These types mirror the v1 interchange contract in `schemas/palace.schema.json`
 * so that M1's importer can reuse them unchanged. Nothing here imports React or
 * Three.js: the scene layer reads this model, and the model never reads back.
 */

import type { AnimationId, AssetId } from './assets.ts';
import { compose, type Transform, type Vec3 } from './geometry.ts';

export type PalaceId = string;
export type RoomId = string;
export type LocusId = string;
export type ItemId = string;
export type NodeId = string;

/** Room shells the renderer knows how to build. */
export type RoomTemplateId = 'gallery-6x6';

export type RoomTheme = 'warm-stone' | 'ink-blue' | 'garden';

/** One visible element of a mnemonic scene, positioned relative to its locus. */
export interface MnemonicNode {
  readonly id: NodeId;
  readonly assetId: AssetId;
  /** Locus-local translation in metres. */
  readonly position: Vec3;
  readonly scale: number;
  readonly animation: AnimationId;
}

/** A user-approved sound association. Never a phonetic claim. */
export interface PronunciationHook {
  readonly sound: string;
  readonly hook: string;
  readonly nodeId: NodeId;
}

export interface NumberPeg {
  readonly number: number;
  readonly label: string;
  readonly nodeId: NodeId;
}

export interface Mnemonic {
  readonly meaningScene: string;
  readonly numberPeg: NumberPeg | null;
  readonly pronunciation: readonly PronunciationHook[];
  /** Stored recipes. `visibleNodes` decides what is instantiated at once. */
  readonly nodes: readonly MnemonicNode[];
}

/** Where a fact came from. Kept separate from the metaphor that encodes it. */
export interface ItemSource {
  readonly kind: 'demo' | 'user';
  readonly excerpt: string;
  readonly locator: string;
}

export interface LearningItem {
  readonly id: ItemId;
  readonly locusId: LocusId;
  readonly cue: string;
  /** The exact answer. Never rewritten to match a mnemonic. */
  readonly answer: string;
  readonly source: ItemSource;
  readonly mnemonic: Mnemonic;
}

export interface Locus {
  readonly id: LocusId;
  readonly roomId: RoomId;
  readonly label: string;
  /** Room-local translation in metres. */
  readonly position: Vec3;
  readonly yawDegrees: number;
}

export interface Room {
  readonly id: RoomId;
  readonly name: string;
  readonly templateId: RoomTemplateId;
  /** World-space translation in metres. */
  readonly origin: Vec3;
  readonly yawDegrees: number;
  readonly theme: RoomTheme;
  readonly locusOrder: readonly LocusId[];
}

export interface PalaceMeta {
  readonly id: PalaceId;
  readonly name: string;
  readonly roomOrder: readonly RoomId[];
}

/** A complete content set: the shape a v1 import produces and an export writes. */
export interface PalaceContent {
  readonly schemaVersion: 1;
  readonly kind: 'loci-content';
  readonly palace: PalaceMeta;
  readonly rooms: readonly Room[];
  readonly loci: readonly Locus[];
  readonly items: readonly LearningItem[];
}

/** Product limits from the blueprint, not hardware limits. */
export const MAX_PERSISTENT_NODES = 2;
export const MAX_SOUND_NODES_PER_CHUNK = 6;
export const MAX_VISIBLE_NODES = MAX_PERSISTENT_NODES + MAX_SOUND_NODES_PER_CHUNK;

export function roomTransform(room: Room): Transform {
  return { position: room.origin, yawDegrees: room.yawDegrees };
}

export function locusTransform(locus: Locus): Transform {
  return { position: locus.position, yawDegrees: locus.yawDegrees };
}

/** Composes a locus into world space. Room order never affects this result. */
export function locusWorldTransform(room: Room, locus: Locus): Transform {
  return compose(roomTransform(room), locusTransform(locus));
}

export function findRoom(content: PalaceContent, roomId: RoomId): Room | undefined {
  return content.rooms.find((room) => room.id === roomId);
}

export function findLocus(content: PalaceContent, locusId: LocusId): Locus | undefined {
  return content.loci.find((locus) => locus.id === locusId);
}

export function findItem(content: PalaceContent, itemId: ItemId): LearningItem | undefined {
  return content.items.find((item) => item.id === itemId);
}

/** The loci of a room, in the room's saved order. Unknown IDs are skipped. */
export function lociOfRoom(content: PalaceContent, roomId: RoomId): readonly Locus[] {
  const room = findRoom(content, roomId);
  if (room === undefined) return [];
  const byId = new Map(content.loci.map((locus) => [locus.id, locus] as const));
  return room.locusOrder
    .map((id) => byId.get(id))
    .filter((locus): locus is Locus => locus !== undefined && locus.roomId === roomId);
}

/** The single active item at a locus. v1 allows at most one. */
export function itemAtLocus(content: PalaceContent, locusId: LocusId): LearningItem | undefined {
  return content.items.find((item) => item.locusId === locusId);
}

/** Rooms in the palace's saved order. Unknown IDs are skipped. */
export function orderedRooms(content: PalaceContent): readonly Room[] {
  const byId = new Map(content.rooms.map((room) => [room.id, room] as const));
  return content.palace.roomOrder
    .map((id) => byId.get(id))
    .filter((room): room is Room => room !== undefined);
}

/**
 * The nodes to instantiate for a mnemonic.
 *
 * Persistent nodes are those not referenced by a pronunciation hook — the
 * meaning scene and any number peg. Sound nodes are shown one chunk at a time so
 * a long chain never becomes a cloud of small props.
 */
export function visibleNodes(mnemonic: Mnemonic, chunkIndex = 0): readonly MnemonicNode[] {
  const soundNodeIds = new Set(mnemonic.pronunciation.map((hook) => hook.nodeId));
  const persistent = mnemonic.nodes
    .filter((node) => !soundNodeIds.has(node.id))
    .slice(0, MAX_PERSISTENT_NODES);

  const byId = new Map(mnemonic.nodes.map((node) => [node.id, node] as const));
  const start = Math.max(0, chunkIndex) * MAX_SOUND_NODES_PER_CHUNK;
  const sounds = mnemonic.pronunciation
    .slice(start, start + MAX_SOUND_NODES_PER_CHUNK)
    .map((hook) => byId.get(hook.nodeId))
    .filter((node): node is MnemonicNode => node !== undefined);

  return [...persistent, ...sounds];
}

/** How many chunks the pronunciation chain needs. Always at least one. */
export function chunkCount(mnemonic: Mnemonic): number {
  return Math.max(1, Math.ceil(mnemonic.pronunciation.length / MAX_SOUND_NODES_PER_CHUNK));
}
