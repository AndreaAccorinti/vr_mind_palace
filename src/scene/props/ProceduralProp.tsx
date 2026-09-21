/**
 * Procedural mnemonic props.
 *
 * Every prop is built from primitives, so M0 needs no asset service, no model
 * licence review and no network fetch. The renderer selects a component from a
 * closed `AssetId` union: imported content can name a prop but can never supply
 * geometry, a URL or code.
 *
 * Animations are driven from `useFrame` and write directly to object transforms
 * — no React state per frame, which is what keeps the render loop quiet.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { AnimationId, AssetId } from '../../domain/index.ts';
import { palette } from '../theme.ts';

interface PropProps {
  readonly assetId: AssetId;
  readonly animation: AnimationId;
  /** Emphasised while the locus is selected or hovered. */
  readonly emphasis?: boolean;
}

/** Shared flat material settings: no shadows or postprocessing in the baseline. */
const FLAT = { roughness: 0.85, metalness: 0.02 } as const;

function PlateStack({ animation }: { animation: AnimationId }) {
  const top = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (top.current === null) return;
    // 'lift-top' shows the LIFO rule: the last plate added leaves first.
    const t = clock.getElapsedTime();
    top.current.position.y = animation === 'lift-top' ? 0.22 + Math.max(0, Math.sin(t * 0.9)) * 0.22 : 0.22;
  });
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.07, 28]} />
        <meshStandardMaterial color={palette.propStone} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.07, 28]} />
        <meshStandardMaterial color={palette.propWarm} {...FLAT} />
      </mesh>
      <group ref={top} position={[0, 0.22, 0]}>
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.07, 28]} />
          <meshStandardMaterial color={palette.propGreen} {...FLAT} />
        </mesh>
      </group>
    </group>
  );
}

function QueueFigures({ animation }: { animation: AnimationId }) {
  const front = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (front.current === null) return;
    // 'advance-front' shows the FIFO rule: the longest waiting figure leaves first.
    const t = clock.getElapsedTime();
    front.current.position.z = animation === 'advance-front' ? -0.3 - (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.35 : -0.3;
  });
  const figure = (color: string) => (
    <>
      <mesh position={[0, 0.17, 0]}>
        <capsuleGeometry args={[0.075, 0.2, 4, 12]} />
        <meshStandardMaterial color={color} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshStandardMaterial color={color} {...FLAT} />
      </mesh>
    </>
  );
  return (
    <group>
      {/* Gate posts give the queue a direction to advance through. */}
      <mesh position={[-0.28, 0.25, -0.62]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color={palette.wallTrim} {...FLAT} />
      </mesh>
      <mesh position={[0.28, 0.25, -0.62]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color={palette.wallTrim} {...FLAT} />
      </mesh>
      <group ref={front} position={[0, 0, -0.3]}>{figure(palette.propGreen)}</group>
      <group position={[0, 0, 0.05]}>{figure(palette.propWarm)}</group>
      <group position={[0, 0, 0.4]}>{figure(palette.propStone)}</group>
    </group>
  );
}

function WaterJug() {
  return (
    <group>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.48, 24]} />
        <meshStandardMaterial color={palette.propBlue} {...FLAT} />
      </mesh>
      {/* Water surface, slightly inset so the rim reads as a lip. */}
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.02, 24]} />
        <meshStandardMaterial color={palette.propBlueLight} {...FLAT} />
      </mesh>
      <mesh position={[0.24, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.028, 10, 20, Math.PI]} />
        <meshStandardMaterial color={palette.propBlue} {...FLAT} />
      </mesh>
    </group>
  );
}

function Teacup() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.17, 0.12, 0.24, 24]} />
        <meshStandardMaterial color={palette.panel} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.015, 24]} />
        <meshStandardMaterial color={palette.propWarm} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.03, 24]} />
        <meshStandardMaterial color={palette.plinthTop} {...FLAT} />
      </mesh>
    </group>
  );
}

function SolidCube() {
  return (
    <mesh position={[0, 0.22, 0]}>
      <boxGeometry args={[0.42, 0.42, 0.42]} />
      <meshStandardMaterial color={palette.propWarm} {...FLAT} />
    </mesh>
  );
}

function Tree() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 0.4, 10]} />
        <meshStandardMaterial color="#7a6244" {...FLAT} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={palette.propGreen} {...FLAT} />
      </mesh>
    </group>
  );
}

function Door() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.52, 1, 0.06]} />
        <meshStandardMaterial color={palette.propWarm} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.5, -0.05]}>
        <boxGeometry args={[0.64, 1.08, 0.05]} />
        <meshStandardMaterial color={palette.wallTrim} {...FLAT} />
      </mesh>
      <mesh position={[0.18, 0.5, 0.05]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial color={palette.accent} {...FLAT} />
      </mesh>
    </group>
  );
}

/** Shown when an item names an asset the build cannot draw. Never silent. */
function Placeholder() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.4, 6]} />
        <meshStandardMaterial color={palette.plinth} {...FLAT} />
      </mesh>
      <mesh position={[0, 0.46, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial color={palette.hover} {...FLAT} />
      </mesh>
    </group>
  );
}

export function ProceduralProp({ assetId, animation, emphasis = false }: PropProps) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current === null) return;
    const t = clock.getElapsedTime();
    // Idle motion is small and vertical only: nothing here moves the horizon.
    const bob = animation === 'bob' ? Math.sin(t * 1.1) * 0.03 : 0;
    const pulse = animation === 'pulse' ? 1 + Math.sin(t * 1.6) * 0.04 : 1;
    const lift = emphasis ? 1.06 : 1;
    group.current.position.y = bob;
    group.current.scale.setScalar(pulse * lift);
  });

  return (
    <group ref={group}>
      {assetId === 'builtin:plate-stack' && <PlateStack animation={animation} />}
      {assetId === 'builtin:queue' && <QueueFigures animation={animation} />}
      {assetId === 'builtin:water-jug' && <WaterJug />}
      {assetId === 'builtin:teacup' && <Teacup />}
      {assetId === 'builtin:cube' && <SolidCube />}
      {assetId === 'builtin:tree' && <Tree />}
      {assetId === 'builtin:door' && <Door />}
      {assetId === 'builtin:placeholder' && <Placeholder />}
    </group>
  );
}
