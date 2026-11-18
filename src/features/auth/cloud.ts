import type { ProgressData } from '@/entities/progress/store';
import { mergeProgress, normalize } from './merge';
import { assembleProgress, emptyPart, splitProgress, type Parts } from './parts';

/** The few Firestore operations sync needs, so the algorithm can be tested without Firebase. */
export interface CloudStore {
  /** users/{uid}: { v, revs, data? (the old single-document format) } */
  getSummary(): Promise<{ revs?: Record<string, string>; data?: unknown } | null>;
  /** users/{uid}/progress/{name} → its JSON, or null when missing. */
  getParts(names: string[]): Promise<Record<string, string | null>>;
  /** One atomic write: the changed parts, their new revs, and dropping the old format's blob. */
  commit(parts: Parts, revs: Record<string, string>, dropLegacy: boolean): Promise<void>;
}

/** What this tab last saw in the cloud, so unchanged parts are neither fetched nor written. */
export interface PartCache { revs: Record<string, string>; json: Parts }
export const newCache = (): PartCache => ({ revs: {}, json: {} });

let counter = 0;
const newRev = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${(counter++).toString(36)}`;

export interface SyncResult { merged: ProgressData; wrote: string[]; fetched: string[]; migrated: boolean }

/**
 * Pull what changed in the cloud, merge it with this device, and write back only the parts
 * that differ. With `overwrite`, the cloud is replaced by this device (after a reset).
 * Reads the old one-document format too, merges it in, and removes it once the parts are written.
 */
export async function syncParts(store: CloudStore, cache: PartCache, localIn: ProgressData, overwrite = false): Promise<SyncResult> {
  const local = normalize(localIn);
  const summary = await store.getSummary();
  const revs = summary?.revs && typeof summary.revs === 'object' ? summary.revs : {};
  let legacy: ProgressData | null = null;
  if (typeof summary?.data === 'string') {
    try { legacy = normalize(JSON.parse(summary.data)); } catch { legacy = null; }
  }

  // forget parts the cloud no longer lists (another device replaced everything)
  for (const k of Object.keys(cache.revs)) if (!(k in revs)) { delete cache.revs[k]; delete cache.json[k]; }

  let fetched: string[] = [];
  if (!overwrite) {
    fetched = Object.keys(revs).filter((k) => cache.revs[k] !== revs[k]);
    if (fetched.length) {
      const got = await store.getParts(fetched);
      for (const k of fetched) { cache.json[k] = got[k] ?? emptyPart(k) ?? 'null'; cache.revs[k] = revs[k]!; }
    }
  }

  const inCloud = Object.keys(revs);
  const fromParts = !overwrite && inCloud.length ? assembleProgress(Object.fromEntries(inCloud.map((k) => [k, cache.json[k] ?? 'null']))) : null;
  const cloud = overwrite ? null : fromParts && legacy ? mergeProgress(fromParts, legacy) : (fromParts ?? legacy);
  const merged = cloud ? mergeProgress(local, cloud) : local;

  const next = splitProgress(merged);
  const changed: Parts = {};
  for (const k of new Set([...Object.keys(next), ...inCloud])) {
    const json = next[k] ?? emptyPart(k);
    if (json === null) continue;
    // trust the cached copy only if it is the version the cloud lists now
    const known = k in revs && cache.revs[k] === revs[k] ? cache.json[k] : undefined;
    if (known === json) continue;
    // nothing to say about a part the cloud has never had and that is still empty
    if (known === undefined && !(k in revs) && json === emptyPart(k)) continue;
    changed[k] = json;
  }

  const wrote = Object.keys(changed);
  if (wrote.length || legacy) {
    const newRevs = Object.fromEntries(wrote.map((k) => [k, newRev()]));
    await store.commit(changed, newRevs, !!legacy);
    for (const k of wrote) { cache.json[k] = changed[k]!; cache.revs[k] = newRevs[k]!; }
  }
  return { merged, wrote, fetched, migrated: !!legacy };
}
