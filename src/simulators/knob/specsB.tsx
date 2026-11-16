import { bn } from '@/shared/lib/bn';
import { Bars, fmt, Strip } from './KnobSim';
import { spec } from './specsA';

/* L21 · stream aggregation */
const LATE = [[5, 0.8], [30, 0.15], [90, 0.04], [600, 0.01]] as const; // [seconds late, share]
export const stream = spec<{ lateness: number; updates: boolean }>({
  title: 'মিনিটে কত parcel',
  intro: 'প্রতি মিনিটে কত parcel scan হল, live dashboard-এ। কিছু scan দেরিতে আসে: rider-এর ফোনে network ছিল না।',
  init: { lateness: 0, updates: false },
  controls: [
    { kind: 'slider', key: 'lateness', label: 'Watermark: কত দেরি পর্যন্ত অপেক্ষা', min: 0, max: 120, step: 5, unit: 'সে.' },
    { kind: 'toggle', key: 'updates', label: 'আগে ফল দাও, দেরিতে আসা scan এলে ফল শুধরে দাও' },
  ],
  model: (s) => {
    const waitedFor = s.updates ? 600 : s.lateness;
    const dropped = LATE.filter(([sec]) => sec > waitedFor).reduce((a, [, p]) => a + p, 0) * 100;
    const delay = s.lateness;
    return {
      readings: [
        { id: 'dropped', label: 'বাদ পড়া scan', value: dropped, unit: '%', digits: 1, good: dropped <= 1 },
        { id: 'delay', label: 'ফল দেখাতে দেরি', value: delay, unit: 'সে.', good: delay <= 10 },
      ],
      picture: <Strip cells={LATE.map(([sec, p]) => ({ label: sec >= 600 ? '২ মিনিট+' : `≤ ${bn(sec)} সে.`, flex: Math.max(0.6, p * 10), color: sec <= waitedFor ? '#BFEBDD' : '#FFD9D4', sub: `${bn(Math.round(p * 100))}%` }))} />,
      note: s.updates ? 'Window শেষে প্রথম ফল যায়; দেরির scan এলে সেই মিনিটের সংখ্যা আপডেট হয়।' : undefined,
    };
  },
  missions: [
    { text: 'বাদ পড়া scan ১%-এর মধ্যে', ok: (_, r) => r.dropped! <= 1 },
    { text: 'ফল ১০ সেকেন্ডের মধ্যে dashboard-এ', ok: (_, r) => r.delay! <= 10 },
    { text: 'দুটোই একসাথে', ok: (_, r) => r.dropped! <= 1 && r.delay! <= 10, hint: 'অপেক্ষা না করে পরে শুধরে দিলে?' },
  ],
});

/* L22 · reservation and concurrency */
export const reservation = spec<{ strategy: string; users: number; ran: boolean; doubles: number; wait: number; retries: number }>({
  title: 'একটাই pickup slot',
  intro: 'বিকেল ৫টার pickup slot-এ জায়গা একটাই। অনেক merchant একসাথে "Book" চাপছে।',
  init: { strategy: 'none', users: 2, ran: false, doubles: 0, wait: 0, retries: 0 },
  controls: [
    { kind: 'choice', key: 'strategy', label: 'Book করার নিয়ম', options: [{ id: 'none', label: 'পড়ো, তারপর লেখো' }, { id: 'lock', label: 'SELECT … FOR UPDATE' }, { id: 'optimistic', label: 'Version দিয়ে (optimistic)' }, { id: 'unique', label: 'Unique constraint' }] },
    { kind: 'slider', key: 'users', label: 'একসাথে merchant', min: 2, max: 100 },
  ],
  actions: [{
    label: 'সবাই একসাথে Book', tone: 'go',
    run: (s) => ({ ran: true, doubles: s.strategy === 'none' ? s.users - 1 : 0, wait: s.strategy === 'lock' ? s.users * 20 : 8, retries: s.strategy === 'optimistic' ? s.users - 1 : 0 }),
  }],
  model: (s) => ({
    readings: [
      { id: 'doubles', label: 'বাড়তি booking', value: s.ran ? s.doubles : 0, good: s.ran ? s.doubles === 0 : undefined },
      { id: 'wait', label: 'সবচেয়ে বেশি অপেক্ষা', value: s.ran ? s.wait : 0, unit: 'ms', good: s.ran ? s.wait <= 100 : undefined },
      { id: 'retries', label: 'ব্যর্থ হয়ে আবার', value: s.ran ? s.retries : 0 },
    ],
    picture: <div className="grid grid-cols-10 gap-1" role="img" aria-label="কে slot পেল">
      {Array.from({ length: Math.min(s.users, 50) }, (_, i) => {
        const got = i === 0 || (s.ran && s.strategy === 'none');
        return <span key={i} className={`grid aspect-square place-items-center rounded-md border-2 border-ink text-[10px] font-bold ${!s.ran ? 'bg-white' : got ? (i === 0 ? 'bg-route text-white' : 'bg-coral text-white') : 'bg-[#E3E6DF]'}`}>{s.ran ? (got ? '✓' : '✕') : bn(i + 1)}</span>;
      })}
    </div>,
    note: s.ran ? (s.doubles ? `${bn(s.doubles + 1)} জন একই slot পেল! দুজনেই পড়েছিল "খালি", তারপর দুজনেই লিখেছে।` : s.strategy === 'lock' ? 'এক এক করে: সঠিক, কিন্তু লাইনের শেষজন অপেক্ষা করল।' : 'একজনই পেল, বাকিরা সাথে সাথে "slot নেই" জানল।') : undefined,
  }),
  missions: [
    { text: 'একসাথে book করে double booking ঘটান', ok: (s) => s.ran && s.doubles > 0 },
    { text: 'Double booking শূন্য', ok: (s) => s.ran && s.doubles === 0 },
    { text: '১০০ জন একসাথে: double নেই, কারো অপেক্ষা ১০০ ms-এর বেশি নয়', ok: (s) => s.ran && s.users >= 100 && s.doubles === 0 && s.wait <= 100, hint: 'Lock-এ সবাই লাইনে দাঁড়ায়।' },
  ],
});

/* L23 · email service */
export const email = spec<{ auth: boolean; warm: boolean; suppress: boolean; unsub: boolean; rate: number }>({
  title: 'Receipt যেন spam-এ না যায়',
  intro: 'প্রতিটা delivery-র পর receipt email। কিন্তু অর্ধেক যাচ্ছে spam folder-এ।',
  init: { auth: false, warm: false, suppress: false, unsub: false, rate: 50 },
  controls: [
    { kind: 'toggle', key: 'auth', label: 'SPF, DKIM, DMARC' },
    { kind: 'toggle', key: 'warm', label: 'নতুন IP ধীরে ধীরে গরম করা' },
    { kind: 'toggle', key: 'suppress', label: 'Bounce হওয়া ঠিকানা বাদ' },
    { kind: 'toggle', key: 'unsub', label: 'এক click-এ unsubscribe' },
    { kind: 'slider', key: 'rate', label: 'পাঠানোর হার (হাজার/ঘণ্টা)', min: 5, max: 100, step: 5 },
  ],
  model: (s) => {
    let inbox = 99;
    if (!s.auth) inbox -= 40;
    if (!s.warm && s.rate > 10) inbox -= 25;
    if (!s.suppress) inbox -= 8;
    if (!s.unsub) inbox -= 6;
    inbox = Math.max(5, inbox);
    const complaints = (s.unsub ? 0.02 : 0.25) + (s.suppress ? 0 : 0.05);
    return {
      readings: [
        { id: 'inbox', label: 'Inbox-এ পৌঁছায়', value: inbox, unit: '%', good: inbox >= 95 },
        { id: 'complaints', label: 'Spam অভিযোগ', value: complaints, unit: '%', digits: 2, good: complaints <= 0.1 },
        { id: 'rate', label: 'হার / ঘণ্টা', value: s.rate * 1000 },
      ],
      picture: <Bars rows={[{ label: 'Inbox', value: inbox, max: 100, target: 95, bad: inbox < 95, text: `${bn(inbox)}%` }, { label: 'Spam folder', value: 100 - inbox, max: 100, bad: true, text: `${bn(100 - inbox)}%` }]} />,
    };
  },
  missions: [
    { text: 'Spam অভিযোগ ০.১%-এর নিচে', ok: (_, r) => r.complaints! <= 0.1 },
    { text: '৯৫%+ email inbox-এ', ok: (_, r) => r.inbox! >= 95 },
    { text: 'ঘণ্টায় ৫০ হাজার+ পাঠিয়েও ৯৫%+ inbox-এ', ok: (s, r) => s.rate >= 50 && r.inbox! >= 95 },
  ],
});

/* L24 · object storage */
export const objectStore = spec<{ scheme: string; coldAfter: number }>({
  title: 'POD ছবির খরচ',
  intro: 'প্রতিটা delivery-র proof-of-delivery ছবি, মাসে ১০ TB নতুন, এক বছর রাখতে হয়। ৯০% দেখা হয় প্রথম ৩০ দিনে।',
  init: { scheme: 'rep3', coldAfter: 0 },
  controls: [
    { kind: 'choice', key: 'scheme', label: 'Data রক্ষা', options: [{ id: 'rep3', label: '৩টা copy' }, { id: 'ec', label: 'Erasure coding (৮+৪)' }] },
    { kind: 'slider', key: 'coldAfter', label: 'কত দিন পর cold storage-এ (০ = কখনো না)', min: 0, max: 360, step: 10, unit: 'দিন' },
  ],
  model: (s) => {
    const tb = 120;
    const overhead = s.scheme === 'rep3' ? 3 : 1.5;
    const hotShare = s.coldAfter === 0 ? 1 : Math.min(1, s.coldAfter / 365);
    const cost = tb * overhead * (hotShare * 23 + (1 - hotShare) * 4);
    const nines = s.scheme === 'rep3' ? 9 : 11;
    const slowRecent = s.coldAfter > 0 && s.coldAfter < 30;
    return {
      readings: [
        { id: 'cost', label: 'মাসিক খরচ', value: cost, unit: '$', good: cost <= 2000 },
        { id: 'nines', label: 'Durability', value: nines, unit: 'টা ৯', good: nines >= 11 },
        { id: 'disk', label: 'আসল disk', value: tb * overhead, unit: 'TB' },
        { id: 'slow', label: 'নতুন ছবি ধীরে খোলে', value: slowRecent ? 1 : 0, good: !slowRecent },
      ],
      picture: <Bars rows={[
        { label: 'Hot storage', value: tb * overhead * hotShare, max: 360, text: `${fmt(tb * overhead * hotShare)} TB` },
        { label: 'Cold storage', value: tb * overhead * (1 - hotShare), max: 360, text: `${fmt(tb * overhead * (1 - hotShare))} TB` },
      ]} />,
      note: slowRecent ? 'প্রথম মাসেই ছবি cold-এ: customer-এর অভিযোগের সময় ছবি খুলতে মিনিট লাগবে।' : undefined,
    };
  },
  missions: [
    { text: 'Durability ১১টা ৯', ok: (_, r) => r.nines! >= 11 },
    { text: 'মাসিক খরচ $২,০০০-এর নিচে', ok: (_, r) => r.cost! <= 2000 },
    { text: '১১টা ৯, $২,০০০-এর নিচে, আর নতুন ছবি দ্রুত খোলে', ok: (_, r) => r.nines! >= 11 && r.cost! <= 2000 && r.slow === 0 },
  ],
});

/* L25 · leaderboard */
export const leaderboard = spec<{ store: string; users: number }>({
  title: 'Rider ranking',
  intro: 'প্রতিটা delivery-তে rider পয়েন্ট পায়। App খুললেই "আপনি কত নম্বরে" আর সেরা ১০ জন।',
  init: { store: 'sql', users: 1 },
  controls: [
    { kind: 'choice', key: 'store', label: 'কোথায় রাখবেন', options: [{ id: 'sql', label: 'SQL + ORDER BY' }, { id: 'zset', label: 'Redis sorted set' }] },
    { kind: 'slider', key: 'users', label: 'Rider (লাখ)', min: 1, max: 500, step: 1 },
  ],
  model: (s) => {
    const n = s.users * 100_000;
    const rank = s.store === 'sql' ? n * 0.00002 : 0.05 + Math.log2(n) * 0.005;
    const top = s.store === 'sql' ? 2 : 0.05;
    const mem = s.store === 'zset' ? (n * 100) / 1e9 : 0;
    return {
      readings: [
        { id: 'rank', label: '"আমি কত নম্বরে"', value: rank, unit: 'ms', digits: rank < 10 ? 2 : 0, good: rank <= 10 },
        { id: 'top', label: 'সেরা ১০', value: top, unit: 'ms', digits: 2, good: top <= 5 },
        { id: 'mem', label: 'Memory', value: mem, unit: 'GB', digits: 1, good: mem <= 8 },
        { id: 'n', label: 'Rider', value: n },
      ],
      picture: <Bars rows={[{ label: 'Rank query (log)', value: Math.log10(rank * 100), max: 6, bad: rank > 10, text: `${fmt(rank, rank < 10 ? 2 : 0)} ms` }]} />,
      note: s.store === 'sql' && rank > 10 ? 'নিজের rank জানতে নিজের চেয়ে বেশি পয়েন্টের সবাইকে গুনতে হয়: O(n)।' : undefined,
    };
  },
  missions: [
    { text: '১ কোটি rider-এ rank ১০ ms-এর মধ্যে', ok: (s, r) => s.users >= 100 && r.rank! <= 10 },
    { text: 'SQL-এ ১ কোটিতে rank কত ধীর দেখুন', ok: (s, r) => s.store === 'sql' && s.users >= 100 && r.rank! > 100 },
    { text: '৫ কোটি rider: rank ১০ ms-এর মধ্যে, memory ৮ GB-এর মধ্যে', ok: (s, r) => s.users >= 500 && r.rank! <= 10 && r.mem! <= 8 },
  ],
});

/* L27 · digital wallet, distributed transaction */
export const wallet = spec<{ approach: string; crashes: number; lost: number; locked: number }>({
  title: 'Payout মাঝপথে',
  intro: 'Merchant-এর wallet থেকে ৳৫০০ rider-এর wallet-এ। দুটো আলাদা database, মাঝপথে service crash করতে পারে।',
  init: { approach: 'naive', crashes: 0, lost: 0, locked: 0 },
  controls: [{ kind: 'choice', key: 'approach', label: 'কীভাবে', options: [{ id: 'naive', label: 'কাটো, তারপর জমা' }, { id: '2pc', label: 'Two-phase commit' }, { id: 'saga', label: 'Saga (ফেরতের ধাপসহ)' }] }],
  actions: [{ label: 'কাটার পর, জমার আগে crash', tone: 'warn', run: (s) => ({ crashes: s.crashes + 1, lost: s.approach === 'naive' ? 500 : 0, locked: s.approach === '2pc' ? 30 : 0 }) }],
  model: (s) => ({
    readings: [
      { id: 'lost', label: 'হারানো টাকা', value: s.lost, unit: '৳', good: s.crashes ? s.lost === 0 : undefined },
      { id: 'locked', label: 'টাকা আটকে (সে.)', value: s.locked, good: s.crashes ? s.locked === 0 : undefined },
    ],
    picture: <Strip cells={[
      { label: 'Merchant −৳৫০০', flex: 1, color: '#FFD9D4', sub: s.crashes ? 'হয়েছে' : '' },
      { label: s.crashes ? 'crash!' : '→', flex: 0.6, color: s.crashes ? '#E0483E' : '#FFFFFF' },
      { label: 'Rider +৳৫০০', flex: 1, color: '#BFEBDD', sub: s.crashes ? (s.approach === 'naive' ? 'হয়নি' : s.approach === 'saga' ? 'ফেরত' : 'অপেক্ষায়') : '' },
    ]} />,
    note: s.crashes ? (s.approach === 'naive' ? 'Merchant-এর টাকা কাটা, rider পায়নি: ৳৫০০ বাতাসে মিলিয়ে গেল।' : s.approach === '2pc' ? 'Coordinator ফেরা পর্যন্ত দুটো wallet-ই lock: কেউ কিছু করতে পারছে না।' : 'Saga ফেরতের ধাপ চালাল: merchant টাকা ফেরত পেল, পরে আবার চেষ্টা হবে।') : undefined,
  }),
  missions: [
    { text: 'মাঝপথে crash করিয়ে টাকা হারাতে দেখুন', ok: (s) => s.crashes > 0 && s.lost > 0 },
    { text: 'Crash হলেও টাকা যেন না হারায়', ok: (s) => s.crashes > 0 && s.lost === 0 },
    { text: 'টাকা না হারিয়ে, আর কোনো wallet lock না রেখে', ok: (s) => s.crashes > 0 && s.lost === 0 && s.locked === 0 },
  ],
});

/* L28 · stock exchange matching */
export const exchange = spec<{ engine: string; seq: boolean; priority: string; tested: boolean }>({
  title: 'দ্রুততম matching',
  intro: 'Delivery slot-এর নিলাম: merchant দাম হাঁকে, rider-রা দেয়। Matching engine কেমন হবে?',
  init: { engine: 'db', seq: false, priority: 'random', tested: false },
  controls: [
    { kind: 'choice', key: 'engine', label: 'Order book', options: [{ id: 'db', label: 'Database-এ' }, { id: 'mem', label: 'Memory-তে, এক thread' }] },
    { kind: 'toggle', key: 'seq', label: 'Sequencer: প্রতিটা order-এ ক্রমিক নম্বর' },
    { kind: 'choice', key: 'priority', label: 'একই দামে আগে কে', options: [{ id: 'random', label: 'যে কেউ' }, { id: 'time', label: 'যে আগে এসেছে' }] },
  ],
  actions: [{ label: 'একই দামে ৩টা order পাঠান', tone: 'go', run: () => ({ tested: true }) }],
  model: (s) => {
    const latency = s.engine === 'db' ? 20 : 0.05;
    const fair = s.priority === 'time';
    const order = s.tested ? (fair ? ['A (১০:০০:০০.১)', 'B (১০:০০:০০.২)', 'C (১০:০০:০০.৩)'] : ['C', 'A', 'B']) : [];
    return {
      readings: [
        { id: 'latency', label: 'Match latency', value: latency, unit: 'ms', digits: 2, good: latency <= 1 },
        { id: 'fair', label: 'ন্যায্য ক্রম', value: fair ? 1 : 0, good: s.tested ? fair : undefined },
        { id: 'replay', label: 'Replay-তে একই ফল', value: s.seq && s.engine === 'mem' ? 1 : 0, good: s.seq && s.engine === 'mem' },
      ],
      picture: s.tested ? <ol className="m-0 flex flex-col gap-1.5 pl-6 text-sm">{order.map((o) => <li key={o} className="pop-in rounded-lg bg-white px-3 py-1.5">{o}</li>)}</ol> : <p className="m-0 text-muted">"৩টা order" চাপুন।</p>,
    };
  },
  missions: [
    { text: 'Match ১ ms-এর মধ্যে', ok: (_, r) => r.latency! <= 1 },
    { text: 'একই দামে যে আগে এসেছে সে আগে পায়, পরীক্ষা করে দেখান', ok: (s) => s.tested && s.priority === 'time' },
    { text: 'দ্রুত, ন্যায্য, আর crash-এর পর replay করলে হুবহু একই ফল', ok: (s, r) => r.latency! <= 1 && s.priority === 'time' && r.replay === 1 },
  ],
});

/* L29 · resilience */
export const resilience = spec<{ down: boolean; timeout: number; retries: number; jitter: boolean; breaker: boolean; outbox: boolean }>({
  title: 'টিকে থাকার নিয়ম',
  intro: 'Order service সেকেন্ডে ২০০ বার SMS service ডাকে, ২০০টা thread। SMS service পড়ে গেলে order-ও কি পড়বে?',
  init: { down: true, timeout: 5000, retries: 3, jitter: false, breaker: false, outbox: false },
  controls: [
    { kind: 'toggle', key: 'down', label: 'SMS service বন্ধ' },
    { kind: 'slider', key: 'timeout', label: 'Timeout', min: 100, max: 10000, step: 100, unit: 'ms' },
    { kind: 'slider', key: 'retries', label: 'Retry', min: 0, max: 5 },
    { kind: 'toggle', key: 'jitter', label: 'Exponential backoff + jitter' },
    { kind: 'toggle', key: 'breaker', label: 'Circuit breaker' },
    { kind: 'toggle', key: 'outbox', label: 'Outbox table (event আগে DB-তে)' },
  ],
  model: (s) => {
    const rps = 200, threads = 200;
    const tries = 1 + s.retries;
    const open = s.down && s.breaker;
    const busy = !s.down ? 10 : open ? 2 : Math.min(100, ((rps * (s.timeout / 1000) * tries) / threads) * 100);
    const lost = s.down && !s.outbox ? 100 : 0;
    const surge = s.breaker ? 1.2 : s.jitter ? 1 + s.retries * 0.3 : tries;
    return {
      readings: [
        { id: 'busy', label: 'আটকে থাকা thread', value: busy, unit: '%', good: busy <= 50 },
        { id: 'lost', label: 'হারানো SMS', value: lost, unit: '%', good: lost === 0 },
        { id: 'surge', label: 'ফেরার সময় চাপ', value: surge, unit: '×', digits: 1, good: surge <= 2 },
      ],
      picture: <Bars rows={[
        { label: 'Thread pool', value: busy, max: 100, target: 50, bad: busy > 50, text: `${bn(Math.round(busy))}%` },
        { label: 'SMS service ফেরার মুহূর্তে চাপ', value: surge, max: 6, target: 2, bad: surge > 2, text: `${fmt(surge, 1)}×` },
      ]} />,
      note: s.down && busy >= 100 ? 'সব thread SMS-এর অপেক্ষায়: নতুন order-ই নেওয়া যাচ্ছে না। এক service-এর অসুখ সবার।' : open ? 'Breaker খোলা: SMS-কে ডাকাই হচ্ছে না, order চলছে।' : undefined,
    };
  },
  missions: [
    { text: 'SMS বন্ধ থাকলেও thread ৫০%-এর কম আটকে', ok: (s, r) => s.down && r.busy! <= 50 },
    { text: 'SMS বন্ধ থাকলেও একটাও SMS যেন না হারায়', ok: (s, r) => s.down && r.lost === 0 },
    { text: 'তিনটাই: thread মুক্ত, কিছু হারায় না, ফেরার সময় চাপ ২×-এর কম', ok: (s, r) => s.down && r.busy! <= 50 && r.lost === 0 && r.surge! <= 2 },
  ],
});

/* L30 · the interview itself */
export const interview = spec<{ req: number; est: number; hld: number; deep: number; wrap: number; ask: boolean; trade: boolean; diagram: boolean }>({
  title: '৪৫ মিনিট ভাগ করুন',
  intro: 'আসল interview-এর আগে সময়ের পরিকল্পনা। কোন ধাপে কত মিনিট, আর কোন অভ্যাসগুলো রাখবেন?',
  init: { req: 2, est: 10, hld: 25, deep: 5, wrap: 3, ask: false, trade: false, diagram: false },
  controls: [
    { kind: 'slider', key: 'req', label: 'প্রয়োজন বোঝা', min: 0, max: 15, unit: 'মি' },
    { kind: 'slider', key: 'est', label: 'হিসাব', min: 0, max: 15, unit: 'মি' },
    { kind: 'slider', key: 'hld', label: 'High-level design', min: 0, max: 30, unit: 'মি' },
    { kind: 'slider', key: 'deep', label: 'Deep dive', min: 0, max: 30, unit: 'মি' },
    { kind: 'slider', key: 'wrap', label: 'শেষ কথা', min: 0, max: 10, unit: 'মি' },
    { kind: 'toggle', key: 'ask', label: 'শুরুতে প্রশ্ন করি, ধরে নিই না' },
    { kind: 'toggle', key: 'trade', label: 'প্রতিটা বাছাইয়ে trade-off নিজে বলি' },
    { kind: 'toggle', key: 'diagram', label: 'Deep dive-এর আগে পুরো ছবি আঁকি' },
  ],
  model: (s) => {
    const total = s.req + s.est + s.hld + s.deep + s.wrap;
    const inRange = [[s.req, 3, 10], [s.est, 3, 10], [s.hld, 10, 20], [s.deep, 10, 25], [s.wrap, 2, 5]].filter(([v, lo, hi]) => v! >= lo! && v! <= hi!).length;
    const habits = [s.ask, s.trade, s.diagram].filter(Boolean).length;
    const score = (total <= 45 ? 30 : 0) + inRange * 10 + habits * 7;
    return {
      readings: [
        { id: 'total', label: 'মোট', value: total, unit: 'মিনিট', good: total <= 45 },
        { id: 'inRange', label: 'ঠিক মাপের ধাপ', value: inRange, unit: '/৫', good: inRange === 5 },
        { id: 'score', label: 'প্রস্তুতি', value: Math.min(100, score), unit: '/১০০', good: score >= 90 },
      ],
      picture: <Strip cells={[
        { label: 'প্রয়োজন', flex: Math.max(0.3, s.req), color: '#FFE7A8', sub: bn(s.req) },
        { label: 'হিসাব', flex: Math.max(0.3, s.est), color: '#C8E6FF', sub: bn(s.est) },
        { label: 'HLD', flex: Math.max(0.3, s.hld), color: '#BFEBDD', sub: bn(s.hld) },
        { label: 'Deep dive', flex: Math.max(0.3, s.deep), color: '#C7D3F5', sub: bn(s.deep) },
        { label: 'শেষ', flex: Math.max(0.3, s.wrap), color: '#E3D7F5', sub: bn(s.wrap) },
      ]} />,
      note: s.deep < 10 ? 'Deep dive-এ সময় কম: senior interview-এ এখানেই পার্থক্য হয়।' : s.req < 3 ? 'প্রয়োজন না বুঝে শুরু করলে ভুল জিনিস design করবেন।' : undefined,
    };
  },
  missions: [
    { text: 'মোট ৪৫ মিনিটের মধ্যে', ok: (_, r) => r.total! <= 45 },
    { text: 'পাঁচটা ধাপই ঠিক মাপে', ok: (_, r) => r.inRange === 5 && r.total! <= 45, hint: 'প্রয়োজন ৩–১০, হিসাব ৩–১০, HLD ১০–২০, deep dive ১০–২৫, শেষ ২–৫।' },
    { text: 'প্রস্তুতি ৯০+', ok: (_, r) => r.score! >= 90 },
  ],
});
