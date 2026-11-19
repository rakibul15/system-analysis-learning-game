import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 15 (Design Google Drive), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-15',
  goals: [
    'File-কে block-এ ভাগ করার লাভ (delta sync, retry, dedupe) সংখ্যা ধরে বলতে পারবেন।',
    'Metadata আর file-এর বিষয় আলাদা রাখা, আর upload ও sync-এর পথ আঁকতে পারবেন।',
    'দুজন একই file একসাথে বদলালে conflict কীভাবে ধরা পড়ে আর সামলানো হয় বলতে পারবেন।',
  ],
  related: ['replication', 'storage', 'consensus'],
  blocks: [
    { kind: 'p', text: 'Google Drive-এর মতো system-এ file রাখা যায়, বহু device-এ সিঙ্ক থাকে, আর অন্যের সাথে ভাগ করা যায়। ParcelGo-র উদাহরণ: merchant-রা invoice আর delivery-র কাগজ upload করে; অফিসের কম্পিউটারে আর ফোনে একই ফোল্ডার, আর accountant-এর সাথে ভাগ। সহজ শোনায়, কিন্তু file বড়, আর একই file অনেকে একসাথে বদলায়।' },
    { kind: 'list', items: [
      'File upload/download, অনেক device-এ সিঙ্ক, ভাগ করা, পুরোনো সংস্করণ (version) দেখা।',
      'File যায় না হারিয়ে: নির্ভরযোগ্যতা সবচেয়ে বড়। Storage-এ কপি, নানা জায়গায়।',
      'সিঙ্ক দ্রুত: ছোট বদলের জন্য পুরো file নয়, আর কম network চালানো (ফোনে ডেটা বাঁচাতে)।',
      'File সর্বোচ্চ ১০ GB; ১ কোটি user, প্রতি user ১০ GB জায়গা ধরলে বিশাল।',
    ] },
    { kind: 'calc', label: 'অনুমান: storage', inputs: [
      { id: 'u', label: 'User', min: 1, max: 100, step: 1, value: 10, unit: 'M' },
      { id: 'gb', label: 'প্রতি user-এর জায়গা', min: 1, max: 50, step: 1, value: 10, unit: 'GB' },
      { id: 'cp', label: 'কপি', min: 1, max: 5, step: 1, value: 1 },
    ], out: (v) => {
      const raw = v.u! * 1e6 * v.gb! * 1e9;
      return [
        { label: 'মোট user-ডেটা', value: bytes(raw), how: `${num(v.u!)}M × ${num(v.gb!)} GB`, bar: Math.min(1, raw / 1e18) },
        { label: 'কপিসহ', value: bytes(raw * v.cp!), how: `× ${num(v.cp!)} কপি`, tone: v.cp! > 1 ? 'bad' : undefined },
      ];
    } },
    { kind: 'tip', title: 'একটা file system দিয়ে কেন নয়', text: 'এই সংখ্যা এক machine-এ ধরে না। ডেটা ভাগ করে অনেক storage-এ রাখতে হবে (v1-5, v2-9)। তাই file-এর ভেতর নয়, বাইরের জিনিস (metadata) আলাদা: কে কার, কোন version, কোন block কোথায়।' },

    { kind: 'h', text: 'শুরুতে সরল, তারপর ভাঙা' },
    { kind: 'stages', label: 'Drive বড় হচ্ছে: প্রতিটা ধাপে কী ভাঙল', stages: [
      { title: 'এক server, সব ফোল্ডার', problem: 'শুরু: web server-এ file রাখা, ফোল্ডারে ফোল্ডারে।', fix: 'File সরাসরি disk-এ, user ধরে ফোল্ডার।', cost: 'Disk ভরে গেলে শেষ; server গেলে সব file হারায়।',
        nodes: [{ id: 'u', label: 'User', x: 14, y: 17 }, { id: 's', label: 'Server', sub: 'file ও metadata', x: 62, y: 17, w: 24 }], links: [{ from: 'u', to: 's', rate: 2.4 }] },
      { title: 'Storage আলাদা (object store)', problem: 'Disk শেষ, আর একটা server-এ পড়া-লেখার ভিড়।', fix: 'File যায় S3-র মতো object storage-এ (একাধিক জায়গায় কপি)। Metadata আলাদা database-এ।', cost: 'দুই জায়গা: file আর তার তথ্য মেলানোর ঝামেলা।',
        nodes: [{ id: 'u', label: 'User', x: 8, y: 17 }, { id: 'a', label: 'API server', x: 36, y: 17, w: 20 }, { id: 'o', label: 'Object storage', sub: 'file', x: 78, y: 7, w: 24 }, { id: 'd', label: 'Metadata DB', x: 78, y: 28, w: 22 }],
        links: [{ from: 'u', to: 'a', rate: 2.4 }, { from: 'a', to: 'o', rate: 1.6 }, { from: 'a', to: 'd', rate: 1.6 }] },
      { title: 'Block server আর notification', problem: 'বড় file-এ একটু বদল হলেও পুরোটা আবার upload। অন্য device-কে জানানোর উপায় নেই।', fix: 'File-কে block-এ ভাঙা (block server কাজটা করে)। আর বদলের খবর পৌঁছাতে notification service।', cost: 'Block জোড়ার হিসাব আর "এই file-এ কোন block" মনে রাখা।',
        nodes: [{ id: 'c', label: 'Client', x: 8, y: 17 }, { id: 'b', label: 'Block server', sub: 'ভাঙা, জোড়া, কমানো', x: 38, y: 5, w: 24 }, { id: 'o', label: 'Object storage', x: 84, y: 5, w: 22 }, { id: 'a', label: 'API server', x: 38, y: 29, w: 20 }, { id: 'd', label: 'Metadata DB', x: 84, y: 17, w: 22 }, { id: 'n', label: 'Notification', x: 84, y: 29, w: 22 }],
        links: [{ from: 'c', to: 'b', rate: 2 }, { from: 'b', to: 'o', rate: 2 }, { from: 'c', to: 'a', rate: 1.4 }, { from: 'a', to: 'd', rate: 1.4 }, { from: 'a', to: 'n', rate: 1 }] },
    ] },

    { kind: 'h', text: 'Block: কেন ছোট টুকরো' },
    { kind: 'p', text: 'একটা বড় file-এ একটু বদলালে পুরোটা আবার পাঠানো বোকামি। তাই file-কে (বাস্তবে সর্বোচ্চ কয়েক MB-র) block-এ ভেঙে প্রতিটার hash রাখা হয়। বদলের পর আবার hash মিলিয়ে দেখা যায় কোন block বদলেছে। শুধু সেগুলোই upload।' },
    { kind: 'calc', label: 'Block ছোট হলে কত কম পাঠাতে হয়', inputs: [
      { id: 'f', label: 'File-এর আকার', min: 10, max: 5000, step: 10, value: 1000, unit: 'MB' },
      { id: 'b', label: 'Block-এর আকার', min: 1, max: 100, step: 1, value: 4, unit: 'MB' },
      { id: 'ch', label: 'বদলেছে', min: 1, max: 50, step: 1, value: 1, unit: 'block' },
    ], out: (v) => {
      const total = Math.ceil(v.f! / v.b!);
      const sent = Math.min(total, v.ch!) * v.b!;
      return [
        { label: 'মোট block', value: num(total), how: `${num(v.f!)} MB ÷ ${num(v.b!)} MB` },
        { label: 'পুরো file আবার পাঠালে', value: `${num(v.f!)} MB`, tone: 'bad', bar: 1 },
        { label: 'শুধু বদলানো block (delta sync)', value: `${num(sent)} MB`, tone: 'ok', bar: Math.min(1, sent / v.f!), how: `${num(Math.min(total, v.ch!))} block × ${num(v.b!)} MB` },
        { label: 'বাঁচল', value: `${num(Math.round((1 - sent / v.f!) * 100))}%`, how: 'ছোট block-এ বেশি বাঁচে, কিন্তু block সংখ্যা বাড়ে: metadata-ও' },
      ];
    } },
    { kind: 'list', items: [
      'Delta sync: file-এর শুধু বদলানো block-ই পাঠানো।',
      'Compression: block নানা কৌশলে ছোট করে (text-এ gzip, ছবিতে অন্য), network আর storage দুটোই বাঁচে।',
      'Encryption: block-এ সংরক্ষণের আগে সংকেত করা (encrypt), যাতে storage ফাঁস হলেও পড়া না যায়।',
      'Dedupe: একই block (একই hash) দুবার জমা নয়। অনেকে একই বড় file upload করলে একটাই কপি।',
      'Retry: block ধরে upload: মাঝপথে ভাঙলে ভাঙা block-টাই আবার।',
    ] },
    { kind: 'seq', label: 'File upload: metadata আর block দুটো পথে', actors: ['Client', 'API server', 'Metadata DB', 'Block server', 'Object storage', 'Notification'], steps: [
      { from: 0, to: 1, msg: 'নতুন file: invoice.pdf (status: pending)', note: 'আগে metadata লেখা: "আসছে"।' },
      { from: 1, to: 2, msg: 'metadata রাখো', tone: 'ok' },
      { from: 0, to: 3, msg: 'file-এর block-গুলো (ভাঙা, compress, encrypt)', note: 'Client নিজে বা block server ভাঙে।' },
      { from: 3, to: 4, msg: 'block রাখো', tone: 'ok' },
      { from: 4, to: 1, msg: 'upload শেষ: callback', note: 'Object storage আমাদের জানায়।' },
      { from: 1, to: 2, msg: 'status = uploaded', tone: 'ok' },
      { from: 1, to: 5, msg: 'অন্য device-কে জানাও', note: 'যারা এই file দেখতে পারে, তাদের সবাইকে।' },
    ] },

    { kind: 'h', text: 'সিঙ্ক আর conflict' },
    { kind: 'p', text: 'অন্য device-এ খবর পৌঁছাতে notification: বদল হলে সেই user-এর বাকি device-দের জানায়। এটা সাধারণত long polling (খোলা connection, বার্তা এলেই উত্তর), কারণ এখানে দুই দিকে ঘন বার্তা দরকার নেই। খবর পেয়ে অন্য client metadata চায়, তারপর বদলানো block নামায়।' },
    { kind: 'seq', label: 'দুজন একই file একসাথে বদলাল: প্রথম জেতে, দ্বিতীয় conflict পায়', actors: ['রিয়া', 'সার্ভার', 'করিম'], steps: [
      { from: 0, to: 1, msg: 'report.docx (v৫) বদলে সংরক্ষণ', note: 'দুজনেই v৫ থেকে শুরু।' },
      { from: 1, to: 0, msg: 'ঠিক আছে, এখন v৬', tone: 'ok' },
      { from: 2, to: 1, msg: 'report.docx (v৫) বদলে সংরক্ষণ', tone: 'bad', note: 'করিম জানে না যে v৬ হয়ে গেছে।' },
      { from: 1, to: 2, msg: 'conflict: আপনার v৫ পুরোনো', tone: 'bad', note: 'Server দেখল v৫-এর ভিত্তিতে বদলাতে এসেছে, কিন্তু এখন তো v৬।' },
      { from: 1, to: 2, msg: 'দুটো কপি দিই: রিয়ার v৬, আর আপনারটা "report (conflict).docx"', tone: 'ok', note: 'কিছু হারায় না। দুটো পাশাপাশি দেখে মানুষ জুড়ে নেয়।' },
    ] },
    { kind: 'tip', title: 'কেন প্রথমজন জেতে, জুড়ে দেয় না কেন', text: 'দুটো বদল স্বয়ংক্রিয়ভাবে জুড়তে (merge) ফাইলের ধরন বুঝতে হয়, আর ভুলে জুড়লে কিছু হারাতে পারে। তাই সাধারণ নিয়ম: প্রথম বদল জেতে, দ্বিতীয়কে দুটো কপি দেখিয়ে মানুষকে ঠিক করতে দেওয়া। লাইভ লেখার editor-এ বাস্তবে আলাদা কৌশল (OT, CRDT)।' },

    { kind: 'h', text: 'Storage বাঁচানো আর ভাঙা সামলানো' },
    { kind: 'list', items: [
      'Version: প্রতিটা বদলে নতুন version; কিন্তু সব রাখা অসম্ভব। সংখ্যা সীমা (শেষ ক টা), আর পুরোনোগুলো সস্তা storage-এ (cold storage)।',
      'কম ব্যবহৃত data: অনেকদিন কেউ ছোঁয়নি এমন file সস্তা, ধীর storage-এ।',
      'Metadata database: কপি (replication) আর ভাগ (sharding); এটা হারালে file আছে কিন্তু কেউ খুঁজে পাবে না।',
      'Object storage: একাধিক region-এ কপি, তাই একটা data center গেলেও file থাকে।',
      'Notification service মরলে: client মাঝে মাঝে নিজে থেকে metadata দেখে নেয় (পেছনের পথ)।',
      'Offline: ইন্টারনেট ছাড়া বদল backlog-এ জমে, ফিরে এলে সিঙ্ক।',
    ] },

    { kind: 'story', title: 'Accountant দুজনেই invoice বদলাল', steps: [
      'ParcelGo-র দুই accountant মাসের শেষে একই invoice sheet খুলল।',
      'দুজনেই নিজ নিজ সংখ্যা বদলে সংরক্ষণ করল; পরের জনেরটা আগের জনের বদল মুছে ফেলল।',
      'মাসের হিসাব মিলল না, কেউ বুঝল না কেন।',
    ], fix: 'প্রতিটা বদলে version দেখা: আগের version-এর উপর ভিত্তি না থাকলে "conflict" ধরা, দুটো কপি রাখা। আর পুরোনো version ফিরিয়ে আনার পথ খোলা।' },

    { kind: 'mistakes', items: [
      'বড় file-এর একটু বদলেও পুরোটা আবার upload।',
      'File-এর ভেতরে আর বাইরে তথ্য (metadata) এক জায়গায় রাখা।',
      'Conflict উপেক্ষা: শেষজন জেতে, আগের বদল নিঃশব্দে মুছে।',
      'সব পুরোনো version চিরকাল দামি storage-এ।',
      'Object storage-এ একটাই কপি।',
    ] },
    { kind: 'check', items: [
      { q: 'File-কে block-এ ভাগ করলে কী কী সুবিধা?', a: 'Delta sync (বদলানো block-ই পাঠানো), ভাঙা upload-এ শুধু ভাঙা block আবার, আর একই block-এর dedupe।' },
      { q: 'Metadata আর file আলাদা রাখেন কেন?', a: 'File বড়, object storage-এ যায়। Metadata (কে মালিক, version, কোন block) ছোট আর বেশি খোঁজা হয়: দ্রুত database-এ। দুটোর বাড়ার ধরন আলাদা।' },
      { q: 'দুজন একসাথে বদলালে কী হয়?', a: 'প্রথমজনের বদল মেনে নেওয়া হয়। দ্বিতীয়জন পায় conflict: দুটো কপি, আর ঠিক করে মানুষ।' },
      { q: 'অন্য device কীভাবে জানে বদল হয়েছে?', a: 'Notification service (সাধারণত long polling)। খবর পেয়ে client নতুন metadata আর বদলানো block নামায়।' },
    ] },
  ],
};
