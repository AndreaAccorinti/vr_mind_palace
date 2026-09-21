/**
 * The domain layer: learning content, spatial arithmetic and interaction rules.
 *
 * Nothing under `src/domain` imports React, Three.js or a browser API. That is
 * what lets the same rules be unit-tested in Node and reused by a future
 * renderer. See docs/BLUEPRINT.md, "Architecture and data".
 */

export * from './assets.ts';
export * from './frameStats.ts';
export * from './geometry.ts';
export * from './m0Content.ts';
export * from './palace.ts';
export * from './review.ts';
export * from './roomTemplates.ts';
export * from './viewer.ts';
