import { describe, expect, it } from 'vitest';
import type { Graph } from './model';
import { capacityReport, slaByChallenge } from './capacity';

const build = (spec: Record<string, number>, edges: [string, string][]): Graph => {
  const nodes: Graph['nodes'] = [{ id: 'c', kind: 'client' }];
  for (const [kind, n] of Object.entries(spec)) for (let i = 0; i < n; i++) nodes.push({ id: `${kind}${i}`, kind: kind as Graph['nodes'][number]['kind'] });
  const ids = (k: string) => nodes.filter((x) => x.kind === k).map((x) => x.id);
  const e: [string, string][] = [];
  for (const [a, b] of edges) for (const x of a === 'c' ? ['c'] : ids(a)) for (const y of ids(b)) e.push([x, y]);
  return { nodes, edges: e };
};
const wiring: [string, string][] = [['c', 'lb'], ['lb', 'api'], ['api', 'cache'], ['api', 'db'], ['api', 'replica'], ['db', 'replica']];

describe('capacity and cost', () => {
  const sla = slaByChallenge.scale!;
  it('a lean, cached, redundant design meets the targets within budget', () => {
    const r = capacityReport(build({ lb: 2, api: 4, cache: 1, db: 1, replica: 1 }, wiring), 'scale', sla);
    expect(r.cost).toBe(1190);
    expect(r.overloaded).toBe(false);
    expect(r.checks).toEqual({ cost: true, p99: true, avail: true, capacity: true });
  });
  it('too few servers overload a tier and blow the latency', () => {
    const r = capacityReport(build({ lb: 2, api: 2, cache: 1, db: 1, replica: 1 }, wiring), 'scale', sla);
    expect(r.overloaded).toBe(true);
    expect(r.bottleneck?.kind).toBe('api');
    expect(r.checks.p99).toBe(false);
  });
  it('a single load balancer costs availability; over-building costs money', () => {
    expect(capacityReport(build({ lb: 1, api: 4, cache: 1, db: 1, replica: 1 }, wiring), 'scale', sla).checks.avail).toBe(false);
    expect(capacityReport(build({ lb: 2, api: 8, cache: 1, db: 1, replica: 2 }, wiring), 'scale', sla).checks.cost).toBe(false);
  });
  it('without a cache, reads are slower', () => {
    const noCache = capacityReport(build({ lb: 2, api: 4, db: 1, replica: 1 }, [['c', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'replica'], ['db', 'replica']]), 'scale', sla);
    expect(noCache.checks.p99).toBe(false);
  });
});

describe('every challenge has a design that meets its targets', () => {
  const cases: Record<string, [Record<string, number>, [string, string][]]> = {
    scale: [{ lb: 2, api: 4, cache: 1, db: 1, replica: 1 }, wiring],
    readheavy: [{ lb: 2, api: 6, cache: 1, db: 1, replica: 1, cdn: 1, store: 1 }, [...wiring, ['c', 'cdn'], ['cdn', 'store']]],
    ratelimit: [{ limiter: 2, lb: 2, api: 3, cache: 2, db: 1, replica: 1 }, [['c', 'limiter'], ['limiter', 'lb'], ['lb', 'api'], ['limiter', 'cache'], ['api', 'db'], ['api', 'replica'], ['db', 'replica']]],
    notify: [{ lb: 2, api: 2, queue: 1, worker: 3, db: 1, replica: 1, provider: 1 }, [['c', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'replica'], ['db', 'replica'], ['api', 'queue'], ['queue', 'worker'], ['worker', 'provider'], ['worker', 'db']]],
    chat: [{ lb: 2, ws: 3, cache: 1, db: 1, replica: 1 }, [['c', 'lb'], ['lb', 'ws'], ['ws', 'cache'], ['ws', 'db'], ['ws', 'replica'], ['db', 'replica']]],
    events: [{ lb: 2, api: 3, queue: 1, worker: 2, db: 1, replica: 1 }, [['c', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'replica'], ['db', 'replica'], ['api', 'queue'], ['queue', 'worker'], ['worker', 'db']]],
  };
  for (const [id, [spec, edges]] of Object.entries(cases)) {
    it(id, () => {
      const r = capacityReport(build(spec, edges), id, slaByChallenge[id]!);
      expect(r.checks, JSON.stringify({ cost: r.cost, p99: r.p99, avail: r.avail, tiers: r.tiers.map((t) => [t.kind, t.util.toFixed(2)]) })).toEqual({ cost: true, p99: true, avail: true, capacity: true });
    });
  }
});
