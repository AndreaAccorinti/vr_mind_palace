/**
 * The scene root.
 *
 * One tree serves both the desktop view and the immersive session. The only
 * differences are which camera is driving (`DesktopCamera` versus the XR
 * origin) and whether the Exit VR control is shown, so a behaviour verified on
 * the desktop is the same behaviour that runs in the headset.
 *
 * This component reads the domain model and reports interactions back. It holds
 * no learning state of its own — the renderer is replaceable without touching
 * what a palace *is*.
 */

import { XROrigin, useXR } from '@react-three/xr';
import {
  findRoom,
  itemAtLocus,
  lociOfRoom,
  originTransform,
  type LocusId,
  type PalaceContent,
  type ReviewRating,
  type ReviewState,
  type TurnDirection,
  type Vec3,
  type ViewerState,
} from '../domain/index.ts';
import { DesktopCamera } from './DesktopCamera.tsx';
import { Locomotion } from './Locomotion.tsx';
import { LocusStation } from './LocusStation.tsx';
import { NavigationControls } from './NavigationControls.tsx';
import { ReviewPanel } from './ReviewPanel.tsx';
import { RoomShell } from './RoomShell.tsx';
import { SpatialText } from './SpatialText.tsx';
import { TeleportFloor } from './TeleportFloor.tsx';
import { palette } from './theme.ts';
import { isHintVisible } from '../domain/review.ts';

export interface PalaceSceneProps {
  readonly content: PalaceContent;
  readonly roomId: string;
  readonly viewer: ViewerState;
  readonly review: ReviewState;
  readonly selectedLocusId: LocusId | null;
  readonly onSelectLocus: (locusId: LocusId) => void;
  readonly onSnapTurn: (direction: TurnDirection) => void;
  readonly onTeleport: (point: Vec3) => void;
  readonly onRecenter: () => void;
  readonly onTogglePosture: () => void;
  readonly onExit: () => void;
  readonly onHint: () => void;
  readonly onNextChunk: () => void;
  readonly onReveal: () => void;
  readonly onRate: (rating: ReviewRating) => void;
  readonly onRestart: () => void;
}

export function PalaceScene(props: PalaceSceneProps) {
  const { content, roomId, viewer, review, selectedLocusId } = props;
  const inSession = useXR((state) => state.session != null);
  const room = findRoom(content, roomId);

  if (room === undefined) {
    return (
      <SpatialText position={[0, 1.5, -2]} fontSize={0.12} color={palette.ink} anchorX="center">
        This palace has no room to show.
      </SpatialText>
    );
  }

  const loci = lociOfRoom(content, room.id);
  const selectedItem = selectedLocusId === null ? undefined : itemAtLocus(content, selectedLocusId);
  const origin = originTransform(viewer);

  return (
    <>
      {/* Flat, cheap lighting. No shadow maps and no postprocessing in the
          baseline; both are easy ways to lose frames on a standalone headset. */}
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#fdf6e6', '#5e6553', 0.65]} />
      <directionalLight position={[3, 6, 2]} intensity={0.75} castShadow={false} />

      <RoomShell room={room} />

      <TeleportFloor room={room} onTeleport={props.onTeleport} visible={inSession} />

      {loci.map((locus) => (
        <LocusStation
          key={locus.id}
          room={room}
          locus={locus}
          item={itemAtLocus(content, locus.id)}
          selected={locus.id === selectedLocusId}
          // The room's props are part of the room, so they stay visible. The
          // one exception is the item actually being recalled: that mnemonic is
          // concealed until the user asks for the hint, because seeing it is
          // most of the answer. Selecting a different locus re-hides that one
          // and reveals this one.
          showMnemonic={locus.id === selectedLocusId ? isHintVisible(review) : true}
          chunkIndex={review.chunkIndex}
          onSelect={props.onSelectLocus}
        />
      ))}

      {/* The origin carries the body-relative UI, so the panel and controls stay
          in the same place through snap turns and teleports. The XROrigin group
          is what WebXR moves the tracking space with; the headset pose inside it
          is left to the runtime. */}
      <XROrigin
        position={origin.position}
        rotation={[0, (origin.yawDegrees * Math.PI) / 180, 0]}
      >
        {/* A lectern, not a windscreen. The cue and the controls sit below the
            line of sight and tilt up, leaving the room and the selected prop
            clear above them. Keeping both in one group means the controls are
            always in view whenever the cue is — on desktop the pitch is fixed,
            so anything placed much lower simply falls off the screen. The whole
            thing stays well inside the viewing distance, so it can never land
            on a plinth whichever locus is selected. */}
        <group position={[0, 1.42, -1.45]} rotation={[-0.19, 0, 0]} scale={0.85}>
          <ReviewPanel
            item={selectedItem}
            review={review}
            onHint={props.onHint}
            onNextChunk={props.onNextChunk}
            onReveal={props.onReveal}
            onRate={props.onRate}
            onRestart={props.onRestart}
          />

          <group position={[0, -0.56, 0.01]}>
            <NavigationControls
              posture={viewer.posture}
              inSession={inSession}
              onSnapTurn={props.onSnapTurn}
              onRecenter={props.onRecenter}
              onTogglePosture={props.onTogglePosture}
              onExit={props.onExit}
            />
          </group>
        </group>
      </XROrigin>

      <Locomotion onSnapTurn={props.onSnapTurn} />
      <DesktopCamera viewer={viewer} enabled={!inSession} />
    </>
  );
}
