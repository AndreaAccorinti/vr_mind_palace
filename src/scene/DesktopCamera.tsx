/**
 * The desktop camera.
 *
 * Outside a session there is no XR origin to sit inside, so the camera is
 * placed from the same viewer state the origin would use. Every domain rule —
 * teleport clamping, snap turn, recentre, the seated lift — is therefore
 * exercised by the desktop fallback, which is what makes the desktop view
 * useful for checking behaviour without a headset.
 *
 * Dragging looks around. That offset is deliberately *not* part of viewer
 * state: it is a mouse convenience with no counterpart in VR, where the user
 * simply turns their head.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, MathUtils } from 'three';
import type { ViewerState } from '../domain/index.ts';
import { originTransform } from '../domain/index.ts';

/** Eye height for a standing desktop viewer, in metres. */
const DESKTOP_EYE_HEIGHT = 1.6;
const MAX_PITCH = Math.PI / 3;

/**
 * A small downward tilt at rest, so the lectern controls are on screen without
 * the user having to discover drag-to-look first. In VR this has no equivalent:
 * the user simply looks down, and tilting the view for them would be exactly the
 * forced camera motion the comfort rules forbid.
 */
const RESTING_PITCH = -0.14;

export function DesktopCamera({ viewer, enabled }: { viewer: ViewerState; enabled: boolean }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const look = useRef({ yaw: 0, pitch: RESTING_PITCH });
  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));

  // Reset the look offset whenever the viewer is repositioned, so a recentre
  // really does face the user forwards again.
  useEffect(() => {
    look.current = { yaw: 0, pitch: RESTING_PITCH };
  }, [viewer.pose, viewer.home]);

  useEffect(() => {
    if (!enabled) return undefined;
    const element = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (event: PointerEvent) => {
      // Only drag-look with the primary button, so a select click still selects.
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      look.current.yaw -= (event.clientX - lastX) * 0.004;
      look.current.pitch = MathUtils.clamp(
        look.current.pitch - (event.clientY - lastY) * 0.004,
        -MAX_PITCH,
        MAX_PITCH,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const up = () => {
      dragging = false;
    };

    element.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      element.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [enabled, gl]);

  useFrame(() => {
    if (!enabled) return;
    const origin = originTransform(viewer);
    camera.position.set(
      origin.position[0],
      origin.position[1] + DESKTOP_EYE_HEIGHT,
      origin.position[2],
    );
    euler.current.set(
      look.current.pitch,
      (origin.yawDegrees * Math.PI) / 180 + look.current.yaw,
      0,
      'YXZ',
    );
    camera.quaternion.setFromEuler(euler.current);
  });

  return null;
}
