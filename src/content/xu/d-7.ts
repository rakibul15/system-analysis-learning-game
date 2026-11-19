import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 7 (Sharding), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-7',
  goals: [
    'Key-range আর hash দিয়ে sharding-এর লাভ-ক্ষতি, আর hot spot কীভাবে তৈরি হয় বলতে পারবেন।',
    'Shard বাড়ালে data কীভাবে সরে (fixed partition, dynamic split), আর request কীভাবে ঠিক shard-এ পৌঁছায় ব্যাখ্যা করতে পারবেন।',
    'Local আর global secondary index-এর পার্থক্য, আর কোনটা পড়া সস্তা, কোনটা লেখা সস্তা বলতে পারবেন।',
  ],
  related: ['sharding', 'caching'],
  blocks: [
    { kind: 'p', text: 'Replication একই data অনেক জায়গায় কপি করে। কিন্তু data যদি এক machine-এ ধরেই না? তখন data-কেই ভাগ করতে হয়: প্রতিটা অংশ আলাদা machine-এ। এই ভাগকে বলে sharding (অনেকে partitioning-ও বলেন)। প্রতিটা record ঠিক একটা shard-এর, আর প্রতিটা shard নিজে ছোট একটা database। লক্ষ্য: data আর request দুটোই সমানভাবে ছড়ানো। সাধারণত sharding আর replication একসাথে চলে: প্রতিটা shard-ও কপি করা।' },

    { kind: 'h', text: 'কখন sharding, আর তার দাম' },
    { kind: 'list', items: [
      'এক machine-এ data বা লেখার চাপ ধরে না, তখনই। তার আগে বাড়তি machine, replica, cache-ই অনেক সময় যথেষ্ট, আর অনেক সরল।',
      'দাম: যে query একাধিক shard ছোঁয় তা কঠিন আর ধীর। Transaction শুধু এক shard-এ সহজ। Shard বাড়ানো-কমানো একটা বড় কাজ।',
      'Multitenancy: প্রতি ক্লায়েন্টের (tenant) আলাদা shard। তাদের data আলাদা থাকে, একজনের চাপ অন্যের ঘাড়ে পড়ে না, আলাদা backup বা মোছাও সহজ। কিন্তু অনেক ছোট tenant থাকলে overhead, আর বড় tenant একা এক shard ছাপিয়ে যেতে পারে।',
    ] },

    { kind: 'h', text: 'Key ধরে ভাগ: range না hash' },
    { kind: 'p', text: 'Key-range: key-কে সাজিয়ে সীমা টানা (ক-ঘ এক shard, ঙ-ট আরেক)। সুবিধা: কাছাকাছি key এক জায়গায়, তাই range query সহজ (এই সপ্তাহের সব parcel)। অসুবিধা: কিছু key-র ধরন নির্দিষ্ট shard-কে ভারী করে। যেমন key যদি তারিখ-সময় হয়, আজকের সব লেখা শুধু আজকের shard-এ যায় আর বাকিরা বসে থাকে।' },
    { kind: 'p', text: 'Hash: key-র hash ধরে ভাগ। ছড়ানো সমান হয়, কিন্তু কাছাকাছি key ছড়িয়ে পড়ে, তাই range query-তে সব shard-কে জিজ্ঞেস করতে হয়। একটা মাঝামাঝি পথ: compound key (প্রথম অংশ hash দিয়ে shard ঠিক করে, বাকিটা shard-এর ভেতরে সাজানো), যেমন user ID hash আর তারপর সময়ে সাজানো।' },
    { kind: 'bars', label: 'একটা মিনিটে ৪টা shard-এ লেখা: key = সময় বনাম key = hash(parcel id)', scale: 'linear', items: [
      { label: 'সময় ধরে: shard ১ (আজকের ঘর)', value: 100, show: '১০০%', tone: 'bad' },
      { label: 'সময় ধরে: shard ২', value: 0, show: '০%', tone: 'ok' },
      { label: 'সময় ধরে: shard ৩', value: 0, show: '০%', tone: 'ok' },
      { label: 'Hash ধরে: প্রতিটা shard', value: 25, show: '২৫% করে', tone: 'ok' },
    ], note: 'Key-range-এ সময়ের মতো ক্রমবর্ধমান key পড়লে সব চাপ এক shard-এ: এটাই hot spot।' },

    { kind: 'h', text: 'Skew আর hot spot' },
    { kind: 'p', text: 'Hash দিয়েও সমান ভাগ গ্যারান্টি নেই। একজন বিখ্যাত user বা একটা ভাইরাল post-এর key-তে বিপুল লেখা-পড়া এলে সেই shard একাই ভারী। Hash আরেক shard-এ পাঠায় না, কারণ key-ই এক। একটা কৌশল: ওই key-র শেষে ছোট এলোমেলো সংখ্যা জুড়ে (০০ থেকে ৯৯) একটা key-কে বহু key-তে ভেঙে ফেলা। লেখা ছড়ায়, কিন্তু পড়ার সময় সবগুলো খুঁজে জুড়তে হয়। তাই এই কৌশল শুধু যেগুলো সত্যিই hot, সেগুলোর জন্য।' },

    { kind: 'h', text: 'Rebalancing: shard বাড়লে data সরানো' },
    { kind: 'p', text: 'Machine যোগ বা বাদ দিলে data সরাতে হয়। নিয়ম: যত কম সরে তত ভালো, আর সরার সময় সেবা বন্ধ না হওয়া চাই। মনে রাখুন "hash mod N" (N machine সংখ্যা) এখানে মারাত্মক, কারণ N বদলালে প্রায় সব key সরে। তাই শুধু key-র hash-কে মোট shard সংখ্যার ওপর নির্ভর রাখুন না, বরং:' },
    { kind: 'list', items: [
      'Fixed partition: শুরুতেই অনেক বেশি partition বানিয়ে রাখা (ধরুন ১,০০০), প্রতি node-এ অনেকগুলো। নতুন node এলে সবার কাছ থেকে কয়েকটা partition তার কাছে যায়। Key কোন partition-এ তা কখনো বদলায় না। সংখ্যাটা আগে থেকে ঠিক করতে হয়: খুব কম হলে বাড়ানোর জায়গা নেই, খুব বেশি হলে বাড়তি overhead।',
      'Dynamic splitting: partition একটা মাপে পৌঁছালে দুই ভাগ হয়, আর খুব ছোট হলে জোড়া লাগে। Data যেমন বাড়ে partition-ও তেমন বাড়ে। (B-tree-র ধারণার মতো।)',
      'Node-সংখ্যা অনুপাতে partition (Cassandra-র মতো): প্রতি node-এ নির্দিষ্ট সংখ্যা partition। নতুন node এলে কিছু partition ভেঙে তার কাছে যায়।',
    ] },
    { kind: 'calc', label: 'নতুন machine যোগ করলে কত data নড়ে', inputs: [
      { id: 'n', label: 'এখন machine', min: 2, max: 50, step: 1, value: 4 },
      { id: 'tb', label: 'মোট data', min: 1, max: 500, step: 1, value: 40, unit: 'TB' },
    ], out: (v) => {
      const mod = v.n! / (v.n! + 1);
      const fixed = 1 / (v.n! + 1);
      return [
        { label: 'hash mod N: নড়ে', value: `${num(Math.round(mod * v.tb!))} TB (${num(Math.round(mod * 100))}%)`, bar: mod, tone: 'bad', how: `${num(v.n!)} ÷ ${num(v.n! + 1)}` },
        { label: 'Fixed partition: নড়ে', value: `${num(Math.round(fixed * v.tb!))} TB (${num(Math.round(fixed * 100))}%)`, bar: fixed, tone: 'ok', how: `১ ÷ ${num(v.n! + 1)}: শুধু নতুন machine-এর ন্যায্য ভাগ` },
      ];
    } },
    { kind: 'tip', title: 'Automatic না manual', text: 'Rebalance চলাকালে নেটওয়ার্ক আর disk-এ বাড়তি চাপ পড়ে। একটা ধীর node-কে "ভাঙা" ভেবে স্বয়ংক্রিয়ভাবে data সরানো শুরু হলে ভার আরও বাড়ে। তাই অনেক system মানুষকে অনুমোদন দিতে বলে: প্রস্তাব বানায় machine, চালায় মানুষ।' },

    { kind: 'h', text: 'Request কীভাবে ঠিক shard-এ যায়' },
    { kind: 'p', text: 'Client জানে না কোন key কোন machine-এ। তিন উপায়: যেকোনো node-এ পাঠান, সে প্রয়োজনে এগিয়ে দেবে; একটা routing স্তর (proxy) মাঝে রাখুন; বা client-কেই মানচিত্র জানান। প্রতিবার প্রশ্ন একই: এই মানচিত্র কে রাখে আর বদলালে সবাইকে কীভাবে জানায়? সাধারণত ZooKeeper-ধরনের একটা coordination service মানচিত্র রাখে, আর router তাতে নজর রাখে। কিছু system gossip করে নিজেদের মধ্যে জেনে নেয়।' },
    { kind: 'flow', label: 'Router মানচিত্র দেখে request ঠিক shard-এ পাঠায়', nodes: [
      { id: 'c', label: 'Client', x: 10, y: 17 },
      { id: 'r', label: 'Router', x: 38, y: 17 },
      { id: 'z', label: 'মানচিত্র', sub: 'কে কোন shard', x: 38, y: 31, w: 18 },
      { id: 's1', label: 'Shard ১', x: 84, y: 6, w: 18 },
      { id: 's2', label: 'Shard ২', x: 84, y: 17, w: 18 },
      { id: 's3', label: 'Shard ৩', x: 84, y: 28, w: 18 },
    ], links: [
      { from: 'c', to: 'r', rate: 5 },
      { from: 'r', to: 's2', rate: 4 },
      { from: 'r', to: 's1', rate: 1 },
      { from: 'r', to: 's3', rate: 1 },
    ], h: 38 },

    { kind: 'h', text: 'Sharding আর secondary index' },
    { kind: 'p', text: 'Primary key ধরে খোঁজা সোজা। কিন্তু "zone = উত্তরা" ধরে খুঁজতে চাইলে? সেই zone-এর parcel সব shard-এই ছড়ানো। Secondary index ভাগ করার দুটো পথ।' },
    { kind: 'table', head: ['', 'Local index', 'Global index'], rows: [
      ['index কোথায়', 'প্রতি shard নিজের data-র জন্য নিজের index রাখে', 'সব shard-এর হয়ে একটা আলাদা index, সেটাও ভাগ করা'],
      ['লেখা', 'সস্তা: শুধু নিজের shard-এ', 'ভারী: একটা লেখা একাধিক shard-এ index বদলাতে পারে (সাধারণত async, তাই কিছুটা পিছিয়ে)'],
      ['পড়া', 'ভারী: সব shard-কে জিজ্ঞেস করে জুড়তে হয় (scatter/gather)', 'সস্তা: index-এর এক অংশেই উত্তর'],
    ] },
    { kind: 'seq', label: 'Local index-এ "zone = উত্তরা" খোঁজা: scatter/gather', actors: ['Client', 'Router', 'প্রতিটা shard'], steps: [
      { from: 0, to: 1, msg: 'zone = উত্তরা-র parcel দাও' },
      { from: 1, to: 2, msg: 'সব shard-কে একসাথে জিজ্ঞেস', note: 'কোনটায় আছে জানা নেই, তাই সবাইকে।' },
      { from: 2, to: 1, msg: 'প্রত্যেকে নিজের মিলগুলো', tone: 'ok' },
      { from: 1, to: 0, msg: 'জুড়ে পুরো ফল', tone: 'ok', note: 'সবচেয়ে ধীর shard-এর জন্য অপেক্ষা: tail latency বাড়ে।' },
    ] },

    { kind: 'story', title: 'তারিখ দিয়ে ভাগ, আর আজকের বোঝা', steps: [
      'ParcelGo parcel-এর shard key রেখেছিল সৃষ্টির তারিখ, যাতে "এই সপ্তাহের parcel" range query সহজ হয়।',
      'কিন্তু সব নতুন parcel শুধু আজকের shard-এ লেখা হতো। বাকি shard বসে থাকে, সেটা ভরে গেল।',
      'সেল-এর দিনে সেই shard-ই সেবা বন্ধ করে দিল।',
    ], fix: 'Key বদলান: parcel ID বা merchant ID-র hash আগে রাখুন, তারপর সময়। তাহলে লেখা ছড়ায়, আবার একই merchant-এর সময় ধরে range query সম্ভব।' },

    { kind: 'mistakes', items: [
      'দরকারের আগেই sharding: জটিলতা এখনই আসে, লাভ আসে অনেক পরে।',
      'Hash mod N দিয়ে shard ঠিক করা, তারপর machine বাড়াতে গিয়ে প্রায় সব data সরানো।',
      'সময়ের মতো ক্রমবর্ধমান key-কে সরাসরি range key বানানো।',
      'Hash করলেই hot spot যাবে ভাবা: একটা জনপ্রিয় key তবু এক shard-কেই ভারী রাখে।',
    ] },
    { kind: 'check', items: [
      { q: 'Key-range আর hash sharding-এর মূল লাভ-ক্ষতি?', a: 'Range-এ কাছাকাছি key একসাথে, তাই range query সহজ, কিন্তু hot spot হতে পারে। Hash-এ ছড়ানো সমান, কিন্তু range query-তে সব shard ঘাঁটতে হয়।' },
      { q: 'চারটা machine থেকে পাঁচটা হলে hash mod N-এ কত data নড়ে, আর fixed partition-এ?', a: 'Mod N-এ প্রায় ৮০%। Fixed partition-এ প্রায় ২০%, মানে নতুন machine-এর ন্যায্য ভাগটুকু।' },
      { q: 'Hot key সামলাবেন কীভাবে?', a: 'ওই key-র শেষে ছোট এলোমেলো সংখ্যা জুড়ে লেখা বহু key-তে ছড়ানো। দাম: পড়ার সময় সবগুলো খুঁজে জুড়তে হয়, তাই শুধু সত্যিকারের hot key-তে।' },
      { q: 'Local index কেন লেখায় সস্তা, পড়ায় ভারী?', a: 'লেখা শুধু নিজের shard-এর index বদলায়। কিন্তু একটা মান সব shard-এ ছড়ানো থাকতে পারে বলে পড়ায় সবাইকে জিজ্ঞেস করে জুড়তে হয়।' },
    ] },
  ],
};
