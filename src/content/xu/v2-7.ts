import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 7 (Hotel Reservation System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-7',
  goals: [
    'কেন বুকিং system-এর আসল কঠিন অংশ ভিড় নয়, একই ঘর দুজনকে না দেওয়া (concurrency), বলতে পারবেন।',
    'Pessimistic lock, optimistic lock আর database constraint: তিনটার তুলনা করে বলতে পারবেন কখন কোনটা।',
    'Idempotency key দিয়ে ডবল বুকিং (double click, retry) কীভাবে ঠেকান বলতে পারবেন।',
  ],
  related: ['transactions', 'replication'],
  blocks: [
    { kind: 'p', text: 'Hotel বুকিং: user শহর আর তারিখ দিয়ে খোঁজে, হোটেল আর ঘরের ধরন বেছে নেয়, বুকিং করে। আগের অধ্যায়গুলোর তুলনায় ভিড় মাঝারি: প্রতি সেকেন্ডে কয়েক হাজার নয়, কয়েক শো। কিন্তু একটা ভুল অসহ্য: একই ঘর দুজনকে দেওয়া। ParcelGo-র উদাহরণ: ঈদের ডেলিভারিতে hub-এর সীমিত "delivery slot" বুকিং: একটা slot একজন merchant-কে।' },
    { kind: 'list', items: [
      'হোটেল, ঘরের ধরন (single, double), তারিখ-ভিত্তিক খালি ঘর।',
      'বুকিং, বাতিল, আর সামান্য অতিরিক্ত বুকিং (overbooking) অনুমোদিত: বাতিল হবেই ধরে।',
      'একই ঘর দুজনকে নয়; একই user-এর বারবার ক্লিকে একাধিক বুকিং নয়।',
      'পরিসর: ৫০০০ হোটেল, ১০ লাখ ঘর; ৭০% ভরা, গড় থাকা ৩ রাত।',
    ] },
    { kind: 'calc', label: 'অনুমান: ভিড় কেমন', inputs: [
      { id: 'rooms', label: 'মোট ঘর', min: 100000, max: 5_000_000, step: 100000, value: 1_000_000 },
      { id: 'occ', label: 'ভরা', min: 10, max: 100, step: 5, value: 70, unit: '%' },
      { id: 'stay', label: 'গড় রাত', min: 1, max: 10, step: 1, value: 3 },
      { id: 'fun', label: 'বুকিং-পাতায় যারা শেষ পর্যন্ত কেনে', min: 1, max: 30, step: 1, value: 10, unit: '%' },
    ], out: (v) => {
      const perDay = (v.rooms! * (v.occ! / 100)) / v.stay!;
      const tps = perDay / 86400;
      const view = tps / (v.fun! / 100);
      return [
        { label: 'দিনে বুকিং', value: num(Math.round(perDay)), how: `${num(v.rooms!)} × ${num(v.occ!)}% ÷ ${num(v.stay!)} রাত` },
        { label: 'বুকিং প্রতি সেকেন্ডে (TPS)', value: num(Math.round(tps * 10) / 10), how: 'অনেক কম: লেখা কম', tone: 'ok' },
        { label: 'ঘর দেখা প্রতি সেকেন্ডে (QPS)', value: num(Math.round(view)), how: `বুকিং ÷ ${num(v.fun!)}%: পড়া অনেক বেশি`, bar: Math.min(1, view / 1000) },
      ];
    } },
    { kind: 'tip', title: 'ভিড় কম, ঝুঁকি বেশি', text: 'এই system-এর সীমা প্রতি সেকেন্ডে কত request নয়, বরং ঠিকঠাক থাকা। তাই এখানে সাধারণ relational database (ACID) আর transaction-ই সেরা পছন্দ, NoSQL নয়।' },

    { kind: 'h', text: 'ডেটা: ঘর নয়, তারিখ-ধরে ঘরের ভাণ্ডার' },
    { kind: 'p', text: 'একটা নির্দিষ্ট ঘর (রুম ৩০২) বুক করার পরিবর্তে বেশিরভাগ system ঘরের ধরন বুক করে (ডাবল রুম, ১২ জুন)। প্রতিটা হোটেল, ঘরের ধরন আর রাতের জন্য একটা সারি: মোট ঘর কত, বুক হয়েছে কত। নতুন বুকিং এই সংখ্যা বাড়ায়। সীমা পেরোলে আর নয়।' },
    { kind: 'table', head: ['হোটেল', 'ধরন', 'রাত', 'মোট ঘর', 'বুক হয়েছে'], rows: [
      ['সোনারগাঁও', 'ডাবল', '১২ জুন', '১০০', '৯৯'],
      ['সোনারগাঁও', 'ডাবল', '১৩ জুন', '১০০', '৬২'],
      ['সোনারগাঁও', 'ডাবল', '১৪ জুন', '১০০', '১০০'],
    ] },
    { kind: 'list', items: [
      'দুই রাতের বুকিং ১২–১৪ জুন (১২ আর ১৩ রাত): দুটো সারিই বাড়াতে হবে, একসাথে: transaction।',
      'ঘর খালি আছে কিনা: প্রতি রাতে বুক হয়েছে < মোট ঘর, প্রতিটা রাতেই।',
      'Overbooking: ধরে নেওয়া কেউ কেউ বাতিল করবে, তাই সীমা ১১০%। সীমা একটা সংখ্যা, কোডে নয়, ডেটায়: বদলানো সহজ।',
    ] },

    { kind: 'h', text: 'ডবল বুকিংয়ের দুই রূপ' },
    { kind: 'p', text: 'এক: একই user দুবার চাপল (ধীর network, আবার চাপ)। দুই: দুই user একই শেষ ঘরের জন্য একসাথে। দুটোর সমাধান আলাদা।' },

    { kind: 'h', text: 'এক user, দুই ক্লিক: idempotency' },
    { kind: 'seq', label: 'দুবার ক্লিকেও বুকিং একটা: একই "বুকিং-ছাপ" (idempotency key)', actors: ['Browser', 'Booking service', 'Database'], steps: [
      { from: 0, to: 0, msg: 'পাতা খুলতেই একটা অনন্য reservation ID বানাল', note: 'ID-টা পাতা খোলার সময়, "বুক করুন" বোতামের আগে। প্রতিটা চেষ্টায় একই ID।' },
      { from: 0, to: 1, msg: 'বুক করো (reservation ID: R-77)' },
      { from: 1, to: 2, msg: 'R-77 সারি লেখো', tone: 'ok', note: 'reservation ID-র উপর unique constraint।' },
      { from: 0, to: 1, msg: 'আবার চাপ: বুক করো (R-77)', tone: 'bad', note: 'ধীর network, user ধৈর্য হারাল।' },
      { from: 1, to: 2, msg: 'R-77 লেখো', tone: 'bad' },
      { from: 2, to: 1, msg: 'ভুল: R-77 আগেই আছে (unique ভেঙেছে)', tone: 'bad' },
      { from: 1, to: 0, msg: 'আগের বুকিংয়ের ফলই ফেরত দাও', tone: 'ok', note: 'দ্বিতীয়বার নতুন বুকিং হয়নি; user দুবার পায়নি।' },
    ] },

    { kind: 'h', text: 'দুই user, শেষ ঘর: concurrency' },
    { kind: 'p', text: 'একটা ঘর বাকি। রিয়া আর করিম একসাথে বুক করছে। দুজনেই দেখল "বাকি আছে ১"। দুজনেই সংখ্যা বাড়াতে গেল। কী হয়?' },
    { kind: 'seq', label: 'রেস: দুজনেই "বাকি ১" দেখল, দুজনেই বুক করল', actors: ['রিয়া', 'Database', 'করিম'], steps: [
      { from: 0, to: 1, msg: 'বুক হয়েছে কত? (৯৯ / ১০০)' },
      { from: 2, to: 1, msg: 'বুক হয়েছে কত? (৯৯ / ১০০)', note: 'দুজনেই একই সময়ে পড়ল: ১টা খালি।' },
      { from: 0, to: 1, msg: '১০০ লেখো', tone: 'ok' },
      { from: 2, to: 1, msg: '১০০ লেখো', tone: 'bad', note: 'করিম জানে না রিয়া লিখে ফেলেছে।' },
      { from: 1, to: 0, msg: 'বুকিং সফল', tone: 'ok' },
      { from: 1, to: 2, msg: 'বুকিং সফল (ভুল!): ঘর ১০১ জনকে', tone: 'bad', note: '১টা ঘর, ২ বুকিং।' },
    ] },
    { kind: 'table', head: ['উপায়', 'কীভাবে', 'ভালো', 'সমস্যা'], rows: [
      ['Pessimistic lock', 'পড়ার সময়ই সারি লক (SELECT … FOR UPDATE); অন্যরা অপেক্ষা', 'সহজ, সঠিক', 'লক ধরে থাকা: ধীর, deadlock-এর ঝুঁকি; ভিড় বেশি হলে খারাপ'],
      ['Optimistic lock', 'সারিতে version নম্বর। লেখার সময় "এখনো version ৫ আছে তো?" যদি না, ব্যর্থ, আবার চেষ্টা', 'লক নেই, দ্রুত, ভিড় কম হলে ভালো', 'অনেক বিরোধ হলে বারবার ব্যর্থ আর retry'],
      ['Database constraint', 'সারির উপর শর্ত: বুক ≤ সীমা। ভাঙলে database নিজে ফেরায়', 'সবচেয়ে সরল, ভুল করার জায়গা নেই', 'নিয়ম জটিল হলে লেখা কঠিন; ধরা পড়লে ব্যর্থ মানে retry'],
    ] },
    { kind: 'seq', label: 'Optimistic lock: দ্বিতীয় লেখা ব্যর্থ, তারপর সৎ উত্তর', actors: ['রিয়া', 'Database', 'করিম'], steps: [
      { from: 0, to: 1, msg: 'পড়ো: বুক ৯৯, version ৭' },
      { from: 2, to: 1, msg: 'পড়ো: বুক ৯৯, version ৭' },
      { from: 0, to: 1, msg: 'লেখো: বুক ১০০, শর্ত: version এখনো ৭', tone: 'ok' },
      { from: 1, to: 0, msg: 'সফল, এখন version ৮', tone: 'ok' },
      { from: 2, to: 1, msg: 'লেখো: বুক ১০০, শর্ত: version এখনো ৭', tone: 'bad' },
      { from: 1, to: 2, msg: 'ব্যর্থ: version এখন ৮', tone: 'bad', note: 'করিমের লেখা হয়নি: কিছু ভুল হয়নি।' },
      { from: 2, to: 1, msg: 'আবার পড়ো: ১০০/১০০, ঘর শেষ', tone: 'ok', note: 'করিম এবার সত্যটা জানল: "দুঃখিত, ঘর আর নেই"।' },
    ] },

    { kind: 'h', text: 'নকশা' },
    { kind: 'flow', label: 'বেশিরভাগ service আলাদা: পড়া (খোঁজা) আলাদা, বুকিং (লেখা) একটা database-এ', nodes: [
      { id: 'u', label: 'User', x: 9, y: 17 },
      { id: 'gw', label: 'API gateway', sub: 'login, rate limit', x: 28, y: 17, w: 20 },
      { id: 'hs', label: 'Hotel service', sub: 'খোঁজা (cache)', x: 62, y: 5, w: 22 },
      { id: 'rs', label: 'Reservation service', sub: 'বুকিং', x: 62, y: 17, w: 24 },
      { id: 'ps', label: 'Payment service', x: 62, y: 29, w: 20 },
      { id: 'db', label: 'Database (ACID)', x: 89, y: 17, w: 22 },
    ], links: [
      { from: 'u', to: 'gw', rate: 4 }, { from: 'gw', to: 'hs', rate: 3 }, { from: 'gw', to: 'rs', rate: 1 }, { from: 'rs', to: 'ps', rate: 0.6 }, { from: 'rs', to: 'db', rate: 1 },
    ], h: 36 },
    { kind: 'list', items: [
      'খোঁজার জন্য cache: হোটেলের তথ্য আর ছবি; ঘরের খালি-সংখ্যা সবসময় সাথে সাথে নির্ভুল না হলেও চলে (বুকিংয়ের সময় database আবার দেখে)।',
      'Database ভাগ: hotel ID ধরে (এক হোটেলের সব সারি একসাথে, transaction-এ সুবিধা)।',
      'অনেক service-এ ছড়ালে (reservation আর payment আলাদা): এক transaction-এ সবটা নেই। তখন saga (পরে v2-12): ধাপে ধাপে, ভুল হলে উল্টো ধাপ চালিয়ে ফেরানো।',
      'বুকিং-এর পর payment সময় নেয়: ঘর "ধরা" (hold) থাকে কিছুক্ষণ; মেয়াদ ফুরালে আবার খালি।',
    ] },

    { kind: 'story', title: 'শেষ slot-টা দুই merchant-কে', steps: [
      'ঈদের আগের দিন hub-এর শেষ delivery slot-এ দুজন merchant একই সেকেন্ডে "বুক" চাপল।',
      'দুজনের কাছেই "সফল" গেল, কারণ দুই request আলাদা server থেকে একই খালি সংখ্যা পড়েছিল।',
      'পরদিন hub-এ দুই merchant-এর গাড়ি, একটা slot।',
    ], fix: 'Slot-এর সংখ্যায় database-এর শর্ত (বুক ≤ সীমা) আর লেখার সময় যাচাই। আর প্রতি বুকিংয়ে অনন্য reservation ID, যাতে দুবার ক্লিকেও একটাই।' },

    { kind: 'mistakes', items: [
      'পড়ে, কোডে যাচাই করে, তারপর আলাদা লেখা: মাঝখানে অন্য কেউ ঢুকে যায়।',
      'Idempotency key ছাড়া "বুক করুন" বোতাম।',
      'বুকিংয়ের জন্য NoSQL যেখানে ACID লাগে।',
      'দুই রাতের সারি আলাদা transaction-এ বাড়ানো।',
      'Overbooking-এর সীমা কোডের ভেতরে লুকিয়ে রাখা।',
    ] },
    { kind: 'check', items: [
      { q: 'Hotel বুকিং-এ কঠিন অংশ কী?', a: 'ভিড় নয়, ঠিকঠাক: একই ঘর দুজনকে বা একই user-কে দুবার না দেওয়া। Concurrency আর idempotency।' },
      { q: 'দুবার ক্লিক ঠেকাতে কী?', a: 'পাতা খোলার সময় অনন্য reservation ID। Database-এ তার unique constraint। আবার এলে আগের ফলই ফেরত।' },
      { q: 'Pessimistic আর optimistic lock-এর ফারাক?', a: 'Pessimistic: পড়ার সময় সারি লক, অন্যেরা অপেক্ষা। Optimistic: লক নেই, version মিলিয়ে লেখা, না মিললে ব্যর্থ হয়ে আবার। ভিড় কম হলে optimistic।' },
      { q: 'শেষ ঘরের রেস সবচেয়ে সহজে কীভাবে ঠেকান?', a: 'Database constraint: বুক ≤ সীমা। কোডে ভুল হলেও database ভাঙতে দেয় না।' },
    ] },
  ],
};
