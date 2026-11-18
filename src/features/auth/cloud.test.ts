import { describe, expect, it } from 'vitest';
import { emptyProgress, type ProgressData, type ReviewCard } from '@/entities/progress/store';
import { newCache, syncParts, type CloudStore } from './cloud';
import { assembleProgress, splitProgress } from './parts';

/** An in-memory stand-in for users/{uid} and its progress parts. */
class FakeCloud implements CloudStore {
  summary: { v?: number; revs?: Record<string, string>; data?: string } | null = null;
  parts: Record<string, string> = {};
  reads = 0;
  writes: string[][] = [];
  async getSummary() { return this.summary ? structuredClone(this.summary) : null; }
  async getParts(names: string[]) { this.reads += names.length; return Object.fromEntries(names.map((n) => [n, this.parts[n] ?? null])); }
  async commit(parts: Record<string, string>, revs: Record<string, string>, dropLegacy: boolean) {
    Object.assign(this.parts, parts);
    const s = this.summary ?? {};
    this.summary = { ...s, v: 4, revs: { ...s.revs, ...revs } };
    if (dropLegacy) delete this.summary.data;
    this.writes.push(Object.keys(parts).sort());
  }
  /** What an app version from before parts would write: the whole progress, replacing the document. */
  oldClientWrite(p: ProgressData) { this.summary = { data: JSON.stringify(p) }; }
}

const card = (qid: string, levelId: number, box = 0, reviews = 0): ReviewCard => ({ qid, levelId, box, due: 1000 + box, lapses: 0, reviews });
const lvl = (best: number) => ({ best, stars: 2 as const, plays: 1, lastPlayedAt: '2026-11-01', parts: { lesson: 10, play: 10, boss: 10, noHints: 0 } });
const prog = (over: Partial<ProgressData>): ProgressData => ({ ...emptyProgress(), ...over });

describe('progress parts', () => {
  it('split and assemble give the same progress back', () => {
    const p = prog({ levels: { 1: lvl(80) }, cards: { 'l1-b1': card('l1-b1', 1), 'l9-b2': card('l9-b2', 9) }, days: ['2026-11-01'], reviewXp: 4, incidents: { db: 0.5 } });
    const parts = splitProgress(p);
    expect(Object.keys(parts).sort()).toEqual(['activity', 'cards-1', 'cards-3', 'levels', 'practice', 'reading', 'settings']);
    expect(assembleProgress(parts)).toEqual(p);
  });
});

describe('syncParts', () => {
  it('first sync writes the parts; a sync with no change reads one small document and writes nothing', async () => {
    const cloud = new FakeCloud();
    const cache = newCache();
    const p = prog({ levels: { 1: lvl(80) }, cards: { 'l1-b1': card('l1-b1', 1) } });
    await syncParts(cloud, cache, p);
    expect(cloud.writes).toEqual([['activity', 'cards-1', 'levels', 'practice', 'reading', 'settings']]);
    const again = await syncParts(cloud, cache, p);
    expect(again.wrote).toEqual([]);
    expect(again.fetched).toEqual([]);
    expect(cloud.writes).toHaveLength(1);
  });

  it('a new review card writes only its chapter', async () => {
    const cloud = new FakeCloud();
    const cache = newCache();
    const p = prog({ cards: { 'l1-b1': card('l1-b1', 1) } });
    await syncParts(cloud, cache, p);
    const r = await syncParts(cloud, cache, { ...p, cards: { ...p.cards, 'l20-b1': card('l20-b1', 20) } });
    expect(r.wrote).toEqual(['cards-4']);
  });

  it('two devices syncing in turns end up with everything from both', async () => {
    const cloud = new FakeCloud();
    const phone = { cache: newCache(), p: prog({ levels: { 1: lvl(60) }, cards: { 'l1-b1': card('l1-b1', 1, 2, 3) } }) };
    const laptop = { cache: newCache(), p: prog({ levels: { 1: lvl(90), 2: lvl(70) }, cards: { 'l1-b1': card('l1-b1', 1, 1, 1), 'l5-b1': card('l5-b1', 5) } }) };
    phone.p = (await syncParts(cloud, phone.cache, phone.p)).merged;
    laptop.p = (await syncParts(cloud, laptop.cache, laptop.p)).merged;
    const r = await syncParts(cloud, phone.cache, phone.p);
    phone.p = r.merged;
    // the laptop changed levels and added chapter 2's card; chapter 1's card was already the phone's
    expect(r.fetched.sort()).toEqual(['cards-2', 'levels']);
    expect(phone.p.levels[1]!.best).toBe(90);
    expect(phone.p.levels[2]!.best).toBe(70);
    expect(phone.p.cards['l1-b1']!.reviews).toBe(3); // the more-reviewed card wins
    expect(Object.keys(phone.p.cards).sort()).toEqual(['l1-b1', 'l5-b1']);
    expect(assembleProgress(cloud.parts)).toEqual(phone.p);
    expect(laptop.p.levels[2]).toBeTruthy();
  });

  it('moves the old one-document progress into parts without losing anything', async () => {
    const cloud = new FakeCloud();
    const old = prog({ levels: { 3: lvl(75) }, cards: { 'l3-b1': card('l3-b1', 3) }, reading: { '1': { status: 2, notes: 'mine', updatedAt: '2026-10-01' } } });
    cloud.oldClientWrite(old);
    const here = prog({ levels: { 1: lvl(50) } });
    const r = await syncParts(cloud, newCache(), here);
    expect(r.migrated).toBe(true);
    expect(cloud.summary?.data).toBeUndefined();
    expect(cloud.summary?.v).toBe(4);
    const inCloud = assembleProgress(cloud.parts);
    expect(inCloud.levels[3]!.best).toBe(75);
    expect(inCloud.levels[1]!.best).toBe(50);
    expect(inCloud.reading['1']!.notes).toBe('mine');
    expect(r.merged).toEqual(inCloud);
  });

  it('an old app version writing the whole document again is merged back in', async () => {
    const cloud = new FakeCloud();
    const cache = newCache();
    const p = prog({ levels: { 1: lvl(50) }, cards: { 'l1-b1': card('l1-b1', 1) } });
    await syncParts(cloud, cache, p);
    // a phone still running the old version saves its own progress, replacing the summary
    cloud.oldClientWrite(prog({ levels: { 2: lvl(66) } }));
    const r = await syncParts(cloud, cache, p);
    expect(r.migrated).toBe(true);
    expect(r.merged.levels[1]!.best).toBe(50);
    expect(r.merged.levels[2]!.best).toBe(66);
    expect(r.merged.cards['l1-b1']).toBeTruthy();
    expect(assembleProgress(cloud.parts)).toEqual(r.merged);
    expect(cloud.summary?.data).toBeUndefined();
  });

  it('parts written by another device survive an old app version replacing the summary', async () => {
    const cloud = new FakeCloud();
    // the laptop (new version) saves a level in parts
    await syncParts(cloud, newCache(), prog({ levels: { 4: lvl(88) } }));
    // a phone on the old version finds no blob and saves its own progress as one document
    cloud.oldClientWrite(prog({ levels: { 2: lvl(66) } }));
    // a fresh tablet on the new version syncs: it must not overwrite the laptop's level unseen
    const r = await syncParts(cloud, newCache(), prog({ levels: { 1: lvl(50) } }));
    expect(Object.keys(r.merged.levels).sort()).toEqual(['1', '2', '4']);
    expect(assembleProgress(cloud.parts).levels[4]!.best).toBe(88);
  });

  it('overwrite after a reset empties the cloud, including card parts no longer present', async () => {
    const cloud = new FakeCloud();
    const cache = newCache();
    await syncParts(cloud, cache, prog({ levels: { 1: lvl(80) }, cards: { 'l9-b1': card('l9-b1', 9) } }));
    // a different tab, with nothing cached, resets
    const r = await syncParts(cloud, newCache(), emptyProgress(), true);
    expect(r.wrote).toContain('cards-3');
    expect(r.wrote).toContain('levels');
    expect(assembleProgress(cloud.parts)).toEqual(emptyProgress());
    // and the first tab, on its next sync, picks up the reset instead of re-uploading
    const back = await syncParts(cloud, cache, emptyProgress());
    expect(back.merged).toEqual(emptyProgress());
  });

  it('a failed write leaves the cache alone, so the next sync tries again', async () => {
    const cloud = new FakeCloud();
    const cache = newCache();
    const p = prog({ levels: { 1: lvl(80) } });
    const commit = cloud.commit.bind(cloud);
    cloud.commit = async () => { throw new Error('offline'); };
    await expect(syncParts(cloud, cache, p)).rejects.toThrow('offline');
    cloud.commit = commit;
    const r = await syncParts(cloud, cache, p);
    expect(r.wrote).toContain('levels');
  });
});
