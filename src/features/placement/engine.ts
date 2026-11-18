/*
 * The placement test, as a pure state machine. Chapter by chapter (the six core chapters;
 * the bonus chapter opens through its own gate): two questions each, a third when the two
 * disagree, and an early stop after two weak chapters in a row. Scoring matches the rest of
 * the game: sure and right = 1, right on a guess = 0.5, wrong = 0. A guess alone never opens
 * a chapter.
 */

export const CORE_CHAPTERS = [1, 2, 3, 4, 5, 6];
export const MAX_QUESTIONS = 15;

export interface PlacementAnswer { qid: string; chapter: number; correct: boolean; sure: boolean }
export type Verdict = 'mastered' | 'weak';

export interface PlacementState {
  order: number[];
  /** Index into order of the chapter being asked. */
  at: number;
  answers: PlacementAnswer[];
  verdicts: Record<number, Verdict>;
  weakInRow: number;
  finished: boolean;
}

export interface PlacementResult {
  /** Chapters shown to be known. */
  mastered: number[];
  /** Chapters that got a verdict (the test may stop before the last). */
  tested: number[];
  /** Where to start: the first chapter not shown to be known, or null when all were. */
  start: number | null;
}

export const points = (a: Pick<PlacementAnswer, 'correct' | 'sure'>) => (a.correct ? (a.sure ? 1 : 0.5) : 0);

/** A chapter's verdict from its answers so far, or null when it needs another question. */
export function judge(answers: Pick<PlacementAnswer, 'correct' | 'sure'>[]): Verdict | null {
  const s = answers.reduce((t, a) => t + points(a), 0);
  if (answers.length < 2) return null;
  if (answers.length === 2) return s >= 1.5 ? 'mastered' : s >= 0.5 ? null : 'weak';
  return s >= 2 ? 'mastered' : 'weak';
}

export const startPlacement = (order: number[] = CORE_CHAPTERS): PlacementState => ({ order, at: 0, answers: [], verdicts: {}, weakInRow: 0, finished: order.length === 0 });

/** The chapter the next question comes from, or null when the test is over. */
export const currentChapter = (s: PlacementState): number | null => (s.finished ? null : s.order[s.at] ?? null);

export function answerPlacement(s: PlacementState, a: Omit<PlacementAnswer, 'chapter'>): PlacementState {
  const chapter = currentChapter(s);
  if (chapter === null) return s;
  const answers = [...s.answers, { ...a, chapter }];
  const mine = answers.filter((x) => x.chapter === chapter);
  let verdict = judge(mine);
  // out of questions: an undecided chapter counts as not yet known
  if (!verdict && answers.length >= MAX_QUESTIONS) verdict = 'weak';
  if (!verdict) return { ...s, answers };
  const verdicts = { ...s.verdicts, [chapter]: verdict };
  const weakInRow = verdict === 'weak' ? s.weakInRow + 1 : 0;
  const at = s.at + 1;
  const finished = weakInRow >= 2 || at >= s.order.length || answers.length >= MAX_QUESTIONS;
  return { ...s, answers, verdicts, weakInRow, at, finished };
}

/** A chapter with no verdict can still be skipped (e.g. it has no usable questions). */
export function skipChapter(s: PlacementState): PlacementState {
  if (s.finished) return s;
  const at = s.at + 1;
  return { ...s, at, finished: at >= s.order.length };
}

export function placementResult(s: PlacementState): PlacementResult {
  const tested = s.order.filter((c) => s.verdicts[c]);
  const mastered = s.order.filter((c) => s.verdicts[c] === 'mastered');
  const start = s.order.find((c) => s.verdicts[c] !== 'mastered') ?? null;
  return { mastered, tested, start };
}

/** Questions answered so far and a rough total, for a progress bar. */
export function progressOf(s: PlacementState): { asked: number; expected: number } {
  const left = s.order.length - s.at;
  return { asked: s.answers.length, expected: Math.min(MAX_QUESTIONS, s.answers.length + (s.finished ? 0 : Math.max(1, left * 2 - s.answers.filter((a) => a.chapter === currentChapter(s)).length))) };
}
