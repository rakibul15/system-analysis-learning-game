import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 11 (Design A News Feed System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-11',
  goals: [
    'Feed-এর দুই কাজ (post প্রকাশ, feed বানানো) আলাদা করে বলতে পারবেন।',
    'Fanout on write আর fanout on read: প্রতিটার লাভ-ক্ষতি, আর কেন বেশিরভাগ system দুটো মেশায় বলতে পারবেন।',
    'Celebrity-র সমস্যা সংখ্যায় দেখাতে পারবেন, আর কোথায় সীমা টানবেন বলতে পারবেন।',
  ],
  related: ['caching', 'sharding'],
  blocks: [
    { kind: 'p', text: 'News feed হলো সেই পাতা যা খুললেই সদ্য আসা post সাজানো দেখা যায়: Facebook-এর home, Instagram-এর feed, X-এর timeline। ParcelGo-র উদাহরণ: merchant-দের একটা "জানাশোনা" feed, যেখানে যাদের follow করেন তাদের নতুন পণ্য আর অফার দেখা যায়। দুটো কাজ: নতুন post প্রকাশ (feed publishing), আর কারও feed বানানো (feed building)।' },
    { kind: 'list', items: [
      'Feed-এ কী কী: লেখা, ছবি, video। User অনেক লোককে follow করেন।',
      'ক্রম: নতুনগুলো আগে (সরল সংস্করণ)।',
      'দ্রুত: feed খুলতে অপেক্ষা নয়।',
      'পরিসর: ১০ কোটি active user, প্রতি user-এর শতাধিক বন্ধু ধরুন।',
    ] },

    { kind: 'h', text: 'দুই কাজ, দুই পথ' },
    { kind: 'seq', label: 'Feed publishing: একটা post-এর যাত্রা', actors: ['Merchant', 'Post service', 'Fanout worker', 'Feed cache'], steps: [
      { from: 0, to: 1, msg: 'নতুন post: "সেল চলছে"' },
      { from: 1, to: 1, msg: 'Post database আর post cache-এ রাখো', note: 'Post আসল জায়গায় একবারই থাকে।' },
      { from: 1, to: 2, msg: 'Fanout-এর কাজ queue-তে দাও', note: 'Queue দিয়ে async: merchant-কে অপেক্ষা করাতে হয় না।' },
      { from: 2, to: 3, msg: 'প্রতিটা follower-এর feed-এ post-এর ID বসাও', tone: 'ok', note: 'পুরো post নয়, শুধু ID: জায়গা বাঁচে।' },
    ] },
    { kind: 'seq', label: 'Feed building: কেউ feed খুলল', actors: ['User', 'Feed service', 'Feed cache', 'Post cache'], steps: [
      { from: 0, to: 1, msg: 'আমার feed দাও' },
      { from: 1, to: 2, msg: 'আমার feed-এর post ID-র তালিকা' },
      { from: 2, to: 1, msg: '[৯১, ৮৭, ৮২, …]', tone: 'ok' },
      { from: 1, to: 3, msg: 'এই ID-গুলোর post, লেখক, ছবি আনো', note: 'ID থেকে পুরো তথ্য জোড়া লাগে (hydrate)। User আর media-ও আলাদা cache থেকে।' },
      { from: 1, to: 0, msg: 'পুরো feed', tone: 'ok' },
    ] },

    { kind: 'h', text: 'Fanout: দুই উপায়' },
    { kind: 'p', text: 'Fanout মানে একজনের post অনেকের কাছে ছড়িয়ে দেওয়া। কখন ছড়াবেন তার দুটো উত্তর।' },
    { kind: 'table', head: ['', 'Write-এ ছড়ানো (push)', 'Read-এ জোড়া (pull)'], rows: [
      ['কখন', 'Post করার মুহূর্তেই সব follower-এর feed আগে থেকে বানিয়ে রাখা', 'Feed খোলার সময় যাদের follow করেন তাদের নতুন post তুলে জোড়া'],
      ['Feed খোলা', 'দ্রুত: আগেই বানানো', 'ধীর: তখনই বানাতে হয়'],
      ['Post করা', 'ধীর (বহু feed লেখা), যার follower অনেক তার জন্য আরও', 'দ্রুত, শুধু একবার লেখা'],
      ['Celebrity-র সমস্যা', 'হ্যাঁ: ১০ লাখ follower মানে ১০ লাখ লেখা', 'নেই'],
      ['নিষ্ক্রিয় user-এর জন্য নষ্ট কাজ', 'হ্যাঁ: যারা কখনো খোলেই না তাদের feed-ও বানানো', 'না: যে খোলে শুধু তার জন্য'],
    ] },
    { kind: 'calc', label: 'একটা post করলে কত কাজ', inputs: [
      { id: 'f', label: 'Follower', min: 10, max: 10_000_000, step: 10, value: 500 },
      { id: 'act', label: 'কতজন নিয়মিত খোলে', min: 5, max: 100, step: 5, value: 30, unit: '%' },
      { id: 'ms', label: 'একটা feed-এ লিখতে', min: 1, max: 10, step: 1, value: 2, unit: 'ms' },
    ], out: (v) => {
      const writes = v.f!;
      const sec = (writes * v.ms!) / 1000;
      const wasted = Math.round(writes * (1 - v.act! / 100));
      return [
        { label: 'Write-এ ছড়ালে লেখা', value: num(writes), how: 'প্রতি follower-এর feed-এ একটা' },
        { label: 'একজন worker-এর কত সময়', value: sec < 60 ? `${num(Math.round(sec))} সেকেন্ড` : `${num(Math.round(sec / 60))} মিনিট`, how: `${num(writes)} × ${num(v.ms!)} ms`, tone: sec > 30 ? 'bad' : 'ok', bar: Math.min(1, sec / 600) },
        { label: 'যারা খোলেই না, তাদের জন্য নষ্ট', value: num(wasted), how: `${num(100 - v.act!)}% follower`, tone: wasted > 100 ? 'bad' : undefined },
        { label: 'Read-এ জোড়ালে', value: 'post-এর সময় ১টাই লেখা', how: 'খরচ feed খোলার সময়ে, প্রতিবারে' },
      ];
    } },
    { kind: 'tip', title: 'Celebrity-র সমস্যা (hotkey)', text: 'যার ১০ লাখ follower, তার প্রতিটা post লাখ লাখ feed-এ লেখার ঝড় তোলে। আবার feed খোলার সময় সবার জন্য জোড়া বেশি ধীর। কোনো এক পথ দিয়ে দুই দিকই ঠিক হয় না।' },

    { kind: 'h', text: 'বাস্তব সমাধান: মিশিয়ে নেওয়া' },
    { kind: 'p', text: 'বেশিরভাগ system দুটোই মেশায়। সাধারণ user (কম follower): write-এ ছড়ানো, কারণ সহজ আর feed খোলা দ্রুত। Celebrity বা অতি জনপ্রিয় লেখক: write-এ ছড়ানো বন্ধ, আর feed খোলার সময় তাদের নতুন post টেনে জোড়া। একটা সীমা (যেমন follower সংখ্যা) ঠিক করে সীমার উপরে pull।' },
    { kind: 'flow', label: 'মেশানো পথ: সাধারণ merchant (সবুজ) feed-এ আগে থেকে পৌঁছায়; celebrity (লাল) পড়ার সময় জোড়া লাগে', nodes: [
      { id: 'n', label: 'সাধারণ merchant', x: 12, y: 7, w: 20 },
      { id: 'c', label: 'Celebrity', sub: '১০ লাখ follower', x: 12, y: 28, w: 20, tone: 'hot' },
      { id: 'fo', label: 'Fanout (push)', x: 44, y: 7, w: 20 },
      { id: 'fc', label: 'Feed cache', x: 74, y: 7, w: 20 },
      { id: 'pc', label: 'Post store', x: 44, y: 28, w: 20 },
      { id: 'u', label: 'User-এর feed', x: 90, y: 28, w: 20 },
    ], links: [
      { from: 'n', to: 'fo', rate: 2.5 },
      { from: 'fo', to: 'fc', rate: 2.5 },
      { from: 'fc', to: 'u', rate: 2 },
      { from: 'c', to: 'pc', rate: 1.5, color: '#e5484d' },
      { from: 'pc', to: 'u', rate: 1.5, color: '#e5484d' },
    ], h: 36 },
    { kind: 'list', items: [
      'Feed cache শুধু ID রাখে, তাও সর্বশেষ কয়েক শো। Post, user আর media-র জন্য আলাদা আলাদা cache।',
      'কত গভীরে দেখবে: বেশিরভাগ user প্রথম কয়েক শোর বেশি দেখে না; তাই cache-এ সীমা।',
      'Follower গ্রাফ আর কার post দেখব: social graph আলাদা store-এ (database বা graph DB)।',
      'Celebrity feed জোড়ার সময় ধীর হলে সেটাও cache করা (কয়েক মিনিট)।',
    ] },

    { kind: 'h', text: 'আরও যা ভাবার' },
    { kind: 'table', head: ['বিষয়', 'ভাবনা'], rows: [
      ['স্তর', 'Web, post, fanout, feed, social graph, আর cache: প্রতিটাকে আলাদা করে বাড়ানো যায়'],
      ['Database', 'পড়া অনেক: read replica; লেখা বেশি: ভাগ (sharding)'],
      ['Stateless web', 'Session user-এর কাছে বা cache-এ, server-এ নয়'],
      ['Queue', 'Fanout-কে post করার পথ থেকে আলাদা: merchant অপেক্ষা করে না'],
      ['Cache-এর স্তর', 'Feed, post, user, follower, action (like, comment), count: প্রতিটা আলাদা'],
      ['ক্রম', 'সময় ধরে সরল; শিখলে ranking (কে কতটা আগ্রহী) যোগ হয়'],
    ] },

    { kind: 'story', title: 'বড় merchant post করলেই সব ধীর', steps: [
      'ParcelGo-র সবচেয়ে বড় merchant-এর ২ লাখ follower। সে post করলে ২ লাখ feed-এ লেখা।',
      'ওই মিনিটে অন্য সবার post-এর fanout-ও ওই লম্বা queue-র পেছনে আটকে গেল।',
      'সবার feed-এ নতুন post আসতে ১০ মিনিট দেরি।',
    ], fix: 'ধনী লেখকের জন্য সীমার উপরে push বন্ধ: তার post পড়ার সময় জোড়া লাগে। আর fanout worker-দের আলাদা, লেখক-ভেদে ভিড় ছড়ানো।' },

    { kind: 'mistakes', items: [
      'একটা post-এর পুরো কপি প্রতি follower-এর feed-এ রাখা (শুধু ID রাখলেই চলে)।',
      'সব লেখকের জন্য একই পথ: celebrity বা নিষ্ক্রিয় user-এর সমস্যা উপেক্ষা।',
      'Post করার সময় সব follower-এর feed লেখা শেষ হওয়া পর্যন্ত merchant-কে অপেক্ষা করানো।',
      'Feed cache-এ সীমা না দেওয়া।',
    ] },
    { kind: 'check', items: [
      { q: 'Feed-এর দুই কাজ কী কী?', a: 'Feed publishing (নতুন post প্রকাশ আর ছড়ানো) আর feed building (কারও feed বানিয়ে দেখানো)।' },
      { q: 'Write-এ ছড়ানোর সুবিধা-অসুবিধা?', a: 'সুবিধা: feed খোলা দ্রুত, আগেই বানানো। অসুবিধা: follower অনেক হলে post করা ধীর, আর যারা খোলেই না তাদের জন্যও কাজ।' },
      { q: 'Celebrity-র সমস্যা কীভাবে সামলান?', a: 'সীমা (follower সংখ্যা) ঠিক করে তার উপরের লেখকদের জন্য push বন্ধ; feed খোলার সময় তাদের নতুন post টেনে জুড়ে নেওয়া।' },
      { q: 'Feed cache-এ কী রাখেন?', a: 'শুধু post ID-র তালিকা, সর্বশেষ কয়েক শো। পুরো post আলাদা post cache-এ, আর ID থেকে জুড়ে নেওয়া হয়।' },
    ] },
  ],
};
