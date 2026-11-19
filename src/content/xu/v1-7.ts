import { dur, num } from './fmt';
import type { XuNote } from './types';

const YEAR = 365.25 * 86400;

/** Vol 1, chapter 7 (Design A Unique ID Generator in Distributed Systems), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-7',
  goals: [
    'চারটা পথ (auto-increment, UUID, ticket server, Snowflake) তুলনা করে বলতে পারবেন কোনটা কখন।',
    'Snowflake ID-র bit ভাগ (সময়, data center, machine, sequence) আর প্রতিটা bit-এর হিসাব করতে পারবেন।',
    'ঘড়ি পিছিয়ে গেলে কী হয়, আর কীভাবে সামলাবেন বলতে পারবেন।',
  ],
  related: ['clocks', 'sharding'],
  blocks: [
    { kind: 'p', text: 'এক database-এ ID দেওয়া সহজ: auto-increment, ১, ২, ৩। কিন্তু যখন database ভাগ হয়ে অনেক machine-এ, আর প্রতিটা machine একসাথে নতুন record বানায়, তখন ID কে দেবে? একই ID দুজনকে গেলে data মিলে যাবে। এই অধ্যায়ের প্রশ্ন: কয়েক হাজার machine, প্রতিটা নিজে ID বানাবে, কারও সাথে কথা না বলে, আর ID যেন কখনো না মেলে।' },
    { kind: 'list', items: [
      'ID অনন্য (unique) হবে।',
      'সংখ্যা, মাত্র ৬৪ bit: সূচক (index) ছোট, দ্রুত।',
      'সময়ের ক্রমে সাজানো: পরে বানানো ID বড়, যাতে ID দেখেই বলা যায় কোনটা আগের।',
      'সেকেন্ডে হাজার হাজার ID, প্রতি machine-এ।',
    ] },

    { kind: 'h', text: 'চার পথ' },
    { kind: 'table', head: ['পথ', 'কীভাবে', 'ভালো', 'সমস্যা'], rows: [
      ['প্রতি database-এ auto-increment, ধাপ k', 'k টা database; প্রতিটা k করে বাড়ায় (১, ৩, ৫ / ২, ৪, ৬)', 'সহজ', 'Server সংখ্যা বদলালে ধাপ বদলাতে হয়; সময়ের ক্রম মেলে না; এক সার্ভারের পেছনে কয়েকটা data center হলে ঝামেলা'],
      ['UUID', 'প্রতি machine নিজে ১২৮ bit এলোমেলো সংখ্যা বানায়', 'কারও সাথে কথা লাগে না; সংঘর্ষ প্রায় অসম্ভব', '১২৮ bit, ৬৪ নয়; সংখ্যা নয় (অক্ষর); সময়ের ক্রম নেই'],
      ['Ticket server', 'একটা আলাদা database শুধু ID বিলি করে', 'সংখ্যা, সহজ, ছোট system-এ ঠিক', 'একটাই (single point of failure); কয়েকটা রাখলে আবার সিঙ্ক করার ঝামেলা'],
      ['Snowflake', 'ID-কে ভাগ করে ভাগে সময়, machine, গণনা বসান', '৬৪ bit, সময়ের ক্রম, কারও সাথে কথা ছাড়াই', 'সব machine-এর ঘড়ির উপর ভরসা'],
    ] },

    { kind: 'h', text: 'Snowflake: ৬৪ bit-কে চার ভাগে' },
    { kind: 'bars', label: 'ID-র ৬৪ bit: কোন ভাগে কয়টা bit (এই সাজ ধরে নেওয়া হয়েছে)', scale: 'stack', note: 'প্রথম bit সবসময় ০: ভবিষ্যতের জন্য রাখা, আর সংখ্যাটা যেন ঋণাত্মক না হয়। ৪১ + ৫ + ৫ + ১২ = ৬৩, সাথে ১ = ৬৪।', items: [
      { label: 'চিহ্ন (সবসময় ০)', value: 1, show: '১ bit', tone: 'warn' },
      { label: 'সময় (milliseconds)', value: 41, show: '৪১ bit', tone: 'ok' },
      { label: 'Data center', value: 5, show: '৫ bit', tone: 'violet' },
      { label: 'Machine', value: 5, show: '৫ bit', tone: 'violet' },
      { label: 'Sequence (একই millisecond-এর গণনা)', value: 12, show: '১২ bit', tone: 'bad' },
    ] },
    { kind: 'list', items: [
      'সময়: একটা নির্দিষ্ট শুরুর মুহূর্ত (epoch) থেকে কত millisecond গেছে। ID-র সবচেয়ে ভারী অংশ, তাই পরের ID বড় হয়, ক্রম মেলে।',
      'Data center আর machine: যে machine ID বানাচ্ছে, তার নম্বর। শুরুতে একবার ঠিক হয়, চালু হওয়ার সময়।',
      'Sequence: একই machine একই millisecond-এ একাধিক ID দিলে ০ থেকে গুনে যায়; পরের millisecond-এ আবার ০।',
    ] },
    { kind: 'p', text: 'কোন ভাগে কয়টা bit দেবেন সেটা আপনার প্রয়োজনের উপর। নিচে বদলে দেখুন: সময়ের জন্য bit কম দিলে ID কত বছর চলবে, আর sequence-এ bit কম হলে একটা machine সেকেন্ডে কয়টা ID দিতে পারবে।' },
    { kind: 'calc', label: 'Bit ভাগ করে দেখুন কত বছর, কত ID', inputs: [
      { id: 't', label: 'সময়ের bit', min: 30, max: 45, step: 1, value: 41 },
      { id: 'm', label: 'Data center + machine-এর bit', min: 2, max: 16, step: 1, value: 10 },
      { id: 's', label: 'Sequence-এর bit', min: 4, max: 16, step: 1, value: 12 },
    ], out: (v) => {
      const total = 1 + v.t! + v.m! + v.s!;
      const years = 2 ** v.t! / 1000 / YEAR;
      const perMs = 2 ** v.s!;
      return [
        { label: 'মোট bit', value: num(total), tone: total === 64 ? 'ok' : total < 64 ? undefined : 'bad', how: `১ + ${num(v.t!)} + ${num(v.m!)} + ${num(v.s!)}${total === 64 ? ': ঠিক ৬৪' : total < 64 ? `: বাকি ${num(64 - total)} bit অব্যবহৃত` : ': ৬৪-র বেশি, বড় সংখ্যা type লাগবে'}` },
        { label: 'ID চলবে', value: dur(years * YEAR), how: `২^${num(v.t!)} millisecond`, bar: Math.min(1, years / 100), tone: years < 10 ? 'bad' : 'ok' },
        { label: 'Machine আছে সর্বোচ্চ', value: num(2 ** v.m!), how: `২^${num(v.m!)}` },
        { label: 'এক machine, প্রতি millisecond-এ ID', value: num(perMs), how: `২^${num(v.s!)}`, },
        { label: 'এক machine, প্রতি সেকেন্ডে', value: num(perMs * 1000), how: `${num(perMs)} × ১,০০০` },
      ];
    } },

    { kind: 'seq', label: 'একটা machine ID বানায়: একই millisecond-এ দুটো, তারপর পরের millisecond-এ', actors: ['Order service', 'ID generator', 'ঘড়ি'], steps: [
      { from: 0, to: 1, msg: 'ID দাও' },
      { from: 1, to: 2, msg: 'এখন কত?', note: 'ঘড়ি millisecond-এ উত্তর দেয়, ধরুন t = ১০০৫।' },
      { from: 1, to: 0, msg: 'ID = (t=১০০৫, machine, seq=০)', tone: 'ok' },
      { from: 0, to: 1, msg: 'আরেকটা দাও (একই millisecond-এ)' },
      { from: 1, to: 0, msg: 'ID = (t=১০০৫, machine, seq=১)', tone: 'ok', note: 'সময় একই, তাই sequence বাড়ল। দুটো ID আলাদা।' },
      { from: 0, to: 1, msg: '৪০৯৬টা পরপর চাইল, একই millisecond-এ', note: '১২ bit-এ ০ থেকে ৪০৯৫ পর্যন্ত।' },
      { from: 1, to: 1, msg: 'Sequence ফুরাল: পরের millisecond পর্যন্ত থামো', tone: 'bad', note: 'অপেক্ষা সর্বোচ্চ ১ millisecond, কিন্তু ID কখনো ডবল হয় না।' },
    ] },

    { kind: 'h', text: 'ঘড়ি পিছিয়ে গেলে' },
    { kind: 'p', text: 'Snowflake-এর পুরো ভরসা ঘড়ির উপর। ঘড়ি ঠিক রাখতে NTP: network থেকে সময় মিলিয়ে নেওয়া। কিন্তু ঠিক করার সময় ঘড়ি কখনো কখনো পিছিয়েও যায়। তখন পুরোনো সময়ের একটা ID আবার বানানো যেতে পারে।' },
    { kind: 'seq', label: 'ঘড়ি ২ সেকেন্ড পিছিয়ে গেল', actors: ['ID generator', 'ঘড়ি'], steps: [
      { from: 0, to: 1, msg: 'এখন কত?' },
      { from: 1, to: 0, msg: '১০:০০:০৫' },
      { from: 0, to: 1, msg: 'আবার, কয়েক মুহূর্ত পরে' },
      { from: 1, to: 0, msg: '১০:০০:০৩ (NTP ঘড়ি পিছিয়ে দিয়েছে)', tone: 'bad', note: 'আগের চেয়ে ছোট সময়। এই সময়ে আগেও ID বানানো হয়েছে।' },
      { from: 0, to: 0, msg: 'শেষ দেখা সময়ের চেয়ে ছোট: ID দিও না', tone: 'ok', note: 'শেষ দেখা সময় মনে রাখুন। ঘড়ি তার নিচে নামলে অপেক্ষা করুন, নয়তো error দিন।' },
    ] },
    { kind: 'list', items: [
      'সবচেয়ে সরল পথ: শেষ ID-র সময় মনে রাখা; ঘড়ি তার চেয়ে পিছনে গেলে ID না দিয়ে অপেক্ষা বা error।',
      'Machine নম্বর দুই machine-এ এক হয়ে গেলে ID ডবল হয়: নম্বর বিলিতে আলাদা service (বা ZooKeeper-ধাঁচের কেন্দ্র) রাখা হয়।',
      'ঘড়ি আর সময় নিয়ে আরও গভীরে: নিচের "আরও পড়ুন"-এর clocks note।',
    ] },

    { kind: 'h', text: 'আরও কিছু ভাবনা' },
    { kind: 'list', items: [
      'Sequence-এর bit কমিয়ে সময়ের bit বাড়ানো (কম traffic, দীর্ঘ জীবন) বা উল্টো (বেশি traffic, কম বছর): আপনার প্রয়োজন বুঝে।',
      'ID-তে সময় আছে, তাই কেউ ID দেখে বানানোর সময় জেনে যায়। এটা গোপন রাখতে চাইলে আলাদা পথ লাগে।',
      'প্রতিটা সময়ের সূক্ষ্মতা আলাদা: সেকেন্ড, millisecond, বা microsecond। যত সূক্ষ্ম, তত কম sequence লাগে, কিন্তু সময়ের bit তত দ্রুত ফুরায়।',
    ] },

    { kind: 'story', title: 'দুই hub-এ একই parcel ID', steps: [
      'দুটো hub-এ দুটো আলাদা server প্রতিদিন নতুন parcel-এর ID বানাত, প্রতিটা নিজের auto-increment দিয়ে।',
      'একদিন দুই hub-এর data একটা report-এ জুড়তেই দেখা গেল দুটো আলাদা parcel-এর ID একই: ১০২৩৪।',
      'Customer-এর tracking পাতায় অন্যের parcel দেখা গেল।',
    ], fix: 'প্রতি hub-এর নম্বর আর সময় ID-র ভেতরে রাখা (Snowflake-ধাঁচ), যাতে দুই hub-এ কখনো একই ID না হয়, আর বানানোর জন্য hub-গুলোর কথা বলতে না হয়।' },

    { kind: 'mistakes', items: [
      'ছোট একটা machine-সংখ্যা ধরে auto-increment-এ ধাপ বসানো, তারপর server বাড়ানো।',
      'ঘড়ি পিছিয়ে যাওয়ার কথা না ভাবা।',
      'দুই machine-কে একই নম্বর দেওয়া।',
      'সময়ের bit এত কম দেওয়া যে কয়েক বছরেই ফুরিয়ে যায়।',
    ] },
    { kind: 'check', items: [
      { q: 'UUID থাকতে Snowflake কেন?', a: 'UUID ১২৮ bit আর সময়ের ক্রমে সাজানো না। Snowflake ৬৪ bit সংখ্যা, ক্রম মেলে, index ছোট আর দ্রুত।' },
      { q: '৪১ bit সময় কত বছর চলে?', a: '২^৪১ millisecond, প্রায় ৬৯ বছর epoch থেকে।' },
      { q: 'একই millisecond-এ দুটো ID কীভাবে আলাদা হয়?', a: 'Sequence bit (১২ bit) দিয়ে: একই millisecond-এ ০, ১, ২ করে বাড়ে; এক millisecond-এ ৪০৯৬টা পর্যন্ত।' },
      { q: 'ঘড়ি পিছিয়ে গেলে কী করবেন?', a: 'শেষ ID-র সময় মনে রাখুন। ঘড়ি তার চেয়ে পিছনে গেলে অপেক্ষা বা error, যাতে পুরোনো সময়ের ID আবার না বনে।' },
    ] },
  ],
};
