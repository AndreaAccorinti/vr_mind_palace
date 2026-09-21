/**
 * The teleportable floor.
 *
 * A separate, slightly raised plane rather than the room's own floor mesh: it
 * makes the reachable area explicit, keeps the margin away from the walls
 * visible, and means a teleport ray cannot land on decorative geometry.
 *
 * The target point is handed to the domain, which clamps it into the floor and
 * takes the height from the room instead of the ray. That is what stops a ray
 * grazing a wall from putting the user inside it.
 */

import { TeleportTarget } from '@react-three/xr';
import type { Vector3 } from 'three';
import { floorBoundsOf, type Room, type Vec3 } from '../domain/index.ts';
import { palette } from './theme.ts';

export interface TeleportFloorProps {
  readonly room: Room;
  readonly onTeleport: (point: Vec3) => void;
  /** Drawn only while a teleport ray is available, to keep the room calm. */
  readonly visible: boolean;
}

export function TeleportFloor({ room, onTeleport, visible }: TeleportFloorProps) {
  const bounds = floorBoundsOf(room);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreZ = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <TeleportTarget onTeleport={(point: Vector3) => onTeleport([point.x, point.y, point.z])}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centreX, 0.006, centreZ]}
        // Clicking the pad on desktop teleports too, so the same path is
        // exercised without a headset.
        onClick={(event) => {
          event.stopPropagation();
          onTeleport([event.point.x, event.point.y, event.point.z]);
        }}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={visible ? 0.14 : 0.04} />
      </mesh>
    </TeleportTarget>
  );
}
