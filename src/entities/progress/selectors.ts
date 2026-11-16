import { chapters, levelsById } from '@/content/levels';
import { CHAPTER_GATE, DAY_MS, PASS_MARK, dayKey, type Mastery } from '@/shared/lib/scoring';
import type { ProgressData } from './store';

export type LevelState = 'done' | 'open' | 'locked';

const chapterOf = (id: number) => chapters.find((c) => c.levels.includes(id))!;

/** Why a level is locked, in words, or null when it is open. */
export function lockReason(id: number, p: ProgressData): string | null {
  if (p.settings.unlockAll || id === 1) return null;
  const ch = chapterOf(id);
  const first = ch.levels[0]!;
  if (id === first) {
    const prevCh = chapters.find((c) => c.id === ch.id - 1)!;
    const gate = prevCh.levels[prevCh.levels.length - 1]!;
    return (p.levels[gate]?.best ?? 0) >= CHAPTER_GATE ? null : `অধ্যায় ${toBn(prevCh.id)}-এর শেষ level (${toBn(gate)})-এ ${toBn(CHAPTER_GATE)}+ পেলে খুলবে`;
  }
  return (p.levels[id - 1]?.best ?? 0) >= PASS_MARK ? null : `Level ${toBn(id - 1)}-এ ${toBn(PASS_MARK)}+ পেলে খুলবে`;
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
  return levelXp + p.reviewXp + p.estimation.correct * 3 + p.design.length * 20 + p.speak.length * 5;
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

export interface ReadinessPart { id: string; label: string; weight: number; score: number; available: boolean; note: string }

/** Interview readiness out of 100, with the plan's weights. Parts not built yet count as 0. */
export function readiness(p: ProgressData): { total: number; parts: ReadinessPart[] } {
  const ids = Object.keys(levelsById).map(Number);
  const campaign = ids.reduce((s, id) => s + (p.levels[id]?.best ?? 0), 0) / (ids.length * 100);
  const mastered = ids.filter((id) => ['skilled', 'solid'].includes(masteryOf(id, p))).length / ids.length;
  const drillVolume = Math.min(1, p.estimation.attempts / 40);
  const drill = p.estimation.attempts ? (p.estimation.correct / p.estimation.attempts) * drillVolume : 0;
  const recentDesign = p.design.slice(-3);
  const mock = recentDesign.length ? (recentDesign.reduce((s, d) => s + d.score / d.max, 0) / 3) : 0;
  const parts: ReadinessPart[] = [
    { id: 'campaign', label: 'Campaign (৩০ level)', weight: 30, score: campaign, available: true, note: 'সব level-এর সেরা নম্বরের গড়' },
    { id: 'mock', label: 'Design challenge', weight: 20, score: mock, available: true, note: 'শেষ ৩টা design challenge-এর নিজের দেওয়া নম্বর' },
    { id: 'mastery', label: 'দখল', weight: 15, score: mastered, available: true, note: 'কতগুলো level "দক্ষ" বা "পাকা"' },
    { id: 'builder', label: 'Architecture builder', weight: 15, score: 0, available: false, note: 'এখনো তৈরি হয়নি' },
    { id: 'drill', label: 'Estimation drill', weight: 10, score: drill, available: true, note: 'নির্ভুলতা, অন্তত ৪০টা প্রশ্নে পূর্ণ মান' },
    { id: 'incident', label: 'Incident mode', weight: 10, score: 0, available: false, note: 'এখনো তৈরি হয়নি' },
  ];
  const total = parts.reduce((s, x) => s + x.weight * x.score, 0);
  return { total: Math.round(total), parts };
}

const toBn = (n: number) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!);
