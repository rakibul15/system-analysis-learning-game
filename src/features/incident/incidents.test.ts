import { describe, expect, it } from 'vitest';
import { enIncidents } from './incidents.en';
import { incidents } from './incidents';

describe('incidents', () => {
  it('the English set matches the Bangla one in ids, levels, numbers and option counts', () => {
    expect(enIncidents.map((i) => [i.id, i.level, i.severity, i.series.map((s) => s.values), i.stages.map((s) => s.options.length)]))
      .toEqual(incidents.map((i) => [i.id, i.level, i.severity, i.series.map((s) => s.values), i.stages.map((s) => s.options.length)]));
  });
  it('the right option is never far longer than the others', () => {
    for (const set of [incidents, enIncidents]) for (const i of set) for (const s of i.stages) {
      const [right, ...wrong] = s.options.map((o) => o.length);
      expect(right! / Math.max(...wrong), `${i.id}: ${s.options[0]}`).toBeLessThan(1.35);
    }
  });
});
