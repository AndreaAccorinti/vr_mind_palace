import { describe, expect, it } from 'vitest';
import {
  isAnswerVisible,
  isHintVisible,
  reviewReducer,
  startReview,
  type ReviewState,
} from './review.ts';

const cue = startReview('item-1');
const revealed = reviewReducer(cue, { type: 'reveal' });

const apply = (state: ReviewState, ...actions: Parameters<typeof reviewReducer>[1][]) =>
  actions.reduce(reviewReducer, state);

describe('the answer stays hidden until it is revealed', () => {
  it('hides the answer at the cue', () => {
    expect(isAnswerVisible(cue)).toBe(false);
  });

  it('still hides the answer after a hint', () => {
    // The whole point of the hint is that it is not the answer.
    expect(isAnswerVisible(reviewReducer(cue, { type: 'show-hint' }))).toBe(false);
  });

  it('shows the answer only after an explicit reveal', () => {
    expect(isAnswerVisible(revealed)).toBe(true);
  });

  it('hides the answer again when a different item is selected', () => {
    const next = reviewReducer(revealed, { type: 'select-item', itemId: 'item-2' });
    expect(next.itemId).toBe('item-2');
    expect(isAnswerVisible(next)).toBe(false);
  });

  it('hides the answer again after restarting', () => {
    expect(isAnswerVisible(apply(revealed, { type: 'rate', rating: 'good' }, { type: 'restart' }))).toBe(false);
  });
});

describe('hints', () => {
  it('is not visible at the cue', () => {
    expect(isHintVisible(cue)).toBe(false);
  });

  it('stays visible once the answer is revealed', () => {
    expect(isHintVisible(revealed)).toBe(true);
  });

  it('does not walk the stage backwards from revealed to hinted', () => {
    expect(reviewReducer(revealed, { type: 'show-hint' }).stage).toBe('revealed');
  });

  it('cycles chunks only once a hint has been asked for', () => {
    expect(reviewReducer(cue, { type: 'next-chunk', chunkCount: 3 }).chunkIndex).toBe(0);
    const hinted = reviewReducer(cue, { type: 'show-hint' });
    expect(reviewReducer(hinted, { type: 'next-chunk', chunkCount: 3 }).chunkIndex).toBe(1);
  });

  it('wraps back to the first chunk', () => {
    let state = reviewReducer(cue, { type: 'show-hint' });
    for (let i = 0; i < 3; i += 1) state = reviewReducer(state, { type: 'next-chunk', chunkCount: 3 });
    expect(state.chunkIndex).toBe(0);
  });

  it('treats a zero chunk count as a single chunk', () => {
    const hinted = reviewReducer(cue, { type: 'show-hint' });
    expect(reviewReducer(hinted, { type: 'next-chunk', chunkCount: 0 }).chunkIndex).toBe(0);
  });
});

describe('rating', () => {
  it('is ignored before a reveal, so a rating cannot be entered blind', () => {
    expect(reviewReducer(cue, { type: 'rate', rating: 'good' })).toBe(cue);
    const hinted = reviewReducer(cue, { type: 'show-hint' });
    expect(reviewReducer(hinted, { type: 'rate', rating: 'easy' })).toBe(hinted);
  });

  it('records the rating after a reveal', () => {
    const rated = reviewReducer(revealed, { type: 'rate', rating: 'hard' });
    expect(rated.stage).toBe('rated');
    expect(rated.rating).toBe('hard');
  });

  it('applies once: a second rating does not overwrite the first', () => {
    const rated = reviewReducer(revealed, { type: 'rate', rating: 'again' });
    const twice = reviewReducer(rated, { type: 'rate', rating: 'easy' });
    expect(twice).toBe(rated);
    expect(twice.rating).toBe('again');
  });

  it('clears the rating when the item restarts', () => {
    const rated = reviewReducer(revealed, { type: 'rate', rating: 'good' });
    expect(reviewReducer(rated, { type: 'restart' }).rating).toBeNull();
  });
});

describe('selecting an item', () => {
  it('is a no-op when the same item is selected again', () => {
    const hinted = reviewReducer(cue, { type: 'show-hint' });
    expect(reviewReducer(hinted, { type: 'select-item', itemId: 'item-1' })).toBe(hinted);
  });
});
