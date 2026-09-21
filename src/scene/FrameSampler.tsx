/**
 * Feeds rendered frames to a recorder.
 *
 * `useFrame` runs on every frame, so nothing here may allocate, call a React
 * setter or touch the DOM. AGENTS.md keeps React updates out of the per-frame
 * hot path, and a diagnostics tool that itself costs frames would corrupt the
 * measurement it exists to take. The recorder owns the run's mutable state; this
 * component only reports frames and renders nothing.
 *
 * No render priority is passed: a non-zero priority makes R3F hand rendering
 * back to the caller, which is not what an observer wants.
 */

import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useEffect } from 'react';
import type { FrameRecorder } from '../domain/index.ts';

export interface FrameSamplerProps {
  readonly recorder: FrameRecorder;
}

export function FrameSampler({ recorder }: FrameSamplerProps) {
  const session = useXR((state) => state.session);

  // A new session is a new run. Resetting in an effect keeps the hot path from
  // comparing session identity on every frame.
  useEffect(() => {
    recorder.reset();
  }, [recorder, session]);

  useFrame((_state, delta) => {
    // R3F reports delta in seconds.
    recorder.observeFrame(delta * 1000, performance.now());
  });

  return null;
}
