import { banks, conceptOf } from '@/content/bank';
import { notesForLevel, type Note } from '@/content/notes';
import { timelinesForLevel, type Timeline } from '@/features/deep/timelines';
import { levelsById } from '@/content/levels';
import type { ProgressData } from '@/entities/progress/store';

export interface ConceptStat {
  key: string; levelId: number; index: number; label: string; levelTitle: string;
  /** Review cards (mistakes) on this concept, and how often they were missed again. */
  cards: number; lapses: number; weakness: number;
  note?: Note; deep?: Timeline;
}

/**
 * The concepts you keep missing, weakest first. Every wrong answer becomes a review card;
 * cards still in the low boxes, and ones missed again in review, weigh the most.
 */
export function weakConcepts(p: Pick<ProgressData, 'cards'>, limit = 5): ConceptStat[] {
  const by = new Map<string, ConceptStat>();
  for (const c of Object.values(p.cards)) {
    const where = conceptOf(c.qid);
    if (!where) continue;
    const key = `${where.levelId}:${where.index}`;
    const level = levelsById[where.levelId]!;
    const s = by.get(key) ?? {
      key, levelId: where.levelId, index: where.index, levelTitle: level.title,
      label: banks[where.levelId]!.concepts[where.index]!.label,
      cards: 0, lapses: 0, weakness: 0,
      note: notesForLevel(where.levelId)[0], deep: timelinesForLevel(where.levelId)[0],
    };
    s.cards += 1;
    s.lapses += c.lapses;
    // a card that climbed to the high boxes is nearly learnt; a fresh or re-missed one is not
    s.weakness += (1 + c.lapses) * (c.box <= 1 ? 1 : c.box <= 3 ? 0.4 : 0.1);
    by.set(key, s);
  }
  return [...by.values()].filter((s) => s.weakness >= 1).sort((a, b) => b.weakness - a.weakness || b.lapses - a.lapses).slice(0, limit);
}
