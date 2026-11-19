import { isEn } from '@/shared/lib/i18n';
import type { Level } from './schema';
import type { LevelBank } from './bank/types';
import { levelMeta } from './meta';
import { loadedLevels, register } from './registry';

/*
 * Each chapter's lessons, missions and question bank is its own download, fetched the
 * first time a level of that chapter (or a review card from it) is opened. Only the
 * current language's lessons are fetched. The app opens without waiting for them; the
 * offline cache (service worker) still fetches every chunk in the background afterwards,
 * so the whole game keeps working offline.
 */

type LevelModule = Record<string, unknown>;
const bn: Record<number, () => Promise<LevelModule>> = {
  1: () => import('./levels/ch1'), 2: () => import('./levels/ch2'), 3: () => import('./levels/ch3'),
  4: () => import('./levels/ch4'), 5: () => import('./levels/ch5'), 6: () => import('./levels/ch6'),
  7: () => import('./levels/ch7'),
};
const en: Record<number, () => Promise<LevelModule>> = {
  1: () => import('./levels/en/ch1'), 2: () => import('./levels/en/ch2'), 3: () => import('./levels/en/ch3'),
  4: () => import('./levels/en/ch4'), 5: () => import('./levels/en/ch5'), 6: () => import('./levels/en/ch6'),
  7: () => import('./levels/en/ch7'),
};
const bank: Record<number, () => Promise<Record<number, LevelBank>>> = {
  1: () => import('./bank/ch1').then((m) => m.ch1Bank), 2: () => import('./bank/ch2').then((m) => m.ch2Bank),
  3: () => import('./bank/ch3').then((m) => m.ch3Bank), 4: () => import('./bank/ch4').then((m) => m.ch4Bank),
  5: () => import('./bank/ch5').then((m) => m.ch5Bank), 6: () => import('./bank/ch6').then((m) => m.ch6Bank),
  7: () => Promise.all([import('./bank/ch7'), import('./bank/ch7ddia')]).then(([a, b]) => ({ ...a.ch7Bank, ...b.ch7ddiaBank })),
};

const isLevel = (v: unknown): v is Level => typeof v === 'object' && v !== null && 'steps' in v && 'boss' in v;

const inflight = new Map<number, Promise<void>>();
const done = new Set<number>();
const banksDone = new Set<number>();
const banksInflight = new Map<number, Promise<void>>();

export const chapterLoaded = (ch: number) => done.has(ch);
export const bankLoaded = (ch: number) => banksDone.has(ch);

/** Only a chapter's question bank, without its lessons (the placement test needs no more). */
export function loadBank(ch: number): Promise<void> {
  if (banksDone.has(ch)) return Promise.resolve();
  const questions = bank[ch];
  if (!questions) return Promise.reject(new Error(`no chapter ${ch}`));
  let p = banksInflight.get(ch);
  if (!p) {
    p = questions().then((levelBanks) => { register([], levelBanks); banksDone.add(ch); });
    p.catch(() => banksInflight.delete(ch));
    banksInflight.set(ch, p);
  }
  return p;
}

/** Fetches one chapter's content once; later calls share the same promise. A failed fetch can be retried. */
export function loadChapter(ch: number): Promise<void> {
  if (done.has(ch)) return Promise.resolve();
  const lessons = (isEn ? en : bn)[ch];
  const questions = bank[ch];
  if (!lessons || !questions) return Promise.reject(new Error(`no chapter ${ch}`));
  let p = inflight.get(ch);
  if (!p) {
    p = Promise.all([lessons(), questions()]).then(async ([mod, levelBanks]) => {
      const levels = Object.values(mod).filter(isLevel).sort((a, b) => a.id - b.id);
      if (import.meta.env.DEV) {
        // content is checked by the tests; in development also check it as it loads
        const { levelSchema } = await import('./schema');
        for (const l of levels) levelSchema.parse(l);
      }
      register(levels, levelBanks);
      done.add(ch);
      banksDone.add(ch);
    });
    p.catch(() => inflight.delete(ch));
    inflight.set(ch, p);
  }
  return p;
}

/** The full level, fetching its chapter if needed; undefined for an unknown id. */
export async function loadLevel(id: number): Promise<Level | undefined> {
  const m = levelMeta[id];
  if (!m) return undefined;
  await loadChapter(m.chapter);
  return loadedLevels[id];
}

/** The full level if its chapter is already loaded. */
export const getLevel = (id: number): Level | undefined => loadedLevels[id];
