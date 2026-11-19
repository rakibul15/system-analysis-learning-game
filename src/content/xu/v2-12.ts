import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 12 (Digital Wallet), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-12',
  goals: [
    'এক account থেকে আরেকটায় টাকা সরানো কেন কঠিন (দুটো আলাদা node-এ), আর সেটা কত সংখ্যক node লাগায় হিসাব করতে পারবেন।',
    '2PC, TCC আর saga: তিনটার ধাপ আর ভাঙলে কী হয় বলতে পারবেন।',
    'Event sourcing কী, আর কীভাবে ইতিহাস থেকে যেকোনো মুহূর্তের balance বের হয় বলতে পারবেন।',
  ],
  related: ['transactions', 'consensus', 'replication', 'sharding'],
  blocks: [
    { kind: 'p', text: 'Digital wallet একটা account যেখানে টাকা জমা থাকে, আর এক wallet থেকে আরেকটায় পাঠানো যায়: bKash, Nagad-এর মতো। ParcelGo-র উদাহরণ: merchant-দের wallet-এ delivery-র টাকা জমে, আর সেখান থেকে অন্য wallet-এ বা ব্যাংকে। আগের অধ্যায়ের (payment) পরের ধাপ: এবার হাজার হাজার ট্রান্সফার প্রতি সেকেন্ডে, আর কোনোটাই "প্রায় ঠিক" নয়।' },
    { kind: 'list', items: [
      'একটা কাজ: A-র wallet থেকে ১০০ কমিয়ে B-র wallet-এ ১০০ বাড়ানো। দুটোই হবে, নয়তো কোনোটাই নয়।',
      'কখনো ঋণাত্মক balance নয় (A-র কাছে ১০০ না থাকলে ট্রান্সফার ব্যর্থ)।',
      'গতি: প্রতি সেকেন্ডে ১০ লক্ষ ট্রান্সফারের লক্ষ্য ধরা যাক।',
      'নির্ভরযোগ্য: ৯৯.৯৯% চালু, আর কিছু হারাবে না; ইতিহাস অটুট।',
    ] },
    { kind: 'calc', label: 'কত node লাগবে', inputs: [
      { id: 'tps', label: 'লক্ষ্য (ট্রান্সফার প্রতি সেকেন্ডে)', min: 1000, max: 2_000_000, step: 1000, value: 1_000_000 },
      { id: 'one', label: 'এক node পারে (প্রতি সেকেন্ডে)', min: 100, max: 20000, step: 100, value: 1000 },
      { id: 'twice', label: 'প্রতি ট্রান্সফারে wallet', min: 1, max: 3, step: 1, value: 2 },
    ], out: (v) => {
      const ops = v.tps! * v.twice!;
      const nodes = Math.ceil(ops / v.one!);
      return [
        { label: 'মোট লেখা প্রতি সেকেন্ডে', value: num(ops), how: `${num(v.tps!)} × ${num(v.twice!)} wallet (একটা কমে, একটা বাড়ে)` },
        { label: 'Node লাগবে', value: num(nodes), how: `${num(ops)} ÷ ${num(v.one!)}`, bar: Math.min(1, nodes / 5000), tone: nodes > 1000 ? 'bad' : 'ok' },
        { label: 'ভার ভাগ হলে', value: 'প্রায় প্রতি ট্রান্সফারে দুটো আলাদা node', how: 'A আর B-র wallet প্রায়ই দুটো আলাদা node-এ: তাই সমস্যা', tone: 'bad' },
      ];
    } },
    { kind: 'tip', title: 'এক database, এক transaction: ধাপ ১', text: 'সব wallet এক relational database-এ থাকলে সহজ: একটা transaction-এ A কমে, B বাড়ে, হয় দুটোই নয়তো কোনোটাই। কিন্তু এক database-এ ১০ লক্ষ ট্রান্সফার ধরে না। ভাগ করলেই A আর B আলাদা node-এ: তখন এক transaction-এ দুই node: কঠিন।' },

    { kind: 'h', text: 'ধাপে ধাপে বড় করা' },
    { kind: 'stages', label: 'Wallet-এর design তিন ধাপে', stages: [
      { title: 'এক database', problem: 'শুরু: সব wallet এক জায়গায়।', fix: 'Transaction: BEGIN, A −১০০, B +১০০, COMMIT। নিখুঁত, সহজ।', cost: 'এক machine-এর সীমা: কয়েক শো/হাজার সেকেন্ডে। বেশি হলে বসে যায়।',
        nodes: [{ id: 'a', label: 'Service', x: 18, y: 17 }, { id: 'd', label: 'এক database', sub: 'সব wallet', x: 68, y: 17, w: 24 }], links: [{ from: 'a', to: 'd', rate: 2.4 }] },
      { title: 'ভাগ করা (sharding)', problem: 'এক database-এ ধরে না।', fix: 'wallet ID ধরে অনেক node-এ ভাগ (hash)। প্রতিটা node নিজের অংশ সামলায়। Redis-এর মতো দ্রুত store-ও চলে।', cost: 'A আর B আলাদা node-এ থাকলে এক transaction আর কাজ করে না: নতুন সমস্যা।',
        nodes: [{ id: 'r', label: 'Router', x: 12, y: 17 }, { id: 'n1', label: 'Node ১', sub: 'A-র wallet', x: 60, y: 5, w: 20 }, { id: 'n2', label: 'Node ২', sub: 'B-র wallet', x: 60, y: 29, w: 20 }],
        links: [{ from: 'r', to: 'n1', rate: 2 }, { from: 'r', to: 'n2', rate: 2 }] },
      { title: 'Distributed transaction', problem: 'এক ট্রান্সফার দুই node-এ: একটা সফল, অন্যটা ব্যর্থ হলে টাকা হারায় বা তৈরি হয়।', fix: '2PC, TCC বা saga (নিচে): কয়েকটা ধাপ সমন্বয় করে হয় সবাই, নয়তো কেউ না। আরও ভালো: event sourcing, যাতে প্রতিটা ঘটনা অটুট থাকে।', cost: 'ধীর, জটিল; ভুল হলে পুরো চালানো কঠিন।',
        nodes: [{ id: 'c', label: 'Coordinator', x: 12, y: 17, w: 20 }, { id: 'n1', label: 'Node ১', sub: 'A −১০০', x: 60, y: 5, w: 20 }, { id: 'n2', label: 'Node ২', sub: 'B +১০০', x: 60, y: 29, w: 20 }, { id: 'l', label: 'লগ', x: 92, y: 17, w: 14 }],
        links: [{ from: 'c', to: 'n1', rate: 2 }, { from: 'c', to: 'n2', rate: 2 }, { from: 'n1', to: 'l', rate: 1 }, { from: 'n2', to: 'l', rate: 1 }] },
    ] },

    { kind: 'h', text: 'Two-phase commit (2PC)' },
    { kind: 'p', text: 'একজন সমন্বয়কারী (coordinator) দুই ধাপে সবাইকে নিয়ে চলে। প্রথমে জিজ্ঞেস: তোমরা সবাই প্রস্তুত? সবাই হ্যাঁ বললে দ্বিতীয় ধাপে: এবার করো। একজনও না বললে সবাইকে বাতিল। সবাই হয় ঠিকঠাক, নয়তো কেউ না। কিন্তু দুর্বলতা: coordinator মরলে বাকিরা ঝুলে থাকে।' },
    { kind: 'seq', label: '2PC: A থেকে B-তে ১০০', actors: ['Coordinator', 'Node ১ (A)', 'Node ২ (B)'], steps: [
      { from: 0, to: 1, msg: 'প্রস্তুত? (A থেকে ১০০ কমানো)', note: 'ধাপ ১: prepare। Node নিজের রাখা লক করে, এখনো কিছু বদলায় না।' },
      { from: 0, to: 2, msg: 'প্রস্তুত? (B-তে ১০০ বাড়ানো)' },
      { from: 1, to: 0, msg: 'হ্যাঁ, প্রস্তুত', tone: 'ok' },
      { from: 2, to: 0, msg: 'হ্যাঁ, প্রস্তুত', tone: 'ok' },
      { from: 0, to: 1, msg: 'এবার করো (commit)', tone: 'ok', note: 'ধাপ ২: সবাই হ্যাঁ বলেছে, তাই commit।' },
      { from: 0, to: 2, msg: 'এবার করো (commit)', tone: 'ok' },
      { from: 0, to: 0, msg: 'কিন্তু commit পাঠানোর আগে coordinator মরলে?', tone: 'bad', note: 'Node ১ আর ২ দুজনেই "হ্যাঁ" বলে লক ধরে বসে আছে, আর জানে না commit নাকি abort। সমন্বয়কারী না ফেরা পর্যন্ত আটকা।' },
    ] },
    { kind: 'list', items: [
      'লাভ: সহজ বোঝা, শক্তিশালী গ্যারান্টি (সব বা কিছুই না)।',
      'অসুবিধা: লক ধরে থাকে (ধীর), coordinator একটাই ঝুঁকি, আর NoSQL store বা বাইরের সেবায় সাধারণত পাওয়া যায় না।',
    ] },

    { kind: 'h', text: 'TCC আর saga' },
    { kind: 'p', text: 'TCC (Try-Confirm/Cancel) আর saga দুটোই database-এর বাইরে, application স্তরে। প্রতিটা ধাপের জন্য একটা "উল্টো" ধাপ লেখা। ভুল হলে আগে করা ধাপগুলো উল্টো চালিয়ে ফেরানো।' },
    { kind: 'seq', label: 'TCC: আগে সংরক্ষণ (Try), তারপর নিশ্চিত (Confirm) বা বাতিল (Cancel)', actors: ['Coordinator', 'Node ১ (A)', 'Node ২ (B)'], steps: [
      { from: 0, to: 1, msg: 'Try: A-র ১০০ আলাদা করে রাখো', note: 'এখনো খরচ হয়নি, শুধু "ধরা"।' },
      { from: 1, to: 0, msg: 'ধরা হলো', tone: 'ok' },
      { from: 0, to: 2, msg: 'Try: B-র জন্য ১০০ জমার জায়গা করো' },
      { from: 2, to: 0, msg: 'ব্যর্থ (B-র wallet বন্ধ)', tone: 'bad' },
      { from: 0, to: 1, msg: 'Cancel: ধরা ১০০ ফেরত দাও', tone: 'ok', note: 'আগের ধাপের উল্টো চালানো। A-র টাকা যেমন ছিল তেমন।' },
    ] },
    { kind: 'table', head: ['', '2PC', 'TCC', 'Saga'], rows: [
      ['স্তর', 'Database', 'Application', 'Application'],
      ['লক', 'পুরো সময় ধরে', 'ছোট, শুধু Try-তে', 'নেই'],
      ['ভুল সারানো', 'Rollback, স্বয়ংক্রিয়', 'Cancel (আগে লেখা)', 'ক্ষতিপূরণ (compensating) ধাপ (আগে লেখা)'],
      ['ক্রম', 'সবাই একসাথে', 'সব Try একসাথে, তারপর Confirm', 'পরপর: একটার পর একটা, আর ফিরতি পথে উল্টো'],
      ['কখন', 'একই database-এর ভেতর বা সহজ ক্ষেত্রে', 'টাকা, স্টক: ধরা যায় এমন কিছু', 'দীর্ঘ কাজ, অনেক সেবা (order, payment, delivery)'],
    ] },

    { kind: 'h', text: 'Event sourcing: ইতিহাসই সত্য' },
    { kind: 'p', text: 'সাধারণত wallet-এ রাখি "এখন balance ৪০০"। যদি ভুল হয়? কীভাবে হলো, জানার উপায় নেই। Event sourcing উল্টো: শুধু ঘটনা রাখে, যেগুলো কখনো বদলানো বা মোছা যায় না: "রিয়া ৫০০ জমা দিল", "রিয়া করিমকে ১০০ পাঠাল"। Balance হলো সব ঘটনা একটার পর একটা চালিয়ে পাওয়া ফল। কোনো মুহূর্তের balance জানতে সেই মুহূর্ত পর্যন্ত ঘটনাগুলো চালান।' },
    { kind: 'calc', label: 'ঘটনা থেকে balance', inputs: [
      { id: 'dep', label: 'জমা', min: 0, max: 1000, step: 50, value: 500 },
      { id: 'out', label: 'পাঠানো', min: 0, max: 1000, step: 50, value: 100 },
      { id: 'in', label: 'পাওয়া', min: 0, max: 1000, step: 50, value: 50 },
      { id: 'upto', label: 'কতটা ঘটনা পর্যন্ত', min: 0, max: 3, step: 1, value: 3 },
    ], out: (v) => {
      const evs = [v.dep!, -v.out!, v.in!];
      let bal = 0;
      for (let i = 0; i < Math.min(3, v.upto!); i++) bal += evs[i]!;
      return [
        { label: 'ঘটনার তালিকা', value: `জমা +${num(v.dep!)}, পাঠানো −${num(v.out!)}, পাওয়া +${num(v.in!)}`, how: 'এগুলো কখনো বদলায় না' },
        { label: `প্রথম ${num(Math.min(3, v.upto!))}টা ঘটনা পর্যন্ত balance`, value: num(bal), how: 'সব ঘটনা একে একে যোগ', tone: bal < 0 ? 'bad' : 'ok', bar: Math.min(1, Math.abs(bal) / 1000) },
        { label: 'ঋণাত্মক?', value: bal < 0 ? 'হ্যাঁ: এই পাঠানোটা আসলে আটকাতে হতো' : 'না', tone: bal < 0 ? 'bad' : 'ok', how: 'কমানোর আগে balance ≥ পরিমাণ যাচাই হয় ঘটনা লেখার আগে' },
      ];
    } },
    { kind: 'list', items: [
      'Command (কী করতে চাই: "১০০ পাঠাও") → যাচাই → event ("১০০ পাঠানো হয়েছে")। শুধু যাচাই পাশ হলে event লেখা।',
      'প্রতিটা event append-only লগ-এ: অডিট নিখুঁত, ভুল হলে ইতিহাস ঘুরে দেখা, প্রয়োজনে আবার চালানো।',
      'CQRS: লেখা (command, event লগে) আর পড়া (balance, দ্রুত দেখার জন্য আলাদা read model) আলাদা। Read model event থেকে বানানো, ধীরে আপডেট; তাই এক মুহূর্ত পুরোনো হতে পারে।',
      'Snapshot: লাখ ঘটনা প্রতিবার চালানো ধীর; মাঝে মাঝে ফলাফল ধরে রাখা, আর তার পরের ঘটনাগুলো শুধু।',
    ] },
    { kind: 'p', text: 'এখনো প্রশ্ন: event লগটা কীভাবে সবাই একমত, ক্রম ঠিক রাখে? এই নকশায় লগের জন্য Raft-এর মতো consensus (v2-4-এর replication আর DDIA-র consensus note-এ): একটা leader, বাকিরা follower, বেশিরভাগ লিখলেই সফল। তাই এক node মরলেও ঘটনা হারায় না।' },

    { kind: 'story', title: 'টাকা উবে গেল', steps: [
      'প্রথম সংস্করণে ট্রান্সফার দুই ধাপে: A-র balance কমানো, তারপর B-র বাড়ানো।',
      'মাঝে B-র node বসে গেল: A-র ১০০ কমল, B-র বাড়ল না।',
      'টাকা কোথাও নেই: ১০০ উবে গেল; কেউ জানত না কোথায়।',
    ], fix: 'ঘটনা-ভিত্তিক: ট্রান্সফার একটাই event ("A থেকে B-তে ১০০") লগে, তারপর দুই পাশের balance সেই event থেকে বানানো। না হলে saga/TCC-র মতো ক্ষতিপূরণসহ ধাপ।' },

    { kind: 'mistakes', items: [
      'দুই node-এ দুই আলাদা লেখা, মাঝে ভাঙলে কী হবে না ভেবে।',
      'শুধু বর্তমান balance রাখা, ইতিহাস না রেখে।',
      'Event বদলানো বা মোছা: ভুল হলে নতুন সংশোধনী event দিন।',
      '2PC-তে একটা coordinator: তার মৃত্যুতে সবাই আটকা।',
      'Balance ঋণাত্মক হওয়ার আগে যাচাই না করা।',
    ] },
    { kind: 'check', items: [
      { q: 'Wallet-এ ট্রান্সফার কেন কঠিন?', a: 'এক ট্রান্সফারে দুটো wallet বদলায়, আর ভাগ করা system-এ দুটো প্রায়ই আলাদা node-এ। একটা সফল, অন্যটা ব্যর্থ হলে টাকা হারায় বা তৈরি হয়।' },
      { q: '2PC-র দুর্বলতা কী?', a: 'Coordinator commit পাঠানোর আগে মরলে সবাই "প্রস্তুত" অবস্থায় লক ধরে ঝুলে থাকে। আর লক ধরে রাখায় ধীর।' },
      { q: 'TCC আর saga-র ভুল সারানো কীভাবে?', a: 'প্রতিটা ধাপের উল্টো ধাপ (Cancel বা ক্ষতিপূরণ) আগে থেকে লেখা। কোথাও ব্যর্থ হলে আগের ধাপগুলোর উল্টো চালিয়ে ফেরানো।' },
      { q: 'Event sourcing-এ balance কোথায়?', a: 'কোথাও জমানো নয়: সব ঘটনা একটার পর একটা চালিয়ে বের করা (বা snapshot + পরের ঘটনা)। ঘটনা কখনো বদলায় না, তাই অডিট নিখুঁত।' },
    ] },
  ],
};
