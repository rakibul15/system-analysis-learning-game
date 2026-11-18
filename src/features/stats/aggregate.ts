import type { AnswerEvent, Where } from '@/shared/lib/outbox';

/** Everyone's answers to one question. */
export interface QStat {
  qid: string;
  n: number;
  right: number;
  /** Answered "sure". */
  sure: number;
  /** Sure, and wrong: the answers that point at a misleading question or a real misconception. */
  sureWrong: number;
  /** Option key → how often it was picked. */
  picks: Record<string, number>;
  where: Partial<Record<Where, number>>;
  /** Answers to an earlier wording of the question, left out of the numbers above. */
  older: number;
}

/**
 * Everyone's answers, per question. With `version`, answers to an earlier wording (a different
 * prompt key) are only counted in `older`, so a fixed question starts with clean numbers.
 * Answers logged without a version key cannot be told apart and count as current.
 */
export function aggregate(batches: { lang: string; items: AnswerEvent[] }[], onlyLang?: string, version?: (qid: string) => string | undefined): QStat[] {
  const by = new Map<string, QStat>();
  for (const b of batches) {
    if (onlyLang && b.lang !== onlyLang) continue;
    for (const a of b.items) {
      if (!a || typeof a.q !== 'string') continue;
      const s = by.get(a.q) ?? { qid: a.q, n: 0, right: 0, sure: 0, sureWrong: 0, picks: {}, where: {}, older: 0 };
      by.set(a.q, s);
      const now = version?.(a.q);
      if (now && a.p && a.p !== now) { s.older += 1; continue; }
      s.n += 1;
      s.right += a.c ? 1 : 0;
      s.sure += a.s ? 1 : 0;
      s.sureWrong += a.s && !a.c ? 1 : 0;
      if (a.o) s.picks[a.o] = (s.picks[a.o] ?? 0) + 1;
      if (a.w) s.where[a.w] = (s.where[a.w] ?? 0) + 1;
    }
  }
  return [...by.values()];
}

export type Flag = 'easy' | 'hard' | 'sure-wrong' | 'one-trap' | 'dead-option';
/** Below this many answers a question is not judged. */
export const MIN_ANSWERS = 20;

/**
 * What may be wrong with a question, from its answers:
 * nearly everyone right (too easy), most wrong (too hard or a wrong key), many sure-but-wrong,
 * one distractor drawing almost all wrong answers (maybe also right), a distractor nobody picks.
 */
export function flagsFor(s: QStat, keys?: { right: string; wrong: string[] }): Flag[] {
  if (s.n < MIN_ANSWERS || !s.n) return [];
  const out: Flag[] = [];
  const rate = s.right / s.n;
  if (rate >= 0.95) out.push('easy');
  if (rate < 0.35) out.push('hard');
  if (s.sureWrong / s.n >= 0.25) out.push('sure-wrong');
  if (keys) {
    const wrongPicks = keys.wrong.map((k) => s.picks[k] ?? 0);
    const totalWrong = s.n - s.right;
    if (totalWrong >= 10 && Math.max(...wrongPicks) >= 0.7 * totalWrong) out.push('one-trap');
    if (s.n >= 40 && wrongPicks.some((x) => x === 0)) out.push('dead-option');
  }
  return out;
}
