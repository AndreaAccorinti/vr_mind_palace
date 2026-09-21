import { describe, expect, it } from 'vitest';
import { createFrameRecorder, formatFrameReport, type DiagnosticsContext } from '../domain/index.ts';
import { createLocalDiagnosticsRepository, type DiagnosticsRun } from './diagnosticsRepository.ts';

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

const context: DiagnosticsContext = {
  recordedAt: '2026-09-21T10:00:00.000Z',
  mode: 'immersive-vr',
  userAgent: 'Quest Browser test',
  reportedFrameRate: 72,
  supportedFrameRates: [72, 90],
  timeToFirstFrameMs: 640,
  inputSourceCount: 2,
};

function buildRun(): DiagnosticsRun {
  const recorder = createFrameRecorder();
  for (let i = 0; i < 100; i += 1) recorder.observeFrame(1000 / 72, 1000 + i * 14);
  const summary = recorder.summarise(72);
  return { context, summary, report: formatFrameReport(summary, context) };
}

describe('round trip', () => {
  it('returns null when nothing has been recorded', () => {
    const loaded = createLocalDiagnosticsRepository(new MemoryStorage()).loadLastRun();
    expect(loaded.ok && loaded.value).toBeNull();
  });

  it('saves and reloads a run with its report text intact', () => {
    const repository = createLocalDiagnosticsRepository(new MemoryStorage());
    const run = buildRun();
    expect(repository.saveLastRun(run).ok).toBe(true);

    const loaded = repository.loadLastRun();
    expect(loaded.ok).toBe(true);
    // The report is stored rather than regenerated, so what is pasted into the
    // acceptance record is exactly what was shown at the time.
    expect(loaded.ok && loaded.value?.report).toBe(run.report);
    expect(loaded.ok && loaded.value?.summary.sampleCount).toBe(99);
  });

  it('keeps only the most recent run', () => {
    const storage = new MemoryStorage();
    const repository = createLocalDiagnosticsRepository(storage);
    repository.saveLastRun(buildRun());
    repository.saveLastRun({ ...buildRun(), report: 'second run' });
    const loaded = repository.loadLastRun();
    expect(loaded.ok && loaded.value?.report).toBe('second run');
    expect(storage.length).toBe(1);
  });

  it('clears a saved run', () => {
    const repository = createLocalDiagnosticsRepository(new MemoryStorage());
    repository.saveLastRun(buildRun());
    expect(repository.clearLastRun().ok).toBe(true);
    const loaded = repository.loadLastRun();
    expect(loaded.ok && loaded.value).toBeNull();
  });
});

describe('failures are typed, not thrown', () => {
  it('reports missing storage', () => {
    const repository = createLocalDiagnosticsRepository(undefined);
    const loaded = repository.loadLastRun();
    expect(loaded.ok === false && loaded.reason).toBe('unavailable');
    expect(repository.saveLastRun(buildRun()).ok).toBe(false);
    expect(repository.clearLastRun().ok).toBe(false);
  });

  it('reports a full quota without losing the run from screen', () => {
    const full = new MemoryStorage();
    full.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const saved = createLocalDiagnosticsRepository(full).saveLastRun(buildRun());
    expect(saved.ok === false && saved.reason).toBe('quota-exceeded');
  });

  it('rejects unparseable stored data', () => {
    const storage = new MemoryStorage();
    storage.setItem('loci.diagnostics.last-run.v1', 'not json');
    const loaded = createLocalDiagnosticsRepository(storage).loadLastRun();
    expect(loaded.ok === false && loaded.reason).toBe('corrupt');
  });

  it('rejects stored data of the wrong shape rather than trusting it', () => {
    const storage = new MemoryStorage();
    storage.setItem('loci.diagnostics.last-run.v1', JSON.stringify({ report: 42 }));
    const loaded = createLocalDiagnosticsRepository(storage).loadLastRun();
    expect(loaded.ok === false && loaded.reason).toBe('corrupt');
  });
});
