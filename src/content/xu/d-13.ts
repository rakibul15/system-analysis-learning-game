import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 13 (A Philosophy of Streaming Systems), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-13',
  goals: [
    'Derived data আর data integration-এর ধারণা, আর "write path" ও "read path" কীভাবে আলাদা বলতে পারবেন।',
    'Unique constraint আর request-এর নিরাপদ retry কীভাবে stream দিয়ে সামলানো যায় (end-to-end request ID) ব্যাখ্যা করতে পারবেন।',
    'Timeliness আর integrity আলাদা করে বলতে পারবেন, আর কেন data নিয়মিত যাচাই (audit) করতে হয় তা বুঝিয়ে দিতে পারবেন।',
  ],
  related: ['streams', 'caching'],
  blocks: [
    { kind: 'p', text: 'এই অধ্যায় কোনো নতুন প্রযুক্তি শেখায় না। আগের সব ধারণা (log, replication, transaction, batch, stream) একসাথে রেখে বলে: একটা বড় application-এর data-ব্যবস্থা কেমন চেহারায় ভাবা যায়। কেন্দ্রে একটা ধারণা: বহু রকম data-সংরক্ষণ আর প্রক্রিয়ার টুল একসাথে চলবেই, তাই প্রশ্নটা কোন টুল নয়, কীভাবে তাদের ঠিকমতো জোড়া যায়।' },

    { kind: 'h', text: 'Data integration: কোনো একটা টুল সব পারে না' },
    { kind: 'p', text: 'একই data দিয়ে লেনদেন, পূর্ণ-লেখা খোঁজা, বিশ্লেষণ, cache, সুপারিশ: সবকিছু একটা database-এ হয় না। তাই কয়েকটা বিশেষায়িত system, প্রত্যেকে একই data-র নিজের ধরনের কপি। প্রশ্ন: এদের সবাইকে ঠিক রাখবেন কীভাবে?' },
    { kind: 'p', text: 'বইয়ের উত্তর: কোনো এক জায়গায় (system of record) সত্য, আর বাকি সব তা থেকে ক্রমানুসারে বানানো। পরিবর্তনের একটা সাজানো log সবাই একই ক্রমে অনুসরণ করে। Batch (পুরোনো সব নতুন করে হিসাব) আর stream (নতুনগুলো তাৎক্ষণিক) একই ছাঁদে কাজ করতে পারে। একসময় lambda architecture নামে দুই আলাদা সমান্তরাল কোড-পথ রাখা হতো (ধীর সঠিক batch আর দ্রুত আনুমানিক stream), যার ভুগান্তি: একই লজিক দুবার লেখা। আজকের প্রবণতা এক কোড দিয়ে দুটোই সামলানো।' },
    { kind: 'flow', label: 'এক সত্য-log, অনেক derived view: সবাই একই ক্রমে অনুসরণ করে', nodes: [
      { id: 'db', label: 'Orders DB', sub: 'সত্য', x: 12, y: 17, w: 20 },
      { id: 'lg', label: 'Change log', x: 40, y: 17, w: 18 },
      { id: 'ix', label: 'Search', x: 84, y: 5, w: 18 },
      { id: 'ca', label: 'Cache', x: 84, y: 17, w: 18 },
      { id: 'wh', label: 'Warehouse', x: 84, y: 29, w: 18 },
    ], links: [
      { from: 'db', to: 'lg', rate: 4 },
      { from: 'lg', to: 'ix', rate: 3 },
      { from: 'lg', to: 'ca', rate: 3 },
      { from: 'lg', to: 'wh', rate: 3 },
    ], h: 34 },

    { kind: 'h', text: 'Database-কে ভেঙে দেখা (unbundling)' },
    { kind: 'p', text: 'Database ভেতরে অনেক কাজ করে: index বজায় রাখা, materialized view, replication, full-text index, সবই সে আপনার পক্ষে করে। সেই কাজগুলো আলাদা আলাদা অংশে ভাগ করে নিলে কেমন হয়? আসলে বড় system-এ ঠিক তাই হচ্ছে: Postgres + Kafka + Elasticsearch + একটা cache, সবাই মিলে এক বড় "database"-এর মতো, আর CDC তাদের আঠা। সুবিধা: প্রতিটা কাজের সেরা টুল বাছা যায়, আর টুল আলাদা করে বদলানো যায়। অসুবিধা: জোড়া লাগানোর দায় আপনার, আর ভাঙলে কোথায় তা খোঁজা কঠিন।' },
    { kind: 'list', items: [
      'Composing: লেখা যায় এক জায়গায় (log-এ বা database-এ), বাকিরা অনুসরণ করে। এটা "সবাই সবখানে লেখে"-র চেয়ে অনেক বেশি নিরাপদ।',
      'Federated query (একই query-তে অনেক system) আর unbundled-এর ধারা আলাদা: প্রথমটা পড়ার সময় জোড়া, দ্বিতীয়টা লেখার সময় আগে থেকে বানিয়ে রাখা।',
      'Asynchronous হওয়ার সুবিধা: একটা ধীর অংশ বাকিকে আটকায় না, আর ভাঙলে log থেকে আবার তুলে নেওয়া যায়, transaction-এর মতো সবাইকে একসাথে আটকে রাখতে হয় না।',
    ] },

    { kind: 'h', text: 'Application-কে dataflow ধরে ভাবা' },
    { kind: 'p', text: 'অ্যাপ্লিকেশন কোডকে ভাবুন derived data বানানোর function হিসেবে: input log থেকে output view। তখন বদলের ফল স্বয়ংক্রিয়ভাবে ছড়ায়, যেন spreadsheet-এ একটা cell বদলালে সূত্রে জোড়া সব cell বদলায়। পড়া আর লেখার মধ্যে সীমারেখা টানা যায়।' },
    { kind: 'table', head: ['', 'Write path', 'Read path'], rows: [
      ['কখন', 'data আসতেই, আগে থেকে', 'কেউ জিজ্ঞেস করলে'],
      ['কী করে', 'derived view বানায়, index ভরে', 'সেই view থেকে উত্তর দেয়, দরকারে বাকি জুড়ে'],
      ['বেশি কাজ করলে', 'লেখা ধীর, পড়া সস্তা', 'লেখা সস্তা, পড়া ভারী'],
      ['উদাহরণ', 'প্রতি order-এ সব follower-এর feed বানানো', 'feed খোলার সময় সবার post জোড়া'],
    ] },
    { kind: 'p', text: 'Cache, index, materialized view আসলে এই সীমারেখা সরানোর যন্ত্র: লেখার সময় বেশি কাজ করে পড়ার সময় কমানো। কোথায় সীমা টানবেন তা ঠিক করে বাস্তব load: কতবার লেখা, কতবার পড়া। ব্রাউজার বা ফোনের screen-ও একই ধারণায় ভাবা যায়: তার অবস্থা server থেকে আসা event-এ হালনাগাদ হওয়া একটা derived view।' },

    { kind: 'h', text: 'সঠিকতা: ডাটা যেন ভুল না হয়' },
    { kind: 'h', text: 'End-to-end argument' },
    { kind: 'p', text: 'Database transaction, TCP-র নির্ভরযোগ্যতা, queue-এর "exactly-once": প্রত্যেকে নিজ নিজ স্তরে সুরক্ষা দেয়। কিন্তু পুরো পথে (ব্যবহারকারীর ক্লিক থেকে database পর্যন্ত) কোথাও এক স্তর ব্যর্থ হলে সেই সুরক্ষা ভেঙে যায়। যেমন ব্যবহারকারী "পেমেন্ট" চেপে নেট হারাল, আবার চাপল: দুটো আলাদা request, কোনো স্তরের কাছেই তারা এক নয়। শুধু দুই প্রান্ত (ক্লিক থেকে শেষ ফল) যদি একটা request ID দিয়ে জানে, তবে নিশ্চিত হয়।' },
    { kind: 'seq', label: 'End-to-end request ID: দুবার চাপলেও একবার চার্জ', actors: ['ব্যবহারকারী', 'Payment service', 'Requests table'], steps: [
      { from: 0, to: 1, msg: 'পেমেন্ট, request ID = অ১২৩', note: 'ID বানায় client, ফর্ম খোলার সময়ই।' },
      { from: 1, to: 2, msg: 'অ১২৩ আছে? না। লিখে রাখো আর চার্জ করো', tone: 'ok' },
      { from: 1, to: 0, msg: 'উত্তর ... (নেট চলে গেল, ব্যবহারকারী পেলেন না)', tone: 'bad' },
      { from: 0, to: 1, msg: 'আবার চাপলাম: একই request ID অ১২৩', note: 'একই ফর্ম, একই ID: আবার পাঠানো, নতুন নয়।' },
      { from: 1, to: 2, msg: 'অ১২৩ আছে: আগের ফল ফেরত দাও, নতুন চার্জ নয়', tone: 'ok', note: 'Unique constraint-ই এখানে পাহারাদার: একই ID দ্বিতীয়বার ঢুকতেই পারে না।' },
    ] },

    { kind: 'h', text: 'Constraint আর uniqueness' },
    { kind: 'p', text: 'Unique ইউজারনেম, শূন্যের নিচে না যাওয়া balance: এ ধরনের নিয়ম মানাতে হলে একই জিনিসের সব প্রতিযোগীকে এক জায়গায় ক্রমে আনা চাই। Log-ভিত্তিক পথে: constraint-এর key ধরে partition করুন (ইউজারনেমের hash), যাতে একই নামের সব দাবি একই partition-এ আসে। সেই partition-এর consumer একটা একটা করে পড়ে: প্রথম দাবি জেতে, পরেরটা প্রত্যাখ্যান। একক thread-এ ক্রমানুসারে, তাই লড়াই নেই। দাম: প্রতিক্রিয়া সঙ্গে সঙ্গে নয়, event প্রক্রিয়া হওয়ার পরে আসে; ব্যবহারকারীকে অপেক্ষা করানো বা পরে জানানো।' },

    { kind: 'h', text: 'Timeliness আর integrity' },
    { kind: 'p', text: 'দুটো আলাদা ধারণা। Timeliness: ব্যবহারকারী কি সাম্প্রতিক অবস্থা দেখছে? ক্ষণিক পিছিয়ে থাকা (eventual consistency) সাময়িক, শেষে ঠিক হয়। Integrity: data কি আসলে ঠিক, কিছু হারায়নি, ভুল জোড়া লাগেনি, দুটো ভিন্ন গল্প নয়? Integrity ভাঙলে সাময়িক নয়, চিরস্থায়ী ক্ষতি। তাই বেশিরভাগ কাজে timeliness কিছুটা ছাড়া যায়, integrity নয়। যেমন balance-এ ক্ষণিক পুরোনো সংখ্যা সহনীয়; কিন্তু একই টাকা দুবার খরচ হওয়া নয়।' },
    { kind: 'tip', title: 'Coordination এড়ানো', text: 'অনেক সময় নিয়ম মানা যায় সমন্বয় ছাড়া, ক্ষতিপূরণ দিয়ে। Seat-এর চেয়ে বেশি বুকিং নিয়ে পরে ক্ষমা চেয়ে ফেরত দেওয়া (এয়ারলাইনের overbooking) ব্যবসা হিসেবে সস্তা হতে পারে। কোন ভুল সহনীয় আর কোনটা নয়, সেটা ব্যবসার সিদ্ধান্ত। কঠোর constraint শুধু যেখানে সত্যিই লাগে।' },

    { kind: 'h', text: 'বিশ্বাস করো, কিন্তু যাচাই করো' },
    { kind: 'p', text: 'Disk নিঃশব্দে bit বদলায়, software-এর bug থাকে, মানুষ ভুল করে। তাই "আমার database ACID, সব ঠিক" ধরে নেওয়া ঝুঁকি। উপায়: নিয়মিত audit: দুই আলাদা source থেকে একই সংখ্যা মেলানো, backup সত্যিই restore হয় কি না দেখা, checksum। অপরিবর্তনীয় log এখানে সাহায্য করে: ঘটনার ইতিহাস থেকে যেকোনো দিনের অবস্থা আবার হিসাব করে মিলিয়ে দেখা যায়। একই ধারণা blockchain-এও: যাচাইযোগ্য ইতিহাস।' },
    { kind: 'calc', label: 'নমুনা যাচাইয়ে ভুল ধরা পড়ার সম্ভাবনা', inputs: [
      { id: 'bad', label: 'কত শতাংশ রেকর্ড নষ্ট', min: 0.01, max: 5, step: 0.01, value: 0.1, unit: '%', show: (x) => `${x.toFixed(2)}%` },
      { id: 'n', label: 'কতগুলো এলোমেলো রেকর্ড মেলালেন', min: 10, max: 100_000, step: 10, value: 1000 },
    ], out: (v) => {
      const p = 1 - Math.pow(1 - v.bad! / 100, v.n!);
      return [
        { label: 'অন্তত একটা নষ্ট ধরা পড়ার সম্ভাবনা', value: `${num(Math.round(p * 1000) / 10)}%`, bar: p, tone: p > 0.9 ? 'ok' : 'bad', how: `১ − (১ − ${num(v.bad! / 100)})^${num(v.n!)}` },
        { label: 'প্রত্যাশিত নষ্ট পাওয়া', value: `${num(Math.round(v.bad! * v.n!) / 100)}টা`, how: 'যাচাই-করা সংখ্যা × নষ্টের হার' },
      ];
    } },
    { kind: 'p', text: 'মানে: কম হারের ভুল ধরতে অনেক রেকর্ড মেলাতে হয়। আর যাচাই কখনো শেষ কাজ নয়, নিয়মিত কাজ।' },

    { kind: 'story', title: 'চুপচাপ বিগড়ে যাওয়া report', steps: [
      'ParcelGo-র warehouse আর orders database প্রায়ই একটু অমিল ছিল, কেউ লক্ষ করেনি।',
      'Dual write-এর ভুল আর কিছু হারানো event জমে জমে মাসের শেষে আয়ের report-এ ফারাক।',
      'কোথায় ভুল তা ধরতে কয়েক সপ্তাহ গেল, কারণ কোনো নিয়মিত যাচাই ছিল না।',
    ], fix: 'পরিবর্তনের log-কে একমাত্র পথ করুন (CDC), আর প্রতি রাতে দুই system-এর মোট সংখ্যা আর নমুনা রেকর্ড মিলিয়ে দেখুন। অমিল পেলে সংকেত, মাস শেষের জন্য অপেক্ষা নয়।' },

    { kind: 'mistakes', items: [
      'প্রতিটা টুলকে সত্যের উৎস বানানো: অনেক সত্য মানে অনেক অমিল। একটাই উৎস, বাকিরা derived।',
      'Dual write: দুই জায়গায় আলাদা লেখা, ক্রম আর আংশিক ব্যর্থতা ছাড়া চলে না।',
      'শুধু স্তরভিত্তিক সুরক্ষায় ভরসা: end-to-end request ID ছাড়া retry-তে দ্বিগুণ কাজ।',
      'Timeliness আর integrity গুলিয়ে ফেলা: ক্ষণিক পুরোনো ঠিক, চিরস্থায়ী ভুল নয়।',
      'কখনো যাচাই না করা: নিঃশব্দ নষ্ট data মাসের পর মাস থেকে যায়।',
    ] },
    { kind: 'check', items: [
      { q: 'Write path আর read path কী?', a: 'Write path: data আসতেই আগে থেকে derived view বানানো। Read path: কেউ জিজ্ঞেস করলে সেই view থেকে (দরকারে আরও জুড়ে) উত্তর দেওয়া। Cache, index আর materialized view এই সীমা লেখার দিকে সরায়।' },
      { q: 'End-to-end request ID কেন লাগে, শুধু database transaction যথেষ্ট নয় কেন?', a: 'ব্যবহারকারীর দুই চাপ database-এর কাছে দুটো আলাদা request, কোনো এক স্তর তাদের এক ভাবতে পারে না। Client একটা ID বানালে আর শেষ প্রান্তে তা unique রাখলে পুরো পথে retry নিরাপদ হয়।' },
      { q: 'Timeliness আর integrity-র পার্থক্য আর কোনটা ছাড়া যায়?', a: 'Timeliness: সাম্প্রতিক কি না, ক্ষণিক পিছিয়ে থাকলে শেষে ঠিক হয়। Integrity: data আসলে ঠিক কি না, ভাঙলে স্থায়ী ক্ষতি। সাধারণত timeliness কিছুটা ছাড়া যায়, integrity নয়।' },
      { q: 'নিয়মিত audit কেন, যদি database ACID হয়?', a: 'Disk, software bug আর মানুষের ভুলে নিঃশব্দে data নষ্ট হতে পারে, ACID তা ঠেকায় না। দুই source মিলিয়ে বা backup restore করে দেখলে তবে ধরা পড়ে।' },
    ] },
  ],
};
