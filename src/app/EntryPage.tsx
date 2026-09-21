/**
 * The desktop entry surface.
 *
 * It answers three questions before anyone reaches for a headset: can this
 * browser do immersive VR, what happens if it cannot, and what did the last
 * attempt do. Each capability state gets its own wording — a Quest owner on an
 * http:// address and a desktop Firefox user need different advice, and a single
 * "unsupported" message serves neither.
 */

import { useState } from 'react';
import type { DiagnosticsRun } from '../persistence/index.ts';
import type { XrCapability } from './xrCapability.ts';

export type SessionPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'requesting' }
  | { readonly kind: 'active' }
  /** The user came back from VR by their own choice or by removing the headset. */
  | { readonly kind: 'ended' }
  | { readonly kind: 'denied'; readonly message: string };

export interface EntryPageProps {
  readonly capability: XrCapability;
  readonly phase: SessionPhase;
  readonly emulated: boolean;
  readonly contentLoading: boolean;
  readonly storageNotice: string | null;
  /** The most recent recorded run, shown once the headset is off. */
  readonly lastRun: DiagnosticsRun | null;
  readonly onEnterVr: () => void;
  readonly onDismissStorageNotice: () => void;
  readonly onClearLastRun: () => void;
}

interface CapabilityCopy {
  readonly tone: 'neutral' | 'good' | 'warn';
  readonly label: string;
  readonly detail: string;
}

function describeCapability(capability: XrCapability): CapabilityCopy {
  switch (capability.status) {
    case 'checking':
      return { tone: 'neutral', label: 'Checking headset support', detail: 'Asking this browser whether it can open an immersive session.' };
    case 'supported':
      return { tone: 'good', label: 'Immersive VR available', detail: 'This browser can open an immersive session. Select Enter VR when you are ready.' };
    case 'no-immersive-vr':
      return { tone: 'warn', label: 'No immersive VR here', detail: 'This browser has WebXR but is not offering immersive VR. The desktop view below has the same room and the same controls.' };
    case 'no-webxr':
      return capability.secureContext
        ? { tone: 'warn', label: 'No WebXR in this browser', detail: 'Open this page in Meta Quest Browser to enter VR. The desktop view below works everywhere.' }
        : { tone: 'warn', label: 'Needs a secure address', detail: 'WebXR is only offered over HTTPS. Open the https:// address of this page, then Enter VR will appear.' };
    case 'check-failed':
      return { tone: 'warn', label: 'Support check did not finish', detail: `${capability.message} The desktop view below still works.` };
    default: {
      const exhaustive: never = capability;
      return exhaustive;
    }
  }
}

export function EntryPage({
  capability,
  phase,
  emulated,
  contentLoading,
  storageNotice,
  lastRun,
  onEnterVr,
  onDismissStorageNotice,
  onClearLastRun,
}: EntryPageProps) {
  const copy = describeCapability(capability);
  const canEnter = capability.status === 'supported' && !contentLoading && phase.kind !== 'requesting';

  return (
    <>
    <header className="entry">
      <div className="entry__brand">
        <span className="entry__mark" aria-hidden="true" />
        <div>
          <h1>Loci</h1>
          <p className="entry__subtitle">M0 · one room, three mnemonics</p>
        </div>
      </div>

      <div className="entry__status">
        <p className={`entry__capability entry__capability--${copy.tone}`}>
          <span className="entry__dot" aria-hidden="true" />
          <strong>{copy.label}</strong>
        </p>
        <p className="entry__detail">{copy.detail}</p>

        {contentLoading && <p className="entry__detail">Loading the demo palace…</p>}

        {/* An emulated session proves the wiring and nothing about comfort or
            frame pacing. Saying so here is cheaper than a wrong conclusion. */}
        {emulated && (
          <p className="entry__detail entry__detail--flag">
            Development device emulator active (localhost only). Not evidence of Quest 3 behaviour.
          </p>
        )}

        {phase.kind === 'requesting' && <p className="entry__detail">Asking for an immersive session…</p>}
        {phase.kind === 'ended' && (
          <p className="entry__detail">Session ended. Your place in the room was kept — Enter VR to go back.</p>
        )}
        {phase.kind === 'denied' && (
          <p className="entry__detail entry__detail--flag" role="alert">
            {phase.message}
          </p>
        )}

        {storageNotice !== null && (
          <p className="entry__detail entry__detail--flag" role="status">
            {storageNotice}{' '}
            <button type="button" className="entry__link" onClick={onDismissStorageNotice}>
              Dismiss
            </button>
          </p>
        )}
      </div>

      <div className="entry__actions">
        {/* The immersive request must come from a user gesture, so this is a
            real button and never an effect. */}
        <button type="button" className="entry__enter" onClick={onEnterVr} disabled={!canEnter}>
          {phase.kind === 'active' ? 'In VR' : 'Enter VR'}
        </button>
        <p className="entry__hint">
          Desktop: drag to look, click a plinth to select, click the teal floor to move.
        </p>
      </div>
    </header>

    {/* Shown after a session, not during one. Reading numbers through a headset
        and retyping them is how an acceptance record ends up approximate, so
        the run is kept and presented here as text to copy. */}
    {lastRun !== null && <LastRunReport run={lastRun} onClear={onClearLastRun} />}
    </>
  );
}

function LastRunReport({ run, onClear }: { run: DiagnosticsRun; onClear: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    // `writeText` needs a secure context and permission; if it is refused the
    // text is still on screen and selectable, so this never blocks the user.
    void navigator.clipboard
      ?.writeText(run.report)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <section className="run" aria-label="Last recorded test run">
      <div className="run__head">
        <div>
          <h2>Last recorded run</h2>
          <p className="run__meta">
            {run.context.mode === 'immersive-vr' ? 'Immersive session' : 'Desktop view'} ·{' '}
            {run.summary.sampleCount} frames ·{' '}
            {new Date(run.context.recordedAt).toLocaleString()}
          </p>
        </div>
        <div className="run__actions">
          <button type="button" className="run__button" onClick={copy}>
            {copied ? 'Copied' : 'Copy for QUEST-TEST.md'}
          </button>
          <button type="button" className="run__button" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      <pre className="run__report">{run.report}</pre>
    </section>
  );
}
