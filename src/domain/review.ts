/**
 * The recall loop as a pure state machine.
 *
 * Product rule (docs/BLUEPRINT.md): inspect the cue, attempt recall, optionally
 * ask for the mnemonic hint, reveal the exact answer, then rate. The answer must
 * not be reachable before an explicit reveal, and a rating must apply once.
 *
 * M0 exercises this loop against synthetic data and keeps no history. M1 records
 * review events through the repository layer; the stage machine does not change.
 */

import type { ItemId } from './palace.ts';

export type ReviewStage = 'cue' | 'hinted' | 'revealed' | 'rated';

/** FSRS-compatible grades. M0 records the choice but schedules nothing. */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export const REVIEW_RATINGS: readonly ReviewRating[] = ['again', 'hard', 'good', 'easy'];

export interface ReviewState {
  readonly itemId: ItemId;
  readonly stage: ReviewStage;
  /** Which chunk of a long pronunciation chain the hint is showing. */
  readonly chunkIndex: number;
  readonly rating: ReviewRating | null;
}

export type ReviewAction =
  | { readonly type: 'show-hint' }
  | { readonly type: 'next-chunk'; readonly chunkCount: number }
  | { readonly type: 'reveal' }
  | { readonly type: 'rate'; readonly rating: ReviewRating }
  | { readonly type: 'restart' }
  | { readonly type: 'select-item'; readonly itemId: ItemId };

export function startReview(itemId: ItemId): ReviewState {
  return { itemId, stage: 'cue', chunkIndex: 0, rating: null };
}

/** True once the exact answer may be displayed. */
export function isAnswerVisible(state: ReviewState): boolean {
  return state.stage === 'revealed' || state.stage === 'rated';
}

/** True once the mnemonic scene may be displayed. */
export function isHintVisible(state: ReviewState): boolean {
  return state.stage !== 'cue';
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'show-hint':
      // Revealing the answer already implies the hint; don't walk backwards.
      return state.stage === 'cue' ? { ...state, stage: 'hinted' } : state;

    case 'next-chunk': {
      if (!isHintVisible(state)) return state;
      const total = Math.max(1, action.chunkCount);
      return { ...state, chunkIndex: (state.chunkIndex + 1) % total };
    }

    case 'reveal':
      return isAnswerVisible(state) ? state : { ...state, stage: 'revealed' };

    case 'rate':
      // A rating is only meaningful after a reveal, and it applies once.
      if (state.stage !== 'revealed') return state;
      return { ...state, stage: 'rated', rating: action.rating };

    case 'restart':
      return startReview(state.itemId);

    case 'select-item':
      return action.itemId === state.itemId ? state : startReview(action.itemId);

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
