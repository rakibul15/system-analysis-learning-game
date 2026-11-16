import { bn } from '@/shared/lib/bn';
import { Bars, fmt, Strip, type KnobSpec, type State } from './KnobSim';
import { AlertScan, Flow, IdStream, Player, RiderMap, SearchGrow, Typing, vis } from './anim';

export const spec = <S extends State>(x: KnobSpec<S>) => x;
const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/* L7 · Snowflake ID */
export const snowflake = spec<{ ts: number; machine: number; guard: boolean; events: number; lastDup: boolean }>({
  title: '৬৪ bit ভাগ করুন',
  intro: 'প্রতিটা order-এর ID: ১ bit চিহ্ন, বাকি ৬৩ bit সময়, machine আর sequence-এ ভাগ। কত বছর চলবে, কত machine, প্রতি মিলিসেকেন্ডে কত ID?',
  init: { ts: 38, machine: 14, guard: false, events: 0, lastDup: false },
  controls: [
    { kind: 'slider', key: 'ts', label: 'Timestamp bit', min: 32, max: 46 },
    { kind: 'slider', key: 'machine', label: 'Machine bit', min: 4, max: 16 },
    { kind: 'toggle', key: 'guard', label: 'ঘড়ি পিছোলে ID দেওয়া থামাও' },
  ],
  actions: [{ label: 'NTP: ঘড়ি ৮০০ ms পিছোল', tone: 'warn', run: (s) => ({ events: s.events + 1, lastDup: !s.guard }) }],
  model: (s) => {
    const seq = 63 - s.ts - s.machine;
    const valid = seq >= 0;
    const years = 2 ** s.ts / YEAR_MS;
    const machines = 2 ** s.machine;
    const perMs = valid ? 2 ** seq : 0;
    return {
      readings: [
        { id: 'years', label: 'কত বছর চলবে', value: years, good: years >= 60, digits: years < 10 ? 1 : 0 },
        { id: 'machines', label: 'Machine', value: machines, good: machines >= 1024 },
        { id: 'perMs', label: 'ID / ms / machine', value: perMs, good: perMs >= 4096 },
        { id: 'seq', label: 'Sequence bit', value: seq, good: valid },
      ],
      picture: <>
        <Strip cells={[
          { label: 'চিহ্ন', flex: 1, color: '#E3E6DF', sub: '১' },
          { label: 'সময় (ms)', flex: Math.max(1, s.ts), color: '#FFE7A8', sub: bn(s.ts) },
          { label: 'Machine', flex: Math.max(1, s.machine), color: '#BFEBDD', sub: bn(s.machine) },
          { label: 'Sequence', flex: Math.max(1, seq), color: valid ? '#C7D3F5' : '#E0483E', sub: bn(seq) },
        ]} />
        {!valid && <p className="m-0 font-semibold text-coral-deep">৬৩ bit-এর বেশি নিয়ে ফেলেছেন!</p>}
        <IdStream ts={s.ts} machine={s.machine} seq={seq} dup={s.lastDup} />
      </>,
      note: s.events ? (s.lastDup ? 'ঘড়ি পিছোতেই আগের মিলিসেকেন্ড ফিরে এল: একই ID দ্বিতীয়বার!' : 'Generator শেষ timestamp মনে রেখেছে, ঘড়ি ধরে না ফেলা পর্যন্ত অপেক্ষা করল: কোনো duplicate নেই।') : undefined,
    };
  },
  missions: [
    { text: 'ID যেন অন্তত ৬০ বছর চলে', ok: (_, r) => r.years! >= 60 && r.seq! >= 0, hint: '২^ts মিলিসেকেন্ড ≈ কত বছর?' },
    { text: '৬০+ বছর, ১,০২৪+ machine, আর প্রতি ms-এ ৪,০৯৬+ ID একসাথে', ok: (_, r) => r.years! >= 60 && r.machines! >= 1024 && r.perMs! >= 4096, hint: 'Twitter-এর ভাগ: ৪১ + ১০ + ১২।' },
    { text: 'ঘড়ি পিছোলেও duplicate যেন না হয়', ok: (s) => s.events > 0 && !s.lastDup },
  ],
});

/* L9 · web crawler */
export const crawler = spec<{ workers: number; delay: number; dedupe: boolean }>({
  title: 'ভদ্র crawler',
  intro: '৫০০টা merchant site, মোট ১০ লাখ page। প্রতিটা page আনতে ০.৫ সেকেন্ড। লিংকের ৩০% আগেই দেখা page-এর।',
  init: { workers: 20, delay: 0, dedupe: false },
  controls: [
    { kind: 'slider', key: 'workers', label: 'Worker', min: 10, max: 500, step: 10 },
    { kind: 'slider', key: 'delay', label: 'একই site-এ দুই request-এর ফাঁক', min: 0, max: 5, step: 0.5, unit: 'সে.' },
    { kind: 'toggle', key: 'dedupe', label: 'দেখা URL মনে রাখুন' },
  ],
  model: (s) => {
    const hosts = 500, pages = 1_000_000;
    const workerRate = s.workers / 0.5;
    const politeCap = s.delay > 0 ? hosts / s.delay : Infinity;
    const rate = Math.min(workerRate, politeCap);
    const fetched = s.dedupe ? pages : pages / 0.7;
    const hours = fetched / rate / 3600;
    const perHost = s.delay > 0 ? 1 / s.delay : Math.min(workerRate, 40);
    return {
      readings: [
        { id: 'hours', label: 'শেষ হতে', value: hours, unit: 'ঘণ্টা', digits: 1, good: hours <= 1 },
        { id: 'perHost', label: 'এক site-এ request / সে.', value: perHost, digits: 1, good: perHost <= 1 },
        { id: 'waste', label: 'বাড়তি (duplicate) আনা', value: fetched - pages, good: fetched === pages },
      ],
      picture: <>
        <Flow label="Crawler থেকে merchant site-এ request" h={46} nodes={[
          { id: 'q', label: 'URL queue', x: 10, y: 23, sub: s.dedupe ? 'দেখা URL বাদ' : 'সব URL' },
          { id: 'w', label: 'Worker', x: 40, y: 23, sub: bn(s.workers) },
          ...[0, 1, 2, 3].map((i) => ({ id: `h${i}`, label: `site ${bn(i + 1)}`, x: 84, y: 6 + i * 11.3, tone: (perHost > 1 ? 'hot' : 'ok') as 'hot' | 'ok' })),
        ]} links={[
          { from: 'q', to: 'w', rate: vis(rate), mix: s.dedupe ? 0 : 0.3, mixColor: '#FFC02E' },
          ...[0, 1, 2, 3].map((i) => ({ from: 'w', to: `h${i}`, rate: Math.min(12, perHost * 1.5), color: perHost > 1 ? '#E0483E' : '#0B8A7A', mix: s.dedupe ? 0 : 0.3 })),
        ]} />
        <Bars rows={[
        { label: 'Worker-এর ক্ষমতা (page/সে.)', value: workerRate, max: 1000 },
        { label: 'ভদ্রতার সীমা (page/সে.)', value: Math.min(politeCap, 1000), max: 1000, text: Number.isFinite(politeCap) ? fmt(politeCap) : 'সীমা নেই' },
        { label: 'আসল গতি (page/সে.)', value: rate, max: 1000 },
      ]} />
      </>,
      note: perHost > 1 ? `একটা site-এ সেকেন্ডে ${fmt(perHost)}টা request: ছোট merchant-এর server বসে যাবে।` : undefined,
    };
  },
  missions: [
    { text: 'কোনো site-এ সেকেন্ডে ১টার বেশি request নয়', ok: (_, r) => r.perHost! <= 1 },
    { text: 'একই page দুবার আনা বন্ধ করুন', ok: (_, r) => r.waste === 0 },
    { text: 'ভদ্র থেকে, duplicate ছাড়া, ১ ঘণ্টার মধ্যে শেষ', ok: (_, r) => r.perHost! <= 1 && r.waste === 0 && r.hours! <= 1, hint: 'ভদ্রতার সীমা site-প্রতি; worker যথেষ্ট আছে তো?' },
  ],
});

/* L13 · search autocomplete */
export const autocomplete = spec<{ debounce: number; mode: string }>({
  title: 'টাইপ করতে করতে ঠিকানা',
  intro: '"dhanmondi 27" টাইপ হচ্ছে, প্রতি অক্ষরে ১৫০ ms। Server-এ trie আছে; প্রতিটা prefix-এ সেরা ৫টা ঠিকানা দেখাতে হবে।',
  init: { debounce: 0, mode: 'scan' },
  controls: [
    { kind: 'slider', key: 'debounce', label: 'Debounce', min: 0, max: 500, step: 50, unit: 'ms' },
    { kind: 'choice', key: 'mode', label: 'Trie-তে খোঁজা', options: [{ id: 'scan', label: 'পুরো subtree ঘাঁটা' }, { id: 'topk', label: 'প্রতি node-এ top ৫ রাখা' }] },
  ],
  model: (s) => {
    const chars = 12, gap = 150;
    const requests = s.debounce < gap ? chars : 2;
    const server = s.mode === 'scan' ? 180 : 3;
    const felt = s.debounce + server;
    return {
      readings: [
        { id: 'requests', label: 'Request (এক শব্দে)', value: requests, good: requests <= 3 },
        { id: 'server', label: 'Server-এ সময়', value: server, unit: 'ms', good: server <= 10 },
        { id: 'felt', label: 'User-এর অপেক্ষা', value: felt, unit: 'ms', good: felt <= 300 },
      ],
      picture: <Typing debounce={s.debounce} server={server} />,
    };
  },
  missions: [
    { text: 'এক শব্দে ৩টার বেশি request নয়', ok: (_, r) => r.requests! <= 3 },
    { text: 'Server-এ প্রতিটা request ১০ ms-এর মধ্যে', ok: (_, r) => r.server! <= 10, hint: 'Query-র সময় হিসাব না করে আগেই রেখে দিলে?' },
    { text: 'কম request, আর user-এর অপেক্ষা ৩০০ ms-এর মধ্যে', ok: (_, r) => r.requests! <= 3 && r.felt! <= 300 },
  ],
});

/* L14 · video streaming */
const RENDITIONS = [[240, 0.4], [480, 1], [720, 2.5], [1080, 5]] as const;
const NETS: Record<string, number[]> = { good: [6, 6, 6], bad: [1.2, 1.2, 1.2], variable: [6, 1.2, 3] };
export const video = spec<{ r240: boolean; r480: boolean; r720: boolean; r1080: boolean; abr: boolean; net: string }>({
  title: 'Rider training video',
  intro: 'Rider-রা ফোনে training video দেখে, network কখনো ভালো কখনো খারাপ। কোন quality-তে encode করবেন, আর player কীভাবে বাছবে?',
  init: { r240: false, r480: false, r720: false, r1080: true, abr: false, net: 'bad' },
  controls: [
    { kind: 'toggle', key: 'r240', label: '240p (০.৪ Mbps)' },
    { kind: 'toggle', key: 'r480', label: '480p (১ Mbps)' },
    { kind: 'toggle', key: 'r720', label: '720p (২.৫ Mbps)' },
    { kind: 'toggle', key: 'r1080', label: '1080p (৫ Mbps)' },
    { kind: 'toggle', key: 'abr', label: 'Adaptive bitrate (ABR)' },
    { kind: 'choice', key: 'net', label: 'Network', options: [{ id: 'good', label: 'ভালো' }, { id: 'bad', label: 'খারাপ' }, { id: 'variable', label: 'ওঠানামা' }] },
  ],
  model: (s) => {
    const on = RENDITIONS.filter(([h]) => s[`r${h}` as 'r240'] as boolean);
    const net = NETS[s.net]!;
    let rebuffer = 0, quality = 0;
    const picks: number[] = [];
    for (const bw of net) {
      if (!on.length) break;
      const pick = s.abr ? ([...on].reverse().find(([, b]) => b <= bw) ?? on[0]!) : on[on.length - 1]!;
      picks.push(pick[0]);
      quality += pick[0];
      rebuffer += pick[1] > bw ? Math.min(100, (pick[1] / bw - 1) * 100) : 0;
    }
    const storage = on.reduce((a, [, b]) => a + (b * 60) / 8, 0);
    return {
      readings: [
        { id: 'rebuffer', label: 'Buffering', value: on.length ? rebuffer / net.length : 0, unit: '%', good: on.length > 0 && rebuffer === 0 },
        { id: 'quality', label: 'গড় quality', value: on.length ? quality / net.length : 0, unit: 'p', good: quality / net.length >= 600 },
        { id: 'storage', label: 'Storage / মিনিট', value: storage, unit: 'MB', good: storage <= 50 },
        { id: 'count', label: 'Rendition', value: on.length },
      ],
      picture: <>
      <Player segs={net.map((bw, i) => ({ q: picks[i] ?? 0, br: RENDITIONS.find(([h]) => h === picks[i])?.[1] ?? 1, bw }))} />
      <div className="grid grid-cols-3 gap-2">
        {net.map((bw, i) => (
          <div key={i} className="rounded-xl border-2 border-ink bg-white p-2 text-center text-sm">
            <div className="text-xs text-muted">অংশ {bn(i + 1)} · {bn(bw, { grouping: false })} Mbps</div>
            <div className="font-display text-2xl font-extrabold">{picks[i] ? `${bn(picks[i]!)}p` : '—'}</div>
            <div className={`text-xs font-bold ${picks[i] && (RENDITIONS.find(([h]) => h === picks[i])![1] > bw) ? 'text-coral-deep' : 'text-route-deep'}`}>{picks[i] && (RENDITIONS.find(([h]) => h === picks[i])![1] > bw) ? 'আটকে আটকে চলছে' : 'মসৃণ'}</div>
          </div>
        ))}
      </div>
      </>,
    };
  },
  missions: [
    { text: 'খারাপ network-এ শুধু 1080p দিয়ে buffering দেখুন', ok: (s, r) => s.net === 'bad' && r.rebuffer! > 0 },
    { text: 'ওঠানামা network-এ buffering ০, গড় quality ৬০০p+', ok: (s, r) => s.net === 'variable' && r.rebuffer === 0 && r.quality! >= 600 },
    { text: 'তার সাথে storage মিনিটে ৫০ MB-এর মধ্যে', ok: (s, r) => s.net === 'variable' && r.rebuffer === 0 && r.quality! >= 600 && r.storage! <= 50, hint: 'সবচেয়ে দামি rendition কি সত্যিই লাগে?' },
  ],
});

/* L15 · file sync */
export const filesync = spec<{ size: number; block: string; delta: boolean; compress: boolean; policy: string; conflicts: number; lost: number }>({
  title: 'Invoice ফাইল sync',
  intro: 'Merchant-এর বড় invoice ফাইল, একটা লাইন বদলালেই আবার upload। দুই ফোনে একসাথে offline বদলও হয়।',
  init: { size: 400, block: '16', delta: false, compress: false, policy: 'last', conflicts: 0, lost: 0 },
  controls: [
    { kind: 'slider', key: 'size', label: 'ফাইলের আকার', min: 10, max: 1000, step: 10, unit: 'MB' },
    { kind: 'choice', key: 'block', label: 'Block-এর আকার', options: [{ id: '1', label: '১ MB' }, { id: '4', label: '৪ MB' }, { id: '16', label: '১৬ MB' }] },
    { kind: 'toggle', key: 'delta', label: 'শুধু বদলানো block পাঠান' },
    { kind: 'toggle', key: 'compress', label: 'Compress করুন' },
    { kind: 'choice', key: 'policy', label: 'Conflict হলে', options: [{ id: 'last', label: 'শেষ জন জেতে' }, { id: 'copy', label: 'দুটোই রাখুন' }] },
  ],
  actions: [{ label: 'দুই ফোনে একসাথে offline বদল', tone: 'warn', run: (s) => ({ conflicts: s.conflicts + 1, lost: s.policy === 'last' ? s.lost + 1 : s.lost }) }],
  model: (s) => {
    const upload = (s.delta ? Number(s.block) : s.size) * (s.compress ? 0.6 : 1);
    const share = upload / s.size;
    return {
      readings: [
        { id: 'upload', label: 'এক লাইন বদলে upload', value: upload, unit: 'MB', digits: upload < 10 ? 1 : 0, good: share <= 0.01 },
        { id: 'share', label: 'ফাইলের কত ভাগ', value: share * 100, unit: '%', digits: 1, good: share <= 0.01 },
        { id: 'lost', label: 'হারানো বদল', value: s.lost, good: s.lost === 0 },
      ],
      picture: <>
      <Flow label="ফোন থেকে server-এ upload" h={30} nodes={[
        { id: 'a', label: 'ফোন A', x: 12, y: 8 }, { id: 'b', label: 'ফোন B', x: 12, y: 23, tone: s.conflicts ? 'hot' : 'plain' },
        { id: 's', label: 'Server', x: 86, y: 15, tone: s.lost ? 'down' : 'ok', sub: s.lost ? 'একটা বদল হারাল' : undefined },
      ]} links={[
        { from: 'a', to: 's', rate: Math.min(18, 1 + upload / 12), color: share <= 0.01 ? '#0B8A7A' : '#FFC02E' },
        { from: 'b', to: 's', rate: s.conflicts ? 2 : 0, color: '#2F6FDE', drop: s.policy === 'last' ? 0.5 : 0 },
      ]} />
      <div className="grid grid-cols-10 gap-1" role="img" aria-label="ফাইলের block">
        {Array.from({ length: 40 }, (_, i) => <span key={i} className={`aspect-square rounded border-2 border-ink ${!s.delta || i === 17 ? 'sim-pulse' : ''}`} style={{ background: !s.delta || i === 17 ? '#FFC02E' : '#E3E6DF', animationDelay: `${(i % 10) * 60}ms` }} />)}
      </div>
      </>,
      note: s.conflicts ? (s.lost ? `${bn(s.lost)} বার একজনের বদল নিঃশব্দে মুছে গেছে!` : 'দুটো version-ই রাখা হয়েছে: "invoice (conflicted copy).xlsx"') : undefined,
    };
  },
  missions: [
    { text: '৪০০ MB+ ফাইলে এক লাইন বদলে ফাইলের ১%-এর বেশি upload নয়', ok: (s, r) => s.size >= 400 && r.share! <= 1 },
    { text: 'Offline conflict-এ কারো বদল যেন না হারায়', ok: (s) => s.conflicts > 0 && s.policy === 'copy', hint: 'Policy বদলে আবার conflict ঘটান।' },
    { text: 'যেকোনো আকারের ফাইলে upload ১ MB-এর কম', ok: (_, r) => r.upload! < 1 },
  ],
});

/* L17 · nearby friends live */
export const nearby = spec<{ riders: number; interval: number; fanout: string }>({
  title: 'Live rider map',
  intro: 'Rider-রা প্রতি কয়েক সেকেন্ডে location পাঠায়; কাছের সহকর্মীরা map-এ live দেখে।',
  init: { riders: 100, interval: 2, fanout: 'all' },
  controls: [
    { kind: 'slider', key: 'riders', label: 'Online rider (হাজার)', min: 10, max: 100, step: 10 },
    { kind: 'slider', key: 'interval', label: 'Location পাঠানোর ফাঁক', min: 1, max: 30, unit: 'সে.' },
    { kind: 'choice', key: 'fanout', label: 'কাকে পাঠাবেন', options: [{ id: 'all', label: 'সবাইকে' }, { id: 'friends', label: 'Team-এর ৫০ জন' }, { id: 'near', label: '৫ km-এর team-mate' }] },
  ],
  model: (s) => {
    const recips = s.fanout === 'all' ? s.riders * 1000 : s.fanout === 'friends' ? 50 : 5;
    const msgs = ((s.riders * 1000) / s.interval) * recips;
    return {
      readings: [
        { id: 'msgs', label: 'Message / সে.', value: msgs, good: msgs <= 100_000 },
        { id: 'fresh', label: 'Map কত পুরনো', value: s.interval, unit: 'সে.', good: s.interval <= 10 },
        { id: 'riders', label: 'Rider', value: s.riders * 1000 },
      ],
      picture: <>
        <RiderMap fanout={s.fanout} interval={s.interval} />
        <Bars rows={[{ label: 'Message / সে. (log scale)', value: Math.log10(msgs + 1), max: 11, target: 5, bad: msgs > 100_000, text: fmt(msgs) }]} />
      </>,
      note: msgs > 1e8 ? 'প্রতিটা location সবার কাছে: পুরো WebSocket cluster গলে যাবে।' : undefined,
    };
  },
  missions: [
    { text: '১ লাখ rider-এ "সবাইকে" পাঠিয়ে message-এর পাহাড় দেখুন', ok: (s, r) => s.riders >= 100 && s.fanout === 'all' && r.msgs! > 1e9 },
    { text: '১ লাখ rider, সেকেন্ডে ১ লাখের কম message', ok: (s, r) => s.riders >= 100 && r.msgs! <= 100_000 },
    { text: 'তার সাথে map ১০ সেকেন্ডের বেশি পুরনো নয়', ok: (s, r) => s.riders >= 100 && r.msgs! <= 100_000 && s.interval <= 10, hint: 'সবাইকে না, শুধু কাছের team-mate।' },
  ],
});

/* L18 · maps and routing */
export const maps = spec<{ algo: string; live: boolean; km: number; time: string }>({
  title: 'ETA ঠিক করুন',
  intro: 'Rider-কে পথ আর পৌঁছানোর সময় দিতে হবে। শহরের প্রতিটা মোড় একটা node।',
  init: { algo: 'dijkstra', live: false, km: 30, time: 'rush' },
  controls: [
    { kind: 'choice', key: 'algo', label: 'পথ খোঁজা', options: [{ id: 'dijkstra', label: 'Dijkstra' }, { id: 'astar', label: 'A*' }, { id: 'tiles', label: 'Routing tile (স্তরে স্তরে)' }] },
    { kind: 'slider', key: 'km', label: 'দূরত্ব', min: 1, max: 30, unit: 'km' },
    { kind: 'toggle', key: 'live', label: 'Live traffic' },
    { kind: 'choice', key: 'time', label: 'সময়', options: [{ id: 'rush', label: 'অফিস ছুটির ভিড়' }, { id: 'night', label: 'রাত' }] },
  ],
  model: (s) => {
    const explored = s.algo === 'dijkstra' ? 4000 * s.km * s.km : s.algo === 'astar' ? 600 * s.km * s.km : 200 * s.km;
    const ms = explored * 0.001;
    const error = s.time === 'night' ? 5 : s.live ? 7 : 38;
    return {
      readings: [
        { id: 'explored', label: 'ঘাঁটা মোড়', value: explored },
        { id: 'ms', label: 'পথ বের করতে', value: ms, unit: 'ms', good: ms <= 50, digits: ms < 10 ? 1 : 0 },
        { id: 'error', label: 'ETA-র ভুল', value: error, unit: '%', good: error <= 10 },
      ],
      picture: <>
      <SearchGrow algo={s.algo} km={s.km} live={s.live} rush={s.time === 'rush'} />
      <Bars rows={[
        { label: 'ঘাঁটা মোড় (log)', value: Math.log10(explored), max: 7, text: fmt(explored), bad: ms > 50 },
        { label: 'ETA-র ভুল', value: error, max: 50, target: 10, bad: error > 10, text: `${bn(error)}%` },
      ]} />
      </>,
    };
  },
  missions: [
    { text: '৩০ km পথ ৫০ ms-এর মধ্যে বের করুন', ok: (s, r) => s.km >= 30 && r.ms! <= 50 },
    { text: 'অফিস ছুটির ভিড়ে ETA-র ভুল ১০%-এর মধ্যে', ok: (s, r) => s.time === 'rush' && r.error! <= 10 },
    { text: 'ভিড়ের সময় ৩০ km: দ্রুতও, ঠিকও', ok: (s, r) => s.km >= 30 && s.time === 'rush' && r.ms! <= 50 && r.error! <= 10 },
  ],
});

/* L19 · distributed message queue */
export const mq = spec<{ acks: string; rf: number; commit: string; idem: boolean; bLost: number; bCrashes: number; cLost: number; cDup: number; cCrashes: number }>({
  title: 'Event যেন না হারায়',
  intro: 'Order event-এর queue। Broker হঠাৎ পড়ে যেতে পারে, consumer-ও। কোন setting-এ কী হারায়, কী দুবার আসে?',
  init: { acks: '1', rf: 1, commit: 'before', idem: false, bLost: 0, bCrashes: 0, cLost: 0, cDup: 0, cCrashes: 0 },
  controls: [
    { kind: 'choice', key: 'acks', label: 'Producer acks', options: [{ id: '0', label: '০' }, { id: '1', label: '১ (leader)' }, { id: 'all', label: 'all' }] },
    { kind: 'slider', key: 'rf', label: 'Replication factor', min: 1, max: 3 },
    { kind: 'choice', key: 'commit', label: 'Consumer offset commit', options: [{ id: 'before', label: 'কাজের আগে' }, { id: 'after', label: 'কাজের পরে' }] },
    { kind: 'toggle', key: 'idem', label: 'Consumer idempotent (event id মনে রাখে)' },
  ],
  actions: [
    { label: 'Leader broker crash', tone: 'warn', run: (s) => ({ bCrashes: s.bCrashes + 1, bLost: s.acks === '0' ? 50 : s.acks === '1' ? (s.rf === 1 ? 50 : 12) : s.rf >= 2 ? 0 : 50 }) },
    { label: 'Consumer crash', tone: 'warn', run: (s) => ({ cCrashes: s.cCrashes + 1, cLost: s.commit === 'before' ? 5 : 0, cDup: s.commit === 'after' && !s.idem ? 5 : 0 }) },
  ],
  model: (s) => ({
    readings: [
      { id: 'bLost', label: 'Broker crash-এ হারাল', value: s.bLost, good: s.bCrashes > 0 ? s.bLost === 0 : undefined },
      { id: 'cLost', label: 'Consumer crash-এ হারাল', value: s.cLost, good: s.cCrashes > 0 ? s.cLost === 0 : undefined },
      { id: 'cDup', label: 'দুবার process', value: s.cDup, good: s.cCrashes > 0 ? s.cDup === 0 : undefined },
      { id: 'latency', label: 'Write latency', value: s.acks === 'all' ? 3 + s.rf : s.acks === '1' ? 2 : 1, unit: 'ms' },
    ],
    picture: <>
    <Flow label="Producer থেকে broker হয়ে consumer" h={44} nodes={[
      { id: 'p', label: 'Producer', x: 10, y: 22, sub: `acks=${s.acks}` },
      { id: 'l', label: 'Leader', x: 42, y: 22, tone: s.bLost ? 'down' : 'ok' },
      ...Array.from({ length: s.rf - 1 }, (_, i) => ({ id: `f${i}`, label: `Follower ${bn(i + 1)}`, x: 42, y: i ? 38 : 6, tone: 'plain' as const })),
      { id: 'c', label: 'Consumer', x: 86, y: 22, tone: s.cLost || s.cDup ? 'hot' : 'ok', sub: s.commit === 'before' ? 'commit → কাজ' : 'কাজ → commit' },
    ]} links={[
      { from: 'p', to: 'l', rate: 6, drop: s.bLost ? 0.35 : 0 },
      ...Array.from({ length: s.rf - 1 }, (_, i) => ({ from: 'l', to: `f${i}`, rate: 6, color: '#2F6FDE' })),
      { from: 'l', to: 'c', rate: 6, drop: s.cLost ? 0.3 : 0, mix: s.cDup ? 0.3 : 0 },
    ]} />
    <Strip cells={[
      { label: 'Producer', flex: 1, color: '#FFE7A8', sub: `acks=${s.acks}` },
      ...Array.from({ length: s.rf }, (_, i) => ({ label: i ? `Follower ${bn(i)}` : 'Leader', flex: 1, color: '#C7D3F5', sub: 'partition' })),
      { label: 'Consumer', flex: 1, color: '#BFEBDD', sub: s.commit === 'before' ? 'commit → কাজ' : 'কাজ → commit' },
    ]} />
    </>,
    note: s.cCrashes && s.cDup ? 'কাজ শেষ, কিন্তু commit-এর আগে crash: restart-এ একই event আবার।' : s.cCrashes && s.cLost ? 'Commit হয়ে গেছে, কাজের আগেই crash: event-গুলো চিরতরে বাদ।' : undefined,
  }),
  missions: [
    { text: 'Leader broker crash-এ একটাও event যেন না হারায়', ok: (s) => s.bCrashes > 0 && s.bLost === 0, hint: 'সব replica লিখলে তবেই "OK"।' },
    { text: 'Consumer crash-এ একটাও event যেন না হারায়', ok: (s) => s.cCrashes > 0 && s.cLost === 0 },
    { text: 'Consumer crash-এ না হারানো, না দুবার (effectively once)', ok: (s) => s.cCrashes > 0 && s.cLost === 0 && s.cDup === 0 },
  ],
});

/* L20 · metrics and alerting */
const SERIES = Array.from({ length: 60 }, (_, m) => (m >= 30 ? 12.5 : [8, 17, 23].includes(m) ? 14 : 1 + ((m * 37) % 7) / 5));
export const alerting = spec<{ threshold: number; forMin: number; agg: string }>({
  title: 'Alert যেন বাজে, কিন্তু অকারণে না',
  intro: 'এক ঘণ্টার error rate। মাঝে মাঝে এক মিনিটের spike আসে (কিছু ভাঙেনি), আর ৩০ মিনিটে আসল সমস্যা শুরু।',
  init: { threshold: 5, forMin: 0, agg: 'raw' },
  controls: [
    { kind: 'slider', key: 'threshold', label: 'Error rate সীমা', min: 1, max: 20, unit: '%' },
    { kind: 'slider', key: 'forMin', label: 'কতক্ষণ সীমার ওপরে থাকলে', min: 0, max: 10, unit: 'মিনিট' },
    { kind: 'choice', key: 'agg', label: 'মান', options: [{ id: 'raw', label: 'প্রতি মিনিটের' }, { id: 'avg5', label: '৫ মিনিটের গড়' }] },
  ],
  model: (s) => {
    const v = SERIES.map((_, i) => (s.agg === 'raw' ? SERIES[i]! : SERIES.slice(Math.max(0, i - 4), i + 1).reduce((a, b) => a + b, 0) / Math.min(5, i + 1)));
    const need = Math.max(1, s.forMin);
    const fires: number[] = [];
    let run = 0;
    v.forEach((x, i) => { run = x > s.threshold ? run + 1 : 0; if (run === need) fires.push(i); });
    const falseAlerts = fires.filter((i) => i < 30).length;
    const real = fires.find((i) => i >= 30);
    const delay = real === undefined ? 99 : real - 30 + 1;
    return {
      readings: [
        { id: 'false', label: 'অকারণ alert', value: falseAlerts, good: falseAlerts === 0 },
        { id: 'delay', label: 'আসল সমস্যা ধরতে', value: delay, unit: 'মিনিট', good: delay <= 3 },
      ],
      picture: <AlertScan v={v} threshold={s.threshold} fires={fires} />,
    };
  },
  missions: [
    { text: 'অকারণ alert শূন্যে নামান', ok: (_, r) => r.false === 0 && r.delay! < 99 },
    { text: 'আসল সমস্যা ৩ মিনিটের মধ্যে ধরুন', ok: (_, r) => r.delay! <= 3 },
    { text: 'দুটোই একসাথে', ok: (_, r) => r.false === 0 && r.delay! <= 3, hint: 'Spike এক মিনিটের; আসল সমস্যা থেকে যায়।' },
  ],
});
