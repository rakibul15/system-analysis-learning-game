import type { BookRef } from '@/features/books/catalog';

/**
 * "গভীরে": step-by-step timelines for the ideas that are hard to see in a box diagram.
 * Lanes are the actors (client, leader, follower…); each step adds messages or state
 * changes, and some steps ask you to predict what happens before showing it.
 * Written in our own words with ParcelGo examples; the reference points at the book.
 */
export type Tone = 'ok' | 'bad' | 'warn' | 'plain';
export type Ev =
  | { kind: 'msg'; from: string; to: string; label: string; style?: 'lost' | 'late' }
  | { kind: 'state'; lane: string; text: string; tone: Tone };
export interface Predict { q: string; options: string[]; explain: string }
export interface Step { text: string; ev: Ev[]; predict?: Predict }
export interface Timeline {
  id: string; title: string; gist: string; levels: number[]; note?: string;
  lanes: { id: string; label: string }[]; steps: Step[]; ref: BookRef; takeaway: string;
}

const m = (from: string, to: string, label: string, style?: 'lost' | 'late'): Ev => ({ kind: 'msg', from, to, label, style });
const s = (lane: string, text: string, tone: Tone = 'plain'): Ev => ({ kind: 'state', lane, text, tone });
const lanes = (...xs: [string, string][]) => xs.map(([id, label]) => ({ id, label }));
const D = (chapter: number, section: string, a: number, b: number): BookRef => ({ book: 'ddia2', chapter, section, pages: [a, b] });

export const timelines: Timeline[] = [
  {
    id: 'replag', title: 'নিজের লেখা নিজে দেখি না', gist: 'Replica পিছিয়ে থাকলে user সদ্য save করা জিনিসও পুরনো দেখে।',
    levels: [1, 6], note: 'replication', ref: D(6, 'Problems with Replication Lag', 209, 214),
    lanes: lanes(['app', 'Merchant app'], ['leader', 'Leader'], ['follower', 'Follower']),
    steps: [
      { text: 'Merchant pickup ঠিকানা মিরপুর থেকে উত্তরা করে Save চাপল। লেখা যায় leader-এ।', ev: [m('app', 'leader', 'ঠিকানা = উত্তরা'), s('leader', 'উত্তরা ✓', 'ok')] },
      { text: 'Leader সাথে সাথে "saved" বলে দিল (async replication)।', ev: [m('leader', 'app', 'OK, saved')] },
      { text: 'Leader follower-কে কপি পাঠাচ্ছে, কিন্তু network আজ ধীর।', ev: [m('leader', 'follower', 'উত্তরা (পথে…)', 'late'), s('follower', 'এখনো মিরপুর', 'warn')] },
      { text: 'Merchant page reload দিল। পড়া যায় follower থেকে।', predict: { q: 'Merchant কী দেখবে?', options: ['পুরনো ঠিকানা: মিরপুর', 'নতুন ঠিকানা: উত্তরা', 'একটা error', 'খালি পাতা'], explain: 'Follower এখনো কপি পায়নি, তাই পুরনো মান দেয়। Merchant ভাবে save হয়নি, আবার বদলায়।' },
        ev: [m('app', 'follower', 'ঠিকানা কী?'), m('follower', 'app', 'মিরপুর'), s('app', 'পুরনো! save হয়নি?', 'bad')] },
      { text: 'কিছুক্ষণ পরে কপি পৌঁছাল; এখন follower-ও ঠিক।', ev: [s('follower', 'উত্তরা ✓', 'ok')] },
      { text: 'সমাধান: নিজের সদ্য বদলানো জিনিস কিছুক্ষণ (ধরুন ১ মিনিট) leader থেকে পড়া; বাকিরা follower থেকেই।', ev: [m('app', 'leader', 'আমার ঠিকানা কী?'), m('leader', 'app', 'উত্তরা'), s('app', 'নিজের লেখা দেখল ✓', 'ok')] },
    ],
    takeaway: 'Replica থেকে পড়া মানে একটু পুরনো দেখার সম্ভাবনা; নিজের বদল দেখার পাতায় leader থেকে পড়ুন।',
  },
  {
    id: 'quorum', title: 'Quorum: W + R > N', gist: 'কয়টা node-এ লিখলে আর কয়টা থেকে পড়লে সর্বশেষ মান নিশ্চিত।',
    levels: [6], note: 'replication', ref: D(6, 'Leaderless Replication', 229, 242),
    lanes: lanes(['c', 'Client'], ['a', 'Node A'], ['b', 'Node B'], ['n3', 'Node C']),
    steps: [
      { text: 'N = 3, W = 2, R = 2। Client x = 2 লিখতে তিনজনকেই পাঠাল; C তখন বন্ধ।', ev: [m('c', 'a', 'x = 2 (v2)'), m('c', 'b', 'x = 2 (v2)'), m('c', 'n3', 'x = 2 (v2)', 'lost'), s('n3', 'বন্ধ', 'bad')] },
      { text: 'A আর B "পেয়েছি" বলল। দুইজন = W, তাই লেখা সফল।', ev: [m('a', 'c', 'ack'), m('b', 'c', 'ack'), s('c', 'W = 2 পূর্ণ ✓', 'ok')] },
      { text: 'C ফিরে এল, কিন্তু তার কাছে পুরনো মান।', ev: [s('n3', 'x = 1 (v1, পুরনো)', 'warn')] },
      { text: 'এবার পড়া, R = 2: উত্তর এল B আর C থেকে।', predict: { q: 'B বলছে x = 2 (v2), C বলছে x = 1 (v1)। Client কোনটা নেবে?', options: ['বড় version-এরটা: x = 2', 'যেটা আগে পৌঁছাল', 'দুটোর গড়', 'Error দেখাবে'], explain: 'Version দেখে নতুনটা নেয়। W + R = 4 > 3, তাই পড়ার দলে অন্তত একজন নতুন মান জানবেই।' },
        ev: [m('c', 'b', 'x?'), m('c', 'n3', 'x?'), m('b', 'c', 'x = 2 (v2)'), m('n3', 'c', 'x = 1 (v1)'), s('c', 'x = 2 নেয় ✓', 'ok')] },
      { text: 'Read repair: পিছিয়ে থাকা C-কে নতুন মান লিখে দেওয়া।', ev: [m('c', 'n3', 'x = 2 (v2)'), s('n3', 'x = 2 ✓', 'ok')] },
      { text: 'যদি W = 1, R = 1 হতো?', predict: { q: 'শুধু A-তে লেখা আর শুধু C থেকে পড়া হলে কী হতে পারে?', options: ['পুরনো x = 1 পড়া', 'সবসময় নতুন মান', 'লেখাই ব্যর্থ', 'কোনো পার্থক্য নেই'], explain: 'W + R = 2 ≤ 3: লেখার দল আর পড়ার দল না মিললে পুরনো মান আসে।' },
        ev: [s('c', 'W + R ≤ N: পুরনো পড়ার ঝুঁকি', 'warn')] },
    ],
    takeaway: 'W + R > N হলে লেখার দল আর পড়ার দল মিলবেই; version দেখে নতুনটা বাছা আর read repair লাগে।',
  },
  {
    id: 'fencing', title: 'থেমে থাকা worker আর fencing token', gist: 'Lock-এর মেয়াদ শেষে পুরনো মালিক জেগে উঠলে কী হয়, আর কীভাবে থামাবেন।',
    levels: [7, 29], note: 'clocks', ref: D(9, 'Distributed Locks and Leases', 373, 376),
    lanes: lanes(['w1', 'Worker ১'], ['lock', 'Lock service'], ['w2', 'Worker ২'], ['st', 'Storage']),
    steps: [
      { text: 'Worker ১ merchant X-এর payout-এর lock চাইল; পেল, token ৩৩, মেয়াদ ১০ সেকেন্ড।', ev: [m('w1', 'lock', 'lock?'), m('lock', 'w1', 'হ্যাঁ, token ৩৩')] },
      { text: 'Worker ১ garbage collection-এ ১৫ সেকেন্ড থেমে গেল। সে নিজে জানে না।', ev: [s('w1', '⏸ থেমে আছে (GC)', 'warn')] },
      { text: 'মেয়াদ শেষ। Worker ২ lock চেয়ে পেল, token ৩৪।', ev: [m('w2', 'lock', 'lock?'), m('lock', 'w2', 'হ্যাঁ, token ৩৪')] },
      { text: 'Worker ২ payout লিখল token ৩৪ সহ।', ev: [m('w2', 'st', 'payout, token ৩৪'), s('st', 'সবচেয়ে বড় token: ৩৪', 'ok')] },
      { text: 'Worker ১ জেগে উঠল, ভাবছে lock এখনো তার।', predict: { q: 'Worker ১ token ৩৩ নিয়ে payout লিখতে গেল। Storage কী করবে?', options: ['ফিরিয়ে দেবে: ৩৩ < ৩৪', 'লিখে দেবে, আরেকটা payout', 'দুটোই রাখবে', 'Worker ২-এর লেখা মুছবে'], explain: 'Storage আগেই বড় token দেখেছে, তাই পুরনো মালিকের লেখা বাতিল।' },
        ev: [s('w1', 'জেগে উঠল, lock তার ভাবছে', 'warn'), m('w1', 'st', 'payout, token ৩৩'), s('st', 'বাতিল: ৩৩ < ৩৪ ✓', 'ok')] },
      { text: 'Fencing token না থাকলে কী হতো?', ev: [s('st', 'দুবার payout! merchant দুবার টাকা', 'bad')] },
    ],
    takeaway: 'Lock-এর মেয়াদে ভরসা করবেন না; বাড়তে থাকা token দিন আর storage পুরনো token ফিরিয়ে দিক।',
  },
  {
    id: 'lostupdate', title: 'Lost update: হারানো যোগ', gist: 'দুজন একসাথে পড়ে-বদলে-লিখলে একজনের বদল চুপচাপ হারায়।',
    levels: [4, 22, 26], note: 'transactions', ref: D(8, 'Preventing Lost Updates', 299, 302),
    lanes: lanes(['d1', 'Delivery ১'], ['db', 'DB'], ['d2', 'Delivery ২']),
    steps: [
      { text: 'Merchant-এর wallet-এ ৳৫০০। দুটো COD একসাথে শেষ হলো: +৳২০০ আর +৳১০০।', ev: [s('db', 'balance ৳৫০০')] },
      { text: 'Delivery ১ balance পড়ল।', ev: [m('d1', 'db', 'balance?'), m('db', 'd1', '৳৫০০')] },
      { text: 'একই মুহূর্তে Delivery ২-ও পড়ল।', ev: [m('d2', 'db', 'balance?'), m('db', 'd2', '৳৫০০')] },
      { text: 'Delivery ১ লিখল ৫০০ + ২০০।', ev: [m('d1', 'db', 'balance = ৳৭০০'), s('db', '৳৭০০')] },
      { text: 'Delivery ২ লিখবে তার হিসাব।', predict: { q: 'Delivery ২ লিখল ৫০০ + ১০০। শেষে balance কত?', options: ['৳৬০০: ৳২০০ হারাল', '৳৮০০', '৳৭০০', '৳৫০০'], explain: 'Delivery ২ পুরনো ৳৫০০ দেখে হিসাব করেছে, তাই Delivery ১-এর যোগ মুছে গেল।' },
        ev: [m('d2', 'db', 'balance = ৳৬০০'), s('db', '৳৬০০ ✕ (হওয়ার কথা ৳৮০০)', 'bad')] },
      { text: 'সমাধান: পড়ে-বদলে-লেখা না করে DB-কে নিজে যোগ করতে বলা (atomic increment)।', ev: [m('d1', 'db', 'balance += ২০০'), m('d2', 'db', 'balance += ১০০'), s('db', '৳৮০০ ✓', 'ok')] },
    ],
    takeaway: 'পড়ে-বদলে-লেখার বদলে atomic update, row lock (FOR UPDATE) বা version মিলিয়ে লেখা।',
  },
  {
    id: 'writeskew', title: 'Write skew: আলাদা সারি, তবু নিয়ম ভাঙে', gist: 'দুজন আলাদা জিনিস বদলাল, কিন্তু মিলে একটা নিয়ম ভেঙে দিল।',
    levels: [22], note: 'transactions', ref: D(8, 'Write Skew and Phantoms', 303, 307),
    lanes: lanes(['a', 'Rider A'], ['db', 'DB'], ['b', 'Rider B']),
    steps: [
      { text: 'নিয়ম: প্রতি রাতে hub-এ অন্তত একজন rider on-call। এখন A আর B দুজনেই on-call।', ev: [s('db', 'on-call: A, B (নিয়ম ≥ ১)')] },
      { text: 'A ছুটি চাওয়ার আগে গুনে দেখল।', ev: [m('a', 'db', 'on-call কয়জন?'), m('db', 'a', '২ জন')] },
      { text: 'একই সময়ে B-ও গুনল (snapshot isolation)।', ev: [m('b', 'db', 'on-call কয়জন?'), m('db', 'b', '২ জন')] },
      { text: 'A নিজের সারি বদলাল।', ev: [m('a', 'db', 'A = ছুটি'), s('db', 'on-call: B')] },
      { text: 'B-ও নিজের সারি বদলাতে চাইল; সে আগে ২ জন দেখেছিল।', predict: { q: 'Snapshot isolation-এ কী হবে?', options: ['দুটোই commit, কেউ on-call নেই', 'B ব্যর্থ হবে', 'A-রটা বাতিল হবে', 'DB আটকে যাবে'], explain: 'দুজন আলাদা সারি লিখেছে, তাই snapshot isolation সংঘাত দেখে না। নিয়ম ভাঙল।' },
        ev: [m('b', 'db', 'B = ছুটি'), s('db', 'on-call: কেউ না ✕', 'bad')] },
      { text: 'সমাধান: যে সারিগুলো দেখে সিদ্ধান্ত, সেগুলো FOR UPDATE দিয়ে আটকানো, বা serializable isolation।', ev: [s('db', 'B অপেক্ষা করে, আবার গোনে: ১ জন → ছুটি নয় ✓', 'ok')] },
    ],
    takeaway: 'আলাদা সারি লিখলেও সিদ্ধান্ত একই data-র ওপর হলে সংঘাত; সেই সারিগুলো আটকান বা serializable নিন।',
  },
  {
    id: 'readskew', title: 'Read skew: দুই সময়ের মিশ্রণ', gist: 'লম্বা report চলার মাঝে টাকা সরলে মোট অঙ্ক ভুল আসে।',
    levels: [20, 26], note: 'transactions', ref: D(8, 'Snapshot Isolation and Repeatable Read', 293, 298),
    lanes: lanes(['r', 'Report'], ['db', 'DB'], ['t', 'Transfer']),
    steps: [
      { text: 'Hub-এর নগদ ৳১,০০০, ব্যাংকে ৳০। মোট ৳১,০০০।', ev: [s('db', 'hub ৳১,০০০ · bank ৳০')] },
      { text: 'দিনশেষের report hub-এর নগদ পড়ল।', ev: [m('r', 'db', 'hub?'), m('db', 'r', '৳১,০০০')] },
      { text: 'এর মধ্যে ৳৫০০ ব্যাংকে জমা হলো, transaction commit।', ev: [m('t', 'db', 'hub −৫০০, bank +৫০০'), s('db', 'hub ৳৫০০ · bank ৳৫০০', 'ok')] },
      { text: 'Report এবার ব্যাংক পড়ল।', predict: { q: 'Read committed-এ report মোট কত দেখাবে?', options: ['৳১,৫০০ (ভুল)', '৳১,০০০', '৳৫০০', '৳০'], explain: 'Hub-এর মান পুরনো (১,০০০), ব্যাংকেরটা নতুন (৫০০): দুই সময়ের মিশ্রণ।' },
        ev: [m('r', 'db', 'bank?'), m('db', 'r', '৳৫০০'), s('r', 'মোট ৳১,৫০০ ✕', 'bad')] },
      { text: 'সমাধান: snapshot isolation। পুরো report শুরুর মুহূর্তের ছবি দেখে।', ev: [s('r', 'মোট ৳১,০০০ ✓', 'ok')] },
    ],
    takeaway: 'লম্বা পড়া (report, backup) snapshot isolation-এ চালান, যাতে পুরোটা একই মুহূর্তের ছবি।',
  },
  {
    id: 'twopc', title: 'Two-phase commit আর আটকে থাকা', gist: 'দুই DB-তে একসাথে commit, আর coordinator মাঝপথে মরলে কী হয়।',
    levels: [22, 27], note: 'transactions', ref: D(8, 'Two-Phase Commit', 324, 327),
    lanes: lanes(['c', 'Coordinator'], ['bk', 'Booking DB'], ['pay', 'Payment DB']),
    steps: [
      { text: 'Phase ১: coordinator দুজনকেই জিজ্ঞেস করল "commit করতে পারবে?"', ev: [m('c', 'bk', 'prepare?'), m('c', 'pay', 'prepare?')] },
      { text: 'দুজনেই প্রস্তুত, আর কথা দিল: এখন থেকে নিজে বাতিল করবে না। Lock ধরে রাখল।', ev: [m('bk', 'c', 'হ্যাঁ'), m('pay', 'c', 'হ্যাঁ'), s('bk', 'prepared · lock', 'warn'), s('pay', 'prepared · lock', 'warn')] },
      { text: 'Coordinator সিদ্ধান্ত নিজের log-এ লিখল: commit।', ev: [s('c', 'সিদ্ধান্ত: commit (log-এ)', 'ok')] },
      { text: 'Phase ২: booking-কে commit পাঠাল।', ev: [m('c', 'bk', 'commit'), s('bk', 'commit ✓', 'ok')] },
      { text: 'Payment-কে পাঠানোর আগেই coordinator crash।', ev: [s('c', '✕ crash', 'bad')] },
      { text: 'Payment DB অপেক্ষা করছে।', predict: { q: 'Payment DB কি নিজে commit বা abort করতে পারে?', options: ['না: সিদ্ধান্তের অপেক্ষায় lock ধরে বসে থাকে', 'হ্যাঁ, নিরাপদ বলে abort করে', 'হ্যাঁ, অনুমান করে commit করে', 'নিজের মতো ভোট দিয়ে ঠিক করে'], explain: 'Prepared অবস্থায় সে কথা দিয়েছে; coordinator-এর সিদ্ধান্ত ছাড়া কিছু করতে পারে না (in doubt)।' },
        ev: [s('pay', 'in doubt · lock আটকে', 'bad')] },
      { text: 'Coordinator ফিরে log দেখে বাকিটা শেষ করল।', ev: [s('c', 'ফিরে এল, log: commit', 'ok'), m('c', 'pay', 'commit'), s('pay', 'commit ✓', 'ok')] },
    ],
    takeaway: '2PC নিরাপদ, কিন্তু coordinator আটকালে সবাই lock ধরে বসে থাকে; তাই অনেক জায়গায় saga।',
  },
  {
    id: 'outbox', title: 'Dual write থেকে outbox', gist: 'DB আর Kafka দুই জায়গায় লেখা, মাঝে crash, আর outbox দিয়ে সমাধান।',
    levels: [10, 29, 30], note: 'streams', ref: D(12, 'Change Data Capture', 503, 507),
    lanes: lanes(['o', 'Order service'], ['db', 'DB'], ['rl', 'Relay'], ['k', 'Kafka']),
    steps: [
      { text: 'Order service DB-তে order লিখল।', ev: [m('o', 'db', 'order লেখো'), s('db', 'order ✓', 'ok')] },
      { text: 'Kafka-তে "order created" পাঠানোর আগেই crash।', ev: [s('o', '✕ crash', 'bad')] },
      { text: 'এখন অবস্থা কী?', predict: { q: 'Order আর event-এর কী অবস্থা?', options: ['Order আছে, event নেই: SMS যাবে না', 'দুটোই আছে', 'দুটোই নেই', 'Event আছে, order নেই'], explain: 'দুই আলাদা জায়গার লেখা একসাথে হয়নি; কেউ জানে না order এসেছে।' },
        ev: [s('k', 'কিছুই আসেনি ✕', 'bad')] },
      { text: 'Outbox: একই DB transaction-এ order আর outbox সারি।', ev: [m('o', 'db', 'order + outbox (এক transaction)'), s('db', 'order ✓ · outbox ✓', 'ok')] },
      { text: 'Relay outbox পড়ে Kafka-তে পাঠায়।', ev: [m('rl', 'db', 'নতুন outbox?'), m('db', 'rl', 'order created'), m('rl', 'k', 'order created'), s('k', 'event ✓', 'ok')] },
      { text: 'Relay পাঠাল, কিন্তু "পাঠানো হয়েছে" চিহ্ন দেওয়ার আগে crash।', predict: { q: 'Relay ফিরে এলে কী হবে?', options: ['আবার পাঠাবে: consumer-কে duplicate ফেলতে হবে', 'Event হারাবে', 'Order মুছে যাবে', 'Kafka বন্ধ হবে'], explain: 'Outbox at-least-once দেয়; তাই consumer event ID দেখে duplicate ফেলে।' },
        ev: [m('rl', 'k', 'order created (আবার)', 'late'), s('k', 'duplicate → consumer ID দেখে বাদ', 'warn')] },
    ],
    takeaway: 'DB আর event একই transaction-এ (outbox বা CDC); পাঠানো at-least-once, consumer idempotent।',
  },
  {
    id: 'eventtime', title: 'Event time বনাম processing time', gist: 'দেরিতে পৌঁছানো ঘটনা কোন মিনিটে গুনবেন।',
    levels: [21], note: 'streams', ref: D(12, 'Reasoning About Time', 518, 522),
    lanes: lanes(['ph', 'Rider phone'], ['st', 'Stream'], ['ct', 'প্রতি মিনিটের গণনা']),
    steps: [
      { text: '১০:০০:৫০-এ hub-এ scan হলো, কিন্তু phone-এ network নেই; scan জমা রইল।', ev: [s('ph', 'scan ১০:০০:৫০ · offline', 'warn')] },
      { text: '১০:০১:৩০-এ network এল, phone পাঠাল।', ev: [m('ph', 'st', 'scan (ঘটেছে ১০:০০:৫০)', 'late')] },
      { text: 'Counter গুনবে।', predict: { q: 'Server-এর সময় (processing time) ধরে গুনলে scan-টা কোন মিনিটে পড়বে?', options: ['১০:০১ (ভুল মিনিট)', '১০:০০', 'কোনোটাতেই না', 'দুটোতেই'], explain: 'Server পেয়েছে ১০:০১-এ, কিন্তু ঘটেছে ১০:০০-এ।' },
        ev: [m('st', 'ct', 'গোনো'), s('ct', '১০:০১ +১ ✕', 'bad')] },
      { text: 'Event time ধরে গুনলে, আর window কিছুক্ষণ খোলা রাখলে (watermark ২ মিনিট):', ev: [s('ct', '১০:০০ +১ ✓', 'ok')] },
      { text: '১০ মিনিট দেরিতে আরেকটা scan এল।', predict: { q: 'Watermark ২ মিনিট। এখন কী করবেন?', options: ['বাদ দেওয়া বা আলাদা সংশোধন হিসেবে লেখা', 'চলতি window-এ গুনে ফেলা', 'পুরো stream থামানো', 'সব window আবার শুরু'], explain: 'কতক্ষণ অপেক্ষা করবেন তা নির্ভুলতা বনাম দেরির ভারসাম্য; তার পরের গুলো সংশোধন হিসেবে।' },
        ev: [m('ph', 'st', 'scan (১০ মিনিট দেরি)', 'late'), s('ct', 'দেরির event → সংশোধন', 'warn')] },
    ],
    takeaway: 'ঘটনা কখন ঘটেছে সেটাই গুনুন; দেরিতে আসা event-এর জন্য watermark আর সংশোধনের নিয়ম রাখুন।',
  },
  {
    id: 'compat', title: 'পুরনো code, নতুন field', gist: 'Rolling deploy-এর সময় পুরনো server অচেনা field মুছে ফেলতে পারে।',
    levels: [15, 29], note: 'encoding', ref: D(5, 'Dataflow Through Databases', 178, 179),
    lanes: lanes(['v2', 'Server v2 (নতুন)'], ['db', 'DB'], ['v1', 'Server v1 (পুরনো)']),
    steps: [
      { text: 'Deploy চলছে: কিছু server নতুন, কিছু পুরনো। v2 নতুন field landmark সহ ঠিকানা লিখল।', ev: [m('v2', 'db', '{ঠিকানা, landmark}'), s('db', 'সারিতে landmark আছে', 'ok')] },
      { text: 'v1 একই সারি পড়ল।', ev: [m('v1', 'db', 'পড়ো'), m('db', 'v1', '{ঠিকানা, landmark}')] },
      { text: 'v1 landmark চেনে না; সে ঠিকানা বদলে সারিটা আবার লিখবে।', predict: { q: 'কী হতে পারে?', options: ['landmark মুছে যায়, যদি v1 অচেনা field ফেলে দেয়', 'কিছুই হয় না, সবসময় নিরাপদ', 'v1 crash করে', 'landmark দুবার হয়ে যায়'], explain: 'পুরনো code নিজের জানা field দিয়ে object বানিয়ে লিখলে অচেনা field হারায়।' },
        ev: [m('v1', 'db', '{নতুন ঠিকানা}'), s('db', 'landmark হারাল ✕', 'bad')] },
      { text: 'সমাধান: অচেনা field রেখে দেওয়া (forward compatibility), নতুন field optional আর default সহ।', ev: [s('v1', 'অচেনা field অক্ষত রাখে', 'ok'), m('v1', 'db', '{নতুন ঠিকানা, landmark}'), s('db', 'দুটোই আছে ✓', 'ok')] },
    ],
    takeaway: 'পুরনো আর নতুন code একসাথে চলবে ধরে নিন: নতুন field optional, অচেনা field অক্ষত রাখা।',
  },
];

export const timelinesById: Record<string, Timeline> = Object.fromEntries(timelines.map((t) => [t.id, t]));
export const timelinesForLevel = (id: number) => timelines.filter((t) => t.levels.includes(id));
export const timelinesForNote = (id: string) => timelines.filter((t) => t.note === id);
