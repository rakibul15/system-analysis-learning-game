/** Architecture builder: the parts, the graph, and the rules a design is checked against. */
export const PARTS = {
  client: { label: 'User app', tier: 0 },
  cdn: { label: 'CDN', tier: 1 },
  limiter: { label: 'Rate limiter', tier: 1 },
  lb: { label: 'Load balancer', tier: 2 },
  api: { label: 'API server', tier: 3 },
  ws: { label: 'WebSocket server', tier: 3 },
  cache: { label: 'Cache (Redis)', tier: 4 },
  queue: { label: 'Queue', tier: 4 },
  worker: { label: 'Worker', tier: 5 },
  db: { label: 'DB primary', tier: 5 },
  replica: { label: 'DB replica', tier: 6 },
  store: { label: 'Object storage', tier: 6 },
  provider: { label: 'SMS provider', tier: 6 },
} as const;
export type PartKind = keyof typeof PARTS;

export interface BNode { id: string; kind: PartKind }
export interface Graph { nodes: BNode[]; edges: [string, string][] }

export const count = (g: Graph, k: PartKind) => g.nodes.filter((n) => n.kind === k).length;
const kindOf = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)?.kind;
/** Is there an edge from any `a` to any `b`? */
export const linked = (g: Graph, a: PartKind, b: PartKind) => g.edges.some(([x, y]) => kindOf(g, x) === a && kindOf(g, y) === b);
/** Can a request from the client reach `target`, passing only through allowed kinds? */
export function reaches(g: Graph, target: PartKind, via?: PartKind[]): boolean {
  const start = g.nodes.filter((n) => n.kind === 'client').map((n) => n.id);
  const seen = new Set(start);
  const stack = [...start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const [a, b] of g.edges) {
      if (a !== cur || seen.has(b)) continue;
      const k = kindOf(g, b)!;
      if (k === target) return true;
      if (via && !via.includes(k)) continue;
      seen.add(b);
      stack.push(b);
    }
  }
  return false;
}
/** Every node of kind `a` has an edge to some `b`. */
export const allLinked = (g: Graph, a: PartKind, b: PartKind) => {
  const as = g.nodes.filter((n) => n.kind === a);
  return as.length > 0 && as.every((n) => g.edges.some(([x, y]) => x === n.id && kindOf(g, y) === b));
};
/** Every `b` gets traffic from some `a`. */
export const allFed = (g: Graph, a: PartKind, b: PartKind) => {
  const bs = g.nodes.filter((n) => n.kind === b);
  return bs.length > 0 && bs.every((n) => g.edges.some(([x, y]) => y === n.id && kindOf(g, x) === a));
};

export interface Rule { text: string; ok: (g: Graph) => boolean }
export interface Challenge { id: string; title: string; level: number; brief: string; palette: PartKind[]; rules: Rule[] }

const base: PartKind[] = ['client', 'lb', 'api', 'db', 'replica', 'cache'];

export const challenges: Challenge[] = [
  {
    id: 'scale', title: '১০ লাখ user-এর ParcelGo', level: 1, palette: base,
    brief: 'একটা server আর একটা database আর চলছে না। এমন design করুন যাতে কোনো একটা যন্ত্র বন্ধ হলেও order নেওয়া চলে।',
    rules: [
      { text: 'User app load balancer হয়ে API-তে যায়', ok: (g) => reaches(g, 'api', ['lb']) && linked(g, 'client', 'lb') },
      { text: 'অন্তত ২টা API server, প্রতিটা load balancer থেকে traffic পায়', ok: (g) => count(g, 'api') >= 2 && allFed(g, 'lb', 'api') },
      { text: 'প্রতিটা API server database-এ লেখে', ok: (g) => allLinked(g, 'api', 'db') },
      { text: 'Database-এর replica আছে, primary থেকে copy পায়', ok: (g) => linked(g, 'db', 'replica') },
      { text: 'User app সরাসরি database ছোঁয় না', ok: (g) => !linked(g, 'client', 'db') && !linked(g, 'client', 'replica') },
    ],
  },
  {
    id: 'readheavy', title: 'Product page: পড়াই বেশি', level: 2, palette: [...base, 'cdn', 'store'],
    brief: 'প্রতিটা order-এর আগে ১০০ বার product page খোলা হয়, প্রতিটা page-এ ৫টা ছবি। Database আর server-এর চাপ কমান।',
    rules: [
      { text: 'User app load balancer হয়ে API-তে যায়, ২+ API server', ok: (g) => linked(g, 'client', 'lb') && count(g, 'api') >= 2 && allFed(g, 'lb', 'api') },
      { text: 'API আগে cache দেখে', ok: (g) => allLinked(g, 'api', 'cache') },
      { text: 'Cache-এ না পেলে database (API → DB-ও আছে)', ok: (g) => linked(g, 'api', 'db') || linked(g, 'api', 'replica') },
      { text: 'ছবি CDN থেকে, CDN-এর পেছনে object storage', ok: (g) => linked(g, 'client', 'cdn') && linked(g, 'cdn', 'store') },
      { text: 'ছবি API server দিয়ে যায় না', ok: (g) => !linked(g, 'api', 'store') },
    ],
  },
  {
    id: 'ratelimit', title: 'Merchant API-র দারোয়ান', level: 4, palette: [...base, 'limiter'],
    brief: 'প্রতি merchant মিনিটে ১,০০০ request। অনেক API server, তবু সীমা সবার জন্য একটাই।',
    rules: [
      { text: 'সব request API-র আগে rate limiter পার হয়', ok: (g) => reaches(g, 'limiter') && !reaches(g, 'api', ['lb']) && reaches(g, 'api', ['limiter', 'lb']) },
      { text: 'অন্তত ২টা API server', ok: (g) => count(g, 'api') >= 2 },
      { text: 'Rate limiter-এর counter ভাগাভাগি করা cache-এ', ok: (g) => linked(g, 'limiter', 'cache') },
      { text: 'API database-এ লেখে', ok: (g) => linked(g, 'api', 'db') },
    ],
  },
  {
    id: 'notify', title: 'Parcel-এর SMS', level: 10, palette: [...base, 'queue', 'worker', 'provider'],
    brief: 'দিনে ৫ কোটি SMS। Order নেওয়া যেন SMS-এর জন্য আটকে না থাকে, আর provider ধীর হলেও কিছু না হারায়।',
    rules: [
      { text: 'API সরাসরি SMS provider-কে ডাকে না', ok: (g) => !linked(g, 'api', 'provider') },
      { text: 'API notification queue-তে রাখে', ok: (g) => linked(g, 'api', 'queue') },
      { text: '২+ worker queue থেকে নেয়', ok: (g) => count(g, 'worker') >= 2 && allFed(g, 'queue', 'worker') },
      { text: 'Worker SMS provider-কে পাঠায়', ok: (g) => allLinked(g, 'worker', 'provider') },
      { text: 'Worker পাঠানো id মনে রাখে (cache বা DB), যাতে দুবার না যায়', ok: (g) => linked(g, 'worker', 'cache') || linked(g, 'worker', 'db') },
    ],
  },
  {
    id: 'chat', title: 'Rider–customer chat', level: 12, palette: [...base, 'ws'],
    brief: 'লাখো খোলা সংযোগ, online/offline দেখানো, আর offline হলে message জমা।',
    rules: [
      { text: 'User app load balancer হয়ে WebSocket server-এ', ok: (g) => linked(g, 'client', 'lb') && reaches(g, 'ws', ['lb']) },
      { text: '২+ WebSocket server', ok: (g) => count(g, 'ws') >= 2 && allFed(g, 'lb', 'ws') },
      { text: 'WebSocket server-গুলো cache-এ presence আর pub/sub ভাগ করে', ok: (g) => allLinked(g, 'ws', 'cache') },
      { text: 'Message database-এ জমা থাকে', ok: (g) => linked(g, 'ws', 'db') },
    ],
  },
  {
    id: 'events', title: 'Order event pipeline', level: 19, palette: [...base, 'queue', 'worker'],
    brief: 'প্রতিটা order event-এর অনেক ভোক্তা: invoice, analytics, merchant dashboard। কিছু যেন না হারায়।',
    rules: [
      { text: 'User app load balancer হয়ে API-তে', ok: (g) => linked(g, 'client', 'lb') && reaches(g, 'api', ['lb']) },
      { text: 'API order database-এ লেখে আর event queue-তে দেয়', ok: (g) => linked(g, 'api', 'db') && linked(g, 'api', 'queue') },
      { text: '২+ worker queue থেকে নেয়', ok: (g) => count(g, 'worker') >= 2 && allFed(g, 'queue', 'worker') },
      { text: 'Worker ফল database-এ লেখে', ok: (g) => linked(g, 'worker', 'db') },
      { text: 'API worker-কে সরাসরি ডাকে না', ok: (g) => !linked(g, 'api', 'worker') },
    ],
  },
];

export const scoreOf = (c: Challenge, g: Graph) => c.rules.filter((r) => r.ok(g)).length / c.rules.length;
