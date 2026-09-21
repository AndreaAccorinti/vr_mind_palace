/**
 * Storage failures must be visible, never silent. These tests drive the paths a
 * real browser produces: private mode throwing outright, a full origin quota,
 * and a key another tool has overwritten.
 */

import { describe, expect, it } from 'vitest';
import { createLocalPreferencesRepository } from './localPreferences.ts';
import { DEFAULT_PREFERENCES, type ViewerPreferences } from './repository.ts';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const seated: ViewerPreferences = { posture: 'seated', seenControlsHint: true };

describe('round trip', () => {
  it('saves and reloads preferences', () => {
    const repo = createLocalPreferencesRepository(new MemoryStorage());
    expect(repo.save(seated).ok).toBe(true);
    const loaded = repo.load();
    expect(loaded.ok && loaded.value).toEqual(seated);
  });

  it('returns the defaults when nothing has been saved', () => {
    const loaded = createLocalPreferencesRepository(new MemoryStorage()).load();
    expect(loaded.ok && loaded.value).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('failures are reported, not swallowed', () => {
  it('reports a missing storage implementation', () => {
    const repo = createLocalPreferencesRepository(undefined);
    const loaded = repo.load();
    expect(loaded.ok).toBe(false);
    expect(loaded.ok === false && loaded.reason).toBe('unavailable');
    expect(repo.save(seated).ok).toBe(false);
  });

  it('reports a blocked read', () => {
    const blocked = new MemoryStorage();
    blocked.getItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    const loaded = createLocalPreferencesRepository(blocked).load();
    expect(loaded.ok === false && loaded.reason).toBe('denied');
  });

  it('reports a full quota distinctly from a blocked write', () => {
    const full = new MemoryStorage();
    full.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const saved = createLocalPreferencesRepository(full).save(seated);
    expect(saved.ok === false && saved.reason).toBe('quota-exceeded');
  });

  it('reports unparseable stored data instead of throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem('loci.viewer-preferences.v1', '{not json');
    const loaded = createLocalPreferencesRepository(storage).load();
    expect(loaded.ok === false && loaded.reason).toBe('corrupt');
  });

  it('rejects stored data of the wrong shape rather than trusting it', () => {
    const storage = new MemoryStorage();
    storage.setItem('loci.viewer-preferences.v1', JSON.stringify({ posture: 'lying-down' }));
    const loaded = createLocalPreferencesRepository(storage).load();
    expect(loaded.ok === false && loaded.reason).toBe('corrupt');
  });
});
