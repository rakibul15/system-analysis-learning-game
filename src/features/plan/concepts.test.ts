import { describe, expect, it } from 'vitest';
import { weakConcepts } from './concepts';

const card = (qid: string, levelId: number, box: number, lapses: number) => ({ qid, levelId, box, due: 0, lapses, reviews: lapses + 1 });

describe('weak concepts', () => {
  it('groups mistakes by concept across different questions, weakest first', () => {
    const cards = {
      a: card('l5-b4', 5, 0, 2),   // modulo concept, original boss question
      b: card('l5-x10', 5, 1, 1),  // modulo concept, a written variant
      c: card('l6-x1', 6, 0, 0),   // vector clock concept
      d: card('l7-x13', 7, 5, 0),  // nearly learnt: should not show
    };
    const w = weakConcepts({ cards });
    expect(w[0]).toMatchObject({ levelId: 5, cards: 2, lapses: 3 });
    expect(w[0]!.label.length).toBeGreaterThan(0);
    expect(w.map((x) => x.levelId)).toEqual([5, 6]);
    expect(w[0]!.note?.id).toBeTruthy();
  });
  it('is empty without mistakes', () => {
    expect(weakConcepts({ cards: {} })).toEqual([]);
  });
});
