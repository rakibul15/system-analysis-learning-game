import { expect, it, vi } from 'vitest';
import { levelFacts, type GenLevel } from './meta.build';

// The app reads its language once at start-up, so stub it before loading any content.
vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'salg-lang' ? 'en' : null), setItem() {}, removeItem() {} });

const side = (ls: GenLevel[]) =>
  ls.map((l) => ({ ...l, title: l.title[1], concept: l.concept[1], story: l.story[1], briefing: l.briefing[1], concepts: l.concepts.map(([id, p]) => [id, p[1]]) }));

it('generated content facts match the English levels and question banks', async () => {
  const { isEn } = await import('@/shared/lib/i18n');
  expect(isEn).toBe(true);
  const { allBanks, levelList } = await import('./levels/all');
  const { LEVELS } = await import('./meta.gen');
  expect(side(LEVELS), 'src/content/meta.gen.ts is out of date: run `npm run gen:meta`').toEqual(levelFacts(levelList, allBanks));
});
