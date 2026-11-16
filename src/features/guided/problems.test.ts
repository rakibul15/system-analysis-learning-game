import { describe, expect, it } from 'vitest';
import { guidedProblems, suggestCovered } from './problems';

describe('guided problems', () => {
  it('every problem has the five steps in order, each with a checklist and a model answer', () => {
    for (const p of guidedProblems) {
      expect(p.steps.map((s) => s.id)).toEqual(['req', 'est', 'api', 'hld', 'deep']);
      for (const s of p.steps) {
        expect(s.items.length).toBeGreaterThanOrEqual(3);
        expect(s.model.length).toBeGreaterThan(40);
        for (const it of s.items) expect(it.keys.length).toBeGreaterThan(0);
      }
    }
  });
  it('suggests covered items from keywords', () => {
    const items = guidedProblems[0]!.steps[4]!.items;
    expect(suggestCovered('I would use 302 since browsers cache a 301; IDs from a snowflake service', items).slice(0, 2)).toEqual([true, true]);
    expect(suggestCovered('', items).every((x) => !x)).toBe(true);
  });
});
