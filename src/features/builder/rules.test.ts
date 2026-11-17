import { describe, expect, it } from 'vitest';
import { challenges, referenceGraph, scoreOf, type Graph } from './model';
import { applyFix, diagnose, holds } from './rules';

const empty: Graph = { nodes: [{ id: 'n0', kind: 'client' }], edges: [] };

describe('builder rules', () => {
  for (const c of challenges) {
    it(`${c.id}: the reference design meets every rule`, () => {
      const g = referenceGraph(c);
      expect(scoreOf(c, g)).toBe(1);
      for (const r of c.rules) for (const s of r.specs) expect(diagnose(g, s)).toBeNull();
    });
    it(`${c.id}: from an empty canvas, applying every suggested fix repeatedly reaches a full score or a removal-only gap`, () => {
      let g = empty, n = 1;
      for (let round = 0; round < 12; round++) {
        let changed = false;
        for (const r of c.rules) for (const s of r.specs) {
          const f = diagnose(g, s);
          if (f?.apply) { const next = applyFix(g, f.apply, () => `n${n++}`); if (next.edges.length !== g.edges.length || next.nodes.length !== g.nodes.length) { g = next; changed = true; } }
        }
        if (!changed) break;
      }
      const failing = c.rules.flatMap((r) => r.specs).filter((s) => !holds(g, s));
      // only "remove this arrow" findings may remain, and an empty-start build never needs those
      expect(failing.map((s) => s.t)).toEqual([]);
    });
    it(`${c.id}: every rule explains why it matters`, () => {
      for (const r of c.rules) expect(r.why.length).toBeGreaterThan(20);
    });
  }
  it('names the exact parts that break a rule', () => {
    const c = challenges.find((x) => x.id === 'scale')!;
    const g: Graph = { nodes: [{ id: 'c', kind: 'client' }, { id: 'lb', kind: 'lb' }, { id: 'a1', kind: 'api' }, { id: 'a2', kind: 'api' }, { id: 'db', kind: 'db' }], edges: [['c', 'lb'], ['lb', 'a1'], ['a1', 'db'], ['a2', 'db'], ['c', 'db']] };
    const fed = diagnose(g, c.rules[1]!.specs[1]!)!;
    expect(fed.mark.nodes).toEqual(['a2']);
    const direct = diagnose(g, c.rules[4]!.specs[0]!)!;
    expect(direct.mark.edges).toEqual([['c', 'db']]);
    expect(direct.apply).toBeUndefined();
  });
});
