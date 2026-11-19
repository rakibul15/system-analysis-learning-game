import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 2 (Nearby Friends), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-2',
  goals: [
    'কেন এখানে request-response নয়, চলমান সংযোগ (WebSocket) আর publish-subscribe লাগে বলতে পারবেন।',
    'একজনের location বদল থেকে কতগুলো বার্তা তৈরি হয় (fanout) হিসাব করতে পারবেন।',
    'প্রতি user-এর জন্য একটা channel-এর ধারণা, আর কেন location cache মেয়াদি (TTL) বলতে পারবেন।',
  ],
  related: ['streams', 'caching', 'sharding'],
  blocks: [
    { kind: 'p', text: 'Nearby friends: যারা অনুমতি দিয়েছে, তাদের বন্ধুদের মধ্যে কে এখন কাছে আছে তা তালিকায় দেখা, আর তারা সরলে তালিকা আপনা-আপনি বদলায়। ParcelGo-র উদাহরণ: rider-রা নিজেদের মধ্যে কে কাছে আছে দেখে, যাতে কাছাকাছি delivery ভাগ করে নিতে পারে। আগের অধ্যায়ের (কাছের দোকান) সাথে বড় ফারাক: দোকান নড়ে না, মানুষ নড়ে, ক্রমাগত।' },
    { kind: 'list', items: [
      'কাছের মানে নির্দিষ্ট ব্যাসার্ধের ভেতর (ধরুন ৫ মাইল); বন্ধুর সংখ্যা সর্বোচ্চ কয়েক শো।',
      'Location প্রায় সাথে সাথে বদলে যায়: কয়েক সেকেন্ডের পুরোনো হলে চলে।',
      'পুরোনো location জমিয়ে রাখা বিকল্প: user যদি অফলাইন, সে কাছে নয়।',
      'পরিসর: ১০ কোটি user, ১ কোটি একসাথে online।',
    ] },

    { kind: 'h', text: 'কেন সাধারণ পথ চলে না' },
    { kind: 'p', text: 'সরল পথ: প্রতি ৩০ সেকেন্ডে সবাই নিজের location server-এ পাঠায়, আর server সব বন্ধুর location ধরে দেখে কে কাছে। Server-এ ছোট ভিড় হলেও এখানে শত শত বন্ধু, লক্ষ লক্ষ user। আর অন্যদের সরলে আমি জানব কীভাবে? Server আমাকে ডেকে বলতে পারে না, আমাকেই বারবার জিজ্ঞেস করতে হয় (polling)।' },
    { kind: 'calc', label: 'অনুমান: কত বার্তা', inputs: [
      { id: 'on', label: 'একসাথে online', min: 1, max: 50, step: 1, value: 10, unit: 'M' },
      { id: 'iv', label: 'কত সেকেন্ডে location পাঠায়', min: 5, max: 120, step: 5, value: 30 },
      { id: 'fr', label: 'বন্ধু, যারা এখন online', min: 1, max: 400, step: 1, value: 40 },
      { id: 'near', label: 'বন্ধুদের কতজন কাছে (ব্যাসার্ধে)', min: 1, max: 100, step: 1, value: 10, unit: '%' },
    ], out: (v) => {
      const qps = (v.on! * 1e6) / v.iv!;
      const fanAll = qps * v.fr!;
      const fanNear = fanAll * (v.near! / 100);
      return [
        { label: 'Location বদল প্রতি সেকেন্ডে', value: num(Math.round(qps)), how: `${num(v.on!)}M ÷ ${num(v.iv!)} সেকেন্ড`, bar: Math.min(1, qps / 1_000_000) },
        { label: 'প্রতিটা সব online বন্ধুকে পাঠালে', value: num(Math.round(fanAll)), how: `× ${num(v.fr!)} বন্ধু`, tone: 'bad', bar: Math.min(1, fanAll / 50_000_000) },
        { label: 'শুধু কাছের বন্ধুকে (ছেঁকে)', value: num(Math.round(fanNear)), how: `${num(v.near!)}% বন্ধু`, tone: 'ok', bar: Math.min(1, fanNear / 50_000_000) },
      ];
    } },
    { kind: 'tip', title: 'কাজ ঠিক জায়গায় ভাগ করুন', text: 'সব বন্ধুকে সবসময় পাঠানো হয় না। প্রতিটা প্রাপক নিজে ঠিক করে "এই বন্ধু আমার ব্যাসার্ধে কি না": ছেঁকে ফেলার কাজটা প্রাপকের দিকে। ব্যাসার্ধের বাইরের বন্ধুর location সে ফেলে দেয়, তাই ফোনে শুধু দরকারিগুলো পৌঁছায়।' },

    { kind: 'h', text: 'নকশা: WebSocket আর প্রতি user-এর channel' },
    { kind: 'p', text: 'প্রতিটা user-এর সাথে চলমান সংযোগ (WebSocket): সে location পাঠায় এই পথে, আর বন্ধুদের location-ও পায় এই পথেই। মাঝখানে একটা publish-subscribe (pub/sub) ব্যবস্থা, যেমন Redis pub/sub। প্রতিটা user-এর একটা নিজের channel। বন্ধুরা সেই channel-এ subscribe করে।' },
    { kind: 'seq', label: 'রিয়া সরল: তার বন্ধুরা কীভাবে জানে', actors: ['রিয়ার ফোন', 'WebSocket server', 'Location cache', 'Pub/sub: রিয়ার channel', 'করিমের server'], steps: [
      { from: 0, to: 1, msg: 'নতুন location (23.78, 90.40)' },
      { from: 1, to: 2, msg: 'রিয়ার location রাখো (মেয়াদ ৩০ সেকেন্ড)', note: 'Cache-এ শুধু শেষ জানা location, আর মেয়াদ (TTL)। অফলাইন হলে মেয়াদ ফুরায়, আর সে "নেই"।' },
      { from: 1, to: 3, msg: 'রিয়ার channel-এ প্রকাশ করো', tone: 'ok' },
      { from: 3, to: 4, msg: 'যারা subscribe করেছে (করিমের server)', note: 'করিম ফোনে app খুলেছে, তার server রিয়ার channel-এ subscribe করে রেখেছে।' },
      { from: 4, to: 4, msg: 'করিমের location আর রিয়ার location-এর দূরত্ব দেখো', note: 'ব্যাসার্ধের বাইরে হলে ফেলে।' },
      { from: 4, to: 0, msg: 'কাছে হলে করিমের ফোনে "রিয়া ২ মাইলে"', tone: 'ok' },
    ] },
    { kind: 'flow', label: 'প্রতি user-এর channel: বন্ধুরা ওই channel-এ subscribe, location এলে সবার কাছে একসাথে', nodes: [
      { id: 'r', label: 'রিয়া', sub: 'location পাঠায়', x: 10, y: 17 },
      { id: 'ch', label: 'রিয়ার channel', sub: 'pub/sub', x: 42, y: 17, w: 22 },
      { id: 'k', label: 'করিম', x: 88, y: 5 },
      { id: 'm', label: 'মিতা', x: 88, y: 17 },
      { id: 'l', label: 'লিপি', sub: 'দূরে, ফেলবে', x: 88, y: 29, tone: 'cold' },
    ], links: [
      { from: 'r', to: 'ch', rate: 2 },
      { from: 'ch', to: 'k', rate: 2 },
      { from: 'ch', to: 'm', rate: 2 },
      { from: 'ch', to: 'l', rate: 2, drop: 1 },
    ], h: 34 },
    { kind: 'list', items: [
      'Cache: location history database-এ আলাদা (ধীরে, পরে বিশ্লেষণের জন্য); চলতি location Redis-এ, মেয়াদ সহ।',
      'নতুন সংযোগে: করিম app খুললে সব বন্ধুর শেষ জানা location cache থেকে এনে আগে তালিকা বানায়, তারপর channel-এ subscribe।',
      'Server মরলে: user আবার অন্য server-এ জোড়ে, আর channel-এ আবার subscribe। Cache-এ তার location মেয়াদ থাকতেই থাকে।',
    ] },

    { kind: 'h', text: 'বড় করা' },
    { kind: 'list', items: [
      'WebSocket server: stateful (সংযোগ ধরে রাখে)। প্রতি server-এ প্রায় ১০ হাজার সংযোগ ধরলে ১ কোটি online-এ হাজারখানেক server।',
      'Pub/sub-ও ভাগ হয়: প্রতি channel যেকোনো একটা Redis node-এ। consistent hashing (v1-5) দিয়ে। Channel সংখ্যা কয়েক কোটি, সব একটা machine-এ ধরে না।',
      'Server বাড়ানো-কমানো: stateless নয়, তাই ধীরে ধীরে সংযোগ সরিয়ে (draining)।',
      'Channel সংখ্যা বিশাল হলেও খরচ কম: কেউ subscribe না করলে channel-এর কোনো খরচ নেই।',
      'Redis-এর জায়গায় অন্য: Kafka-ও হতে পারে, কিন্তু channel সংখ্যা কোটি হলে Redis pub/sub বেশি সহজ।',
    ] },

    { kind: 'h', text: 'বন্ধু ছাড়া কাছের মানুষ' },
    { kind: 'p', text: 'বন্ধু-তালিকা সীমিত (কয়েক শো), তাই fanout নিয়ন্ত্রণে। বন্ধু না হয়ে "কাছের যে কেউ" দেখাতে গেলে প্রশ্ন বদলে যায়: তখন geohash ধরে এলাকার channel (v2-1)। বইয়ে এটা বাড়তি আলোচনা: প্রতিটা geohash ঘরের একটা channel, ঘরে ঢুকলে subscribe।' },
    { kind: 'seq', label: 'করিম দূর থেকে কাছে এল: কখন "কাছে" বলে', actors: ['করিমের server', 'Cache', 'রিয়ার channel'], steps: [
      { from: 0, to: 2, msg: 'subscribe: রিয়ার channel' },
      { from: 2, to: 0, msg: 'রিয়ার নতুন location: ১২ মাইল দূরে' },
      { from: 0, to: 0, msg: 'ব্যাসার্ধের বাইরে: ফেলে দাও', tone: 'ok' },
      { from: 2, to: 0, msg: 'রিয়ার নতুন location: ৪ মাইল দূরে' },
      { from: 0, to: 0, msg: 'ব্যাসার্ধে ঢুকেছে!', tone: 'ok', note: 'এবার করিমের ফোনে তালিকায় যোগ।' },
    ] },

    { kind: 'story', title: 'সবাই সবাইকে location পাঠাল', steps: [
      'প্রথম নকশায় server প্রতি পাঁচ সেকেন্ডে সব বন্ধুকে সবার location পাঠাত, দূর-কাছ না দেখেই।',
      'কয়েক হাজার rider একসাথে online হতেই বার্তার সংখ্যা কোটি ছাড়াল।',
      'Server আর ফোন দুটোতেই ভিড়; ব্যাটারি ঘণ্টায় ১০% নামল।',
    ], fix: 'প্রাপকের দিকে ছেঁকে ফেলা (ব্যাসার্ধের বাইরে হলে বার্তা ফেলে), location পাঠানোর ব্যবধান বাড়ানো, আর যে app খোলা নেই তার জন্য পাঠানো বন্ধ।' },

    { kind: 'mistakes', items: [
      'Location-এর জন্য HTTP polling: বারবার "কিছু বদলেছে?"।',
      'চলতি location আর পুরোনো history একই database-এ।',
      'Location cache-এ মেয়াদ না দেওয়া: অফলাইন user চিরকাল কাছে থাকে।',
      'Pub/sub এক machine-এ ঠেসে রাখা।',
    ] },
    { kind: 'check', items: [
      { q: 'কেন request-response নয়, WebSocket?', a: 'অন্যদের সরার খবর server-কে নিজে থেকে আমাকে জানাতে হয়; polling-এ বেশিরভাগ প্রশ্ন বৃথা আর দেরিও।' },
      { q: 'Pub/sub-এ প্রতি user-এর channel মানে কী?', a: 'প্রতিটা user-এর একটা channel। সে location প্রকাশ করে, তার বন্ধুরা সেই channel-এ subscribe করে। এতে একটা location সব বন্ধুর কাছে একসাথে পৌঁছায়।' },
      { q: 'Location cache-এ মেয়াদ কেন?', a: 'User অফলাইন হলে মেয়াদ ফুরিয়ে যায়, আর সে আর কাছের তালিকায় থাকে না: আলাদা "offline" বার্তা ছাড়াই।' },
      { q: 'বন্ধুদের location ফেলার কাজ কোথায় হয়?', a: 'প্রাপকের server-এ: সে নিজের location আর এসে পড়া location-এর দূরত্ব দেখে ব্যাসার্ধের বাইরে হলে ফেলে।' },
    ] },
  ],
};
