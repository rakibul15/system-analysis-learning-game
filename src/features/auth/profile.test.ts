import { describe, expect, it } from 'vitest';
import { emptyProgress } from '@/entities/progress/store';
import { PASS_MARK } from '@/shared/lib/scoring';
import { summarize } from './profile';

const lvl = (best: number) => ({ best, stars: 1 as const, plays: 1, lastPlayedAt: '2026-11-01', parts: { lesson: 0, play: 0, boss: 0, noHints: 0 } });

describe('progress summary for the profile', () => {
  it('is empty for a new learner', () => {
    expect(summarize(emptyProgress())).toEqual({ passed: 0, played: 0, cards: 0, days: 0, lastDay: null });
  });
  it('counts passed and played levels, cards and days', () => {
    const p = { ...emptyProgress(), levels: { 1: lvl(PASS_MARK), 2: lvl(PASS_MARK - 1) }, cards: { a: {} as never, b: {} as never }, days: ['2026-11-03', '2026-11-01'] };
    expect(summarize(p)).toEqual({ passed: 1, played: 2, cards: 2, days: 2, lastDay: '2026-11-03' });
  });
});
