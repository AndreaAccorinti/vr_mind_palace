/**
 * The recall panel, rendered in world space.
 *
 * It follows the viewer's origin rather than their head: a panel welded to the
 * headset is uncomfortable and fights the stable-horizon rule, while a panel
 * fixed in the room is lost the moment the user snap-turns. Anchoring it to the
 * origin keeps it in the same body-relative place through turns and teleports
 * without ever moving in response to head motion.
 */

import {
  chunkCount,
  isAnswerVisible,
  isHintVisible,
  REVIEW_RATINGS,
  type LearningItem,
  type ReviewRating,
  type ReviewState,
} from '../domain/index.ts';
import { SpatialButton } from './SpatialButton.tsx';
import { SpatialText } from './SpatialText.tsx';
import { palette } from './theme.ts';

export interface ReviewPanelProps {
  readonly item: LearningItem | undefined;
  readonly review: ReviewState;
  readonly onHint: () => void;
  readonly onNextChunk: () => void;
  readonly onReveal: () => void;
  readonly onRate: (rating: ReviewRating) => void;
  readonly onRestart: () => void;
}

const RATING_LABELS: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

export function ReviewPanel({
  item,
  review,
  onHint,
  onNextChunk,
  onReveal,
  onRate,
  onRestart,
}: ReviewPanelProps) {
  if (item === undefined) {
    return (
      <group>
        <PanelBackdrop />
        <SpatialText
          position={[0, 0, 0.013]}
          fontSize={0.05}
          color={palette.inkSoft}
          anchorX="center"
          anchorY="middle"
          maxWidth={0.95}
        >
          Point at a plinth and select it to begin.
        </SpatialText>
      </group>
    );
  }

  const answerVisible = isAnswerVisible(review);
  const hintVisible = isHintVisible(review);
  const chunks = chunkCount(item.mnemonic);

  return (
    <group>
      <PanelBackdrop />

      <SpatialText
        position={[-0.54, 0.34, 0.013]}
        fontSize={0.029}
        color={palette.inkSoft}
        anchorX="left"
        anchorY="middle"
        weight="semibold"
      >
        {answerVisible ? 'HOW EASILY DID YOU RECALL IT?' : 'PAUSE. RECALL IT FIRST.'}
      </SpatialText>

      <SpatialText
        position={[-0.54, 0.27, 0.013]}
        fontSize={0.052}
        color={palette.ink}
        anchorX="left"
        anchorY="top"
        maxWidth={1.04}
        lineHeight={1.25}
        weight="semibold"
      >
        {item.cue}
      </SpatialText>

      {/* The mnemonic is a hint about the answer, never the answer itself. */}
      {hintVisible && (
        <SpatialText
          position={[-0.54, 0.1, 0.013]}
          fontSize={0.034}
          color={palette.inkSoft}
          anchorX="left"
          anchorY="top"
          maxWidth={1.04}
          lineHeight={1.25}
        >
          {chunks > 1
            ? `${item.mnemonic.meaningScene}  (sounds ${review.chunkIndex + 1}/${chunks})`
            : item.mnemonic.meaningScene}
        </SpatialText>
      )}

      {/* The exact answer only ever mounts after an explicit reveal. */}
      {answerVisible && (
        <SpatialText
          position={[-0.54, -0.03, 0.013]}
          fontSize={0.048}
          color={palette.answer}
          anchorX="left"
          anchorY="top"
          maxWidth={1.04}
          lineHeight={1.25}
          weight="semibold"
        >
          {item.answer}
        </SpatialText>
      )}

      {!answerVisible && (
        <group position={[0, -0.27, 0.013]}>
          <SpatialButton
            label={hintVisible ? 'Next sounds' : 'Show hint'}
            position={[-0.3, 0, 0]}
            width={0.4}
            disabled={hintVisible && chunks <= 1}
            onClick={hintVisible ? onNextChunk : onHint}
          />
          <SpatialButton label="Reveal answer" position={[0.19, 0, 0]} width={0.44} primary onClick={onReveal} />
        </group>
      )}

      {answerVisible && (
        <group position={[0, -0.27, 0.013]}>
          {REVIEW_RATINGS.map((rating, index) => (
            <SpatialButton
              key={rating}
              label={RATING_LABELS[rating]}
              position={[-0.4 + index * 0.27, 0, 0]}
              width={0.24}
              primary={review.rating === rating}
              disabled={review.stage === 'rated' && review.rating !== rating}
              onClick={() => onRate(rating)}
            />
          ))}
        </group>
      )}

      {review.stage === 'rated' && (
        <group position={[0, -0.385, 0.013]}>
          <SpatialText
            position={[-0.54, 0, 0]}
            fontSize={0.028}
            color={palette.inkSoft}
            anchorX="left"
            anchorY="middle"
            maxWidth={0.72}
          >
            Rated. M0 does not schedule the next review yet.
          </SpatialText>
          <SpatialButton label="Again from cue" position={[0.4, 0, 0]} width={0.34} height={0.11} onClick={onRestart} />
        </group>
      )}
    </group>
  );
}

function PanelBackdrop() {
  return (
    <>
      <mesh>
        <boxGeometry args={[1.18, 0.88, 0.02]} />
        <meshStandardMaterial color={palette.panel} roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, 0, -0.014]}>
        <boxGeometry args={[1.21, 0.91, 0.01]} />
        <meshStandardMaterial color={palette.panelEdge} roughness={0.85} metalness={0} />
      </mesh>
    </>
  );
}
