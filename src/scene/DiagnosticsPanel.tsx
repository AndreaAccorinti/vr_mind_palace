/**
 * The in-scene diagnostics readout.
 *
 * It has to be geometry, not HTML: the whole point is reading it during an
 * immersive session, where a DOM overlay is not visible. It sits off to one
 * side, angled inward, so a glance reaches it without it covering the room
 * during a five-minute rehearsal.
 *
 * Every figure is labelled for what it is. "Mean fps" is derived from frame
 * intervals, and "dropped" is an estimate — saying so on the panel is what stops
 * a screenshot of it being quoted later as a compositor measurement.
 */

import {
  STALL_THRESHOLD_MS,
  type FrameSummary,
} from '../domain/index.ts';
import { SpatialButton } from './SpatialButton.tsx';
import { SpatialText } from './SpatialText.tsx';
import { palette } from './theme.ts';

export interface DiagnosticsPanelProps {
  readonly summary: FrameSummary | null;
  readonly reportedFrameRate: number | null;
  readonly supportedFrameRates: readonly number[];
  readonly inputSourceCount: number;
  readonly inSession: boolean;
  readonly onReset: () => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
}

const fixed = (value: number, places = 1) => value.toFixed(places);

export function DiagnosticsPanel({
  summary,
  reportedFrameRate,
  supportedFrameRates,
  inputSourceCount,
  inSession,
  onReset,
  onSave,
  onClose,
}: DiagnosticsPanelProps) {
  const rows: readonly (readonly [string, string])[] =
    summary === null
      ? [['Sampling…', '']]
      : [
          ['Samples', `${summary.sampleCount} · ${fixed(summary.elapsedMs / 1000)} s`],
          ['Mean', `${fixed(summary.meanIntervalMs, 2)} ms · ${fixed(summary.meanFps)} fps`],
          ['Median', `${fixed(summary.medianIntervalMs, 2)} ms`],
          ['p95 / p99', `${fixed(summary.p95IntervalMs, 2)} / ${fixed(summary.p99IntervalMs, 2)} ms`],
          ['Max', `${fixed(summary.maxIntervalMs, 2)} ms`],
          // Plain ASCII on purpose: a character outside the bundled Latin
          // subset routes the whole string to the 1.4 MB Japanese font, which
          // on desktop means a needless download and a label that renders blank
          // until it arrives. See src/scene/fonts.ts.
          [`Stalls >= ${STALL_THRESHOLD_MS}ms`, `${summary.stalls}`],
          [
            'Dropped (est.)',
            summary.droppedFrames === null
              ? 'no target rate'
              : `${summary.droppedFrames} · ${fixed(summary.droppedPercent ?? 0, 2)}%`,
          ],
          ['Suspensions', `${summary.suspensions}`],
        ];

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.78, 1.04, 0.02]} />
        <meshStandardMaterial color={palette.panel} roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, 0, -0.014]}>
        <boxGeometry args={[0.81, 1.07, 0.01]} />
        <meshStandardMaterial color={palette.panelEdge} roughness={0.85} metalness={0} />
      </mesh>

      <SpatialText
        position={[-0.345, 0.465, 0.013]}
        fontSize={0.026}
        color={palette.inkSoft}
        anchorX="left"
        anchorY="middle"
        weight="semibold"
      >
        FRAME DIAGNOSTICS
      </SpatialText>

      {/* What the runtime itself reported, kept visually apart from what we
          derived, so the two are never confused. */}
      <SpatialText
        position={[-0.345, 0.415, 0.013]}
        fontSize={0.024}
        color={palette.ink}
        anchorX="left"
        anchorY="middle"
        maxWidth={0.7}
      >
        {`Runtime: ${reportedFrameRate === null ? 'no rate reported' : `${reportedFrameRate} Hz`}` +
          `${supportedFrameRates.length > 0 ? ` of ${supportedFrameRates.join('/')}` : ''}` +
          ` · ${inputSourceCount} input${inputSourceCount === 1 ? '' : 's'}`}
      </SpatialText>

      {!inSession && (
        <SpatialText
          position={[-0.345, 0.372, 0.013]}
          fontSize={0.021}
          color={palette.hover}
          anchorX="left"
          anchorY="middle"
          maxWidth={0.7}
        >
          Desktop: this is animation-frame cadence, not XR cadence.
        </SpatialText>
      )}

      {rows.map(([label, value], index) => {
        const y = 0.295 - index * 0.052;
        return (
          <group key={label}>
            <SpatialText
              position={[-0.345, y, 0.013]}
              fontSize={0.026}
              color={palette.inkSoft}
              anchorX="left"
              anchorY="middle"
              maxWidth={0.33}
            >
              {label}
            </SpatialText>
            <SpatialText
              position={[0.345, y, 0.013]}
              fontSize={0.026}
              color={palette.ink}
              anchorX="right"
              anchorY="middle"
              maxWidth={0.4}
              weight="semibold"
            >
              {value}
            </SpatialText>
          </group>
        );
      })}

      <SpatialText
        position={[-0.345, -0.175, 0.013]}
        fontSize={0.02}
        color={palette.inkSoft}
        anchorX="left"
        anchorY="top"
        maxWidth={0.7}
        lineHeight={1.3}
      >
        Dropped frames are inferred from intervals. WebXR reports no compositor count.
      </SpatialText>

      <group position={[0, -0.345, 0.013]}>
        <SpatialButton label="Restart run" position={[-0.18, 0, 0]} width={0.31} height={0.095} onClick={onReset} />
        <SpatialButton label="Hide" position={[0.18, 0, 0]} width={0.31} height={0.095} onClick={onClose} />
      </group>

      {/* Saving without leaving the session: a run can be banked mid-rehearsal,
          and it is the only way to capture one on desktop, where no session ever
          ends to trigger the capture. */}
      <group position={[0, -0.465, 0.013]}>
        <SpatialButton
          label={(summary?.sampleCount ?? 0) < 30 ? 'Keep sampling…' : 'Save run'}
          position={[0, 0, 0]}
          width={0.64}
          height={0.095}
          primary
          disabled={(summary?.sampleCount ?? 0) < 30}
          onClick={onSave}
        />
      </group>
    </group>
  );
}
