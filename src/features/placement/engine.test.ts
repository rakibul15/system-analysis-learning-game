import { describe, expect, it } from 'vitest';
import { answerPlacement, currentChapter, judge, MAX_QUESTIONS, placementResult, startPlacement, type PlacementState } from './engine';

const R = { correct: true, sure: true }, G = { correct: true, sure: false }, W = { correct: false, sure: true };
/** Answers in turn until the test ends; `pick(chapter, nth in chapter)` decides each answer. */
function run(pick: (chapter: number, nth: number) => { correct: boolean; sure: boolean }, s: PlacementState = startPlacement()) {
  let n = 0;
  while (currentChapter(s) !== null && n++ < 50) {
    const ch = currentChapter(s)!;
    s = answerPlacement(s, { qid: `q${n}`, ...pick(ch, s.answers.filter((a) => a.chapter === ch).length) });
  }
  return s;
}

describe('judging one chapter', () => {
  it('two sure answers, or one sure and one guess, open it; two guesses do not', () => {
    expect(judge([R, R])).toBe('mastered');
    expect(judge([R, G])).toBe('mastered');
    expect(judge([G, G])).toBeNull(); // 1 point: a third question decides
    expect(judge([W, W])).toBe('weak');
  });
  it('a split asks a third question; two points out of three open it', () => {
    expect(judge([R, W])).toBeNull();
    expect(judge([R, W, R])).toBe('mastered');
    expect(judge([R, W, G])).toBe('weak');
    expect(judge([G, G, R])).toBe('mastered');
  });
});

describe('the whole test', () => {
  it('knowing everything: twelve questions, every core chapter open, nothing to start', () => {
    const s = run(() => R);
    expect(s.answers).toHaveLength(12);
    expect(placementResult(s)).toEqual({ mastered: [1, 2, 3, 4, 5, 6], tested: [1, 2, 3, 4, 5, 6], start: null });
  });

  it('a beginner stops after two weak chapters, in four questions, and starts at chapter 1', () => {
    const s = run(() => W);
    expect(s.answers).toHaveLength(4);
    expect(placementResult(s)).toEqual({ mastered: [], tested: [1, 2], start: 1 });
  });

  it('knowing the first three chapters: starts at chapter 4', () => {
    const s = run((ch) => (ch <= 3 ? R : W));
    expect(placementResult(s)).toEqual({ mastered: [1, 2, 3], tested: [1, 2, 3, 4, 5], start: 4 });
  });

  it('one weak chapter in between does not stop the test; later known chapters still open', () => {
    const s = run((ch) => (ch === 2 ? W : R));
    expect(placementResult(s)).toEqual({ mastered: [1, 3, 4, 5, 6], tested: [1, 2, 3, 4, 5, 6], start: 2 });
  });

  it('never asks more than the limit, even when every chapter needs a third question', () => {
    const s = run((_, nth) => (nth === 0 ? R : nth === 1 ? W : R));
    expect(s.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(currentChapter(s)).toBeNull();
    // five chapters of three questions fill the fifteen; chapter 6 is left to play
    expect(placementResult(s)).toEqual({ mastered: [1, 2, 3, 4, 5], tested: [1, 2, 3, 4, 5], start: 6 });
  });
});
