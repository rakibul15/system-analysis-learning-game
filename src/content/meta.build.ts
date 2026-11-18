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
/** Where our notes meet one DDIA chapter: which notes, which of its sections, and its figures to look at. */
export interface GenDdiaChapter {
  ch: number;
  /** Notes that treat this chapter, with the sections of it they point to (no section = the chapter as a whole). */
  notes: { id: string; sections: { s?: string; p?: [number, number] }[] }[];
  /** Figures in the learner's own copy that a note points to: number, printed page, what to look for (our words). */
  figs: { n: string; page: number; look: string; note: string }[];
}

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
/** DDIA (2nd edition) chapter by chapter: what our notes already cover of it. */
export function ddiaFacts(notes: Note[], chapterCount = 14): GenDdiaChapter[] {
  const figNum = (n: string) => Number(n.split('-')[1] ?? 0);
  return Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => {
    const byNote: GenDdiaChapter['notes'] = [];
    const figs: GenDdiaChapter['figs'] = [];
    for (const n of notes) {
      const refs = [...n.chapters, ...n.refs, ...n.blocks.flatMap((b) => (b.kind === 'says' ? [b.ddia.ref] : []))]
        .filter((r) => r.book === 'ddia2' && r.chapter === ch);
      const sections = new Map<string, { s?: string; p?: [number, number] }>();
      for (const r of refs) {
        const key = r.section ?? '';
        if (!sections.has(key)) sections.set(key, { ...(r.section ? { s: r.section } : {}), ...(r.pages ? { p: r.pages } : {}) });
      }
      for (const b of n.blocks) {
        if (b.kind !== 'figs' || b.book !== 'ddia2' || b.chapter !== ch) continue;
        for (const f of b.items) if (!figs.some((x) => x.n === f.n)) figs.push({ n: f.n, page: f.page, look: f.look, note: n.id });
      }
      const hasFigs = figs.some((f) => f.note === n.id);
      if (!sections.size && !hasFigs) continue;
      // the chapter as a whole first, then its sections in book order
      const list = [...sections.values()].sort((a, b) => (a.s ? 1 : 0) - (b.s ? 1 : 0) || (a.p?.[0] ?? 0) - (b.p?.[0] ?? 0));
      byNote.push({ id: n.id, sections: list });
    }
    figs.sort((a, b) => figNum(a.n) - figNum(b.n));
    return { ch, notes: byNote, figs };
  });
}

export function renderDdia(chapters: GenDdiaChapter[]): string {
  return [
    '// Generated from the notes by scripts/gen-meta.mjs. Do not edit: run `npm run gen:meta`.',
    "import type { GenDdiaChapter } from '../meta.build';",
    '',
    `export const DDIA_CHAPTERS: GenDdiaChapter[] = [\n${chapters.map((c) => `  ${JSON.stringify(c)},`).join('\n')}\n];`,
    '',
  ].join('\n');
}

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
