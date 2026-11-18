import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/simulators/traffic/engine';
import { levelsById } from '@/content/levels/all';
import { questionSchema } from '@/content/schema';
import { banks, conceptOf, drawBoss, reviewVariant } from './index';

const rands = (seed: number) => mulberry32(seed);

describe('question banks', () => {
  for (const [id, b] of Object.entries(banks)) {
    const level = levelsById[Number(id)]!;
    it(`level ${id}: five concepts, each with at least four questions, all well formed`, () => {
      expect(b.concepts).toHaveLength(level.boss.length);
      for (const c of b.concepts) {
        const written = b.items.filter((i) => i.concept === c.id).length + 1; // + the original boss question
        const gens = b.gens.filter((g) => g.concept === c.id).length;
        expect(written + gens, `${id}/${c.id}`).toBeGreaterThanOrEqual(4);
      }
      const ids = [...b.items.map((i) => i.id), ...b.gens.map((g) => g.id), ...level.boss.map((q) => q.id)];
      expect(new Set(ids).size).toBe(ids.length);
      for (const it of b.items) {
        expect(questionSchema.safeParse({ id: it.id, prompt: it.prompt, options: it.options, explain: it.explain }).success, it.id).toBe(true);
        expect(new Set(it.options).size, it.id).toBe(it.options.length);
        const [right, ...wrong] = it.options.map((o) => o.length);
        expect(right! / Math.max(...wrong), `${it.id}: ${it.options[0]}`).toBeLessThan(1.5);
      }
    });
    it(`level ${id}: generators give distinct options and change their numbers`, () => {
      for (const g of b.gens) {
        const prompts = new Set<string>();
        for (let s = 1; s <= 40; s++) {
          const q = g.make(rands(s));
          expect(new Set(q.options).size, `${g.id} seed ${s}: ${q.options.join(' | ')}`).toBe(q.options.length);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          prompts.add(q.prompt);
        }
        expect(prompts.size, g.id).toBeGreaterThanOrEqual(4);
      }
    });
    it(`level ${id}: the boss tests every concept and changes between attempts`, () => {
      const a = drawBoss(level, new Set(), rands(1)), c = drawBoss(level, new Set(), rands(7));
      expect(a.map((q) => conceptOf(q.id)!.index)).toEqual([0, 1, 2, 3, 4]);
      const differs = a.some((q, i) => q.prompt !== c[i]!.prompt);
      expect(differs).toBe(true);
    });
    it(`level ${id}: unseen questions come first, and review shows a different one`, () => {
      const seen = new Set(level.boss.map((q) => q.id));
      for (const q of drawBoss(level, seen, rands(3))) expect(seen.has(q.id) && !q.id.includes('-g')).toBe(false);
      const v = reviewVariant(level.boss[0]!.id, level.boss[0], rands(5))!;
      expect(conceptOf(v.id)!.index).toBe(0);
      expect(v.prompt === level.boss[0]!.prompt && v.id === level.boss[0]!.id).toBe(false);
    });
  }
});
