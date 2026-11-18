import { chapterOf, chapters } from '@/content/meta';
import type { ProgressData, ReviewCard } from '@/entities/progress/store';
import { normalize } from './merge';

/*
 * Cloud progress is kept as small parts instead of one big document, so a sync only
 * writes what changed (finishing a level touches "levels" and one chapter's cards, not
 * everything) and no single document grows towards Firestore's 1 MB limit.
 *
 *   users/{uid}                 { v: 4, revs: { part: rev }, updatedAt }
 *   users/{uid}/progress/{part} { data: JSON, updatedAt }
 *
 * A part's rev changes on every write, so another device can tell which parts it must fetch.
 */

export type Parts = Record<string, string>;

const cardPart = (c: ReviewCard) => `cards-${chapterOf(c.levelId) ?? 0}`;
export const isCardPart = (k: string) => /^cards-\d+$/.test(k);
/** What an absent part stands for. */
export const emptyPart = (k: string) => (isCardPart(k) ? '{}' : null);
export const PART_NAME = /^(levels|activity|practice|reading|settings|cards-\d{1,2})$/;
/** Every part name there can be. */
export const allPartNames = () => ['levels', 'activity', 'practice', 'reading', 'settings', ...Array.from({ length: chapters.length + 1 }, (_, i) => `cards-${i}`)];

/** Progress → part name → JSON. Card parts only appear for chapters that have cards. */
export function splitProgress(p: ProgressData): Parts {
  const out: Record<string, unknown> = {
    levels: p.levels,
    activity: { days: p.days, reviewXp: p.reviewXp, estimation: p.estimation, design: p.design, speak: p.speak },
    practice: { incidents: p.incidents, builds: p.builds, rebuilds: p.rebuilds },
    reading: p.reading,
    settings: p.settings,
  };
  const ids = Object.keys(p.cards).sort();
  for (const id of ids) {
    const c = p.cards[id]!;
    ((out[cardPart(c)] ??= {}) as Record<string, ReviewCard>)[id] = c;
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, JSON.stringify(v)]));
}

/** Part name → JSON → progress. Unknown or broken parts are skipped. */
export function assembleProgress(parts: Parts): ProgressData {
  const get = (k: string): Record<string, unknown> => {
    try { const v = parts[k] ? JSON.parse(parts[k]) : {}; return v && typeof v === 'object' ? v : {}; } catch { return {}; }
  };
  const cards = Object.assign({}, ...Object.keys(parts).filter(isCardPart).sort().map(get));
  return normalize({ levels: get('levels'), cards, ...get('activity'), ...get('practice'), reading: get('reading'), settings: get('settings') });
}
