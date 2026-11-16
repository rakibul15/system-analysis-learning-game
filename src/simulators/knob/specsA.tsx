import { bn } from '@/shared/lib/bn';
import { Bars, fmt, Strip, type KnobSpec, type State } from './KnobSim';
import { AlertScan, Flow, IdStream, Player, RiderMap, SearchGrow, Typing, vis } from './anim';
import { tr } from '@/shared/lib/i18n';

export const spec = <S extends State>(x: KnobSpec<S>) => x;
const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/* L7 · Snowflake ID */
export const snowflake = spec<{ ts: number; machine: number; guard: boolean; events: number; lastDup: boolean }>({
  title: tr('৬৪ bit ভাগ করুন', 'Split the 64 bits'),
  intro: tr('প্রতিটা order-এর ID: ১ bit চিহ্ন, বাকি ৬৩ bit সময়, machine আর sequence-এ ভাগ। কত বছর চলবে, কত machine, প্রতি মিলিসেকেন্ডে কত ID?', 'Every order ID: 1 sign bit, the other 63 split between time, machine and sequence. How many years, how many machines, how many IDs per millisecond?'),
  init: { ts: 38, machine: 14, guard: false, events: 0, lastDup: false },
  controls: [
    { kind: 'slider', key: 'ts', label: 'Timestamp bit', min: 32, max: 46 },
    { kind: 'slider', key: 'machine', label: 'Machine bit', min: 4, max: 16 },
    { kind: 'toggle', key: 'guard', label: tr('ঘড়ি পিছোলে ID দেওয়া থামাও', 'Pause IDs when the clock goes back') },
  ],
  actions: [{ label: tr('NTP: ঘড়ি ৮০০ ms পিছোল', 'NTP: clock jumps back 800 ms'), tone: 'warn', run: (s) => ({ events: s.events + 1, lastDup: !s.guard }) }],
  model: (s) => {
    const seq = 63 - s.ts - s.machine;
    const valid = seq >= 0;
    const years = 2 ** s.ts / YEAR_MS;
    const machines = 2 ** s.machine;
    const perMs = valid ? 2 ** seq : 0;
    return {
      readings: [
        { id: 'years', label: tr('কত বছর চলবে', 'Years it lasts'), value: years, good: years >= 60, digits: years < 10 ? 1 : 0 },
        { id: 'machines', label: 'Machine', value: machines, good: machines >= 1024 },
        { id: 'perMs', label: 'ID / ms / machine', value: perMs, good: perMs >= 4096 },
        { id: 'seq', label: 'Sequence bit', value: seq, good: valid },
      ],
      picture: <>
        <Strip cells={[
          { label: tr('চিহ্ন', 'Sign'), flex: 1, color: '#E3E6DF', sub: bn(1) },
          { label: tr('সময় (ms)', 'Time (ms)'), flex: Math.max(1, s.ts), color: '#FFE7A8', sub: bn(s.ts) },
          { label: 'Machine', flex: Math.max(1, s.machine), color: '#BFEBDD', sub: bn(s.machine) },
          { label: 'Sequence', flex: Math.max(1, seq), color: valid ? '#C7D3F5' : '#E0483E', sub: bn(seq) },
        ]} />
        {!valid && <p className="m-0 font-semibold text-coral-deep">{tr('৬৩ bit-এর বেশি নিয়ে ফেলেছেন!', 'You have used more than 63 bits!')}</p>}
        <IdStream ts={s.ts} machine={s.machine} seq={seq} dup={s.lastDup} />
      </>,
      note: s.events ? (s.lastDup ? tr('ঘড়ি পিছোতেই আগের মিলিসেকেন্ড ফিরে এল: একই ID দ্বিতীয়বার!', 'The clock went back and an old millisecond returned: the same ID twice!') : tr('Generator শেষ timestamp মনে রেখেছে, ঘড়ি ধরে না ফেলা পর্যন্ত অপেক্ষা করল: কোনো duplicate নেই।', 'The generator remembered its last timestamp and waited for the clock to catch up: no duplicates.')) : undefined,
    };
  },
  missions: [
    { text: tr('ID যেন অন্তত ৬০ বছর চলে', 'Make IDs last at least 60 years'), ok: (_, r) => r.years! >= 60 && r.seq! >= 0, hint: tr('২^ts মিলিসেকেন্ড ≈ কত বছর?', '2^ts milliseconds ≈ how many years?') },
    { text: tr('৬০+ বছর, ১,০২৪+ machine, আর প্রতি ms-এ ৪,০৯৬+ ID একসাথে', '60+ years, 1,024+ machines and 4,096+ IDs per ms, all at once'), ok: (_, r) => r.years! >= 60 && r.machines! >= 1024 && r.perMs! >= 4096, hint: tr('Twitter-এর ভাগ: ৪১ + ১০ + ১২।', 'Twitter\'s split: 41 + 10 + 12.') },
    { text: tr('ঘড়ি পিছোলেও duplicate যেন না হয়', 'No duplicates even when the clock goes back'), ok: (s) => s.events > 0 && !s.lastDup },
  ],
});

/* L9 · web crawler */
export const crawler = spec<{ workers: number; delay: number; dedupe: boolean }>({
  title: tr('ভদ্র crawler', 'A polite crawler'),
  intro: tr('৫০০টা merchant site, মোট ১০ লাখ page। প্রতিটা page আনতে ০.৫ সেকেন্ড। লিংকের ৩০% আগেই দেখা page-এর।', '500 merchant sites, a million pages in all. Each page takes 0.5 seconds to fetch. 30% of links point to pages already seen.'),
  init: { workers: 20, delay: 0, dedupe: false },
  controls: [
    { kind: 'slider', key: 'workers', label: 'Worker', min: 10, max: 500, step: 10 },
    { kind: 'slider', key: 'delay', label: tr('একই site-এ দুই request-এর ফাঁক', 'Gap between requests to one site'), min: 0, max: 5, step: 0.5, unit: tr('সে.', 's') },
    { kind: 'toggle', key: 'dedupe', label: tr('দেখা URL মনে রাখুন', 'Remember seen URLs') },
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
        { id: 'hours', label: tr('শেষ হতে', 'Time to finish'), value: hours, unit: tr('ঘণ্টা', 'hours'), digits: 1, good: hours <= 1 },
        { id: 'perHost', label: tr('এক site-এ request / সে.', 'Requests / s to one site'), value: perHost, digits: 1, good: perHost <= 1 },
        { id: 'waste', label: tr('বাড়তি (duplicate) আনা', 'Extra (duplicate) fetches'), value: fetched - pages, good: fetched === pages },
      ],
      picture: <>
        <Flow label={tr('Crawler থেকে merchant site-এ request', 'Requests from the crawler to merchant sites')} h={46} nodes={[
          { id: 'q', label: 'URL queue', x: 10, y: 23, sub: s.dedupe ? tr('দেখা URL বাদ', 'seen URLs dropped') : tr('সব URL', 'every URL') },
          { id: 'w', label: 'Worker', x: 40, y: 23, sub: bn(s.workers) },
          ...[0, 1, 2, 3].map((i) => ({ id: `h${i}`, label: `site ${bn(i + 1)}`, x: 84, y: 6 + i * 11.3, tone: (perHost > 1 ? 'hot' : 'ok') as 'hot' | 'ok' })),
        ]} links={[
          { from: 'q', to: 'w', rate: vis(rate), mix: s.dedupe ? 0 : 0.3, mixColor: '#FFC02E' },
          ...[0, 1, 2, 3].map((i) => ({ from: 'w', to: `h${i}`, rate: Math.min(12, perHost * 1.5), color: perHost > 1 ? '#E0483E' : '#0B8A7A', mix: s.dedupe ? 0 : 0.3 })),
        ]} />
        <Bars rows={[
        { label: tr('Worker-এর ক্ষমতা (page/সে.)', 'Worker capacity (pages/s)'), value: workerRate, max: 1000 },
        { label: tr('ভদ্রতার সীমা (page/সে.)', 'Politeness cap (pages/s)'), value: Math.min(politeCap, 1000), max: 1000, text: Number.isFinite(politeCap) ? fmt(politeCap) : tr('সীমা নেই', 'no cap') },
        { label: tr('আসল গতি (page/সে.)', 'Actual speed (pages/s)'), value: rate, max: 1000 },
      ]} />
      </>,
      note: perHost > 1 ? tr(`একটা site-এ সেকেন্ডে ${fmt(perHost)}টা request: ছোট merchant-এর server বসে যাবে।`, `${fmt(perHost)} requests a second to one site: a small merchant's server will go down.`) : undefined,
    };
  },
  missions: [
    { text: tr('কোনো site-এ সেকেন্ডে ১টার বেশি request নয়', 'No more than 1 request a second to any site'), ok: (_, r) => r.perHost! <= 1 },
    { text: tr('একই page দুবার আনা বন্ধ করুন', 'Stop fetching the same page twice'), ok: (_, r) => r.waste === 0 },
    { text: tr('ভদ্র থেকে, duplicate ছাড়া, ১ ঘণ্টার মধ্যে শেষ', 'Polite, no duplicates, finished within 1 hour'), ok: (_, r) => r.perHost! <= 1 && r.waste === 0 && r.hours! <= 1, hint: tr('ভদ্রতার সীমা site-প্রতি; worker যথেষ্ট আছে তো?', 'The politeness cap is per site; do you have enough workers?') },
  ],
});

/* L13 · search autocomplete */
export const autocomplete = spec<{ debounce: number; mode: string }>({
  title: tr('টাইপ করতে করতে ঠিকানা', 'Addresses as you type'),
  intro: tr('"dhanmondi 27" টাইপ হচ্ছে, প্রতি অক্ষরে ১৫০ ms। Server-এ trie আছে; প্রতিটা prefix-এ সেরা ৫টা ঠিকানা দেখাতে হবে।', '"dhanmondi 27" is being typed, 150 ms per letter. The server has a trie; show the top 5 addresses for every prefix.'),
  init: { debounce: 0, mode: 'scan' },
  controls: [
    { kind: 'slider', key: 'debounce', label: 'Debounce', min: 0, max: 500, step: 50, unit: 'ms' },
    { kind: 'choice', key: 'mode', label: tr('Trie-তে খোঁজা', 'Trie lookup'), options: [{ id: 'scan', label: tr('পুরো subtree ঘাঁটা', 'Scan the whole subtree') }, { id: 'topk', label: tr('প্রতি node-এ top ৫ রাখা', 'Keep the top 5 at each node') }] },
  ],
  model: (s) => {
    const chars = 12, gap = 150;
    const requests = s.debounce < gap ? chars : 2;
    const server = s.mode === 'scan' ? 180 : 3;
    const felt = s.debounce + server;
    return {
      readings: [
        { id: 'requests', label: tr('Request (এক শব্দে)', 'Requests (per word)'), value: requests, good: requests <= 3 },
        { id: 'server', label: tr('Server-এ সময়', 'Server time'), value: server, unit: 'ms', good: server <= 10 },
        { id: 'felt', label: tr('User-এর অপেক্ষা', 'User waits'), value: felt, unit: 'ms', good: felt <= 300 },
      ],
      picture: <Typing debounce={s.debounce} server={server} />,
    };
  },
  missions: [
    { text: tr('এক শব্দে ৩টার বেশি request নয়', 'No more than 3 requests per word'), ok: (_, r) => r.requests! <= 3 },
    { text: tr('Server-এ প্রতিটা request ১০ ms-এর মধ্যে', 'Every request under 10 ms on the server'), ok: (_, r) => r.server! <= 10, hint: tr('Query-র সময় হিসাব না করে আগেই রেখে দিলে?', 'What if you precompute instead of working it out per query?') },
    { text: tr('কম request, আর user-এর অপেক্ষা ৩০০ ms-এর মধ্যে', 'Few requests, and the user waits under 300 ms'), ok: (_, r) => r.requests! <= 3 && r.felt! <= 300 },
  ],
});

/* L14 · video streaming */
const RENDITIONS = [[240, 0.4], [480, 1], [720, 2.5], [1080, 5]] as const;
const NETS: Record<string, number[]> = { good: [6, 6, 6], bad: [1.2, 1.2, 1.2], variable: [6, 1.2, 3] };
export const video = spec<{ r240: boolean; r480: boolean; r720: boolean; r1080: boolean; abr: boolean; net: string }>({
  title: 'Rider training video',
  intro: tr('Rider-রা ফোনে training video দেখে, network কখনো ভালো কখনো খারাপ। কোন quality-তে encode করবেন, আর player কীভাবে বাছবে?', 'Riders watch training videos on their phones, on networks good and bad. Which qualities do you encode, and how does the player choose?'),
  init: { r240: false, r480: false, r720: false, r1080: true, abr: false, net: 'bad' },
  controls: [
    { kind: 'toggle', key: 'r240', label: tr('240p (০.৪ Mbps)', '240p (0.4 Mbps)') },
    { kind: 'toggle', key: 'r480', label: tr('480p (১ Mbps)', '480p (1 Mbps)') },
    { kind: 'toggle', key: 'r720', label: tr('720p (২.৫ Mbps)', '720p (2.5 Mbps)') },
    { kind: 'toggle', key: 'r1080', label: tr('1080p (৫ Mbps)', '1080p (5 Mbps)') },
    { kind: 'toggle', key: 'abr', label: 'Adaptive bitrate (ABR)' },
    { kind: 'choice', key: 'net', label: 'Network', options: [{ id: 'good', label: tr('ভালো', 'Good') }, { id: 'bad', label: tr('খারাপ', 'Bad') }, { id: 'variable', label: tr('ওঠানামা', 'Variable') }] },
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
        { id: 'quality', label: tr('গড় quality', 'Average quality'), value: on.length ? quality / net.length : 0, unit: 'p', good: quality / net.length >= 600 },
        { id: 'storage', label: tr('Storage / মিনিট', 'Storage / minute'), value: storage, unit: 'MB', good: storage <= 50 },
        { id: 'count', label: 'Rendition', value: on.length },
      ],
      picture: <>
      <Player segs={net.map((bw, i) => ({ q: picks[i] ?? 0, br: RENDITIONS.find(([h]) => h === picks[i])?.[1] ?? 1, bw }))} />
      <div className="grid grid-cols-3 gap-2">
        {net.map((bw, i) => (
          <div key={i} className="rounded-xl border-2 border-ink bg-white p-2 text-center text-sm">
            <div className="text-xs text-muted">{tr('অংশ', 'Part')} {bn(i + 1)} · {bn(bw, { grouping: false })} Mbps</div>
            <div className="font-display text-2xl font-extrabold">{picks[i] ? `${bn(picks[i]!)}p` : '—'}</div>
            <div className={`text-xs font-bold ${picks[i] && (RENDITIONS.find(([h]) => h === picks[i])![1] > bw) ? 'text-coral-deep' : 'text-route-deep'}`}>{picks[i] && (RENDITIONS.find(([h]) => h === picks[i])![1] > bw) ? tr('আটকে আটকে চলছে', 'Stuttering') : tr('মসৃণ', 'Smooth')}</div>
          </div>
        ))}
      </div>
      </>,
    };
  },
  missions: [
    { text: tr('খারাপ network-এ শুধু 1080p দিয়ে buffering দেখুন', 'On a bad network, see 1080p alone buffer'), ok: (s, r) => s.net === 'bad' && r.rebuffer! > 0 },
    { text: tr('ওঠানামা network-এ buffering ০, গড় quality ৬০০p+', 'On a variable network: no buffering, average quality 600p+'), ok: (s, r) => s.net === 'variable' && r.rebuffer === 0 && r.quality! >= 600 },
    { text: tr('তার সাথে storage মিনিটে ৫০ MB-এর মধ্যে', 'And storage under 50 MB a minute'), ok: (s, r) => s.net === 'variable' && r.rebuffer === 0 && r.quality! >= 600 && r.storage! <= 50, hint: tr('সবচেয়ে দামি rendition কি সত্যিই লাগে?', 'Do you really need the most expensive rendition?') },
  ],
});

/* L15 · file sync */
export const filesync = spec<{ size: number; block: string; delta: boolean; compress: boolean; policy: string; conflicts: number; lost: number }>({
  title: tr('Invoice ফাইল sync', 'Invoice file sync'),
  intro: tr('Merchant-এর বড় invoice ফাইল, একটা লাইন বদলালেই আবার upload। দুই ফোনে একসাথে offline বদলও হয়।', 'A merchant\'s big invoice file is uploaded again whenever one line changes. And two phones sometimes edit it offline at once.'),
  init: { size: 400, block: '16', delta: false, compress: false, policy: 'last', conflicts: 0, lost: 0 },
  controls: [
    { kind: 'slider', key: 'size', label: tr('ফাইলের আকার', 'File size'), min: 10, max: 1000, step: 10, unit: 'MB' },
    { kind: 'choice', key: 'block', label: tr('Block-এর আকার', 'Block size'), options: [{ id: '1', label: `${bn(1)} MB` }, { id: '4', label: `${bn(4)} MB` }, { id: '16', label: `${bn(16)} MB` }] },
    { kind: 'toggle', key: 'delta', label: tr('শুধু বদলানো block পাঠান', 'Send only changed blocks') },
    { kind: 'toggle', key: 'compress', label: tr('Compress করুন', 'Compress') },
    { kind: 'choice', key: 'policy', label: tr('Conflict হলে', 'On conflict'), options: [{ id: 'last', label: tr('শেষ জন জেতে', 'Last writer wins') }, { id: 'copy', label: tr('দুটোই রাখুন', 'Keep both') }] },
  ],
  actions: [{ label: tr('দুই ফোনে একসাথে offline বদল', 'Two phones edit offline at once'), tone: 'warn', run: (s) => ({ conflicts: s.conflicts + 1, lost: s.policy === 'last' ? s.lost + 1 : s.lost }) }],
  model: (s) => {
    const upload = (s.delta ? Number(s.block) : s.size) * (s.compress ? 0.6 : 1);
    const share = upload / s.size;
    return {
      readings: [
        { id: 'upload', label: tr('এক লাইন বদলে upload', 'Upload for a one-line edit'), value: upload, unit: 'MB', digits: upload < 10 ? 1 : 0, good: share <= 0.01 },
        { id: 'share', label: tr('ফাইলের কত ভাগ', 'Share of the file'), value: share * 100, unit: '%', digits: 1, good: share <= 0.01 },
        { id: 'lost', label: tr('হারানো বদল', 'Lost edits'), value: s.lost, good: s.lost === 0 },
      ],
      picture: <>
      <Flow label={tr('ফোন থেকে server-এ upload', 'Uploads from phones to the server')} h={30} nodes={[
        { id: 'a', label: tr('ফোন A', 'Phone A'), x: 12, y: 8 }, { id: 'b', label: tr('ফোন B', 'Phone B'), x: 12, y: 23, tone: s.conflicts ? 'hot' : 'plain' },
        { id: 's', label: 'Server', x: 86, y: 15, tone: s.lost ? 'down' : 'ok', sub: s.lost ? tr('একটা বদল হারাল', 'an edit was lost') : undefined },
      ]} links={[
        { from: 'a', to: 's', rate: Math.min(18, 1 + upload / 12), color: share <= 0.01 ? '#0B8A7A' : '#FFC02E' },
        { from: 'b', to: 's', rate: s.conflicts ? 2 : 0, color: '#2F6FDE', drop: s.policy === 'last' ? 0.5 : 0 },
      ]} />
      <div className="grid grid-cols-10 gap-1" role="img" aria-label={tr('ফাইলের block', 'File blocks')}>
        {Array.from({ length: 40 }, (_, i) => <span key={i} className={`aspect-square rounded border-2 border-ink ${!s.delta || i === 17 ? 'sim-pulse' : ''}`} style={{ background: !s.delta || i === 17 ? '#FFC02E' : '#E3E6DF', animationDelay: `${(i % 10) * 60}ms` }} />)}
      </div>
      </>,
      note: s.conflicts ? (s.lost ? tr(`${bn(s.lost)} বার একজনের বদল নিঃশব্দে মুছে গেছে!`, `${s.lost} time(s) someone's change was silently wiped out!`) : tr('দুটো version-ই রাখা হয়েছে: "invoice (conflicted copy).xlsx"', 'Both versions were kept: "invoice (conflicted copy).xlsx"')) : undefined,
    };
  },
  missions: [
    { text: tr('৪০০ MB+ ফাইলে এক লাইন বদলে ফাইলের ১%-এর বেশি upload নয়', 'On a 400 MB+ file, a one-line edit uploads no more than 1%'), ok: (s, r) => s.size >= 400 && r.share! <= 1 },
    { text: tr('Offline conflict-এ কারো বদল যেন না হারায়', 'No one\'s edit is lost in an offline conflict'), ok: (s) => s.conflicts > 0 && s.policy === 'copy', hint: tr('Policy বদলে আবার conflict ঘটান।', 'Change the policy and cause another conflict.') },
    { text: tr('যেকোনো আকারের ফাইলে upload ১ MB-এর কম', 'Upload under 1 MB for a file of any size'), ok: (_, r) => r.upload! < 1 },
  ],
});

/* L17 · nearby friends live */
export const nearby = spec<{ riders: number; interval: number; fanout: string }>({
  title: 'Live rider map',
  intro: tr('Rider-রা প্রতি কয়েক সেকেন্ডে location পাঠায়; কাছের সহকর্মীরা map-এ live দেখে।', 'Riders send their location every few seconds; nearby teammates watch them live on a map.'),
  init: { riders: 100, interval: 2, fanout: 'all' },
  controls: [
    { kind: 'slider', key: 'riders', label: tr('Online rider (হাজার)', 'Online riders (thousands)'), min: 10, max: 100, step: 10 },
    { kind: 'slider', key: 'interval', label: tr('Location পাঠানোর ফাঁক', 'Location update interval'), min: 1, max: 30, unit: tr('সে.', 's') },
    { kind: 'choice', key: 'fanout', label: tr('কাকে পাঠাবেন', 'Send to whom'), options: [{ id: 'all', label: tr('সবাইকে', 'Everyone') }, { id: 'friends', label: tr('Team-এর ৫০ জন', '50 teammates') }, { id: 'near', label: tr('৫ km-এর team-mate', 'Teammates within 5 km') }] },
  ],
  model: (s) => {
    const recips = s.fanout === 'all' ? s.riders * 1000 : s.fanout === 'friends' ? 50 : 5;
    const msgs = ((s.riders * 1000) / s.interval) * recips;
    return {
      readings: [
        { id: 'msgs', label: tr('Message / সে.', 'Messages / s'), value: msgs, good: msgs <= 100_000 },
        { id: 'fresh', label: tr('Map কত পুরনো', 'How stale the map is'), value: s.interval, unit: tr('সে.', 's'), good: s.interval <= 10 },
        { id: 'riders', label: 'Rider', value: s.riders * 1000 },
      ],
      picture: <>
        <RiderMap fanout={s.fanout} interval={s.interval} />
        <Bars rows={[{ label: tr('Message / সে. (log scale)', 'Messages / s (log scale)'), value: Math.log10(msgs + 1), max: 11, target: 5, bad: msgs > 100_000, text: fmt(msgs) }]} />
      </>,
      note: msgs > 1e8 ? tr('প্রতিটা location সবার কাছে: পুরো WebSocket cluster গলে যাবে।', 'Every location to everyone: the whole WebSocket cluster will melt.') : undefined,
    };
  },
  missions: [
    { text: tr('১ লাখ rider-এ "সবাইকে" পাঠিয়ে message-এর পাহাড় দেখুন', 'With 100k riders, send to "everyone" and watch the message mountain'), ok: (s, r) => s.riders >= 100 && s.fanout === 'all' && r.msgs! > 1e9 },
    { text: tr('১ লাখ rider, সেকেন্ডে ১ লাখের কম message', '100k riders, under 100k messages a second'), ok: (s, r) => s.riders >= 100 && r.msgs! <= 100_000 },
    { text: tr('তার সাথে map ১০ সেকেন্ডের বেশি পুরনো নয়', 'And the map no more than 10 seconds stale'), ok: (s, r) => s.riders >= 100 && r.msgs! <= 100_000 && s.interval <= 10, hint: tr('সবাইকে না, শুধু কাছের team-mate।', 'Not everyone, just nearby teammates.') },
  ],
});

/* L18 · maps and routing */
export const maps = spec<{ algo: string; live: boolean; km: number; time: string }>({
  title: tr('ETA ঠিক করুন', 'Fix the ETA'),
  intro: tr('Rider-কে পথ আর পৌঁছানোর সময় দিতে হবে। শহরের প্রতিটা মোড় একটা node।', 'Give the rider a route and an arrival time. Every junction in the city is a node.'),
  init: { algo: 'dijkstra', live: false, km: 30, time: 'rush' },
  controls: [
    { kind: 'choice', key: 'algo', label: tr('পথ খোঁজা', 'Route search'), options: [{ id: 'dijkstra', label: 'Dijkstra' }, { id: 'astar', label: 'A*' }, { id: 'tiles', label: tr('Routing tile (স্তরে স্তরে)', 'Routing tiles (layered)') }] },
    { kind: 'slider', key: 'km', label: tr('দূরত্ব', 'Distance'), min: 1, max: 30, unit: 'km' },
    { kind: 'toggle', key: 'live', label: 'Live traffic' },
    { kind: 'choice', key: 'time', label: tr('সময়', 'Time'), options: [{ id: 'rush', label: tr('অফিস ছুটির ভিড়', 'Evening rush hour') }, { id: 'night', label: tr('রাত', 'Night') }] },
  ],
  model: (s) => {
    const explored = s.algo === 'dijkstra' ? 4000 * s.km * s.km : s.algo === 'astar' ? 600 * s.km * s.km : 200 * s.km;
    const ms = explored * 0.001;
    const error = s.time === 'night' ? 5 : s.live ? 7 : 38;
    return {
      readings: [
        { id: 'explored', label: tr('ঘাঁটা মোড়', 'Junctions explored'), value: explored },
        { id: 'ms', label: tr('পথ বের করতে', 'Time to find a route'), value: ms, unit: 'ms', good: ms <= 50, digits: ms < 10 ? 1 : 0 },
        { id: 'error', label: tr('ETA-র ভুল', 'ETA error'), value: error, unit: '%', good: error <= 10 },
      ],
      picture: <>
      <SearchGrow algo={s.algo} km={s.km} live={s.live} rush={s.time === 'rush'} />
      <Bars rows={[
        { label: tr('ঘাঁটা মোড় (log)', 'Junctions explored (log)'), value: Math.log10(explored), max: 7, text: fmt(explored), bad: ms > 50 },
        { label: tr('ETA-র ভুল', 'ETA error'), value: error, max: 50, target: 10, bad: error > 10, text: `${bn(error)}%` },
      ]} />
      </>,
    };
  },
  missions: [
    { text: tr('৩০ km পথ ৫০ ms-এর মধ্যে বের করুন', 'Find a 30 km route in under 50 ms'), ok: (s, r) => s.km >= 30 && r.ms! <= 50 },
    { text: tr('অফিস ছুটির ভিড়ে ETA-র ভুল ১০%-এর মধ্যে', 'ETA error within 10% in rush hour'), ok: (s, r) => s.time === 'rush' && r.error! <= 10 },
    { text: tr('ভিড়ের সময় ৩০ km: দ্রুতও, ঠিকও', '30 km in rush hour: fast and accurate'), ok: (s, r) => s.km >= 30 && s.time === 'rush' && r.ms! <= 50 && r.error! <= 10 },
  ],
});

/* L19 · distributed message queue */
export const mq = spec<{ acks: string; rf: number; commit: string; idem: boolean; bLost: number; bCrashes: number; cLost: number; cDup: number; cCrashes: number }>({
  title: tr('Event যেন না হারায়', 'No event left behind'),
  intro: tr('Order event-এর queue। Broker হঠাৎ পড়ে যেতে পারে, consumer-ও। কোন setting-এ কী হারায়, কী দুবার আসে?', 'A queue of order events. A broker can suddenly fall, and so can a consumer. Which settings lose events, and which deliver them twice?'),
  init: { acks: '1', rf: 1, commit: 'before', idem: false, bLost: 0, bCrashes: 0, cLost: 0, cDup: 0, cCrashes: 0 },
  controls: [
    { kind: 'choice', key: 'acks', label: 'Producer acks', options: [{ id: '0', label: bn(0) }, { id: '1', label: tr('১ (leader)', '1 (leader)') }, { id: 'all', label: 'all' }] },
    { kind: 'slider', key: 'rf', label: 'Replication factor', min: 1, max: 3 },
    { kind: 'choice', key: 'commit', label: 'Consumer offset commit', options: [{ id: 'before', label: tr('কাজের আগে', 'Before the work') }, { id: 'after', label: tr('কাজের পরে', 'After the work') }] },
    { kind: 'toggle', key: 'idem', label: tr('Consumer idempotent (event id মনে রাখে)', 'Idempotent consumer (remembers event IDs)') },
  ],
  actions: [
    { label: 'Leader broker crash', tone: 'warn', run: (s) => ({ bCrashes: s.bCrashes + 1, bLost: s.acks === '0' ? 50 : s.acks === '1' ? (s.rf === 1 ? 50 : 12) : s.rf >= 2 ? 0 : 50 }) },
    { label: 'Consumer crash', tone: 'warn', run: (s) => ({ cCrashes: s.cCrashes + 1, cLost: s.commit === 'before' ? 5 : 0, cDup: s.commit === 'after' && !s.idem ? 5 : 0 }) },
  ],
  model: (s) => ({
    readings: [
      { id: 'bLost', label: tr('Broker crash-এ হারাল', 'Lost in broker crash'), value: s.bLost, good: s.bCrashes > 0 ? s.bLost === 0 : undefined },
      { id: 'cLost', label: tr('Consumer crash-এ হারাল', 'Lost in consumer crash'), value: s.cLost, good: s.cCrashes > 0 ? s.cLost === 0 : undefined },
      { id: 'cDup', label: tr('দুবার process', 'Processed twice'), value: s.cDup, good: s.cCrashes > 0 ? s.cDup === 0 : undefined },
      { id: 'latency', label: 'Write latency', value: s.acks === 'all' ? 3 + s.rf : s.acks === '1' ? 2 : 1, unit: 'ms' },
    ],
    picture: <>
    <Flow label={tr('Producer থেকে broker হয়ে consumer', 'From producer through brokers to consumer')} h={44} nodes={[
      { id: 'p', label: 'Producer', x: 10, y: 22, sub: `acks=${s.acks}` },
      { id: 'l', label: 'Leader', x: 42, y: 22, tone: s.bLost ? 'down' : 'ok' },
      ...Array.from({ length: s.rf - 1 }, (_, i) => ({ id: `f${i}`, label: `Follower ${bn(i + 1)}`, x: 42, y: i ? 38 : 6, tone: 'plain' as const })),
      { id: 'c', label: 'Consumer', x: 86, y: 22, tone: s.cLost || s.cDup ? 'hot' : 'ok', sub: s.commit === 'before' ? tr('commit → কাজ', 'commit → work') : tr('কাজ → commit', 'work → commit') },
    ]} links={[
      { from: 'p', to: 'l', rate: 6, drop: s.bLost ? 0.35 : 0 },
      ...Array.from({ length: s.rf - 1 }, (_, i) => ({ from: 'l', to: `f${i}`, rate: 6, color: '#2F6FDE' })),
      { from: 'l', to: 'c', rate: 6, drop: s.cLost ? 0.3 : 0, mix: s.cDup ? 0.3 : 0 },
    ]} />
    <Strip cells={[
      { label: 'Producer', flex: 1, color: '#FFE7A8', sub: `acks=${s.acks}` },
      ...Array.from({ length: s.rf }, (_, i) => ({ label: i ? `Follower ${bn(i)}` : 'Leader', flex: 1, color: '#C7D3F5', sub: 'partition' })),
      { label: 'Consumer', flex: 1, color: '#BFEBDD', sub: s.commit === 'before' ? tr('commit → কাজ', 'commit → work') : tr('কাজ → commit', 'work → commit') },
    ]} />
    </>,
    note: s.cCrashes && s.cDup ? tr('কাজ শেষ, কিন্তু commit-এর আগে crash: restart-এ একই event আবার।', 'Work done, but a crash before the commit: after restart, the same events again.') : s.cCrashes && s.cLost ? tr('Commit হয়ে গেছে, কাজের আগেই crash: event-গুলো চিরতরে বাদ।', 'Committed, then a crash before the work: those events are gone for good.') : undefined,
  }),
  missions: [
    { text: tr('Leader broker crash-এ একটাও event যেন না হারায়', 'Lose no events when the leader broker crashes'), ok: (s) => s.bCrashes > 0 && s.bLost === 0, hint: tr('সব replica লিখলে তবেই "OK"।', 'Only say "OK" once every replica has written it.') },
    { text: tr('Consumer crash-এ একটাও event যেন না হারায়', 'Lose no events when a consumer crashes'), ok: (s) => s.cCrashes > 0 && s.cLost === 0 },
    { text: tr('Consumer crash-এ না হারানো, না দুবার (effectively once)', 'On a consumer crash, neither lost nor doubled (effectively once)'), ok: (s) => s.cCrashes > 0 && s.cLost === 0 && s.cDup === 0 },
  ],
});

/* L20 · metrics and alerting */
const SERIES = Array.from({ length: 60 }, (_, m) => (m >= 30 ? 12.5 : [8, 17, 23].includes(m) ? 14 : 1 + ((m * 37) % 7) / 5));
export const alerting = spec<{ threshold: number; forMin: number; agg: string }>({
  title: tr('Alert যেন বাজে, কিন্তু অকারণে না', 'Alerts that ring, but not for nothing'),
  intro: tr('এক ঘণ্টার error rate। মাঝে মাঝে এক মিনিটের spike আসে (কিছু ভাঙেনি), আর ৩০ মিনিটে আসল সমস্যা শুরু।', 'An hour of error rate. One-minute spikes come and go (nothing broke), and at minute 30 a real problem starts.'),
  init: { threshold: 5, forMin: 0, agg: 'raw' },
  controls: [
    { kind: 'slider', key: 'threshold', label: tr('Error rate সীমা', 'Error rate threshold'), min: 1, max: 20, unit: '%' },
    { kind: 'slider', key: 'forMin', label: tr('কতক্ষণ সীমার ওপরে থাকলে', 'For how long above it'), min: 0, max: 10, unit: tr('মিনিট', 'min') },
    { kind: 'choice', key: 'agg', label: tr('মান', 'Value'), options: [{ id: 'raw', label: tr('প্রতি মিনিটের', 'Per minute') }, { id: 'avg5', label: tr('৫ মিনিটের গড়', '5-minute average') }] },
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
        { id: 'false', label: tr('অকারণ alert', 'False alerts'), value: falseAlerts, good: falseAlerts === 0 },
        { id: 'delay', label: tr('আসল সমস্যা ধরতে', 'Time to catch the real problem'), value: delay, unit: tr('মিনিট', 'min'), good: delay <= 3 },
      ],
      picture: <AlertScan v={v} threshold={s.threshold} fires={fires} />,
    };
  },
  missions: [
    { text: tr('অকারণ alert শূন্যে নামান', 'Bring false alerts down to zero'), ok: (_, r) => r.false === 0 && r.delay! < 99 },
    { text: tr('আসল সমস্যা ৩ মিনিটের মধ্যে ধরুন', 'Catch the real problem within 3 minutes'), ok: (_, r) => r.delay! <= 3 },
    { text: tr('দুটোই একসাথে', 'Both at once'), ok: (_, r) => r.false === 0 && r.delay! <= 3, hint: tr('Spike এক মিনিটের; আসল সমস্যা থেকে যায়।', 'A spike lasts one minute; a real problem stays.') },
  ],
});
