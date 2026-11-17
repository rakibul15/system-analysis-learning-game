import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const transactions: Note = {
  id: 'transactions',
  title: 'Transaction: সব হবে, নয়তো কিছুই না',
  gist: 'কয়েকটা লেখাকে এক প্যাকেটে বাঁধা, যাতে মাঝপথে crash বা একসাথে দুজন লিখলেও data গোলমাল না হয়।',
  levels: [4, 22, 26, 27],
  angles: {
    xu: 'Hotel booking, payment, wallet design-এ কোথায় lock, কোথায় idempotency, কোথায় saga',
    ddia: 'ACID আসলে কী কথা দেয়, isolation-এর স্তরগুলো কোন কোন race আটকায় আর কোনগুলো আটকায় না',
  },
  blocks: [
    { kind: 'h', text: 'কেন লাগে' },
    { kind: 'p', text: 'COD আদায় হলে দুটো লেখা: rider-এর হিসাব থেকে বিয়োগ, merchant-এর হিসাবে যোগ। প্রথমটার পরে server crash করলে টাকা কোথাও নেই। আবার একই slot দুজন একসাথে book করলে দুজনেই "খালি" দেখে। Transaction এই দুই ঝামেলা থেকে বাঁচায়: হয় সব লেখা থাকবে, নয় একটাও না; আর একসাথে চলা কাজগুলো একে অপরকে গুলিয়ে দেবে না।' },
    { kind: 'figs', book: 'ddia2', chapter: 8, items: [
      { n: '8-1', page: 282, look: 'দুজন একসাথে counter বাড়াল, একটা বাড়ানো হারাল' },
      { n: '8-3', page: 285, look: 'মাঝপথে ব্যর্থ হলে আগের লেখাগুলোও বাতিল' },
    ] },

    { kind: 'h', text: 'ACID চার অক্ষরে' },
    { kind: 'table', head: ['অক্ষর', 'মানে', 'ParcelGo-তে'], rows: [
      ['A: Atomicity', 'সব লেখা হবে অথবা কোনোটাই না; ব্যর্থ হলে নিরাপদে আবার চেষ্টা', 'Debit আর credit দুটোই, নয়তো কোনোটাই না'],
      ['C: Consistency', 'App-এর নিয়ম (যেমন মোট debit = মোট credit) ঠিক থাকা; এটা মূলত app-এর দায়িত্ব', 'Ledger সবসময় মেলে'],
      ['I: Isolation', 'একসাথে চলা transaction যেন একে অপরের অর্ধেক কাজ না দেখে', 'দুজন একসাথে শেষ slot নিতে পারবে না'],
      ['D: Durability', 'Commit হলে crash-এও হারাবে না', '"পেমেন্ট সফল" বললে সেটা থাকবে'],
    ] },
    { kind: 'tip', title: '"Consistency" দুই জায়গায় দুই মানে', text: 'ACID-এর C মানে app-এর নিয়ম রক্ষা। Replication বা CAP-এর consistency মানে সব কপি একই মান দেখায় কিনা। Interview-এ গুলিয়ে ফেলবেন না।' },

    { kind: 'h', text: 'Isolation-এর স্তর আর কোন race কোনটা আটকায়' },
    { kind: 'table', head: ['স্তর', 'আটকায়', 'আটকায় না'], rows: [
      ['Read committed', 'অন্যের commit না হওয়া লেখা পড়া (dirty read), অন্যের অসমাপ্ত লেখা মুছে ফেলা', 'একই transaction-এ দুইবার পড়ায় দুই রকম মান'],
      ['Snapshot isolation', 'উপরেরগুলো, আর পুরো transaction একটা স্থির ছবি দেখে', 'Write skew: দুজন আলাদা সারি লিখে একসাথে নিয়ম ভাঙে'],
      ['Serializable', 'সব, যেন একটার পর একটা চলেছে', 'কিছু না, তবে দাম বেশি: ধীর বা বেশি abort'],
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 8, items: [
      { n: '8-6', page: 294, look: 'Read skew: মাঝপথে দেখা হিসাব মেলে না' },
      { n: '8-7', page: 296, look: 'Snapshot: প্রতিটা transaction নিজের সময়ের version দেখে' },
    ] },

    { kind: 'h', text: 'Lost update: সবচেয়ে সাধারণ ফাঁদ' },
    { kind: 'story', title: 'Wallet-এ দুটো COD একসাথে', steps: [
      'Merchant-এর balance ৳৫০০।',
      'দুটো delivery একসাথে শেষ: দুটো request-ই ৳৫০০ পড়ল।',
      'একটা লিখল ৳৭০০ (+২০০), আরেকটা লিখল ৳৬০০ (+১০০)।',
      'শেষে balance ৳৬০০: ৳২০০ উধাও।',
    ], fix: 'পড়ে-বদলে-লেখা না করে DB-কে বলুন নিজে যোগ করতে (UPDATE … SET balance = balance + 200), অথবা SELECT … FOR UPDATE দিয়ে সারি আটকান, অথবা version মিলিয়ে লিখুন (না মিললে আবার চেষ্টা)।' },

    { kind: 'h', text: 'Write skew: আলাদা সারি, তবু সংঘাত' },
    { kind: 'story', title: 'শেষ rider-কে ছুটি', steps: [
      'নিয়ম: প্রতিটা hub-এ রাতে অন্তত একজন rider on-call।',
      'দুজন on-call rider একসাথে ছুটির আবেদন করল।',
      'দুটো transaction-ই দেখল "আরও একজন আছে", তাই যার যার নিজের সারি বদলাল।',
      'দুজনেই ছুটিতে; hub-এ কেউ নেই। কেউ একই সারি লেখেনি, তাই lost update-এর পাহারা কাজ করেনি।',
    ], fix: 'যে সারিগুলোর ওপর সিদ্ধান্ত নিচ্ছেন সেগুলো FOR UPDATE দিয়ে আটকান, অথবা serializable isolation, অথবা নিয়মটা এমন একটা সারিতে আনুন যেটা দুজনকেই লিখতে হয়।' },
    { kind: 'figs', book: 'ddia2', chapter: 8, items: [
      { n: '8-8', page: 304, look: 'দুজনের আলাদা লেখা মিলে নিয়ম ভাঙা' },
    ] },
    { kind: 'says', topic: 'একসাথে দুজন একই জিনিস চাইলে',
      xu: { text: 'Hotel booking design-এ pessimistic lock, optimistic lock (version নম্বর) আর DB constraint পাশাপাশি তুলনা; ভিড় কম হলে optimistic ভালো, ভিড় বেশি হলে retry-এর ঢল। দুবার booking আটকাতে idempotency key।', ref: { book: 'xu2', chapter: 7 } },
      ddia: { text: 'কোন isolation স্তর কোন race আটকায় তার পুরো মানচিত্র: dirty read থেকে write skew আর phantom পর্যন্ত, আর serializable পাওয়ার তিন পথ (একটার পর একটা চালানো, two-phase locking, serializable snapshot isolation)।', ref: { book: 'ddia2', chapter: 8, section: 'Weak Isolation Levels', pages: [288, 307] } } },

    { kind: 'h', text: 'কয়েকটা service জুড়ে transaction' },
    { kind: 'p', text: 'Slot booking এক service-এ, payment আরেকটায়, আলাদা DB। Two-phase commit (2PC): একজন coordinator আগে সবাইকে "তৈরি?" জিজ্ঞেস করে, সবাই হ্যাঁ বললে তবেই commit। সমস্যা: coordinator মাঝপথে আটকালে বাকিরা lock ধরে বসে থাকে। Saga: ধাপে ধাপে commit, কোনো ধাপ ব্যর্থ হলে আগের ধাপগুলো উল্টো ধাপ দিয়ে বাতিল। Saga-য় lock নেই, কিন্তু মাঝের অবস্থা অন্যরা দেখতে পায়।' },
    { kind: 'figs', book: 'ddia2', chapter: 8, items: [
      { n: '8-12', page: 324, look: 'কয়েক node-এ লেখা: কেউ commit করল, কেউ করল না' },
      { n: '8-13', page: 325, look: 'Two-phase commit: আগে prepare, তারপর commit' },
    ] },
    { kind: 'says', topic: 'টাকা কয়েক জায়গায় নড়লে',
      xu: { text: 'Payment আর wallet design-এ: double-entry ledger, PSP-তে retry-এর জন্য idempotency key, দিনশেষে reconciliation, আর কয়েক service জুড়ে 2PC, TC/C ও saga-র তুলনা।', ref: { book: 'xu2', chapter: 12 } },
      ddia: { text: '2PC কীভাবে কাজ করে আর কেন coordinator-এর ব্যর্থতা এত ভোগায়; বিভিন্ন system জুড়ে transaction-এর বদলে log আর idempotency দিয়ে exactly-once প্রভাব পাওয়ার যুক্তি।', ref: { book: 'ddia2', chapter: 8, section: 'Distributed Transactions', pages: [323, 334] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"Debit আর credit এক DB transaction-এ; balance সারি একই transaction-এ বাড়বে, পড়ে-বদলে-লেখা না।"',
      '"Slot-এ ভিড় কম তাই optimistic lock; flash sale হলে DB-তে সরাসরি শর্তযুক্ত UPDATE আর constraint।"',
      '"Booking আর payment আলাদা service, তাই saga; প্রতিটা ধাপের উল্টো ধাপ আর idempotency key।"',
    ] },
    { kind: 'mistakes', items: [
      '"Transaction আছে, তাই race নেই" ভাবা: বেশিরভাগ DB-র default isolation write skew আটকায় না।',
      'App-এ SELECT করে দেখে তারপর INSERT: দুজন একসাথে করলে দুজনেই পার পায়। Unique constraint দিন।',
      'Transaction-এর ভেতরে বাইরের API call (SMS, PSP): lock অনেকক্ষণ ধরা থাকে, আর rollback-এ SMS ফেরত আসে না।',
      '2PC-কে নিখুঁত ভাবা: coordinator আটকালে সবাই আটকে।',
    ] },
    { kind: 'check', items: [
      { q: 'Balance ৳৫০০, দুটো +৳১০০ একসাথে পড়ে-বদলে-লিখল। শেষে কত, আর কেন?', a: '৳৬০০, ৳৭০০ হওয়ার কথা। দুজনেই ৫০০ পড়েছে, একজনের লেখা আরেকজনেরটা মুছে দিয়েছে (lost update)।' },
      { q: 'Snapshot isolation-এ কোন সমস্যা থেকে যায়?', a: 'Write skew: দুজন আলাদা সারি লিখে মিলে একটা নিয়ম ভাঙে।' },
      { q: 'Saga আর 2PC-র মূল লেনদেন কী?', a: '2PC-তে isolation আছে কিন্তু coordinator আটকালে lock আটকে থাকে। Saga-য় lock নেই, কিন্তু মাঝের অবস্থা দেখা যায় আর উল্টো ধাপ লিখতে হয়।' },
      { q: 'Transaction-এর ভেতরে SMS পাঠানো কেন খারাপ?', a: 'SMS ধীর বলে lock অনেকক্ষণ ধরা থাকে, আর transaction বাতিল হলেও SMS ফেরত আনা যায় না।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 8, pages: [277, 344] },
    { book: 'xu2', chapter: 7 },
    { book: 'xu2', chapter: 11 },
  ],
  refs: [
    { book: 'xu2', chapter: 7 },
    { book: 'xu2', chapter: 11 },
    { book: 'xu2', chapter: 12 },
    { book: 'ddia2', chapter: 8, section: 'The Meaning of ACID', pages: [279, 283] },
    { book: 'ddia2', chapter: 8, section: 'Preventing Lost Updates', pages: [299, 302] },
    { book: 'ddia2', chapter: 8, section: 'Write Skew and Phantoms', pages: [303, 307] },
    { book: 'ddia2', chapter: 8, section: 'Two-Phase Commit', pages: [324, 327] },
  ],
};
