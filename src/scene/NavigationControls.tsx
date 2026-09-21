/**
 * Navigation and comfort controls, rendered in the scene.
 *
 * In immersive mode HTML is not visible, so anything the user might *need* —
 * turning, recentring, switching posture, leaving — has to exist as geometry.
 * These duplicate the controller bindings on purpose: snap turn needs both
 * controllers connected, and a user with one controller, a flat battery or
 * hand tracking still has to be able to turn round and get out.
 */

import type { PostureMode, TurnDirection } from '../domain/index.ts';
import { SpatialButton } from './SpatialButton.tsx';
import { SpatialText } from './SpatialText.tsx';
import { palette } from './theme.ts';

export interface NavigationControlsProps {
  readonly posture: PostureMode;
  readonly inSession: boolean;
  readonly onSnapTurn: (direction: TurnDirection) => void;
  readonly onRecenter: () => void;
  readonly onTogglePosture: () => void;
  readonly onExit: () => void;
}

export function NavigationControls({
  posture,
  inSession,
  onSnapTurn,
  onRecenter,
  onTogglePosture,
  onExit,
}: NavigationControlsProps) {
  return (
    <group>
      <SpatialText
        position={[-0.54, 0.105, 0]}
        fontSize={0.026}
        color={palette.inkSoft}
        anchorX="left"
        anchorY="middle"
        weight="semibold"
      >
        MOVE AND COMFORT
      </SpatialText>

      <SpatialButton label="Turn left" position={[-0.435, 0, 0]} width={0.28} height={0.11} onClick={() => onSnapTurn('left')} />
      <SpatialButton label="Turn right" position={[-0.145, 0, 0]} width={0.28} height={0.11} onClick={() => onSnapTurn('right')} />
      <SpatialButton label="Recentre" position={[0.145, 0, 0]} width={0.28} height={0.11} onClick={onRecenter} />
      <SpatialButton
        label={posture === 'seated' ? 'Seated' : 'Standing'}
        position={[0.435, 0, 0]}
        width={0.28}
        height={0.11}
        onClick={onTogglePosture}
      />

      {/* Leaving must never depend on finding a system menu. */}
      {inSession && (
        <SpatialButton label="Exit VR" position={[0.435, -0.14, 0]} width={0.28} height={0.11} onClick={onExit} />
      )}
    </group>
  );
}
