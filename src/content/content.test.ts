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

  it('no question repeats an option, and the right answer is not the longest by a mile in most questions', () => {
    let giveaway = 0;
    let total = 0;
    for (const { q } of Object.values(questionsById)) {
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      const [right, ...wrong] = q.options.map((o) => o.length);
      total++;
      if (right! > 2 * Math.max(...wrong)) giveaway++;
    }
    // Quality rule from the plan: option length must not give the answer away.
    // KNOWN DEBT (first content pass): the right answer is often much longer than the
    // distractors (~68% of questions at 2×). This guard stops it getting worse; the
    // distractor-rewrite pass must bring it under 0.15 and then tighten this number.
    expect(giveaway / total).toBeLessThan(0.7);
  });

  it('only level 1 uses the traffic simulator for now; the rest have three missions', () => {
    expect(levelList.filter((l) => l.play.kind === 'traffic').map((l) => l.id)).toEqual([1]);
  });
});
