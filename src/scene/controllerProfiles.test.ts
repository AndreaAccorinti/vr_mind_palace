/**
 * Guards the controller-profile listing.
 *
 * This is a regression test for a defect that made the Quest 3 completely
 * unusable: every controller silently failed to register, so there was no ray,
 * no model and no selection.
 *
 * The chain is unforgiving. `@pmndrs/xr` asks `XRControllerLayoutLoader` for a
 * layout, which looks up the FIRST reported profile id present in
 * `profilesList.json` and fetches that path. If the fetch fails, the library
 * does `.catch(console.error)` and simply never calls `addController` — no
 * error surfaces in the app. We had shipped the upstream listing of 42 profiles
 * while copying two directories, so most ids resolved to a 404.
 *
 * So: every id the listing advertises must resolve to a file that exists.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const profilesDir = fileURLToPath(new URL('../../public/webxr-profiles', import.meta.url));

interface ProfileEntry {
  readonly path: string;
}

const listing: Record<string, ProfileEntry> = JSON.parse(
  readFileSync(join(profilesDir, 'profilesList.json'), 'utf-8'),
);

/** Resolves a reported profile chain the way the library does. */
function resolve(reportedIds: readonly string[]): string | null {
  for (const id of reportedIds) {
    const entry = listing[id];
    if (entry !== undefined) return entry.path;
  }
  return null;
}

describe('every advertised profile resolves', () => {
  it('advertises at least the two bundled profiles', () => {
    expect(Object.keys(listing).length).toBeGreaterThanOrEqual(2);
  });

  it.each(Object.entries(listing))('%s resolves to a file that exists', (_id, entry) => {
    expect(existsSync(join(profilesDir, entry.path))).toBe(true);
  });

  it('ships the models each resolved profile refers to', () => {
    const dirs = new Set(Object.values(listing).map((entry) => entry.path.split('/')[0]));
    for (const dir of dirs) {
      expect(existsSync(join(profilesDir, dir!, 'left.glb')), `${dir}/left.glb`).toBe(true);
      expect(existsSync(join(profilesDir, dir!, 'right.glb')), `${dir}/right.glb`).toBe(true);
    }
  });
});

describe('the profile chains a Quest actually reports', () => {
  // Real Quest input sources report a most-specific-first chain. Each of these
  // must land on something we serve; a miss is a dead controller.
  const chains: Record<string, readonly string[]> = {
    'Quest 3 Touch Plus': [
      'meta-quest-touch-plus',
      'oculus-touch-v3',
      'oculus-touch',
      'generic-trigger-squeeze-thumbstick',
    ],
    'Quest 3 Touch Plus v2': [
      'meta-quest-touch-plus-v2',
      'meta-quest-touch-plus',
      'oculus-touch-v3',
      'generic-trigger-squeeze-thumbstick',
    ],
    'Quest Pro': ['meta-quest-touch-pro', 'oculus-touch-v3', 'generic-trigger-squeeze-thumbstick'],
    'Quest 2': ['oculus-touch-v3', 'oculus-touch-v2', 'generic-trigger-squeeze-thumbstick'],
    'hand tracking': ['generic-hand'],
  };

  it.each(Object.entries(chains))('%s resolves to a bundled profile', (_name, reported) => {
    const path = resolve(reported);
    expect(path).not.toBeNull();
    expect(existsSync(join(profilesDir, path!))).toBe(true);
  });

  it('falls through to nothing for a genuinely unknown chain', () => {
    // Documents the remaining gap: an unrecognised headset resolves to null and
    // the store's defaultControllerProfileId is what saves it.
    expect(resolve(['some-future-headset'])).toBeNull();
  });
});
