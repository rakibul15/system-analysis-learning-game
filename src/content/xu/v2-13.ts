import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 13 (Stock Exchange), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-13',
  goals: [
    'Order book আর matching: কোন order কার সাথে মেলে, price-time priority অনুযায়ী ধাপে ধাপে বলতে পারবেন।',
    'কেন এই system-এ latency মাইক্রোসেকেন্ডে মাপা হয়, আর কোন কৌশলে (এক thread, memory, event sourcing) সেটা হয় বলতে পারবেন।',
    'Sequencer, matching engine আর hot-warm replica দিয়ে নকশা আঁকতে পারবেন।',
  ],
  related: ['consensus', 'replication', 'streams'],
  blocks: [
    { kind: 'p', text: 'Stock exchange একটা হাট: ক্রেতা বলে "এই দামে কিনব", বিক্রেতা বলে "এই দামে বেচব", আর exchange মিলিয়ে দেয়। এখানে দুটো জিনিস সবচেয়ে বড়: ন্যায্যতা (যে আগে এসেছে সে আগে পাবে) আর গতি (মাইক্রোসেকেন্ডের হিসাব)। ParcelGo-র সাথে সরাসরি সম্পর্ক নেই, কিন্তু শেখার জিনিস প্রচুর: এক থ্রেডের ভেতর নির্ভুল ক্রম রাখা, আর পুরো দিনের ঘটনা আবার চালিয়ে দেখা।' },
    { kind: 'list', items: [
      'Order দুই ধরনের: limit order ("১০০ টাকার বেশি দেব না, ২০টা চাই") আর market order ("যে দামে আছে এখনই কিনব")।',
      'Order নতুন, বাতিল, পরিবর্তনও হয়। মেলানো আসল কাজ।',
      'ন্যায্যতা: একই দামে আগে আসা order আগে মেলে।',
      'পরিসর: দিনে কয়েক শো কোটি order; ভিড়ের সময় সেকেন্ডে লাখ লাখ; উত্তর মাইক্রোসেকেন্ডে।',
    ] },

    { kind: 'h', text: 'Order book' },
    { kind: 'p', text: 'প্রতিটা শেয়ারের জন্য একটা order book: দুই পাশ। ক্রেতার তালিকা (bid) সবচেয়ে বেশি দাম আগে, বিক্রেতার তালিকা (ask) সবচেয়ে কম দাম আগে। প্রতিটা দামের একটা সারি (price level), তার ভেতরে order-গুলো আসার ক্রমে। যখন সবচেয়ে ভালো bid ≥ সবচেয়ে ভালো ask, তখন মিল।' },
    { kind: 'table', head: ['ক্রেতা (bid)', 'পরিমাণ', 'দাম', 'পরিমাণ', 'বিক্রেতা (ask)'], rows: [
      ['', '', '১০২', '২০', 'রিয়া'],
      ['', '', '১০১', '১০', 'করিম'],
      ['', '', '১০১', '৫', 'মিতা (পরে এসেছে)'],
      ['লিপি', '৩০', '১০০', '', ''],
      ['সুমন', '১০', '৯৯', '', ''],
    ] },
    { kind: 'p', text: 'এখানে সবচেয়ে ভালো bid ১০০ (লিপি), সবচেয়ে ভালো ask ১০১ (করিম আর মিতা)। ফাঁক আছে, মিল নেই। এখন একজন ১০১ টাকায় ১২টা কিনতে চাইলে কী হয়?' },
    { kind: 'seq', label: 'নতুন order: ১০১ টাকায় ১২টা কিনব', actors: ['নতুন ক্রেতা', 'Matching engine', 'Ask-এর ১০১ সারি'], steps: [
      { from: 0, to: 1, msg: 'কিনব: ১২টা, সর্বোচ্চ ১০১' },
      { from: 1, to: 2, msg: '১০১ দামে সবচেয়ে আগের order কার?', note: 'দাম একই হলে আগে আসা আগে: price-time priority।' },
      { from: 2, to: 1, msg: 'করিম: ১০টা', tone: 'ok' },
      { from: 1, to: 0, msg: 'মিল: ১০টা, ১০১ দামে (করিমের সাথে)', tone: 'ok', note: 'করিমের order পুরো শেষ, সারি থেকে বাদ।' },
      { from: 1, to: 2, msg: 'বাকি ২টা: পরের order?' },
      { from: 2, to: 1, msg: 'মিতা: ৫টা', tone: 'ok' },
      { from: 1, to: 0, msg: 'মিল: আরও ২টা (মিতার সাথে), ১০১ দামে', tone: 'ok', note: 'মিতার ৫-এর ২টা গেল, ৩টা বাকি থাকল। কেউ ১০২-এ বা ১০১-এর বেশিতে যায়নি।' },
      { from: 1, to: 1, msg: 'ক্রেতার ১২ পুরো হয়েছে: আর বই-এ ঢোকে না', tone: 'ok' },
    ] },
    { kind: 'list', items: [
      'Limit order পুরো না মিললে বাকিটা বইয়ে বসে অপেক্ষা করে। Market order না মিললে বাকিটা বাতিল।',
      'প্রতিটা order-এর কাজ: নতুন (place), বাতিল (cancel), বদল (modify), আর মেলা। সবচেয়ে বেশি ঘটে বাতিল আর নতুন।',
      'নকশা: price level-গুলো দামের ক্রমে (ধরুন sorted map), প্রতিটা level-এ order-এর linked list, আর order-ID থেকে সরাসরি order খোঁজার hash map। বাতিল O(১)।',
    ] },

    { kind: 'h', text: 'কত দ্রুত, আর কীভাবে' },
    { kind: 'bars', label: 'কোথায় কত সময় যায় (log scale)', scale: 'log', note: 'এক machine-এর ভেতর পাঠানো আর মেমরি-ম্যাপ করা ফাইলে লেখা মাইক্রোসেকেন্ডে; network-এ আরেক machine ডাকা শত গুণ ধীর। এই জন্যই exchange-এর মূল কাজগুলো একই machine-এ।', items: [
      { label: 'Memory থেকে পড়া', value: 0.1, show: '~০.১ µs', tone: 'ok' },
      { label: 'Memory-ম্যাপ করা ফাইলে লেখা (mmap)', value: 1, show: '~১ µs', tone: 'ok' },
      { label: 'একই data center-এ network round trip', value: 500, show: '~৫০০ µs', tone: 'warn' },
      { label: 'Disk-এ সাধারণ লেখা (fsync)', value: 5000, show: '~৫ ms', tone: 'bad' },
      { label: 'অন্য শহরে network round trip', value: 20000, show: '~২০ ms', tone: 'bad' },
    ] },
    { kind: 'calc', label: 'এক thread কত order পারে', inputs: [
      { id: 'us', label: 'একটা order-এর কাজ', min: 1, max: 1000, step: 1, value: 10, unit: 'µs' },
      { id: 'need', label: 'দরকার (প্রতি সেকেন্ডে)', min: 1000, max: 1_000_000, step: 1000, value: 100_000 },
    ], out: (v) => {
      const cap = 1e6 / v.us!;
      return [
        { label: 'এক thread পারে', value: `${num(Math.round(cap))}/সেকেন্ড`, how: `১,০০০,০০০ µs ÷ ${num(v.us!)} µs`, bar: Math.min(1, cap / 1_000_000), tone: cap >= v.need! ? 'ok' : 'bad' },
        { label: 'দরকারের তুলনায়', value: cap >= v.need! ? `${num(Math.round(cap / v.need!))} গুণ বেশি ক্ষমতা` : 'কম: কাজ ভাঙতে হবে', how: `দরকার ${num(v.need!)}/সেকেন্ড`, tone: cap >= v.need! ? 'ok' : 'bad' },
      ];
    } },
    { kind: 'tip', title: 'এক thread কেন ভালো', text: 'অনেক thread মানে লক, আর লকে অপেক্ষা: ক্রম ভাঙার ঝুঁকি আর ধীর। Matching engine সাধারণত এক thread, কোনো লক নেই, আর সব কিছু memory-তে। এক thread-ই সেকেন্ডে লাখ order পারে, যদি প্রতিটা কয়েক µs-এ শেষ হয়। বহু শেয়ার? শেয়ার ধরে ভাগ: প্রতিটার নিজের engine।' },

    { kind: 'h', text: 'নকশা: ক্রমের জন্য sequencer' },
    { kind: 'flow', label: 'Order এক পথে: ঢোকে → ক্রম নম্বর → মেলানো → ফল। সবটা এক কেন্দ্রীয় লগে', nodes: [
      { id: 'cl', label: 'Client gateway', sub: 'যাচাই, রেট', x: 10, y: 6, w: 20 },
      { id: 'sq', label: 'Sequencer', sub: 'ক্রম নম্বর দেয়', x: 40, y: 6, w: 18 },
      { id: 'me', label: 'Matching engine', sub: 'এক thread, memory', x: 70, y: 17, w: 24 },
      { id: 'lg', label: 'Event লগ (mmap)', sub: 'সব ঘটনা', x: 40, y: 29, w: 22 },
      { id: 'md', label: 'Market data', sub: 'সবার জন্য দাম', x: 92, y: 29, w: 18 },
    ], links: [
      { from: 'cl', to: 'sq', rate: 3 }, { from: 'sq', to: 'me', rate: 3 }, { from: 'sq', to: 'lg', rate: 2, color: '#2f7de1' }, { from: 'me', to: 'md', rate: 2 }, { from: 'me', to: 'lg', rate: 1.5, color: '#2f7de1' },
    ], h: 36 },
    { kind: 'list', items: [
      'Client gateway: পরিচয়, অনুমতি, হার-সীমা, ফরম্যাট (FIX: আর্থিক বার্তার আন্তর্জাতিক ভাষা)।',
      'Sequencer: প্রতিটা order-এ একটা অনন্য, ক্রমিক নম্বর বসায় আর লগে লিখে। এই নম্বরই ন্যায্যতার ভিত্তি: কে আগে, সবার কাছে একটাই উত্তর।',
      'Matching engine: ক্রমানুসারে order নিয়ে বই বদলায়, মিল ঘটায়, ফল (event) লগে।',
      'Event sourcing: লগই আসল সত্য। বইয়ের অবস্থা লগ চালিয়ে আবার বানানো যায়।',
      'Market data publisher: ফল সবাইকে একই সময়ে পাঠায় (ন্যায্যতা)।',
    ] },
    { kind: 'seq', label: 'ঘটনা-লগ থেকে ফেরা: engine মরলে আরেকটা তুলে নেয়', actors: ['Primary engine', 'Event লগ', 'Warm replica'], steps: [
      { from: 0, to: 1, msg: 'প্রতিটা order লগে (ক্রম ১০০১, ১০০২…)' },
      { from: 2, to: 1, msg: 'আমিও একই লগ পড়ে একই order একই ক্রমে চালাই', tone: 'ok', note: 'একই ইনপুট, একই ক্রম, তাই নির্ধারিত ফল (deterministic): replica-র বইও হুবহু primary-র মতো।' },
      { from: 0, to: 0, msg: 'Primary বসে গেল', tone: 'bad' },
      { from: 2, to: 2, msg: 'আমি primary হলাম (শেষ ক্রম ১০৪২ পর্যন্ত জানি)', tone: 'ok', note: 'লগের শেষ ক্রম থেকে সাথে সাথে। কয়েক মিলিসেকেন্ডে।' },
      { from: 2, to: 1, msg: 'এবার ১০৪৩ থেকে নিজে লিখছি', tone: 'ok' },
    ] },
    { kind: 'p', text: 'Hot-warm: primary (hot) কাজ করে, replica (warm) একই লগে একই ঘটনা চালিয়ে প্রস্তুত বসে। আরও নিরাপত্তায় লগ নিজেও Raft-এর মতো consensus-এ কয়েকটা machine-এ কপি (v2-12)। একটা machine মরলেও লগ আর ক্রম হারায় না।' },

    { kind: 'h', text: 'আরও ভাবনা' },
    { kind: 'list', items: [
      'Co-location: বড় ব্যবসায়ীরা নিজের server exchange-এর data center-এ রাখে, যাতে network কম। ন্যায্যতার জন্য সবার তারের দৈর্ঘ্য সমান করা হয়।',
      'বন্ধ হওয়া: দাম হঠাৎ অনেক নড়লে (circuit breaker) বাণিজ্য কিছুক্ষণ বন্ধ।',
      'ঝুঁকি যাচাই: order পাঠানোর আগে ক্রেতার কাছে যথেষ্ট টাকা আছে কিনা (risk check); matching engine-এ ঢোকার আগে, ধীর পথ বাইরে।',
      'দিনের শেষে settlement: কে কাকে কত দেবে, ধীরে, আলাদা ব্যবস্থায়।',
      'তাপ: ভিড়ের সময় প্রতিটা order ডাকা হয় এক হট পথে; ভুলে কোড বদলে ধীর হলে ক্ষতি বিশাল, তাই হাজারবার পরীক্ষা আর পুরোনো দিনের লগ চালিয়ে মেলানো।',
    ] },

    { kind: 'story', title: 'এক thread-এ ভিড় সামলানো', steps: [
      'ParcelGo-র একটা ছোট নিলাম-সেবা (ধীর-গতির) matching-এর জন্য ১০ thread আর database লক ব্যবহার করত।',
      'ভিড়ের সময় thread-রা লকের জন্য অপেক্ষা করে; ক্রম ঘুরে যায়, দুজনে একই দামে "আগে এসেছি" বলে ঝগড়া।',
      'ভাগ করে এক thread আর লগ-ভিত্তিক ক্রমে সরানোর পর ক্রম নিয়ে আর প্রশ্ন নেই।',
    ], fix: 'ক্রম একবারই ঠিক হোক (sequencer), তারপর এক থ্রেড একটা একটা করে। লক নয়, লগ। আর লগ থেকে আবার চালানো যায় বলে ঝগড়া মেটে।' },

    { kind: 'mistakes', items: [
      'Matching-এ বহু thread আর লক: ধীর আর ক্রম ভাঙে।',
      'প্রতিটা order disk-এ fsync করে তারপর এগোনো: millisecond-এ আটকে।',
      'বাতিল O(n) (তালিকা ঘেঁটে), O(১) নয়।',
      'ক্রম ঠিক করার জায়গা একাধিক: কে আগে তা নিয়ে মতভেদ।',
      'Replica লগ ছাড়া অন্য কিছুতে আপডেট: primary-র সাথে ফারাক।',
    ] },
    { kind: 'check', items: [
      { q: 'একই দামে দুই ক্রেতা থাকলে কার order আগে মেলে?', a: 'যে আগে এসেছে (price-time priority: দাম আগে, তারপর সময়)। Sequencer-এর ক্রম নম্বরই সেটা ঠিক করে।' },
      { q: 'Matching engine এক thread কেন?', a: 'লক নেই, ক্রম নিশ্চিত, আর memory-তে প্রতিটা order কয়েক µs। এক thread-ই সেকেন্ডে লাখ order পারে।' },
      { q: 'Event sourcing কীভাবে সাহায্য করে?', a: 'লগই সত্য। Engine মরলে লগ চালিয়ে বই আবার বানানো যায়, আর replica একই লগ চালিয়ে হুবহু একই অবস্থায় থাকে।' },
      { q: 'Disk-এ fsync না করে কীভাবে টেকসই?', a: 'Memory-ম্যাপ করা ফাইলে লেখা (µs-এ), আর লগ অন্য machine-এ কপি। এক machine মরলেও লগ থাকে।' },
    ] },
  ],
};
