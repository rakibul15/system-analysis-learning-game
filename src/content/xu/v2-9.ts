import { num } from './fmt';
import type { XuNote } from './types';

/** P(more than m of n disks fail), each failing independently with probability p. */
function lossChance(n: number, m: number, p: number): number {
  let total = 0;
  let c = 1; // C(n, 0)
  for (let k = 0; k <= n; k++) {
    if (k > m) total += c * p ** k * (1 - p) ** (n - k);
    c = (c * (n - k)) / (k + 1);
  }
  return total;
}

const sci = (x: number) => (x < 1e-15 ? '< 10⁻¹⁵' : x.toExponential(1).replace('e-', ' × 10⁻').replace('e+', ' × 10'));

/** Vol 2, chapter 9 (S3-like Object Storage), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-9',
  goals: [
    'Block, file আর object storage-এর ফারাক বলতে পারবেন, আর কেন ছবি-ভিডিও-backup object storage-এ যায় বলতে পারবেন।',
    'Object-এর দুই অংশ (metadata আর data) আলাদা কেন, আর upload আর download-এর পথ আঁকতে পারবেন।',
    'Replication বনাম erasure coding: জায়গা আর সহনশীলতা হিসাব করে দেখাতে পারবেন।',
  ],
  related: ['storage', 'replication', 'sharding'],
  blocks: [
    { kind: 'p', text: 'S3-র মতো object storage-এ আপনি একটা নামে (key) যেকোনো আকারের ফাইল রাখেন আর নাম দিয়ে ফেরত আনেন। ছবি, video, backup, log: সবই। ParcelGo-র উদাহরণ: parcel-এর ছবি, delivery-র স্বাক্ষর, রাতের database backup। দাম সস্তা, আর সবচেয়ে বড় প্রতিশ্রুতি: ফাইল প্রায় কখনো হারায় না (১১টা nine: ৯৯.৯৯৯৯৯৯৯৯৯৯৯% durability)।' },
    { kind: 'table', head: ['ধরন', 'কেমন', 'কখন', 'ধীর?'], rows: [
      ['Block storage', 'কাঁচা diskের মতো: server-এ লাগানো, ছোট ছোট block-এ', 'Database, virtual machine-এর disk', 'সবচেয়ে দ্রুত'],
      ['File storage', 'ফোল্ডারে ফোল্ডারে, অনেকে একসাথে খোলে', 'Shared ফোল্ডার, অফিসের ফাইল', 'মাঝামাঝি'],
      ['Object storage', 'সমতল: key দিয়ে পুরো object; বদলাতে হলে নতুন করে লেখা', 'ছবি, video, backup, log, বিশাল ডেটা', 'ধীর, কিন্তু সস্তা আর বিশাল'],
    ] },
    { kind: 'list', items: [
      'Bucket: object-এর পাত্র (নাম অনন্য)। Object: ডেটা সহ নাম আর metadata। একবার রাখা, বদলানো নয় (version দিয়ে নতুন কপি)।',
      'Version: একই key-তে নতুন লেখা পুরোনোটা ঢাকে, কিন্তু পুরোনোটা ফেরানোও যায়।',
      'বিশাল: লাখ কোটি object, প্রতিটা কয়েক KB থেকে কয়েক TB।',
      'পরিসর: ডেটাতে অধিকাংশ বড়, কিন্তু ছোট object সংখ্যায় বেশি। দুটোই ভালো সামলাতে হবে।',
    ] },

    { kind: 'h', text: 'দুই অংশ: metadata আর data' },
    { kind: 'flow', label: 'Object-এর metadata আর আসল data আলাদা store-এ: নাম থেকে data-র ঠিকানা মেলে', nodes: [
      { id: 'c', label: 'Client', x: 8, y: 17 },
      { id: 'api', label: 'API service', sub: 'যাচাই, নাম', x: 34, y: 17, w: 20 },
      { id: 'md', label: 'Metadata store', sub: 'নাম → কোথায়', x: 70, y: 5, w: 22 },
      { id: 'ds', label: 'Data store', sub: 'আসল bytes', x: 70, y: 29, w: 22 },
    ], links: [
      { from: 'c', to: 'api', rate: 3 }, { from: 'api', to: 'md', rate: 1.2 }, { from: 'api', to: 'ds', rate: 2.4 },
    ], h: 36 },
    { kind: 'list', items: [
      'Metadata: নাম, আকার, মালিক, সময়, আর data কোথায় আছে। ছোট, বেশি খোঁজা: database (ভাগ করা, bucket+নাম ধরে)।',
      'Data store: আসল bytes। অনেক machine-এ, কপি সহ।',
      'দুটোর বাড়ার ধরন আলাদা: metadata সংখ্যায়, data আকারে। আলাদা করলে আলাদা বাড়ানো যায়।',
    ] },
    { kind: 'seq', label: 'Upload: ঘটনার ক্রম', actors: ['Client', 'API', 'Data store', 'Metadata store'], steps: [
      { from: 0, to: 1, msg: 'PUT /parcel-photos/PG-4821.jpg' },
      { from: 1, to: 1, msg: 'পরিচয়, অনুমতি যাচাই', note: 'এই bucket-এ লেখার অধিকার আছে কি?' },
      { from: 1, to: 2, msg: 'bytes রাখো (কপি সহ)', note: 'Data store নিজের ভেতরে কপি বা erasure coding করে (নিচে)।' },
      { from: 2, to: 1, msg: 'ঠিকানা: object-ID ৯৪৫৫', tone: 'ok' },
      { from: 1, to: 3, msg: 'নাম "PG-4821.jpg" → object-ID ৯৪৫৫, আকার, সময়', tone: 'ok', note: 'আগে data, তারপর metadata: নাম থাকলে data-ও আছে। উল্টোটা হলে নাম আছে, data নেই।' },
      { from: 1, to: 0, msg: 'সফল (200)', tone: 'ok' },
    ] },
    { kind: 'seq', label: 'Download: নাম থেকে data', actors: ['Client', 'API', 'Metadata store', 'Data store'], steps: [
      { from: 0, to: 1, msg: 'GET /parcel-photos/PG-4821.jpg' },
      { from: 1, to: 2, msg: 'এই নামের object কোথায়?' },
      { from: 2, to: 1, msg: 'object-ID ৯৪৫৫', tone: 'ok' },
      { from: 1, to: 3, msg: 'ID ৯৪৫৫-র bytes দাও' },
      { from: 3, to: 0, msg: 'bytes', tone: 'ok' },
    ] },
    { kind: 'p', text: 'বড় file (কয়েক GB) একটা request-এ নয়: টুকরো করে (multipart upload): প্রতিটা টুকরো আলাদা, সমান্তরালে, ভাঙলে শুধু সেটা আবার। সব টুকরো এলে জুড়ে একটা object।' },

    { kind: 'h', text: 'টিকে থাকা: কপি, নাকি erasure coding' },
    { kind: 'p', text: 'Disk মরে। ফাইল না হারাতে হলে বাড়তি কিছু রাখতে হয়। সরল উপায়: কপি, প্রতিটা ফাইলের ৩টা কপি আলাদা machine বা rack-এ। সহজ আর দ্রুত, কিন্তু ২০০% বাড়তি জায়গা। দ্বিতীয় উপায়: erasure coding। ফাইলকে k টুকরোয় ভেঙে m টা বাড়তি "সমতা" (parity) টুকরো গণিত দিয়ে বানানো। মোট k + m টুকরো আলাদা disk-এ। যেকোনো k টা থাকলে পুরো ফাইল ফেরে, তাই m টা পর্যন্ত disk মরলেও চলে।' },
    { kind: 'calc', label: 'কপি বনাম erasure coding', inputs: [
      { id: 'k', label: 'ডেটা টুকরো (k)', min: 2, max: 16, step: 1, value: 8 },
      { id: 'm', label: 'সমতা টুকরো (m)', min: 1, max: 8, step: 1, value: 4 },
      { id: 'p', label: 'মেরামতের সময়ে একটা disk মরার সম্ভাবনা', min: 0.1, max: 5, step: 0.1, value: 1, unit: '%' },
    ], out: (v) => {
      const k = v.k!, m = v.m!, p = v.p! / 100;
      const n = k + m;
      return [
        { label: '৩ কপির বাড়তি জায়গা', value: '২০০%', how: '১টা ফাইলের জন্য ৩ গুণ: ২ গুণ বাড়তি', tone: 'bad', bar: 1 },
        { label: `${num(k)}+${num(m)} erasure coding বাড়তি জায়গা`, value: `${num(Math.round((m / k) * 100))}%`, how: `${num(m)} ÷ ${num(k)}`, tone: 'ok', bar: Math.min(1, m / k / 2) },
        { label: 'কতগুলো disk একসাথে মরলেও ঠিক', value: `${num(m)}টা`, how: `৩ কপি: ২টা`, tone: m >= 2 ? 'ok' : undefined },
        { label: `${num(n)}টা টুকরোয় ${num(m + 1)}+ মরার সম্ভাবনা`, value: sci(lossChance(n, m, p)), how: 'ধরে: disk-রা আলাদা আলাদা মরে (স্বাধীন)', tone: 'ok' },
        { label: '৩ কপি, ৩টাই মরার সম্ভাবনা', value: sci(lossChance(3, 2, p)), how: 'তুলনার জন্য' },
      ];
    } },
    { kind: 'table', head: ['', '৩ কপি', 'Erasure coding (যেমন ৮+৪)'], rows: [
      ['বাড়তি জায়গা', '২০০%', '৫০%'],
      ['সহ্য', '২টা disk মরা', '৪টা disk মরা'],
      ['পড়া', 'এক কপি থেকে, দ্রুত', 'অনেক টুকরো থেকে জোড়া: ধীর, বেশি network'],
      ['লেখা', 'সহজ', 'গণিত করতে হয়: CPU, ধীর'],
      ['কখন', 'ছোট, বেশি পড়া ডেটা', 'বড়, ঠান্ডা ডেটা (backup, পুরোনো ছবি)'],
    ] },
    { kind: 'tip', title: 'একই কপি আলাদা জায়গায়', text: 'টুকরো বা কপি এমনভাবে রাখুন যেন একসাথে মরার সম্ভাবনা না থাকে: আলাদা rack, আলাদা data center। নইলে ৩ কপি একই rack-এ থাকলে একটা বিদ্যুৎ-বিভ্রাটে সব যায়।' },

    { kind: 'h', text: 'ভুলচুক ধরা আর সারানো' },
    { kind: 'list', items: [
      'Checksum: প্রতিটা টুকরোর সাথে একটা hash। পড়ার সময় মিলিয়ে দেখা, না মিললে ওই টুকরো নষ্ট (silent corruption)।',
      'Data node-দের heartbeat: কেউ ডাকে সাড়া না দিলে মৃত ধরে তার টুকরো অন্য জায়গায় নতুন করে বানানো।',
      'Garbage collection: মোছা object-এর জায়গা সাথে সাথে ফাঁকা হয় না; পরে বিশেষ কাজে। Metadata-তে "মোছা" চিহ্ন, পরে data।',
      'ছোট ফাইল অনেক: প্রতিটা আলাদা disk ফাইল হলে metadata ফেটে যায়। তাই অনেক ছোট object একটা বড় ফাইলে জড়ো (append-only), আর শুধু অবস্থান (offset) মনে রাখা।',
      'Versioning ও lifecycle: পুরোনো সংস্করণ কিছুদিন পরে সস্তা (ঠান্ডা) জায়গায় বা মুছে।',
    ] },

    { kind: 'story', title: 'একটা rack-এর সব কপি', steps: [
      'ParcelGo-র backup ৩ কপিতে রাখা হলো, কিন্তু তিনটাই একই rack-এ।',
      'Rack-এর power বিভ্রাটে তিনটা একসাথে অচল; ঘণ্টা পরে disk ফেরত এলেও কিছু নষ্ট।',
      'পুরো ৩ কপির উপর ভরসা ছিল, অথচ আলাদা failure-domain ছিল না।',
    ], fix: 'প্রতিটা কপি আলাদা rack (বা zone)-এ; আরও গুরুত্বপূর্ণ ডেটা আলাদা অঞ্চলে। আর নিয়মিত পরীক্ষা: কিছু disk বন্ধ করে দেখা সব ঠিক থাকে কিনা।' },

    { kind: 'mistakes', items: [
      'Metadata আর data এক জায়গায়, একসাথে বাড়ানো।',
      'বড় ফাইল একটা request-এ upload।',
      'সব কপি একই rack বা একই data center-এ।',
      'Checksum না মেলানো: চুপচাপ নষ্ট ডেটা।',
      'ছোট ফাইল আলাদা আলাদা disk ফাইল।',
    ] },
    { kind: 'check', items: [
      { q: 'Object storage কখন, block কখন?', a: 'Object: ছবি, video, backup, log: বিশাল, সস্তা, বদলানো কম। Block: database বা VM-এর disk, দ্রুত ছোট পড়া-লেখা।' },
      { q: 'Metadata আর data আলাদা কেন?', a: 'বাড়ার ধরন আলাদা (সংখ্যা বনাম আকার), আর metadata-তে দ্রুত খোঁজা লাগে। আলাদা করলে আলাদা করে বাড়ানো যায়।' },
      { q: '৩ কপির চেয়ে ৮+৪ erasure coding ভালো কীসে, খারাপ কীসে?', a: 'ভালো: জায়গা কম (৫০% বনাম ২০০%), আর ৪টা disk মরলেও চলে। খারাপ: পড়ায় অনেক টুকরো জোড়া, লেখায় CPU, বেশি network।' },
      { q: 'নষ্ট ডেটা চুপচাপ ধরা যায় কীভাবে?', a: 'Checksum: প্রতিটা টুকরোর hash। পড়া বা নিয়মিত যাচাইয়ের সময় মেলানো; না মিললে অন্য টুকরো থেকে নতুন করে বানানো।' },
    ] },
  ],
};
