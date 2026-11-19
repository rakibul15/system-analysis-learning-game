import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 6 (Replication), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-6',
  goals: [
    'Single-leader, multi-leader আর leaderless: তিন ধরনের replication কীভাবে লেখা সামলায় বলতে পারবেন।',
    'Replication lag-এর তিনটা সমস্যা (নিজের লেখা না দেখা, পিছিয়ে যাওয়া, ক্রম ওলট-পালট) আর প্রতিটার সমাধান বলতে পারবেন।',
    'Quorum (n, w, r) কখন নিশ্চয়তা দেয় আর কখন দেয় না, সংখ্যা বসিয়ে দেখাতে পারবেন।',
  ],
  related: ['replication', 'clocks'],
  blocks: [
    { kind: 'p', text: 'Replication মানে একই data একাধিক machine-এ রাখা। কারণ তিনটা: ব্যবহারকারীর কাছাকাছি রাখা (দেরি কমে), একটা machine ভাঙলেও চলা (availability), আর পড়ার চাপ অনেক machine-এ ভাগ করা। কঠিনটা: data বদলালে সব কপি কীভাবে মিলিয়ে রাখবেন। তিনটা পথ আছে।' },

    { kind: 'h', text: 'Single-leader: একজন লেখে, বাকিরা অনুসরণ করে' },
    { kind: 'p', text: 'একটা replica leader। সব লেখা প্রথমে সেখানে যায়। Leader নিজের log-এ পরিবর্তন রাখে আর follower-দের পাঠায়, তারা একই ক্রমে প্রয়োগ করে। পড়া যেকোনো replica থেকে হতে পারে। এটা সবচেয়ে সরল আর সবচেয়ে প্রচলিত ছাঁদ (PostgreSQL, MySQL, MongoDB)।' },
    { kind: 'flow', label: 'Single-leader: লেখা যায় leader-এ, পড়া ছড়ানো; এক follower sync, বাকি async', nodes: [
      { id: 'w', label: 'লেখা', x: 10, y: 17 },
      { id: 'l', label: 'Leader', x: 38, y: 17 },
      { id: 'f1', label: 'Follower ১', sub: 'sync', x: 82, y: 6, w: 20 },
      { id: 'f2', label: 'Follower ২', sub: 'async', x: 82, y: 17, w: 20 },
      { id: 'f3', label: 'Follower ৩', sub: 'async', x: 82, y: 28, w: 20 },
    ], links: [
      { from: 'w', to: 'l', rate: 5 },
      { from: 'l', to: 'f1', rate: 5 },
      { from: 'l', to: 'f2', rate: 4 },
      { from: 'l', to: 'f3', rate: 3 },
    ], h: 34 },
    { kind: 'list', items: [
      'Synchronous: leader follower-এর জবাবের জন্য অপেক্ষা করে, তারপর "হয়েছে" বলে। follower-এ কপি নিশ্চিত, কিন্তু follower আটকালে লেখা আটকে যায়। তাই সাধারণত একটা sync, বাকিরা async (semi-synchronous)।',
      'Asynchronous: leader অপেক্ষা না করে বলে দেয়। দ্রুত, কিন্তু leader ভাঙলে এখনো না-পৌঁছানো লেখা হারাতে পারে।',
      'নতুন follower বসানো: leader-এর একটা snapshot নিয়ে কপি করা, তারপর snapshot-এর পরের সব পরিবর্তন প্রয়োগ করে ধরে ফেলা।',
      'Follower ভাঙলে: log-এর যেখানে থেমেছিল সেখান থেকে আবার ধরে নেয়। Leader ভাঙলে failover: নতুন leader বাছা, client-দের নতুন ঠিকানা জানানো, পুরোনো leader ফিরলে তাকে follower বানানো।',
    ] },
    { kind: 'tip', title: 'Failover-এ ফাঁদ', text: 'Async replication-এ নতুন leader-এ শেষ কিছু লেখা নাও থাকতে পারে; পুরোনো leader ফিরলে সেগুলো নিয়ে কী হবে? ভুল করে দুজন নিজেকে leader ভাবলে (split brain) data নষ্ট হয়। আর timeout খুব ছোট হলে ক্ষণিক ধীরতাতেই অকারণ failover হয়, যা চাপ আরও বাড়ায়।' },

    { kind: 'h', text: 'Replication lag: পড়া একটু পিছিয়ে থাকে' },
    { kind: 'p', text: 'Async follower কিছুটা পিছিয়ে থাকে, সেটাই lag। সাধারণত মিলিসেকেন্ড, কিন্তু চাপে বা নেটওয়ার্কের গোলমালে সেকেন্ড, মিনিট। শেষে সব কপি মিলবে (eventual consistency), কিন্তু "শেষে" কখন তার কোনো কথা নেই। এতে তিনটা চেনা অসুবিধা।' },
    { kind: 'seq', label: 'নিজের লেখা না দেখা (read-your-writes ভাঙা)', actors: ['Merchant', 'Leader', 'Follower (পিছিয়ে)'], steps: [
      { from: 0, to: 1, msg: 'নতুন ঠিকানা সেভ করলাম' },
      { from: 1, to: 0, msg: 'সেভ হয়েছে', tone: 'ok' },
      { from: 0, to: 2, msg: 'পাতা রিফ্রেশ: আমার ঠিকানা দেখাও' },
      { from: 2, to: 0, msg: 'পুরোনো ঠিকানা', tone: 'bad', note: 'Follower-এ লেখা এখনো পৌঁছায়নি। Merchant ভাবলেন সেভ হয়নি।' },
    ] },
    { kind: 'table', head: ['সমস্যা', 'কেমন দেখায়', 'সমাধানের ধারণা'], rows: [
      ['নিজের লেখা না দেখা', 'সেভ করে রিফ্রেশে পুরোনো মান', 'নিজের বদলানো জিনিস leader থেকে পড়া, বা সদ্য লেখার পর কিছুক্ষণ leader থেকে পড়া'],
      ['পিছিয়ে যাওয়া (monotonic reads)', 'একবার নতুন দেখে, পরের বার পুরোনো (অন্য replica থেকে)', 'একজন user সবসময় একই replica থেকে পড়ুক'],
      ['ক্রম ওলট-পালট (consistent prefix)', 'উত্তর দেখা যায় প্রশ্নের আগে', 'কারণ-ফল মেনে চলা লেখা একই shard-এ রাখা, বা ক্রম রক্ষা'],
    ] },
    { kind: 'p', text: 'সমাধানের একটা বড় শিক্ষা: lag কমানোর চেষ্টায় না থেকে, app-কে বলুন কোন জায়গায় কোন গ্যারান্টি দরকার। সবখানে শক্ত গ্যারান্টি চাইলে খরচ বাড়ে। আর transaction-এর কথা ভাবুন: বেশিরভাগ দল lag-এর জটিলতা app-এর কোডে সামলানোর বদলে database-এর শক্ত গ্যারান্টিতে ছেড়ে দেয়।' },

    { kind: 'h', text: 'Multi-leader: একাধিক জায়গায় লেখা' },
    { kind: 'p', text: 'যদি একাধিক replica লেখা নেয়? তাহলে ঢাকা আর সিঙ্গাপুরের datacenter প্রত্যেকে নিজের কাছের user-এর লেখা সঙ্গে সঙ্গে নেয়, আর পরে নিজেদের মধ্যে মিলায়। সুবিধা: দেরি কম, এক datacenter বন্ধ থাকলেও অন্যটা চলে। ফোনের offline app-ও আসলে একটা multi-leader: ফোন নিজেই একটা leader, পরে sync হয়। এই ধারার আজকের নাম sync engine আর local-first software।' },
    { kind: 'p', text: 'দাম: একই data দুই জায়গায় একসাথে বদলাতে পারে, তাই conflict আসে। সমাধান কয়েক রকম: এড়ানো (একটা জিনিসের সব লেখা সবসময় এক leader-এ), শেষ-লেখক জয়ী (last write wins, কিন্তু অন্যের লেখা নীরবে হারায়), দুই মান জুড়ে ফেলা, বা app-কে সিদ্ধান্ত নিতে দেওয়া। CRDT আর operational transformation এমন গঠন, যা সমান্তরাল বদলকে নিজে নিজে জুড়ে ঠিক ফল দেয়, যেমন একসাথে বসে দুজনের document লেখা।' },
    { kind: 'seq', label: 'দুই datacenter একই parcel বদলাল', actors: ['ঢাকা leader', 'সিঙ্গাপুর leader'], steps: [
      { from: 0, to: 0, msg: 'ঠিকানা = "বাড়ি ১২"', note: 'একই সময়ে নিজের কাছের user-এর লেখা নিয়েছে।' },
      { from: 1, to: 1, msg: 'ঠিকানা = "অফিস ৩"', note: 'আলাদা জায়গা, কেউ কারও খবর জানে না।' },
      { from: 0, to: 1, msg: 'আমার লেখা পাঠালাম' },
      { from: 1, to: 0, msg: 'আমারটাও নাও' },
      { from: 0, to: 1, msg: 'দুটো একই parcel-এর ভিন্ন মান: conflict', tone: 'bad', note: 'কীভাবে মেটাবেন তা আগে থেকে ঠিক না থাকলে দুই জায়গায় দুই মান থেকে যায়।' },
    ] },

    { kind: 'h', text: 'Leaderless: কেউ নেতা নয়' },
    { kind: 'p', text: 'এখানে client (বা একজন coordinator) লেখা একসাথে অনেক replica-য় পাঠায়। n replica-র মধ্যে w-টা সাড়া দিলে লেখা সফল। পড়ার সময় r-টা replica থেকে পড়ে, আর নতুনতম মান নেয়। নিয়ম: যদি w + r > n হয়, লেখার সেট আর পড়ার সেট অন্তত একটা replica-তে মিলবেই, তাই পড়ায় সর্বশেষ লেখা পাওয়া যায়। এই ধারা Dynamo-র থেকে এসেছে (Cassandra, Riak)।' },
    { kind: 'calc', label: 'Quorum: n, w, r বসিয়ে দেখুন', inputs: [
      { id: 'n', label: 'Replica (n)', min: 1, max: 9, step: 1, value: 3 },
      { id: 'w', label: 'কয়টা সাড়া দিলে লেখা সফল (w)', min: 1, max: 9, step: 1, value: 2 },
      { id: 'r', label: 'কয়টা থেকে পড়ি (r)', min: 1, max: 9, step: 1, value: 2 },
    ], out: (v) => {
      const n = v.n!, w = Math.min(v.w!, n), r = Math.min(v.r!, n);
      const ok = w + r > n;
      return [
        { label: 'w + r > n?', value: ok ? `হ্যাঁ (${num(w + r)} > ${num(n)})` : `না (${num(w + r)} ≤ ${num(n)})`, tone: ok ? 'ok' : 'bad', how: ok ? 'পড়া আর লেখার সেট অন্তত একটাতে মেলে: নতুন মান পাওয়ার কথা' : 'সেট না মিলতে পারে: পড়ায় পুরোনো মান আসতে পারে' },
        { label: 'লেখা সইতে পারে ভাঙা replica', value: `${num(n - w)}টা`, bar: (n - w) / n, how: 'n − w' },
        { label: 'পড়া সইতে পারে ভাঙা replica', value: `${num(n - r)}টা`, bar: (n - r) / n, how: 'n − r' },
      ];
    } },
    { kind: 'list', items: [
      'Read repair: পড়ার সময় কোনো replica-র পুরোনো মান ধরা পড়লে সেখানে নতুনটা লিখে দেওয়া। Anti-entropy: পেছনে একটা কাজ নিয়মিত replica মিলিয়ে ফাঁক ভরে।',
      'Sloppy quorum আর hinted handoff: নির্ধারিত node নাগালে না থাকলে সাময়িকভাবে অন্য node লেখা রাখে, পরে ফেরত দেয়। লেখা বেশি সফল হয়, কিন্তু quorum-এর নিশ্চয়তা আর খাটে না।',
      'Quorum-ও পুরো নিশ্চয়তা নয়: সমান্তরাল লেখা, লেখা আংশিক সফল হওয়া, ঘড়ির গোলমাল থাকলে পুরোনো মানও পাওয়া যায়। এটা শক্ত গ্যারান্টির বদলি হিসেবে ধরবেন না।',
    ] },
    { kind: 'p', text: 'একই key-তে সমান্তরাল লেখা ধরার উপায়: প্রতিটা মানের সাথে version সংখ্যা। যদি একটা লেখা আগে দেখা অন্যটার পরে ঘটে, পুরোনোটা বাদ। যদি কেউ কাউকে না দেখে লিখে থাকে, তারা concurrent, আর দুটোই রাখতে হবে (sibling), পরে জুড়ে নিতে হবে। ঘড়ি দেখে "শেষ কোনটা" ঠিক করা বিপজ্জনক, কারণ ঘড়ি মেলে না।' },

    { kind: 'story', title: 'ঠিকানা সেভ হল, কিন্তু দেখা গেল না', steps: [
      'ParcelGo-র merchant ঠিকানা সেভ করে পাতা রিফ্রেশ করলেন।',
      'পড়া চলে একটা পিছিয়ে-থাকা follower থেকে, তাই পুরোনো ঠিকানা দেখাল।',
      'Merchant আবার সেভ করলেন, আবার, এবং সাপোর্টে ফোন।',
    ], fix: 'নিজের সদ্য বদলানো জিনিস কিছুক্ষণ leader থেকে পড়ান (বা সেভের সময়ের পরে যে replica যথেষ্ট নতুন তা থেকে)। আর "সেভ হয়েছে" বার্তা দেখানোর সময়ও এই মনে রাখুন।' },

    { kind: 'mistakes', items: [
      'Async replication-কে "ঠিক একই data" ধরা: lag আছে, আর leader ভাঙলে লেখা হারাতে পারে।',
      'Multi-leader নিয়ে conflict নিয়ম না ভেবে নামা। "Last write wins" ডিফল্টে ডেটা নীরবে হারায়।',
      'w + r > n কে সব গ্যারান্টি ভাবা; সমান্তরাল লেখা আর sloppy quorum-এ তা খাটে না।',
      'Failover-এর timeout খুব ছোট রাখা: সাময়িক ধীরতায় অকারণ leader বদল।',
    ] },
    { kind: 'check', items: [
      { q: 'Sync আর async replication-এর পার্থক্য আর দাম?', a: 'Sync-এ leader follower-এর স্বীকৃতির অপেক্ষা করে: কপি নিশ্চিত, কিন্তু একটা follower আটকালে লেখাও আটকায়। Async-এ অপেক্ষা নেই: দ্রুত, কিন্তু leader ভাঙলে সদ্য লেখা হারাতে পারে।' },
      { q: 'Read-your-writes ভাঙলে কী ঘটে, আর কী করবেন?', a: 'লেখার পর পড়লে পুরোনো মান আসে, কারণ পড়াটা পিছিয়ে-থাকা replica-য় গেছে। নিজের বদলানো জিনিস leader (বা যথেষ্ট নতুন replica) থেকে পড়ান।' },
      { q: 'n = ৫, w = ৩, r = ২ হলে quorum নিশ্চয়তা পাওয়া যায়?', a: 'না: ৩ + ২ = ৫, যা ৫-এর বেশি নয়। লেখার সেট আর পড়ার সেট একটাতেও না মিলতে পারে। r = ৩ করলে (৩ + ৩ = ৬ > ৫) মেলে।' },
      { q: 'Multi-leader-এ conflict কেন হয়?', a: 'একই data দুই leader একসাথে, একে অন্যের লেখা না জেনে বদলাতে পারে। পরে মেলাতে গেলে দুটো আলাদা মান দাঁড়ায়, আর কীভাবে মেটাবেন তার নিয়ম লাগে।' },
    ] },
  ],
};
