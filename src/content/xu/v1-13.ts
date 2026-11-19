import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 13 (Design A Search Autocomplete System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-13',
  goals: [
    'Trie কী, আর একটা prefix থেকে সেরা কয়েকটা suggestion কীভাবে বের হয় বলতে পারবেন।',
    'কেন প্রতিটা node-এ আগে থেকে সেরা k টা রাখলে খোঁজা দ্রুত হয়, সংখ্যায় দেখাতে পারবেন।',
    'ডেটা জমানো (offline) আর উত্তর দেওয়া (online) দুই আলাদা কাজ কীভাবে চলে, আর কোথায় cache বসে বলতে পারবেন।',
  ],
  related: ['caching', 'storage'],
  blocks: [
    { kind: 'p', text: 'Search box-এ লিখতে শুরু করতেই নিচে সাজেশন নামে: "par" লিখলে "parcel tracking", "parcel charge", "parcel pickup"। কাজটা ছোট, কিন্তু প্রতিটা অক্ষরে একটা request, লাখো user একসাথে, আর উত্তর চাই মানুষ চোখ পিটপিট করার আগে। অনুমান: ১০০ ms-এর নিচে।' },
    { kind: 'list', items: [
      'দ্রুত: প্রতিটা অক্ষর টাইপে নতুন সাজেশন, ১০০ ms-এর ভেতরে।',
      'প্রাসঙ্গিক আর সাজানো: জনপ্রিয় আগে। সাধারণত সেরা ৫ থেকে ১০টা।',
      'ভুল বানান সহ্য, আর আপত্তিকর শব্দ ছেঁকে ফেলা।',
      'পরিসর: দিনে ১ কোটি user, প্রতি user দিনে ১০ বার search, প্রতিবার ২০ অক্ষর। অক্ষর ধরে request: সেকেন্ডে কয়েক লাখ।',
    ] },
    { kind: 'calc', label: 'অনুমান: কত request আসে', inputs: [
      { id: 'u', label: 'দিনে user', min: 1, max: 100, step: 1, value: 10, unit: 'M' },
      { id: 's', label: 'প্রতি user-এর search', min: 1, max: 30, step: 1, value: 10 },
      { id: 'c', label: 'অক্ষর প্রতি search-এ', min: 5, max: 40, step: 1, value: 20 },
      { id: 'hit', label: 'কতটা cache-এ মেলে', min: 0, max: 99, step: 1, value: 0, unit: '%' },
    ], out: (v) => {
      const qps = (v.u! * 1e6 * v.s! * v.c!) / 86400;
      const rest = qps * (1 - v.hit! / 100);
      return [
        { label: 'Request প্রতি সেকেন্ডে', value: num(Math.round(qps)), how: `${num(v.u!)}M × ${num(v.s!)} × ${num(v.c!)} ÷ ৮৬,৪০০`, bar: Math.min(1, qps / 100_000) },
        { label: 'ভিড়ের সময়ে (প্রায় দ্বিগুণ)', value: num(Math.round(qps * 2)), tone: 'bad' },
        { label: 'Cache পার হয়ে server-এ', value: num(Math.round(rest)), how: v.hit! ? `${num(100 - v.hit!)}% পৌঁছায়` : 'cache না ধরলে সবই', tone: v.hit! >= 80 ? 'ok' : undefined },
      ];
    } },
    { kind: 'tip', title: 'অনেক request, কিন্তু কম আলাদা', text: 'বেশিরভাগ লোক একই জনপ্রিয় prefix লেখে ("par", "parc", "parce"…)। তাই cache খুব কাজের: browser-এ আর server-এ দুই জায়গায়।' },

    { kind: 'h', text: 'Trie: prefix ধরে ডালপালা' },
    { kind: 'p', text: 'Trie একটা গাছ: মূল থেকে প্রতিটা অক্ষর একটা ডালে নামে, আর কোনো node-এ পৌঁছানো মানে এখন পর্যন্ত লেখা prefix। নিচে "par" লিখে দেখুন। প্রতি node-এ রাখা হয় সেই prefix দিয়ে শুরু হওয়া শব্দ কতবার search হয়েছে।' },
    { kind: 'seq', label: 'একটা একটা অক্ষর লিখছেন: সাজেশন কীভাবে বদলায় (সংখ্যা = search কতবার)', actors: ['User', 'Autocomplete', 'Trie'], steps: [
      { from: 0, to: 1, msg: '"p"' },
      { from: 1, to: 0, msg: 'pay (৯০ হাজার), parcel (৮০ হাজার), pickup (৫০ হাজার), pathao…', tone: 'ok', note: 'একটা অক্ষর, অনেক শব্দ: জনপ্রিয়তা ধরে সেরা কয়েকটা।' },
      { from: 0, to: 1, msg: '"pa"' },
      { from: 1, to: 0, msg: 'pay, parcel, pathao…', tone: 'ok', note: 'pickup বাদ: "pa"-র নিচের গাছে নেই।' },
      { from: 0, to: 1, msg: '"par"' },
      { from: 1, to: 0, msg: 'parcel (৮০ হাজার), parcel tracking (৫০ হাজার), parcel charge (৩০ হাজার)', tone: 'ok', note: 'আরও সংকীর্ণ, আর আরও কাজের।' },
      { from: 0, to: 1, msg: '"parx" (ভুল অক্ষর)' },
      { from: 1, to: 0, msg: 'কিছু নেই', tone: 'bad', note: 'ভুল বানানের জন্য আলাদা কৌশল লাগে (কাছাকাছি শব্দ)।' },
    ] },

    { kind: 'h', text: 'সেরা কয়টা কীভাবে বের করবেন' },
    { kind: 'p', text: 'সরল পথ: "par" node-এ পৌঁছে তার নিচের সব শব্দ বের করুন, সংখ্যা ধরে সাজান, প্রথম ক টা নিন। কিন্তু নিচের শব্দ হাজার হাজার হতে পারে, আর প্রতিটা অক্ষরে এটা করলে ধীর। উন্নতি: প্রতিটা node-এ আগে থেকেই সেই prefix-এর সেরা ক টা রেখে দেওয়া।' },
    { kind: 'calc', label: 'সরল খোঁজা বনাম আগে থেকে রাখা সেরা ক টা', inputs: [
      { id: 'p', label: 'কত অক্ষর লেখা হয়েছে', min: 1, max: 20, step: 1, value: 3 },
      { id: 'c', label: 'ওই prefix-এর নিচে মোট শব্দ', min: 10, max: 1_000_000, step: 10, value: 50_000 },
      { id: 'k', label: 'কয়টা সাজেশন', min: 1, max: 20, step: 1, value: 5 },
    ], out: (v) => {
      const naive = v.p! + v.c! + v.c! * Math.log2(Math.max(2, v.c!));
      const fast = v.p! + v.k!;
      return [
        { label: 'সরল: নেমে সব বের করে সাজানো (ধাপ প্রায়)', value: num(Math.round(naive)), how: `${num(v.p!)} + ${num(v.c!)} + ${num(v.c!)} × log₂(${num(v.c!)})`, tone: 'bad', bar: Math.min(1, naive / 1_000_000) },
        { label: 'আগে থেকে রাখা সেরা ক: নেমে পড়ে ফেলা', value: num(fast), how: `${num(v.p!)} + ${num(v.k!)}`, tone: 'ok', bar: Math.min(1, fast / 1_000_000) },
        { label: 'দ্রুত কত গুণ', value: `প্রায় ${num(Math.round(naive / fast))} গুণ`, how: 'দামে: প্রতি node-এ ক টা করে বাড়তি জায়গা' },
      ];
    } },
    { kind: 'list', items: [
      'লাভ: উত্তর দেওয়া এখন শুধু prefix-এর মতো অক্ষর পার হয়ে node-এ পৌঁছানো আর তার ক টা পড়া।',
      'দাম: প্রতি node-এ বাড়তি জায়গা। সমাধান: শব্দের পুরো কপি নয়, শুধু শব্দ-ID বা সূচক রাখা।',
      'দৈর্ঘ্যের সীমা: ৫০ অক্ষরের বেশি prefix কেউ লেখে না, তাই গাছের গভীরতা ছোট ধরা যায়।',
    ] },

    { kind: 'h', text: 'দুই কাজ: জমানো আর উত্তর দেওয়া' },
    { kind: 'flow', label: 'Offline: log থেকে গুনে trie বানানো (নীল, ধীরে)। Online: trie cache থেকে উত্তর (সবুজ, ১০০ ms-এর নিচে)', nodes: [
      { id: 'lg', label: 'Search log', sub: 'কে কী লিখেছে', x: 8, y: 6, w: 18 },
      { id: 'ag', label: 'Aggregator', sub: 'সাপ্তাহিক গোনা', x: 36, y: 6, w: 20 },
      { id: 'tb', label: 'Trie builder', x: 64, y: 6, w: 18 },
      { id: 'td', label: 'Trie database', x: 90, y: 6, w: 18 },
      { id: 'tc', label: 'Trie cache', x: 90, y: 28, w: 18 },
      { id: 'sv', label: 'Query service', x: 60, y: 28, w: 20 },
      { id: 'u', label: 'User', x: 20, y: 28 },
    ], links: [
      { from: 'lg', to: 'ag', rate: 2, color: '#2f7de1' },
      { from: 'ag', to: 'tb', rate: 1, color: '#2f7de1' },
      { from: 'tb', to: 'td', rate: 1, color: '#2f7de1' },
      { from: 'td', to: 'tc', rate: 0.8, color: '#2f7de1', secs: 2.5 },
      { from: 'u', to: 'sv', rate: 3 },
      { from: 'sv', to: 'tc', rate: 3 },
    ], h: 36 },
    { kind: 'list', items: [
      'Data জমানো (analytics log): প্রতিটা search append হয়ে চলে। সরাসরি trie-তে প্রতিটা search লেখা হয় না: ধীর, আর trie বদলাতে হবে প্রতি অক্ষরে।',
      'Aggregator: সপ্তাহের শেষে শব্দ ধরে গুনে। Trending এর জন্য দ্রুত ঘুরিয়ে (ঘণ্টায়) আলাদা পথ।',
      'Trie builder: গোনা থেকে নতুন trie বানায়, database-এ রাখে (প্রতি সপ্তাহে)।',
      'Trie cache: memory-তে, প্রতি সপ্তাহে database থেকে নতুন করে ভরে।',
      'Query service: user prefix পাঠায়, cache থেকে সেরা ক টা ফেরত।',
    ] },

    { kind: 'h', text: 'আরও দ্রুত আর আরও বড়' },
    { kind: 'table', head: ['উন্নতি', 'কীভাবে'], rows: [
      ['Browser cache', 'উত্তরের সাথে "কয়েক ঘণ্টা মনে রাখো" header; একই prefix আবার লিখলে request-ই যায় না'],
      ['বেশিক্ষণ থেমে তবেই request', 'প্রতি অক্ষরে নয়; এক মুহূর্ত থামলে (debounce) পাঠানো'],
      ['গাছ ভাগ', 'প্রথম অক্ষর ধরে (a-m এক server, n-z আরেক)। অক্ষরের ভিড় অসমান, তাই গোনা দেখে ভাগের সীমা (শেষ অধ্যায় sharding)'],
      ['আপত্তিকর শব্দ ছাঁকা', 'Filter layer: trie বানানোর আগে বা উত্তরের পরে কালো তালিকা'],
      ['বহু ভাষা', 'অক্ষর শুধু ইংরেজি না: বাংলা, চীনা ইত্যাদির জন্য Unicode; প্রতি ভাষার আলাদা trie'],
      ['Trending', 'বর্তমান ঘটনা ধরতে দ্রুত আলাদা trie, সাপ্তাহিকটার সাথে মিলিয়ে'],
    ] },

    { kind: 'story', title: 'ঈদের সেলে নতুন শব্দ আসে না', steps: [
      'সেলের একটা নতুন শব্দ "ঈদ-ডিল" হঠাৎ জনপ্রিয়, কিন্তু সাজেশনে আসছে না।',
      'Trie সপ্তাহে একবার বানানো, তাই এই সপ্তাহে শব্দটা কেউ চেনেই না।',
      'Customer খুঁজছে, পাচ্ছে না, চলে যাচ্ছে।',
    ], fix: 'সাপ্তাহিক trie-র পাশে একটা ছোট, ঘণ্টায় বানানো "trending" trie রাখা। দুটোর ফল মিলিয়ে সেরা ক টা দেখানো।' },

    { kind: 'mistakes', items: [
      'প্রতিটা অক্ষরে disk-এর database-এ LIKE query।',
      'প্রতিটা node-এ আগে থেকে সেরা ক রাখার কথা না ভাবা।',
      'প্রতিটা search-এ সরাসরি trie বদলানো।',
      'প্রতি অক্ষরে request, বিরতি ছাড়া।',
      'Cache ছাড়াই ঘোষণা করা যে ১০০ ms হবে।',
    ] },
    { kind: 'check', items: [
      { q: 'Trie-তে "par" লিখলে সাজেশন কীভাবে আসে?', a: 'মূল থেকে p, a, r ধরে নেমে "par" node-এ পৌঁছান। সেখানে আগে থেকে রাখা সেরা ক টা শব্দ সাজেশন হিসেবে ফেরত।' },
      { q: 'প্রতি node-এ সেরা ক রাখলে কেন দ্রুত?', a: 'নিচের সব শব্দ বের করে সাজাতে হয় না। শুধু prefix-এর অক্ষর পার হয়ে node-এ গিয়ে ক টা পড়লেই চলে। দাম: বাড়তি জায়গা।' },
      { q: 'Trie কখন আর কীভাবে বানান?', a: 'Offline: search log গুনে (সাপ্তাহিক), builder দিয়ে নতুন trie বানিয়ে database-এ রাখা, তারপর cache ভরা। প্রতি search-এ সরাসরি বদলানো হয় না।' },
      { q: '১০০ ms-এর নিচে রাখতে কোথায় কোথায় cache?', a: 'Browser (একই prefix আবার), আর server-এর trie cache (memory-তে)। সাথে debounce: প্রতি অক্ষরে নয়।' },
    ] },
  ],
};
