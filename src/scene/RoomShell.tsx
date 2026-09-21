/**
 * The room a palace is built inside.
 *
 * Geometry comes from the same `RoomTemplate` the teleport bounds are derived
 * from, so the floor a user can reach always matches the floor they can see.
 * Deliberately plain: distinct silhouette, calm surfaces, no real-time shadows
 * and no postprocessing, leaving the mnemonic props as the loud things.
 */

import { useMemo } from 'react';
import { BackSide, DoubleSide } from 'three';
import { templateOf, type Room } from '../domain/index.ts';
import { palette, themeColors } from './theme.ts';

export function RoomShell({ room }: { room: Room }) {
  const template = templateOf(room);
  const { widthMetres: w, depthMetres: d, wallHeightMetres: h } = template;
  const theme = themeColors[room.theme];

  // A simple grid gives the floor a sense of scale and helps judge distance,
  // which matters more in a headset than it does on a monitor.
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = -w / 2 + 1; i < w / 2; i += 1) lines.push(i);
    return lines;
  }, [w]);

  return (
    <group position={room.origin} rotation={[0, (room.yawDegrees * Math.PI) / 180, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.floor} roughness={0.95} metalness={0} />
      </mesh>

      {gridLines.map((x) => (
        <mesh key={`x${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, 0]}>
          <planeGeometry args={[0.012, d]} />
          <meshBasicMaterial color={palette.floorLine} />
        </mesh>
      ))}
      {gridLines.map((z) => (
        <mesh key={`z${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, z]}>
          <planeGeometry args={[w, 0.012]} />
          <meshBasicMaterial color={palette.floorLine} />
        </mesh>
      ))}

      {/* Walls face inwards; BackSide keeps them from hiding the room when the
          desktop camera orbits outside. */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={theme.wall} side={BackSide} roughness={0.95} metalness={0} />
      </mesh>

      {/* A single tall window breaks the box up and gives an orientation cue. */}
      <mesh position={[0, 1.9, -d / 2 + 0.03]}>
        <planeGeometry args={[1.5, 1.9]} />
        <meshBasicMaterial color="#cfe3da" side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.9, -d / 2 + 0.04]}>
        <planeGeometry args={[0.05, 1.9]} />
        <meshBasicMaterial color={palette.wallTrim} side={DoubleSide} />
      </mesh>

      {/* Skirting gives the floor/wall join a readable edge at headset distance. */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[w - 0.01, 0.16, d - 0.01]} />
        <meshStandardMaterial color={palette.wallTrim} side={BackSide} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}
