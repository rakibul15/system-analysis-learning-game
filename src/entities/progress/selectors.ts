import { bn } from '@/shared/lib/bn';
import { chapters } from '@/content/meta';
import { CHAPTER_GATE, DAY_MS, PASS_MARK, dayKey, type Mastery } from '@/shared/lib/scoring';
import type { ProgressData } from './store';
import { tr } from '@/shared/lib/i18n';

export type LevelState = 'done' | 'open' | 'locked';

const chapterOf = (id: number) => chapters.find((c) => c.levels.includes(id))!;

/** Why a level is locked, in words, or null when it is open. */
export function lockReason(id: number, p: ProgressData): string | null {
  if (p.settings.unlockAll || id === 1) return null;
  const ch = chapterOf(id);
  const first = ch.levels[0]!;
  if (id === first) {
    const prevCh = ch.gate ? chapterOf(ch.gate) : chapters.find((c) => c.id === ch.id - 1)!;
    const gate = ch.gate ?? prevCh.levels[prevCh.levels.length - 1]!;
    return (p.levels[gate]?.best ?? 0) >= CHAPTER_GATE ? null : tr(`অধ্যায় ${toBn(prevCh.id)}-এর শেষ level (${toBn(gate)})-এ ${toBn(CHAPTER_GATE)}+ পেলে খুলবে`, `Opens at ${CHAPTER_GATE}+ on chapter ${prevCh.id}'s last level (${gate})`);
  }
  return (p.levels[id - 1]?.best ?? 0) >= PASS_MARK ? null : tr(`Level ${toBn(id - 1)}-এ ${toBn(PASS_MARK)}+ পেলে খুলবে`, `Opens at ${PASS_MARK}+ on level ${id - 1}`);
}

export function levelState(id: number, p: ProgressData): LevelState {
  if ((p.levels[id]?.best ?? 0) >= PASS_MARK) return 'done';
  return lockReason(id, p) ? 'locked' : 'open';
}

export function masteryOf(id: number, p: ProgressData): Mastery {
  const r = p.levels[id];
  if (!r) return 'none';
  if (r.best < PASS_MARK) return 'seen';
  if (r.best < 80) return 'understood';
  const cards = Object.values(p.cards).filter((c) => c.levelId === id);
  return cards.length > 0 && cards.every((c) => c.box >= 2) ? 'solid' : 'skilled';
}

export function dueCards(p: ProgressData, now = Date.now()) {
  return Object.values(p.cards).filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

export function totalXp(p: ProgressData): number {
  const levelXp = Object.values(p.levels).reduce((s, l) => s + l.best, 0);
  return levelXp + p.reviewXp + p.estimation.correct * 3 + p.design.length * 20 + p.speak.length * 5 + Math.round(Object.values(p.incidents ?? {}).reduce((a, b) => a + b, 0) * 30) + Math.round(Object.values(p.builds ?? {}).reduce((a, b) => a + b, 0) * 30);
}

/** Days in a row with activity, counting today or yesterday as the latest. */
export function streak(p: ProgressData): number {
  const set = new Set(p.days);
  let d = new Date();
  if (!set.has(dayKey(d))) d = new Date(d.getTime() - DAY_MS);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return n;
}


const toBn = (n: number) => bn(n, { grouping: false });
