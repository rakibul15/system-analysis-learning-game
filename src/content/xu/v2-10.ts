import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 10 (Real-time Gaming Leaderboard), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-10',
  goals: [
    'কেন SQL-এ "আমার র‍্যাংক কত" ধীর, আর Redis sorted set-এ সেটা কেন O(log n) বলতে পারবেন।',
    'ZADD, ZINCRBY, ZREVRANGE, ZREVRANK দিয়ে leaderboard-এর চার কাজ বলতে পারবেন।',
    'Memory কত লাগে হিসাব করতে পারবেন, আর ভাগ করার দুই উপায় (score-সীমা বনাম hash) তুলনা করতে পারবেন।',
  ],
  related: ['storage', 'sharding', 'caching'],
  blocks: [
    { kind: 'p', text: 'Leaderboard: খেলোয়াড়ের সাজানো তালিকা, সবার আগে সবচেয়ে বেশি নম্বর। দুটো প্রশ্ন সবসময় আসে: "শীর্ষ ১০ জন কারা?" আর "আমি কত নম্বরে?" ParcelGo-র উদাহরণ: rider-দের মাসিক প্রতিযোগিতা: সবচেয়ে বেশি সময়মতো delivery। নতুন নম্বর যোগ হয় সাথে সাথে, আর তালিকা ঝটপট বদলায়।' },
    { kind: 'list', items: [
      'খেলা শেষে নম্বর বাড়ে: প্রতিটা জেতার সাথে সাথে ঝট করে আপডেট।',
      'সব সময় চালু থাকা তালিকা: শীর্ষ ১০, নিজের র‍্যাংক, নিজের আশেপাশের ক্রম (ওপরে ৪, নিচে ৪ জন)।',
      'প্রতি মাসে নতুন মৌসুম: তালিকা শূন্য থেকে।',
      'পরিসর: ৫০ লাখ DAU, মাসে ২.৫ কোটি সক্রিয় খেলোয়াড়।',
    ] },

    { kind: 'h', text: 'সরল SQL কেন ধীর' },
    { kind: 'p', text: 'সরল table: (user, score)। শীর্ষ ১০: ORDER BY score DESC LIMIT 10, index দিয়ে দ্রুত। কিন্তু "আমার র‍্যাংক": আমার চেয়ে বেশি নম্বরওয়ালা কতজন গুনে দেখা: COUNT(*) WHERE score > আমার। Index থাকলেও সংখ্যা যত বড়, তত বেশি সারি পেরোতে হয়: গড়ে লাখ লাখ। প্রতি খেলার পরে সবার জন্য এটা অসম্ভব।' },
    { kind: 'calc', label: 'র‍্যাংক বের করতে ধাপ: SQL গোনা বনাম sorted set', inputs: [
      { id: 'n', label: 'খেলোয়াড়', min: 1000, max: 100_000_000, step: 1000, value: 25_000_000 },
    ], out: (v) => {
      const sql = v.n! / 2;
      const zs = Math.log2(v.n!) * 2;
      return [
        { label: 'SQL: গড়ে কত সারি গুনতে হয়', value: num(Math.round(sql)), how: 'মাঝামাঝি র‍্যাংকের খেলোয়াড়ের জন্য ~n/2', tone: 'bad', bar: Math.min(1, sql / 5_000_000) },
        { label: 'Sorted set: কত ধাপ (skip list)', value: num(Math.round(zs)), how: `~ ২ × log₂(${num(v.n!)}): প্রতিটা ধাপে অর্ধেকের বেশি বাদ`, tone: 'ok', bar: Math.min(1, zs / 5_000_000) },
        { label: 'ফারাক', value: `~${num(Math.round(sql / zs))} গুণ`, how: 'এই কারণেই leaderboard-এ Redis' },
      ];
    } },

    { kind: 'h', text: 'Redis sorted set' },
    { kind: 'p', text: 'Sorted set একটা memory-তে রাখা তালিকা যেখানে প্রতিটা সদস্যের একটা score। ভেতরে একটা skip list (তালিকার উপরে কয়েক স্তর, যাতে দ্রুত লাফিয়ে যাওয়া যায়) আর একটা hash table (সদস্য থেকে score দ্রুত)। কোনো সদস্য ঢোকালে বা নম্বর বদলালে তালিকা নিজেই সাজানো থাকে।' },
    { kind: 'table', head: ['কাজ', 'Redis command', 'খরচ'], rows: [
      ['নতুন খেলোয়াড় যোগ বা score বসানো', 'ZADD board:২০২৬-১১ ৫০ "rider_17"', 'O(log n)'],
      ['নম্বর বাড়ানো (জিতলে +১)', 'ZINCRBY board:২০২৬-১১ ১ "rider_17"', 'O(log n)'],
      ['শীর্ষ ১০', 'ZREVRANGE board:২০২৬-১১ ০ ৯ WITHSCORES', 'O(log n + ১০)'],
      ['আমার র‍্যাংক', 'ZREVRANK board:২০২৬-১১ "rider_17"', 'O(log n)'],
      ['আমার আশেপাশের ৪+৪', 'ZREVRANK দিয়ে নম্বর জেনে ZREVRANGE (র‍্যাংক−৪) (র‍্যাংক+৪)', 'O(log n + ৯)'],
    ] },
    { kind: 'seq', label: 'একটা জয়: নম্বর বাড়ানো থেকে নতুন র‍্যাংক', actors: ['Game server', 'Leaderboard service', 'Redis sorted set', 'Database'], steps: [
      { from: 0, to: 1, msg: 'rider_17 জিতেছে (+১)' },
      { from: 1, to: 2, msg: 'ZINCRBY board +১ rider_17', note: 'এক command-এ বাড়ানো আর নতুন জায়গায় বসানো।' },
      { from: 2, to: 1, msg: 'নতুন নম্বর: ৫১', tone: 'ok' },
      { from: 1, to: 2, msg: 'ZREVRANK rider_17', note: 'একই জায়গা থেকে র‍্যাংক।' },
      { from: 2, to: 1, msg: 'র‍্যাংক ৪,২০৩', tone: 'ok' },
      { from: 1, to: 3, msg: 'নম্বর স্থায়ীভাবে সংরক্ষণ (জয়ের রেকর্ড)', tone: 'ok', note: 'Redis memory-তে: restart-এ হারাতে পারে। তাই আসল তথ্য database-এও।' },
      { from: 1, to: 0, msg: '"আপনি ৪,২০৩ নম্বরে"', tone: 'ok' },
    ] },
    { kind: 'tip', title: 'Redis-এ ঠিক কী', text: 'Redis দ্রুত কিন্তু memory-র (restart-এ হারায়, যদিও snapshot আছে)। তাই আসল জয়ের রেকর্ড database-এ, আর Redis-এ তার সাজানো দৃশ্য। Redis গেলে database থেকে আবার বানানো যায়।' },

    { kind: 'calc', label: 'Memory কত লাগে', inputs: [
      { id: 'n', label: 'সক্রিয় খেলোয়াড়', min: 1, max: 200, step: 1, value: 25, unit: 'M' },
      { id: 'b', label: 'একজনের জন্য', min: 20, max: 200, step: 5, value: 70, unit: 'byte' },
    ], out: (v) => {
      const mem = v.n! * 1e6 * v.b!;
      return [
        { label: 'একটা মৌসুমের তালিকা', value: bytes(mem), how: `${num(v.n!)}M × ${num(v.b!)} byte (ID + score + skip list-এর বাড়তি)`, tone: mem < 64e9 ? 'ok' : 'bad', bar: Math.min(1, mem / 64e9) },
        { label: 'এক Redis server-এ ধরে?', value: mem < 64e9 ? 'হ্যাঁ, সহজে' : 'ভাগ লাগবে', how: 'এক server-এ কয়েক শো GB memory-ও পাওয়া যায়' },
      ];
    } },

    { kind: 'h', text: 'ভাগ করলে' },
    { kind: 'p', text: 'এক Redis-এ না ধরলে (বা read-write-এর ভিড় বেশি হলে) ডেটা ভাগ করতে হয়। দুই উপায়।' },
    { kind: 'table', head: ['', 'Score-সীমা ধরে (fixed partition)', 'Hash ধরে (hash partition)'], rows: [
      ['কীভাবে', 'শার্ড ১ = ০–১০০ নম্বর, শার্ড ২ = ১০১–২০০…', 'খেলোয়াড় ID-র hash থেকে শার্ড'],
      ['শীর্ষ ১০', 'সহজ: সবচেয়ে বড় সীমার শার্ডেই', 'কঠিন: প্রতি শার্ডের শীর্ষ ১০ এনে জুড়ে বাছা (scatter-gather)'],
      ['আমার র‍্যাংক', 'নিজের শার্ডে র‍্যাংক + উপরের সব শার্ডের মোট সংখ্যা', 'সবার র‍্যাংক জানতে সব শার্ড: ধীর'],
      ['নম্বর বদলালে', 'শার্ড বদল হতে পারে (সীমা পেরোলে)', 'শার্ড একই'],
      ['ভার', 'অসমান হতে পারে (বেশিরভাগ খেলোয়াড় মাঝামাঝি)', 'সমান'],
    ] },
    { kind: 'p', text: 'আসল র‍্যাংক সঠিকভাবে বলা সবসময় লাগে না: শীর্ষ ১০০০-এর বাইরে হলে "প্রায় শীর্ষ ১০%" বা "৩০ লাখের মধ্যে ~২০ লাখ" বললেই হয়। ঠিক সংখ্যা শুধু উপরের দিকে জরুরি।' },
    { kind: 'flow', label: 'Leaderboard service-এর সামনে cache আর পাশে database: জয় লেখে, পড়া Redis থেকে', nodes: [
      { id: 'g', label: 'Game server', x: 8, y: 17, w: 18 },
      { id: 'ls', label: 'Leaderboard service', x: 40, y: 17, w: 24 },
      { id: 'rd', label: 'Redis', sub: 'sorted set', x: 76, y: 6, w: 16 },
      { id: 'db', label: 'Database', sub: 'আসল রেকর্ড', x: 76, y: 28, w: 18 },
      { id: 'u', label: 'Player app', x: 90, y: 17, w: 18 },
    ], links: [
      { from: 'g', to: 'ls', rate: 3 }, { from: 'ls', to: 'rd', rate: 3 }, { from: 'ls', to: 'db', rate: 1.2 }, { from: 'u', to: 'ls', rate: 2, color: '#2f7de1' },
    ], h: 36 },
    { kind: 'list', items: [
      'নতুন মৌসুম: নতুন key (board:২০২৬-১২)। পুরোনোটা মুছে নয়, ইতিহাস হিসেবে database-এ।',
      'সমান নম্বর: কে আগে পেয়েছে সেটা ভাঙতে timestamp score-এর ভগ্নাংশে জুড়ে (বড় নম্বর, আগের সময়)।',
      'Redis গেলে: replica থেকে, বা database থেকে আবার সাজিয়ে। তাই "জয়" লেখা database-এও।',
      'শুধু নিজের বন্ধুদের মধ্যে র‍্যাংক: প্রতি user-এর বন্ধু-তালিকা থেকে ছোট তালিকা (ছোট sorted set) বা বন্ধুদের নম্বর এনে সাজানো।',
    ] },

    { kind: 'story', title: 'মাসের শেষে সবাই র‍্যাংক দেখে', steps: [
      'Rider-দের মাসিক তালিকা SQL-এ: প্রতিটা app খোলায় র‍্যাংকের COUNT query।',
      'মাসের শেষ দিন সবাই একসাথে র‍্যাংক দেখতে থাকল: database-এর CPU আকাশে।',
      'বাকি ParcelGo (order নেওয়া)-ও ধীর, কারণ একই database।',
    ], fix: 'Leaderboard আলাদা Redis sorted set-এ সরানো, আর database শুধু রেকর্ডের জন্য। র‍্যাংক পড়া O(log n), database ছোঁয় না।' },

    { kind: 'mistakes', items: [
      'র‍্যাংক বের করতে SQL-এ প্রতিবার COUNT।',
      'Redis-ই একমাত্র সত্য, database ছাড়া।',
      'Hash দিয়ে ভাগ করে "শীর্ষ ১০" সহজ ভাবা।',
      'সমান নম্বরের ক্রম ঠিক না করা।',
    ] },
    { kind: 'check', items: [
      { q: 'র‍্যাংক SQL-এ ধীর, Redis-এ দ্রুত কেন?', a: 'SQL-এ নিজের চেয়ে বেশি নম্বরের সারি গুনতে হয়: লাখ লাখ। Sorted set-এর skip list O(log n)-এ নেমে যায়।' },
      { q: 'আমার আশেপাশের ৪+৪ জন কীভাবে?', a: 'ZREVRANK দিয়ে আমার র‍্যাংক, তারপর ZREVRANGE (র‍্যাংক−৪) থেকে (র‍্যাংক+৪)।' },
      { q: 'Redis restart হলে কী?', a: 'Memory-র তালিকা হারাতে পারে। তাই আসল রেকর্ড database-এ, আর সেখান থেকে sorted set আবার বানানো যায়।' },
      { q: 'Score-সীমা ধরে ভাগ আর hash ধরে ভাগের মূল ফারাক?', a: 'Score-সীমায় শীর্ষ ১০ আর র‍্যাংক সহজ, কিন্তু ভার অসমান। Hash-এ ভার সমান, কিন্তু শীর্ষ ১০ বা র‍্যাংকে সব শার্ডে যেতে হয়।' },
    ] },
  ],
};
