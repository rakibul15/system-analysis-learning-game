import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 4 (Storage and Retrieval), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-4',
  goals: [
    'LSM-tree আর B-tree কীভাবে লেখে-পড়ে, আর কোনটা কোন কাজে ভালো বলতে পারবেন।',
    'B-tree কয় ধাপে একটা key পায় তা হিসাব করতে পারবেন, আর index কেন লেখা ধীর করে ব্যাখ্যা করতে পারবেন।',
    'Column-oriented storage কেন analytics-এ জেতে, আর full-text আর vector index কী করে এক কথায় বলতে পারবেন।',
  ],
  related: ['storage', 'caching'],
  blocks: [
    { kind: 'p', text: 'Database ভেতরে ভেতরে দুটো কাজ করে: data রাখা, আর চাইলে খুঁজে দেওয়া। কীভাবে রাখলে খোঁজা সহজ হয় আর লেখা সস্তা থাকে, এই টানাটানিই অধ্যায়ের কেন্দ্র। কাজটা দুই ভাগে: OLTP-র জন্য (অল্প সারি, দ্রুত), আর analytics-এর জন্য (বহু সারি, বড় স্ক্যান)।' },

    { kind: 'h', text: 'সবচেয়ে সরল database' },
    { kind: 'p', text: 'একটা file-এ শুধু শেষে যোগ করুন (append-only log): লেখা অসম্ভব দ্রুত, কারণ disk-এ ক্রমানুসারে লেখা সবচেয়ে সস্তা। কিন্তু খোঁজা মানে পুরো file ঘাঁটা, যত বড় তত ধীর। সমাধান index: data-র পাশে একটা অতিরিক্ত গঠন, যা খোঁজা দ্রুত করে। দাম: প্রতিটা লেখায় index-ও বদলাতে হয়, তাই লেখা ধীর হয়। তাই database সব কিছুতে index বসায় না; আপনি বেছে নেন।' },

    { kind: 'h', text: 'Log-structured: LSM-tree' },
    { kind: 'p', text: 'LSM-tree-র মূল কথা: লেখা আসে memory-তে একটা sorted গঠনে (memtable)। ভরে গেলে ক্রমে সাজানো একটা file হিসেবে disk-এ ঢেলে দেওয়া হয় (SSTable), যা আর কখনো বদলায় না। পড়ার সময় আগে memtable, তারপর নতুন file থেকে পুরোনোর দিকে খোঁজা। পেছনে একটা কাজ চলে: compaction, যাতে ছোট file জোড়া লেগে বড় হয়, আর একই key-র পুরোনো মান বাদ পড়ে।' },
    { kind: 'seq', label: 'LSM-tree: একটা লেখা আর একটা পড়ার যাত্রা', actors: ['Client', 'Memtable (memory)', 'Log (disk)', 'SSTable (disk)'], steps: [
      { from: 0, to: 2, msg: 'আগে log-এ যোগ', note: 'Crash হলে memtable হারাবে, তাই আগে শেষে যোগ করা log-এ। সস্তা, ক্রমানুসারে লেখা।' },
      { from: 0, to: 1, msg: 'memtable-এ বসাও', tone: 'ok', note: 'লেখা শেষ। disk-এ এলোমেলো লেখা নেই বলে এত দ্রুত।' },
      { from: 1, to: 3, msg: 'ভরে গেলে সাজানো file হিসেবে ঢালো', note: 'এই file আর কখনো বদলানো হয় না।' },
      { from: 0, to: 1, msg: 'পড়া: আগে memtable-এ খোঁজো' },
      { from: 1, to: 3, msg: 'নেই? নতুন থেকে পুরোনো file-এ খোঁজো', note: 'অনেক file থাকলে পড়া ধীর, তাই Bloom filter আর compaction।' },
      { from: 3, to: 0, msg: 'পাওয়া গেল', tone: 'ok' },
    ] },
    { kind: 'tip', title: 'Bloom filter', text: 'একটা ছোট গঠন যা বলে "এই key এই file-এ নিশ্চিত নেই" অথবা "থাকতে পারে"। অকারণ file খোঁজা বাঁচায়। কখনো ভুল করে "থাকতে পারে" বলে, কিন্তু "নেই" বললে ঠিকই নেই।' },

    { kind: 'h', text: 'B-tree' },
    { kind: 'p', text: 'B-tree data-কে নির্দিষ্ট মাপের পাতায় (page, সাধারণত কয়েক KB) ভাগ করে, আর পাতাগুলোকে গাছের মতো সাজায়। উপরের পাতা বলে "এই সীমার key কোন নিচের পাতায়"। খোঁজা মানে মূল থেকে নেমে আসা। লেখার সময় সংশ্লিষ্ট পাতাটাই জায়গায় বদলানো হয় (in-place update); পাতা ভরে গেলে দুই ভাগ হয়। মাঝপথে crash হলে গাছ আধা-বদলানো থাকতে পারে, তাই write-ahead log রাখা হয়।' },
    { kind: 'calc', label: 'B-tree-তে একটা key পেতে কত ধাপ নামতে হয়', inputs: [
      { id: 'n', label: 'মোট সারি', min: 1000, max: 10_000_000_000, step: 1000, value: 100_000_000, show: (x) => num(x) },
      { id: 'b', label: 'প্রতি পাতায় কয়টা শাখা (branching factor)', min: 10, max: 1000, step: 10, value: 500 },
    ], out: (v) => {
      const lv = Math.max(1, Math.ceil(Math.log(v.n!) / Math.log(v.b!)));
      return [
        { label: 'গাছের স্তর', value: `${num(lv)}টা`, bar: Math.min(1, lv / 10), tone: lv <= 4 ? 'ok' : 'bad', how: `⌈log_${num(v.b!)}(${num(v.n!)})⌉` },
        { label: 'সবচেয়ে খারাপ ক্ষেত্রে disk-পড়া', value: `${num(lv)} বার`, how: 'উপরের স্তরগুলো সাধারণত memory-তেই থাকে, তাই বাস্তবে কমই' },
      ];
    } },
    { kind: 'p', text: 'বিশাল data-ও তিন-চার স্তরেই ধরে যায়, এটাই B-tree-র শক্তি।' },

    { kind: 'table', head: ['', 'LSM-tree', 'B-tree'], rows: [
      ['লেখা', 'ক্রমানুসারে; খুব দ্রুত; compaction-এ পেছনে কাজ', 'জায়গায় বদলানো; এলোমেলো লেখা; পাতা ভাঙা'],
      ['পড়া', 'অনেক file ঘাঁটতে পারে; তুলনায় ধীর', 'সাধারণত একটা সোজা পথ, পূর্বানুমানযোগ্য'],
      ['Write amplification', 'compaction-এ একই data বহুবার লেখা', 'পাতা আর log দুটোতেই লেখা'],
      ['Disk জায়গা', 'ভালো চাপা যায়', 'পাতায় খালি জায়গা পড়ে থাকে (fragmentation)'],
      ['সুবিধা', 'লেখা-ভারী কাজ', 'পড়া-ভারী কাজ, transaction-এর জন্য key-র ওপর lock সহজ'],
    ] },
    { kind: 'p', text: 'কোনটা ভালো, এক কথায় বলা যায় না: নিজের load দিয়ে মেপে দেখাই ঠিক। LSM-এর সমস্যা: compaction পেছনে disk দখল করে, ফলে কখনো কখনো request-এর tail ধীর হয়। আর একই key একাধিক file-এ থাকতে পারে বলে transaction-এর lock কঠিন।' },

    { kind: 'h', text: 'আরও index' },
    { kind: 'list', items: [
      'Secondary index: primary key ছাড়া অন্য column-এ খোঁজা (যেমন zone ধরে parcel)। সেখানে একই মান বহু সারিতে থাকতে পারে।',
      'Multicolumn index: একাধিক column জুড়ে (zone + তারিখ)। ক্রম গুরুত্বপূর্ণ: প্রথম column ছাড়া শুধু দ্বিতীয়টা দিয়ে খোঁজা যায় না।',
      'Covering index: index-এই প্রয়োজনীয় column রেখে দেওয়া, যাতে মূল সারিতে যেতেই না হয়।',
      'In-memory database: সব data RAM-এ। দ্রুত শুধু disk এড়ানোর জন্য নয়; disk-এর জন্য বাঁধা গঠন এড়ানো যায় বলেও। Durability আসে log বা replica থেকে।',
    ] },

    { kind: 'h', text: 'Analytics-এর storage: column ধরে' },
    { kind: 'p', text: 'Warehouse-এর একটা query সাধারণত শতাধিক column-এর মধ্যে মাত্র দু-তিনটা ছোঁয়, কিন্তু কোটি সারি জুড়ে। সারি ধরে রাখলে (row-oriented) প্রতি সারির সব column-ই পড়তে হয়। Column ধরে রাখলে (column-oriented) প্রতিটা column আলাদা file-এ, তাই শুধু লাগা column-গুলোই পড়া হয়। একই column-এর মান একরকম হয় বলে ভালো চাপাও যায়।' },
    { kind: 'calc', label: 'একটা query দুটো column ছোঁয়: কত data পড়তে হয়', inputs: [
      { id: 'rows', label: 'সারি', min: 1_000_000, max: 5_000_000_000, step: 1_000_000, value: 500_000_000, show: (x) => num(x) },
      { id: 'cols', label: 'মোট column', min: 5, max: 300, step: 5, value: 100 },
      { id: 'use', label: 'query কয়টা column ছোঁয়', min: 1, max: 20, step: 1, value: 2 },
      { id: 'comp', label: 'Column চাপার পর কত ভাগ থাকে', min: 5, max: 100, step: 5, value: 25, unit: '%' },
    ], out: (v) => {
      const cell = 8;
      const row = v.rows! * v.cols! * cell;
      const col = v.rows! * Math.min(v.use!, v.cols!) * cell * (v.comp! / 100);
      return [
        { label: 'Row store পড়ে', value: bytes(row), bar: 1, tone: 'bad', how: `${num(v.rows!)} × ${num(v.cols!)} column × ${cell} byte` },
        { label: 'Column store পড়ে', value: bytes(col), bar: Math.min(1, col / row), tone: 'ok', how: `${num(v.rows!)} × ${num(v.use!)} column × ${cell} byte × চাপার ${num(v.comp!)}%` },
        { label: 'কম পড়া', value: `${num(Math.round(row / col))} গুণ`, how: 'ধরা হলো প্রতি cell ৮ byte; বাস্তবে আরও বেশি তফাত হতে পারে' },
      ];
    } },
    { kind: 'list', items: [
      'Cloud data warehouse আলাদা করে compute আর storage: data থাকে object storage-এ, query-র সময় machine ভাড়া।',
      'Query execution: vectorization (একসাথে অনেক মান নিয়ে CPU-র জন্য হিসাব) আর compilation (query-কে সরাসরি কোডে রূপান্তর) বাড়তি গতি দেয়।',
      'Materialized view আর data cube: ঘন ঘন চাওয়া যোগফল আগে থেকে হিসাব করে রাখা। পড়া দ্রুত, লেখায় হালনাগাদের খরচ।',
    ] },

    { kind: 'h', text: 'Full-text আর vector index' },
    { kind: 'p', text: 'Full-text search-এ আলাদা গঠন লাগে: inverted index, যাতে প্রতিটা শব্দের পাশে লেখা থাকে কোন document-এ সে আছে। "Delay" লিখলে সেই শব্দের তালিকা ধরে সরাসরি document-এ পৌঁছানো যায়। Vector embedding-এ লেখা বা ছবিকে সংখ্যার তালিকায় (vector) বদলানো হয়, যাতে অর্থে কাছাকাছি জিনিসের vector কাছাকাছি থাকে। তখন "সবচেয়ে কাছের" খোঁজা মানে অর্থে মেলা জিনিস খোঁজা। দ্রুত করতে approximate index ব্যবহার হয়, যা কখনো সামান্য ভুল করে।' },

    { kind: 'story', title: 'লেখা ধীর, কারণ index বেশি', steps: [
      'ParcelGo-র parcels টেবিলে অনুরোধ আসতেই এক এক করে index বসানো হলো: zone, merchant, তারিখ, অবস্থা, rider, ...।',
      'সপ্তাহখানেক পরে দেখা গেল প্রতি parcel তোলার লেখা আগের চেয়ে ধীর।',
      'প্রতিটা লেখায় ৯টা index-ও বদলাতে হচ্ছিল, অথচ বেশিরভাগ কখনো ব্যবহারই হয় না।',
    ], fix: 'যে query আসলেই চলে, তা মেপে সেটার জন্য index রাখুন, বাকিগুলো বাদ দিন। Report-এর query-র জন্য আলাদা warehouse।' },

    { kind: 'mistakes', items: [
      'প্রতি column-এ index বসিয়ে দেওয়া: পড়া দ্রুত, কিন্তু প্রতিটা লেখা ধীর আর জায়গা বেশি।',
      'Multicolumn index-এর ক্রম না ভাবা: প্রথম column বাদ দিয়ে খুঁজলে index কাজ করে না।',
      'Analytics query row store-এ চালানো, তারপর কেন ধীর তা না বোঝা।',
      'LSM বা B-tree "সবসময় ভালো" ধরে নেওয়া; নিজের লোড না মেপে।',
    ] },
    { kind: 'check', items: [
      { q: 'LSM-tree-তে লেখা এত দ্রুত কেন?', a: 'লেখা প্রথমে memory-তে যায় আর log-এ শেষে যোগ হয়, দুটোই সস্তা। Disk-এ ঢালা হয় একবারে বড় সাজানো file হিসেবে, এলোমেলো জায়গায় নয়।' },
      { q: '১০ কোটি সারি আর ৫০০ শাখার B-tree কয় স্তরের?', a: 'প্রায় ৩ স্তর: ৫০০³ = ১২.৫ কোটি ১০ কোটির বেশি। তাই তিন ধাপেই key পাওয়া যায়।' },
      { q: 'Index লেখা ধীর করে কেন?', a: 'প্রতিটা লেখায় মূল data-র সাথে প্রতিটা index-ও বদলাতে হয়। যত index তত বেশি কাজ আর জায়গা।' },
      { q: 'Column store কেন analytics-এ জেতে?', a: 'Query অল্প column ছোঁয় কিন্তু বহু সারি জুড়ে। Column ধরে রাখলে শুধু সেগুলোই পড়তে হয়, আর একই ধরনের মান বলে ভালো চাপাও যায়।' },
    ] },
  ],
};
