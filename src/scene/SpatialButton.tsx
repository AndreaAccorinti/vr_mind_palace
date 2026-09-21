/**
 * A button that exists in the 3D world.
 *
 * Essential controls must be reachable in immersive mode, where HTML is not
 * visible, so these are meshes with pointer handlers rather than DOM elements.
 * The same component works on desktop because R3F routes mouse and touch
 * through the same pointer events as an XR controller ray.
 */

import { useRef, useState } from 'react';
import type { Group } from 'three';
import { palette } from './theme.ts';
import { SpatialText } from './SpatialText.tsx';

export interface SpatialButtonProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly position?: readonly [number, number, number];
  readonly width?: number;
  readonly height?: number;
  readonly disabled?: boolean;
  /** Draws the button as the primary action. */
  readonly primary?: boolean;
}

export function SpatialButton({
  label,
  onClick,
  position = [0, 0, 0],
  width = 0.42,
  height = 0.13,
  disabled = false,
  primary = false,
}: SpatialButtonProps) {
  const [hovered, setHovered] = useState(false);
  const group = useRef<Group>(null);

  const background = disabled
    ? palette.panelEdge
    : hovered
      ? palette.hover
      : primary
        ? palette.accent
        : palette.panel;
  const textColor = disabled ? palette.inkSoft : primary || hovered ? '#ffffff' : palette.ink;

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!disabled) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[width, height, 0.012]} />
        <meshStandardMaterial color={background} roughness={0.7} metalness={0} />
      </mesh>
      {/* A visible outline is the hover feedback a controller ray needs. */}
      <mesh position={[0, 0, -0.008]}>
        <boxGeometry args={[width + 0.016, height + 0.016, 0.006]} />
        <meshStandardMaterial
          color={hovered && !disabled ? palette.accentBright : palette.panelEdge}
          roughness={0.8}
          metalness={0}
        />
      </mesh>
      <SpatialText
        position={[0, 0, 0.009]}
        fontSize={0.042}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 0.028}
        weight="semibold"
      >
        {label}
      </SpatialText>
    </group>
  );
}
