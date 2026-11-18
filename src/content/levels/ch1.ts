import type { TrafficRules } from '@/simulators/traffic';
import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ১ · শূন্য থেকে লাখো customer — Vol 1, ch 1–4 */

const scoring = { pointsPerParcel: 10, comboStep: 5, maxMultiplier: 3, happinessLossPerDrop: 12 };
const manual: TrafficRules = {
  durationSeconds: 30,
  spawnInterval: { start: 1.3, end: 0.9 },
  travelSeconds: { approach: 2.2, branch: 1.3 },
  hubs: [{ capacity: 6, serviceSeconds: 1.8 }, { capacity: 6, serviceSeconds: 1.8 }],
  outages: [{ hub: 1, downAt: 13, upAt: 20, warnBefore: 2 }],
  policy: 'manual',
  healthCheck: false,
  scoring,
};

export const l1 = level({
  id: 1, chapter: 1, minutes: 18,
  title: 'প্রথম ভিড়', concept: 'Load balancer · Replication',
  story: 'Site পড়ে গেলে সব বন্ধ',
  briefing: 'ParcelGo-র প্রথম দিন: একটা server-এই web আর database। ঈদের আগে order বাড়ল, server ধীর হল, তারপর পড়ে গেল। পুরো দোকান বন্ধ। আজ শিখবেন কীভাবে এক জায়গার ভাঙন পুরো ব্যবসা থামিয়ে না দেয়।',
  ref: refs.v1_1,
  predict: ['একটা server-এ সব থাকলে সবচেয়ে বড় ঝুঁকি কী?', ['Server পড়লে পুরো site বন্ধ', 'Code deploy করতে বেশি সময় লাগে', 'Database-এ index বানানো যায় না', 'User বাড়লে CSS file ভেঙে যায়']],
  nodes: [
    ['u', 'Customer', 'user', 8, 50], ['one', 'একটা server', 'server', 50, 50],
    ['lb', 'Load balancer', 'lb', 30, 50], ['w1', 'Web ১', 'server', 55, 28], ['w2', 'Web ২', 'server', 55, 72],
    ['m', 'DB master', 'db', 84, 28], ['s', 'DB slave', 'db', 84, 72],
  ],
  steps: [
    { text: 'শুরুতে সব একটা server-এ: web আর database একসাথে।', add: ['u', 'one'], flow: [['u', 'one']] },
    { text: 'Server পড়ে গেল, সব বন্ধ। এটাই single point of failure (SPOF)।', down: ['one'] },
    { text: 'সামনে load balancer, পেছনে দুটো web server। User শুধু LB-র ঠিকানা জানে।', hide: ['one'], add: ['lb', 'w1', 'w2'], flow: [['u', 'lb'], ['lb', 'w1'], ['lb', 'w2']] },
    { text: 'Web ২ হঠাৎ বন্ধ হয়ে গেল।', down: ['w2'], ask: ['Web ২ পড়ে গেলে কী হবে?', ['Traffic Web ১-এ যাবে, site চালু', 'Site বন্ধ, Web ২ ঠিক না হওয়া পর্যন্ত', 'LB-ও বন্ধ, কারণ সেটা Web ২-এর উপর নির্ভর', 'অর্ধেক user error দেখবে চিরকাল']] },
    { text: 'Health check ব্যর্থ, তাই LB শুধু Web ১-এ পাঠায়। Site চালু।', down: ['w2'], ok: ['w1'], flow: [['u', 'lb'], ['lb', 'w1']] },
    { text: 'Database-ও একটাই হলে SPOF। Master-এ write, slave-এ copy (replication), read যায় slave থেকে।', add: ['m', 's'], flow: [['w1', 'm'], ['m', 's'], ['w2', 's']] },
    { text: 'এবার master পড়ে গেল।', down: ['m'], ask: ['Master পড়ে গেলে কী হবে?', ['Slave নতুন master হয়; শেষ কিছু write হারাতে পারে', 'Slave নতুন master হয়; কোনো data কখনো হারায় না', 'Slave-ও বন্ধ হয়, কারণ সে master-এর copy', 'Master না ফেরা পর্যন্ত read-ও বন্ধ থাকে']] },
    { text: 'Slave-কে master বানানো হয় (failover)। শেষের replicate না হওয়া write হারাতে পারে, তাই recovery script লাগে।', down: ['m'], ok: ['s'], badges: { s: 'নতুন master' } },
  ],
  summary: [
    'একটা জিনিসের উপর সব নির্ভর করলে সেটা SPOF',
    'Load balancer + একাধিক stateless web server = horizontal scale আর failover',
    'Master–slave replication: write master-এ, read slave-এ; master পড়লে slave promote',
  ],
  play: {
    kind: 'traffic',
    intro: {
      kicker: 'খেলা · ৩০ সেকেন্ড', heading: 'ভিড়ের সময়!',
      body: 'এখন আপনিই load balancer। Hub-এ tap করলে lever সেদিকে ঘোরে, parcel সেদিকে যায়।',
      rules: ['একটা hub-এ একসাথে সর্বোচ্চ ৬টা parcel জমে, বেশি হলে উপচে পড়ে', 'বন্ধ hub-এ পাঠালে parcel হারিয়ে যায়', 'টানা ৫টা ঠিক পৌঁছালে নম্বর ×২, ১০টায় ×৩'],
    },
    rounds: {
      demo: { ...manual, durationSeconds: null, outages: [], policy: 'roundRobin', healthCheck: true, spawnInterval: { start: 1.3, end: 1.3 } },
      manual,
      auto: { ...manual, durationSeconds: 18, spawnInterval: { start: 0.95, end: 0.95 }, outages: [{ hub: 1, downAt: 6, upAt: 12, warnBefore: 2 }], policy: 'roundRobin', healthCheck: true },
    },
    concepts: [
      { id: 'round-robin', label: 'Round robin', litAt: 0 },
      { id: 'health-check', label: 'Health check', litAt: 6 },
      { id: 'failover', label: 'Failover + retry', litAt: 6 },
    ],
    captions: {
      idle: 'পেছনে যেটা চলছে সেটা auto load balancer। আগে নিজে হাতে চেষ্টা করুন, তারপর বুঝবেন ওটা কেন দরকার।',
      manual: 'Hub-এ tap করে lever ঘোরান। কোনো hub-এ ৬টার বেশি জমতে দেবেন না।',
      manualHubDown: 'Hub ২ বন্ধ! এখন ওদিকে পাঠালে parcel হারাবে। Hub ১ একা কতটা টানতে পারে খেয়াল করুন।',
      manualHubBack: 'Hub ২ ফিরেছে। আবার দুই দিকে পালা করে ভাগ করুন।',
      autoStart: 'Round robin: load balancer নিজেই পালা করে পাঠাচ্ছে, ১, ২, ১, ২… Lever-টা দেখুন।',
      autoHubDown: 'Health check ব্যর্থ, তাই Hub ২ তালিকা থেকে বাদ (failover)। রাস্তায় থাকা parcel ঘুরে Hub ১-এ যাচ্ছে (retry)।',
      autoHubBack: 'Health check আবার পাস করেছে, Hub ২ নিজে থেকেই তালিকায় ফিরেছে। কাউকে কিছু করতে হয়নি।',
      afterManual: 'এইমাত্র হাতে যা করলেন (পালা করে ভাগ, বন্ধ hub এড়ানো), একটা load balancer সেটাই নিজে করে। এবার একই ভিড়ে auto বসিয়ে দেখুন।',
      afterAuto: 'একই ভিড়, একই বিগড়ে যাওয়া hub, কিন্তু কাউকে lever ধরতে হয়নি। পালা করে ভাগ, অসুস্থ hub বাদ, সুস্থ হলে ফেরত: এই তিনটাই load balancer-এর মূল।',
    },
  },
  boss: [
    ['LB-র পেছনে ৩টা web server, একটা database। SPOF কোনটা?', ['Database, আর LB একটা হলে সেটাও', 'যেকোনো একটা web server, কারণ সে request নেয়', 'তিনটা web server একসাথে, কারণ সব একই code', 'কোনোটাই না, কারণ LB সব সামলায়'], 'যেটার কোনো বিকল্প নেই সেটাই SPOF। Web server তিনটা, তাই একটা পড়লে চলে; database একটাই।', 'কোনটার কপি নেই?'],
    ['Web server stateless রাখা হয় কেন?', ['যেকোনো server যেকোনো request নিতে পারে', 'Server-এর memory-তে session থাকলে দ্রুত হয়', 'Stateless হলে database আর লাগে না', 'Stateless code compile হয় তাড়াতাড়ি'], 'Session-এর মতো state shared store (Redis/DB)-এ রাখলে LB যেকোনো server-এ পাঠাতে পারে, autoscale সহজ।'],
    ['Vertical scaling-এর সমস্যা কোনটা?', ['এক machine-এর সীমা, আর failover নেই', 'Load balancer ছাড়া চলে না', 'Code বদলে ভাগ করতে হয়', 'Data কয়েক জায়গায় copy করতে হয়'], 'বড় server কেনারও শেষ আছে, আর সেই একটা server পড়লে সব বন্ধ।'],
    ['Read বেশি, write কম। Replication-এর সবচেয়ে বড় লাভ?', ['Read অনেক slave-এ ভাগ হয়', 'Write অনেক master-এ ভাগ হয়', 'মোট storage কম লাগে', 'Query-তে index লাগে না'], 'Write master-এ, read অনেক slave-এ: read-heavy system-এ চাপ ভাগ হয়।'],
    ['দুটো data center-এ user ভাগ করতে কী লাগে?', ['GeoDNS আর দুই জায়গায় data replicate', 'দুই জায়গায় দুটো আলাদা database, sync ছাড়া', 'সব user এক data center-এ, অন্যটা ফাঁকা', 'প্রতিটা data center-এ আলাদা domain'], 'GeoDNS user-কে কাছেরটায় পাঠায়; একটা পড়লে সব traffic অন্যটায়, তাই data দুই জায়গায় থাকতে হয়।'],
  ],
});

export const l2 = level({
  id: 2, chapter: 1, simulator: 'cache',
  title: 'দ্রুত তাক', concept: 'Cache · CDN',
  story: 'Page ধীর, DB-তে চাপ',
  briefing: 'একই product page দিনে লাখবার খোলা হয়, আর প্রতিবার database থেকে পড়া হয়। DB হাঁপিয়ে উঠেছে, page খুলতে ৩ সেকেন্ড। বারবার চাওয়া জিনিস হাতের কাছের তাকে রাখার সময়।',
  ref: refs.v1_1,
  predict: ['একই page বারবার খোলা হচ্ছে, প্রতিবার DB থেকে পড়া। কী করলে সবচেয়ে বেশি লাভ?', ['Cache-এ রেখে দেওয়া', 'Table-এ আরও column যোগ', 'প্রতি ঘণ্টায় server restart', 'Page-এ ছবি কমিয়ে দেওয়া']],
  nodes: [
    ['u', 'Customer', 'user', 8, 55], ['cdn', 'CDN', 'cdn', 30, 18], ['web', 'Web server', 'server', 36, 60],
    ['cache', 'Cache', 'cache', 66, 34], ['db', 'Database', 'db', 86, 66],
  ],
  steps: [
    { text: 'প্রতিটা request database পর্যন্ত যায়; DB-তে চাপ, page ধীর।', add: ['u', 'web', 'db'], flow: [['u', 'web'], ['web', 'db']] },
    { text: 'আগে cache দেখি। পাওয়া গেলে (hit) DB-তে যেতেই হয় না।', add: ['cache'], flow: [['u', 'web'], ['web', 'cache']], ok: ['cache'], badges: { cache: 'hit' } },
    { text: 'না পেলে (miss) DB থেকে পড়ে cache-এ রেখে দিই। এটা cache-aside।', flow: [['web', 'cache'], ['web', 'db']], badges: { cache: 'miss' } },
    { text: 'এই item-এর TTL শেষ হয়ে গেল।', badges: { cache: 'TTL শেষ' }, ask: ['TTL শেষ হওয়ার পরের request কোথায় যাবে?', ['Miss → DB → আবার cache-এ রাখা', 'Cache থেকেই পুরনো মান আসে', 'Request বাতিল, client আবার চাইবে', 'সরাসরি CDN-এ, DB-তে নয়']] },
    { text: 'TTL শেষ মানে miss: DB থেকে নতুন মান এনে আবার রাখা। TTL ছোট হলে data টাটকা, কিন্তু DB-তে চাপ বেশি।', flow: [['web', 'db'], ['web', 'cache']] },
    { text: 'ছবি, JS, CSS-এর মতো static file যায় CDN থেকে, user-এর কাছের server থেকে।', add: ['cdn'], flow: [['u', 'cdn']], ok: ['cdn'] },
    { text: 'Cache server পুরো পড়ে গেল।', down: ['cache'], ask: ['Cache পড়ে গেলে কী হবে?', ['সব request DB-তে, DB চাপে পড়ে', 'Site বন্ধ হয়ে যায় পুরোপুরি', 'Cache-এর data চিরতরে হারায়', 'CDN-ও সাথে সাথে বন্ধ হয়']] },
    { text: 'সব চাপ DB-তে: তাই একাধিক cache server, আর memory ভরলে eviction (যেমন LRU)।', down: ['cache'], flow: [['web', 'db']] },
  ],
  summary: ['Cache-aside: আগে cache, miss হলে DB থেকে এনে রাখা', 'TTL ছোট = টাটকা data কিন্তু DB-তে চাপ; বড় = উল্টো', 'Static file CDN-এ; cache নিজেও যেন SPOF না হয়'],
  play: {
    kind: 'missions', intro: 'তিনটা সিদ্ধান্ত: TTL, eviction আর hit rate-এর হিসাব।',
    missions: [
      ['Price প্রায়ই বদলায়, ভুল price দেখানো চলবে না। Cache কীভাবে?', ['ছোট TTL বা বদলালেই invalidate', 'TTL এক দিন, রাতে সব মুছে', 'কখনো expire না, সবসময় cache', 'Price cache-এ রাখা নিষেধ, কখনো না'], 'টাটকা থাকা জরুরি হলে ছোট TTL বা write-এর সময় invalidate।'],
      ['Cache-এ জায়গা শেষ। কোনটা ফেলবেন যাতে hit rate বেশি থাকে?', ['অনেকক্ষণ কেউ চায়নি এমনটা (LRU)', 'সবচেয়ে নতুন রাখা item-টা', 'সবসময় প্রথম রাখা item-টা', 'সবচেয়ে বড় item-টা, আকার দেখে'], 'LRU: least recently used। সম্প্রতি চাওয়া জিনিস আবার চাওয়ার সম্ভাবনা বেশি।'],
      ['Hit rate ৯০%, প্রতি সেকেন্ডে ১০,০০০ read। DB-তে কত read যায়?', ['১,০০০', '৯,০০০', '১০,০০০', '১০০'], '১০% miss = ১০,০০০ × ০.১ = ১,০০০।'],
    ],
  },
  boss: [
    ['Cache-এ কী রাখবেন না?', ['Wallet balance-এর মতো নির্ভুল data', 'Product-এর ছবি আর পুরো বিবরণ', 'Category-র তালিকা আর নাম', 'Homepage-এর banner আর offer'], 'Cache-এর data একটু পুরনো হতে পারে; টাকার হিসাব সেই ঝুঁকি নিতে পারে না।'],
    ['CDN-এ JS file বদলালে user যেন পুরনো copy না পায়?', ['File নামে version বা invalidation', 'TTL অসীম করে সব আটকে রাখা', 'User-কে browser cache মুছতে বলা', 'কিছুক্ষণের জন্য CDN বন্ধ রাখা'], 'নতুন নাম মানে নতুন object; পুরনোটা আপনা থেকে বাদ।'],
    ['Cache server মাত্র একটা হলে?', ['SPOF; একাধিক cache server রাখা', 'সমস্যা নেই, DB তো আছেই', 'DB-র চাপ উল্টো কমে যায়', 'CDN থাকলে cache-এর ভাঙন ধরা পড়ে না'], 'বইয়ের পরামর্শ: একাধিক cache server, আর memory কিছুটা বেশি রাখা।', 'আগের level-এর শব্দটা মনে করুন'],
    ['Write বেশি, read কম এমন data-য় cache-এর লাভ?', ['কম, cache বারবার পুরনো হয়', 'অনেক বেশি, write দ্রুত হয়', 'অনেক বেশি, DB লাগে না', 'Read-এর মতোই সমান লাভ'], 'Cache লাভজনক যখন একই data বারবার পড়া হয় কিন্তু কম বদলায়।'],
    ['Tracking status page: ১০ সেকেন্ড পুরনো চলবে। Stale বনাম DB চাপ, সেরা পথ?', ['TTL ১০ সেকেন্ডের মতো রাখা', 'Cache ছাড়া সব DB থেকে', 'TTL এক সপ্তাহ', 'প্রতি request-এ cache মুছে দেওয়া'], 'কতটা পুরনো চলবে সেটাই TTL ঠিক করে।'],
  ],
});

export const l3 = level({
  id: 3, chapter: 1, simulator: 'estimation',
  title: 'Investor-এর প্রশ্ন', concept: 'Estimation · Interview framework',
  story: 'Investor জিজ্ঞেস করছে কত server লাগবে',
  briefing: 'Investor meeting-এ প্রশ্ন: "এক কোটি customer হলে কত server আর কত storage লাগবে?" Calculator ছাড়া, মুখে মুখে, পাঁচ মিনিটে। সাথে শিখবেন interview-এর ৪৫ মিনিট কীভাবে ভাগ করবেন।',
  ref: refs.v1_2,
  predict: ['১ কোটি DAU, প্রতিজন দিনে ১০টা request। গড় QPS মোটামুটি?', ['~১,২০০', '~১২০', '~১২,০০০', '~১ কোটি']],
  nodes: [
    ['dau', 'DAU', 'user', 10, 40], ['req', 'দিনে request', 'step', 30, 40], ['qps', 'QPS', 'step', 50, 40],
    ['peak', 'Peak QPS', 'step', 70, 40], ['st', 'Storage', 'store', 90, 40],
    ['f1', 'প্রয়োজন বোঝা', 'step', 14, 82], ['f2', 'High-level', 'step', 38, 82], ['f3', 'Deep dive', 'step', 62, 82], ['f4', 'শেষ কথা', 'step', 86, 82],
  ],
  steps: [
    { text: 'শুরু DAU দিয়ে: ধরি ১ কোটি user রোজ আসে।', add: ['dau'], badges: { dau: '১ কোটি' } },
    { text: 'প্রতিজন দিনে ১০টা request: দিনে ১০ কোটি।', add: ['req'], flow: [['dau', 'req']], badges: { req: '১০ কোটি' } },
    { text: 'দিনে ~১ লাখ সেকেন্ড (৮৬,৪০০)। ১০ কোটি ÷ ১ লাখ ≈ ১,০০০–১,২০০ QPS।', add: ['qps'], flow: [['req', 'qps']], badges: { qps: '~১,২০০' } },
    { text: 'এখন সবচেয়ে ভিড়ের সময়ের হিসাব।', add: ['peak'], ask: ['Peak QPS কত ধরবেন?', ['গড়ের ~২ গুণ: ~২,৪০০', 'গড়ের সমান: ~১,২০০', 'গড়ের ১০ গুণ: ~১২,০০০', 'গড়ের অর্ধেক: ~৬০০']] },
    { text: 'Peak সাধারণত গড়ের ২ গুণ ধরা হয় (বইয়ের নিয়ম)।', flow: [['qps', 'peak']], badges: { peak: '~২,৪০০' } },
    { text: 'দিনে ১ কোটি নতুন record × ১০ KB ≈ ১০০ GB/দিন; ৫ বছরে ~১৮০ TB।', add: ['st'], flow: [['peak', 'st']], badges: { st: '~১০০ GB/দিন' } },
    { text: 'হিসাব শেষ। এবার interview-এর কাঠামো।', add: ['f1', 'f2', 'f3', 'f4'], focus: ['f1'], ask: ['Interview-এর প্রথম ৩–১০ মিনিটে কী করবেন?', ['প্রশ্ন করে প্রয়োজন আর scale বোঝা', 'সাথে সাথে database বেছে নেওয়া', 'API-র code লিখতে শুরু করা', 'সবচেয়ে বড় design আগে আঁকা']] },
    { text: 'চার ধাপ: প্রয়োজন বোঝা → high-level design-এ মিল → গভীরে যাওয়া → শেষে bottleneck আর উন্নতির কথা।', focus: ['f1', 'f2', 'f3', 'f4'], flow: [['f1', 'f2'], ['f2', 'f3'], ['f3', 'f4']] },
  ],
  summary: ['QPS ≈ DAU × প্রতিজনের request ÷ ১ লাখ সেকেন্ড', 'Peak ≈ গড়ের ২ গুণ; storage = নতুন record × আকার × সময়', 'Interview: প্রয়োজন → high-level → deep dive → wrap-up'],
  play: {
    kind: 'missions', intro: 'তিনটা হিসাব, মুখে মুখে। গোল সংখ্যা নিন।',
    missions: [
      ['৫০ লাখ DAU, প্রতিজন দিনে ২টা post। Write QPS?', ['~১০০', '~১০', '~১,০০০', '~১০,০০০'], '৫০ লাখ × ২ = ১ কোটি; ÷ ~১ লাখ সেকেন্ড ≈ ১০০।'],
      ['দিনে ১০ লাখ ছবি, গড় ৫০০ KB। দিনে storage?', ['~৫০০ GB', '~৫ GB', '~৫০ TB', '~৫০০ MB'], '১০^৬ × ৫ × ১০^৫ byte = ৫ × ১০^১১ = ৫০০ GB।'],
      ['Memory থেকে পড়া বনাম disk seek: কোনটা দ্রুত?', ['Memory (ns বনাম ms)', 'Disk seek (sequential বলে)', 'দুটো প্রায় সমান', 'নির্ভর করে CPU-র উপর'], 'Memory reference ~১০০ ns, disk seek ~১০ ms: প্রায় লাখ গুণ পার্থক্য।'],
    ],
  },
  boss: [
    ['প্রয়োজন বোঝার সময় কোন প্রশ্নগুলো সবচেয়ে কাজের?', ['কতজন user, কোন feature, কত বাড়বে', 'কোন programming language পছন্দ', 'Team-এ কতজন engineer আছে', 'কোন cloud provider ব্যবহার হয়'], 'Scope আর scale না জেনে design করা মানে অন্ধকারে ঢিল।'],
    ['৩০ কোটি MAU, ৫০% রোজ আসে, প্রতিজন দিনে ২টা post। Post QPS?', ['~৩,৫০০', '~৩৫০', '~৩৫,০০০', '~৭০০'], '১৫ কোটি × ২ = ৩০ কোটি; ÷ ৮৬,৪০০ ≈ ৩,৫০০।', 'DAU আগে বের করুন'],
    ['গড় QPS ৩,৫০০ হলে peak কত ধরবেন?', ['~৭,০০০', '~৩,৫০০', '~৩৫০', '~৭ লাখ'], 'Peak ≈ গড় × ২।'],
    ['Deep dive-এ কী করবেন?', ['আগ্রহের অংশে bottleneck আর trade-off', 'সব component সমান বিস্তারে বলা', 'নতুন feature যোগ করে দেখানো', 'আগের diagram আবার শুরু থেকে বলা'], 'সময় সীমিত: দুই-তিনটা অংশ গভীরে, বাকি উপর দিয়ে।'],
    ['হিসাবে কোনটা ভালো অভ্যাস?', ['গোল সংখ্যা, অনুমান লেখা, একক সহ', 'দশমিক ৪ ঘর পর্যন্ত নির্ভুল হিসাব', 'অনুমান না বলে শুধু শেষ উত্তর', 'একক ছাড়া শুধু সংখ্যা লেখা'], 'Interviewer ফলের চেয়ে প্রক্রিয়া দেখে।'],
  ],
});

export const l4 = level({
  id: 4, chapter: 1, simulator: 'ratelimit',
  title: 'Bot-এর বন্যা', concept: 'Rate limiter',
  story: 'একটা bot API ভাসিয়ে দিচ্ছে',
  briefing: 'রাত ২টায় একটা IP থেকে সেকেন্ডে হাজার request। আসল customer order দিতে পারছে না। সামনে একজন দারোয়ান দরকার, যে গুনে গুনে ঢুকতে দেবে।',
  ref: refs.v1_4,
  predict: ['এক IP থেকে সেকেন্ডে হাজার request। প্রথম কাজ?', ['Rate limiter বসিয়ে বাড়তি আটকানো', 'আরও server যোগ করে সামলানো', 'Database বদলে দ্রুত কোনোটা', 'Cache মুছে নতুন করে ভরা']],
  nodes: [
    ['bot', 'Bot', 'bot', 8, 28], ['u', 'Customer', 'user', 8, 72], ['rl', 'Rate limiter', 'lb', 40, 50],
    ['api', 'API server', 'server', 72, 50], ['redis', 'Redis counter', 'cache', 40, 88], ['drop', '429', 'step', 72, 14],
  ],
  steps: [
    { text: 'Bot-এর request-এ API ডুবে যাচ্ছে, আসল customer-ও আটকে।', add: ['bot', 'u', 'api'], flow: [['bot', 'api'], ['u', 'api']], down: ['api'] },
    { text: 'API-র সামনে rate limiter (middleware বা API gateway)। প্রতি client-এর গোনা থাকে Redis-এ।', add: ['rl', 'redis'], flow: [['bot', 'rl'], ['u', 'rl'], ['rl', 'api'], ['rl', 'redis']] },
    { text: 'Token bucket: bucket-এ নির্দিষ্ট হারে token জমে; প্রতি request একটা token খরচ।', flow: [['u', 'rl'], ['rl', 'api']], badges: { rl: 'bucket: ৪ token' } },
    { text: 'Bot সব token শেষ করে ফেলেছে।', add: ['drop'], badges: { rl: 'bucket: ০ token' }, ask: ['Bucket খালি থাকলে নতুন request?', ['বাদ: 429 Too Many Requests', 'Queue-তে অপেক্ষা, যত সময় লাগে', 'পাস, পরে token কাটা হবে', 'Rate limiter restart হয়']] },
    { text: 'Token নেই → 429। Header-এ জানানো হয় কতক্ষণ পরে আবার চেষ্টা করা যাবে।', flow: [['bot', 'rl'], ['rl', 'drop']], down: ['drop'] },
    { text: 'অন্য একটা algorithm: fixed window, প্রতি মিনিটে ৫টা।', badges: { rl: 'fixed window' }, ask: ['০:৫৯-এ ৫টা আর ১:০০-এ ৫টা request এলে?', ['১ সেকেন্ডে ১০টা ঢুকে যায়', '৫টা ঢোকে, ৫টা বাদ', 'একটাও ঢোকে না সে সময়', '১০টাই বাদ, window বন্ধ']] },
    { text: 'Window-এর প্রান্তে দ্বিগুণ ঢোকে। Sliding window log/counter এই ফাঁক বন্ধ করে।', badges: { rl: 'sliding window' }, ok: ['rl'] },
    { text: 'অনেক rate limiter server হলে গোনা এক জায়গায় (Redis); race condition এড়াতে Lua script বা sorted set।', focus: ['redis', 'rl'] },
  ],
  summary: ['Token bucket: burst চলে, গড় হার বাঁধা', 'Fixed window প্রান্তে দ্বিগুণ ঢুকতে দেয়; sliding window ঠিক করে', 'বাদ request-এ 429 আর retry header; গোনা Redis-এ'],
  play: {
    kind: 'missions', intro: 'পরিস্থিতি দেখে algorithm বাছুন।',
    missions: [
      ['অল্প সময়ের burst চলবে, কিন্তু গড় হার বাঁধা। কোন algorithm?', ['Token bucket', 'Fixed window counter', 'কোনো limiter না', 'Random drop'], 'Bucket-এ জমা token থাকলে একসাথে কয়েকটা যেতে পারে।'],
      ['সমান হারে process করতে হবে (যেমন bank-এ পাঠানো)। কোনটা?', ['Leaking bucket', 'Fixed window counter', 'Sliding window log', 'Token bucket'], 'Leaking bucket: FIFO queue থেকে স্থির হারে বের হয়।'],
      ['সবচেয়ে নির্ভুল, কিন্তু memory বেশি লাগে?', ['Sliding window log', 'Token bucket', 'Fixed window counter', 'Leaking bucket'], 'প্রতিটা request-এর timestamp রাখে, তাই memory বেশি।'],
    ],
  },
  boss: [
    ['আগে থেকে API gateway থাকলে rate limiter কোথায়?', ['API gateway-তেই', 'প্রতিটা browser-এ', 'Database-এ', 'CDN-এর ছবিতে'], 'Client-side limiter ভাঙা যায়; gateway আগে থেকেই সামনে আছে।'],
    ['বাদ পড়া client-কে কী জানাবেন?', ['429 আর retry-after header', '200 OK আর খালি response', '500 Internal Server Error', 'কিছু না, চুপচাপ বাদ'], 'Client বুঝতে পারে কখন আবার চেষ্টা করবে।'],
    ['দুই limiter server একই counter পড়ে দুজনেই ১ বাড়াল, counter বাড়ল একবার। এর নাম?', ['Race condition; atomic operation লাগে', 'Deadlock; lock ছেড়ে দিতে হয়', 'Cache miss; TTL বাড়াতে হয়', 'Replication lag; replica বাড়াতে হয়'], 'পড়া আর লেখা একসাথে atomic না হলে এমন হয়।', 'দুজন একসাথে…'],
    ['Fixed window-এর সবচেয়ে বড় দুর্বলতা?', ['প্রান্তে সীমার বেশি ঢুকে যায়', 'প্রতিটা request-এর সময় রাখতে হয়', 'Burst একেবারেই চলে না', 'Redis ছাড়া চালানো যায় না'], 'প্রান্তের দুই পাশে মিলে দ্বিগুণ।'],
    ['Rate limit কিসের ভিত্তিতে হতে পারে?', ['User ID, IP বা API key', 'শুধু browser-এর নাম', 'শুধু দিনের কোন সময়', 'Request-এর আকার দেখে Random'], 'নিয়ম ঠিক হয় কাকে থামাতে চান তা দিয়ে।'],
  ],
});
