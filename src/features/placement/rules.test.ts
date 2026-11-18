import { describe, expect, it } from 'vitest';
import { emptyProgress, mergePlacement, type PlacementRecord, type ProgressData } from '@/entities/progress/store';
import { levelState, lockReason } from '@/entities/progress/selectors';
import { chapters } from '@/content/meta';
import { planToday } from '@/features/plan/plan';
import { mergeProgress, normalize } from '@/features/auth/merge';
import { assembleProgress, splitProgress } from '@/features/auth/parts';

const placed = (over: Partial<PlacementRecord>): ProgressData => ({ ...emptyProgress(), placement: { at: '2026-11-18T10:00:00Z', mastered: [], tested: [], start: null, ...over } });
const levelsOf = (ch: number) => chapters.find((c) => c.id === ch)!.levels;

describe('placement and what is open', () => {
  it('a known chapter is open throughout, but nothing in it counts as passed', () => {
    const p = placed({ mastered: [1, 2], tested: [1, 2, 3], start: 3 });
    for (const id of [...levelsOf(1), ...levelsOf(2)]) {
      expect(lockReason(id, p), `level ${id}`).toBeNull();
      expect(levelState(id, p)).toBe('open');
    }
  });

  it('the start chapter opens at its first level only; the rest unlock by playing', () => {
    const p = placed({ mastered: [1, 2], tested: [1, 2, 3], start: 3 });
    const [first, second] = levelsOf(3);
    expect(lockReason(first!, p)).toBeNull();
    expect(lockReason(second!, p)).not.toBeNull();
  });

  it('chapters after the start stay locked, unless known or right after a known one', () => {
    const p = placed({ mastered: [1, 2, 4], tested: [1, 2, 3, 4, 5], start: 3 });
    expect(lockReason(levelsOf(4)[0]!, p)).toBeNull();
    // knowing chapter 4 is like passing its last level: chapter 5 opens at its first level
    expect(lockReason(levelsOf(5)[0]!, p)).toBeNull();
    expect(lockReason(levelsOf(5)[1]!, p)).not.toBeNull();
    expect(lockReason(levelsOf(6)[0]!, p)).not.toBeNull();
  });

  it("knowing chapter 2 opens the bonus chapter, whose gate is chapter 2's last level", () => {
    const bonus = chapters.find((c) => c.gate)!;
    expect(lockReason(bonus.levels[0]!, emptyProgress())).not.toBeNull();
    expect(lockReason(bonus.levels[0]!, placed({ mastered: [1, 2], tested: [1, 2, 3], start: 3 }))).toBeNull();
  });

  it('without a placement nothing changes', () => {
    expect(lockReason(levelsOf(1)[1]!, emptyProgress())).not.toBeNull();
  });
});

describe("placement and today's plan", () => {
  it('someone who has not played is offered the test first, until they take or skip it', () => {
    expect(planToday(emptyProgress()).tasks[0]?.kind).toBe('placement');
    expect(planToday({ ...emptyProgress(), settings: { unlockAll: false, skipPlacement: true } }).tasks.some((t) => t.kind === 'placement')).toBe(false);
    expect(planToday(placed({ start: 1, tested: [1, 2] })).tasks.some((t) => t.kind === 'placement')).toBe(false);
  });

  it('new levels start at the start chapter; known chapters are left out of the path', () => {
    const p = placed({ mastered: [1, 2], tested: [1, 2, 3], start: 3 });
    const plan = planToday(p);
    expect(plan.tasks.find((t) => t.kind === 'level')?.levelId).toBe(levelsOf(3)[0]);
    expect(plan.remaining).toBe(chapters.flatMap((c) => c.levels).length - levelsOf(1).length - levelsOf(2).length);
  });
});

describe('placement across devices', () => {
  const a: PlacementRecord = { at: '2026-11-10T00:00:00Z', mastered: [1], tested: [1, 2], start: 2 };
  const b: PlacementRecord = { at: '2026-11-18T00:00:00Z', mastered: [1, 2], tested: [1, 2, 3], start: 3 };
  it('keeps every chapter shown as known and the later start', () => {
    expect(mergePlacement(a, b)).toEqual({ at: b.at, mastered: [1, 2], tested: [1, 2, 3], start: 3 });
    expect(mergePlacement(b, a)).toEqual(mergePlacement(a, b));
    expect(mergePlacement(null, a)).toEqual(a);
  });
  it('a start that the other device showed as known moves on', () => {
    const later: PlacementRecord = { at: '2026-11-19T00:00:00Z', mastered: [3], tested: [3], start: 2 };
    expect(mergePlacement(b, later)!.start).toBe(null);
  });
  it('survives sync parts, the old one-document format and broken data', () => {
    const p = placed({ mastered: [1], tested: [1, 2], start: 2 });
    expect(assembleProgress(splitProgress(p)).placement).toEqual(p.placement);
    expect(normalize({ levels: {}, cards: {} }).placement).toBeNull();
    expect(normalize({ placement: { at: 5 } }).placement).toBeNull();
    expect(mergeProgress(p, emptyProgress()).placement).toEqual(p.placement);
  });
});
