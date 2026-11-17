import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import type { Generator, LevelBank } from './types';

/* Our own questions for chapter 1. In every item the first option is the right one. */

const n = (v: number) => bn(v);
const pick = <T,>(rand: () => number, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
/** Distinct wrong answers that are not the right one, in a stable order. */
const wrongs = (right: number, cands: number[]) => [...new Set(cands.filter((c) => c !== right && c > 0))].slice(0, 3);

/* ---------- level 1 ---------- */
const capacity: Generator = {
  id: 'l1-g1', concept: 'scale-out',
  make: (rand) => {
    const per = pick(rand, [1500, 2000, 2500, 4000]);
    const peak = per * pick(rand, [3, 4, 5, 6]) - pick(rand, [0, 200, 500]);
    const need = Math.ceil(peak / per);
    const right = need + 1;
    const opts = wrongs(right, [need, need + 2, Math.floor(peak / per), need - 1]);
    return {
      prompt: tr(`Peak-এ সেকেন্ডে ${n(peak)}টা request। একটা web server সেকেন্ডে ${n(per)}টা সামলায়। একটা server হঠাৎ পড়ে গেলেও যেন চলে, কয়টা server রাখবেন?`, `At peak there are ${peak} requests a second. One web server handles ${per} a second. How many servers do you run so it still works if one dies?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`${n(peak)} ÷ ${n(per)} = ${n(need)}টা লাগে চালাতে, আর একটা পড়ে গেলেও যেন চলে তাই ১টা বাড়তি: ${n(right)}।`, `${peak} ÷ ${per} needs ${need} to run, plus one spare so losing one is fine: ${right}.`),
    };
  },
};

/* ---------- level 2 ---------- */
const hitRate: Generator = {
  id: 'l2-g1', concept: 'cache-fit',
  make: (rand) => {
    const reads = pick(rand, [10000, 20000, 40000, 50000]);
    const hit = pick(rand, [80, 90, 95, 99]);
    const db = Math.round((reads * (100 - hit)) / 100);
    const opts = wrongs(db, [Math.round((reads * hit) / 100), reads, Math.round(db / 10), db * 2]);
    return {
      prompt: tr(`Product page-এ সেকেন্ডে ${n(reads)}টা পড়া, cache hit rate ${n(hit)}%। Database-এ সেকেন্ডে কয়টা পড়া পৌঁছায়?`, `Product pages get ${reads} reads a second with a ${hit}% cache hit rate. How many reads a second reach the database?`),
      options: [n(db), ...opts.map(n)],
      explain: tr(`শুধু miss-গুলো database-এ যায়: ${n(reads)} × ${n(100 - hit)}% = ${n(db)}।`, `Only misses go to the database: ${reads} × ${100 - hit}% = ${db}.`),
    };
  },
};
const hitGain: Generator = {
  id: 'l2-g2', concept: 'cache-fit',
  make: (rand) => {
    const [a, b] = pick(rand, [[90, 95], [80, 90], [95, 99], [90, 99]] as const);
    const factor = Math.round((100 - a) / (100 - b));
    const opts = wrongs(factor, [Math.round(b / a * 10) / 10 === 1 ? 2 : factor + 1, factor * 2, Math.max(2, factor - 1), 10]);
    return {
      prompt: tr(`Cache hit rate ${n(a)}% থেকে ${n(b)}% হলো। Database-এর পড়ার চাপ কত ভাগের এক ভাগ হলো?`, `The cache hit rate went from ${a}% to ${b}%. Database read load dropped to one over what?`),
      options: [tr(`${n(factor)} ভাগের এক ভাগ`, `1/${factor}`), ...opts.map((o) => tr(`${n(o)} ভাগের এক ভাগ`, `1/${o}`))],
      explain: tr(`Miss ${n(100 - a)}% থেকে ${n(100 - b)}%: ${n(100 - a)} ÷ ${n(100 - b)} = ${n(factor)} গুণ কম। Hit rate-এর ছোট লাফ database-এর জন্য বড় লাফ।`, `Misses go from ${100 - a}% to ${100 - b}%: ${100 - a} ÷ ${100 - b} = ${factor}× fewer. A small step in hit rate is a big step for the database.`),
    };
  },
};

/* ---------- level 3 ---------- */
const qps: Generator = {
  id: 'l3-g1', concept: 'qps',
  make: (rand) => {
    const dau = pick(rand, [2, 5, 10, 20, 50]) * 1_000_000;
    const per = pick(rand, [2, 4, 5, 10]);
    const exact = (dau * per) / 86400;
    const right = Math.round(exact / 10) * 10 || Math.round(exact);
    const opts = wrongs(right, [Math.round((dau * per) / 3600 / 10) * 10, Math.round(exact * 2 / 10) * 10, Math.round(dau / 86400 / 10) * 10 || 10, Math.round(exact / 100) * 10 || 5]);
    return {
      prompt: tr(`${n(dau / 1_000_000)} মিলিয়ন DAU, প্রত্যেকে দিনে গড়ে ${n(per)}টা order দেয়। গড় order QPS প্রায় কত?`, `${dau / 1_000_000} million DAU, each placing ${per} orders a day on average. Roughly what is the average order QPS?`),
      options: [`~${n(right)}`, ...opts.map((o) => `~${n(o)}`)],
      explain: tr(`দিনে ${n(dau / 1_000_000)}M × ${n(per)} = ${n((dau * per) / 1_000_000)}M order; দিনে ~৮৬,৪০০ সেকেন্ড, তাই ÷ ৮৬,৪০০ ≈ ${n(right)}।`, `${dau / 1_000_000}M × ${per} = ${(dau * per) / 1_000_000}M orders a day; a day has ~86,400 seconds, so ÷ 86,400 ≈ ${right}.`),
    };
  },
};
const peak: Generator = {
  id: 'l3-g2', concept: 'peak',
  make: (rand) => {
    const avg = pick(rand, [1200, 2500, 3500, 6000]);
    const mult = pick(rand, [2, 3]);
    const right = avg * mult;
    const opts = wrongs(right, [avg, avg * (mult === 2 ? 3 : 2), avg * 10, Math.round(avg / 2)]);
    return {
      prompt: tr(`গড় QPS ${n(avg)}। সন্ধ্যার ভিড় গড়ের ${n(mult)} গুণ। Server আর database কোন QPS-এর জন্য বানাবেন?`, `Average QPS is ${avg}. The evening rush is ${mult}× the average. What QPS do you size servers and the database for?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`Peak-এর জন্য বানাতে হয়, গড়ের জন্য না: ${n(avg)} × ${n(mult)} = ${n(right)}।`, `Size for the peak, not the average: ${avg} × ${mult} = ${right}.`),
    };
  },
};
const storage: Generator = {
  id: 'l3-g3', concept: 'qps',
  make: (rand) => {
    const perDay = pick(rand, [1, 2, 5, 10]) * 1_000_000;
    const kb = pick(rand, [1, 2, 5]);
    const years = pick(rand, [1, 5]);
    const tb = Math.round((perDay * kb * 365 * years) / 1e9 * 10) / 10;
    const show = (v: number) => (v >= 1 ? `${bn(v, { grouping: false })} TB` : `${bn(Math.round(v * 1000))} GB`);
    const alt = [tb * 1000, tb / 365, tb / years, tb * 8].map((v) => Math.round(v * 10) / 10);
    const opts = [...new Set(alt.filter((v) => v !== tb && v > 0))].slice(0, 3);
    return {
      prompt: tr(`দিনে ${n(perDay / 1_000_000)} মিলিয়ন delivery event, প্রতিটা ~${n(kb)} KB। ${n(years)} বছরে কত জায়গা লাগবে (replica ছাড়া)?`, `${perDay / 1_000_000} million delivery events a day, ~${kb} KB each. How much storage over ${years} year${years > 1 ? 's' : ''} (before replicas)?`),
      options: [`~${show(tb)}`, ...opts.map((o) => `~${show(o)}`)],
      explain: tr(`${n(perDay / 1_000_000)}M × ${n(kb)} KB × ৩৬৫ × ${n(years)} ≈ ${show(tb)}। KB থেকে TB: ১০⁹ দিয়ে ভাগ।`, `${perDay / 1_000_000}M × ${kb} KB × 365 × ${years} ≈ ${show(tb)}. KB to TB: divide by 10⁹.`),
    };
  },
};

/* ---------- level 4 ---------- */
const bucket: Generator = {
  id: 'l4-g1', concept: 'algo',
  make: (rand) => {
    const size = pick(rand, [10, 20, 50]);
    const rate = pick(rand, [1, 2, 5]);
    const burst = size + pick(rand, [5, 10, 30]);
    const wait = pick(rand, [3, 5, 10]);
    const right = Math.min(size, rate * wait);
    const opts = wrongs(right, [size, burst - size, rate, rate * wait + size, 0]);
    return {
      prompt: tr(`Token bucket: ধারণক্ষমতা ${n(size)}, সেকেন্ডে ${n(rate)}টা token ভরে, এখন ভরা। একসাথে ${n(burst)}টা request এল, তারপর ${n(wait)} সেকেন্ড পর আবার অনেকগুলো। দ্বিতীয়বারে কয়টা ঢুকবে?`, `Token bucket: capacity ${size}, refills ${rate} a second, currently full. ${burst} requests arrive at once, then a big batch again ${wait} seconds later. How many get in the second time?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`প্রথম ঝাঁকে bucket খালি হয়ে যায় (${n(size)}টা ঢোকে)। ${n(wait)} সেকেন্ডে ${n(rate * wait)}টা token ভরে, তবে ${n(size)}-এর বেশি না: ${n(right)}টা ঢোকে।`, `The first burst empties the bucket (${size} get in). In ${wait} seconds ${rate * wait} tokens refill, capped at ${size}: ${right} get in.`),
    };
  },
};
const windowEdge: Generator = {
  id: 'l4-g2', concept: 'algo',
  make: (rand) => {
    const limit = pick(rand, [60, 100, 200, 300, 500, 1000]);
    const right = limit * 2;
    const opts = wrongs(right, [limit, limit + 1, Math.round(limit * 1.5), limit * 3]);
    return {
      prompt: tr(`Fixed window limit: মিনিটে ${n(limit)}টা। একটা bot ১২:০০:৫৯-এ ${n(limit)}টা আর ১২:০১:০০-তে আবার ${n(limit)}টা পাঠাল। ২ সেকেন্ডে কয়টা ঢুকল?`, `Fixed-window limit: ${limit} a minute. A bot sends ${limit} at 12:00:59 and ${limit} again at 12:01:00. How many got in within 2 seconds?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`দুটো আলাদা মিনিট, তাই দুটোই সীমার মধ্যে: ২ সেকেন্ডে ${n(right)}টা, সীমার দ্বিগুণ। এটাই fixed window-এর কিনারার দুর্বলতা।`, `They fall in two different minutes, so both are within the limit: ${right} in 2 seconds, double the limit. That is the fixed window's edge problem.`),
    };
  },
};

export const ch1Bank: Record<number, LevelBank> = {
  1: {
    concepts: [
      { id: 'spof', label: 'Single point of failure' },
      { id: 'stateless', label: tr('Stateless server', 'Stateless servers') },
      { id: 'scale-out', label: tr('Vertical বনাম horizontal', 'Vertical vs horizontal') },
      { id: 'replication', label: 'Replication' },
      { id: 'multi-dc', label: tr('একাধিক data center', 'Multiple data centers') },
    ],
    gens: [capacity],
    items: [
      { id: 'l1-x1', concept: 'spof', prompt: tr('দুটো load balancer, চারটা API server, একটা Redis-এ session। কোনটা ভাঙলে সবার login চলে যায়?', 'Two load balancers, four API servers, sessions in one Redis. Which failure logs everyone out?'),
        options: [tr('Redis, কারণ session ওখানে একটাই', 'Redis, the only home of the sessions'), tr('যেকোনো একটা API server', 'Any one API server'), tr('দুটো load balancer-এর একটা', 'One of the two load balancers'), tr('কোনোটাই না, সব জোড়ায় আছে', 'None, everything is paired')],
        explain: tr('বাকি সব জোড়ায় আছে, Redis একা: সেটাই single point of failure।', 'Everything else comes in pairs; Redis stands alone, so it is the single point of failure.') },
      { id: 'l1-x2', concept: 'spof', prompt: tr('Single point of failure খোঁজার সহজ পরীক্ষা কী?', 'What is a simple test for a single point of failure?'),
        options: [tr('প্রতিটা অংশ একে একে বন্ধ ধরে দেখা', 'Imagine switching each part off in turn'), tr('কোন অংশে CPU সবচেয়ে বেশি দেখা', 'Look for the part with the highest CPU'), tr('সবচেয়ে দামি machine খোঁজা', 'Find the most expensive machine'), tr('সবচেয়ে পুরনো code খোঁজা', 'Find the oldest code')],
        explain: tr('যে অংশ একা বন্ধ হলেই কাজ থামে, সেটাই SPOF। ব্যস্ততা বা দাম দিয়ে বোঝা যায় না।', 'Whatever stops the work when it alone goes down is a SPOF. Load or price does not tell you.') },
      { id: 'l1-x3', concept: 'spof', prompt: tr('Database-এ replica আছে, কিন্তু failover হাতে করতে হয়, রাতে কেউ থাকে না। এটা কেমন?', 'The database has a replica, but failover is manual and nobody is on call at night. What is this?'),
        options: [tr('রাতে কার্যত এখনো single point', 'Still effectively a single point at night'), tr('পুরোপুরি নিরাপদ, replica তো আছে', 'Fully safe, there is a replica'), tr('Replica থাকলে failover লাগে না', 'With a replica no failover is needed'), tr('শুধু লেখা থামবে, পড়া না', 'Only writes stop, never reads')],
        explain: tr('কেউ না থাকলে replica-কে leader বানানোর কেউ নেই: সকাল পর্যন্ত লেখা বন্ধ।', 'With nobody to promote the replica, writes stay down until morning.') },
      { id: 'l1-x4', concept: 'stateless', prompt: tr('Cart যদি server-এর memory-তে থাকে, load balancer-এ কী সমস্যা?', 'If the cart lives in server memory, what goes wrong behind a load balancer?'),
        options: [tr('অন্য server-এ গেলে cart খালি দেখায়', 'Another server may get the next request and see an empty cart'), tr('Load balancer request ধীর করে দেয়', 'The load balancer starts slowing every request down'), tr('Database-এ একই cart দুবার লেখা হয়', 'The database ends up writing the same cart twice'), tr('CDN পুরনো cart cache করে রাখে', 'The CDN keeps serving an old cached copy of the cart')],
        explain: tr('State এক server-এ আটকে থাকলে user-কে সেই server-এই পাঠাতে হয়। State বাইরে (Redis/DB) রাখলে যেকোনো server চলে।', 'State pinned to one server forces users back to it. Keep it outside (Redis/DB) and any server works.') },
      { id: 'l1-x5', concept: 'stateless', prompt: tr('Sticky session-এর বড় অসুবিধা কী?', 'What is the main downside of sticky sessions?'),
        options: [tr('সেই server পড়লে তার user-রা session হারায়', 'When that server dies its users lose their sessions'), tr('HTTPS certificate আর কাজ করে না', 'HTTPS certificates stop working for everyone'), tr('Browser-এ cookie আর রাখা যায় না', 'Browsers can no longer store any cookies'), tr('Database replica-র আর দরকার পড়ে না', 'Database replicas become unnecessary')],
        explain: tr('User একটা server-এ বাঁধা: ভার অসমান হয়, আর server পড়লে তার session-ও যায়।', 'Users are tied to one server: load gets uneven and a dead server takes its sessions along.') },
      { id: 'l1-x6', concept: 'stateless', prompt: tr('Stateless হলে নতুন server যোগ করা সহজ কেন?', 'Why does stateless make adding servers easy?'),
        options: [tr('কিছু কপি না করেই সাথে সাথে কাজ নেয়', 'It takes work at once with nothing to copy'), tr('Stateless server চালাতে RAM লাগে না', 'Stateless servers run without any RAM'), tr('তখন আর load balancer লাগে না', 'You can drop the load balancer entirely'), tr('Database নিজে থেকেই shard হয়ে যায়', 'The database starts sharding by itself')],
        explain: tr('কোনো user-এর data server-এ নেই, তাই নতুন server যোগ মানে শুধু load balancer-এর তালিকায় নাম।', 'No user data lives on a server, so adding one is just a new entry in the load balancer.') },
      { id: 'l1-x7', concept: 'scale-out', prompt: tr('শুরুতে একটা বড় machine (vertical) কখন যুক্তিসঙ্গত?', 'When is one bigger machine (vertical) reasonable at first?'),
        options: [tr('Traffic কম আর সহজতা দরকার, তবে সীমা জেনে', 'While traffic is low and simplicity matters'), tr('কখনোই না, সবসময় শুরু থেকেই horizontal', 'Never; always go horizontal from day one'), tr('যখন অনেকগুলো data center চালাতে হয়', 'When you have to run many data centers'), tr('যখন failover সবচেয়ে জরুরি বিষয়', 'When automatic failover matters most')],
        explain: tr('Vertical সহজ, কিন্তু একটা ছাদ আছে আর failover নেই। ছোট অবস্থায় চলে, বড় হলে horizontal।', 'Vertical is simple but has a ceiling and no failover. Fine while small; go horizontal as you grow.') },
      { id: 'l1-x8', concept: 'scale-out', prompt: tr('Horizontal scaling-এর জন্য web tier-এ আগে কী লাগে?', 'What must the web tier have before you scale it horizontally?'),
        options: [tr('Stateless server আর একটা load balancer', 'Stateless servers and a load balancer'), tr('একটা বড় machine', 'One larger machine'), tr('প্রতি server-এ আলাদা database', 'A separate database per server'), tr('সব user-এর জন্য sticky session', 'Sticky sessions for every user')],
        explain: tr('Load balancer ভাগ করে, আর stateless হলে যেকোনো server যেকোনো request নিতে পারে।', 'The load balancer spreads requests, and statelessness lets any server take any of them.') },
      { id: 'l1-x9', concept: 'replication', prompt: tr('লেখা খুব বেশি হলে আরও read replica যোগ করলে কী হয়?', 'Writes are heavy. What happens if you add more read replicas?'),
        options: [tr('লেখার চাপ কমে না, সব লেখা primary-তেই যায়', 'Write load stays; every write still hits the primary'), tr('লেখা replica-গুলোতে ভাগ হয়ে যায়', 'Writes get split evenly across all the replicas'), tr('Primary-র আর দরকার থাকে না', 'The primary is no longer needed for anything'), tr('লেখা দ্বিগুণ দ্রুত হয়', 'Every write becomes roughly twice as fast')],
        explain: tr('Replica পড়া ভাগ করে, লেখা না। লেখা ভাগ করতে sharding লাগে।', 'Replicas share reads, not writes. Splitting writes needs sharding.') },
      { id: 'l1-x10', concept: 'replication', prompt: tr('Customer order দিয়েই "আমার order"-এ গেল, order দেখাচ্ছে না। সম্ভাব্য কারণ?', 'A customer places an order, opens "My orders", and it is missing. Likely cause?'),
        options: [tr('পড়া এল এখনো-পিছিয়ে-থাকা replica থেকে', 'The read came from a replica that is still behind'), tr('Order আসলে লেখাই হয়নি', 'The order was never written'), tr('CDN order মুছে দিয়েছে', 'The CDN deleted the order'), tr('Load balancer order আটকে রেখেছে', 'The load balancer is holding the order')],
        explain: tr('Replication lag: নিজের সদ্য লেখা জিনিস কিছুক্ষণ primary থেকে পড়ুন।', 'Replication lag: read your own fresh writes from the primary for a while.') },
      { id: 'l1-x11', concept: 'replication', prompt: tr('Primary পড়ে গেলে সাধারণত কী হয়?', 'What usually happens when the primary dies?'),
        options: [tr('একটা replica নতুন primary হয়', 'A replica is promoted to primary'), tr('সব replica নিজে থেকে লেখা নেয়', 'All replicas start taking writes'), tr('App বন্ধ থাকে primary ফেরা পর্যন্ত', 'The app stays down until it returns'), tr('Cache নতুন primary হয়', 'The cache becomes the primary')],
        explain: tr('Failover: সবচেয়ে এগিয়ে থাকা replica-কে primary বানানো হয়; পিছিয়ে থাকলে শেষ কিছু লেখা হারাতে পারে।', 'Failover promotes the most up-to-date replica; if it lagged, the last few writes may be lost.') },
      { id: 'l1-x12', concept: 'multi-dc', prompt: tr('দুই data center-এ কোন user কোথায় যাবে, কে ঠিক করে?', 'With two data centers, what decides where each user goes?'),
        options: [tr('GeoDNS, user-এর কাছেরটায়', 'GeoDNS, to the nearer one'), tr('Database primary', 'The database primary'), tr('প্রতিটা web server নিজে', 'Each web server on its own'), tr('Message queue', 'The message queue')],
        explain: tr('DNS ধাপেই user-কে কাছের data center-এ পাঠানো হয়; একটা গেলে সব traffic অন্যটায়।', 'Users are routed at the DNS step to the nearer center; if one fails, all traffic moves to the other.') },
      { id: 'l1-x13', concept: 'multi-dc', prompt: tr('একটা data center পুরো বন্ধ হলে অন্যটায় সব user কাজ চালাতে কী লাগবে?', 'If one data center fails entirely, what lets the other serve everyone?'),
        options: [tr('Data দুটোতেই replicate করা থাকা', 'Data already replicated to both'), tr('শুধু আরও বেশি web server চালু রাখা', 'Simply running more web servers'), tr('আরও বড় একটা CDN কেনা', 'Buying a bigger CDN plan'), tr('সব session browser-এ রেখে দেওয়া', 'Keeping all sessions in the browser')],
        explain: tr('অন্য data center-এ data না থাকলে server থাকলেও কাজ হয় না।', 'Without the data in the other center, its servers have nothing to serve.') },
      { id: 'l1-x14', concept: 'multi-dc', prompt: tr('একাধিক data center-এর সবচেয়ে কঠিন অংশ কোনটা?', 'What is the hardest part of running several data centers?'),
        options: [tr('দুই জায়গার data মিলিয়ে রাখা', 'Keeping the data in sync between them'), tr('দুই জায়গার জন্য যথেষ্ট web server কেনা', 'Buying enough web servers for both'), tr('প্রতিটা অঞ্চলের জন্য app অনুবাদ', 'Translating the app for each region'), tr('প্রতিটার জন্য HTTPS certificate নেওয়া', 'Getting HTTPS certificates for each one')],
        explain: tr('দূরত্বের কারণে data মেলাতে দেরি হয়; সংঘাত আর পুরনো data সামলানোই আসল কাজ।', 'Distance delays syncing; handling conflicts and stale data is the real work.') },
    ],
  },
  2: {
    concepts: [
      { id: 'what-cache', label: tr('কী cache করবেন', 'What to cache') },
      { id: 'cdn', label: 'CDN' },
      { id: 'cache-spof', label: tr('Cache-এর ভরসা', 'Relying on the cache') },
      { id: 'cache-fit', label: tr('Cache কখন কাজে লাগে', 'When a cache pays off') },
      { id: 'ttl', label: 'TTL' },
    ],
    gens: [hitRate, hitGain],
    items: [
      { id: 'l2-x1', concept: 'what-cache', prompt: tr('কোনটা cache করার জন্য সবচেয়ে ভালো?', 'Which is the best thing to cache?'),
        options: [tr('Product-এর বিবরণ: প্রায়ই পড়া, কম বদলায়', 'Product details: read often, rarely change'), tr('Wallet-এর balance', 'Wallet balances'), tr('প্রতি সেকেন্ডে বদলানো rider location', 'Rider locations changing every second'), tr('একবার ব্যবহার করা OTP', 'One-time OTP codes')],
        explain: tr('বেশি পড়া আর কম বদলানো data-য় cache সবচেয়ে লাভ দেয়।', 'Caching pays most for data that is read a lot and changes little.') },
      { id: 'l2-x2', concept: 'what-cache', prompt: tr('Cache-aside-এ miss হলে কী হয়?', 'In cache-aside, what happens on a miss?'),
        options: [tr('App DB থেকে পড়ে, তারপর cache-এ রাখে', 'The app reads the DB, then fills the cache'), tr('Cache নিজে থেকে DB-তে গিয়ে টেনে আনে', 'The cache pulls from the DB by itself'), tr('Request ব্যর্থ হয়, user error দেখে', 'The request fails'), tr('CDN নিজের কপি থেকে উত্তর দেয়', 'The CDN answers')],
        explain: tr('Cache-aside-এ cache বোকা দোকান: ভরানোর দায় app-এর।', 'In cache-aside the cache is a dumb shelf; filling it is the app\'s job.') },
      { id: 'l2-x3', concept: 'what-cache', prompt: tr('দাম বদলালে cache-এর পুরনো দাম এড়ানোর সহজ উপায়?', 'A simple way to avoid stale prices in the cache after a change?'),
        options: [tr('DB-তে লেখার পর ওই key মুছে ফেলা', 'Delete that key after writing the DB'), tr('Cache কখনো মুছবেন না', 'Never delete from the cache'), tr('Cache-কে আসল উৎস বানানো', 'Make the cache the source of truth'), tr('দাম CDN-এ রাখা', 'Keep prices on the CDN')],
        explain: tr('লেখার পর key মুছলে পরের পড়ায় নতুন মান DB থেকে আসে।', 'Deleting the key after the write makes the next read fetch the new value.') },
      { id: 'l2-x4', concept: 'cdn', prompt: tr('CDN কী রাখার জন্য সবচেয়ে উপযোগী?', 'What is a CDN best for?'),
        options: [tr('ছবি, JS, CSS-এর মতো static file', 'Static files such as images, JS and CSS'), tr('প্রতিটা user-এর নিজের order history', 'Each user\'s private order history'), tr('Payment-এর হিসাব আর ledger', 'Payment records and ledger entries'), tr('প্রতিটা user-এর login session', 'Login sessions for every user')],
        explain: tr('সবার জন্য একই, কম বদলানো file কাছের edge থেকে দেওয়াই CDN-এর কাজ।', 'Serving the same, rarely changing files from a nearby edge is what CDNs do.') },
      { id: 'l2-x5', concept: 'cdn', prompt: tr('CDN-এর edge-এ file না থাকলে কী হয়?', 'What happens when a file is not at the CDN edge?'),
        options: [tr('Edge origin থেকে এনে রাখে, তারপর দেয়', 'The edge fetches it from the origin and keeps a copy'), tr('User একটা error পায়, আবার চেষ্টা করতে হয়', 'The user gets an error and must try again'), tr('Browser নিজে origin খুঁজে নেয়', 'The browser goes looking for the origin itself'), tr('File সেই edge থেকে চিরতরে হারায়', 'The file is lost from that edge for good')],
        explain: tr('প্রথম user-এর জন্য একটু ধীর, পরের সবাই edge থেকে পায়।', 'A little slower for the first user; everyone after gets it from the edge.') },
      { id: 'l2-x6', concept: 'cdn', prompt: tr('CDN ব্যবহারের খরচ কমাতে কী করবেন?', 'How do you keep CDN costs down?'),
        options: [tr('কম চাওয়া file CDN-এ না রাখা', 'Leave rarely requested files off the CDN'), tr('সব file-এর TTL এক সেকেন্ড', 'Give every file a one-second TTL'), tr('সব API response CDN-এ রাখা', 'Put every API response on the CDN'), tr('একই file বারবার upload', 'Upload the same file repeatedly')],
        explain: tr('CDN টাকা নেয় data পাঠানোয়: যা কেউ চায় না তা রাখার মানে নেই।', 'CDNs charge for data served; storing what nobody asks for gains nothing.') },
      { id: 'l2-x7', concept: 'cache-spof', prompt: tr('Cache server হঠাৎ বন্ধ হলে সবচেয়ে বড় বিপদ কোথায়?', 'If the cache server suddenly dies, where is the biggest danger?'),
        options: [tr('সব পড়া একসাথে database-এ, সেটা ডুবতে পারে', 'Every read hits the database at once and may sink it'), tr('Cache-এর সব data চিরতরে হারায়', 'All of the cached data is lost for ever'), tr('CDN-ও সাথে সাথে বন্ধ হয়ে যায়', 'The CDN goes down along with the cache'), tr('Login বন্ধ হয়, বাকি সব আগের মতো চলে', 'Only login stops, everything else works')],
        explain: tr('Cache-এর আড়ালে database কম চাপ সামলাতে অভ্যস্ত; হঠাৎ পুরো চাপ এলে ভেঙে পড়ে।', 'Behind a cache the database is used to light load; the full load all at once can break it.') },
      { id: 'l2-x8', concept: 'cache-spof', prompt: tr('Cache-কে আসল তথ্যের একমাত্র জায়গা বানালে কী ঝুঁকি?', 'What is risky about making the cache the only home of the data?'),
        options: [tr('Cache memory-তে: restart-এ data হারাতে পারে', 'It lives in memory and may lose data on restart'), tr('Cache database-এর চেয়ে অনেক ধীর', 'The cache is slower than the database'), tr('Cache-এ নতুন করে লেখা যায় না', 'You cannot write new data to a cache'), tr('কোনো ঝুঁকি নেই, cache-ই যথেষ্ট', 'There is no risk; a cache is enough')],
        explain: tr('Cache একটা কপি, আসল উৎস database। Memory মুছে গেলে কপি আবার বানানো যায়, আসলটা না।', 'A cache is a copy; the database is the source. A copy can be rebuilt, the original cannot.') },
      { id: 'l2-x9', concept: 'cache-spof', prompt: tr('Cache ভরা থাকলে কোন key সরানো হবে, সাধারণ নিয়ম কী?', 'When the cache is full, which key goes first under the usual rule?'),
        options: [tr('সবচেয়ে কম সম্প্রতি ব্যবহৃত (LRU)', 'The least recently used one (LRU)'), tr('সবচেয়ে নতুন যোগ হওয়া key', 'The most recently added key'), tr('সবচেয়ে বড় আকারের key', 'The largest key in the cache'), tr('এলোমেলো, প্রতিবার সব একসাথে', 'All of them at once, at random')],
        explain: tr('LRU: যেটা অনেকক্ষণ কেউ চায়নি, সেটাই আগে বাদ।', 'LRU drops whatever nobody has asked for in the longest time.') },
      { id: 'l2-x10', concept: 'cache-fit', prompt: tr('কোন অবস্থায় cache প্রায় কাজে লাগে না?', 'When does a cache barely help?'),
        options: [tr('প্রতিটা জিনিস একবারই পড়া হয়', 'Each item is read only once'), tr('একই product হাজারবার পড়া হয়', 'The same product is read a thousand times'), tr('Homepage সবাই একই দেখে', 'Everyone sees the same homepage'), tr('দাম দিনে একবার বদলায়', 'Prices change once a day')],
        explain: tr('একবারই পড়লে cache-এ রাখার পর আর কেউ চায় না: শুধু miss।', 'If each item is read once, nobody asks again after caching: all misses.') },
      { id: 'l2-x11', concept: 'ttl', prompt: tr('TTL খুব লম্বা হলে কী সমস্যা?', 'What goes wrong when the TTL is very long?'),
        options: [tr('User অনেকক্ষণ পুরনো data দেখে', 'Users see old data for a long time'), tr('Database-এর চাপ হঠাৎ বেড়ে যায়', 'Database load rises sharply'), tr('Cache বেশিরভাগ সময় খালি থাকে', 'The cache stays mostly empty'), tr('সবার জন্য network ধীর হয়', 'The network slows down for everyone')],
        explain: tr('লম্বা TTL = কম miss, কিন্তু পুরনো data বেশিক্ষণ।', 'A long TTL means fewer misses but staler data.') },
      { id: 'l2-x12', concept: 'ttl', prompt: tr('অনেক key একই TTL-এ একসাথে ভরা হলে কী হতে পারে?', 'What can happen if many keys are filled together with the same TTL?'),
        options: [tr('একই মুহূর্তে মেয়াদ শেষ, সব DB-তে (stampede)', 'They expire together and all hit the DB'), tr('Cache আগের চেয়ে দ্রুত উত্তর দেয়', 'The cache answers faster than before'), tr('Key-গুলো আর কখনো মেয়াদোত্তীর্ণ হয় না', 'The keys never expire after that'), tr('শুধু একটা key বাকি সব মুছে টিকে থাকে', 'Only one key survives, the rest vanish')],
        explain: tr('TTL-এ এলোমেলো jitter দিলে মেয়াদ ছড়িয়ে যায়।', 'Random jitter on the TTL spreads the expiries out.') },
      { id: 'l2-x13', concept: 'ttl', prompt: tr('"Delivered" status ৫ সেকেন্ড পুরনো দেখালেও চলে। কোনটা ভালো?', '"Delivered" may show up to 5 seconds late. Which is best?'),
        options: [tr('~৫ সেকেন্ডের TTL', 'A TTL of about 5 seconds'), tr('TTL এক দিন', 'A one-day TTL'), tr('Cache একেবারে না', 'No cache at all'), tr('TTL শূন্য, প্রতিবার miss', 'A zero TTL, missing every time')],
        explain: tr('যতটা পুরনো চলে, TTL ততটাই: database বাঁচে, তথ্যও যথেষ্ট টাটকা।', 'Make the TTL as long as staleness allows: the database rests and data stays fresh enough.') },
    ],
  },
  3: {
    concepts: [
      { id: 'scope', label: tr('প্রয়োজন ঠিক করা', 'Pinning down requirements') },
      { id: 'qps', label: tr('QPS আর storage-এর হিসাব', 'QPS and storage maths') },
      { id: 'peak', label: 'Peak' },
      { id: 'deep', label: tr('Interview-এর ধাপ', 'Interview steps') },
      { id: 'habits', label: tr('হিসাবের অভ্যাস', 'Estimation habits') },
    ],
    gens: [qps, storage, peak],
    items: [
      { id: 'l3-x1', concept: 'scope', prompt: tr('Interviewer বলল "একটা chat app বানান"। প্রথম কাজ?', 'The interviewer says "design a chat app". First move?'),
        options: [tr('কোন feature, কত user, কী জরুরি জিজ্ঞেস করা', 'Ask which features, how many users, what matters'), tr('সাথে সাথে কোন database নেবেন সেটা বাছাই', 'Pick the database before anything else'), tr('আগে code লিখতে শুরু করা', 'Start writing code to show progress'), tr('যা যা ভাবা যায় সব feature ধরে নেওয়া', 'Assume every feature you can think of')],
        explain: tr('আগে পরিধি: কী বানাচ্ছি, কাদের জন্য, কত বড়। তারপর design।', 'Scope first: what, for whom, how big. Then design.') },
      { id: 'l3-x2', concept: 'scope', prompt: tr('Non-functional requirement কোনটা?', 'Which is a non-functional requirement?'),
        options: [tr('৯৯.৯% সময় চালু থাকা', 'Up 99.9% of the time'), tr('Order বাতিল করা যাবে', 'Orders can be cancelled'), tr('Rider-এর ছবি দেখানো', 'Show the rider\'s photo'), tr('Coupon দেওয়া যাবে', 'Coupons can be applied')],
        explain: tr('Non-functional মানে কেমন চলবে: গতি, চালু থাকা, নির্ভুলতা।', 'Non-functional means how well it runs: speed, uptime, correctness.') },
      { id: 'l3-x3', concept: 'scope', prompt: tr('প্রয়োজন ঠিক করার সময় কোনটা জিজ্ঞেস করা সবচেয়ে কাজের?', 'Which question helps most while scoping?'),
        options: [tr('পড়া আর লেখার অনুপাত কেমন', 'What is the read-to-write ratio'), tr('কোন রঙের logo', 'What colour is the logo'), tr('Team-এ কতজন', 'How big is the team'), tr('কোন office-এ বসবেন', 'Which office you will sit in')],
        explain: tr('পড়া-লেখার অনুপাত cache, replica আর storage-এর সিদ্ধান্ত বদলে দেয়।', 'The read/write ratio drives caching, replica and storage decisions.') },
      { id: 'l3-x13', concept: 'qps', prompt: tr('গড় QPS বের করতে কোন তিনটা জিনিস লাগে?', 'Which three things give you the average QPS?'),
        options: [tr('DAU, প্রতিজনের দিনে কাজ, দিনের সেকেন্ড', 'DAU, actions per user per day, seconds per day'), tr('Server-এর সংখ্যা, RAM আর CPU', 'Server count, RAM and CPU per machine'), tr('Database-এর আকার আর কয়টা index', 'Database size and how many indexes'), tr('Team-এর মানুষ আর sprint-এর দৈর্ঘ্য', 'Team size and the length of a sprint')],
        explain: tr('DAU × প্রতিজনের দিনের কাজ ÷ ৮৬,৪০০ = গড় QPS।', 'DAU × actions per user per day ÷ 86,400 = average QPS.') },
      { id: 'l3-x14', concept: 'qps', prompt: tr('পড়া লেখার ১০ গুণ, লেখার QPS ৫০০। পড়ার QPS?', 'Reads are 10× writes and write QPS is 500. Read QPS?'),
        options: [tr('~৫,০০০', '~5,000'), tr('~৫০', '~50'), tr('~৫০০', '~500'), tr('~৫০,০০০', '~50,000')],
        explain: tr('৫০০ × ১০ = ৫,০০০। পড়া-লেখার অনুপাত জানলে একটা থেকে আরেকটা বের হয়।', '500 × 10 = 5,000. Knowing the read/write ratio turns one into the other.') },
      { id: 'l3-x4', concept: 'peak', prompt: tr('Peak QPS কেন আলাদা করে হিসাব করবেন?', 'Why work out peak QPS separately?'),
        options: [tr('System ভাঙে ভিড়ের সময়, গড়ে না', 'Systems break in the rush, not on average'), tr('Interviewer শুধু peak চায়', 'Interviewers only want the peak'), tr('গড় হিসাব করা যায় না', 'The average cannot be computed'), tr('Peak সবসময় গড়ের ১০ গুণ', 'Peak is always 10× the average')],
        explain: tr('Server, database, queue সব ভিড়ের জন্য মাপতে হয়।', 'Servers, databases and queues must be sized for the rush.') },
      { id: 'l3-x5', concept: 'peak', prompt: tr('ঈদের আগের রাতে traffic স্বাভাবিকের ৫ গুণ হয়। কী করবেন?', 'Traffic is 5× normal the night before Eid. What do you do?'),
        options: [tr('আগেভাগে বাড়তি capacity আর load test', 'Add capacity in advance and load test'), tr('কিছু না, autoscale সামলাবে', 'Nothing; autoscaling will cope with it'), tr('সেদিন app বন্ধ', 'Close the app for that night'), tr('গড় অনুযায়ী মাপা', 'Size everything for the average')],
        explain: tr('জানা ভিড়ের জন্য আগে প্রস্তুতি; autoscale ধীরে আসে, হঠাৎ লাফে পিছিয়ে পড়ে।', 'Prepare for a known rush; autoscaling is slow to react to a sudden jump.') },
      { id: 'l3-x6', concept: 'peak', prompt: tr('গড়ের তুলনায় peak কত ধরলে সাধারণত নিরাপদ শুরু?', 'What peak-to-average ratio is a common safe starting guess?'),
        options: [tr('২–৩ গুণ, তারপর আসল data দেখে ঠিক', '2–3×, then refine with real data'), tr('গড়ের ঠিক সমান, peak আলাদা হয় না', 'Exactly the average; peaks do not differ'), tr('সবসময় গড়ের ১০০ গুণ ধরতে হয়', 'Always 100× the average to be safe'), tr('গড়ের অর্ধেক, কারণ রাতে কম', 'Half the average, since nights are quiet')],
        explain: tr('শুরুর অনুমান ২–৩ গুণ; উৎসবের মতো জানা দিনে আরও বেশি।', 'Start with 2–3×; more for known events like festivals.') },
      { id: 'l3-x7', concept: 'deep', prompt: tr('৪৫ মিনিটের interview-এ সবচেয়ে বেশি সময় কোথায় দেবেন?', 'Where does most of a 45-minute interview go?'),
        options: [tr('High-level design আর deep dive', 'High-level design and the deep dive'), tr('প্রশ্নটা মন দিয়ে শোনায়', 'Listening carefully to the question'), tr('শেষের প্রশ্নোত্তর পর্বে', 'The closing questions for them'), tr('নিজের পরিচয় আর অভিজ্ঞতায়', 'Introducing yourself and your work')],
        explain: tr('পরিধি আর হিসাব ছোট, মূল সময় design আর গভীর আলোচনায়।', 'Scope and estimates are short; the bulk goes to design and the deep dive.') },
      { id: 'l3-x8', concept: 'deep', prompt: tr('Interviewer চুপ থাকলে কী করবেন?', 'What do you do when the interviewer goes quiet?'),
        options: [tr('জোরে ভাবতে থাকা, মাঝে মাঝে মত চাওয়া', 'Keep thinking aloud and check in now and then'), tr('চুপ করে interviewer-এর অপেক্ষা', 'Wait silently for the interviewer to speak'), tr('অন্য একটা বিষয়ে চলে যাওয়া', 'Move on to a different topic entirely'), tr('তাড়াতাড়ি design শেষ করে ফেলা', 'Wrap the design up as fast as possible')],
        explain: tr('Interview একটা আলোচনা: আপনার যুক্তি শুনতে পাওয়াই মূল্যায়নের উপায়।', 'It is a conversation; hearing your reasoning is how you are judged.') },
      { id: 'l3-x9', concept: 'deep', prompt: tr('Wrap-up-এ কী বলা ভালো?', 'What is good to say in the wrap-up?'),
        options: [tr('Bottleneck, ব্যর্থতা আর ভবিষ্যতে কী বদলাবেন', 'Bottlenecks, failures and what you would change next'), tr('"সব ঠিক আছে, কোনো দুর্বলতা নেই"', '"It is perfect, there are no weaknesses"'), tr('আগের সব কথা আবার ক্রমে বলা', 'Repeat everything said so far, in order'), tr('Company আর তাদের product-এর প্রশংসা', 'Praise the company and its products')],
        explain: tr('নিজের design-এর সীমা জানা senior হওয়ার চিহ্ন।', 'Knowing your design\'s limits is a senior signal.') },
      { id: 'l3-x10', concept: 'habits', prompt: tr('দিনে কত সেকেন্ড, হিসাবের জন্য কত ধরবেন?', 'How many seconds in a day do you use for quick maths?'),
        options: [tr('~১০⁵ (আসলে ৮৬,৪০০)', '~10⁵ (really 86,400)'), tr('~১০³ (প্রায় এক হাজার)', '~10³ (about a thousand)'), tr('~১০⁷ (প্রায় এক কোটি)', '~10⁷ (about ten million)'), tr('~৩,৬০০ (এক ঘণ্টার মতো)', '~3,600 (like an hour)')],
        explain: tr('৮৬,৪০০ ≈ ১০⁵ ধরলে মুখে মুখে ভাগ সহজ।', 'Treating 86,400 as ~10⁵ makes mental division easy.') },
      { id: 'l3-x11', concept: 'habits', prompt: tr('হিসাবে সবচেয়ে বেশি যে ভুল হয়?', 'The most common estimation slip?'),
        options: [tr('একক গুলিয়ে ফেলা, যেমন KB আর MB', 'Mixing units, like KB and MB'), tr('গোল সংখ্যা ব্যবহার', 'Using round numbers'), tr('ধরে নেওয়া কথা জোরে বলা', 'Stating assumptions aloud'), tr('Peak আলাদা করা', 'Separating out the peak')],
        explain: tr('এক ঘর ভুল একক মানে ১,০০০ গুণ ভুল।', 'One wrong unit is a 1,000× error.') },
      { id: 'l3-x12', concept: 'habits', prompt: tr('Storage হিসাবে কোনটা ভুলে যাওয়া সহজ?', 'What is easy to forget in a storage estimate?'),
        options: [tr('Replica আর backup-এর বাড়তি কপি', 'The extra copies for replicas and backups'), tr('বছরে দিনের সংখ্যা', 'The number of days in a year'), tr('প্রতিটা record-এর আকার', 'The size of each single record'), tr('কত বছর রাখবেন', 'How many years you keep the data')],
        explain: tr('৩টা replica মানে মোট জায়গা ৩ গুণ।', 'Three replicas mean three times the space.') },
    ],
  },
  4: {
    concepts: [
      { id: 'where', label: tr('Limiter কোথায় বসবে', 'Where the limiter sits') },
      { id: 'reply', label: tr('সীমা পেরোলে উত্তর', 'Replying past the limit') },
      { id: 'race', label: tr('Distributed counter', 'Distributed counters') },
      { id: 'algo', label: tr('Algorithm', 'Algorithms') },
      { id: 'key', label: tr('কীসের ভিত্তিতে সীমা', 'What the limit is keyed on') },
    ],
    gens: [bucket, windowEdge],
    items: [
      { id: 'l4-x1', concept: 'where', prompt: tr('Limiter শুধু mobile app-এর ভেতরে রাখলে কী সমস্যা?', 'What is wrong with putting the limiter only inside the mobile app?'),
        options: [tr('Bot app ছাড়াই সরাসরি API ডাকতে পারে', 'Bots can call the API directly, skipping the app'), tr('App চালাতে অনেক ধীর হয়ে যায়', 'The app becomes noticeably slower'), tr('ফোনের battery বেশি খরচ হয়', 'It drains the phone battery faster'), tr('কোনো সমস্যা নেই, এটাই ঠিক জায়গা', 'Nothing; the app is the right place')],
        explain: tr('Client-এর নিয়ম কেউ মানতে বাধ্য না; আটকাতে হয় server দিকে।', 'Nobody has to obey client-side rules; enforcement must be on the server side.') },
      { id: 'l4-x2', concept: 'where', prompt: tr('অনেক service-এ একই limit লাগলে কোথায় বসানো সুবিধা?', 'Many services need the same limit. Where is it handiest?'),
        options: [tr('সবার সামনে API gateway-তে', 'In the API gateway in front of them all'), tr('প্রতিটা service-এ আলাদা কপি', 'A separate copy in every service'), tr('Database-এর ভেতরে', 'Inside the database'), tr('CDN-এর cache-এ', 'In the CDN cache')],
        explain: tr('এক জায়গায় নিয়ম, এক জায়গায় গোনা: সহজ আর একরকম।', 'One place for rules and counting: simpler and consistent.') },
      { id: 'l4-x3', concept: 'where', prompt: tr('Rate limiter-এর নিয়ম (কার কত সীমা) কোথায় রাখবেন?', 'Where do the limiter\'s rules (who gets what) live?'),
        options: [tr('Config-এ, limiter memory-তে cache করে পড়ে', 'In config, cached in the limiter\'s memory'), tr('প্রতিটা request-এর header-এ', 'In every request header'), tr('User-এর browser-এ', 'In the user\'s browser'), tr('Code-এ hard-coded, বদলাতে deploy', 'Hard-coded, redeploy to change')],
        explain: tr('নিয়ম বদলায় কম, পড়া হয় প্রতিবার: config + cache।', 'Rules change rarely and are read every time: config plus a cache.') },
      { id: 'l4-x4', concept: 'reply', prompt: tr('429-এর সাথে Retry-After header কেন দেবেন?', 'Why send Retry-After with a 429?'),
        options: [tr('ভালো client জানে কখন আবার চেষ্টা করবে', 'Good clients know when to try again'), tr('Browser-এর cache নিজে থেকে সাফ হয়', 'It clears the browser cache'), tr('পরের request আগের চেয়ে দ্রুত চলে', 'It makes the next request faster'), tr('আইনগত বাধ্যবাধকতা, তাই দিতে হয়', 'It is a legal requirement')],
        explain: tr('অপেক্ষার সময় বললে client এলোমেলো retry করে চাপ বাড়ায় না।', 'Telling the wait stops clients from piling on random retries.') },
      { id: 'l4-x5', concept: 'reply', prompt: tr('সীমা পেরোনো request সাথে সাথে ফেলে না দিয়ে আর কী করা যায়?', 'Instead of dropping over-limit requests, what else can you do?'),
        options: [tr('পরে করার জন্য queue-তে রাখা', 'Put them on a queue to process later'), tr('Database-এ সরাসরি পাঠানো', 'Send them straight to the database'), tr('Client-কে block list-এ চিরতরে', 'Ban the client for ever'), tr('Response-এ 200 দিয়ে ফেলে দেওয়া', 'Reply 200 and drop them')],
        explain: tr('জরুরি না এমন কাজ (যেমন report) queue-তে রেখে পরে করা যায়।', 'Non-urgent work, like reports, can wait in a queue.') },
      { id: 'l4-x6', concept: 'reply', prompt: tr('Client কীভাবে জানবে তার আর কয়টা request বাকি?', 'How can a client know how many requests it has left?'),
        options: [tr('X-RateLimit-Remaining header', 'An X-RateLimit-Remaining header'), tr('Error message-এর রঙ দেখে', 'By the colour of the error'), tr('প্রতিবার আবার login করে', 'By logging in again each time'), tr('জানার কোনো উপায় নেই', 'There is no way to know')],
        explain: tr('Remaining আর reset header দিলে client নিজেই গতি কমায়।', 'Remaining and reset headers let clients slow themselves down.') },
      { id: 'l4-x7', concept: 'race', prompt: tr('২০টা API server-এ limit একটাই রাখতে counter কোথায় রাখবেন?', 'Twenty API servers, one shared limit. Where does the counter live?'),
        options: [tr('একটা shared store-এ, যেমন Redis', 'In a shared store such as Redis'), tr('প্রতিটা server-এর memory-তে', 'In each server\'s memory'), tr('Client-এর cookie-তে', 'In the client\'s cookie'), tr('Log file-এ', 'In a log file')],
        explain: tr('আলাদা memory-তে রাখলে প্রত্যেকে নিজের হিসাব রাখে: আসল সীমা ২০ গুণ।', 'Separate memories each keep their own count: the real limit becomes 20×.') },
      { id: 'l4-x8', concept: 'race', prompt: tr('Counter পড়া আর বাড়ানো আলাদা দুই ধাপে করলে কী হয়?', 'What happens if reading and incrementing the counter are two separate steps?'),
        options: [tr('দুই server একসাথে পড়ে দুজনেই ঢুকতে দেয়', 'Two servers read at once and both let one in'), tr('Counter নিজে থেকে শূন্য হয়ে যায়', 'The counter quietly resets to zero'), tr('কিছুই হয় না, গোনা ঠিকই থাকে', 'Nothing; the count stays correct'), tr('Redis চাপ সামলাতে না পেরে বন্ধ হয়', 'Redis gives up under the load')],
        explain: tr('Atomic INCR বা Lua script: পড়া আর বাড়ানো এক ধাপে।', 'Use atomic INCR or a Lua script: read and increment in one step.') },
      { id: 'l4-x9', concept: 'race', prompt: tr('Limiter-এর Redis বন্ধ হলে order API-তে কী করা যুক্তিসঙ্গত?', 'The limiter\'s Redis is down. What is sensible for the order API?'),
        options: [tr('কিছুক্ষণ সীমা ছাড়াই ঢুকতে দেওয়া (fail open)', 'Let requests through for a while (fail open)'), tr('Redis না ফেরা পর্যন্ত সব order বন্ধ', 'Stop all orders until Redis is back'), tr('এলোমেলোভাবে অর্ধেক request ফেলে দেওয়া', 'Drop a random half of the requests'), tr('মূল database-এ counter রাখা শুরু', 'Start counting in the main database')],
        explain: tr('Order নেওয়া ব্যবসা; কিছুক্ষণ সীমা না থাকা কম ক্ষতি। Login-এর মতো জায়গায় উল্টো।', 'Taking orders is the business; a short spell without limits costs less. Login is the opposite.') },
      { id: 'l4-x10', concept: 'algo', prompt: tr('ছোট burst চলতে দিতে, কিন্তু গড় সীমায় রাখতে কোন algorithm?', 'Which algorithm allows short bursts but keeps the average in check?'),
        options: ['Token bucket', 'Fixed window counter', tr('একটা global lock', 'A global lock'), tr('কোনো limit না', 'No limit at all')],
        explain: tr('Bucket-এ জমা token দিয়ে burst চলে, ভরার গতি দিয়ে গড় বাঁধা।', 'Saved tokens allow bursts; the refill rate caps the average.') },
      { id: 'l4-x11', concept: 'algo', prompt: tr('Sliding window log-এর খরচ কোথায়?', 'Where is the cost of a sliding window log?'),
        options: [tr('প্রতিটা request-এর সময় রাখতে memory বেশি', 'Memory to store every request time'), tr('মিনিটের কিনারায় দ্বিগুণ ঢুকে যায়', 'It lets double in at the edge'), tr('ছোট burst একদমই চলতে দেয় না', 'It cannot handle any bursts'), tr('কোনো খরচ নেই, সবচেয়ে সস্তা', 'It costs nothing at all')],
        explain: tr('নির্ভুল, কিন্তু প্রতিটা request-এর timestamp রাখতে হয়।', 'Accurate, but it keeps a timestamp for every request.') },
      { id: 'l4-x12', concept: 'key', prompt: tr('একই office-এর ৫০০ জন একই public IP থেকে আসে। IP ধরে limit দিলে?', '500 people in one office share one public IP. Limiting by IP will…'),
        options: [tr('নিরীহ user-রাও একসাথে আটকে যায়', 'Block innocent users together'), tr('ঠিকঠাক কাজ করবে, কোনো সমস্যা নেই', 'Work perfectly'), tr('Bot ধরা আগের চেয়ে সহজ হবে', 'Make bots easier to catch'), tr('Database-এর চাপ কমে বাঁচবে', 'Save the database')],
        explain: tr('Login করা user-দের জন্য user ID বা API key ভালো চাবি।', 'For signed-in users, a user ID or API key is a better key.') },
      { id: 'l4-x13', concept: 'key', prompt: tr('Login-এর আগের page (যেমন OTP পাঠানো) কীসে limit করবেন?', 'How do you limit a pre-login endpoint such as "send OTP"?'),
        options: [tr('Phone number আর IP মিলিয়ে', 'By phone number combined with IP'), tr('User ID দিয়ে', 'By the user ID of the caller'), tr('কোনো limit লাগে না', 'It needs no limit before login'), tr('Browser-এর ভাষা দিয়ে', 'By the language of the browser')],
        explain: tr('Login-এর আগে user ID নেই; যাকে OTP যাচ্ছে সেই নম্বরই ভালো চাবি, সাথে IP।', 'Before login there is no user ID; the target phone number, plus IP, is the key.') },
      { id: 'l4-x14', concept: 'key', prompt: tr('Merchant API-তে API key ধরে limit দেওয়ার সুবিধা কী?', 'What is good about limiting the merchant API by API key?'),
        options: [tr('প্রতি merchant নিজের সীমা পায়', 'Each merchant gets its own limit'), tr('Key ছাড়াই সবাই ঢুকতে পারে', 'Anyone can get in without a key'), tr('Database-এ index লাগে না', 'The database needs no index'), tr('Bot আর কখনো আসে না', 'Bots never come back again')],
        explain: tr('API key = কে ডাকছে। Plan অনুযায়ী আলাদা সীমা দেওয়াও সহজ।', 'An API key says who is calling, and makes per-plan limits easy.') },
    ],
  },
};
