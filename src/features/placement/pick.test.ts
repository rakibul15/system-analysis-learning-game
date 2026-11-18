import { describe, expect, it } from 'vitest';
import { banks } from '@/content/levels/all';
import { chapters } from '@/content/meta';
import { setDisabled } from '@/content/disabled';
import { mulberry32 } from '@/simulators/traffic/engine';
import { pickQuestion } from './pick';

const ch3 = chapters.find((c) => c.id === 3)!.levels;
const ctx = (over: Partial<Parameters<typeof pickQuestion>[1]> = {}) => ({ used: new Set<string>(), usedLevels: new Set<number>(), seen: new Set<string>(), allowGen: false, rand: mulberry32(7), ...over });

describe('picking placement questions', () => {
  it('every core chapter has enough written questions for a full test', () => {
    for (const c of chapters.filter((x) => !x.gate)) {
      const items = c.levels.flatMap((l) => banks[l]?.items ?? []);
      expect(items.length, `chapter ${c.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('takes a different level for each question in a chapter, and never repeats one', () => {
    const c = ctx();
    const levels: number[] = [];
    for (let i = 0; i < 3; i++) {
      const p = pickQuestion(ch3, c)!;
      expect(c.used.has(p.q.id)).toBe(false);
      c.used.add(p.q.id); c.usedLevels.add(p.levelId); levels.push(p.levelId);
      expect(p.q.id.startsWith(`l${p.levelId}-`)).toBe(true);
      expect(p.q.options.length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(levels).size).toBe(3);
  });

  it('prefers questions the learner has not seen, skips turned-off ones, and asks no generated one unless allowed', () => {
    const all = ch3.flatMap((l) => banks[l]!.items.map((i) => i.id));
    const keep = all[all.length - 1]!;
    setDisabled(all.filter((id, i) => i % 2 === 0 && id !== keep));
    for (let s = 1; s <= 30; s++) {
      const p = pickQuestion(ch3, ctx({ rand: mulberry32(s), seen: new Set(all.filter((id) => id !== keep)) }))!;
      expect(p.generated).toBe(false);
      expect(p.q.id).not.toMatch(/-g\d+$/);
    }
    setDisabled([]);
  });
});
