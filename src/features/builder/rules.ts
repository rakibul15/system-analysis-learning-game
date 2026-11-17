import { tr } from '@/shared/lib/i18n';
import { PARTS, type Graph, type PartKind } from './model';

/**
 * Rules as data, so a failed rule can say exactly where the design is wrong and how to
 * fix it, not just that it failed. Each spec checks one structural fact about the graph.
 */
export type Spec =
  | { t: 'link'; a: PartKind; b: PartKind }
  | { t: 'anyLink'; a: PartKind; b: PartKind[] }
  | { t: 'allLinked'; a: PartKind; b: PartKind }
  | { t: 'allFed'; a: PartKind; b: PartKind }
  | { t: 'count'; k: PartKind; min: number }
  | { t: 'noLink'; a: PartKind; b: PartKind }
  | { t: 'reach'; target: PartKind; via: PartKind[] }
  | { t: 'mustPass'; target: PartKind; through: PartKind; via: PartKind[] };

export interface Fix { nodes: PartKind[]; edges: [string | PartKind, string | PartKind][] }
export interface Finding { where: string; fix: string; mark: { nodes: string[]; edges: [string, string][] }; apply?: Fix }

const L = (k: PartKind) => PARTS[k].label;
const kindOf = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)?.kind;
const ofKind = (g: Graph, k: PartKind) => g.nodes.filter((n) => n.kind === k).map((n) => n.id);
const hasEdge = (g: Graph, a: string, b: string) => g.edges.some(([x, y]) => x === a && y === b);

/** Nodes reachable from the user app, moving only through `via` kinds (the target itself ends a path). */
function reachable(g: Graph, via: PartKind[], skip?: PartKind): Set<string> {
  const start = ofKind(g, 'client');
  const seen = new Set(start);
  const stack = [...start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const [a, b] of g.edges) {
      if (a !== cur || seen.has(b)) continue;
      const k = kindOf(g, b)!;
      if (k === skip) continue;
      seen.add(b);
      if (via.includes(k)) stack.push(b);
    }
  }
  return seen;
}

export function holds(g: Graph, s: Spec): boolean {
  switch (s.t) {
    case 'link': return ofKind(g, s.a).some((a) => ofKind(g, s.b).some((b) => hasEdge(g, a, b)));
    case 'anyLink': return s.b.some((b) => holds(g, { t: 'link', a: s.a, b }));
    case 'allLinked': { const as = ofKind(g, s.a); return as.length > 0 && as.every((a) => ofKind(g, s.b).some((b) => hasEdge(g, a, b))); }
    case 'allFed': { const bs = ofKind(g, s.b); return bs.length > 0 && bs.every((b) => ofKind(g, s.a).some((a) => hasEdge(g, a, b))); }
    case 'count': return ofKind(g, s.k).length >= s.min;
    case 'noLink': return !holds(g, { t: 'link', a: s.a, b: s.b });
    case 'reach': return [...reachable(g, s.via)].some((id) => kindOf(g, id) === s.target);
    case 'mustPass': {
      const all = reachable(g, [...s.via, s.through]);
      const around = reachable(g, s.via, s.through);
      return [...all].some((id) => kindOf(g, id) === s.target) && ![...around].some((id) => kindOf(g, id) === s.target);
    }
  }
}

/** Where a spec fails, and the smallest change that makes it hold. Null when it holds. */
export function diagnose(g: Graph, s: Spec): Finding | null {
  if (holds(g, s)) return null;
  const none = { nodes: [] as string[], edges: [] as [string, string][] };
  switch (s.t) {
    case 'count': {
      const have = ofKind(g, s.k).length;
      return { where: tr(`${L(s.k)} আছে ${have}টা, লাগবে অন্তত ${s.min}টা`, `${have} × ${L(s.k)}, at least ${s.min} needed`), fix: tr(`আরও ${s.min - have}টা ${L(s.k)} যোগ করুন`, `Add ${s.min - have} more ${L(s.k)}`), mark: { nodes: ofKind(g, s.k), edges: [] }, apply: { nodes: Array(s.min - have).fill(s.k), edges: [] } };
    }
    case 'link': case 'anyLink': {
      const b = s.t === 'link' ? s.b : s.b[0]!;
      const as = ofKind(g, s.a), bs = ofKind(g, b);
      if (!as.length) return { where: tr(`Design-এ কোনো ${L(s.a)} নেই`, `There is no ${L(s.a)} in the design`), fix: tr(`${L(s.a)} যোগ করে ${L(b)}-এ তীর দিন`, `Add a ${L(s.a)} and draw an arrow to ${L(b)}`), mark: none, apply: { nodes: [s.a, ...(bs.length ? [] : [b])], edges: [[s.a, b]] } };
      if (!bs.length) return { where: tr(`Design-এ কোনো ${L(b)} নেই`, `There is no ${L(b)} in the design`), fix: tr(`${L(b)} যোগ করে ${L(s.a)} থেকে তীর দিন`, `Add a ${L(b)} and draw an arrow from ${L(s.a)}`), mark: { nodes: as, edges: [] }, apply: { nodes: [b], edges: [[as[0]!, b]] } };
      return { where: tr(`${L(s.a)} থেকে ${L(b)}-এ কোনো তীর নেই`, `No arrow from ${L(s.a)} to ${L(b)}`), fix: tr(`${L(s.a)} → ${L(b)} তীর টানুন`, `Draw ${L(s.a)} → ${L(b)}`), mark: { nodes: [...as, ...bs], edges: [] }, apply: { nodes: [], edges: [[as[0]!, bs[0]!]] } };
    }
    case 'allLinked': {
      const as = ofKind(g, s.a), bs = ofKind(g, s.b);
      if (!as.length) return { where: tr(`কোনো ${L(s.a)} নেই`, `There is no ${L(s.a)}`), fix: tr(`${L(s.a)} যোগ করুন`, `Add a ${L(s.a)}`), mark: none, apply: { nodes: [s.a, ...(bs.length ? [] : [s.b])], edges: [[s.a, s.b]] } };
      if (!bs.length) return { where: tr(`কোনো ${L(s.b)} নেই`, `There is no ${L(s.b)}`), fix: tr(`${L(s.b)} যোগ করে প্রতিটা ${L(s.a)} থেকে তীর দিন`, `Add a ${L(s.b)} and draw an arrow from every ${L(s.a)}`), mark: { nodes: as, edges: [] }, apply: { nodes: [s.b], edges: as.map((a) => [a, s.b] as [string, PartKind]) } };
      const lonely = as.filter((a) => !bs.some((b) => hasEdge(g, a, b)));
      return { where: tr(`${lonely.length}টা ${L(s.a)}-এর ${L(s.b)}-এ তীর নেই`, `${lonely.length} × ${L(s.a)} with no arrow to ${L(s.b)}`), fix: tr(`প্রতিটা থেকে ${L(s.b)}-এ তীর দিন`, `Draw an arrow from each to ${L(s.b)}`), mark: { nodes: lonely, edges: [] }, apply: { nodes: [], edges: lonely.map((a) => [a, bs[0]!] as [string, string]) } };
    }
    case 'allFed': {
      const as = ofKind(g, s.a), bs = ofKind(g, s.b);
      if (!bs.length) return { where: tr(`কোনো ${L(s.b)} নেই`, `There is no ${L(s.b)}`), fix: tr(`${L(s.b)} যোগ করুন`, `Add a ${L(s.b)}`), mark: none, apply: { nodes: [s.b, ...(as.length ? [] : [s.a])], edges: [[as[0] ?? s.a, s.b]] } };
      if (!as.length) return { where: tr(`কোনো ${L(s.a)} নেই`, `There is no ${L(s.a)}`), fix: tr(`${L(s.a)} যোগ করে প্রতিটা ${L(s.b)}-এ তীর দিন`, `Add a ${L(s.a)} and point it at every ${L(s.b)}`), mark: { nodes: bs, edges: [] }, apply: { nodes: [s.a], edges: bs.map((b) => [s.a, b] as [PartKind, string]) } };
      const starving = bs.filter((b) => !as.some((a) => hasEdge(g, a, b)));
      return { where: tr(`${starving.length}টা ${L(s.b)} কোনো traffic পায় না`, `${starving.length} × ${L(s.b)} get no traffic`), fix: tr(`${L(s.a)} থেকে সেগুলোয় তীর দিন`, `Draw arrows to them from ${L(s.a)}`), mark: { nodes: starving, edges: [] }, apply: { nodes: [], edges: starving.map((b) => [as[0]!, b] as [string, string]) } };
    }
    case 'noLink': {
      const bad = g.edges.filter(([a, b]) => kindOf(g, a) === s.a && kindOf(g, b) === s.b);
      return { where: tr(`${L(s.a)} সরাসরি ${L(s.b)}-এ যাচ্ছে (${bad.length}টা তীর)`, `${L(s.a)} goes straight to ${L(s.b)} (${bad.length} arrow${bad.length > 1 ? 's' : ''})`), fix: tr('লাল তীরগুলো মুছে দিন', 'Remove the red arrows'), mark: { nodes: [], edges: bad }, apply: undefined };
    }
    case 'reach': {
      const missing = [...s.via, s.target].filter((k) => !ofKind(g, k).length);
      return missing.length
        ? { where: tr(`পথে ${missing.map(L).join(', ')} নেই`, `${missing.map(L).join(', ')} missing on the path`), fix: tr(`User app → ${s.via.map(L).join(' → ')} → ${L(s.target)} পথ বানান`, `Build the path User app → ${s.via.map(L).join(' → ')} → ${L(s.target)}`), mark: none, apply: { nodes: missing, edges: [['client', s.via[0] ?? s.target], ...s.via.map((v, i) => [v, s.via[i + 1] ?? s.target] as [PartKind, PartKind])] } }
        : { where: tr(`User app থেকে ${L(s.target)} পর্যন্ত তীরের পথ ভাঙা`, `The arrows from User app never reach ${L(s.target)}`), fix: tr(`User app → ${s.via.map(L).join(' → ')} → ${L(s.target)} তীরগুলো মিলিয়ে দেখুন`, `Check the arrows User app → ${s.via.map(L).join(' → ')} → ${L(s.target)}`), mark: { nodes: ofKind(g, s.target), edges: [] }, apply: { nodes: [], edges: [['client', s.via[0] ?? s.target], ...s.via.map((v, i) => [v, s.via[i + 1] ?? s.target] as [PartKind, PartKind])] } };
    }
    case 'mustPass': {
      const around = reachable(g, s.via, s.through);
      if ([...around].some((id) => kindOf(g, id) === s.target)) {
        const leaks = g.edges.filter(([a, b]) => kindOf(g, a) === 'client' && kindOf(g, b) !== s.through);
        return { where: tr(`${L(s.through)} এড়িয়েও ${L(s.target)}-এ পৌঁছানো যায়`, `${L(s.target)} can be reached without passing ${L(s.through)}`), fix: tr(`User app-এর তীর শুধু ${L(s.through)}-এ দিন, বাকিগুলো মুছুন`, `Point User app only at ${L(s.through)}; remove the other arrows`), mark: { nodes: [], edges: leaks }, apply: undefined };
      }
      return { where: tr(`${L(s.through)} হয়ে ${L(s.target)}-এ যাওয়ার পথ নেই`, `There is no path to ${L(s.target)} through ${L(s.through)}`), fix: tr(`User app → ${L(s.through)} → ${s.via.map(L).join(' → ')} → ${L(s.target)}`, `User app → ${L(s.through)} → ${s.via.map(L).join(' → ')} → ${L(s.target)}`), mark: none, apply: { nodes: [s.through, ...s.via, s.target].filter((k) => !ofKind(g, k).length), edges: [['client', s.through], [s.through, s.via[0] ?? s.target], ...s.via.map((v, i) => [v, s.via[i + 1] ?? s.target] as [PartKind, PartKind])] } };
    }
  }
}

/** Resolve a fix (which may name kinds instead of ids) into new nodes and edges for the graph. */
export function applyFix(g: Graph, fix: Fix, nextId: () => string): Graph {
  const nodes = [...g.nodes];
  const firstOf = (k: string) => nodes.find((n) => n.kind === k)?.id;
  for (const k of fix.nodes) nodes.push({ id: nextId(), kind: k });
  const resolve = (x: string) => (nodes.some((n) => n.id === x) ? x : firstOf(x) ?? x);
  const edges = [...g.edges];
  for (const [a, b] of fix.edges) {
    const e: [string, string] = [resolve(a), resolve(b)];
    if (nodes.some((n) => n.id === e[0]) && nodes.some((n) => n.id === e[1]) && !edges.some(([x, y]) => x === e[0] && y === e[1])) edges.push(e);
  }
  return { nodes, edges };
}
