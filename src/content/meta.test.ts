import { describe, expect, it } from 'vitest';
import { allBanks, levelList } from './levels/all';
import { ddiaFacts, levelFacts, noteFacts, timelineFacts, type GenLevel } from './meta.build';
import { DDIA_CHAPTERS } from './notes/ddia.gen';
import { LEVELS, NOTES, TIMELINES } from './meta.gen';
import { notes } from './notes/all';
import { timelines } from '@/features/deep/timelines';
import { noteIds } from './notes';

const STALE = 'src/content/meta.gen.ts is out of date: run `npm run gen:meta`';
/** One language's side of the generated facts. */
const side = (ls: GenLevel[], i: 0 | 1) =>
  ls.map((l) => ({ ...l, title: l.title[i], concept: l.concept[i], story: l.story[i], briefing: l.briefing[i], concepts: l.concepts.map(([id, p]) => [id, p[i]]) }));

describe('generated content facts (meta.gen.ts)', () => {
  it('match the Bangla levels and question banks', () => {
    expect(side(LEVELS, 0), STALE).toEqual(levelFacts(levelList, allBanks));
  });
  it('match the notes and timelines', () => {
    expect(NOTES, STALE).toEqual(noteFacts(notes));
    expect(TIMELINES, STALE).toEqual(timelineFacts(timelines));
  });
  it('match the notes, chapter by chapter of DDIA (notes/ddia.gen.ts)', () => {
    expect(DDIA_CHAPTERS, 'src/content/notes/ddia.gen.ts is out of date: run `npm run gen:meta`').toEqual(ddiaFacts(notes));
  });
  it('every note can be loaded on its own', () => {
    expect([...noteIds].sort()).toEqual(notes.map((n) => n.id).sort());
  });
  it('every bank question maps to a concept', () => {
    for (const l of LEVELS) for (const [qid, i] of Object.entries(l.qc)) expect(i, qid).toBeGreaterThanOrEqual(0);
  });
});
