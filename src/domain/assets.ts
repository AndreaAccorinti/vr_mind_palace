/**
 * The closed set of scene recipes an item may reference.
 *
 * Imported content selects a renderer node by ID; it never supplies geometry,
 * a URL or code. Keep this list in step with `docs/ASSET-CATALOG.json` and with
 * the `assetId` enum in `schemas/palace.schema.json`.
 */

export const ASSET_IDS = [
  'builtin:plate-stack',
  'builtin:queue',
  'builtin:water-jug',
  'builtin:teacup',
  'builtin:cube',
  'builtin:tree',
  'builtin:door',
  'builtin:placeholder',
] as const;

export type AssetId = (typeof ASSET_IDS)[number];

export const ANIMATION_IDS = ['none', 'bob', 'pulse', 'lift-top', 'advance-front'] as const;

export type AnimationId = (typeof ANIMATION_IDS)[number];

/** Animations that only make sense on particular props. */
const ANIMATION_COMPATIBILITY: Partial<Record<AnimationId, readonly AssetId[]>> = {
  'lift-top': ['builtin:plate-stack'],
  'advance-front': ['builtin:queue'],
};

export interface AssetDescriptor {
  readonly id: AssetId;
  readonly description: string;
}

export const ASSET_CATALOG: readonly AssetDescriptor[] = [
  { id: 'builtin:plate-stack', description: 'Three large stacked plates; the top plate lifts first.' },
  { id: 'builtin:queue', description: 'Three ordered figures at a gate; the front figure advances first.' },
  { id: 'builtin:water-jug', description: 'A large blue water jug with a simple water surface.' },
  { id: 'builtin:teacup', description: 'A large teacup, useful for an approved tea peg.' },
  { id: 'builtin:cube', description: 'A large coloured cube with a strong silhouette.' },
  { id: 'builtin:tree', description: 'A stylised low-polygon tree.' },
  { id: 'builtin:door', description: 'A freestanding door and frame.' },
  { id: 'builtin:placeholder', description: 'A neutral marked plinth standing in for a missing visual.' },
];

const ASSET_ID_SET: ReadonlySet<string> = new Set<string>(ASSET_IDS);
const ANIMATION_ID_SET: ReadonlySet<string> = new Set<string>(ANIMATION_IDS);

export function isAssetId(value: unknown): value is AssetId {
  return typeof value === 'string' && ASSET_ID_SET.has(value);
}

export function isAnimationId(value: unknown): value is AnimationId {
  return typeof value === 'string' && ANIMATION_ID_SET.has(value);
}

/**
 * Whether an animation may be applied to an asset. Unconstrained animations
 * ('none', 'bob', 'pulse') are allowed on every prop.
 */
export function isAnimationAllowedOn(animation: AnimationId, assetId: AssetId): boolean {
  const restrictedTo = ANIMATION_COMPATIBILITY[animation];
  return restrictedTo === undefined || restrictedTo.includes(assetId);
}

export function describeAsset(assetId: AssetId): string {
  return ASSET_CATALOG.find((asset) => asset.id === assetId)?.description ?? '';
}
