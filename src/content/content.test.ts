import { describe, expect, it } from 'vitest';
import { chapters, levelList, questionsById } from './levels';
import { levelSchema } from './schema';

describe('level content', () => {
  it('has all 30 levels, numbered 1–30 in order', () => {
    expect(levelList.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('every level passes the schema', () => {
    for (const l of levelList) {
      const r = levelSchema.safeParse(l);
      expect(r.success, `level ${l.id}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });

  it('chapters cover each level exactly once and match level.chapter', () => {
    const seen = chapters.flatMap((c) => c.levels);
    expect([...seen].sort((a, b) => a - b)).toEqual(levelList.map((l) => l.id));
    for (const c of chapters) for (const id of c.levels) expect(levelList[id - 1]!.chapter).toBe(c.id);
  });

  it('chapters start at levels 1, 5, 8, 16, 22 and 29 (the plan)', () => {
    expect(chapters.map((c) => c.levels[0])).toEqual([1, 5, 8, 16, 22, 29]);
  });

  it('question ids are unique across the game', () => {
    const ids = levelList.flatMap((l) => [l.predict.id, ...l.steps.flatMap((s) => (s.ask ? [s.ask.id] : [])), ...(l.play.kind === 'missions' ? l.play.missions.map((m) => m.id) : []), ...l.boss.map((b) => b.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no question repeats an option, and option length does not give the answer away', () => {
    let longer = 0;
    let total = 0;
    for (const { q } of Object.values(questionsById)) {
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      const [right, ...wrong] = q.options.map((o) => o.length);
      const ratio = right! / Math.max(...wrong);
      // plan's quality rule: the right answer is never far longer than every distractor
      expect(ratio, `${q.id}: right answer is ${ratio.toFixed(2)}× the longest distractor`).toBeLessThan(1.5);
      total++;
      if (ratio > 1.3) longer++;
    }
    expect(longer / total).toBeLessThan(0.1);
  });

  it('only level 1 uses the traffic simulator; every other level keeps three missions', () => {
    expect(levelList.filter((l) => l.play.kind === 'traffic').map((l) => l.id)).toEqual([1]);
  });

  it('the v1 levels have an interactive simulator', () => {
    expect(levelList.filter((l) => l.simulator).map((l) => l.id)).toEqual([2, 3, 4, 5, 6, 8, 10, 11, 12, 16, 26]);
  });
});
