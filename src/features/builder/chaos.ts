import { tr } from '@/shared/lib/i18n';
import type { Graph, PartKind } from './model';

/**
 * A kind of request that travels through the user's design. It succeeds when a path
 * from the user app reaches one of `target`, moving only through `via` kinds.
 *  - prefer: the fast path goes through this kind; without it the flow still works but slowly.
 *  - through: the path must pass this kind (for example a worker).
 *  - buffer: if the far end is down but this kind is reachable, the request waits there safely.
 */
export interface Flow { id: string; label: string; target: PartKind[]; via: PartKind[]; prefer?: PartKind; through?: PartKind; buffer?: PartKind; critical: boolean }
export type FlowStatus = 'ok' | 'slow' | 'queued' | 'down';
export interface FlowResult { flow: Flow; status: FlowStatus; path: string[]; brokenAt: string | null }

export const flowsByChallenge: Record<string, Flow[]> = {
  scale: [
    { id: 'order', label: tr('নতুন order', 'New order'), target: ['db'], via: ['lb', 'api'], critical: true },
    { id: 'track', label: tr('Order track করা', 'Track an order'), target: ['replica', 'db'], via: ['lb', 'api'], prefer: 'replica', critical: true },
  ],
  readheavy: [
    { id: 'product', label: tr('Product page', 'Product page'), target: ['cache', 'db', 'replica'], via: ['lb', 'api'], prefer: 'cache', critical: true },
    { id: 'images', label: tr('ছবি', 'Images'), target: ['store'], via: ['cdn'], critical: true },
  ],
  ratelimit: [
    { id: 'call', label: tr('Merchant API call', 'Merchant API call'), target: ['db'], via: ['limiter', 'lb', 'api'], through: 'limiter', critical: true },
    { id: 'count', label: tr('Limit গোনা', 'Counting the limit'), target: ['cache'], via: ['limiter', 'lb'], through: 'limiter', critical: true },
  ],
  notify: [
    { id: 'order', label: tr('নতুন order', 'New order'), target: ['db'], via: ['lb', 'api'], critical: true },
    { id: 'sms', label: 'SMS', target: ['provider'], via: ['lb', 'api', 'queue', 'worker'], through: 'worker', buffer: 'queue', critical: false },
  ],
  chat: [
    { id: 'save', label: tr('Message জমা', 'Store a message'), target: ['db'], via: ['lb', 'ws'], critical: true },
    { id: 'live', label: tr('সাথে সাথে পৌঁছানো', 'Live delivery'), target: ['cache'], via: ['lb', 'ws'], critical: false },
  ],
  events: [
    { id: 'order', label: tr('নতুন order', 'New order'), target: ['db'], via: ['lb', 'api'], critical: true },
    { id: 'invoice', label: 'Invoice', target: ['db'], via: ['lb', 'api', 'queue', 'worker'], through: 'worker', buffer: 'queue', critical: false },
  ],
};

const kindOf = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)?.kind;

/** Shortest path from a user app to the flow's target, skipping `down` nodes. */
function search(g: Graph, flow: Flow, down: Set<string>, opts: { target?: PartKind[]; needPrefer?: boolean }): string[] | null {
  const target = opts.target ?? flow.target;
  type St = { id: string; thr: boolean; pref: boolean; path: string[] };
  const queue: St[] = g.nodes.filter((n) => n.kind === 'client' && !down.has(n.id)).map((n) => ({ id: n.id, thr: false, pref: false, path: [n.id] }));
  const seen = new Set(queue.map((s) => `${s.id}|0|0`));
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [a, b] of g.edges) {
      if (a !== cur.id || down.has(b)) continue;
      const k = kindOf(g, b);
      if (!k) continue;
      const thr = cur.thr || k === flow.through;
      const pref = cur.pref || k === flow.prefer;
      const path = [...cur.path, b];
      if (target.includes(k) && (!flow.through || thr || opts.target) && (!opts.needPrefer || pref)) return path;
      if (!flow.via.includes(k) && k !== flow.through) continue;
      const key = `${b}|${thr ? 1 : 0}|${pref ? 1 : 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ id: b, thr, pref, path });
    }
  }
  return null;
}

export function runFlow(g: Graph, flow: Flow, down: Set<string>): FlowResult {
  const fast = search(g, flow, down, { needPrefer: !!flow.prefer });
  if (fast) return { flow, status: 'ok', path: fast, brokenAt: null };
  const any = search(g, flow, down, {});
  if (any) return { flow, status: flow.prefer ? 'slow' : 'ok', path: any, brokenAt: null };
  if (flow.buffer) {
    const parked = search(g, flow, down, { target: [flow.buffer] });
    if (parked) return { flow, status: 'queued', path: parked, brokenAt: null };
  }
  // where would it have gone? follow the healthy design and stop at the first broken part
  const ideal = search(g, flow, new Set(), {}) ?? [];
  const cut = ideal.findIndex((id) => down.has(id));
  return { flow, status: 'down', path: cut > 0 ? ideal.slice(0, cut + 1) : ideal, brokenAt: cut > 0 ? ideal[cut]! : null };
}

export const runAll = (g: Graph, challengeId: string, down: Set<string>) => (flowsByChallenge[challengeId] ?? []).map((f) => runFlow(g, f, down));

/** Every part whose failure alone stops a critical flow: the single points of failure. */
export function singlePoints(g: Graph, challengeId: string): { id: string; breaks: string[] }[] {
  const flows = flowsByChallenge[challengeId] ?? [];
  const out: { id: string; breaks: string[] }[] = [];
  for (const n of g.nodes) {
    if (n.kind === 'client') continue;
    const broken = flows.filter((f) => f.critical && runFlow(g, f, new Set([n.id])).status === 'down').map((f) => f.label);
    if (broken.length) out.push({ id: n.id, breaks: broken });
  }
  return out;
}
