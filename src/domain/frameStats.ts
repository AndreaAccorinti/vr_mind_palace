/**
 * Frame-interval statistics.
 *
 * `docs/QUEST-TEST.md` asks for "actual cadence/missed frames at the active
 * rate... measurements, not an assumed FPS". That is hard to do by eye inside a
 * headset, so the app records it. This module holds the arithmetic, with no
 * renderer and no browser API, so the rules are unit-testable without a device.
 *
 * Two honesty constraints shape the design:
 *
 *  - **Dropped frames are inferred, not reported.** WebXR exposes no
 *    compositor-level dropped-frame counter. An interval materially longer than
 *    the display period must have skipped at least one, so the count is derived
 *    from intervals and is labelled an estimate everywhere it is shown.
 *  - **A suspended session is not a stall.** Taking the headset off or
 *    backgrounding the tab produces one enormous interval. Counting it as
 *    hundreds of dropped frames would turn a normal event into an alarming
 *    number, so intervals past `SUSPENSION_THRESHOLD_MS` are counted separately
 *    and excluded from every other statistic.
 *
 * The recorder is mutable and allocation-free on `record`, because it is called
 * once per frame. Reading it (`summarise`) allocates and is called at a low,
 * fixed rate instead.
 */

/** Intervals at or above this are a suspended session, not a dropped frame. */
export const SUSPENSION_THRESHOLD_MS = 1000;

/** Intervals at or above this are recorded as a visible hitch. */
export const STALL_THRESHOLD_MS = 100;

/** Histogram resolution. Fine enough to tell 72 Hz (13.9 ms) from 90 Hz (11.1 ms). */
const BUCKET_MS = 0.25;

/**
 * Intervals beyond this land in an overflow bucket; the exact maximum is kept
 * separately.
 *
 * 250 ms covers everything from a 120 Hz headset down to a software renderer
 * limping at 4 fps. An earlier 80 ms limit looked generous against a 13.9 ms
 * target but collapsed every percentile onto the maximum as soon as the
 * renderer was slow, which reads as a catastrophe rather than as "this machine
 * has no GPU". The array costs 4 KB.
 */
const MAX_TRACKED_MS = 250;

const BUCKET_COUNT = Math.ceil(MAX_TRACKED_MS / BUCKET_MS);

export interface FrameSummary {
  /** Frames seen in this run, including the first one, whose interval is discarded. */
  readonly frameCount: number;
  /** `performance.now()` of the first frame of the run, or null before it starts. */
  readonly firstFrameAtMs: number | null;
  /** Frame intervals recorded, excluding suspensions. */
  readonly sampleCount: number;
  /** Wall time those intervals cover, in milliseconds. */
  readonly elapsedMs: number;
  readonly meanIntervalMs: number;
  /** Derived from the mean interval. Not a compositor-reported figure. */
  readonly meanFps: number;
  /** Percentiles, accurate to the histogram resolution. */
  readonly medianIntervalMs: number;
  readonly p95IntervalMs: number;
  readonly p99IntervalMs: number;
  /** Exact, not bucketed. */
  readonly maxIntervalMs: number;
  /** The rate the runtime reported, when it reported one. */
  readonly targetHz: number | null;
  readonly targetIntervalMs: number | null;
  /** Estimated from intervals. Null when no target rate is known. */
  readonly droppedFrames: number | null;
  readonly droppedPercent: number | null;
  /** Intervals at or above STALL_THRESHOLD_MS. */
  readonly stalls: number;
  /** Intervals discarded as a suspended session. */
  readonly suspensions: number;
}

export interface FrameRecorder {
  /**
   * Observes one rendered frame. Hot path: no allocation, no callback.
   *
   * The first frame of a run only establishes the start timestamp. Its interval
   * spans the gap since whatever rendered last — entering a session, or waking
   * from a suspend — so it is not a frame interval and is discarded.
   */
  observeFrame(intervalMs: number, nowMs: number): void;
  /** Records an interval directly, without the first-frame rule. */
  record(intervalMs: number): void;
  /** Computes the current statistics. Allocates; call at a low rate. */
  summarise(targetHz?: number | null): FrameSummary;
  reset(): void;
}

export function createFrameRecorder(): FrameRecorder {
  const buckets = new Uint32Array(BUCKET_COUNT);
  let overflow = 0;
  let count = 0;
  let totalMs = 0;
  let maxMs = 0;
  let stalls = 0;
  let suspensions = 0;
  let frameCount = 0;
  let firstFrameAtMs: number | null = null;

  const reset = () => {
    buckets.fill(0);
    overflow = 0;
    count = 0;
    totalMs = 0;
    maxMs = 0;
    stalls = 0;
    suspensions = 0;
    frameCount = 0;
    firstFrameAtMs = null;
  };

  /**
   * The interval at or below which `fraction` of samples fall.
   *
   * Resolved from the histogram, so the answer is the midpoint of the bucket
   * the threshold lands in. Landing in the overflow bucket means the true value
   * is beyond what the histogram tracks, so the exact maximum is returned
   * rather than a bucket edge that would understate it.
   */
  const percentile = (fraction: number): number => {
    if (count === 0) return 0;
    const target = fraction * count;
    let seen = 0;
    for (let i = 0; i < BUCKET_COUNT; i += 1) {
      seen += buckets[i] ?? 0;
      if (seen >= target) return (i + 0.5) * BUCKET_MS;
    }
    return maxMs;
  };

  const record = (intervalMs: number): void => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    if (intervalMs >= SUSPENSION_THRESHOLD_MS) {
      suspensions += 1;
      return;
    }

    count += 1;
    totalMs += intervalMs;
    if (intervalMs > maxMs) maxMs = intervalMs;
    if (intervalMs >= STALL_THRESHOLD_MS) stalls += 1;

    const bucket = Math.floor(intervalMs / BUCKET_MS);
    if (bucket >= BUCKET_COUNT) {
      overflow += 1;
    } else {
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
  };

  return {
    record,

    observeFrame(intervalMs: number, nowMs: number): void {
      frameCount += 1;
      if (firstFrameAtMs === null) {
        firstFrameAtMs = nowMs;
        return;
      }
      record(intervalMs);
    },

    summarise(targetHz: number | null = null): FrameSummary {
      const meanIntervalMs = count === 0 ? 0 : totalMs / count;
      const targetIntervalMs =
        targetHz === null || targetHz <= 0 ? null : 1000 / targetHz;

      let droppedFrames: number | null = null;
      let droppedPercent: number | null = null;
      if (targetIntervalMs !== null && count > 0) {
        // Each interval covers `round(interval / period)` display periods; every
        // period beyond the first is a frame the user did not see. Rounding puts
        // the boundary at 1.5 periods, so ordinary jitter is not counted.
        let dropped = 0;
        for (let i = 0; i < BUCKET_COUNT; i += 1) {
          const samples = buckets[i] ?? 0;
          if (samples === 0) continue;
          const periods = Math.round(((i + 0.5) * BUCKET_MS) / targetIntervalMs);
          if (periods > 1) dropped += (periods - 1) * samples;
        }
        if (overflow > 0) {
          dropped += Math.max(0, Math.round(MAX_TRACKED_MS / targetIntervalMs) - 1) * overflow;
        }
        droppedFrames = dropped;
        // Expressed against the frames that should have been delivered.
        const expected = count + dropped;
        droppedPercent = expected === 0 ? 0 : (dropped / expected) * 100;
      }

      return {
        frameCount,
        firstFrameAtMs,
        sampleCount: count,
        elapsedMs: totalMs,
        meanIntervalMs,
        meanFps: meanIntervalMs === 0 ? 0 : 1000 / meanIntervalMs,
        medianIntervalMs: percentile(0.5),
        p95IntervalMs: percentile(0.95),
        p99IntervalMs: percentile(0.99),
        maxIntervalMs: maxMs,
        targetHz,
        targetIntervalMs,
        droppedFrames,
        droppedPercent,
        stalls,
        suspensions,
      };
    },

    reset,
  };
}

/** Rounds for display without pretending to precision the measurement lacks. */
const round = (value: number, places = 1): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/**
 * A plain-text report, shaped for pasting straight into `docs/QUEST-TEST.md`.
 *
 * Kept in the domain so its wording is covered by tests: this text is the
 * evidence that ends up in the acceptance record, and it must not overstate
 * what was measured.
 */
export function formatFrameReport(summary: FrameSummary, context: DiagnosticsContext): string {
  const lines = [
    `Recorded: ${context.recordedAt}`,
    `Mode: ${context.mode}`,
    `Device/UA: ${context.userAgent}`,
    '',
    `Reported frame rate: ${context.reportedFrameRate ?? 'not reported'}`,
    `Supported frame rates: ${context.supportedFrameRates.length > 0 ? context.supportedFrameRates.join(', ') : 'not reported'}`,
    `Time to first frame: ${context.timeToFirstFrameMs === null ? 'not measured' : `${round(context.timeToFirstFrameMs)} ms`}`,
    `Input sources at end: ${context.inputSourceCount}`,
    '',
    `Samples: ${summary.sampleCount} over ${round(summary.elapsedMs / 1000)} s`,
    `Mean interval: ${round(summary.meanIntervalMs, 2)} ms (${round(summary.meanFps)} fps)`,
    `Median: ${round(summary.medianIntervalMs, 2)} ms`,
    `p95: ${round(summary.p95IntervalMs, 2)} ms`,
    `p99: ${round(summary.p99IntervalMs, 2)} ms`,
    `Max: ${round(summary.maxIntervalMs, 2)} ms`,
    `Stalls (>= ${STALL_THRESHOLD_MS} ms): ${summary.stalls}`,
    `Estimated dropped frames: ${
      summary.droppedFrames === null
        ? 'no target rate reported'
        : `${summary.droppedFrames} (${round(summary.droppedPercent ?? 0, 2)}%)`
    }`,
    `Suspensions excluded: ${summary.suspensions}`,
    '',
    'Dropped frames are inferred from frame intervals; WebXR reports no',
    'compositor dropped-frame count. Desktop figures are requestAnimationFrame',
    'cadence, not XR frame cadence.',
  ];
  return lines.join('\n');
}

/** Everything about a run that is not a frame interval. */
export interface DiagnosticsContext {
  /** ISO timestamp. */
  readonly recordedAt: string;
  readonly mode: 'immersive-vr' | 'desktop';
  readonly userAgent: string;
  readonly reportedFrameRate: number | null;
  readonly supportedFrameRates: readonly number[];
  readonly timeToFirstFrameMs: number | null;
  readonly inputSourceCount: number;
}
