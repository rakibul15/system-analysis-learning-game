import { isEn } from '@/shared/lib/i18n';
import type { SimulatorId } from './schema';
import { LEVELS, NOTES, TIMELINES } from './meta.gen';
import type { GenNote, GenTimeline, Pair } from './meta.build';

/*
 * The light facts every screen needs, always loaded: level titles and concepts,
 * which question belongs to which concept, and the lists of notes and timelines.
 * The full content of a chapter (lessons, missions, question banks) loads on demand
 * through load.ts.
 */

export interface LevelMeta {
  id: number;
  chapter: number;
  title: string;
  concept: string;
  story: string;
  briefing: string;
  minutes: number;
  simulator?: SimulatorId;
  /** The five boss concepts, in boss order. */
  concepts: { id: string; label: string }[];
}

const pick = ([b, e]: Pair) => (isEn ? e : b);

export const levelMetaList: LevelMeta[] = LEVELS.map((l) => ({
  id: l.id, chapter: l.chapter, title: pick(l.title), concept: pick(l.concept),
  story: pick(l.story), briefing: pick(l.briefing), minutes: l.minutes,
  ...(l.simulator ? { simulator: l.simulator as SimulatorId } : {}),
  concepts: l.concepts.map(([id, label]) => ({ id, label: pick(label) })),
}));
export const levelMeta: Record<number, LevelMeta> = Object.fromEntries(levelMetaList.map((l) => [l.id, l]));
const qcByLevel: Record<number, Record<string, number>> = Object.fromEntries(LEVELS.map((l) => [l.id, l.qc]));

export { chapters } from './chapters';

export const chapterOf = (levelId: number) => levelMeta[levelId]?.chapter;

/** Which level and boss concept a question id belongs to. */
export function conceptOf(qid: string): { levelId: number; index: number } | null {
  const levelId = Number(/^l(\d+)-/.exec(qid)?.[1]);
  const index = qcByLevel[levelId]?.[qid];
  return index === undefined || index < 0 ? null : { levelId, index };
}

export const conceptLabel = (qid: string) => {
  const c = conceptOf(qid);
  return c ? levelMeta[c.levelId]!.concepts[c.index]?.label ?? null : null;
};

export type NoteMeta = GenNote;
export const notesMeta: NoteMeta[] = NOTES;
export const notesMetaById: Record<string, NoteMeta> = Object.fromEntries(NOTES.map((n) => [n.id, n]));
export const notesForLevel = (id: number) => NOTES.filter((n) => n.levels.includes(id));

export type TimelineMeta = GenTimeline;
export const timelinesMeta: TimelineMeta[] = TIMELINES;
export const timelinesForLevel = (id: number) => TIMELINES.filter((t) => t.levels.includes(id));
export const timelinesForNote = (id: string) => TIMELINES.filter((t) => t.note === id);
