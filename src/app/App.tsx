/**
 * The application shell.
 *
 * Responsibilities kept here and nowhere else: deciding whether the renderer can
 * start at all, owning the session request and its failure modes, and keeping
 * the desktop page and the immersive scene fed from one session state.
 */

import { Canvas } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { PalaceScene } from '../scene/PalaceScene.tsx';
import { createLocalDiagnosticsRepository } from '../persistence/index.ts';
import { EntryPage, type SessionPhase } from './EntryPage.tsx';
import { useDiagnostics, type EndedSessionFacts } from './useDiagnostics.ts';
import { usePalaceSession } from './usePalaceSession.ts';
import { detectWebGl } from './xrCapability.ts';
import { useIsEmulated, useXrCapability } from './useXrCapability.ts';
import { exitXR, xrStore } from './xrStore.ts';

/**
 * Shown when WebGL2 is unavailable. There is no 3D fallback to offer, so it
 * says what is wrong and what to try instead of rendering an empty canvas.
 */
function WebGlUnavailable() {
  return (
    <main className="fallback">
      <h1>Loci needs WebGL</h1>
      <p>
        This browser did not provide a WebGL2 context, so the palace cannot be drawn. Hardware
        acceleration being switched off is the usual cause.
      </p>
      <p className="fallback__hint">
        Try enabling hardware acceleration, updating the graphics driver, or opening the page in
        Meta Quest Browser, Chrome or Edge.
      </p>
    </main>
  );
}

/**
 * Reports session lifecycle back to the shell without re-rendering the scene.
 *
 * On session end the facts are taken from the store's *previous* state: by the
 * time the new state arrives the session is gone, along with the frame rate and
 * input sources the finished run needs to describe itself.
 */
function SessionWatcher({
  onStart,
  onEnd,
}: {
  onStart: () => void;
  onEnd: (facts: RuntimeFacts) => void;
}) {
  useEffect(
    () =>
      xrStore.subscribe((state, previous) => {
        const now = state.session != null;
        const before = previous.session != null;
        if (now === before) return;
        if (now) {
          onStart();
        } else {
          onEnd(readRuntimeFacts(previous.session, previous.inputSourceStates.length));
        }
      }),
    [onStart, onEnd],
  );
  return null;
}

/** Lives inside the Canvas so it may use XR context hooks. */
function EmulationReporter({ onChange }: { onChange: (emulated: boolean) => void }) {
  const emulated = useIsEmulated();
  useEffect(() => {
    onChange(emulated);
  }, [emulated, onChange]);
  return null;
}

/** What the runtime currently says about itself. */
interface RuntimeFacts {
  readonly reportedFrameRate: number | null;
  readonly supportedFrameRates: readonly number[];
  readonly inputSourceCount: number;
}

const NO_RUNTIME_FACTS: RuntimeFacts = {
  reportedFrameRate: null,
  supportedFrameRates: [],
  inputSourceCount: 0,
};

function readRuntimeFacts(session: XRSession | undefined, inputSourceCount: number): RuntimeFacts {
  if (session == null) return NO_RUNTIME_FACTS;
  return {
    reportedFrameRate: session.frameRate ?? null,
    supportedFrameRates: Array.from(session.supportedFrameRates ?? []),
    inputSourceCount,
  };
}

/**
 * Reports what the runtime says about itself, while a session is live.
 *
 * `frameRate` only exists once there is a session, and it can change mid-session
 * if the runtime renegotiates, so it is read from store state and refreshed on
 * `frameratechange` rather than captured once at entry.
 */
function SessionFactsReporter({ onChange }: { onChange: (facts: RuntimeFacts) => void }) {
  const session = useXR((state) => state.session);
  const inputSourceCount = useXR((state) => state.inputSourceStates.length);

  useEffect(() => {
    const read = () => onChange(readRuntimeFacts(session, inputSourceCount));
    read();
    if (session == null) return undefined;
    session.addEventListener('frameratechange', read);
    return () => session.removeEventListener('frameratechange', read);
  }, [session, inputSourceCount, onChange]);

  return null;
}

export function App() {
  const [webglAvailable] = useState(detectWebGl);
  const [phase, setPhase] = useState<SessionPhase>({ kind: 'idle' });
  const [emulated, setEmulated] = useState(false);
  const capability = useXrCapability();
  const session = usePalaceSession();

  const diagnosticsRepository = useMemo(() => createLocalDiagnosticsRepository(), []);
  const [runtimeFacts, setRuntimeFacts] = useState<RuntimeFacts>(NO_RUNTIME_FACTS);
  // Set the moment Enter VR is pressed, so time-to-first-frame measures what the
  // user actually waits through, not only the part after the session exists.
  const [requestedAtMs, setRequestedAtMs] = useState<number | null>(null);
  const diagnostics = useDiagnostics(runtimeFacts.reportedFrameRate, diagnosticsRepository);
  const { finish } = diagnostics;

  const handleSessionStart = useCallback(() => {
    setPhase({ kind: 'active' });
  }, []);

  const inSession = phase.kind === 'active';

  // Banking a run without ending the session, and the only capture path on
  // desktop, where no session ever ends.
  const saveRun = useCallback(() => {
    finish({
      mode: inSession ? 'immersive-vr' : 'desktop',
      reportedFrameRate: runtimeFacts.reportedFrameRate,
      supportedFrameRates: runtimeFacts.supportedFrameRates,
      inputSourceCount: runtimeFacts.inputSourceCount,
      requestedAtMs,
    } satisfies EndedSessionFacts);
  }, [finish, inSession, runtimeFacts, requestedAtMs]);

  const handleSessionEnd = useCallback(
    (endedFacts: RuntimeFacts) => {
      // The run is captured from the ending session's own facts, then the page
      // moves to `ended` rather than `idle`: returning from VR is a state worth
      // acknowledging, not a silent reset.
      finish({
        mode: 'immersive-vr',
        reportedFrameRate: endedFacts.reportedFrameRate,
        supportedFrameRates: endedFacts.supportedFrameRates,
        inputSourceCount: endedFacts.inputSourceCount,
        requestedAtMs,
      } satisfies EndedSessionFacts);
      setPhase({ kind: 'ended' });
    },
    [finish, requestedAtMs],
  );

  const enterVr = useCallback(() => {
    setRequestedAtMs(performance.now());
    setPhase({ kind: 'requesting' });
    xrStore
      .enterVR()
      .then((xrSession) => {
        // A resolved promise with no session means the request was refused
        // without throwing, which a headset does when another app holds it.
        if (xrSession == null) {
          setPhase({
            kind: 'denied',
            message: 'The headset did not start a session. Close any other immersive app and try again.',
          });
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'The browser refused the immersive session. Select Enter VR again and accept the permission prompt.'
            : error instanceof Error
              ? `The immersive session could not start: ${error.message}`
              : 'The immersive session could not start.';
        setPhase({ kind: 'denied', message });
      });
  }, []);

  const handleExit = useCallback(() => {
    void exitXR();
  }, []);

  if (!webglAvailable) return <WebGlUnavailable />;

  const contentLoading = session.status.kind === 'loading';

  return (
    <div className="app">
      <EntryPage
        capability={capability}
        phase={phase}
        emulated={emulated}
        contentLoading={contentLoading}
        storageNotice={session.storageNotice}
        lastRun={diagnostics.lastRun}
        onEnterVr={enterVr}
        onDismissStorageNotice={session.dismissStorageNotice}
        onClearLastRun={diagnostics.clearLastRun}
      />

      <div className="stage">
        {session.status.kind === 'failed' && (
          <p className="stage__message" role="alert">
            {session.status.message}
          </p>
        )}
        {contentLoading && <p className="stage__message">Preparing the room…</p>}

        <Canvas
          className="stage__canvas"
          // A modest pixel ratio cap: the headset compositor sets its own
          // resolution, and an uncapped desktop ratio wastes fill rate for no
          // visible gain.
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 62, near: 0.05, far: 60, position: [0, 1.6, 1.2] }}
          // No shadow maps anywhere in the baseline.
          shadows={false}
        >
          <color attach="background" args={['#e7e2d4']} />
          <XR store={xrStore}>
            <SessionWatcher onStart={handleSessionStart} onEnd={handleSessionEnd} />
            <EmulationReporter onChange={setEmulated} />
            <SessionFactsReporter onChange={setRuntimeFacts} />
            {/* Fonts stream in through Suspense; the room renders first so the
                view is never blank while text resolves. */}
            <Suspense fallback={null}>
              {session.status.kind === 'ready' && session.roomId !== null && (
                <PalaceScene
                  content={session.status.content}
                  roomId={session.roomId}
                  viewer={session.viewer}
                  review={session.review}
                  selectedLocusId={session.selectedLocusId}
                  onSelectLocus={session.selectLocus}
                  onSnapTurn={session.snapTurn}
                  onTeleport={session.teleport}
                  onRecenter={session.recenter}
                  onTogglePosture={session.togglePosture}
                  onExit={handleExit}
                  onHint={session.hint}
                  onNextChunk={session.nextChunk}
                  onReveal={session.reveal}
                  onRate={session.rate}
                  onRestart={session.restart}
                  diagnostics={{
                    recorder: diagnostics.recorder,
                    summary: diagnostics.summary,
                    visible: diagnostics.visible,
                    reportedFrameRate: runtimeFacts.reportedFrameRate,
                    supportedFrameRates: runtimeFacts.supportedFrameRates,
                    inputSourceCount: runtimeFacts.inputSourceCount,
                    onToggle: diagnostics.toggle,
                    onReset: diagnostics.reset,
                    onSave: saveRun,
                  }}
                />
              )}
            </Suspense>
          </XR>
        </Canvas>
      </div>
    </div>
  );
}
