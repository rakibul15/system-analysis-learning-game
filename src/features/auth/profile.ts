import type { ProgressData } from '@/entities/progress/store';
import { PASS_MARK } from '@/shared/lib/scoring';

/*
 * profiles/{uid}: who a learner is (name and email from their Google account) and a small
 * summary of their progress, so an admin can contact them or check that their progress is
 * in the cloud. Learners are told this where they sign in. The full progress stays private.
 */

export interface ProgressSummary {
  /** Levels at or above the pass mark. */
  passed: number;
  /** Levels played at least once. */
  played: number;
  /** Review cards. */
  cards: number;
  /** Days with any play. */
  days: number;
  /** Last day played (YYYY-MM-DD), or null. */
  lastDay: string | null;
  /** Chapters the placement test showed as known, or null when it was never taken. */
  placed: number | null;
}

export interface Profile { name: string; email: string; lang: string; summary: ProgressSummary }

export function summarize(p: Pick<ProgressData, 'levels' | 'cards' | 'days'> & { placement?: ProgressData['placement'] }): ProgressSummary {
  const levels = Object.values(p.levels);
  const days = [...p.days].sort();
  return {
    passed: levels.filter((l) => l.best >= PASS_MARK).length,
    played: levels.length,
    cards: Object.keys(p.cards).length,
    days: days.length,
    lastDay: days[days.length - 1] ?? null,
    placed: p.placement ? p.placement.mastered.length : null,
  };
}
