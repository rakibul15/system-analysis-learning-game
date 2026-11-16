import { bn } from '@/shared/lib/bn';
import { Bars, fmt, Strip } from './KnobSim';
import { spec } from './specsA';
import { CoinRun, Conveyor, Flow, InterviewClock, Ranking, Rush, vis, Windows } from './anim';
import { tr } from '@/shared/lib/i18n';

/* L21 · stream aggregation */
const LATE = [[5, 0.8], [30, 0.15], [90, 0.04], [600, 0.01]] as const; // [seconds late, share]
export const stream = spec<{ lateness: number; updates: boolean }>({
  title: tr('মিনিটে কত parcel', 'Parcels per minute'),
  intro: tr('প্রতি মিনিটে কত parcel scan হল, live dashboard-এ। কিছু scan দেরিতে আসে: rider-এর ফোনে network ছিল না।', 'How many parcels were scanned each minute, on a live dashboard. Some scans arrive late: the rider\'s phone had no network.'),
  init: { lateness: 0, updates: false },
  controls: [
    { kind: 'slider', key: 'lateness', label: tr('Watermark: কত দেরি পর্যন্ত অপেক্ষা', 'Watermark: how long to wait for late scans'), min: 0, max: 120, step: 5, unit: tr('সে.', 's') },
    { kind: 'toggle', key: 'updates', label: tr('আগে ফল দাও, দেরিতে আসা scan এলে ফল শুধরে দাও', 'Publish first, correct when late scans arrive') },
  ],
  model: (s) => {
    const waitedFor = s.updates ? 600 : s.lateness;
    const dropped = LATE.filter(([sec]) => sec > waitedFor).reduce((a, [, p]) => a + p, 0) * 100;
    const delay = s.lateness;
    return {
      readings: [
        { id: 'dropped', label: tr('বাদ পড়া scan', 'Dropped scans'), value: dropped, unit: '%', digits: 1, good: dropped <= 1 },
        { id: 'delay', label: tr('ফল দেখাতে দেরি', 'Delay before results show'), value: delay, unit: tr('সে.', 's'), good: delay <= 10 },
      ],
      picture: <>
      <Windows waited={waitedFor} updates={s.updates} />
      <Strip cells={LATE.map(([sec, p]) => ({ label: sec >= 600 ? tr('২ মিনিট+', '2 min+') : `≤ ${bn(sec)} ${tr('সে.', 's')}`, flex: Math.max(0.6, p * 10), color: sec <= waitedFor ? '#BFEBDD' : '#FFD9D4', sub: `${bn(Math.round(p * 100))}%` }))} />
      </>,
      note: s.updates ? tr('Window শেষে প্রথম ফল যায়; দেরির scan এলে সেই মিনিটের সংখ্যা আপডেট হয়।', 'The first result goes out when the window closes; late scans update that minute\'s count.') : undefined,
    };
  },
  missions: [
    { text: tr('বাদ পড়া scan ১%-এর মধ্যে', 'Dropped scans within 1%'), ok: (_, r) => r.dropped! <= 1 },
    { text: tr('ফল ১০ সেকেন্ডের মধ্যে dashboard-এ', 'Results on the dashboard within 10 seconds'), ok: (_, r) => r.delay! <= 10 },
    { text: tr('দুটোই একসাথে', 'Both at once'), ok: (_, r) => r.dropped! <= 1 && r.delay! <= 10, hint: tr('অপেক্ষা না করে পরে শুধরে দিলে?', 'What if you correct later instead of waiting?') },
  ],
});

/* L22 · reservation and concurrency */
export const reservation = spec<{ strategy: string; users: number; ran: boolean; doubles: number; wait: number; retries: number; runs: number }>({
  title: tr('একটাই pickup slot', 'Only one pickup slot'),
  intro: tr('বিকেল ৫টার pickup slot-এ জায়গা একটাই। অনেক merchant একসাথে "Book" চাপছে।', 'The 5 p.m. pickup slot has room for one. Many merchants press "Book" at the same moment.'),
  init: { strategy: 'none', users: 2, ran: false, doubles: 0, wait: 0, retries: 0, runs: 0 },
  controls: [
    { kind: 'choice', key: 'strategy', label: tr('Book করার নিয়ম', 'Booking rule'), options: [{ id: 'none', label: tr('পড়ো, তারপর লেখো', 'Read, then write') }, { id: 'lock', label: 'SELECT … FOR UPDATE' }, { id: 'optimistic', label: tr('Version দিয়ে (optimistic)', 'With a version (optimistic)') }, { id: 'unique', label: 'Unique constraint' }] },
    { kind: 'slider', key: 'users', label: tr('একসাথে merchant', 'Merchants at once'), min: 2, max: 100 },
  ],
  actions: [{
    label: tr('সবাই একসাথে Book', 'Everyone books at once'), tone: 'go',
    run: (s) => ({ ran: true, runs: s.runs + 1, doubles: s.strategy === 'none' ? s.users - 1 : 0, wait: s.strategy === 'lock' ? s.users * 20 : 8, retries: s.strategy === 'optimistic' ? s.users - 1 : 0 }),
  }],
  model: (s) => ({
    readings: [
      { id: 'doubles', label: tr('বাড়তি booking', 'Extra bookings'), value: s.ran ? s.doubles : 0, good: s.ran ? s.doubles === 0 : undefined },
      { id: 'wait', label: tr('সবচেয়ে বেশি অপেক্ষা', 'Longest wait'), value: s.ran ? s.wait : 0, unit: 'ms', good: s.ran ? s.wait <= 100 : undefined },
      { id: 'retries', label: tr('ব্যর্থ হয়ে আবার', 'Failed and retried'), value: s.ran ? s.retries : 0 },
    ],
    picture: <>
    <Rush strategy={s.strategy} users={s.users} run={s.runs} />
    <div className="grid grid-cols-10 gap-1" role="img" aria-label={tr('কে slot পেল', 'Who got the slot')}>
      {Array.from({ length: Math.min(s.users, 50) }, (_, i) => {
        const got = i === 0 || (s.ran && s.strategy === 'none');
        return <span key={i} className={`grid aspect-square place-items-center rounded-md border-2 border-ink text-[10px] font-bold ${!s.ran ? 'bg-white' : got ? (i === 0 ? 'bg-route text-white' : 'bg-coral text-white') : 'bg-[#E3E6DF]'}`}>{s.ran ? (got ? '✓' : '✕') : bn(i + 1)}</span>;
      })}
    </div>
    </>,
    note: s.ran ? (s.doubles ? tr(`${bn(s.doubles + 1)} জন একই slot পেল! দুজনেই পড়েছিল "খালি", তারপর দুজনেই লিখেছে।`, `${s.doubles + 1} people got the same slot! Each read "free", then each wrote.`) : s.strategy === 'lock' ? tr('এক এক করে: সঠিক, কিন্তু লাইনের শেষজন অপেক্ষা করল।', 'One at a time: correct, but the last in line had to wait.') : tr('একজনই পেল, বাকিরা সাথে সাথে "slot নেই" জানল।', 'Only one got it; the rest heard "no slot" straight away.')) : undefined,
  }),
  missions: [
    { text: tr('একসাথে book করে double booking ঘটান', 'Book all at once and cause a double booking'), ok: (s) => s.ran && s.doubles > 0 },
    { text: tr('Double booking শূন্য', 'Zero double bookings'), ok: (s) => s.ran && s.doubles === 0 },
    { text: tr('১০০ জন একসাথে: double নেই, কারো অপেক্ষা ১০০ ms-এর বেশি নয়', '100 at once: no doubles, nobody waits more than 100 ms'), ok: (s) => s.ran && s.users >= 100 && s.doubles === 0 && s.wait <= 100, hint: tr('Lock-এ সবাই লাইনে দাঁড়ায়।', 'With a lock, everyone queues up.') },
  ],
});

/* L23 · email service */
export const email = spec<{ auth: boolean; warm: boolean; suppress: boolean; unsub: boolean; rate: number }>({
  title: tr('Receipt যেন spam-এ না যায়', 'Keep receipts out of spam'),
  intro: tr('প্রতিটা delivery-র পর receipt email। কিন্তু অর্ধেক যাচ্ছে spam folder-এ।', 'A receipt email after every delivery. But half of them land in the spam folder.'),
  init: { auth: false, warm: false, suppress: false, unsub: false, rate: 50 },
  controls: [
    { kind: 'toggle', key: 'auth', label: 'SPF, DKIM, DMARC' },
    { kind: 'toggle', key: 'warm', label: tr('নতুন IP ধীরে ধীরে গরম করা', 'Warm up the new IP slowly') },
    { kind: 'toggle', key: 'suppress', label: tr('Bounce হওয়া ঠিকানা বাদ', 'Drop bouncing addresses') },
    { kind: 'toggle', key: 'unsub', label: tr('এক click-এ unsubscribe', 'One-click unsubscribe') },
    { kind: 'slider', key: 'rate', label: tr('পাঠানোর হার (হাজার/ঘণ্টা)', 'Send rate (thousands/hour)'), min: 5, max: 100, step: 5 },
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
        { id: 'inbox', label: tr('Inbox-এ পৌঁছায়', 'Reaches the inbox'), value: inbox, unit: '%', good: inbox >= 95 },
        { id: 'complaints', label: tr('Spam অভিযোগ', 'Spam complaints'), value: complaints, unit: '%', digits: 2, good: complaints <= 0.1 },
        { id: 'rate', label: tr('হার / ঘণ্টা', 'Rate / hour'), value: s.rate * 1000 },
      ],
      picture: <>
      <Flow label={tr('Receipt email: inbox না spam', 'Receipt email: inbox or spam')} h={40} nodes={[
        { id: 's', label: 'ParcelGo', x: 10, y: 20, sub: `${bn(s.rate)}k/${tr('ঘণ্টা', 'hour')}` },
        { id: 'f', label: 'Gmail filter', x: 48, y: 20, tone: inbox < 95 ? 'hot' : 'ok', sub: s.auth ? 'SPF/DKIM ✓' : tr('পরিচয় নেই', 'no identity') },
        { id: 'i', label: 'Inbox', x: 88, y: 8 }, { id: 'x', label: 'Spam', x: 88, y: 32, tone: 'down' },
      ]} links={[
        { from: 's', to: 'f', rate: vis(s.rate * 1000) },
        { from: 'f', to: 'i', rate: (inbox / 100) * 10 },
        { from: 'f', to: 'x', rate: ((100 - inbox) / 100) * 10, color: '#E0483E' },
      ]} />
      <Bars rows={[{ label: 'Inbox', value: inbox, max: 100, target: 95, bad: inbox < 95, text: `${bn(inbox)}%` }, { label: 'Spam folder', value: 100 - inbox, max: 100, bad: true, text: `${bn(100 - inbox)}%` }]} />
      </>,
    };
  },
  missions: [
    { text: tr('Spam অভিযোগ ০.১%-এর নিচে', 'Spam complaints under 0.1%'), ok: (_, r) => r.complaints! <= 0.1 },
    { text: tr('৯৫%+ email inbox-এ', '95%+ of email in the inbox'), ok: (_, r) => r.inbox! >= 95 },
    { text: tr('ঘণ্টায় ৫০ হাজার+ পাঠিয়েও ৯৫%+ inbox-এ', '95%+ in the inbox while sending 50k+ an hour'), ok: (s, r) => s.rate >= 50 && r.inbox! >= 95 },
  ],
});

/* L24 · object storage */
export const objectStore = spec<{ scheme: string; coldAfter: number }>({
  title: tr('POD ছবির খরচ', 'The cost of POD photos'),
  intro: tr('প্রতিটা delivery-র proof-of-delivery ছবি, মাসে ১০ TB নতুন, এক বছর রাখতে হয়। ৯০% দেখা হয় প্রথম ৩০ দিনে।', 'A proof-of-delivery photo for every delivery: 10 TB new each month, kept for a year. 90% are viewed in the first 30 days.'),
  init: { scheme: 'rep3', coldAfter: 0 },
  controls: [
    { kind: 'choice', key: 'scheme', label: tr('Data রক্ষা', 'Data protection'), options: [{ id: 'rep3', label: tr('৩টা copy', '3 copies') }, { id: 'ec', label: tr('Erasure coding (৮+৪)', 'Erasure coding (8+4)') }] },
    { kind: 'slider', key: 'coldAfter', label: tr('কত দিন পর cold storage-এ (০ = কখনো না)', 'Days until cold storage (0 = never)'), min: 0, max: 360, step: 10, unit: tr('দিন', 'days') },
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
        { id: 'cost', label: tr('মাসিক খরচ', 'Monthly cost'), value: cost, unit: '$', good: cost <= 2000 },
        { id: 'nines', label: 'Durability', value: nines, unit: tr('টা ৯', 'nines'), good: nines >= 11 },
        { id: 'disk', label: tr('আসল disk', 'Raw disk'), value: tb * overhead, unit: 'TB' },
        { id: 'slow', label: tr('নতুন ছবি ধীরে খোলে', 'New photos open slowly'), value: slowRecent ? 1 : 0, good: !slowRecent },
      ],
      picture: <>
      <Conveyor coldAfter={s.coldAfter} ec={s.scheme === 'ec'} />
      <Bars rows={[
        { label: 'Hot storage', value: tb * overhead * hotShare, max: 360, text: `${fmt(tb * overhead * hotShare)} TB` },
        { label: 'Cold storage', value: tb * overhead * (1 - hotShare), max: 360, text: `${fmt(tb * overhead * (1 - hotShare))} TB` },
      ]} />
      </>,
      note: slowRecent ? tr('প্রথম মাসেই ছবি cold-এ: customer-এর অভিযোগের সময় ছবি খুলতে মিনিট লাগবে।', 'Photos go cold in the first month: opening one during a customer complaint will take minutes.') : undefined,
    };
  },
  missions: [
    { text: tr('Durability ১১টা ৯', 'Durability of 11 nines'), ok: (_, r) => r.nines! >= 11 },
    { text: tr('মাসিক খরচ $২,০০০-এর নিচে', 'Monthly cost under $2,000'), ok: (_, r) => r.cost! <= 2000 },
    { text: tr('১১টা ৯, $২,০০০-এর নিচে, আর নতুন ছবি দ্রুত খোলে', '11 nines, under $2,000, and new photos open fast'), ok: (_, r) => r.nines! >= 11 && r.cost! <= 2000 && r.slow === 0 },
  ],
});

/* L25 · leaderboard */
export const leaderboard = spec<{ store: string; users: number }>({
  title: 'Rider ranking',
  intro: tr('প্রতিটা delivery-তে rider পয়েন্ট পায়। App খুললেই "আপনি কত নম্বরে" আর সেরা ১০ জন।', 'Riders earn points for every delivery. Open the app and see "your rank" and the top 10.'),
  init: { store: 'sql', users: 1 },
  controls: [
    { kind: 'choice', key: 'store', label: tr('কোথায় রাখবেন', 'Where to keep it'), options: [{ id: 'sql', label: 'SQL + ORDER BY' }, { id: 'zset', label: 'Redis sorted set' }] },
    { kind: 'slider', key: 'users', label: tr('Rider (লাখ)', 'Riders (hundred thousands)'), min: 1, max: 500, step: 1 },
  ],
  model: (s) => {
    const n = s.users * 100_000;
    const rank = s.store === 'sql' ? n * 0.00002 : 0.05 + Math.log2(n) * 0.005;
    const top = s.store === 'sql' ? 2 : 0.05;
    const mem = s.store === 'zset' ? (n * 100) / 1e9 : 0;
    return {
      readings: [
        { id: 'rank', label: tr('"আমি কত নম্বরে"', '"My rank"'), value: rank, unit: 'ms', digits: rank < 10 ? 2 : 0, good: rank <= 10 },
        { id: 'top', label: tr('সেরা ১০', 'Top 10'), value: top, unit: 'ms', digits: 2, good: top <= 5 },
        { id: 'mem', label: 'Memory', value: mem, unit: 'GB', digits: 1, good: mem <= 8 },
        { id: 'n', label: 'Rider', value: n },
      ],
      picture: <>
      <Ranking slow={s.store === 'sql' && rank > 10} />
      <Bars rows={[{ label: 'Rank query (log)', value: Math.log10(rank * 100), max: 6, bad: rank > 10, text: `${fmt(rank, rank < 10 ? 2 : 0)} ms` }]} />
      </>,
      note: s.store === 'sql' && rank > 10 ? tr('নিজের rank জানতে নিজের চেয়ে বেশি পয়েন্টের সবাইকে গুনতে হয়: O(n)।', 'To know your rank you count everyone with more points: O(n).') : undefined,
    };
  },
  missions: [
    { text: tr('১ কোটি rider-এ rank ১০ ms-এর মধ্যে', 'Rank within 10 ms at 10 million riders'), ok: (s, r) => s.users >= 100 && r.rank! <= 10 },
    { text: tr('SQL-এ ১ কোটিতে rank কত ধীর দেখুন', 'See how slow rank is in SQL at 10 million'), ok: (s, r) => s.store === 'sql' && s.users >= 100 && r.rank! > 100 },
    { text: tr('৫ কোটি rider: rank ১০ ms-এর মধ্যে, memory ৮ GB-এর মধ্যে', '50 million riders: rank within 10 ms, memory within 8 GB'), ok: (s, r) => s.users >= 500 && r.rank! <= 10 && r.mem! <= 8 },
  ],
});

/* L27 · digital wallet, distributed transaction */
export const wallet = spec<{ approach: string; crashes: number; lost: number; locked: number }>({
  title: tr('Payout মাঝপথে', 'Payout halfway'),
  intro: tr('Merchant-এর wallet থেকে ৳৫০০ rider-এর wallet-এ। দুটো আলাদা database, মাঝপথে service crash করতে পারে।', '৳500 from a merchant\'s wallet to a rider\'s wallet. Two separate databases, and the service can crash halfway.'),
  init: { approach: 'naive', crashes: 0, lost: 0, locked: 0 },
  controls: [{ kind: 'choice', key: 'approach', label: tr('কীভাবে', 'How'), options: [{ id: 'naive', label: tr('কাটো, তারপর জমা', 'Debit, then credit') }, { id: '2pc', label: 'Two-phase commit' }, { id: 'saga', label: tr('Saga (ফেরতের ধাপসহ)', 'Saga (with compensation)') }] }],
  actions: [{ label: tr('কাটার পর, জমার আগে crash', 'Crash after debit, before credit'), tone: 'warn', run: (s) => ({ crashes: s.crashes + 1, lost: s.approach === 'naive' ? 500 : 0, locked: s.approach === '2pc' ? 30 : 0 }) }],
  model: (s) => ({
    readings: [
      { id: 'lost', label: tr('হারানো টাকা', 'Money lost'), value: s.lost, unit: '৳', good: s.crashes ? s.lost === 0 : undefined },
      { id: 'locked', label: tr('টাকা আটকে (সে.)', 'Money locked (s)'), value: s.locked, good: s.crashes ? s.locked === 0 : undefined },
    ],
    picture: <>
    <CoinRun approach={s.approach} crashed={s.crashes > 0} />
    <Strip cells={[
      { label: `Merchant −৳${bn(500)}`, flex: 1, color: '#FFD9D4', sub: s.crashes ? tr('হয়েছে', 'done') : '' },
      { label: s.crashes ? 'crash!' : '→', flex: 0.6, color: s.crashes ? '#E0483E' : '#FFFFFF' },
      { label: `Rider +৳${bn(500)}`, flex: 1, color: '#BFEBDD', sub: s.crashes ? (s.approach === 'naive' ? tr('হয়নি', 'not done') : s.approach === 'saga' ? tr('ফেরত', 'refunded') : tr('অপেক্ষায়', 'waiting')) : '' },
    ]} />
    </>,
    note: s.crashes ? (s.approach === 'naive' ? tr('Merchant-এর টাকা কাটা, rider পায়নি: ৳৫০০ বাতাসে মিলিয়ে গেল।', 'The merchant was debited and the rider got nothing: ৳500 vanished into thin air.') : s.approach === '2pc' ? tr('Coordinator ফেরা পর্যন্ত দুটো wallet-ই lock: কেউ কিছু করতে পারছে না।', 'Both wallets are locked until the coordinator returns: nobody can do anything.') : tr('Saga ফেরতের ধাপ চালাল: merchant টাকা ফেরত পেল, পরে আবার চেষ্টা হবে।', 'The saga ran its compensation: the merchant got the money back, and it will be retried later.')) : undefined,
  }),
  missions: [
    { text: tr('মাঝপথে crash করিয়ে টাকা হারাতে দেখুন', 'Crash it halfway and watch money disappear'), ok: (s) => s.crashes > 0 && s.lost > 0 },
    { text: tr('Crash হলেও টাকা যেন না হারায়', 'No money lost even when it crashes'), ok: (s) => s.crashes > 0 && s.lost === 0 },
    { text: tr('টাকা না হারিয়ে, আর কোনো wallet lock না রেখে', 'No money lost, and no wallet left locked'), ok: (s) => s.crashes > 0 && s.lost === 0 && s.locked === 0 },
  ],
});

/* L28 · stock exchange matching */
export const exchange = spec<{ engine: string; seq: boolean; priority: string; tested: boolean }>({
  title: tr('দ্রুততম matching', 'Fastest matching'),
  intro: tr('Delivery slot-এর নিলাম: merchant দাম হাঁকে, rider-রা দেয়। Matching engine কেমন হবে?', 'An auction for delivery slots: merchants post jobs, riders bid. What should the matching engine look like?'),
  init: { engine: 'db', seq: false, priority: 'random', tested: false },
  controls: [
    { kind: 'choice', key: 'engine', label: 'Order book', options: [{ id: 'db', label: tr('Database-এ', 'In a database') }, { id: 'mem', label: tr('Memory-তে, এক thread', 'In memory, one thread') }] },
    { kind: 'toggle', key: 'seq', label: tr('Sequencer: প্রতিটা order-এ ক্রমিক নম্বর', 'Sequencer: a sequence number on every order') },
    { kind: 'choice', key: 'priority', label: tr('একই দামে আগে কে', 'Who goes first at the same price'), options: [{ id: 'random', label: tr('যে কেউ', 'Anyone') }, { id: 'time', label: tr('যে আগে এসেছে', 'Whoever came first') }] },
  ],
  actions: [{ label: tr('একই দামে ৩টা order পাঠান', 'Send 3 orders at one price'), tone: 'go', run: () => ({ tested: true }) }],
  model: (s) => {
    const latency = s.engine === 'db' ? 20 : 0.05;
    const fair = s.priority === 'time';
    const order = s.tested ? (fair ? [`A (${bn('10:00:00.1')})`, `B (${bn('10:00:00.2')})`, `C (${bn('10:00:00.3')})`] : ['C', 'A', 'B']) : [];
    return {
      readings: [
        { id: 'latency', label: 'Match latency', value: latency, unit: 'ms', digits: 2, good: latency <= 1 },
        { id: 'fair', label: tr('ন্যায্য ক্রম', 'Fair order'), value: fair ? 1 : 0, good: s.tested ? fair : undefined },
        { id: 'replay', label: tr('Replay-তে একই ফল', 'Same result on replay'), value: s.seq && s.engine === 'mem' ? 1 : 0, good: s.seq && s.engine === 'mem' },
      ],
      picture: <>
      <Flow label={tr('Order থেকে matching engine হয়ে trade', 'From orders through the matching engine to trades')} h={30} nodes={[
        { id: 'o', label: 'Orders', x: 9, y: 15 },
        ...(s.seq ? [{ id: 'q', label: 'Sequencer', x: 33, y: 15, sub: `${bn(1)}, ${bn(2)}, ${bn(3)}…` }] : []),
        { id: 'e', label: s.engine === 'db' ? 'DB engine' : 'Memory engine', x: 60, y: 15, tone: (s.engine === 'db' ? 'hot' : 'ok') as 'hot' | 'ok' },
        { id: 't', label: 'Trades', x: 90, y: 15 },
      ]} links={[
        ...(s.seq ? [{ from: 'o', to: 'q', rate: 10 }, { from: 'q', to: 'e', rate: 10 }] : [{ from: 'o', to: 'e', rate: 10, mix: 0.3, mixColor: '#2F6FDE' }]),
        { from: 'e', to: 't', rate: s.engine === 'db' ? 2.5 : 10, secs: s.engine === 'db' ? 2.2 : 0.6 },
      ]} />
      {s.tested ? <ol className="m-0 flex flex-col gap-1.5 pl-6 text-sm">{order.map((o) => <li key={o} className="pop-in rounded-lg bg-white px-3 py-1.5">{o}</li>)}</ol> : <p className="m-0 text-muted">{tr('"৩টা order" চাপুন।', 'Press "Send 3 orders".')}</p>}
      </>,
    };
  },
  missions: [
    { text: tr('Match ১ ms-এর মধ্যে', 'Match within 1 ms'), ok: (_, r) => r.latency! <= 1 },
    { text: tr('একই দামে যে আগে এসেছে সে আগে পায়, পরীক্ষা করে দেখান', 'At the same price, first come first served: prove it'), ok: (s) => s.tested && s.priority === 'time' },
    { text: tr('দ্রুত, ন্যায্য, আর crash-এর পর replay করলে হুবহু একই ফল', 'Fast, fair, and an identical result when replayed after a crash'), ok: (s, r) => r.latency! <= 1 && s.priority === 'time' && r.replay === 1 },
  ],
});

/* L29 · resilience */
export const resilience = spec<{ down: boolean; timeout: number; retries: number; jitter: boolean; breaker: boolean; outbox: boolean }>({
  title: tr('টিকে থাকার নিয়ম', 'Rules for staying up'),
  intro: tr('Order service সেকেন্ডে ২০০ বার SMS service ডাকে, ২০০টা thread। SMS service পড়ে গেলে order-ও কি পড়বে?', 'The order service calls the SMS service 200 times a second, with 200 threads. If SMS goes down, do orders go down too?'),
  init: { down: true, timeout: 5000, retries: 3, jitter: false, breaker: false, outbox: false },
  controls: [
    { kind: 'toggle', key: 'down', label: tr('SMS service বন্ধ', 'SMS service down') },
    { kind: 'slider', key: 'timeout', label: 'Timeout', min: 100, max: 10000, step: 100, unit: 'ms' },
    { kind: 'slider', key: 'retries', label: 'Retry', min: 0, max: 5 },
    { kind: 'toggle', key: 'jitter', label: 'Exponential backoff + jitter' },
    { kind: 'toggle', key: 'breaker', label: 'Circuit breaker' },
    { kind: 'toggle', key: 'outbox', label: tr('Outbox table (event আগে DB-তে)', 'Outbox table (event goes to the DB first)') },
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
        { id: 'busy', label: tr('আটকে থাকা thread', 'Threads stuck'), value: busy, unit: '%', good: busy <= 50 },
        { id: 'lost', label: tr('হারানো SMS', 'SMS lost'), value: lost, unit: '%', good: lost === 0 },
        { id: 'surge', label: tr('ফেরার সময় চাপ', 'Load on recovery'), value: surge, unit: '×', digits: 1, good: surge <= 2 },
      ],
      picture: <>
      <Flow label={tr('Order service থেকে SMS service', 'From the order service to the SMS service')} h={40} nodes={[
        { id: 'u', label: 'Customer', x: 9, y: 20 },
        { id: 'o', label: 'Order service', x: 40, y: 20, w: 20, tone: busy > 50 ? 'hot' : 'ok', sub: `thread ${bn(Math.round(busy))}%` },
        { id: 's', label: 'SMS service', x: 86, y: 8, tone: s.down ? 'down' : 'ok' },
        { id: 'b', label: 'Outbox', x: 86, y: 32, tone: s.outbox ? 'ok' : 'plain' },
      ]} links={[
        { from: 'u', to: 'o', rate: busy >= 100 ? 3 : 8, drop: busy >= 100 ? 0.5 : 0 },
        { from: 'o', to: 's', rate: open ? 0 : 8, drop: s.down ? 1 : 0, secs: s.down ? Math.min(3, 0.4 + s.timeout / 2500) : 1.1 },
        { from: 'o', to: 'b', rate: s.outbox ? 6 : 0, color: '#2F6FDE' },
      ]} />
      <Bars rows={[
        { label: 'Thread pool', value: busy, max: 100, target: 50, bad: busy > 50, text: `${bn(Math.round(busy))}%` },
        { label: tr('SMS service ফেরার মুহূর্তে চাপ', 'Load on SMS the moment it recovers'), value: surge, max: 6, target: 2, bad: surge > 2, text: `${fmt(surge, 1)}×` },
      ]} />
      </>,
      note: s.down && busy >= 100 ? tr('সব thread SMS-এর অপেক্ষায়: নতুন order-ই নেওয়া যাচ্ছে না। এক service-এর অসুখ সবার।', 'Every thread is waiting on SMS: no new orders can be taken. One service\'s illness is everyone\'s.') : open ? tr('Breaker খোলা: SMS-কে ডাকাই হচ্ছে না, order চলছে।', 'The breaker is open: SMS is not even called, and orders keep flowing.') : undefined,
    };
  },
  missions: [
    { text: tr('SMS বন্ধ থাকলেও thread ৫০%-এর কম আটকে', 'Under 50% of threads stuck even while SMS is down'), ok: (s, r) => s.down && r.busy! <= 50 },
    { text: tr('SMS বন্ধ থাকলেও একটাও SMS যেন না হারায়', 'Not a single SMS lost while SMS is down'), ok: (s, r) => s.down && r.lost === 0 },
    { text: tr('তিনটাই: thread মুক্ত, কিছু হারায় না, ফেরার সময় চাপ ২×-এর কম', 'All three: threads free, nothing lost, recovery load under 2×'), ok: (s, r) => s.down && r.busy! <= 50 && r.lost === 0 && r.surge! <= 2 },
  ],
});

/* L30 · the interview itself */
export const interview = spec<{ req: number; est: number; hld: number; deep: number; wrap: number; ask: boolean; trade: boolean; diagram: boolean }>({
  title: tr('৪৫ মিনিট ভাগ করুন', 'Split the 45 minutes'),
  intro: tr('আসল interview-এর আগে সময়ের পরিকল্পনা। কোন ধাপে কত মিনিট, আর কোন অভ্যাসগুলো রাখবেন?', 'Plan your time before the real interview. How many minutes per phase, and which habits do you keep?'),
  init: { req: 2, est: 10, hld: 25, deep: 5, wrap: 3, ask: false, trade: false, diagram: false },
  controls: [
    { kind: 'slider', key: 'req', label: tr('প্রয়োজন বোঝা', 'Requirements'), min: 0, max: 15, unit: tr('মি', 'min') },
    { kind: 'slider', key: 'est', label: tr('হিসাব', 'Estimation'), min: 0, max: 15, unit: tr('মি', 'min') },
    { kind: 'slider', key: 'hld', label: 'High-level design', min: 0, max: 30, unit: tr('মি', 'min') },
    { kind: 'slider', key: 'deep', label: 'Deep dive', min: 0, max: 30, unit: tr('মি', 'min') },
    { kind: 'slider', key: 'wrap', label: tr('শেষ কথা', 'Wrap-up'), min: 0, max: 10, unit: tr('মি', 'min') },
    { kind: 'toggle', key: 'ask', label: tr('শুরুতে প্রশ্ন করি, ধরে নিই না', 'I ask questions first, I do not assume') },
    { kind: 'toggle', key: 'trade', label: tr('প্রতিটা বাছাইয়ে trade-off নিজে বলি', 'I name the trade-off of every choice') },
    { kind: 'toggle', key: 'diagram', label: tr('Deep dive-এর আগে পুরো ছবি আঁকি', 'I draw the whole picture before the deep dive') },
  ],
  model: (s) => {
    const total = s.req + s.est + s.hld + s.deep + s.wrap;
    const inRange = [[s.req, 3, 10], [s.est, 3, 10], [s.hld, 10, 20], [s.deep, 10, 25], [s.wrap, 2, 5]].filter(([v, lo, hi]) => v! >= lo! && v! <= hi!).length;
    const habits = [s.ask, s.trade, s.diagram].filter(Boolean).length;
    const score = (total <= 45 ? 30 : 0) + inRange * 10 + habits * 7;
    return {
      readings: [
        { id: 'total', label: tr('মোট', 'Total'), value: total, unit: tr('মিনিট', 'minutes'), good: total <= 45 },
        { id: 'inRange', label: tr('ঠিক মাপের ধাপ', 'Phases sized right'), value: inRange, unit: `/${bn(5)}`, good: inRange === 5 },
        { id: 'score', label: tr('প্রস্তুতি', 'Readiness'), value: Math.min(100, score), unit: `/${bn(100)}`, good: score >= 90 },
      ],
      picture: <>
      <InterviewClock phases={[
        { label: tr('প্রয়োজন বোঝা', 'Requirements'), min: s.req, color: '#FFE7A8' }, { label: tr('হিসাব', 'Estimation'), min: s.est, color: '#C8E6FF' },
        { label: 'High-level design', min: s.hld, color: '#BFEBDD' }, { label: 'Deep dive', min: s.deep, color: '#C7D3F5' },
        { label: tr('শেষ কথা', 'Wrap-up'), min: s.wrap, color: '#E3D7F5' },
      ]} />
      <Strip cells={[
        { label: tr('প্রয়োজন', 'Reqs'), flex: Math.max(0.3, s.req), color: '#FFE7A8', sub: bn(s.req) },
        { label: tr('হিসাব', 'Estimation'), flex: Math.max(0.3, s.est), color: '#C8E6FF', sub: bn(s.est) },
        { label: 'HLD', flex: Math.max(0.3, s.hld), color: '#BFEBDD', sub: bn(s.hld) },
        { label: 'Deep dive', flex: Math.max(0.3, s.deep), color: '#C7D3F5', sub: bn(s.deep) },
        { label: tr('শেষ', 'Wrap'), flex: Math.max(0.3, s.wrap), color: '#E3D7F5', sub: bn(s.wrap) },
      ]} />
      </>,
      note: s.deep < 10 ? tr('Deep dive-এ সময় কম: senior interview-এ এখানেই পার্থক্য হয়।', 'Too little deep-dive time: in a senior interview, this is where you stand out.') : s.req < 3 ? tr('প্রয়োজন না বুঝে শুরু করলে ভুল জিনিস design করবেন।', 'Start without understanding the requirements and you will design the wrong thing.') : undefined,
    };
  },
  missions: [
    { text: tr('মোট ৪৫ মিনিটের মধ্যে', 'Within 45 minutes in total'), ok: (_, r) => r.total! <= 45 },
    { text: tr('পাঁচটা ধাপই ঠিক মাপে', 'All five phases sized right'), ok: (_, r) => r.inRange === 5 && r.total! <= 45, hint: tr('প্রয়োজন ৩–১০, হিসাব ৩–১০, HLD ১০–২০, deep dive ১০–২৫, শেষ ২–৫।', 'Requirements 3–10, estimation 3–10, HLD 10–20, deep dive 10–25, wrap-up 2–5.') },
    { text: tr('প্রস্তুতি ৯০+', 'Readiness 90+'), ok: (_, r) => r.score! >= 90 },
  ],
});
