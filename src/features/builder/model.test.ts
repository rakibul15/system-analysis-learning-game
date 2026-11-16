import { describe, expect, it } from 'vitest';
import { challenges, scoreOf, type Graph } from './model';

const g = (nodes: [string, Graph['nodes'][number]['kind']][], edges: [string, string][]): Graph => ({ nodes: nodes.map(([id, kind]) => ({ id, kind })), edges });

describe('architecture builder rules', () => {
  const scale = challenges.find((c) => c.id === 'scale')!;
  it('a single server and database fails most rules', () => {
    expect(scoreOf(scale, g([['c', 'client'], ['a', 'api'], ['d', 'db']], [['c', 'a'], ['a', 'd']]))).toBeLessThan(0.5);
  });
  it('the textbook answer passes every rule', () => {
    const good = g([['c', 'client'], ['l', 'lb'], ['a1', 'api'], ['a2', 'api'], ['d', 'db'], ['r', 'replica']],
      [['c', 'l'], ['l', 'a1'], ['l', 'a2'], ['a1', 'd'], ['a2', 'd'], ['d', 'r']]);
    expect(scoreOf(scale, good)).toBe(1);
  });
  it('a rate limiter that can be skipped does not count', () => {
    const rl = challenges.find((c) => c.id === 'ratelimit')!;
    const bypass = g([['c', 'client'], ['x', 'limiter'], ['l', 'lb'], ['a1', 'api'], ['a2', 'api'], ['k', 'cache'], ['d', 'db']],
      [['c', 'x'], ['c', 'l'], ['x', 'l'], ['l', 'a1'], ['l', 'a2'], ['x', 'k'], ['a1', 'd']]);
    expect(rl.rules[0]!.ok(bypass)).toBe(false);
  });
  it('every challenge has a palette that includes the client', () => {
    for (const c of challenges) expect(c.palette).toContain('client');
  });
});
