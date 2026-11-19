import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 8 (Design A URL Shortener), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-8',
  goals: [
    'পঞ্চাশ লাখ বা শত কোটি URL-এর জন্য কত অক্ষরের code লাগে হিসাব করতে পারবেন (base 62)।',
    'Hash আর collision বনাম counter আর base 62: দুই পথ বুঝিয়ে বলতে পারবেন কখন কোনটা।',
    '301 আর 302 redirect-এর ফারাক আর তার প্রভাব (analytics, cache) বলতে পারবেন।',
  ],
  related: ['caching', 'sharding'],
  blocks: [
    { kind: 'p', text: 'URL shortener লম্বা link-কে ছোট করে: ParcelGo-র tracking link "parcelgo.com/track/PG-4821?utm=…" বদলে হয় "pgo.to/Zn8Q3x2"। SMS-এ জায়গা বাঁচে, QR code-এ ছোট ঘন পড়ে, আর কতজন click করল তাও গোনা যায়। কাজ মাত্র দুটো: লম্বা URL দিলে ছোটটা দেওয়া, আর ছোটটা খুললে লম্বায় পাঠানো। সংখ্যা বড় হলেই মজা শুরু।' },

    { kind: 'h', text: 'আগে হিসাব' },
    { kind: 'calc', label: 'অনুমান: লেখা কম, পড়া অনেক বেশি', inputs: [
      { id: 'w', label: 'দিনে নতুন URL', min: 1, max: 500, step: 1, value: 100, unit: 'M' },
      { id: 'r', label: 'পড়া ÷ লেখা', min: 1, max: 30, step: 1, value: 10 },
      { id: 'y', label: 'কত বছর রাখবেন', min: 1, max: 20, step: 1, value: 10 },
      { id: 's', label: 'একটা record', min: 100, max: 1000, step: 50, value: 100, unit: 'B' },
    ], out: (v) => {
      const perSec = (v.w! * 1e6) / 86400;
      const total = v.w! * 1e6 * 365 * v.y!;
      return [
        { label: 'লেখা প্রতি সেকেন্ডে', value: num(Math.round(perSec)), how: `${num(v.w!)}M ÷ ৮৬,৪০০ সেকেন্ড` },
        { label: 'পড়া প্রতি সেকেন্ডে (redirect)', value: num(Math.round(perSec * v.r!)), how: `লেখা × ${num(v.r!)}` },
        { label: `${num(v.y!)} বছরে মোট URL`, value: num(total), how: `${num(v.w!)}M × ৩৬৫ × ${num(v.y!)}` },
        { label: 'Storage', value: bytes(total * v.s!), how: `${num(total)} × ${num(v.s!)} byte` },
      ];
    } },
    { kind: 'p', text: 'পড়া লেখার ১০ গুণ, তাই design-এর বেশিরভাগ চিন্তা redirect দ্রুত করা নিয়ে: cache আর read replica।' },

    { kind: 'h', text: 'ছোট code কত লম্বা' },
    { kind: 'p', text: 'Code-এ অক্ষর রাখা হয় ০-৯, a-z, A-Z: মোট ৬২টা। এটাকে বলে base 62। এখন প্রশ্ন, কয়টা অক্ষর হলে যথেষ্ট? n অক্ষরে ৬২^n টা আলাদা code। নিচে দেখুন।' },
    { kind: 'calc', label: 'Code-এর দৈর্ঘ্য আর কয়টা URL ধরে', inputs: [
      { id: 'n', label: 'অক্ষর', min: 3, max: 10, step: 1, value: 7 },
      { id: 'need', label: 'দরকার (শত কোটি)', min: 1, max: 1000, step: 1, value: 365 },
    ], out: (v) => {
      const cap = 62 ** v.n!;
      const need = v.need! * 1e9;
      return [
        { label: 'মোট আলাদা code', value: num(cap), how: `৬২^${num(v.n!)}`, bar: Math.min(1, cap / (need * 4)) },
        { label: `${num(v.need!)}B URL ধরবে?`, value: cap >= need ? `হ্যাঁ, ${num(Math.floor(cap / need))} গুণ বেশি জায়গা` : 'না, আরেক অক্ষর বাড়ান', tone: cap >= need ? 'ok' : 'bad' },
      ];
    } },
    { kind: 'p', text: '৭ অক্ষরে ৬২^৭, প্রায় ৩.৫ লক্ষ কোটি। দশ বছরে ৩৬৫০ কোটি URL ধরলেও অনেক জায়গা বাঁচে। তাই বইয়ের ধারণা ৭ অক্ষরের code।' },

    { kind: 'h', text: 'Code বানানোর দুই পথ' },
    { kind: 'table', head: ['', 'Hash করে কেটে নেওয়া', 'Counter, তারপর base 62'], rows: [
      ['কীভাবে', 'লম্বা URL-এর hash (CRC32, MD5…) থেকে প্রথম ৭ অক্ষর', 'প্রতি URL-এ একটা অনন্য সংখ্যা, সেটাকে base 62-তে বদলে লেখা'],
      ['দৈর্ঘ্য', 'স্থির (৭)', 'সংখ্যা বাড়লে ধীরে লম্বা হয়'],
      ['Collision', 'হয়: দুই আলাদা URL-এ একই ৭ অক্ষর। তখন URL-এর শেষে কিছু জুড়ে আবার hash, ফাঁকা না পাওয়া পর্যন্ত', 'হয় না: প্রতিটা সংখ্যা আলাদা'],
      ['ভিড় বাড়লে', 'প্রতিটা নতুন URL-এ database দেখে নেওয়া (বা Bloom filter) লাগে', 'দরকার অনন্য সংখ্যা বিলি: v1-7 (Snowflake-ধাঁচ)'],
      ['অনুমান', 'কঠিন (hash থেকে বোঝা যায় না)', 'সহজ: সংখ্যা ধরে ধরে অনুমান করা যায় পরের code'],
    ] },
    { kind: 'p', text: 'একই URL-এ কি বারবার নতুন code বানাবেন? নির্ভর করে দরকারের উপর। Analytics-এ প্রতিটা link আলাদা মাপতে চাইলে প্রতিবার নতুন। Space বাঁচাতে চাইলে আগের code ফেরত।' },

    { kind: 'h', text: 'Redirect: ছোট থেকে লম্বায়' },
    { kind: 'seq', label: 'কেউ SMS-এর ছোট link-এ চাপল', actors: ['Browser', 'Load balancer', 'Server', 'Cache', 'Database'], steps: [
      { from: 0, to: 1, msg: 'GET pgo.to/Zn8Q3x2' },
      { from: 1, to: 2, msg: 'কোনো server-এ পাঠাও' },
      { from: 2, to: 3, msg: 'Zn8Q3x2-র লম্বা URL?', note: 'পড়া অনেক বেশি, আর একই popular link বারবার: cache-এ বেশিরভাগ মেলে।' },
      { from: 3, to: 2, msg: 'মিলেছে (hit)', tone: 'ok' },
      { from: 2, to: 0, msg: '301 বা 302 + Location: লম্বা URL', tone: 'ok', note: 'Browser এবার লম্বা URL-এ নিজেই চলে যায়।' },
      { from: 2, to: 4, msg: 'Cache-এ না মিললে: database-এ খুঁজে cache-এ বসাও', note: 'Miss হলে। পরেরবার hit।' },
    ] },
    { kind: 'table', head: ['', '301 (স্থায়ী)', '302 (সাময়িক)'], rows: [
      ['Browser কী করে', 'মনে রাখে, পরেরবার আমাদের server ছুঁয়ে না গিয়ে সরাসরি লম্বা URL-এ', 'প্রতিবার আমাদের server হয়ে যায়'],
      ['Server-এর চাপ', 'কম', 'বেশি'],
      ['Click গোনা', 'প্রথমবারের পর আমরা জানতেই পারি না', 'প্রতিটা click ধরা যায়'],
      ['কখন', 'Analytics লাগে না, চাপ কমানো দরকার', 'Analytics, A/B test, link পরে বদলানোর দরকার'],
    ] },

    { kind: 'h', text: 'সার্বিক নকশা' },
    { kind: 'flow', label: 'ছোট করা (নীল) আর খোলা (সবুজ, বেশি): দুটো আলাদা পথ, আলাদাভাবে বড় করা যায়', nodes: [
      { id: 'u', label: 'User', x: 8, y: 17 },
      { id: 'lb', label: 'Load balancer', x: 32, y: 17, w: 22 },
      { id: 'w', label: 'Shorten server', sub: 'লেখা কম', x: 62, y: 6, w: 22 },
      { id: 'r', label: 'Redirect server', sub: 'পড়া বেশি', x: 62, y: 28, w: 22 },
      { id: 'c', label: 'Cache', x: 90, y: 28 },
      { id: 'db', label: 'Database', x: 90, y: 8 },
    ], links: [
      { from: 'u', to: 'lb', rate: 5 },
      { from: 'lb', to: 'w', rate: 1, color: '#2f7de1' },
      { from: 'lb', to: 'r', rate: 4 },
      { from: 'w', to: 'db', rate: 1, color: '#2f7de1' },
      { from: 'r', to: 'c', rate: 4 },
    ], h: 36 },
    { kind: 'list', items: [
      'Database: shortCode (key), লম্বা URL, তৈরির সময়। Key-value store-এর মতো পড়ে: key দিয়ে মান।',
      'Cache: গরম code-গুলো memory-তে। Redirect-এর ৯০% এখানেই শেষ।',
      'Rate limiter (v1-4): একজন যেন লক্ষ লক্ষ code বানিয়ে ভরে না ফেলে।',
      'মেয়াদ: কিছু link একসময় মরে। পুরোনোগুলো পরে মুছে code ফেরত আনা যায়।',
      'ক্ষতিকর link: ফিশিং-এর জন্য ছোট link-কে আড়াল হিসেবে ব্যবহার হয়; বানানোর সময় আর খোলার সময় দুই জায়গায় যাচাইয়ের কথা বলুন।',
    ] },

    { kind: 'story', title: 'SMS-এ link কাটা পড়ল', steps: [
      'ParcelGo delivery SMS-এ পুরো tracking link পাঠাত: ১৪০ অক্ষরের।',
      'SMS-এর দুটো ভাগ হয়ে গেল, দাম দ্বিগুণ, আর মাঝখানে link কাটা পড়ে অনেকের খুলতেই পারল না।',
      'ছোট link-এ গেল ৭ অক্ষরের code, SMS এক ভাগে, কেউ আর কাটা link পেল না।',
    ], fix: 'ছোট link আর 302 redirect (click গোনার জন্য)। Link-এ কখনো ব্যক্তিগত তথ্য নয়: কেউ code অনুমান করলে অন্যের parcel দেখে ফেলবে, তাই code হোক অনুমান-অযোগ্য।' },

    { kind: 'mistakes', items: [
      'Code ৭ অক্ষর কেন, হিসাব না করে বলা।',
      'Hash কেটে collision এর কথা না ভাবা।',
      'সব redirect database ছুঁয়ে করা: cache ছাড়া।',
      '301 দিয়ে analytics গোনার আশা করা।',
      'ক্রমিক counter থেকে code বানিয়ে অন্যের link অনুমান করা সহজ করে দেওয়া।',
    ] },
    { kind: 'check', items: [
      { q: '৭ অক্ষরের base 62 code কত URL ধরে?', a: '৬২^৭, প্রায় ৩.৫ লক্ষ কোটি। দশ বছর ধরে দিনে ১০ কোটি করে বানালেও (৩৬৫০ কোটি) বহু গুণ জায়গা বাকি।' },
      { q: 'Hash কেটে নেওয়া আর counter-এর মধ্যে মূল ফারাক?', a: 'Hash কাটলে দুই URL-এ একই code হতে পারে (collision), তাই database দেখে নিতে হয়। Counter-এ প্রতিটা সংখ্যা আলাদা, collision নেই, কিন্তু অনুমান করা সহজ।' },
      { q: 'Click গুনতে 301 না 302?', a: '302। 301 browser মনে রাখে, পরের click আমাদের server ছোঁয় না।' },
      { q: 'Redirect দ্রুত রাখতে কী করবেন?', a: 'Cache-এ গরম code রাখা, read replica, আর redirect server আলাদা করে scale করা।' },
    ] },
  ],
};
