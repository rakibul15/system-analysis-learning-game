import { describe, expect, it } from 'vitest';
import { BOOKS } from '@/features/books/catalog';
import { dbScenarios, grade, rightAnswer, type Answers } from './scenarios';

const perfect = (id: string): Answers => {
  const s = dbScenarios.find((x) => x.id === id)!;
  return {
    fields: Object.fromEntries(s.fields.map((f) => [f.id, rightAnswer(s, 'field', f.id)])),
    decisions: Object.fromEntries(s.decisions.map((d) => [d.id, rightAnswer(s, 'decision', d.id)])),
  };
};

describe('database design scenarios', () => {
  for (const s of dbScenarios) {
    it(`${s.id}: well formed, one right option each, every wrong option says what breaks`, () => {
      const tables = new Set(s.tables.map((t) => t.id));
      expect(s.fields.length).toBeGreaterThanOrEqual(4);
      expect(s.decisions.length).toBeGreaterThanOrEqual(5);
      for (const f of s.fields) expect(tables.has(f.table), f.id).toBe(true);
      for (const d of s.decisions) {
        expect(d.options.filter((o) => o.ok).length, d.id).toBe(1);
        expect(new Set(d.options.map((o) => o.id)).size).toBe(d.options.length);
        for (const o of d.options) if (!o.ok) expect(o.breaks?.length, `${d.id}/${o.id}`).toBeGreaterThan(10);
        if (d.ref) expect(BOOKS[d.ref.book].chapters[d.ref.chapter]).toBeTruthy();
      }
    });
    it(`${s.id}: a perfect design passes, a blank one lists every item, one slip is "close"`, () => {
      const a = perfect(s.id);
      expect(grade(s, a)).toMatchObject({ verdict: 'right', findings: [] });
      const blank = grade(s, { fields: {}, decisions: {} });
      expect(blank.findings).toHaveLength(s.fields.length + s.decisions.length);
      expect(blank.verdict).toBe('wrong');
      const d = s.decisions[0]!;
      const wrong = d.options.find((o) => !o.ok)!;
      const one = grade(s, { ...a, decisions: { ...a.decisions, [d.id]: wrong.id } });
      expect(one.verdict).toBe('close');
      expect(one.findings[0]!.where).toContain(wrong.breaks!);
      expect(one.findings[0]!.fix).toBe(d.options.find((o) => o.ok)!.text);
    });
  }
});
