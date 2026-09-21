/**
 * One locus: a plinth, its mnemonic props and its label.
 *
 * The station is placed from the composed room x locus transform, so its world
 * position is a function of saved data alone. Selecting an item, sorting a list
 * or scheduling a review cannot move it — the invariant the blueprint calls a
 * stable locus.
 */

import { useRef, useState } from 'react';
import type { Group } from 'three';
import {
  locusWorldTransform,
  templateOf,
  visibleNodes,
  type LearningItem,
  type Locus,
  type Room,
} from '../domain/index.ts';
import { ProceduralProp } from './props/ProceduralProp.tsx';
import { SpatialText } from './SpatialText.tsx';
import { palette } from './theme.ts';

export interface LocusStationProps {
  readonly room: Room;
  readonly locus: Locus;
  readonly item: LearningItem | undefined;
  readonly selected: boolean;
  /** Hides the mnemonic until the user asks for a hint. */
  readonly showMnemonic: boolean;
  readonly chunkIndex: number;
  readonly onSelect: (locusId: string) => void;
}

export function LocusStation({
  room,
  locus,
  item,
  selected,
  showMnemonic,
  chunkIndex,
  onSelect,
}: LocusStationProps) {
  const [hovered, setHovered] = useState(false);
  const group = useRef<Group>(null);
  const world = locusWorldTransform(room, locus);
  const template = templateOf(room);
  const plinthHeight = template.plinthHeightMetres;

  const nodes = item === undefined ? [] : visibleNodes(item.mnemonic, chunkIndex);
  const highlight = selected ? palette.accentBright : hovered ? palette.hover : palette.panelEdge;

  return (
    <group
      ref={group}
      position={world.position}
      rotation={[0, (world.yawDegrees * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(locus.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Selection ring on the floor: visible from across the room and from
          above, unlike an outline on the prop itself. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.42, 0.52, 40]} />
        <meshBasicMaterial color={highlight} transparent opacity={selected ? 0.95 : 0.55} />
      </mesh>

      <mesh position={[0, plinthHeight / 2, 0]}>
        <cylinderGeometry args={[0.32, 0.38, plinthHeight, 20]} />
        <meshStandardMaterial color={palette.plinth} roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, plinthHeight + 0.015, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.03, 20]} />
        <meshStandardMaterial color={palette.plinthTop} roughness={0.85} metalness={0} />
      </mesh>

      {/* The mnemonic itself. Hidden in strict recall mode until a hint is asked
          for, which is why this is a render decision and not a material tweak. */}
      {showMnemonic &&
        nodes.map((node) => (
          <group
            key={node.id}
            position={node.position as [number, number, number]}
            scale={node.scale}
          >
            <ProceduralProp assetId={node.assetId} animation={node.animation} emphasis={selected} />
          </group>
        ))}

      {/* Caption on the plinth face, not floating above it: the prop occupies
          the space above the plinth top, and a label there reads straight
          through it. A locus faces -Z in its own space, so the viewer stands at
          local -Z and the label is offset and turned to meet them. */}
      <SpatialText
        position={[0, plinthHeight - 0.22, -0.345]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.052}
        color={selected ? palette.ink : palette.inkSoft}
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
        outlineWidth={0.004}
        outlineColor={palette.panel}
        weight="semibold"
      >
        {locus.label}
      </SpatialText>
    </group>
  );
}
