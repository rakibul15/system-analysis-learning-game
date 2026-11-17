import { levelList, levelsById } from '@/content/levels';
import type { ProgressData } from '@/entities/progress/store';
import { dueCards } from '@/entities/progress/selectors';
import { dueRebuilds } from '@/features/rebuild/rebuild';
import { DAY_MS, PASS_MARK, dayKey } from '@/shared/lib/scoring';
import { chapters } from '@/features/reading/ddia';

export type TaskKind = 'level' | 'review' | 'rebuild' | 'weak' | 'mock' | 'guided' | 'read';
export interface PlanTask { id: string; kind: TaskKind; minutes: number; done: boolean; levelId?: number; count?: number; challengeId?: string; chapter?: number }
export type Phase = 'none' | 'learn' | 'final' | 'after';

export interface DayPlan {
  phase: Phase;
  /** Days until the interview, counting today; null without a date. */
  daysLeft: number | null;
  remaining: number;
  /** Levels per day needed to finish before the last two days. */
  needPerDay: number;
  /** Levels per day that fit in the daily minutes. */
  fitPerDay: number;
  onTrack: boolean;
  tasks: PlanTask[];
}

export const LEVEL_MIN = 15;
export const REBUILD_MIN = 8;
export const READ_MIN = 25;
const REVIEW_MIN_EACH = 0.5;
const FINAL_DAYS = 2;

const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Today's work, from the interview date, the daily minutes and where the learner stands. */
export function planToday(p: ProgressData, now = Date.now()): DayPlan {
  const today = dayKey(new Date(now));
  const minutes = p.settings.dailyMinutes ?? 30;
  const date = p.settings.interviewDate ? Date.parse(`${p.settings.interviewDate}T00:00:00`) : NaN;
  const daysLeft = Number.isFinite(date) ? Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS) : null;

  const passed = (id: number) => (p.levels[id]?.best ?? 0) >= PASS_MARK;
  const playedToday = (id: number) => !!p.levels[id] && dayKey(new Date(p.levels[id]!.lastPlayedAt)) === today;
  const order = levelList.map((l) => l.id);
  const remainingIds = order.filter((id) => !passed(id));
  const doneToday = order.filter((id) => passed(id) && playedToday(id));

  const reviewsDue = Math.min(20, dueCards(p, now).length);
  const rebuilds = dueRebuilds(p, now).slice(0, 2);
  const fixedMin = reviewsDue * REVIEW_MIN_EACH + rebuilds.length * REBUILD_MIN;
  const fitPerDay = Math.max(1, Math.floor((minutes - fixedMin) / LEVEL_MIN));

  let phase: Phase = 'none';
  if (daysLeft !== null) phase = daysLeft < 0 ? 'after' : daysLeft <= FINAL_DAYS ? 'final' : 'learn';
  const learnDays = daysLeft !== null && phase === 'learn' ? Math.max(1, daysLeft - FINAL_DAYS) : 1;
  // count what was already finished today so the target does not shrink while you work
  const needPerDay = phase === 'learn' ? Math.ceil((remainingIds.length + doneToday.length) / learnDays) : 0;
  const target = phase === 'final' ? 0 : phase === 'learn' ? needPerDay : Math.min(fitPerDay, 2);

  const tasks: PlanTask[] = [];
  if (reviewsDue > 0) tasks.push({ id: 'review', kind: 'review', minutes: Math.max(2, Math.ceil(reviewsDue * REVIEW_MIN_EACH)), done: false, count: reviewsDue });
  for (const r of rebuilds) tasks.push({ id: `rebuild:${r.challenge.id}`, kind: 'rebuild', minutes: REBUILD_MIN, done: false, challengeId: r.challenge.id });

  const levelIds = [...doneToday, ...remainingIds].slice(0, target);
  for (const id of levelIds) tasks.push({ id: `level:${id}`, kind: 'level', minutes: LEVEL_MIN, done: passed(id) && playedToday(id), levelId: id });

  // the weakest level you have played, when there is room for it or the interview is close
  const weak = order
    .filter((id) => p.levels[id] && p.levels[id]!.best < 70 && !levelIds.includes(id))
    .sort((a, b) => p.levels[a]!.best - p.levels[b]!.best)[0];
  const used = tasks.reduce((s, t) => s + t.minutes, 0);
  if (weak && (phase === 'final' || minutes - used >= LEVEL_MIN)) tasks.push({ id: `weak:${weak}`, kind: 'weak', minutes: LEVEL_MIN, done: playedToday(weak), levelId: weak });

  // a reading track counts once started: today's chapter, done when its status or notes changed today
  const reading = p.reading ?? {};
  if (phase !== 'final' && chapters.some((c) => (reading[c.id]?.status ?? 0) > 0)) {
    const ch = chapters.find((c) => reading[c.id]?.status === 1) ?? chapters.find((c) => (reading[c.id]?.status ?? 0) < 2);
    if (ch) {
      const r = reading[ch.id];
      tasks.push({ id: `read:${ch.n}`, kind: 'read', minutes: READ_MIN, done: !!r && dayKey(new Date(r.updatedAt)) === today, chapter: ch.n });
    }
  }

  if (phase === 'final') {
    const didToday = (prefix: string) => p.design.some((d) => d.promptId.startsWith(prefix) && dayKey(new Date(d.at)) === today);
    tasks.push({ id: 'mock', kind: 'mock', minutes: 45, done: didToday('mock:') });
    tasks.push({ id: 'guided', kind: 'guided', minutes: 30, done: didToday('guided:') });
  }

  return {
    phase,
    daysLeft,
    remaining: remainingIds.length,
    needPerDay,
    fitPerDay,
    onTrack: phase !== 'learn' || needPerDay <= fitPerDay,
    tasks,
  };
}

export const levelTitle = (id: number) => levelsById[id]?.title ?? `Level ${id}`;
