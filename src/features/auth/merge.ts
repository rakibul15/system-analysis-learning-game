import { emptyProgress, type LevelRecord, type ProgressData, type ReadingRecord, type RebuildRecord, type ReviewCard } from '@/entities/progress/store';

/** Keep only the saved fields, filling anything missing with defaults. */
export function normalize(data: unknown): ProgressData {
  const d = (data && typeof data === 'object' ? data : {}) as Partial<ProgressData>;
  const e = emptyProgress();
  return {
    levels: d.levels ?? e.levels,
    cards: d.cards ?? e.cards,
    days: Array.isArray(d.days) ? d.days : e.days,
    reviewXp: typeof d.reviewXp === 'number' ? d.reviewXp : 0,
    estimation: { ...e.estimation, ...d.estimation },
    design: Array.isArray(d.design) ? d.design : [],
    speak: Array.isArray(d.speak) ? d.speak : [],
    incidents: d.incidents ?? {},
    builds: d.builds ?? {},
    rebuilds: d.rebuilds ?? {},
    reading: d.reading ?? {},
    settings: { ...e.settings, ...d.settings },
  };
}

const maxMap = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

/** Union of two attempt logs, one entry per (time, prompt), oldest first. */
const byAt = <T extends { at: string; promptId: string }>(a: T[], b: T[], limit: number) => {
  const seen = new Map<string, T>();
  for (const x of [...a, ...b]) seen.set(`${x.at}|${x.promptId}`, x);
  return [...seen.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-limit);
};

/**
 * Merge two progress snapshots (this device and the cloud) without losing work:
 * the better level result, the more-reviewed card, every day played, and the
 * larger counters win. Order does not matter: merge(a, b) equals merge(b, a).
 */
export function mergeProgress(aIn: unknown, bIn: unknown): ProgressData {
  const a = normalize(aIn), b = normalize(bIn);

  const levels: Record<number, LevelRecord> = { ...a.levels };
  for (const [k, lb] of Object.entries(b.levels)) {
    const id = Number(k);
    const la = levels[id];
    if (!la) { levels[id] = lb; continue; }
    const winner = lb.best > la.best || (lb.best === la.best && lb.lastPlayedAt > la.lastPlayedAt) ? lb : la;
    levels[id] = {
      best: Math.max(la.best, lb.best),
      stars: Math.max(la.stars, lb.stars) as LevelRecord['stars'],
      plays: Math.max(la.plays, lb.plays),
      lastPlayedAt: la.lastPlayedAt > lb.lastPlayedAt ? la.lastPlayedAt : lb.lastPlayedAt,
      parts: winner.parts,
    };
  }

  const cards: Record<string, ReviewCard> = { ...a.cards };
  for (const [k, cb] of Object.entries(b.cards)) {
    const ca = cards[k];
    if (!ca) { cards[k] = cb; continue; }
    const score = (c: ReviewCard) => c.reviews * 1e15 + c.lapses * 1e13 + c.due;
    cards[k] = score(cb) > score(ca) ? cb : ca;
  }

  const rebuilds: Record<string, RebuildRecord> = { ...a.rebuilds };
  for (const [k, rb] of Object.entries(b.rebuilds)) {
    const ra = rebuilds[k];
    if (!ra) { rebuilds[k] = rb; continue; }
    const pick = rb.attempts > ra.attempts || (rb.attempts === ra.attempts && rb.due > ra.due) ? rb : ra;
    rebuilds[k] = { ...pick, best: Math.max(ra.best, rb.best) };
  }

  const reading: Record<string, ReadingRecord> = { ...a.reading };
  for (const [k, rb] of Object.entries(b.reading)) {
    const ra = reading[k];
    reading[k] = !ra || rb.updatedAt > ra.updatedAt ? rb : ra;
  }

  return {
    levels,
    cards,
    days: [...new Set([...a.days, ...b.days])].sort().slice(-400),
    reviewXp: Math.max(a.reviewXp, b.reviewXp),
    estimation: {
      attempts: Math.max(a.estimation.attempts, b.estimation.attempts),
      correct: Math.max(a.estimation.correct, b.estimation.correct),
      bestRound: Math.max(a.estimation.bestRound, b.estimation.bestRound),
    },
    design: byAt(a.design, b.design, 50),
    speak: byAt(a.speak, b.speak, 100),
    incidents: maxMap(a.incidents, b.incidents),
    builds: maxMap(a.builds, b.builds),
    rebuilds,
    reading,
    settings: { ...b.settings, ...a.settings },
  };
}

/** True when the merged result carries nothing new compared to `base`. */
export const sameProgress = (x: ProgressData, y: ProgressData) => JSON.stringify(normalize(x)) === JSON.stringify(normalize(y));
