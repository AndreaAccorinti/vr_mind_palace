/**
 * Collects a device-test run and hands it to the UI.
 *
 * The recorder is mutable and updated once per frame; this hook is the only
 * thing that turns it into React state, and it does so on a fixed low-rate timer
 * rather than per frame. Polling at 2 Hz costs two renders a second instead of
 * seventy-two, which is the difference between measuring the app and measuring
 * the measurement.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createFrameRecorder,
  formatFrameReport,
  type DiagnosticsContext,
  type FrameRecorder,
  type FrameSummary,
} from '../domain/index.ts';
import type { DiagnosticsRepository, DiagnosticsRun } from '../persistence/index.ts';

/** How often the readout refreshes. Slow enough to be free, fast enough to read. */
const POLL_INTERVAL_MS = 500;

/** Too short to be a measurement: someone entered and left again. */
const MIN_SAMPLES_TO_KEEP = 30;

/** What the runtime reported about a session, captured as it ended. */
export interface EndedSessionFacts {
  readonly mode: 'immersive-vr' | 'desktop';
  readonly reportedFrameRate: number | null;
  readonly supportedFrameRates: readonly number[];
  readonly inputSourceCount: number;
  /** `performance.now()` when the user pressed Enter VR. */
  readonly requestedAtMs: number | null;
}

export interface Diagnostics {
  readonly recorder: FrameRecorder;
  /** Null until the readout is switched on. */
  readonly summary: FrameSummary | null;
  readonly visible: boolean;
  readonly toggle: () => void;
  readonly reset: () => void;
  /** The most recent finished run, for reading once the headset is off. */
  readonly lastRun: DiagnosticsRun | null;
  readonly clearLastRun: () => void;
  /** Captures the run that just ended. */
  readonly finish: (facts: EndedSessionFacts) => void;
}

export function useDiagnostics(
  reportedFrameRate: number | null,
  repository: DiagnosticsRepository,
): Diagnostics {
  const recorder = useMemo(() => createFrameRecorder(), []);

  const [visible, setVisible] = useState(false);
  const [summary, setSummary] = useState<FrameSummary | null>(null);
  const [lastRun, setLastRun] = useState<DiagnosticsRun | null>(() => {
    const loaded = repository.loadLastRun();
    return loaded.ok ? loaded.value : null;
  });

  useEffect(() => {
    if (!visible) return undefined;
    const tick = () => setSummary(recorder.summarise(reportedFrameRate));
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // The rate is a dependency on purpose: it changes only when the runtime
    // renegotiates, and the readout must not keep quoting the old target.
  }, [visible, recorder, reportedFrameRate]);

  const finish = useCallback(
    (facts: EndedSessionFacts) => {
      const frameSummary = recorder.summarise(facts.reportedFrameRate);
      if (frameSummary.sampleCount < MIN_SAMPLES_TO_KEEP) return;

      const context: DiagnosticsContext = {
        recordedAt: new Date().toISOString(),
        mode: facts.mode,
        userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
        reportedFrameRate: facts.reportedFrameRate,
        supportedFrameRates: facts.supportedFrameRates,
        timeToFirstFrameMs:
          facts.requestedAtMs === null || frameSummary.firstFrameAtMs === null
            ? null
            : frameSummary.firstFrameAtMs - facts.requestedAtMs,
        inputSourceCount: facts.inputSourceCount,
      };

      const run: DiagnosticsRun = {
        context,
        summary: frameSummary,
        report: formatFrameReport(frameSummary, context),
      };
      setLastRun(run);
      // A failed save is not worth interrupting anyone for: the run is on screen
      // either way. It only means it will not survive a reload.
      repository.saveLastRun(run);
    },
    [recorder, repository],
  );

  return {
    recorder,
    summary,
    visible,
    toggle: useCallback(() => setVisible((current) => !current), []),
    reset: useCallback(() => {
      recorder.reset();
      setSummary(null);
    }, [recorder]),
    lastRun,
    clearLastRun: useCallback(() => {
      setLastRun(null);
      repository.clearLastRun();
    }, [repository]),
    finish,
  };
}
