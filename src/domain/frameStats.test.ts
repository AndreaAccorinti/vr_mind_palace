import { describe, expect, it } from 'vitest';
import {
  createFrameRecorder,
  formatFrameReport,
  STALL_THRESHOLD_MS,
  SUSPENSION_THRESHOLD_MS,
  type DiagnosticsContext,
} from './frameStats.ts';

/** 72 Hz, the blueprint's starting target. */
const T72 = 1000 / 72;
const T90 = 1000 / 90;

const feed = (recorder: ReturnType<typeof createFrameRecorder>, intervalMs: number, times: number) => {
  for (let i = 0; i < times; i += 1) recorder.record(intervalMs);
};

describe('a steady stream', () => {
  it('reports the rate it was fed', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 720);
    const summary = recorder.summarise(72);
    expect(summary.sampleCount).toBe(720);
    expect(summary.meanFps).toBeCloseTo(72, 5);
    expect(summary.elapsedMs).toBeCloseTo(10_000, 3);
  });

  it('estimates no dropped frames when every interval is on target', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 500);
    const summary = recorder.summarise(72);
    expect(summary.droppedFrames).toBe(0);
    expect(summary.droppedPercent).toBe(0);
  });

  it('tells 72 Hz apart from 90 Hz at the histogram resolution', () => {
    const at72 = createFrameRecorder();
    feed(at72, T72, 200);
    const at90 = createFrameRecorder();
    feed(at90, T90, 200);
    expect(at72.summarise().medianIntervalMs).toBeCloseTo(T72, 0);
    expect(at90.summarise().medianIntervalMs).toBeCloseTo(T90, 0);
    expect(at72.summarise().medianIntervalMs).toBeGreaterThan(at90.summarise().medianIntervalMs);
  });
});

describe('dropped-frame estimation', () => {
  it('counts one dropped frame for a doubled interval', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 99);
    recorder.record(T72 * 2);
    expect(recorder.summarise(72).droppedFrames).toBe(1);
  });

  it('counts three for a quadrupled interval', () => {
    const recorder = createFrameRecorder();
    recorder.record(T72 * 4);
    expect(recorder.summarise(72).droppedFrames).toBe(3);
  });

  it('does not count ordinary jitter as a drop', () => {
    // Up to 1.5 display periods rounds to one period: jitter, not a miss.
    const recorder = createFrameRecorder();
    feed(recorder, T72 * 1.4, 100);
    expect(recorder.summarise(72).droppedFrames).toBe(0);
  });

  it('expresses the percentage against frames that should have been delivered', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 9);
    recorder.record(T72 * 2); // 10 intervals, 1 dropped -> 11 expected
    const summary = recorder.summarise(72);
    expect(summary.droppedFrames).toBe(1);
    expect(summary.droppedPercent).toBeCloseTo((1 / 11) * 100, 4);
  });

  it('reports null rather than guessing when no target rate is known', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 50);
    const summary = recorder.summarise(null);
    expect(summary.droppedFrames).toBeNull();
    expect(summary.droppedPercent).toBeNull();
    expect(summary.targetIntervalMs).toBeNull();
  });

  it('ignores a nonsensical target rate', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 10);
    expect(recorder.summarise(0).droppedFrames).toBeNull();
    expect(recorder.summarise(-90).droppedFrames).toBeNull();
  });
});

describe('suspensions are not stalls', () => {
  it('excludes a headset-off gap from every other statistic', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 100);
    const before = recorder.summarise(72);
    recorder.record(SUSPENSION_THRESHOLD_MS + 5000);
    const after = recorder.summarise(72);

    expect(after.suspensions).toBe(1);
    expect(after.sampleCount).toBe(before.sampleCount);
    expect(after.maxIntervalMs).toBe(before.maxIntervalMs);
    expect(after.droppedFrames).toBe(before.droppedFrames);
    expect(after.elapsedMs).toBeCloseTo(before.elapsedMs, 6);
  });

  it('still counts a long but plausible hitch as a stall', () => {
    const recorder = createFrameRecorder();
    recorder.record(STALL_THRESHOLD_MS + 1);
    const summary = recorder.summarise(72);
    expect(summary.stalls).toBe(1);
    expect(summary.suspensions).toBe(0);
    expect(summary.droppedFrames).toBeGreaterThan(0);
  });
});

describe('percentiles', () => {
  it('separates a smooth median from a bad tail', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 980);
    feed(recorder, 60, 20); // 2% of frames are badly late
    const summary = recorder.summarise(72);
    expect(summary.medianIntervalMs).toBeCloseTo(T72, 0);
    expect(summary.p95IntervalMs).toBeCloseTo(T72, 0);
    expect(summary.p99IntervalMs).toBeGreaterThan(T72 * 2);
    expect(summary.maxIntervalMs).toBeCloseTo(60, 6);
  });

  it('puts the boundary where the definition says, not one sample early', () => {
    // Exactly 1% late means the 99th percentile is still the good value; the
    // tail only reaches p99 once more than 1% of frames are late.
    const recorder = createFrameRecorder();
    feed(recorder, T72, 990);
    feed(recorder, 60, 10);
    expect(recorder.summarise(72).p99IntervalMs).toBeCloseTo(T72, 0);
  });

  it('keeps the exact maximum even when it lands beyond the histogram', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 10);
    recorder.record(320.5);
    expect(recorder.summarise(72).maxIntervalMs).toBeCloseTo(320.5, 6);
  });

  it('does not understate a percentile that falls in the overflow bucket', () => {
    const recorder = createFrameRecorder();
    feed(recorder, 500, 20); // every sample beyond MAX_TRACKED_MS
    const summary = recorder.summarise(72);
    expect(summary.medianIntervalMs).toBeCloseTo(500, 6);
  });
});

describe('bad input', () => {
  it('ignores non-finite and non-positive intervals', () => {
    const recorder = createFrameRecorder();
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 0, -16]) recorder.record(bad);
    const summary = recorder.summarise(72);
    expect(summary.sampleCount).toBe(0);
    expect(summary.suspensions).toBe(0);
  });

  it('summarises an empty recorder without dividing by zero', () => {
    const summary = createFrameRecorder().summarise(72);
    expect(summary.meanFps).toBe(0);
    expect(summary.meanIntervalMs).toBe(0);
    expect(summary.medianIntervalMs).toBe(0);
    expect(summary.droppedFrames).toBeNull();
  });
});

describe('reset', () => {
  it('clears every counter', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 50);
    recorder.record(SUSPENSION_THRESHOLD_MS + 1);
    recorder.record(STALL_THRESHOLD_MS + 1);
    recorder.reset();
    const summary = recorder.summarise(72);
    expect(summary.sampleCount).toBe(0);
    expect(summary.suspensions).toBe(0);
    expect(summary.stalls).toBe(0);
    expect(summary.maxIntervalMs).toBe(0);
  });
});

describe('the pasteable report', () => {
  const context: DiagnosticsContext = {
    recordedAt: '2026-09-21T10:00:00.000Z',
    mode: 'immersive-vr',
    userAgent: 'Quest Browser test',
    reportedFrameRate: 72,
    supportedFrameRates: [72, 90, 120],
    timeToFirstFrameMs: 812.4,
    inputSourceCount: 2,
  };

  it('states what was measured', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 100);
    const report = formatFrameReport(recorder.summarise(72), context);
    expect(report).toContain('Reported frame rate: 72');
    expect(report).toContain('Supported frame rates: 72, 90, 120');
    expect(report).toContain('Time to first frame: 812.4 ms');
    expect(report).toContain('Input sources at end: 2');
  });

  it('never presents an inferred figure as a reported one', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 100);
    const report = formatFrameReport(recorder.summarise(72), context);
    expect(report).toContain('Dropped frames are inferred');
    expect(report).toContain('compositor dropped-frame count');
    expect(report).toContain('not XR frame cadence');
  });

  it('says so plainly when the runtime reported nothing', () => {
    const recorder = createFrameRecorder();
    feed(recorder, T72, 10);
    const report = formatFrameReport(recorder.summarise(null), {
      ...context,
      reportedFrameRate: null,
      supportedFrameRates: [],
      timeToFirstFrameMs: null,
    });
    expect(report).toContain('Reported frame rate: not reported');
    expect(report).toContain('Supported frame rates: not reported');
    expect(report).toContain('Time to first frame: not measured');
    expect(report).toContain('Estimated dropped frames: no target rate reported');
  });
});
