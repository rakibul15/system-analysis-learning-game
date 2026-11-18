import { bankGenQuestion, bankItemQuestion } from '@/content/bank';
import { isDisabled } from '@/content/disabled';
import { banks } from '@/content/registry';
import type { Question } from '@/content/schema';

export interface Picked { q: Question; levelId: number; generated: boolean }

const pickOne = <T,>(xs: T[], rand: () => number) => xs[Math.floor(rand() * xs.length)]!;
const shuffled = <T,>(xs: T[], rand: () => number) => xs.map((x) => ({ x, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.x);

/**
 * One placement question from a chapter (its banks must be loaded): from a level not asked
 * yet in this test when possible, a written question the learner has not seen before when
 * possible, never one an admin turned off, and a generated (numbers-change) one only when
 * `allowGen` and by chance, so the test stays mostly about ideas rather than arithmetic.
 */
export function pickQuestion(levels: number[], ctx: { used: Set<string>; usedLevels: Set<number>; seen: Set<string>; allowGen: boolean; rand: () => number }): Picked | null {
  const withBank = levels.filter((l) => banks[l]);
  const fresh = withBank.filter((l) => !ctx.usedLevels.has(l));
  for (const levelId of shuffled(fresh.length ? fresh : withBank, ctx.rand)) {
    const b = banks[levelId]!;
    const items = b.items.filter((i) => !isDisabled(i.id) && !ctx.used.has(i.id));
    const unseen = items.filter((i) => !ctx.seen.has(i.id));
    const gens = ctx.allowGen ? b.gens.filter((g) => !isDisabled(g.id) && !ctx.used.has(g.id)) : [];
    if (gens.length && (!items.length || ctx.rand() < 0.15)) return { q: bankGenQuestion(pickOne(gens, ctx.rand), ctx.rand), levelId, generated: true };
    if (items.length) return { q: bankItemQuestion(pickOne(unseen.length ? unseen : items, ctx.rand), ctx.rand), levelId, generated: false };
  }
  return null;
}
