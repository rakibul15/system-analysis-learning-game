import { describe, expect, it } from 'vitest';
import type { Graph } from './model';
import { runAll, singlePoints } from './chaos';

const g = (nodes: [string, string][], edges: [string, string][]): Graph => ({ nodes: nodes.map(([id, kind]) => ({ id, kind: kind as Graph['nodes'][number]['kind'] })), edges });

describe('chaos', () => {
  const single = g([['c', 'client'], ['lb', 'lb'], ['a1', 'api'], ['db', 'db']], [['c', 'lb'], ['lb', 'a1'], ['a1', 'db']]);
  const double = g([['c', 'client'], ['lb', 'lb'], ['a1', 'api'], ['a2', 'api'], ['db', 'db'], ['r', 'replica']],
    [['c', 'lb'], ['lb', 'a1'], ['lb', 'a2'], ['a1', 'db'], ['a2', 'db'], ['db', 'r'], ['a1', 'r'], ['a2', 'r']]);

  it('finds single points of failure', () => {
    expect(singlePoints(single, 'scale').map((s) => s.id).sort()).toEqual(['a1', 'db', 'lb']);
    expect(singlePoints(double, 'scale').map((s) => s.id).sort()).toEqual(['db', 'lb']);
  });

  it('serves reads slowly when the preferred part is down', () => {
    const r = runAll(double, 'scale', new Set(['r']));
    expect(r.find((x) => x.flow.id === 'track')!.status).toBe('slow');
    expect(r.find((x) => x.flow.id === 'order')!.status).toBe('ok');
  });

  it('parks work in the queue when the far end is down, and shows where a flow broke', () => {
    const n = g([['c', 'client'], ['lb', 'lb'], ['a', 'api'], ['db', 'db'], ['q', 'queue'], ['w', 'worker'], ['p', 'provider']],
      [['c', 'lb'], ['lb', 'a'], ['a', 'db'], ['a', 'q'], ['q', 'w'], ['w', 'p']]);
    expect(runAll(n, 'notify', new Set()).map((x) => x.status)).toEqual(['ok', 'ok']);
    const sms = runAll(n, 'notify', new Set(['p'])).find((x) => x.flow.id === 'sms')!;
    expect(sms.status).toBe('queued');
    expect(sms.path.at(-1)).toBe('q');
    const order = runAll(n, 'notify', new Set(['a'])).find((x) => x.flow.id === 'order')!;
    expect(order.status).toBe('down');
    expect(order.brokenAt).toBe('a');
  });
});
