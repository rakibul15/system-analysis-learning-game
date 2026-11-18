import type { Level, Question } from './schema';
import type { LevelBank } from './bank/types';

/**
 * The full content that has been loaded so far. The app fills it one chapter at a time
 * (see load.ts); tests fill it all at once through levels/all.ts. Light facts every
 * screen needs (titles, concepts, which question belongs to which concept) live in
 * meta.ts and are always there.
 */
export const loadedLevels: Record<number, Level> = {};
export const banks: Record<number, LevelBank> = {};
/** Every scored question by id: lesson checkpoints, missions and boss. */
export const questionsById: Record<string, { q: Question; levelId: number }> = {};

export function register(levels: Level[], levelBanks: Record<number, LevelBank>) {
  for (const l of levels) {
    loadedLevels[l.id] = l;
    const scored = [
      ...l.steps.flatMap((s) => (s.ask ? [s.ask] : [])),
      ...(l.play.kind === 'missions' ? l.play.missions : []),
      ...l.boss,
    ];
    for (const q of scored) questionsById[q.id] = { q, levelId: l.id };
  }
  Object.assign(banks, levelBanks);
}
