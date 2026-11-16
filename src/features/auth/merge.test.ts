import { describe, expect, it } from 'vitest';
import { emptyProgress, type ProgressData } from '@/entities/progress/store';
import { mergeProgress } from './merge';

const lvl = (best: number, stars: 0 | 1 | 2 | 3, plays: number, at: string) => ({ best, stars, plays, lastPlayedAt: at, parts: { lesson: best, play: 0, boss: 0, noHints: 0 } });
const card = (reviews: number, box: number) => ({ qid: 'q', levelId: 1, box, due: 1000 + box, lapses: 0, reviews });

function sample(over: Partial<ProgressData>): ProgressData {
  return { ...emptyProgress(), ...over };
}

describe('mergeProgress', () => {
  const phone = sample({
    levels: { 1: lvl(80, 2, 3, '2026-11-01'), 2: lvl(50, 1, 1, '2026-11-02') },
    cards: { q1: card(4, 3), q2: card(0, 0) },
    days: ['2026-11-01', '2026-11-02'],
    reviewXp: 10,
    estimation: { attempts: 5, correct: 3, bestRound: 3 },
    design: [{ promptId: 'p1', score: 6, max: 10, minutes: 30, notes: '', at: '2026-11-01T10:00' }],
    incidents: { db: 0.5 },
    builds: { a: 1 },
  });
  const laptop = sample({
    levels: { 1: lvl(90, 3, 1, '2026-10-30'), 3: lvl(70, 2, 2, '2026-11-03') },
    cards: { q1: card(1, 1), q2: card(2, 2), q3: card(1, 1) },
    days: ['2026-11-02', '2026-11-03'],
    reviewXp: 4,
    estimation: { attempts: 8, correct: 2, bestRound: 4 },
    design: [{ promptId: 'p1', score: 6, max: 10, minutes: 30, notes: '', at: '2026-11-01T10:00' }, { promptId: 'p2', score: 8, max: 10, minutes: 40, notes: '', at: '2026-11-03T10:00' }],
    incidents: { db: 0.8, cache: 0.4 },
    builds: { a: 0.6, b: 0.9 },
  });

  it('keeps the best of both devices', () => {
    const m = mergeProgress(phone, laptop);
    expect(m.levels[1]).toMatchObject({ best: 90, stars: 3, plays: 3, lastPlayedAt: '2026-11-01', parts: { lesson: 90 } });
    expect(Object.keys(m.levels).sort()).toEqual(['1', '2', '3']);
    expect(m.cards.q1!.reviews).toBe(4);
    expect(m.cards.q2!.reviews).toBe(2);
    expect(m.cards.q3).toBeDefined();
    expect(m.days).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(m.reviewXp).toBe(10);
    expect(m.estimation).toEqual({ attempts: 8, correct: 3, bestRound: 4 });
    expect(m.design.map((d) => d.promptId)).toEqual(['p1', 'p2']);
    expect(m.incidents).toEqual({ db: 0.8, cache: 0.4 });
    expect(m.builds).toEqual({ a: 1, b: 0.9 });
  });

  it('does not depend on order', () => {
    const ab = mergeProgress(phone, laptop), ba = mergeProgress(laptop, phone);
    const { settings: _s1, ...x } = ab; const { settings: _s2, ...y } = ba;
    expect(x).toEqual(y);
  });

  it('is idempotent and survives junk', () => {
    const m = mergeProgress(phone, laptop);
    expect(mergeProgress(m, m)).toEqual(m);
    expect(mergeProgress(phone, null)).toEqual(mergeProgress(phone, {}));
    expect(mergeProgress(undefined, undefined)).toEqual(emptyProgress());
  });
});
