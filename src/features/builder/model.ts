import { tr } from '@/shared/lib/i18n';
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
    id: 'scale', title: tr('১০ লাখ user-এর ParcelGo', 'ParcelGo for a million users'), level: 1, palette: base,
    brief: tr('একটা server আর একটা database আর চলছে না। এমন design করুন যাতে কোনো একটা যন্ত্র বন্ধ হলেও order নেওয়া চলে।', 'One server and one database are no longer enough. Design it so orders keep flowing even if any one machine goes down.'),
    rules: [
      { text: tr('User app load balancer হয়ে API-তে যায়', 'The user app reaches the API through a load balancer'), ok: (g) => reaches(g, 'api', ['lb']) && linked(g, 'client', 'lb') },
      { text: tr('অন্তত ২টা API server, প্রতিটা load balancer থেকে traffic পায়', 'At least 2 API servers, each fed by the load balancer'), ok: (g) => count(g, 'api') >= 2 && allFed(g, 'lb', 'api') },
      { text: tr('প্রতিটা API server database-এ লেখে', 'Every API server writes to the database'), ok: (g) => allLinked(g, 'api', 'db') },
      { text: tr('Database-এর replica আছে, primary থেকে copy পায়', 'The database has a replica copying from the primary'), ok: (g) => linked(g, 'db', 'replica') },
      { text: tr('User app সরাসরি database ছোঁয় না', 'The user app never touches the database directly'), ok: (g) => !linked(g, 'client', 'db') && !linked(g, 'client', 'replica') },
    ],
  },
  {
    id: 'readheavy', title: tr('Product page: পড়াই বেশি', 'Product page: mostly reads'), level: 2, palette: [...base, 'cdn', 'store'],
    brief: tr('প্রতিটা order-এর আগে ১০০ বার product page খোলা হয়, প্রতিটা page-এ ৫টা ছবি। Database আর server-এর চাপ কমান।', 'Product pages are opened 100 times for every order, with 5 images each. Take the load off the database and servers.'),
    rules: [
      { text: tr('User app load balancer হয়ে API-তে যায়, ২+ API server', 'The user app reaches the API through a load balancer, 2+ API servers'), ok: (g) => linked(g, 'client', 'lb') && count(g, 'api') >= 2 && allFed(g, 'lb', 'api') },
      { text: tr('API আগে cache দেখে', 'The API checks the cache first'), ok: (g) => allLinked(g, 'api', 'cache') },
      { text: tr('Cache-এ না পেলে database (API → DB-ও আছে)', 'On a cache miss, the database (API → DB exists too)'), ok: (g) => linked(g, 'api', 'db') || linked(g, 'api', 'replica') },
      { text: tr('ছবি CDN থেকে, CDN-এর পেছনে object storage', 'Images come from a CDN backed by object storage'), ok: (g) => linked(g, 'client', 'cdn') && linked(g, 'cdn', 'store') },
      { text: tr('ছবি API server দিয়ে যায় না', 'Images do not go through the API servers'), ok: (g) => !linked(g, 'api', 'store') },
    ],
  },
  {
    id: 'ratelimit', title: tr('Merchant API-র দারোয়ান', 'A doorkeeper for the merchant API'), level: 4, palette: [...base, 'limiter'],
    brief: tr('প্রতি merchant মিনিটে ১,০০০ request। অনেক API server, তবু সীমা সবার জন্য একটাই।', '1,000 requests per merchant per minute. Many API servers, yet one limit for all.'),
    rules: [
      { text: tr('সব request API-র আগে rate limiter পার হয়', 'Every request passes the rate limiter before the API'), ok: (g) => reaches(g, 'limiter') && !reaches(g, 'api', ['lb']) && reaches(g, 'api', ['limiter', 'lb']) },
      { text: tr('অন্তত ২টা API server', 'At least 2 API servers'), ok: (g) => count(g, 'api') >= 2 },
      { text: tr('Rate limiter-এর counter ভাগাভাগি করা cache-এ', 'The rate limiter keeps its counters in a shared cache'), ok: (g) => linked(g, 'limiter', 'cache') },
      { text: tr('API database-এ লেখে', 'The API writes to the database'), ok: (g) => linked(g, 'api', 'db') },
    ],
  },
  {
    id: 'notify', title: tr('Parcel-এর SMS', 'Parcel SMS'), level: 10, palette: [...base, 'queue', 'worker', 'provider'],
    brief: tr('দিনে ৫ কোটি SMS। Order নেওয়া যেন SMS-এর জন্য আটকে না থাকে, আর provider ধীর হলেও কিছু না হারায়।', '50 million SMS a day. Taking orders must never wait on SMS, and nothing may be lost when the provider is slow.'),
    rules: [
      { text: tr('API সরাসরি SMS provider-কে ডাকে না', 'The API never calls the SMS provider directly'), ok: (g) => !linked(g, 'api', 'provider') },
      { text: tr('API notification queue-তে রাখে', 'The API puts notifications on a queue'), ok: (g) => linked(g, 'api', 'queue') },
      { text: tr('২+ worker queue থেকে নেয়', '2+ workers consume from the queue'), ok: (g) => count(g, 'worker') >= 2 && allFed(g, 'queue', 'worker') },
      { text: tr('Worker SMS provider-কে পাঠায়', 'Workers send to the SMS provider'), ok: (g) => allLinked(g, 'worker', 'provider') },
      { text: tr('Worker পাঠানো id মনে রাখে (cache বা DB), যাতে দুবার না যায়', 'Workers remember sent IDs (cache or DB) so nothing goes twice'), ok: (g) => linked(g, 'worker', 'cache') || linked(g, 'worker', 'db') },
    ],
  },
  {
    id: 'chat', title: 'Rider–customer chat', level: 12, palette: [...base, 'ws'],
    brief: tr('লাখো খোলা সংযোগ, online/offline দেখানো, আর offline হলে message জমা।', 'Hundreds of thousands of open connections, online/offline status, and messages kept while offline.'),
    rules: [
      { text: tr('User app load balancer হয়ে WebSocket server-এ', 'The user app reaches WebSocket servers through a load balancer'), ok: (g) => linked(g, 'client', 'lb') && reaches(g, 'ws', ['lb']) },
      { text: tr('২+ WebSocket server', '2+ WebSocket servers'), ok: (g) => count(g, 'ws') >= 2 && allFed(g, 'lb', 'ws') },
      { text: tr('WebSocket server-গুলো cache-এ presence আর pub/sub ভাগ করে', 'WebSocket servers share presence and pub/sub through a cache'), ok: (g) => allLinked(g, 'ws', 'cache') },
      { text: tr('Message database-এ জমা থাকে', 'Messages are stored in the database'), ok: (g) => linked(g, 'ws', 'db') },
    ],
  },
  {
    id: 'events', title: 'Order event pipeline', level: 19, palette: [...base, 'queue', 'worker'],
    brief: tr('প্রতিটা order event-এর অনেক ভোক্তা: invoice, analytics, merchant dashboard। কিছু যেন না হারায়।', 'Every order event has many consumers: invoices, analytics, the merchant dashboard. Nothing may be lost.'),
    rules: [
      { text: tr('User app load balancer হয়ে API-তে', 'The user app reaches the API through a load balancer'), ok: (g) => linked(g, 'client', 'lb') && reaches(g, 'api', ['lb']) },
      { text: tr('API order database-এ লেখে আর event queue-তে দেয়', 'The API writes orders to the database and events to a queue'), ok: (g) => linked(g, 'api', 'db') && linked(g, 'api', 'queue') },
      { text: tr('২+ worker queue থেকে নেয়', '2+ workers consume from the queue'), ok: (g) => count(g, 'worker') >= 2 && allFed(g, 'queue', 'worker') },
      { text: tr('Worker ফল database-এ লেখে', 'Workers write their results to the database'), ok: (g) => linked(g, 'worker', 'db') },
      { text: tr('API worker-কে সরাসরি ডাকে না', 'The API never calls workers directly'), ok: (g) => !linked(g, 'api', 'worker') },
    ],
  },
];

export const scoreOf = (c: Challenge, g: Graph) => c.rules.filter((r) => r.ok(g)).length / c.rules.length;
