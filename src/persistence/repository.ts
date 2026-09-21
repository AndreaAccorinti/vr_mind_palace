/**
 * The persistence boundary.
 *
 * M0 ships an in-memory content source and a small preferences store. M1
 * replaces the implementations with Dexie without the domain or scene layers
 * changing, which is the point of declaring the interfaces now.
 *
 * Two rules from AGENTS.md shape these signatures:
 *  - every write can fail visibly, so results are returned rather than thrown
 *    past the caller and swallowed;
 *  - content and review progress are separate stores, so importing content can
 *    never silently erase scheduling history.
 */

import type { PalaceContent, PostureMode } from '../domain/index.ts';

export type StorageFailureReason =
  | 'unavailable'
  | 'quota-exceeded'
  | 'corrupt'
  | 'denied'
  | 'unknown';

export interface StorageFailure {
  readonly ok: false;
  readonly reason: StorageFailureReason;
  /** Human-readable text safe to show in the UI. Never contains user content. */
  readonly message: string;
}

export interface StorageSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export type StorageResult<T> = StorageSuccess<T> | StorageFailure;

export const ok = <T>(value: T): StorageSuccess<T> => ({ ok: true, value });

export const fail = (reason: StorageFailureReason, message: string): StorageFailure => ({
  ok: false,
  reason,
  message,
});

/** Read-only in M0. M1 adds transactional import and export. */
export interface ContentRepository {
  loadContent(): Promise<StorageResult<PalaceContent>>;
}

export interface ViewerPreferences {
  readonly posture: PostureMode;
  /** Whether the user has completed the in-scene controls introduction. */
  readonly seenControlsHint: boolean;
}

export const DEFAULT_PREFERENCES: ViewerPreferences = {
  posture: 'standing',
  seenControlsHint: false,
};

export interface PreferencesRepository {
  load(): StorageResult<ViewerPreferences>;
  save(preferences: ViewerPreferences): StorageResult<void>;
}
