import { singlePoints } from './chaos';
import { count, linked, type Graph, type PartKind } from './model';

/** Rough monthly price and requests a second one instance can take. Round numbers, for reasoning, not for a bill. */
export const SPEC: Record<PartKind, { cost: number; cap: number }> = {
  client: { cost: 0, cap: Infinity },
  cdn: { cost: 200, cap: Infinity },
  limiter: { cost: 40, cap: 20000 },
  lb: { cost: 25, cap: 50000 },
  api: { cost: 80, cap: 2000 },
  ws: { cost: 80, cap: 2000 },
  cache: { cost: 120, cap: 50000 },
  queue: { cost: 60, cap: 20000 },
  worker: { cost: 60, cap: 1000 },
  db: { cost: 400, cap: 3000 },
  replica: { cost: 300, cap: 5000 },
  store: { cost: 50, cap: Infinity },
  provider: { cost: 0, cap: Infinity },
};

/** Traffic and service-level targets for a challenge. */
export interface Sla { rps: number; readShare: number; p99: number; avail: number; budget: number }

export const slaByChallenge: Record<string, Sla> = {
  scale: { rps: 6000, readShare: 0.7, p99: 300, avail: 99.9, budget: 1500 },
  readheavy: { rps: 8000, readShare: 0.95, p99: 250, avail: 99.9, budget: 1800 },
  ratelimit: { rps: 4000, readShare: 0.6, p99: 200, avail: 99.9, budget: 1500 },
  notify: { rps: 2000, readShare: 0, p99: 300, avail: 99.9, budget: 1400 },
  chat: { rps: 4000, readShare: 0.5, p99: 300, avail: 99.9, budget: 1300 },
  events: { rps: 2000, readShare: 0.2, p99: 300, avail: 99.9, budget: 1400 },
};

const SYNC: PartKind[] = ['lb', 'limiter', 'api', 'ws', 'cache', 'db', 'replica'];
const CACHE_MISS = 0.1;

export interface TierLoad { kind: PartKind; count: number; load: number; util: number }
export interface CapacityReport {
  cost: number;
  tiers: TierLoad[];
  bottleneck: TierLoad | null;
  overloaded: boolean;
  p99: number;
  avail: number;
  spofs: number;
  checks: { cost: boolean; p99: boolean; avail: boolean; capacity: boolean };
  met: boolean;
}

/** Monthly cost, load on each tier, estimated p99 and availability for a design under a challenge's traffic. */
export function capacityReport(g: Graph, challengeId: string, sla: Sla): CapacityReport {
  const R = sla.rps * sla.readShare, W = sla.rps - R;
  const has = (k: PartKind) => count(g, k) > 0;
  const cached = has('cache') && (linked(g, 'api', 'cache') || linked(g, 'ws', 'cache') || linked(g, 'limiter', 'cache'));
  const dbReads = cached ? R * CACHE_MISS : R;
  const replicaTakesReads = has('replica') && (linked(g, 'api', 'replica') || linked(g, 'ws', 'replica'));

  const load: Partial<Record<PartKind, number>> = {
    lb: sla.rps,
    limiter: sla.rps,
    api: has('api') ? sla.rps : 0,
    ws: has('ws') ? sla.rps : 0,
    cache: cached ? (has('limiter') ? sla.rps : R) : 0,
    db: W + (replicaTakesReads ? 0 : dbReads),
    replica: replicaTakesReads ? dbReads : 0,
    worker: has('queue') ? W : 0,
    queue: has('queue') ? W : 0,
  };

  const tiers: TierLoad[] = (Object.keys(load) as PartKind[])
    .filter((k) => has(k) && (load[k] ?? 0) > 0)
    .map((k) => { const n = count(g, k); const l = load[k]!; return { kind: k, count: n, load: l, util: l / (n * SPEC[k].cap) }; });

  const sync = tiers.filter((t) => SYNC.includes(t.kind));
  const bottleneck = [...tiers].sort((a, b) => b.util - a.util)[0] ?? null;
  const overloaded = tiers.some((t) => t.util >= 1);
  const maxU = Math.max(0, ...sync.map((t) => t.util));
  const base = cached ? 60 : sla.readShare > 0.5 ? 150 : 80;
  const p99 = maxU >= 1 ? 5000 : Math.round(base / (1 - Math.min(maxU, 0.97)));

  // a primary with a replica can fail over, and a CDN, object storage or SMS provider is a managed,
  // already-redundant service, so none of these count as a single point here
  const spofList = singlePoints(g, challengeId).filter((s) => {
    const kind = g.nodes.find((n) => n.id === s.id)?.kind;
    if (kind === 'cdn' || kind === 'store' || kind === 'provider') return false;
    return !(kind === 'db' && linked(g, 'db', 'replica'));
  });
  const avail = 99.99 * 0.995 ** spofList.length;
  const cost = g.nodes.reduce((sum, n) => sum + SPEC[n.kind].cost, 0);

  const checks = { cost: cost <= sla.budget, p99: p99 <= sla.p99, avail: avail >= sla.avail, capacity: !overloaded };
  return { cost, tiers, bottleneck, overloaded, p99, avail, spofs: spofList.length, checks, met: Object.values(checks).every(Boolean) };
}
