/**
 * Marking rules from the plan.
 *  - Confidence: sure + right 100%, guess + right 60%, guess + wrong 0, sure + wrong −25%.
 *  - A level is 100: lesson checkpoints 10, play 25, boss 55, no hints 10.
 */

export const LEVEL_PARTS = { lesson: 10, play: 25, boss: 55, noHints: 10 } as const;
export const CHECKPOINT_POINTS = LEVEL_PARTS.lesson / 2;
export const MISSION_POINTS = LEVEL_PARTS.play / 3;
export const BOSS_POINTS = LEVEL_PARTS.boss / 5;

/** Points for a level to count as passed (opens the next level). */
export const PASS_MARK = 50;
/** Points needed on a chapter's last level to open the next chapter. */
export const CHAPTER_GATE = 70;

export function confidenceFactor(correct: boolean, sure: boolean): number {
  if (correct) return sure ? 1 : 0.6;
  return sure ? -0.25 : 0;
}

export function starsForTotal(total: number): 0 | 1 | 2 | 3 {
  if (total >= 90) return 3;
  if (total >= 70) return 2;
  if (total >= PASS_MARK) return 1;
  return 0;
}

/** Traffic play: stars from the round map to play points. */
export const trafficPlayPoints = (stars: 0 | 1 | 2 | 3) => [0, 10, 18, 25][stars]!;

export type Mastery = 'none' | 'seen' | 'understood' | 'skilled' | 'solid';
export const masteryLabel: Record<Mastery, string> = {
  none: 'শুরু হয়নি', seen: 'দেখেছি', understood: 'বুঝেছি', skilled: 'দক্ষ', solid: 'পাকা',
};

/** Spaced repetition boxes: next review after 1, 3, 7, 16, 35 days. */
export const REVIEW_DAYS = [1, 3, 7, 16, 35] as const;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic shuffle so a question's options stay in the same order on re-render. */
export function shuffledOrder(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
