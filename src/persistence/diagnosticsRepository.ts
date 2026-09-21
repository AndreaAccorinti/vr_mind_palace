/**
 * The last device-test run, kept so it can be read after the headset is off.
 *
 * The point of persisting it: numbers recorded inside a headset are painful to
 * transcribe. Saving the run means the 2D page can show it as selectable text
 * once the session ends, ready to paste into `docs/QUEST-TEST.md`.
 *
 * One run only. This is an acceptance-test aid, not a telemetry store — nothing
 * is sent anywhere, and there is no history to grow without bound.
 */

import type { DiagnosticsContext, FrameSummary } from '../domain/index.ts';
import {
  fail,
  ok,
  type StorageResult,
} from './repository.ts';

export interface DiagnosticsRun {
  readonly context: DiagnosticsContext;
  readonly summary: FrameSummary;
  /** The pasteable text, stored so the format cannot drift from what was shown. */
  readonly report: string;
}

export interface DiagnosticsRepository {
  loadLastRun(): StorageResult<DiagnosticsRun | null>;
  saveLastRun(run: DiagnosticsRun): StorageResult<void>;
  clearLastRun(): StorageResult<void>;
}

const STORAGE_KEY = 'loci.diagnostics.last-run.v1';

function isRun(value: unknown): value is DiagnosticsRun {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DiagnosticsRun>;
  return (
    typeof candidate.report === 'string' &&
    typeof candidate.context === 'object' &&
    candidate.context !== null &&
    typeof candidate.summary === 'object' &&
    candidate.summary !== null
  );
}

export function createLocalDiagnosticsRepository(
  storage: Storage | undefined = globalThis.localStorage,
): DiagnosticsRepository {
  return {
    loadLastRun(): StorageResult<DiagnosticsRun | null> {
      if (storage === undefined) return fail('unavailable', 'Local storage is not available.');
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw === null) return ok(null);
        const parsed: unknown = JSON.parse(raw);
        return isRun(parsed) ? ok(parsed) : fail('corrupt', 'The saved test run could not be read.');
      } catch {
        return fail('corrupt', 'The saved test run could not be read.');
      }
    },

    saveLastRun(run: DiagnosticsRun): StorageResult<void> {
      if (storage === undefined) return fail('unavailable', 'Local storage is not available.');
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(run));
        return ok(undefined);
      } catch {
        // Losing a diagnostics run to a full quota must never cost the user
        // their learning data, so this failure is reported and never retried
        // by evicting something else.
        return fail('quota-exceeded', 'The test run could not be saved.');
      }
    },

    clearLastRun(): StorageResult<void> {
      if (storage === undefined) return fail('unavailable', 'Local storage is not available.');
      try {
        storage.removeItem(STORAGE_KEY);
        return ok(undefined);
      } catch {
        return fail('denied', 'The test run could not be cleared.');
      }
    },
  };
}
