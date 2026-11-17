import { tr } from '@/shared/lib/i18n';
import { holds, type Spec } from './rules';
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

/** A requirement: what it says, why it matters, and the structural checks behind it. */
export interface Rule { text: string; why: string; specs: Spec[]; ok: (g: Graph) => boolean }
/** One correct design to show after checking; other designs that meet every rule are just as right. */
export interface Reference { parts: Partial<Record<PartKind, number>>; edges: [PartKind, PartKind][]; note: string }
export interface Challenge { id: string; title: string; level: number; brief: string; palette: PartKind[]; rules: Rule[]; reference: Reference }

const rule = (text: string, why: string, ...specs: Spec[]): Rule => ({ text, why, specs, ok: (g) => specs.every((x) => holds(g, x)) });

const base: PartKind[] = ['client', 'lb', 'api', 'db', 'replica', 'cache'];

export const challenges: Challenge[] = [
  {
    id: 'scale', title: tr('১০ লাখ user-এর ParcelGo', 'ParcelGo for a million users'), level: 1, palette: base,
    brief: tr('একটা server আর একটা database আর চলছে না। এমন design করুন যাতে কোনো একটা যন্ত্র বন্ধ হলেও order নেওয়া চলে।', 'One server and one database are no longer enough. Design it so orders keep flowing even if any one machine goes down.'),
    rules: [
      rule(tr('User app load balancer হয়ে API-তে যায়', 'The user app reaches the API through a load balancer'), tr('Load balancer ছাড়া user একটা নির্দিষ্ট server-এ বাঁধা: সেটা পড়লে সব বন্ধ, আর ভার ভাগ হয় না।', 'Without a load balancer users are tied to one server: if it dies everything stops, and load is never shared.'), { t: 'link', a: 'client', b: 'lb' }, { t: 'reach', target: 'api', via: ['lb'] }),
      rule(tr('অন্তত ২টা API server, প্রতিটা load balancer থেকে traffic পায়', 'At least 2 API servers, each fed by the load balancer'), tr('একটা server মানেই single point of failure; আর যে server traffic পায় না সে থাকা না থাকা সমান।', 'One server is a single point of failure, and a server that gets no traffic might as well not exist.'), { t: 'count', k: 'api', min: 2 }, { t: 'allFed', a: 'lb', b: 'api' }),
      rule(tr('প্রতিটা API server database-এ লেখে', 'Every API server writes to the database'), tr('কোনো server database-এ না পৌঁছালে তার কাছে আসা order কোথাও জমা হয় না।', 'A server that cannot reach the database has nowhere to store the orders it receives.'), { t: 'allLinked', a: 'api', b: 'db' }),
      rule(tr('Database-এর replica আছে, primary থেকে copy পায়', 'The database has a replica copying from the primary'), tr('Replica না থাকলে primary পড়লে data আর পড়া দুটোই যায়; replica থাকলে failover আর পড়া ভাগ করা যায়।', 'Without a replica, losing the primary loses reads and risks data; with one you can fail over and share reads.'), { t: 'link', a: 'db', b: 'replica' }),
      rule(tr('User app সরাসরি database ছোঁয় না', 'The user app never touches the database directly'), tr('App সরাসরি database-এ গেলে নিয়ম, নিরাপত্তা আর caching সব পাশ কাটায়, আর database-এর password ফোনে চলে যায়।', 'An app talking to the database skips every rule, security check and cache, and ships database credentials to phones.'), { t: 'noLink', a: 'client', b: 'db' }, { t: 'noLink', a: 'client', b: 'replica' }),
    ],
    reference: { parts: { lb: 2, api: 3, db: 1, replica: 1 }, edges: [['client', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'replica'], ['db', 'replica']], note: tr('দুটো load balancer (একটা পড়লে অন্যটা), তিনটা API server, primary-তে লেখা আর replica থেকে পড়া।', 'Two load balancers (one can fail), three API servers, writes to the primary and reads from the replica.') },
  },
  {
    id: 'readheavy', title: tr('Product page: পড়াই বেশি', 'Product page: mostly reads'), level: 2, palette: [...base, 'cdn', 'store'],
    brief: tr('প্রতিটা order-এর আগে ১০০ বার product page খোলা হয়, প্রতিটা page-এ ৫টা ছবি। Database আর server-এর চাপ কমান।', 'Product pages are opened 100 times for every order, with 5 images each. Take the load off the database and servers.'),
    rules: [
      rule(tr('User app load balancer হয়ে API-তে যায়, ২+ API server', 'The user app reaches the API through a load balancer, 2+ API servers'), tr('এত পড়ায় একটা server হাঁপিয়ে উঠবে, আর পড়লে page-ই খুলবে না।', 'One server will choke on this many reads, and if it dies no page opens.'), { t: 'link', a: 'client', b: 'lb' }, { t: 'count', k: 'api', min: 2 }, { t: 'allFed', a: 'lb', b: 'api' }),
      rule(tr('API আগে cache দেখে', 'The API checks the cache first'), tr('একই product শতবার পড়া হয়: প্রতিবার database-এ গেলে সেটাই প্রথম ভাঙবে।', 'The same product is read hundreds of times; going to the database each time breaks it first.'), { t: 'allLinked', a: 'api', b: 'cache' }),
      rule(tr('Cache-এ না পেলে database (API → DB-ও আছে)', 'On a cache miss, the database (API → DB exists too)'), tr('Cache-এ সব থাকে না; miss হলে কোথা থেকে পড়বে, সেই পথ থাকতে হবে।', 'The cache never holds everything; misses need a path to the real data.'), { t: 'anyLink', a: 'api', b: ['db', 'replica'] }),
      rule(tr('ছবি CDN থেকে, CDN-এর পেছনে object storage', 'Images come from a CDN backed by object storage'), tr('প্রতি page-এ ৫টা ছবি: server দিয়ে পাঠালে bandwidth আর সময় দুটোই নষ্ট; কাছের CDN edge থেকে দিন।', 'Five images a page through your servers wastes bandwidth and time; serve them from a nearby CDN edge.'), { t: 'link', a: 'client', b: 'cdn' }, { t: 'link', a: 'cdn', b: 'store' }),
      rule(tr('ছবি API server দিয়ে যায় না', 'Images do not go through the API servers'), tr('API server ছবি টানলে CDN থাকার লাভ শেষ, server-এর memory আর network ছবিতেই খরচ হয়।', 'If API servers fetch images the CDN is pointless and server memory and network go to pictures.'), { t: 'noLink', a: 'api', b: 'store' }),
    ],
    reference: { parts: { lb: 2, api: 3, cache: 1, db: 1, replica: 1, cdn: 1, store: 1 }, edges: [['client', 'lb'], ['lb', 'api'], ['api', 'cache'], ['api', 'replica'], ['api', 'db'], ['db', 'replica'], ['client', 'cdn'], ['cdn', 'store']], note: tr('পড়া আগে cache থেকে, miss হলে replica; ছবি সরাসরি CDN থেকে, CDN-এর পেছনে object storage।', 'Reads hit the cache first, then a replica on a miss; images come straight from the CDN backed by object storage.') },
  },
  {
    id: 'ratelimit', title: tr('Merchant API-র দারোয়ান', 'A doorkeeper for the merchant API'), level: 4, palette: [...base, 'limiter'],
    brief: tr('প্রতি merchant মিনিটে ১,০০০ request। অনেক API server, তবু সীমা সবার জন্য একটাই।', '1,000 requests per merchant per minute. Many API servers, yet one limit for all.'),
    rules: [
      rule(tr('সব request API-র আগে rate limiter পার হয়', 'Every request passes the rate limiter before the API'), tr('একটা পথও limiter এড়িয়ে গেলে bot সেটাই খুঁজে নেবে।', 'If even one path skips the limiter, bots will find it.'), { t: 'mustPass', target: 'api', through: 'limiter', via: ['lb'] }),
      rule(tr('অন্তত ২টা API server', 'At least 2 API servers'), tr('একটা server হলে "অনেক server জুড়ে এক সীমা"-র সমস্যাই নেই, আর সেটা পড়লে সব বন্ধ।', 'With one server there is no shared-limit problem to solve, and it is a single point of failure.'), { t: 'count', k: 'api', min: 2 }),
      rule(tr('Rate limiter-এর counter ভাগাভাগি করা cache-এ', 'The rate limiter keeps its counters in a shared cache'), tr('প্রতিটা limiter নিজের memory-তে গুনলে আসল সীমা limiter-এর সংখ্যার গুণ হয়ে যায়।', 'If each limiter counts in its own memory, the real limit multiplies by the number of limiters.'), { t: 'link', a: 'limiter', b: 'cache' }),
      rule(tr('API database-এ লেখে', 'The API writes to the database'), tr('সীমার ভেতরের order-গুলো তো জমা হতে হবে।', 'The orders within the limit still have to be stored.'), { t: 'link', a: 'api', b: 'db' }),
    ],
    reference: { parts: { limiter: 2, lb: 1, api: 3, cache: 1, db: 1, replica: 1 }, edges: [['client', 'limiter'], ['limiter', 'cache'], ['limiter', 'lb'], ['lb', 'api'], ['api', 'db'], ['db', 'replica']], note: tr('User app সবার আগে rate limiter-এ; limiter-রা counter রাখে একটা shared cache-এ, তারপর load balancer হয়ে API।', 'The user app hits the rate limiters first; they keep counters in a shared cache, then pass through the load balancer to the API.') },
  },
  {
    id: 'notify', title: tr('Parcel-এর SMS', 'Parcel SMS'), level: 10, palette: [...base, 'queue', 'worker', 'provider'],
    brief: tr('দিনে ৫ কোটি SMS। Order নেওয়া যেন SMS-এর জন্য আটকে না থাকে, আর provider ধীর হলেও কিছু না হারায়।', '50 million SMS a day. Taking orders must never wait on SMS, and nothing may be lost when the provider is slow.'),
    rules: [
      rule(tr('API সরাসরি SMS provider-কে ডাকে না', 'The API never calls the SMS provider directly'), tr('Provider ধীর হলে API-র thread আটকে থাকে, order নেওয়াও ধীর হয়ে যায়।', 'When the provider is slow the API\'s threads wait, and taking orders slows down too.'), { t: 'noLink', a: 'api', b: 'provider' }),
      rule(tr('API notification queue-তে রাখে', 'The API puts notifications on a queue'), tr('Queue-তে রেখে API সাথে সাথে ফেরে; SMS পরে পাঠানো হয়, আর provider বন্ধ থাকলেও কাজ জমা থাকে।', 'Queuing lets the API return at once; SMS go out later, and work waits safely while the provider is down.'), { t: 'link', a: 'api', b: 'queue' }),
      rule(tr('২+ worker queue থেকে নেয়', '2+ workers consume from the queue'), tr('একটা worker পড়লে SMS জমতেই থাকবে; একাধিক worker হলে ভার ভাগ হয়।', 'With one worker a crash lets SMS pile up; several share the load.'), { t: 'count', k: 'worker', min: 2 }, { t: 'allFed', a: 'queue', b: 'worker' }),
      rule(tr('Worker SMS provider-কে পাঠায়', 'Workers send to the SMS provider'), tr('Worker-ই আসল পাঠানোর কাজ করে; provider-এ পথ না থাকলে SMS কখনো যায় না।', 'Workers do the actual sending; without a path to the provider no SMS ever leaves.'), { t: 'allLinked', a: 'worker', b: 'provider' }),
      rule(tr('Worker পাঠানো id মনে রাখে (cache বা DB), যাতে দুবার না যায়', 'Workers remember sent IDs (cache or DB) so nothing goes twice'), tr('Retry-তে একই SMS আবার যেতে পারে; পাঠানো id মনে রাখলে দ্বিতীয়টা আটকানো যায়।', 'Retries can resend the same SMS; remembering sent IDs blocks the duplicate.'), { t: 'anyLink', a: 'worker', b: ['cache', 'db'] }),
    ],
    reference: { parts: { lb: 2, api: 2, db: 1, replica: 1, queue: 1, worker: 3, cache: 1, provider: 1 }, edges: [['client', 'lb'], ['lb', 'api'], ['api', 'db'], ['db', 'replica'], ['api', 'queue'], ['queue', 'worker'], ['worker', 'provider'], ['worker', 'cache']], note: tr('API order লিখে queue-তে notification রাখে; worker-রা queue থেকে নিয়ে পাঠানো id cache-এ দেখে provider-এ পাঠায়।', 'The API writes the order and queues the notification; workers take from the queue, check sent IDs in the cache, then send.') },
  },
  {
    id: 'chat', title: 'Rider–customer chat', level: 12, palette: [...base, 'ws'],
    brief: tr('লাখো খোলা সংযোগ, online/offline দেখানো, আর offline হলে message জমা।', 'Hundreds of thousands of open connections, online/offline status, and messages kept while offline.'),
    rules: [
      rule(tr('User app load balancer হয়ে WebSocket server-এ', 'The user app reaches WebSocket servers through a load balancer'), tr('লাখো খোলা সংযোগ একটা server-এ ধরে না; load balancer ছড়িয়ে দেয়।', 'Hundreds of thousands of open connections do not fit one server; the load balancer spreads them.'), { t: 'link', a: 'client', b: 'lb' }, { t: 'reach', target: 'ws', via: ['lb'] }),
      rule(tr('২+ WebSocket server', '2+ WebSocket servers'), tr('একটা server পড়লে সবার chat বন্ধ; একাধিক হলে শুধু তার সংযোগগুলো আবার জোড়া লাগে।', 'If the only server dies every chat stops; with several only its connections reconnect.'), { t: 'count', k: 'ws', min: 2 }, { t: 'allFed', a: 'lb', b: 'ws' }),
      rule(tr('WebSocket server-গুলো cache-এ presence আর pub/sub ভাগ করে', 'WebSocket servers share presence and pub/sub through a cache'), tr('Rider এক server-এ, customer অন্যটায়: মাঝে একটা ভাগাভাগি চ্যানেল না থাকলে message পৌঁছাবে না।', 'The rider is on one server and the customer on another; without a shared channel messages cannot cross.'), { t: 'allLinked', a: 'ws', b: 'cache' }),
      rule(tr('Message database-এ জমা থাকে', 'Messages are stored in the database'), tr('Offline user-এর message কোথাও না জমলে ফোন খুললে কিছুই পাবে না।', 'Messages for offline users must be stored or they see nothing when they come back.'), { t: 'link', a: 'ws', b: 'db' }),
    ],
    reference: { parts: { lb: 2, ws: 3, cache: 1, db: 1, replica: 1 }, edges: [['client', 'lb'], ['lb', 'ws'], ['ws', 'cache'], ['ws', 'db'], ['db', 'replica']], note: tr('Load balancer সংযোগ ছড়ায়; WebSocket server-রা Redis-এ কে কোথায় আর pub/sub ভাগ করে; message database-এ জমা।', 'The load balancer spreads connections; WebSocket servers share presence and pub/sub in Redis; messages are stored in the database.') },
  },
  {
    id: 'events', title: 'Order event pipeline', level: 19, palette: [...base, 'queue', 'worker'],
    brief: tr('প্রতিটা order event-এর অনেক ভোক্তা: invoice, analytics, merchant dashboard। কিছু যেন না হারায়।', 'Every order event has many consumers: invoices, analytics, the merchant dashboard. Nothing may be lost.'),
    rules: [
      rule(tr('User app load balancer হয়ে API-তে', 'The user app reaches the API through a load balancer'), tr('Order নেওয়ার পথ আগে ঠিক থাকতে হবে।', 'The order path itself must be sound first.'), { t: 'link', a: 'client', b: 'lb' }, { t: 'reach', target: 'api', via: ['lb'] }),
      rule(tr('API order database-এ লেখে আর event queue-তে দেয়', 'The API writes orders to the database and events to a queue'), tr('Order আসল জায়গায় জমা, আর event queue-তে: ভোক্তারা নিজেদের গতিতে নেয়।', 'The order is stored for real, and the event goes on a queue for consumers to take at their own pace.'), { t: 'link', a: 'api', b: 'db' }, { t: 'link', a: 'api', b: 'queue' }),
      rule(tr('২+ worker queue থেকে নেয়', '2+ workers consume from the queue'), tr('একটা worker থামলে সব ভোক্তা পিছিয়ে পড়ে।', 'One stalled worker leaves every consumer behind.'), { t: 'count', k: 'worker', min: 2 }, { t: 'allFed', a: 'queue', b: 'worker' }),
      rule(tr('Worker ফল database-এ লেখে', 'Workers write their results to the database'), tr('Invoice বা report বানিয়ে কোথাও না রাখলে কাজটাই হারায়।', 'Invoices and reports that are never stored are work lost.'), { t: 'link', a: 'worker', b: 'db' }),
      rule(tr('API worker-কে সরাসরি ডাকে না', 'The API never calls workers directly'), tr('সরাসরি ডাকলে worker ধীর হলে order-ও ধীর, আর worker পড়লে event হারায়।', 'Calling workers directly makes orders wait on them, and a crashed worker loses the event.'), { t: 'noLink', a: 'api', b: 'worker' }),
    ],
    reference: { parts: { lb: 2, api: 2, db: 1, replica: 1, queue: 1, worker: 3 }, edges: [['client', 'lb'], ['lb', 'api'], ['api', 'db'], ['db', 'replica'], ['api', 'queue'], ['queue', 'worker'], ['worker', 'db']], note: tr('API order লিখে event queue-তে দেয়; worker-রা queue থেকে নিয়ে ফল database-এ লেখে, API কখনো worker-কে সরাসরি ডাকে না।', 'The API writes the order and emits the event to the queue; workers consume it and write results; the API never calls a worker.') },
  },
];

/** The reference design as a graph, to check and to draw. */
export function referenceGraph(c: Challenge): Graph {
  const nodes: BNode[] = [{ id: 'r0', kind: 'client' }];
  let i = 1;
  for (const [k, n] of Object.entries(c.reference.parts) as [PartKind, number][]) for (let j = 0; j < n; j++) nodes.push({ id: `r${i++}`, kind: k });
  const edges: [string, string][] = [];
  for (const [a, b] of c.reference.edges) for (const x of nodes.filter((n) => n.kind === a)) for (const y of nodes.filter((n) => n.kind === b)) edges.push([x.id, y.id]);
  return { nodes, edges };
}

export const scoreOf = (c: Challenge, g: Graph) => c.rules.filter((r) => r.ok(g)).length / c.rules.length;
