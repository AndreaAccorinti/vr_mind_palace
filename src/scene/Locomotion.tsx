/**
 * Controller locomotion, translated into domain actions.
 *
 * The library hook can write straight to a target group, but then the object
 * transform and the app's viewer state would drift apart and recentring would
 * snap the user somewhere unexpected. Using the callback form keeps the domain
 * authoritative: the controller reports a turn, the reducer decides what that
 * means, and the origin is rendered from the result.
 *
 * Translation is disabled. Continuous stick movement is the main comfort
 * hazard in seated VR and the blueprint rules it out of the baseline; moving
 * happens by teleport.
 */

import { useXRControllerLocomotion } from '@react-three/xr';
import { useCallback } from 'react';
import type { TurnDirection } from '../domain/index.ts';
import { SNAP_TURN_DEGREES } from '../domain/index.ts';

export interface LocomotionProps {
  readonly onSnapTurn: (direction: TurnDirection) => void;
}

export function Locomotion({ onSnapTurn }: LocomotionProps) {
  const handle = useCallback(
    (_velocity: unknown, rotationVelocityY: number) => {
      if (rotationVelocityY === 0) return;
      // The hook emits one discrete radian delta per stick push in snap mode.
      // Positive is a left turn in the Three.js convention.
      onSnapTurn(rotationVelocityY > 0 ? 'left' : 'right');
    },
    [onSnapTurn],
  );

  useXRControllerLocomotion(handle, false, {
    type: 'snap',
    degrees: SNAP_TURN_DEGREES,
    deadZone: 0.5,
  });

  return null;
}
