import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DAY_MS, REVIEW_DAYS, dayKey } from '@/shared/lib/scoring';

export interface LevelRecord {
  best: number;
  stars: 0 | 1 | 2 | 3;
  plays: number;
  lastPlayedAt: string;
  /** Best run's parts, for the profile breakdown. */
  parts: { lesson: number; play: number; boss: number; noHints: number };
}

export interface ReviewCard {
  qid: string;
  levelId: number;
  /** Index into REVIEW_DAYS. */
  box: number;
  due: number;
  lapses: number;
  reviews: number;
}

export interface AnswerLog { qid: string; correct: boolean; sure: boolean }

export interface DesignAttempt { promptId: string; score: number; max: number; minutes: number; notes: string; at: string }
export interface SpeakAttempt { promptId: string; score: number; max: number; at: string }

export interface ProgressData {
  levels: Record<number, LevelRecord>;
  cards: Record<string, ReviewCard>;
  days: string[];
  reviewXp: number;
  estimation: { attempts: number; correct: number; bestRound: number };
  design: DesignAttempt[];
  speak: SpeakAttempt[];
  settings: { unlockAll: boolean };
}

interface ProgressActions {
  finishLevel: (levelId: number, run: { total: number; stars: 0 | 1 | 2 | 3; parts: LevelRecord['parts']; answers: AnswerLog[] }) => void;
  answerReview: (qid: string, correct: boolean, sure: boolean) => void;
  recordEstimationRound: (correct: number, total: number) => void;
  recordDesign: (a: DesignAttempt) => void;
  recordSpeak: (a: SpeakAttempt) => void;
  setUnlockAll: (on: boolean) => void;
  importData: (data: unknown) => boolean;
  reset: () => void;
}

export const emptyProgress = (): ProgressData => ({
  levels: {},
  cards: {},
  days: [],
  reviewXp: 0,
  estimation: { attempts: 0, correct: 0, bestRound: 0 },
  design: [],
  speak: [],
  settings: { unlockAll: false },
});

const withToday = (days: string[]) => {
  const today = dayKey();
  return days.includes(today) ? days : [...days, today].slice(-400);
};

/** Next box for a card: sure & right moves up, a guess stays, a miss starts over. */
export function nextBox(box: number, correct: boolean, sure: boolean): number {
  if (!correct) return 0;
  if (sure) return Math.min(REVIEW_DAYS.length - 1, box + 1);
  return box;
}

export const useProgress = create<ProgressData & ProgressActions>()(
  persist(
    (set) => ({
      ...emptyProgress(),
      finishLevel: (levelId, run) =>
        set((s) => {
          const prev = s.levels[levelId];
          const better = !prev || run.total >= prev.best;
          const now = Date.now();
          const cards = { ...s.cards };
          for (const a of run.answers) {
            const old = cards[a.qid];
            const box = old ? nextBox(old.box, a.correct, a.sure) : a.correct && a.sure ? 1 : 0;
            cards[a.qid] = {
              qid: a.qid, levelId, box,
              due: now + REVIEW_DAYS[box]! * DAY_MS,
              lapses: (old?.lapses ?? 0) + (a.correct ? 0 : 1),
              reviews: old?.reviews ?? 0,
            };
          }
          return {
            cards,
            days: withToday(s.days),
            levels: {
              ...s.levels,
              [levelId]: {
                best: Math.max(prev?.best ?? 0, run.total),
                stars: Math.max(prev?.stars ?? 0, run.stars) as LevelRecord['stars'],
                plays: (prev?.plays ?? 0) + 1,
                lastPlayedAt: new Date(now).toISOString(),
                parts: better ? run.parts : prev!.parts,
              },
            },
          };
        }),
      answerReview: (qid, correct, sure) =>
        set((s) => {
          const old = s.cards[qid];
          if (!old) return s;
          const box = nextBox(old.box, correct, sure);
          return {
            days: withToday(s.days),
            reviewXp: s.reviewXp + (correct ? 2 : 0),
            cards: { ...s.cards, [qid]: { ...old, box, due: Date.now() + REVIEW_DAYS[box]! * DAY_MS, lapses: old.lapses + (correct ? 0 : 1), reviews: old.reviews + 1 } },
          };
        }),
      recordEstimationRound: (correct, total) =>
        set((s) => ({
          days: withToday(s.days),
          estimation: { attempts: s.estimation.attempts + total, correct: s.estimation.correct + correct, bestRound: Math.max(s.estimation.bestRound, correct) },
        })),
      recordDesign: (a) => set((s) => ({ days: withToday(s.days), design: [...s.design, a].slice(-50) })),
      recordSpeak: (a) => set((s) => ({ days: withToday(s.days), speak: [...s.speak, a].slice(-100) })),
      setUnlockAll: (on) => set((s) => ({ settings: { ...s.settings, unlockAll: on } })),
      importData: (data) => {
        if (!data || typeof data !== 'object' || !('levels' in data) || !('cards' in data)) return false;
        set({ ...emptyProgress(), ...(data as Partial<ProgressData>) });
        return true;
      },
      reset: () => set(emptyProgress()),
    }),
    {
      name: 'salg-progress',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        levels: s.levels, cards: s.cards, days: s.days, reviewXp: s.reviewXp,
        estimation: s.estimation, design: s.design, speak: s.speak, settings: s.settings,
      }),
      // v1 (the pilot) only stored the traffic level as level 3; it is level 1 now.
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = (persisted as { levels?: Record<string, { bestScore?: number; stars?: number; plays?: number }> }).levels ?? {};
          const pilot = old['3'];
          const data = emptyProgress();
          if (pilot && pilot.plays) {
            data.levels[1] = { best: 0, stars: 0, plays: pilot.plays, lastPlayedAt: new Date().toISOString(), parts: { lesson: 0, play: 0, boss: 0, noHints: 0 } };
          }
          return data;
        }
        return persisted as ProgressData;
      },
    },
  ),
);

export function exportProgress(s: ProgressData): string {
  const { levels, cards, days, reviewXp, estimation, design, speak, settings } = s;
  return JSON.stringify({ app: 'system-analysis-learning-game', version: 2, exportedAt: new Date().toISOString(), levels, cards, days, reviewXp, estimation, design, speak, settings }, null, 2);
}
