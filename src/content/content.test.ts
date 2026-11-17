import { describe, expect, it } from 'vitest';
import { bnLevels, chapters, enLevels, levelList, questionsById } from './levels';
import { levelSchema, type Level } from './schema';

describe('level content', () => {
  it('has all 34 levels (30 + the bonus DDIA chapter), numbered in order', () => {
    expect(levelList.map((l) => l.id)).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
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

  it('chapters start at levels 1, 5, 8, 16, 22, 29 and the bonus 31 (the plan)', () => {
    expect(chapters.map((c) => c.levels[0])).toEqual([1, 5, 8, 16, 22, 29, 31]);
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

  it('every campaign level after the first has an interactive simulator, each a different one', () => {
    const campaign = levelList.filter((l) => l.chapter <= 6);
    const sims = campaign.filter((l) => l.simulator);
    expect(sims.map((l) => l.id)).toEqual(campaign.map((l) => l.id).filter((id) => id !== 1));
    expect(new Set(sims.map((l) => l.simulator)).size).toBe(sims.length);
  });
});

describe('English content', () => {
  const pairs = bnLevels.map((b, i) => [b, enLevels[i]!] as const);
  const shape = (l: Level) => ({
    id: l.id, chapter: l.chapter, simulator: l.simulator, minutes: l.minutes, ref: l.ref.url,
    nodes: l.nodes.map((n) => [n.id, n.kind, n.x, n.y]),
    steps: l.steps.map((s) => ({ ...s, text: undefined, badges: Object.keys(s.badges ?? {}), ask: s.ask && [s.ask.id, s.ask.options.length] })),
    predict: [l.predict.id, l.predict.options.length],
    play: l.play.kind === 'missions' ? l.play.missions.map((m) => [m.id, m.options.length]) : l.play.kind,
    boss: l.boss.map((q) => [q.id, q.options.length, !!q.hint]),
  });

  it('every English level passes the schema', () => {
    for (const l of enLevels) expect(levelSchema.safeParse(l).success, `en level ${l?.id}`).toBe(true);
  });

  it('has exactly the same structure as the Bangla level (ids, nodes, steps, questions)', () => {
    for (const [b, e] of pairs) expect(shape(e), `level ${b.id}`).toEqual(shape(b));
  });

  it('contains no Bangla text', () => {
    const bangla = /[ঀ-৿]/;
    for (const l of enLevels) {
      const text = JSON.stringify({ ...l, ref: undefined });
      const hit = text.match(new RegExp(`.{0,30}${bangla.source}.{0,30}`));
      // ৳ (the taka sign) is fine in English text
      expect(hit && !/^[^ঀ-৲৴-৿]*$/.test(hit[0]) ? hit[0] : null, `level ${l.id}`).toBeNull();
    }
  });

  it('option length does not give the answer away in English either', () => {
    let longer = 0, total = 0;
    for (const l of enLevels) {
      const qs = [...l.steps.flatMap((s) => (s.ask ? [s.ask] : [])), ...(l.play.kind === 'missions' ? l.play.missions : []), ...l.boss];
      for (const q of qs) {
        expect(new Set(q.options).size, q.id).toBe(q.options.length);
        const [right, ...wrong] = q.options.map((o) => o.length);
        const ratio = right! / Math.max(...wrong);
        expect(ratio, `${q.id}: ${q.options.join(' | ')}`).toBeLessThan(1.5);
        total++;
        if (ratio > 1.3) longer++;
      }
    }
    expect(longer / total).toBeLessThan(0.1);
  });
});
