import type { Level, Question } from '@/content/schema';
import { levelsById } from '@/content/levels';
import { ch1Bank } from './ch1';
import { ch2Bank } from './ch2';
import { ch3Bank } from './ch3';
import { ch4Bank } from './ch4';
import { ch5Bank } from './ch5';
import { ch6Bank } from './ch6';
import type { BankItem, Generator, LevelBank } from './types';

/** Question banks by level. Levels without a bank keep their fixed five boss questions. */
export const banks: Record<number, LevelBank> = { ...ch1Bank, ...ch2Bank, ...ch3Bank, ...ch4Bank, ...ch5Bank, ...ch6Bank };

type Cand = { kind: 'fixed'; q: Question } | { kind: 'item'; item: BankItem } | { kind: 'gen'; gen: Generator };

const itemQ = (it: BankItem, rand: () => number): Question => {
  const [right, ...wrong] = it.options;
  const pool = [...wrong, ...(it.extra ?? [])];
  // rotate in extra wrong options so the same distractors do not always appear
  const chosen = pool.map((w) => ({ w, k: rand() })).sort((a, b) => a.k - b.k).slice(0, Math.min(3, pool.length)).map((x) => x.w);
  return { id: it.id, prompt: it.prompt, options: [right!, ...chosen], explain: it.explain };
};
const genQ = (g: Generator, rand: () => number): Question => ({ id: g.id, ...g.make(rand) });
const candQ = (c: Cand, rand: () => number): Question => (c.kind === 'fixed' ? c.q : c.kind === 'item' ? itemQ(c.item, rand) : genQ(c.gen, rand));
const candId = (c: Cand) => (c.kind === 'fixed' ? c.q.id : c.kind === 'item' ? c.item.id : c.gen.id);

/** Every question for one concept of a level: the original boss question, the written ones, the generators. */
function candidates(level: Level, b: LevelBank, conceptIndex: number): Cand[] {
  const concept = b.concepts[conceptIndex]!.id;
  const fixed = level.boss[conceptIndex];
  return [
    ...(fixed ? [{ kind: 'fixed', q: fixed } as Cand] : []),
    ...b.items.filter((i) => i.concept === concept).map((item) => ({ kind: 'item', item }) as Cand),
    ...b.gens.filter((g) => g.concept === concept).map((gen) => ({ kind: 'gen', gen }) as Cand),
  ];
}

const pickOne = <T,>(xs: T[], rand: () => number) => xs[Math.floor(rand() * xs.length)]!;

/**
 * The five boss questions for this attempt: one per concept, so every idea is tested,
 * but a different question each time. Questions never answered before come first.
 */
export function drawBoss(level: Level, seen: Set<string>, rand: () => number = Math.random): Question[] {
  const b = banks[level.id];
  if (!b) return level.boss;
  return b.concepts.map((_, i) => {
    const cands = candidates(level, b, i);
    const fresh = cands.filter((c) => c.kind === 'gen' || !seen.has(candId(c)));
    return candQ(pickOne(fresh.length ? fresh : cands, rand), rand);
  });
}

/** Which level and concept a question id belongs to. */
export function conceptOf(qid: string): { levelId: number; index: number } | null {
  const levelId = Number(/^l(\d+)-/.exec(qid)?.[1]);
  const b = banks[levelId], level = levelsById[levelId];
  if (!b || !level) return null;
  const boss = level.boss.findIndex((q) => q.id === qid);
  if (boss >= 0) return { levelId, index: boss };
  const concept = b.items.find((i) => i.id === qid)?.concept ?? b.gens.find((g) => g.id === qid)?.concept;
  const index = b.concepts.findIndex((c) => c.id === concept);
  return index >= 0 ? { levelId, index } : null;
}

export const conceptLabel = (qid: string) => {
  const c = conceptOf(qid);
  return c ? banks[c.levelId]!.concepts[c.index]!.label : null;
};

/**
 * For review: a different question on the same concept, so a remembered answer is not enough.
 * Falls back to the same question when the concept has nothing else.
 */
export function reviewVariant(qid: string, fallback: Question | undefined, rand: () => number = Math.random): Question | undefined {
  const c = conceptOf(qid);
  if (!c) return fallback;
  const level = levelsById[c.levelId]!;
  const cands = candidates(level, banks[c.levelId]!, c.index);
  const others = cands.filter((x) => candId(x) !== qid || x.kind === 'gen');
  return others.length ? candQ(pickOne(others, rand), rand) : fallback;
}

/** All written and generated question ids, for looking up review cards. */
export function bankQuestion(qid: string, rand: () => number = Math.random): Question | undefined {
  const levelId = Number(/^l(\d+)-/.exec(qid)?.[1]);
  const b = banks[levelId];
  if (!b) return undefined;
  const item = b.items.find((i) => i.id === qid);
  if (item) return itemQ(item, rand);
  const gen = b.gens.find((g) => g.id === qid);
  return gen ? genQ(gen, rand) : undefined;
}
