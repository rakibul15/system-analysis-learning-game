import { describe, expect, it } from 'vitest';
import { emptyProgress, type ProgressData } from '@/entities/progress/store';
import { levelList } from '@/content/levels';
import { DAY_MS, dayKey } from '@/shared/lib/scoring';
import { planToday } from './plan';

const NOW = Date.parse('2026-11-17T10:00:00');
const inDays = (n: number) => dayKey(new Date(NOW + n * DAY_MS));
const withPlan = (date: string | null, minutes: number, over: Partial<ProgressData> = {}): ProgressData =>
  ({ ...emptyProgress(), ...over, settings: { unlockAll: false, interviewDate: date, dailyMinutes: minutes } });
const lvl = (best: number, at: number) => ({ best, stars: 1 as const, plays: 1, lastPlayedAt: new Date(at).toISOString(), parts: { lesson: 0, play: 0, boss: 0, noHints: 0 } });

describe('planToday', () => {
  it('spreads the remaining levels over the days before the final two', () => {
    const plan = planToday(withPlan(inDays(10), 30), NOW);
    expect(plan.phase).toBe('learn');
    expect(plan.daysLeft).toBe(10);
    expect(plan.needPerDay).toBe(Math.ceil(levelList.length / 8));
    expect(plan.fitPerDay).toBe(2);
    expect(plan.onTrack).toBe(false);
    const levels = plan.tasks.filter((t) => t.kind === 'level');
    expect(levels).toHaveLength(plan.needPerDay);
    expect(levels[0]!.levelId).toBe(levelList[0]!.id);
  });

  it('keeps a finished level on today\'s list, ticked', () => {
    const first = levelList[0]!.id;
    const plan = planToday(withPlan(inDays(40), 60, { levels: { [first]: lvl(80, NOW - 3600_000) } }), NOW);
    const t = plan.tasks.find((x) => x.levelId === first);
    expect(t?.done).toBe(true);
    expect(plan.onTrack).toBe(true);
  });

  it('switches to mocks and weak spots in the last two days', () => {
    const first = levelList[0]!.id;
    const plan = planToday(withPlan(inDays(2), 60, { levels: { [first]: lvl(55, NOW - 5 * DAY_MS) } }), NOW);
    expect(plan.phase).toBe('final');
    expect(plan.tasks.some((t) => t.kind === 'level')).toBe(false);
    expect(plan.tasks.map((t) => t.kind)).toEqual(expect.arrayContaining(['mock', 'guided', 'weak']));
  });

  it('works without a date and after the interview', () => {
    expect(planToday(withPlan(null, 30), NOW).phase).toBe('none');
    expect(planToday(withPlan(inDays(-1), 30), NOW).phase).toBe('after');
    expect(planToday(withPlan(null, 30), NOW).tasks.filter((t) => t.kind === 'level').length).toBeGreaterThan(0);
  });
});
