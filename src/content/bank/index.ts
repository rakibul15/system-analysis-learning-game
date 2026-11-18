import type { Level, Question } from '@/content/schema';
import { banks, loadedLevels, questionsById } from '@/content/registry';
import { conceptOf } from '@/content/meta';
import { isDisabled } from '@/content/disabled';
import type { BankItem, Generator, LevelBank } from './types';

/*
 * Drawing questions from a level's bank. The bank and level must be loaded (load.ts);
 * which concept a question belongs to comes from meta.ts and is always known.
 */
export { banks };
export { conceptOf, conceptLabel } from '@/content/meta';

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
    // questions an admin turned off are left out, unless nothing else tests this concept
    const all = candidates(level, b, i);
    const live = all.filter((c) => !isDisabled(candId(c)));
    const cands = live.length ? live : all;
    const fresh = cands.filter((c) => c.kind === 'gen' || !seen.has(candId(c)));
    return candQ(pickOne(fresh.length ? fresh : cands, rand), rand);
  });
}

/**
 * For review: a different question on the same concept, so a remembered answer is not enough.
 * Falls back to the same question when the concept has nothing else.
 */
export function reviewVariant(qid: string, fallback: Question | undefined, rand: () => number = Math.random): Question | undefined {
  const c = conceptOf(qid);
  const level = c && loadedLevels[c.levelId], b = c && banks[c.levelId];
  if (!c || !level || !b) return fallback;
  const cands = candidates(level, b, c.index);
  const others = cands.filter((x) => (candId(x) !== qid || x.kind === 'gen') && !isDisabled(candId(x)));
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

/**
 * A question's text and every option it can show (right one first), for the statistics view.
 * Generated questions change their numbers, so they come back as one example. Needs the chapter loaded.
 */
export function questionInfo(qid: string): { prompt: string; options: string[]; generated: boolean } | null {
  const fixed = questionsById[qid]?.q;
  if (fixed) return { prompt: fixed.prompt, options: fixed.options, generated: false };
  const b = banks[Number(/^l(\d+)-/.exec(qid)?.[1])];
  const item = b?.items.find((i) => i.id === qid);
  if (item) return { prompt: item.prompt, options: [...item.options, ...(item.extra ?? [])], generated: false };
  const gen = b?.gens.find((g) => g.id === qid);
  if (gen) { const q = gen.make(() => 0.5); return { prompt: q.prompt, options: q.options, generated: true }; }
  return null;
}
