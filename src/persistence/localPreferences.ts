/**
 * Preferences backed by `localStorage`.
 *
 * Small, non-content settings only — posture and whether the controls hint has
 * been dismissed. Learning content and media go to IndexedDB in M1.
 *
 * Every access is guarded: `localStorage` throws outright in some privacy modes,
 * returns malformed JSON if another tool wrote the key, and rejects writes once
 * the origin's quota is full. Each of those becomes a typed failure the UI can
 * show instead of an unhandled exception or a silently lost setting.
 */

import {
  DEFAULT_PREFERENCES,
  fail,
  ok,
  type PreferencesRepository,
  type StorageResult,
  type ViewerPreferences,
} from './repository.ts';

const STORAGE_KEY = 'loci.viewer-preferences.v1';

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  // Safari reports a legacy name; Firefox uses a legacy numeric code.
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22
  );
}

function parsePreferences(raw: string): ViewerPreferences | null {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<Record<keyof ViewerPreferences, unknown>>;
  const posture = candidate.posture;
  const seenControlsHint = candidate.seenControlsHint;
  if (posture !== 'seated' && posture !== 'standing') return null;
  if (typeof seenControlsHint !== 'boolean') return null;
  return { posture, seenControlsHint };
}

export function createLocalPreferencesRepository(
  storage: Storage | undefined = globalThis.localStorage,
): PreferencesRepository {
  return {
    load(): StorageResult<ViewerPreferences> {
      if (storage === undefined) {
        return fail('unavailable', 'This browser is not offering local storage, so settings reset on reload.');
      }
      let raw: string | null;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch {
        return fail('denied', 'This browser blocked local storage, so settings reset on reload.');
      }
      if (raw === null) return ok(DEFAULT_PREFERENCES);
      try {
        const parsed = parsePreferences(raw);
        return parsed === null
          ? fail('corrupt', 'Saved settings could not be read and were replaced with the defaults.')
          : ok(parsed);
      } catch {
        return fail('corrupt', 'Saved settings could not be read and were replaced with the defaults.');
      }
    },

    save(preferences: ViewerPreferences): StorageResult<void> {
      if (storage === undefined) {
        return fail('unavailable', 'This browser is not offering local storage, so settings reset on reload.');
      }
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        return ok(undefined);
      } catch (error) {
        return isQuotaError(error)
          ? fail('quota-exceeded', 'Local storage is full, so this setting was not saved.')
          : fail('denied', 'This browser blocked local storage, so this setting was not saved.');
      }
    },
  };
}
