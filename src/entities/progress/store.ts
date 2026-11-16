import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LevelResult {
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  plays: number;
  /** Set once the auto round has been watched to the end. */
  completed: boolean;
  lastPlayedAt: string;
}

interface ProgressState {
  levels: Record<number, LevelResult>;
  recordManualRound: (levelId: number, score: number, stars: 0 | 1 | 2 | 3) => void;
  markCompleted: (levelId: number) => void;
  reset: () => void;
}

const empty = (): LevelResult => ({ bestScore: 0, stars: 0, plays: 0, completed: false, lastPlayedAt: '' });

/**
 * Progress lives in the browser (localStorage) for now. `version` and `migrate`
 * let the shape change later without losing anyone's progress.
 */
export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      levels: {},
      recordManualRound: (levelId, score, stars) =>
        set((s) => {
          const prev = s.levels[levelId] ?? empty();
          return {
            levels: {
              ...s.levels,
              [levelId]: {
                ...prev,
                bestScore: Math.max(prev.bestScore, score),
                stars: Math.max(prev.stars, stars) as LevelResult['stars'],
                plays: prev.plays + 1,
                lastPlayedAt: new Date().toISOString(),
              },
            },
          };
        }),
      markCompleted: (levelId) =>
        set((s) => ({ levels: { ...s.levels, [levelId]: { ...(s.levels[levelId] ?? empty()), completed: true } } })),
      reset: () => set({ levels: {} }),
    }),
    {
      name: 'salg-progress',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => persisted as ProgressState,
    },
  ),
);

export const totalXp = (levels: Record<number, LevelResult>) =>
  Object.values(levels).reduce((sum, l) => sum + l.bestScore, 0);
