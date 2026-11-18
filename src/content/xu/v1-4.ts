import { num } from './fmt';
import type { XuNote } from './types';


/** Vol 1, chapter 4 (Design A Rate Limiter), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-4',
  goals: [
    'পাঁচটা algorithm কীভাবে গোনে, burst ছাড়ে কিনা, কত memory খায় বলতে পারবেন, আর কোনটা কখন।',
    'Redis-এর counter দিয়ে rate limiter-এর নকশা আঁকতে পারবেন: rule, 429 আর header সহ।',
    'অনেক server একসাথে গুনলে যে দুই ঝামেলা হয় (race, sync), তার সমাধান বলতে পারবেন।',
  ],
  play: { to: '/game/$scenarioId', id: 'ratelimit', label: 'খেলে দেখুন: Bot-এর বন্যা' },
  blocks: [
    { kind: 'p', text: 'Rate limiter ঠিক করে একজন client একটা সময়ে কতগুলো request পাঠাতে পারবে। সীমা ছাড়ালে বাড়তি request আটকে যায়, সাধারণত 429 (Too Many Requests) উত্তরে। এটাই বইয়ের প্রথম পূর্ণ design প্রশ্ন, আর আগের অধ্যায়ের চার ধাপ এখানে হাতে-কলমে চলে।' },
    { kind: 'list', items: [
      'বাড়তি চাপ থেকে বাঁচানো: ইচ্ছায় হোক (bot, DoS) বা ভুলে (client-এর loop), resource শেষ হতে দেয় না।',
      'খরচ বাঁচানো: প্রতিটা call-এ টাকা লাগে এমন জিনিসে, যেমন ParcelGo-র OTP SMS, এটাই মূল নিয়ন্ত্রণ।',
      'Server-কে বসে যেতে না দেওয়া: একজনের ভিড়ে সবার কাজ যেন না থামে।',
      'Load balancer-এর সাথে পার্থক্য: load balancer সব request ভাগ করে দেয়; rate limiter ঠিক করে কোনটা আদৌ যাবে।',
    ] },

    { kind: 'h', text: 'কোথায় বসবে' },
    { kind: 'flow', label: 'API gateway-তে বসানো: সীমা ছাড়ানো request (লাল) API পর্যন্ত পৌঁছায়ই না', nodes: [
      { id: 'c', label: 'Client', x: 9, y: 17 },
      { id: 'gw', label: 'API gateway', sub: 'rate limiter এখানে', x: 40, y: 17, w: 22 },
      { id: 'a1', label: 'Order API', x: 80, y: 8, w: 18 },
      { id: 'a2', label: 'OTP API', x: 80, y: 26, w: 18 },
    ], links: [
      { from: 'c', to: 'gw', rate: 7, drop: 0.35 },
      { from: 'gw', to: 'a1', rate: 2.4 }, { from: 'gw', to: 'a2', rate: 2.4 },
    ], h: 34 },
    { kind: 'list', items: [
      'Client-এ: ভরসা নেই। App বদলে বা সরাসরি API ডেকে যে কেউ এড়িয়ে যেতে পারে।',
      'Server-এর ভেতরে: সহজ, কিন্তু প্রতিটা service-এ আলাদা করে লিখতে হয়।',
      'মাঝখানে একটা স্তর (middleware বা API gateway): সব service-এর সামনে এক জায়গায়। Gateway আগে থেকেই থাকলে এখানেই স্বাভাবিক।',
      'নিজে বানালে algorithm-এর পূর্ণ নিয়ন্ত্রণ, কিন্তু সময় লাগে; কেনা gateway দ্রুত, কিন্তু পছন্দ সীমিত।',
    ] },

    { kind: 'h', text: 'Token bucket' },
    { kind: 'p', text: 'সবচেয়ে প্রচলিত algorithm। একটা বালতিতে নির্দিষ্ট হারে token জমে, বালতির আকার পর্যন্ত। প্রতিটা request একটা token নেয়; token না থাকলে 429। দুটো সংখ্যা ঠিক করতে হয়: বালতির আকার, আর ভরার হার।' },
    { kind: 'widget', id: 'token-bucket', label: 'নিজে চালিয়ে দেখুন: token bucket' },
    { kind: 'list', items: [
      'লাভ: সহজ, memory কম, আর চুপচাপ থাকার পর হঠাৎ কয়েকটা request একসাথে এলে (burst) জমা token-এ পার হয়ে যায়।',
      'অসুবিধা: আকার আর হার মেলানো সহজ না; ভুল হলে হয় বেশি কড়া, নয় ঢিলা।',
      'কয়টা বালতি: নিয়মপ্রতি একটা। প্রতিটা endpoint-এর জন্য আলাদা, প্রতি IP বা প্রতি user-এর জন্য আলাদা, আর পুরো system-এর একটা global।',
    ] },

    { kind: 'h', text: 'Leaking bucket' },
    { kind: 'p', text: 'Request একটা FIFO queue-তে ঢোকে, আর queue থেকে স্থির হারে বের হয়। Queue ভরা থাকলে নতুন request বাদ। ফল: পেছনের system সবসময় একই গতিতে কাজ পায়, ভিড় যতই হোক।' },
    { kind: 'flow', label: 'Leaking bucket: যত ভিড়ই আসুক, বের হয় স্থির হারে; queue ভরলে বাকিটা ঝরে পড়ে', nodes: [
      { id: 'in', label: 'Request', x: 10, y: 15 },
      { id: 'q', label: 'Queue', sub: 'ভরা হলে বাদ', x: 48, y: 15, w: 20 },
      { id: 'out', label: 'SMS gateway', sub: 'স্থির হারে', x: 86, y: 15, w: 20 },
    ], links: [
      { from: 'in', to: 'q', rate: 7, drop: 0.3 },
      { from: 'q', to: 'out', rate: 2, secs: 1.6 },
    ], h: 30 },
    { kind: 'list', items: [
      'ভালো যখন পেছনের জিনিস একটা নির্দিষ্ট হারের বেশি নিতে পারে না: SMS gateway, partner-এর API।',
      'খারাপ যখন সদ্য আসা request-ই বেশি জরুরি: পুরোনোগুলো queue দখল করে রাখে।',
      'Token bucket-এর সাথে পার্থক্য এক লাইনে: token bucket burst যেতে দেয়, leaking bucket সবসময় একই হারে ছাড়ে।',
    ] },

    { kind: 'h', text: 'Fixed window আর তার ফাঁক' },
    { kind: 'p', text: 'সময়কে ঘড়ির মিনিটে ভাগ করে প্রতিটার একটা counter। প্রতিটা request counter এক বাড়ায়; সীমায় পৌঁছালে পরের মিনিট পর্যন্ত সব বাদ। সহজ আর memory কম, কিন্তু দুই মিনিটের সংযোগে একটা ফাঁক আছে। নিচে সময় চালিয়ে নিজে দেখুন।' },
    { kind: 'widget', id: 'window-edge', label: 'সীমা মিনিটে ৫: ঘড়ির মিনিট ধরে গুনলে, আর শেষ ৬০ সেকেন্ড ধরে গুনলে' },

    { kind: 'h', text: 'Sliding window: log আর counter' },
    { kind: 'p', text: 'Sliding window log প্রতিটা request-এর সময় (timestamp) রাখে, সাধারণত Redis-এর sorted set-এ। নতুন request এলে ৬০ সেকেন্ডের পুরোনোগুলো মুছে বাকিগুলো গোনে। সবচেয়ে নির্ভুল, কিন্তু memory বেশি: প্রতিটা request-এর সময় জমা থাকে।' },
    { kind: 'p', text: 'Sliding window counter মাঝামাঝি পথ: শুধু এই মিনিট আর আগের মিনিটের দুটো counter, আর ধরে নেয় আগের মিনিটের request সমানভাবে ছড়ানো ছিল। নিচে সংখ্যা বদলে দেখুন।' },
    { kind: 'calc', label: 'Sliding window counter: নতুন request-টা যাবে কি?', inputs: [
      { id: 'limit', label: 'সীমা (মিনিটে)', min: 3, max: 20, step: 1, value: 7 },
      { id: 'prev', label: 'আগের মিনিটে এসেছিল', min: 0, max: 20, step: 1, value: 5 },
      { id: 'cur', label: 'এই মিনিটে এ পর্যন্ত', min: 0, max: 20, step: 1, value: 3 },
      { id: 'into', label: 'এই মিনিটের কতটা গেছে', min: 0, max: 100, step: 5, value: 30, unit: '%' },
    ], out: (v) => {
      const est = v.cur! + v.prev! * (1 - v.into! / 100);
      const ok = est + 1 <= v.limit!;
      return [
        { label: 'শেষ ৬০ সেকেন্ডে আনুমানিক', value: num(est), how: `${num(v.cur!)} + ${num(v.prev!)} × ${num(100 - v.into!)}% (আগের মিনিটের যতটা এখনো জানালায়)`, bar: est / v.limit!, tone: ok ? undefined : 'bad' },
        { label: 'নতুন request', value: ok ? 'যেতে দাও ✓' : 'আটকাও: 429', tone: ok ? 'ok' : 'bad', how: `নতুনটা সহ ${num(est + 1)}, সীমা ${num(v.limit!)}` },
      ];
    } },
    { kind: 'p', text: 'এটা আনুমানিক, কিন্তু বাস্তবে ভুল খুব কম: Cloudflare-এর এক মাপে ৪০ কোটি request-এর মধ্যে ভুলভাবে ছাড়া বা আটকানো হয়েছিল মাত্র ০.০০৩%।' },

    { kind: 'table', head: ['Algorithm', 'Memory', 'Burst', 'নির্ভুলতা', 'কখন'], rows: [
      ['Token bucket', 'কম', 'যেতে দেয়', 'ভালো', 'হঠাৎ ভিড় সামলাতে হবে (flash sale, ঈদ)'],
      ['Leaking bucket', 'কম', 'সমান করে দেয়', 'ভালো', 'পেছনে স্থির হার দরকার (SMS gateway)'],
      ['Fixed window', 'সবচেয়ে কম', 'সংযোগে দ্বিগুণ', 'দুর্বল', '"ঘণ্টায় quota" জাতীয় সহজ নিয়ম'],
      ['Sliding log', 'বেশি', 'আটকায়', 'নিখুঁত', 'অল্প traffic, নির্ভুলতা জরুরি'],
      ['Sliding counter', 'কম', 'মসৃণ করে', 'প্রায় নিখুঁত', 'বেশিরভাগ API-র ভালো default'],
    ] },

    { kind: 'h', text: 'নকশা: counter, rule, header' },
    { kind: 'p', text: 'মূল ধারণা সহজ: প্রতিটা client-এর একটা counter, সীমা ছাড়ালে আটকাও। Counter database-এ নয়, memory-তে (Redis): disk ধীর, আর Redis-এ মেয়াদ দেওয়া যায়। INCR counter এক বাড়ায়; EXPIRE মেয়াদ শেষে সেটা নিজেই মুছে দেয়।' },
    { kind: 'seq', label: 'OTP চাওয়া: সীমা মিনিটে ৫, প্রতি phone নম্বরে', actors: ['Client', 'Middleware', 'Redis', 'OTP API'], steps: [
      { from: 0, to: 1, msg: 'POST /otp (01711-xxxxxx)' },
      { from: 1, to: 2, msg: 'INCR otp:01711-xxxxxx; প্রথমবার হলে EXPIRE 60', note: 'Key-তে phone নম্বর: নিয়মটা প্রতি নম্বরে। মেয়াদ শেষে counter নিজেই মুছে যায়।' },
      { from: 2, to: 1, msg: 'এখন ৩' },
      { from: 1, to: 3, msg: 'যেতে দাও', tone: 'ok' },
      { from: 3, to: 0, msg: '200 OK · X-Ratelimit-Remaining: 2', tone: 'ok', note: 'Header-এ বলে দেওয়া হলো আর কতবার চলবে।' },
      { from: 0, to: 1, msg: 'আরও ৩বার, এক নিঃশ্বাসে' },
      { from: 1, to: 2, msg: 'INCR → ৬' },
      { from: 1, to: 0, msg: '429 Too Many Requests · Retry-After: 41', tone: 'bad', note: 'OTP API পর্যন্ত যায়ই না, SMS-এর টাকাও খরচ হয় না। Client জানে কত সেকেন্ড পরে আবার চেষ্টা করবে।' },
    ] },
    { kind: 'table', head: ['Header', 'মানে'], rows: [
      ['X-Ratelimit-Limit', 'এই সময়ে সর্বোচ্চ কতগুলো'],
      ['X-Ratelimit-Remaining', 'আর কতগুলো বাকি'],
      ['X-Ratelimit-Retry-After', 'কত সেকেন্ড পরে আবার চেষ্টা (429-এর সাথে)'],
    ] },
    { kind: 'list', items: [
      'নিয়ম থাকে config file-এ (যেমন: domain otp, key phone, প্রতি মিনিটে ৫); worker-রা সেগুলো cache-এ এনে রাখে।',
      'আটকানো request হয় বাদ, নয়তো queue-তে রেখে পরে: যেমন order নেওয়া হলো, প্রক্রিয়া একটু পরে।',
    ] },

    { kind: 'h', text: 'অনেক server-এ দুই ঝামেলা' },
    { kind: 'p', text: 'এক server-এ rate limiter সহজ। কঠিন হয় যখন অনেক server আর অনেক thread একই counter গোনে।' },
    { kind: 'seq', label: 'Race condition: দুই limiter একসাথে counter পড়ল', actors: ['Limiter ক', 'Redis', 'Limiter খ'], steps: [
      { from: 0, to: 1, msg: 'Counter কত?' },
      { from: 1, to: 0, msg: '৪' },
      { from: 2, to: 1, msg: 'Counter কত?' },
      { from: 1, to: 2, msg: '৪', note: 'ক এখনো লেখেনি, তাই খ-ও পুরোনো সংখ্যা পেল।' },
      { from: 0, to: 1, msg: '৫ লেখো, request পাস' },
      { from: 2, to: 1, msg: '৫ লেখো, request পাস', tone: 'bad', note: 'দুটো request পাস, অথচ counter বাড়ল একবার। সীমা ৫, আসলে গেল ৬।' },
      { from: 0, to: 1, msg: 'সমাধান: পড়া-বাড়ানো-লেখা একসাথে: INCR, বা Lua script', tone: 'ok', note: 'Redis একটা command বা script পুরোটা শেষ না করে অন্যটা ধরে না; মাঝখানে ঢোকার সুযোগ থাকে না। Lock-ও চলে, কিন্তু ধীর।' },
    ] },
    { kind: 'list', items: [
      'Sync: web tier stateless, তাই একই client একবার এই limiter-এ, পরেরবার ওই limiter-এ যায়। প্রতিটার নিজের counter থাকলে সীমা ভাঙে। সমাধান: সবাই এক জায়গার counter পড়ে (কেন্দ্রীয় Redis)।',
      'দূরত্ব: user-এর কাছের edge server-এ limiter রাখলে দ্রুত; বিভিন্ন data center-এর counter একটু দেরিতে মেলে (eventual consistency), সেটা মেনে নেওয়া হয়।',
      'Redis নিজেই বসে গেলে: আগে থেকে ঠিক রাখুন। সাধারণ API-তে সীমা ছাড়াই চলতে দিন (fail open); login, OTP, payment-এ আটকে দিন (fail closed)।',
    ] },

    { kind: 'story', title: 'রাত দুটোয় OTP-র বন্যা', steps: [
      'একটা bot ParcelGo-র signup-এ হাজার হাজার নম্বরে OTP চাইতে লাগল।',
      'প্রতিটা OTP একটা SMS, প্রতিটা SMS-এ টাকা। সকালে বিল দেখে সবার চোখ কপালে।',
      'সীমা ছিল শুধু প্রতি phone নম্বরে; bot প্রতিবার নতুন নম্বর দিচ্ছিল।',
    ], fix: 'প্রতি নম্বরে আর প্রতি IP-তে দুটো আলাদা সীমা, সারা system-এ ঘণ্টায় মোট OTP-র একটা global সীমা, আর সন্দেহজনক ভিড়ে captcha। Metrics-এ "মিনিটে কতগুলো 429" দেখলেই এমন রাত আগেই ধরা পড়ে।' },

    { kind: 'h', text: 'শেষে আর যা বলা যায়' },
    { kind: 'list', items: [
      'Hard বনাম soft সীমা: hard কখনো ছাড়ানো যায় না; soft অল্প সময়ের জন্য একটু ছাড় দেয়।',
      'কোন স্তরে: এই অধ্যায় HTTP-র স্তরে (layer 7); IP ধরে নিচের স্তরেও (layer 3) আটকানো যায়।',
      'নজর: নিয়ম বেশি কড়া হয়ে আসল user আটকাচ্ছে কিনা, আর হঠাৎ ভিড়ে algorithm বদলানো লাগবে কিনা।',
      'Client-এর দিক: নিজে cache করা, সীমা জেনে পাঠানো, 429 ধরে সামলানো, আর আবার চেষ্টার আগে বাড়তে থাকা অপেক্ষা (backoff) একটু এলোমেলো করে (jitter)।',
    ] },

    { kind: 'mistakes', items: [
      'Rate limiter client-এ বসিয়ে নিশ্চিন্ত থাকা।',
      'Counter database-এ রাখা: প্রতিটা request-এ disk।',
      '"পড়ি, তারপর লিখি" দুই ধাপে গোনা: অনেক server-এ সীমা ভাঙে।',
      'Fixed window বেছে নিয়ে মিনিটের সংযোগের ফাঁকের কথা না বলা।',
      'Limiter বসে গেলে কী হবে (fail open না closed) ঠিক না করা।',
    ] },
    { kind: 'check', items: [
      { q: 'ঈদের sale-এ হঠাৎ ভিড় সামলাতে কোন algorithm, কেন?', a: 'Token bucket। চুপচাপ সময়ে জমা token দিয়ে অল্প সময়ের burst পার হয়, কিন্তু লম্বা সময়ে গড় হার ভরার হারের বেশি হয় না।' },
      { q: 'Fixed window-এ সীমা মিনিটে ৫ হলেও কীভাবে কয়েক সেকেন্ডে ১০টা যায়?', a: 'এক মিনিটের শেষ সেকেন্ডগুলোতে ৫টা, পরের মিনিটের শুরুতে আরও ৫টা: দুটো আলাদা counter, দুটোই সীমার মধ্যে। Sliding window শেষ ৬০ সেকেন্ড গোনে, তাই আটকায়।' },
      { q: 'দুই limiter-এর race condition কীভাবে বন্ধ করবেন?', a: 'পড়া-বাড়ানো-লেখা একটাই atomic কাজে: Redis-এর INCR বা Lua script। (Lock-ও চলে, কিন্তু ধীর।)' },
      { q: '429-এর সাথে client-কে কী জানাবেন?', a: 'X-Ratelimit-Limit, -Remaining আর -Retry-After header: সীমা কত, কত বাকি, কতক্ষণ পরে আবার।' },
      { q: 'Rate limiter-এর Redis বসে গেলে কী হবে?', a: 'আগে থেকে ঠিক করা নীতি: সাধারণ API-তে fail open (চলতে দাও), OTP, login, payment-এ fail closed (আটকাও)।' },
    ] },
  ],
};
