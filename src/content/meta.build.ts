import type { Level } from './schema';
import type { LevelBank } from './bank/types';
import type { Note } from './notes/types';
import type { Timeline } from '@/features/deep/timelines';

/*
 * Builds meta.gen.ts: the small facts about every level, note and timeline that the
 * map, plan, profile and review need before a chapter's full content is loaded.
 * Run `npm run gen:meta` after changing content; meta.test.ts fails while it is stale.
 */

export type Pair = [bn: string, en: string];
export interface GenLevel {
  id: number; chapter: number; title: Pair; concept: Pair; story: Pair; briefing: Pair; minutes: number; simulator?: string;
  /** The five boss concepts, in boss order. */
  concepts: [id: string, label: Pair][];
  /** Question id → index into concepts, for every boss, written and generated question. */
  qc: Record<string, number>;
}
export interface GenNote { id: string; title: string; gist: string; levels: number[] }
export interface GenTimeline { id: string; title: string; gist: string; levels: number[]; note?: string }

/** One language's facts. */
export interface LangFacts {
  id: number; chapter: number; title: string; concept: string; story: string; briefing: string; minutes: number; simulator?: string;
  concepts: [string, string][]; qc: Record<string, number>;
}

export function levelFacts(levels: Level[], banks: Record<number, LevelBank>): LangFacts[] {
  return levels.map((l) => {
    const b = banks[l.id];
    const qc: Record<string, number> = {};
    if (b) {
      l.boss.forEach((q, i) => { qc[q.id] = i; });
      const at = (concept: string) => b.concepts.findIndex((c) => c.id === concept);
      for (const it of b.items) qc[it.id] = at(it.concept);
      for (const g of b.gens) qc[g.id] = at(g.concept);
    }
    return {
      id: l.id, chapter: l.chapter, title: l.title, concept: l.concept, story: l.story, briefing: l.briefing, minutes: l.minutes,
      ...(l.simulator ? { simulator: l.simulator } : {}),
      concepts: b ? b.concepts.map((c) => [c.id, c.label] as [string, string]) : [],
      qc,
    };
  });
}

/** Joins the Bangla and English facts; ids, chapters and question maps must agree. */
export function mergeLangs(bn: LangFacts[], en: LangFacts[]): GenLevel[] {
  if (bn.length !== en.length) throw new Error(`level count differs: ${bn.length} vs ${en.length}`);
  return bn.map((b, i) => {
    const e = en[i]!;
    const same = b.id === e.id && b.chapter === e.chapter && b.minutes === e.minutes && b.simulator === e.simulator
      && JSON.stringify(b.qc) === JSON.stringify(e.qc)
      && JSON.stringify(b.concepts.map((c) => c[0])) === JSON.stringify(e.concepts.map((c) => c[0]));
    if (!same) throw new Error(`level ${b.id}: Bangla and English content disagree on ids, chapter, simulator or concepts`);
    return {
      id: b.id, chapter: b.chapter, title: [b.title, e.title], concept: [b.concept, e.concept],
      story: [b.story, e.story], briefing: [b.briefing, e.briefing], minutes: b.minutes,
      ...(b.simulator ? { simulator: b.simulator } : {}),
      concepts: b.concepts.map(([id, label], k) => [id, [label, e.concepts[k]![1]]] as [string, Pair]),
      qc: b.qc,
    };
  });
}

export const noteFacts = (notes: Note[]): GenNote[] => notes.map((n) => ({ id: n.id, title: n.title, gist: n.gist, levels: n.levels }));
export const timelineFacts = (ts: Timeline[]): GenTimeline[] =>
  ts.map((t) => ({ id: t.id, title: t.title, gist: t.gist, levels: t.levels, ...(t.note ? { note: t.note } : {}) }));

export function renderMeta(levels: GenLevel[], notes: GenNote[], timelines: GenTimeline[]): string {
  const rows = (xs: unknown[]) => xs.map((x) => `  ${JSON.stringify(x)},`).join('\n');
  return [
    '// Generated from the content files by scripts/gen-meta.mjs. Do not edit: run `npm run gen:meta`.',
    "import type { GenLevel, GenNote, GenTimeline } from './meta.build';",
    '',
    `export const LEVELS: GenLevel[] = [\n${rows(levels)}\n];`,
    '',
    `export const NOTES: GenNote[] = [\n${rows(notes)}\n];`,
    '',
    `export const TIMELINES: GenTimeline[] = [\n${rows(timelines)}\n];`,
    '',
  ].join('\n');
}
