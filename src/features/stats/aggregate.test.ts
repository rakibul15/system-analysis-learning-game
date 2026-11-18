import { describe, expect, it } from 'vitest';
import type { AnswerEvent } from '@/shared/lib/outbox';
import { aggregate, flagsFor, MIN_ANSWERS } from './aggregate';

const ans = (q: string, c: 0 | 1, s: 0 | 1, o: string): AnswerEvent => ({ q, c, s, o, w: 'boss', t: 1 });
const many = (n: number, a: AnswerEvent) => Array.from({ length: n }, () => a);

describe('question statistics', () => {
  it('counts answers per question, per language when asked', () => {
    const stats = aggregate([
      { lang: 'bn', items: [ans('l1-b1', 1, 1, 'R'), ans('l1-b1', 0, 1, 'W1'), ans('l1-b2', 1, 0, 'R2')] },
      { lang: 'en', items: [ans('l1-b1', 1, 0, 'Ren')] },
    ]);
    const b1 = stats.find((s) => s.qid === 'l1-b1')!;
    expect(b1).toMatchObject({ n: 3, right: 2, sure: 2, sureWrong: 1, picks: { R: 1, W1: 1, Ren: 1 }, where: { boss: 3 }, older: 0 });
    expect(aggregate([{ lang: 'en', items: [ans('x', 1, 1, 'a')] }], 'bn')).toEqual([]);
  });

  it('does not judge a question with few answers', () => {
    const [s] = aggregate([{ lang: 'bn', items: many(MIN_ANSWERS - 1, ans('q', 1, 1, 'R')) }]);
    expect(flagsFor(s!)).toEqual([]);
  });

  it('flags too easy, too hard, sure-but-wrong, one trap and a dead option', () => {
    const keys = { right: 'R', wrong: ['A', 'B', 'C'] };
    const [easy] = aggregate([{ lang: 'bn', items: many(40, ans('e', 1, 1, 'R')) }]);
    expect(flagsFor(easy!, keys)).toEqual(['easy', 'dead-option']);
    const [hard] = aggregate([{ lang: 'bn', items: [...many(5, ans('h', 1, 0, 'R')), ...many(18, ans('h', 0, 1, 'A')), ...many(1, ans('h', 0, 0, 'B')), ...many(1, ans('h', 0, 0, 'C'))] }]);
    expect(flagsFor(hard!, keys)).toEqual(['hard', 'sure-wrong', 'one-trap']);
  });

  it('counts answers to an earlier wording apart, so a fixed question starts clean', () => {
    const v = (p: string) => (q: AnswerEvent) => ({ ...q, p });
    const [s] = aggregate([{ lang: 'bn', items: [v('old')(ans('q', 0, 1, 'W')), v('old')(ans('q', 0, 1, 'W')), v('new')(ans('q', 1, 1, 'R')), ans('q', 1, 0, 'R')] }], 'bn', () => 'new');
    expect(s).toMatchObject({ n: 2, right: 2, sureWrong: 0, older: 2 });
  });
});
