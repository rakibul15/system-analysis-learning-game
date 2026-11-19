import { bytes, dur, num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 11 (Batch Processing), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-11',
  goals: [
    'Batch processing কী, কেন তা input অপরিবর্তনীয় রাখে, আর কেন এতে ভুল হলে আবার চালানো সহজ বলতে পারবেন।',
    'MapReduce আর আধুনিক dataflow engine-এ map, shuffle, reduce কীভাবে চলে, আর shuffle কেন সবচেয়ে ভারী ধাপ ব্যাখ্যা করতে পারবেন।',
    'Join আর group-by-এর কৌশল (sort-merge, broadcast) আর skew-এর সমস্যা বলতে পারবেন।',
  ],
  related: ['streams', 'storage'],
  blocks: [
    { kind: 'p', text: 'এ পর্যন্ত বেশিরভাগ আলাপ ছিল online system নিয়ে: একটা request এল, মুহূর্তে উত্তর। Batch processing উল্টো: অনেক data একসাথে নিয়ে কিছুক্ষণ ধরে কাজ চালিয়ে ফলাফল দেওয়া, কেউ বসে অপেক্ষা করছে না। যেমন রাতে সারাদিনের সব delivery থেকে প্রতি zone-এর report, বা পুরোনো সব order-এ নতুন নিয়মে হিসাব। মাপের একক এখানে throughput: ঘণ্টায় কত data।' },

    { kind: 'h', text: 'Unix থেকে শিক্ষা' },
    { kind: 'p', text: 'Log থেকে সবচেয়ে বেশি দেখা URL-এর তালিকা Unix-এ কয়েকটা ছোট command জুড়ে হয়: file পড়ো, একটা column কাটো, সাজাও, একই লাইন গোনো, আবার সাজাও, শীর্ষ দশটা নাও। শক্তির উৎস: প্রতিটা ছোট কাজ একটাই করে, input আর output সাধারণ text, আর ফল পরের হাতে চলে যায়। Input কখনো বদলায় না: কিছু ভুল হলে মুছে আবার চালান, কিছু নষ্ট হয় না। এই ধারণাগুলোই বড় batch system-এর ভিত্তি।' },
    { kind: 'list', items: [
      'Sort-ভিত্তিক বনাম memory-তে hash table: distinct মান কম হলে memory-তে গুনে নেওয়া সোজা। অনেক হলে disk-এ সাজিয়ে পাশাপাশি আনা (sorted run মিলিয়ে) বড় data-তেও কাজ করে, কারণ ক্রমানুসারে disk পড়া দ্রুত।',
      'Chain of commands বনাম নিজের program: কোড লেখা সহজ বলে নয়, বরং প্রতিটা ধাপ মাপা যায়, বদলানো যায়, আর সহজে অন্যের সাথে জোড়া যায়।',
    ] },

    { kind: 'h', text: 'বড় পরিসরে: distributed batch' },
    { kind: 'p', text: 'Data এক machine-এ ধরে না, তাই তিনটা উপাদান: ফাইল রাখার জায়গা (distributed filesystem, যেমন HDFS, আজকাল বেশি object store, যেমন S3), কাজ চালানো আর কে কোথায় চালাবে তার সমন্বয় (scheduler), আর কাজের ধারা (MapReduce বা dataflow engine)। মূল কৌশল: কাজকে data-র কাছে নিয়ে যাওয়া, data-কে কাজের কাছে নয়, যতটা পারা যায়।' },

    { kind: 'h', text: 'MapReduce' },
    { kind: 'p', text: 'দুটো ফাংশন লিখুন। Map: প্রতিটা input রেকর্ড থেকে (key, মান) জোড়া বের করে। Reduce: একই key-র সব মান একসাথে পেয়ে একটা ফল বানায়। মাঝখানে framework নিজে shuffle করে: সব map-এর output key ধরে সাজিয়ে একই key-র সবটুকু একটা reducer-এর কাছে পাঠায়। আপনি ভাবেন না কোথায় কী গেল।' },
    { kind: 'flow', label: 'MapReduce: map প্রতি টুকরোতে, shuffle key ধরে, reduce প্রতি key-তে', nodes: [
      { id: 'in', label: 'Input', sub: 'টুকরো টুকরো', x: 10, y: 17, w: 17 },
      { id: 'm1', label: 'Map ১', x: 36, y: 6, w: 15 },
      { id: 'm2', label: 'Map ২', x: 36, y: 28, w: 15 },
      { id: 'sh', label: 'Shuffle', sub: 'key ধরে', x: 60, y: 17, w: 17 },
      { id: 'r1', label: 'Reduce ১', x: 88, y: 6, w: 18 },
      { id: 'r2', label: 'Reduce ২', x: 88, y: 28, w: 18 },
    ], links: [
      { from: 'in', to: 'm1', rate: 3 },
      { from: 'in', to: 'm2', rate: 3 },
      { from: 'm1', to: 'sh', rate: 3 },
      { from: 'm2', to: 'sh', rate: 3 },
      { from: 'sh', to: 'r1', rate: 3 },
      { from: 'sh', to: 'r2', rate: 3 },
    ], h: 34 },
    { kind: 'calc', label: 'কত worker লাগবে, আর shuffle-এ কত data ঘোরে', inputs: [
      { id: 'tb', label: 'Input data', min: 1, max: 1000, step: 1, value: 50, unit: 'TB' },
      { id: 'w', label: 'Worker', min: 1, max: 2000, step: 1, value: 200 },
      { id: 'mbs', label: 'প্রতি worker-এর গতি', min: 20, max: 500, step: 10, value: 100, unit: 'MB/s' },
      { id: 'sel', label: 'Map-এর পর data কত থাকে', min: 1, max: 100, step: 1, value: 20, unit: '%' },
    ], out: (v) => {
      const total = v.tb! * 1e12;
      const secs = total / (v.w! * v.mbs! * 1e6);
      const shuf = total * (v.sel! / 100);
      return [
        { label: 'পড়তেই সময় লাগে (শুধু input)', value: dur(secs), bar: Math.min(1, secs / 36_000), tone: secs > 7200 ? 'bad' : 'ok', how: `${num(v.tb!)} TB ÷ (${num(v.w!)} × ${num(v.mbs!)} MB/s)` },
        { label: 'Shuffle-এ নেটওয়ার্কে ঘোরে', value: bytes(shuf), bar: v.sel! / 100, how: 'ধরা হলো map-এর পর data অতটুকু থাকে। সব node থেকে সব node-এ যায়: এটাই সবচেয়ে ভারী ধাপ' },
      ];
    } },
    { kind: 'tip', title: 'Fault tolerance', text: 'কোনো task ভাঙলে framework শুধু ওই task আবার চালায়, কারণ input অপরিবর্তনীয় আর map-এর output ফাইলে জমা। পুরো job আবার নয়। Online system-এর মতো লেখা আধা-হয়ে নষ্ট হওয়ার ভয়ও কম: output সম্পূর্ণ হলে তবে জায়গায় বসে (all-or-nothing)।' },

    { kind: 'h', text: 'Dataflow engine: MapReduce-এর পরের ধাপ' },
    { kind: 'p', text: 'MapReduce-এ প্রতিটা ধাপের শেষে ফল ফাইলে লিখে আবার পড়তে হয়, আর জটিল কাজে বহু ধাপ। Spark, Flink-এর মতো dataflow engine পুরো কাজকে একটা গ্রাফ হিসেবে দেখে: মাঝের ফল সোজা পরের ধাপে memory বা local disk দিয়ে চলে। অকারণ লেখা-পড়া আর ধাপের মধ্যে অপেক্ষা কমে। তাছাড়া কাজের ধরন (map, filter, join, group) বেশি, আর engine নিজে অপ্টিমাইজ করে। মাঝের ফল হারালে আবার হিসাব করে নেয়: কোন ফলের উৎস কী তা মনে রাখে বলে।' },

    { kind: 'h', text: 'Join আর group: shuffle-এর কাজ' },
    { kind: 'p', text: 'Delivery-র log আর merchant-এর তথ্য জুড়তে চান। দুই উপায়।' },
    { kind: 'table', head: ['কৌশল', 'কীভাবে', 'কখন'], rows: [
      ['Sort-merge join (shuffle)', 'দুই input-ই join key ধরে shuffle করে একই key এক জায়গায়, সেখানে জোড়া', 'দুটোই বড়'],
      ['Broadcast hash join', 'ছোট input সব worker-এর memory-তে পাঠিয়ে বড়টাকে এক-পাশ-দিয়ে পড়া, shuffle ছাড়া', 'একটা input ছোট'],
      ['Partitioned hash join', 'দুটো আগে থেকেই একই key-তে ভাগ করা থাকলে প্রতি ভাগ আলাদা জোড়া', 'আগে থেকে ভাগ করা'],
    ] },
    { kind: 'seq', label: 'Skew: একটা key-তে অসম ভার', actors: ['Map', 'Shuffle', 'Reducer (hot key)', 'বাকি reducer'], steps: [
      { from: 0, to: 1, msg: 'key = "সবচেয়ে বড় merchant": ৬০% রেকর্ড' },
      { from: 1, to: 2, msg: 'সেই key-র সবটুকু একটা reducer-এ', tone: 'bad', note: 'একই key এক জায়গায় না এলে group-by হয় না।' },
      { from: 1, to: 3, msg: 'বাকিরা অল্প অল্প', tone: 'ok' },
      { from: 3, to: 3, msg: 'বাকিরা মিনিটে শেষ, বসে অপেক্ষা', note: 'Job শেষ হয় সবচেয়ে ধীর task-এর সাথে (straggler)।' },
      { from: 2, to: 2, msg: 'ঘণ্টা ধরে চলছে একা', tone: 'bad', note: 'সমাধান: hot key-র রেকর্ড অনেক reducer-এ এলোমেলো ছড়ানো, তারপর আবার জুড়ে নেওয়া।' },
    ] },

    { kind: 'h', text: 'Batch কীসে লাগে' },
    { kind: 'list', items: [
      'ETL: এক system থেকে data নিয়ে পরিষ্কার করে warehouse-এ ভরা।',
      'Analytics: বড় data-য় বড় গোনা, SQL query দিয়ে। আজকাল query language আর DataFrame API বেশি: নিজে MapReduce-এ কোড লেখার দরকারই পড়ে না, engine কোড বানিয়ে নেয়।',
      'Machine learning: প্রশিক্ষণের জন্য বড় data সাজানো, feature বানানো, model চালিয়ে ফল জমা।',
      'Derived data পরিবেশন: batch-এ বানানো search index, recommendation ফল, তারপর তা read-only ভাবে database-এ ঢুকিয়ে app-কে পড়তে দেওয়া। Output সরাসরি production database-এ এক-এক রেকর্ড করে লিখলে নেটওয়ার্ক-ভারী আর ব্যর্থ হলে আধা: তাই একটা নতুন সংস্করণ হিসেবে পুরোটা বানিয়ে একবারে বদলে নেওয়া (swap) ভালো।',
    ] },

    { kind: 'story', title: 'এক merchant, সারা রাত', steps: [
      'ParcelGo-র রাতের report প্রতি merchant-এর delivery গোনে (group by merchant)।',
      'এক বিশাল merchant-এর delivery মোটের অর্ধেক। সেই key একটা reducer-এ গেল।',
      'বাকি সব reducer ২০ মিনিটে শেষ; সেই একটা চলল সকাল পর্যন্ত। Report দেরি।',
    ], fix: 'Skew ধরে hot key-কে আগে অংশে ভেঙে (key + এলোমেলো সংখ্যা) আংশিক গুনে নেওয়া, তারপর আংশিক ফলগুলো জুড়ে চূড়ান্ত। আর job-এর টাস্ক-ভিত্তিক সময় দেখুন, শুধু মোট সময় নয়।' },

    { kind: 'mistakes', items: [
      'Output সরাসরি চালু database-এ এক এক রেকর্ড করে লিখে তাকে ধীর বা নষ্ট করা।',
      'Shuffle-এর খরচ না ধরা: বেশি join আর group মানে বেশি নেটওয়ার্ক।',
      'Skew না দেখা: গড় task দ্রুত, তবু job ধীর।',
      'Batch job-কে এমন করে লেখা যে আবার চালালে ফল বদলায় (idempotent নয়): ভাঙলে আবার চালানো বিপদ।',
    ] },
    { kind: 'check', items: [
      { q: 'Batch job-এ ভুল হলে আবার চালানো সহজ কেন?', a: 'Input অপরিবর্তনীয়, আর output আলাদা জায়গায় সম্পূর্ণ হলে তবে বসে। তাই ঠিক করে আবার চালালে আগেরটা নষ্ট হয় না, শুধু ফল নতুন হয়।' },
      { q: 'MapReduce-এর তিন ধাপ আর shuffle কী করে?', a: 'Map প্রতি রেকর্ড থেকে (key, মান) জোড়া বানায়। Shuffle সব output key ধরে সাজিয়ে একই key-র সবটুকু এক reducer-এ পাঠায়। Reduce প্রতি key-র মান জুড়ে ফল দেয়।' },
      { q: 'Spark-ধরনের dataflow engine MapReduce-এর চেয়ে কেন দ্রুত?', a: 'ধাপের মাঝের ফল ফাইলে লিখে-পড়ে না, সোজা পরের ধাপে যায়। পুরো কাজকে এক গ্রাফ ভেবে optimize করে।' },
      { q: 'Broadcast hash join কখন, কেন সুবিধা?', a: 'এক input ছোট হলে তাকে সব worker-এ পাঠিয়ে বড়টা সরাসরি পড়া হয়, shuffle ছাড়াই। সবচেয়ে ভারী ধাপ বাঁচে।' },
    ] },
  ],
};
