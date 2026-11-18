import { afterEach, describe, expect, it } from 'vitest';
import { banks, levelsById } from './levels/all';
import { drawBoss, reviewVariant } from './bank';
import { isDisabled, setDisabled } from './disabled';
import { mulberry32 } from '@/simulators/traffic/engine';

const level = levelsById[1]!;
const b = banks[1]!;
const concept = b.concepts[0]!.id;
const ids = [level.boss[0]!.id, ...b.items.filter((i) => i.concept === concept).map((i) => i.id), ...b.gens.filter((g) => g.concept === concept).map((g) => g.id)];

describe('turned-off questions', () => {
  afterEach(() => setDisabled([]));

  it('never come up in a boss while the concept has another question', () => {
    const keep = ids[ids.length - 1]!;
    setDisabled(ids.filter((x) => x !== keep));
    for (let s = 1; s <= 30; s++) expect(drawBoss(level, new Set(), mulberry32(s))[0]!.id).toBe(keep);
  });

  it('a concept with every question turned off still gets one (the card then skips it)', () => {
    setDisabled(ids);
    const q = drawBoss(level, new Set(), mulberry32(3))[0]!;
    expect(ids).toContain(q.id);
    expect(isDisabled(q.id)).toBe(true);
  });

  it('review asks a working question on the same concept instead', () => {
    const broken = ids[0]!;
    setDisabled([broken]);
    for (let s = 1; s <= 20; s++) {
      const q = reviewVariant(broken, level.boss[0], mulberry32(s))!;
      expect(isDisabled(q.id)).toBe(false);
      expect(ids).toContain(q.id);
    }
  });
});
