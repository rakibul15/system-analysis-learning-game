/** Pure helpers behind the simulators (tested in lib.test.ts). */

const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function toBase62(n: bigint): string {
  if (n === 0n) return '0';
  let s = '';
  while (n > 0n) { s = B62[Number(n % 62n)]! + s; n /= 62n; }
  return s;
}

/** Stable hash of a string to [0, 1). */
export function unitHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface RingPoint { at: number; server: string }

export function buildRing(servers: string[], vnodes: number): RingPoint[] {
  return servers.flatMap((s) => Array.from({ length: vnodes }, (_, v) => ({ at: unitHash(`${s}#${v}`), server: s }))).sort((a, b) => a.at - b.at);
}

/** Owner of a key on the ring: the first point clockwise from the key. */
export function ringOwner(ring: RingPoint[], keyAt: number): string {
  let lo = 0, hi = ring.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ring[mid]!.at < keyAt) lo = mid + 1; else hi = mid; }
  return (ring[lo] ?? ring[0]!).server;
}

export function assign(keys: number[], servers: string[], mode: 'ring' | 'modulo', vnodes: number): string[] {
  if (mode === 'modulo') return keys.map((k) => servers[Math.floor(k * 1e9) % servers.length]!);
  const ring = buildRing(servers, vnodes);
  return keys.map((k) => ringOwner(ring, k));
}

export function movedFraction(before: string[], after: string[]): number {
  let moved = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) moved++;
  return before.length ? moved / before.length : 0;
}

/** Coefficient of variation of keys per server (0 = perfectly even). */
export function imbalance(owners: string[], servers: string[]): number {
  const counts = servers.map((s) => owners.filter((o) => o === s).length);
  const mean = owners.length / servers.length;
  const sd = Math.sqrt(counts.reduce((s, c) => s + (c - mean) ** 2, 0) / servers.length);
  return mean ? sd / mean : 0;
}

/** Quorum: does every possible read set overlap every possible write set? */
export const strongQuorum = (n: number, w: number, r: number) => w + r > n;

/** Zipf-like popularity weights for k items. */
export function zipf(k: number, s = 1.1): number[] {
  const w = Array.from({ length: k }, (_, i) => 1 / (i + 1) ** s);
  const sum = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return w.map((x) => (acc += x / sum));
}
export function sampleCdf(cdf: number[], u: number): number {
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid]! < u) lo = mid + 1; else hi = mid; }
  return lo;
}

/** Geohash-like grid: precision → cells per side of the demo map and cell size in km. */
export const GRID = { 4: { cells: 2, km: 20 }, 5: { cells: 4, km: 5 }, 6: { cells: 8, km: 1.2 }, 7: { cells: 16, km: 0.15 } } as const;
