import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 8 (Transactions), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-8',
  goals: [
    'ACID-এর চার অক্ষরের আসল মানে, আর কোনটা database দেয়, কোনটা app-কে দিতে হয় বলতে পারবেন।',
    'Dirty read, lost update, write skew আর phantom: কোন isolation level কোনটা আটকায় আর কোনটা আটকায় না ব্যাখ্যা করতে পারবেন।',
    'Serializability-র তিন পথ (serial execution, two-phase locking, SSI) আর distributed transaction-এর দাম (two-phase commit) বলতে পারবেন।',
  ],
  related: ['transactions'],
  blocks: [
    { kind: 'p', text: 'একটা কাজে একাধিক পরিবর্তন লাগে: টাকা কাটা, order বসানো, stock কমানো। মাঝপথে কিছু ভাঙলে? দুটো একসাথে চলল আর একটা অন্যের মাঝে ঢুকে পড়ল? Transaction এই সব দুশ্চিন্তা database-এর ঘাড়ে দেয়: কয়েকটা পড়া-লেখাকে একটা ঘরে বেঁধে বলা, "সব হবে, নয়তো কিছুই না।" প্রায় সব সমস্যা এখানে আসে একসাথে চলা কাজের ছোঁয়াছুঁয়ি থেকে।' },

    { kind: 'h', text: 'ACID-এর আসল মানে' },
    { kind: 'table', head: ['অক্ষর', 'দাবি', 'কথাটা কার দায়'], rows: [
      ['Atomicity', 'মাঝপথে ভাঙলে সব ফেরত (abort), আধা কাজ থাকে না', 'Database'],
      ['Consistency', 'নিজের নিয়ম বজায় থাকা (যেমন মোট টাকা মেলে)', 'আসলে app-এর দায়; database শুধু সাহায্য করে (constraint)'],
      ['Isolation', 'একসাথে চলা কাজ যেন একে অন্যকে দেখে না, যেন একটার পর একটা চলল', 'Database, তবে কতটা কড়া তা বাছা যায়'],
      ['Durability', 'commit হলে crash-এও হারায় না', 'Database (disk-এ লিখে, বা অনেক replica-য়)'],
    ] },
    { kind: 'p', text: '"ACID" নামটা প্রায়ই মার্কেটিংয়ের মতো ব্যবহার হয়: দুটো database দুজনেই ACID বললেও isolation-এর গ্যারান্টি আলাদা হতে পারে। তাই নাম নয়, কোন সমস্যা আটকায় তা দেখুন।' },

    { kind: 'h', text: 'Weak isolation: কোন ভুলটা আটকায়' },
    { kind: 'p', text: 'সবচেয়ে শক্ত isolation (serializable) ধীর। তাই বেশিরভাগ database ডিফল্টে একটু দুর্বল স্তর দেয়। দুর্বল স্তরে কোন ভুলগুলো সম্ভব তা জানাই কাজের কথা।' },
    { kind: 'seq', label: 'Dirty read: commit-এর আগের মান দেখে ফেলা', actors: ['Transaction ক', 'Database', 'Transaction খ'], steps: [
      { from: 0, to: 1, msg: 'balance = ৫০০ লিখলাম (এখনো commit নয়)' },
      { from: 2, to: 1, msg: 'balance পড়ি' },
      { from: 1, to: 2, msg: '৫০০', tone: 'bad', note: 'Uncommitted মান: ক যদি abort করে, খ একটা কখনো না-থাকা মান দেখে ফেলেছে।' },
      { from: 0, to: 1, msg: 'ভুল হয়েছে, abort', note: 'Read committed স্তর এটা আটকায়: শুধু commit-করা মান দেখায়।' },
    ] },
    { kind: 'list', items: [
      'Read committed: কখনো uncommitted লেখা (dirty read) বা অন্যের আধা-লেখা (dirty write) দেখে না। সাধারণ ডিফল্ট।',
      'Snapshot isolation (প্রায় repeatable read): transaction শুরুতে একটা স্থির ছবি দেখে, চলার সময় অন্যের commit-ও তাকে নড়ায় না। দীর্ঘ পড়া (backup, analytics) সামঞ্জস্যপূর্ণ ফল পায়। এখানেও কিছু ভুল বাকি থাকে (নিচে)।',
    ] },

    { kind: 'h', text: 'Lost update' },
    { kind: 'p', text: 'দুই transaction একই মান পড়ে, বদলে, ফেরত লেখে। দ্বিতীয়জনের লেখা প্রথমজনের পরিবর্তন মুছে দেয়। যেমন counter পড়ে, ১ যোগ করে, লেখা: দুজন একসাথে করলে দুটো যোগ হলেও শেষে মান বাড়ে মাত্র ১।' },
    { kind: 'seq', label: 'Lost update: দুজন একসাথে stock কমাচ্ছে (২০ থেকে)', actors: ['Cashier ক', 'Stock = ২০', 'Cashier খ'], steps: [
      { from: 0, to: 1, msg: 'পড়ি: ২০' },
      { from: 2, to: 1, msg: 'পড়ি: ২০' },
      { from: 0, to: 1, msg: 'লিখি: ২০ − ১ = ১৯' },
      { from: 2, to: 1, msg: 'লিখি: ২০ − ১ = ১৯', tone: 'bad', note: 'দুটো বিক্রি হলো, stock কমল মাত্র ১। একটা হারিয়ে গেল।' },
    ] },
    { kind: 'list', items: [
      'Atomic operation: "stock = stock − ১" এক ধাপে, database নিজে পড়া-বদলানো-লেখা করে। যেখানে চলে, এটাই সবচেয়ে সরল।',
      'Explicit lock (SELECT … FOR UPDATE): পড়ার সময়ই সারিটা আটকে দেওয়া, যাতে দ্বিতীয়জন অপেক্ষা করে।',
      'Compare-and-set: "লিখব, যদি এখনো মান ২০ থাকে"। না থাকলে আবার চেষ্টা। কিছু database lost update নিজেই ধরে ফেলে, কিছু ধরে না: জেনে নিন।',
    ] },

    { kind: 'h', text: 'Write skew আর phantom' },
    { kind: 'p', text: 'আরও সূক্ষ্ম: দুই transaction একই শর্ত পড়ে, ভিন্ন সারি বদলায়, আর একসাথে মিলে নিয়ম ভাঙে। কোনো একটা সারি দুজনেই বদলায়নি, তাই lost update ধরা পড়ে না। এটাই write skew।' },
    { kind: 'seq', label: 'Write skew: অন-ডিউটি রাইডার অন্তত একজন থাকতেই হবে', actors: ['রাইডার ক', 'Database (২ জন অন-ডিউটি)', 'রাইডার খ'], steps: [
      { from: 0, to: 1, msg: 'অন-ডিউটি কয়জন? (২)' },
      { from: 2, to: 1, msg: 'অন-ডিউটি কয়জন? (২)' },
      { from: 0, to: 1, msg: '২ আছে, তাই আমি ছুটি নিই: নিজের সারি বদলাই' },
      { from: 2, to: 1, msg: '২ আছে, তাই আমিও ছুটি নিই: নিজের সারি বদলাই', tone: 'bad', note: 'দুজন ভিন্ন সারি বদলাল, তাই কেউ কাউকে আটকায়নি। এখন অন-ডিউটি শূন্য।' },
    ] },
    { kind: 'p', text: 'Phantom: একটা পড়ার ফল ("এই সময়ে কোনো বুকিং নেই") অন্যের নতুন সারি যোগে মিথ্যা হয়ে যায়, আর আটকানোর মতো কোনো আগের সারিই নেই। সমাধানের একটা ধারা: শর্ত নিজেই একটা সারি বানিয়ে আটকানো (materializing conflicts); কিন্তু সবচেয়ে ভালো পথ শক্ত isolation।' },
    { kind: 'table', head: ['Isolation', 'Dirty read', 'Lost update', 'Write skew / phantom'], rows: [
      ['Read committed', 'আটকায়', 'আটকায় না', 'আটকায় না'],
      ['Snapshot isolation', 'আটকায়', 'কোথাও ধরে, কোথাও না', 'আটকায় না'],
      ['Serializable', 'আটকায়', 'আটকায়', 'আটকায়'],
    ] },

    { kind: 'h', text: 'Serializability: তিন পথ' },
    { kind: 'p', text: 'Serializable মানে ফল এমন, যেন transaction-গুলো একটার পর একটা চলেছে, যদিও আসলে সমান্তরালে। তিন উপায়।' },
    { kind: 'list', items: [
      'Actual serial execution: সত্যিই একটার পর একটা, এক thread-এ। সম্ভব হলো কারণ memory সস্তা আর transaction ছোট। শর্ত: transaction-এর সব কোড আগে থেকে stored procedure-এ দেওয়া, মাঝপথে user-এর অপেক্ষা নয়। এক CPU-র গতিতে সীমিত; shard করলে বাড়ে।',
      'Two-phase locking (2PL): পড়তে হলে lock, লিখতে হলে একচেটিয়া lock, আর commit পর্যন্ত ছাড়া নয়। পড়া-লেখা একে অন্যকে আটকায়। নিরাপদ, কিন্তু ধীর, আর deadlock হয় (দুজন একে অন্যের lock-এর অপেক্ষায়; database একজনকে abort করে)।',
      'Serializable snapshot isolation (SSI): আশাবাদী। সবাই snapshot-এ এগোয় (lock ছাড়া), আর commit-এর সময় ধরে দেখে অন্যের সাথে এমন সম্পর্ক হলো কি না যাতে নিয়ম ভাঙে। হলে abort। পড়া লেখাকে আটকায় না, তাই দ্রুত, তবে বেশি দ্বন্দ্বে বহু abort।',
    ] },
    { kind: 'tip', title: 'কোনটা বাছবেন', text: 'দ্বন্দ্ব কম হলে আশাবাদী পথ (SSI) ভালো; দ্বন্দ্ব বেশি হলে lock-এ অপেক্ষা abort-আর-আবার-চালানোর চেয়ে সস্তা হতে পারে। আর সবচেয়ে সস্তা প্রশ্ন: আমার কি সত্যিই serializable লাগছে, নাকি এই এক জায়গায় একটা atomic operation বা lock-ই যথেষ্ট?' },

    { kind: 'h', text: 'Distributed transaction আর two-phase commit' },
    { kind: 'p', text: 'যদি transaction-এ একাধিক node বা database ছোঁয়? সবাইকে একমত হতে হবে: সবাই commit বা সবাই abort। Two-phase commit (2PC): প্রথমে coordinator সবাইকে জিজ্ঞেস করে "তৈরি?" (prepare)। সবাই হ্যাঁ বললে সে "commit" বলে। এক "না" হলে "abort"। বিপদ: হ্যাঁ বলার পর কেউ আর পিছু হটতে পারে না। তখন coordinator ভাঙলে প্রশ্নকারীরা আটকা, lock ধরে ঝুলে থাকে।' },
    { kind: 'seq', label: 'Two-phase commit: coordinator ভাঙলে', actors: ['Coordinator', 'Payment DB', 'Order DB'], steps: [
      { from: 0, to: 1, msg: 'তৈরি? (prepare)' },
      { from: 0, to: 2, msg: 'তৈরি? (prepare)' },
      { from: 1, to: 0, msg: 'হ্যাঁ', tone: 'ok', note: 'এখন Payment DB আর পিছু হটতে পারে না, commit-এর অপেক্ষা।' },
      { from: 2, to: 0, msg: 'হ্যাঁ', tone: 'ok' },
      { from: 0, to: 0, msg: 'সিদ্ধান্ত লিখে রাখার আগেই crash', tone: 'bad', note: 'দুই DB-ই "in doubt": না পারে commit, না abort। Lock ধরে থাকে, coordinator ফেরা পর্যন্ত।' },
    ] },
    { kind: 'list', items: [
      'দাম: ধীর (অনেক round-trip আর disk-এ লেখা), আর coordinator একটা ভাঙার জায়গা। তাই অনেকে এড়ায়।',
      'Database-এর ভেতরের distributed transaction (এক database-এর অনেক shard) তুলনায় ভালো কাজ করে, কারণ সবাই একই software। ভিন্ন ভিন্ন system জুড়লে (database + message queue) আরও ভঙ্গুর।',
      'Exactly-once বার্তা প্রক্রিয়া: transaction-এ "বার্তা নেওয়া" আর "ফল লেখা" একসাথে বাঁধলে একবারের বেশি প্রভাব পড়ে না। অথবা বার্তা idempotent বানানো।',
    ] },

    { kind: 'story', title: 'দুই cashier আর শেষ ১টা stock', steps: [
      'ParcelGo-র দোকানে শেষ ১টা জিনিস, দুই cashier প্রায় একসাথে বিক্রি করলেন।',
      'দুজনই পড়লেন "stock = ১", দুজনই "stock = ০" লিখলেন, দুজনই "বিক্রি হয়েছে" পেলেন।',
      'একটা জিনিস, দুই ক্রেতা। একজনকে ফেরত টাকা দিতে হলো।',
    ], fix: 'পড়া-বদলানো-লেখা আলাদা না করে একটা atomic আপডেট: "stock = stock − ১ যেখানে stock > ০", আর আপডেটে কত সারি বদলাল দেখে সিদ্ধান্ত। না বদলালে বিক্রি নেই।' },

    { kind: 'mistakes', items: [
      '"ACID database" শুনে ধরে নেওয়া সব সমস্যা আটকাবে; ডিফল্ট isolation কত তা না দেখা।',
      'পড়ে-বদলে-লেখা: counter বা stock আপডেট app-এ করা, atomic operation না ব্যবহার করে।',
      'Write skew-কে lost update-এর মতো ভাবা: ভিন্ন সারি বদলালে ও সাধারণ আটকানো কাজ করে না।',
      'দূরের একাধিক system জুড়ে two-phase commit টানা, তার ঝুলে-থাকার ঝুঁকি না ভেবে।',
    ] },
    { kind: 'check', items: [
      { q: 'Atomicity মানে কী, আর কেন "সব বা কিছুই না" গুরুত্বপূর্ণ?', a: 'Transaction মাঝপথে ব্যর্থ হলে সব পরিবর্তন ফেরত যায়, আধা কাজ থাকে না। ফলে ব্যর্থতায় নিরাপদে আবার চেষ্টা করা যায়।' },
      { q: 'Read committed কী আটকায়, কী আটকায় না?', a: 'আটকায়: dirty read আর dirty write। আটকায় না: lost update, write skew আর phantom।' },
      { q: 'Write skew আর lost update-এর তফাত?', a: 'Lost update-এ দুজন একই সারি বদলায়। Write skew-তে দুজন একই শর্ত পড়ে কিন্তু ভিন্ন সারি বদলায়, তবু একসাথে নিয়ম ভাঙে। তাই সারি-ভিত্তিক সুরক্ষায় ধরা পড়ে না।' },
      { q: 'Two-phase commit-এ coordinator ভাঙলে কী হয়?', a: 'যারা prepare-এ হ্যাঁ বলেছে তারা আর পিছু হটতে পারে না, আবার commit-ও পায় না। Lock ধরে ঝুলে থাকে (in doubt), coordinator ফেরা পর্যন্ত।' },
    ] },
  ],
};
