/**
 * The application shell.
 *
 * Responsibilities kept here and nowhere else: deciding whether the renderer can
 * start at all, owning the session request and its failure modes, and keeping
 * the desktop page and the immersive scene fed from one session state.
 */

import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PalaceScene } from '../scene/PalaceScene.tsx';
import { EntryPage, type SessionPhase } from './EntryPage.tsx';
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

/** Reports session lifecycle back to the shell without re-rendering the scene. */
function SessionWatcher({ onChange }: { onChange: (active: boolean) => void }) {
  useEffect(() => {
    onChange(xrStore.getState().session != null);
    return xrStore.subscribe((state, previous) => {
      if ((state.session != null) !== (previous.session != null)) {
        onChange(state.session != null);
      }
    });
  }, [onChange]);
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

export function App() {
  const [webglAvailable] = useState(detectWebGl);
  const [phase, setPhase] = useState<SessionPhase>({ kind: 'idle' });
  const [emulated, setEmulated] = useState(false);
  const capability = useXrCapability();
  const session = usePalaceSession();

  const handleSessionChange = useCallback((active: boolean) => {
    // `ended` rather than `idle`: returning from VR is a state the page should
    // acknowledge, not a silent reset.
    setPhase((current) => (active ? { kind: 'active' } : current.kind === 'active' ? { kind: 'ended' } : current));
  }, []);

  const enterVr = useCallback(() => {
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
        onEnterVr={enterVr}
        onDismissStorageNotice={session.dismissStorageNotice}
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
            <SessionWatcher onChange={handleSessionChange} />
            <EmulationReporter onChange={setEmulated} />
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
                />
              )}
            </Suspense>
          </XR>
        </Canvas>
      </div>
    </div>
  );
}
