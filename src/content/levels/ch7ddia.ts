import { level } from '../dsl';

/* Chapter ৭ (বোনাস) · DDIA-র আরও সাত অধ্যায়: data model, replication, sharding, transaction, distributed system-এর ঝামেলা, batch, stream */

const ddia = (ch: number, label: string) => ({ label: `DDIA অধ্যায় ${ch}: ${label}`, url: `./#/xu/d-${ch}` });

export const l35 = level({
  id: 35, chapter: 7,
  title: 'Data কোন ছাঁদে', concept: 'Relational · Document · Graph · Event log',
  story: 'Order-এর পাতা আর "কে কাকে চেনে"',
  briefing: 'Order-এর পাতায় customer, item আর ঠিকানা একসাথে দেখাতে হয়। কেউ বলে বহু table আর join, কেউ বলে এক document। আবার "এই hub থেকে তিন ধাপে কোথায় যাওয়া যায়" জাতীয় প্রশ্ন একদম আলাদা। কোন data-র জন্য কোন ছাঁদ?',
  ref: ddia(3, 'Data model'),
  predict: ['Order-এর পাতা খুলতে customer, item আর ঠিকানা সব লাগে। কোন model-এ এক পড়াতেই সব পাওয়া সহজ?', ['Document: সব এক জায়গায় নেস্ট করা', 'Relational: প্রতিটা আলাদা table-এ', 'Graph: প্রতিটা বিন্দু আলাদা', 'কোনো model-ই পারে না']],
  nodes: [
    ['app', 'App', 'user', 8, 50], ['ord', 'Orders', 'db', 34, 18], ['cus', 'Customers', 'db', 34, 50], ['itm', 'Items', 'db', 34, 82],
    ['doc', 'Order document', 'store', 62, 18], ['hub', 'Hub', 'service', 62, 62], ['zone', 'Zone', 'service', 90, 44], ['rid', 'Rider', 'service', 90, 82],
  ],
  steps: [
    { text: 'Relational: order, customer, item আলাদা table। পাতা খুলতে join দিয়ে জোড়া লাগাতে হয়।', add: ['app', 'ord', 'cus', 'itm'], flow: [['app', 'ord'], ['app', 'cus'], ['app', 'itm']] },
    { text: 'Document: একই order-এর সব তথ্য এক document-এর ভেতরে। এক পড়ায় পুরো পাতা।', add: ['doc'], flow: [['app', 'doc']], focus: ['doc'] },
    { text: 'কিন্তু customer-এর ঠিকানা প্রতিটা order document-এ নকল রাখা হয়েছে। সে ঠিকানা বদলাল।', badges: { doc: 'নকল ঠিকানা' }, ask: ['এখন কী করতে হবে?', ['সব নকল document-এ বদলাতে হবে', 'এক জায়গায় বদলালেই সব ঠিক', 'কিছু করতে হবে না', 'Database নিজে বুঝে নেবে']] },
    { text: 'Normalize করলে ঠিকানা এক জায়গায় থাকে (বদলানো সস্তা, পড়ায় join)। Denormalize করলে নকল (পড়া সস্তা, বদলানো ভারী)। কাজটা পড়া থেকে লেখার দিকে সরে।', focus: ['cus', 'doc'] },
    { text: 'অন্য ধরনের প্রশ্ন: এই hub থেকে তিন ধাপে কোন কোন zone আর rider-এ পৌঁছানো যায়? এখানে সম্পর্কই মূল জিনিস।', add: ['hub', 'zone', 'rid'], flow: [['hub', 'zone'], ['hub', 'rid'], ['zone', 'rid']], focus: ['hub', 'zone', 'rid'] },
    { text: 'ধাপ কয়টা আগে থেকে জানা না থাকলে join-এর সংখ্যাও জানা যায় না।', badges: { hub: '?' }, ask: ['এমন "কত ধাপ" প্রশ্ন কোন model-এ সবচেয়ে সহজ?', ['Graph model', 'এক বিশাল document', 'CSV file', 'কোনো model-এই না']] },
    { text: 'Analytics-এ star schema (মাঝে ঘটনার table, চারপাশে বর্ণনা)। আর event sourcing-এ অবস্থা নয়, ঘটনার log রাখা হয়: ইতিহাস থাকে, নতুন view বানানো যায়।', focus: ['ord', 'itm'] },
  ],
  summary: ['Relational: অনেক সম্পর্ক আর join; document: এক জিনিসের সব এক জায়গায়', 'Denormalize মানে পড়া সস্তা, কিন্তু বদলানোর দায় আপনার', 'সম্পর্কই মূল হলে graph; ইতিহাস চাইলে event log'],
  play: {
    kind: 'missions', intro: 'তিনটা data, তিনটা model।',
    missions: [
      ['Merchant-এর অনেক order, প্রতিটার ঠিকানা মাঝে মাঝে বদলায়। ঠিকানা কোথায় রাখবেন?', ['আলাদা table, order-এ শুধু ID', 'প্রতিটা order-এ ঠিকানার নকল', 'ঠিকানা লম্বা text-এ জুড়ে দেওয়া', 'ঠিকানা app-এর memory-তে রাখা'], 'যা প্রায়ই বদলায়, তা এক জায়গায় রাখুন।'],
      ['Rider আর zone: অনেকে অনেকে। Document-এ এমন many-to-many কেমন?', ['কঠিন: নকল বা হাতে জোড়া দিতে হয়', 'সবচেয়ে সহজ, কোনো বাড়তি কাজ নেই', 'এমন সম্পর্ক document-এ রাখাই যায় না', 'join লাগে না বলে সমস্যা থাকে না'], 'Join যেখানে দুর্বল, many-to-many সেখানে কঠিন।'],
      ['মাসের শেষে প্রতি zone-এ কত delivery দেরি হয়েছে, এর জন্য schema?', ['Star: মাঝে delivery, চারপাশে zone ও তারিখ', 'একটা বিশাল document-এ সব মাস ঢুকিয়ে', 'Graph: প্রতিটা delivery এক বিন্দু', 'প্রতিটা zone-এর জন্য আলাদা database'], 'Analytics-এ fact আর dimension।'],
    ],
  },
  boss: [
    ['Document model কখন সবচেয়ে মানায়?', ['এক জিনিসের সব তথ্য একসাথে পড়লে', 'বহু many-to-many সম্পর্কে', 'অনেক অচেনা join-এ', 'কখনোই না'], 'গাছের মতো গঠন আর locality।'],
    ['Denormalize করলে কোন দাম দিতে হয়?', ['বদলানোর সময় সব নকল ঠিক রাখা', 'পড়ার সময় অনেক বেশি join করা', 'নতুন লেখা একেবারে বন্ধ হয়ে যাওয়া', 'ঠিকানা-ধরনের data রাখা যায় না'], 'কাজ পড়া থেকে লেখায় সরে।'],
    ['Graph model কোন প্রশ্নে জেতে?', ['কত ধাপ, আগে থেকে জানা নেই', 'এক সারির কলামের যোগফল বের করা', 'এক key দিয়ে একটা value পড়া', 'অনেক বড় ছবির file জমিয়ে রাখা'], 'ধাপে ধাপে সম্পর্ক ধরে চলা।'],
    ['Star schema-র মাঝে কী থাকে?', ['Fact: প্রতি ঘটনার এক সারি', 'শুধু ছবি', 'শুধু ব্যবহারকারীর নাম', 'কিছুই না'], 'চারপাশে dimension table।'],
    ['Event sourcing-এ বর্তমান অবস্থা কোথায়?', ['Event log আগাগোড়া চালিয়ে বানানো', 'সরাসরি এক সারির মান থেকে পড়া', 'Cache-এ চিরস্থায়ী করে রাখা মান', 'Client-এর browser-এ জমানো মান'], 'Log কখনো বদলায় না, শুধু যোগ হয়।'],
  ],
});

export const l36 = level({
  id: 36, chapter: 7,
  title: 'কপি ঠিক রাখা', concept: 'Leader · Replication lag · Quorum',
  story: 'ঠিকানা সেভ হলো, কিন্তু দেখা গেল না',
  briefing: 'Data-র তিনটা কপি: একটা ভাঙলেও চলে, আর পড়ার চাপ ভাগ হয়। কিন্তু merchant ঠিকানা সেভ করে রিফ্রেশ দিয়ে পুরোনো ঠিকানা দেখলেন। কপিগুলো কীভাবে মিলে থাকে, আর কখন মেলে না?',
  ref: ddia(6, 'Replication'),
  predict: ['Async replication-এ leader লেখা শেষ বলে দেওয়ার পর follower-এ পড়লে কী হতে পারে?', ['পুরোনো মান আসতে পারে', 'সবসময় নতুন মান', 'Data মুছে যায়', 'Follower লেখা বন্ধ করে']],
  nodes: [
    ['w', 'লেখা', 'user', 8, 50], ['ld', 'Leader', 'db', 34, 50], ['f1', 'Follower ১', 'db', 64, 22], ['f2', 'Follower ২', 'db', 64, 78], ['rd', 'পড়া', 'user', 90, 22], ['q', 'Quorum w+r>n', 'key', 90, 78],
  ],
  steps: [
    { text: 'Single-leader: সব লেখা leader-এ যায়, leader পরিবর্তনের log follower-দের পাঠায়।', add: ['w', 'ld', 'f1', 'f2'], flow: [['w', 'ld'], ['ld', 'f1'], ['ld', 'f2']] },
    { text: 'Async: leader অপেক্ষা না করে "হয়েছে" বলে দিল। Follower ১ একটু পিছিয়ে।', badges: { f1: 'পিছিয়ে' }, ask: ['Merchant এখন Follower ১ থেকে পড়ল। কী দেখবে?', ['পুরোনো ঠিকানা', 'নতুন ঠিকানা', 'কোনো ঠিকানাই না', 'Error']] },
    { text: 'এটা replication lag: নিজের লেখা না দেখা। সমাধান: নিজের সদ্য বদলানো জিনিস কিছুক্ষণ leader থেকে পড়া।', add: ['rd'], flow: [['ld', 'rd']], ok: ['ld'] },
    { text: 'Leader ভাঙলে failover: নতুন leader বাছা। Async-এ সদ্য লেখা কিছু হারাতে পারে; ভুল করে দুই leader হলে split brain।', down: ['ld'], badges: { ld: 'ভাঙা' } },
    { text: 'Leaderless: কেউ নেতা নয়। লেখা n কপির মধ্যে w-তে, পড়া r-তে। যদি w + r > n, দুই সেট অন্তত একটাতে মেলে।', add: ['q'], ok: ['ld'], focus: ['q', 'f1', 'f2'], badges: { q: 'n=3, w=2, r=2' }, ask: ['n = ৩, w = ২, r = ২ হলে নতুন মান পাওয়ার গ্যারান্টি?', ['হ্যাঁ, কারণ ২ + ২ > ৩', 'না, কারণ ২ + ২ ছোট ৩-এর চেয়ে', 'না, শুধু w = ৩ হলে চলে', 'না, কখনোই গ্যারান্টি নেই']] },
    { text: 'Multi-leader (একাধিক datacenter): সুবিধা কাছাকাছি লেখা, কিন্তু একই data দুই জায়গায় বদলালে conflict। নিয়ম আগে থেকে ঠিক থাকতে হয়।', focus: ['f1', 'f2'] },
  ],
  summary: ['Single-leader সহজ; async-এ lag আর হারানোর ঝুঁকি', 'Lag-এর সমাধান: নিজের লেখা leader থেকে পড়া', 'Quorum: w + r > n; multi-leader-এ conflict নিয়ম লাগে'],
  play: {
    kind: 'missions', intro: 'তিনটা incident।',
    missions: [
      ['Merchant সেভ করে রিফ্রেশে পুরোনো মান দেখছেন?', ['সদ্য লেখা leader থেকে পড়ান', 'কিছু করবেন না, নিজে ঠিক হবে', 'সব follower বন্ধ করে দিন', 'Cache-এর মেয়াদ আরও বাড়ান'], 'Read-your-writes।'],
      ['Leader ভাঙল, async follower নতুন leader হলো। ঝুঁকি?', ['শেষ কিছু লেখা হারাতে পারে', 'কোনো ঝুঁকিই থাকে না আর', 'সব data দ্বিগুণ হয়ে যায়', 'নতুন leader কখনো ভাঙে না'], 'Async মানে পৌঁছানোর নিশ্চয়তা নেই।'],
      ['ঢাকা আর সিঙ্গাপুর datacenter একই parcel-এর ঠিকানা আলাদা বদলাল?', ['আগের ঠিক করা conflict নিয়ম', 'শেষ ঘড়ির সময় দেখে ফেলে দেওয়া', 'দুটোই মুছে দেওয়া', 'কিছুই না'], 'ঘড়ি ভরসাযোগ্য নয়, নিয়ম আগে ঠিক করুন।'],
    ],
  },
  boss: [
    ['Sync আর async replication-এর তফাত?', ['Sync অপেক্ষা করে, async করে না', 'Async-এ কোনো follower থাকে না', 'Sync-এ কোনো leader থাকে না', 'দুটোর মধ্যে কোনো তফাত নেই'], 'Sync: কপি নিশ্চিত, কিন্তু ধীর বা আটকে যায়।'],
    ['Replication lag-এ সবচেয়ে চেনা সমস্যা?', ['নিজের লেখা না দেখা', 'Data দ্বিগুণ হওয়া', 'Disk ভরা', 'Network বন্ধ'], 'Follower পিছিয়ে থাকে।'],
    ['Failover-এ split brain কী?', ['দুজন নিজেকে leader ভাবা', 'সব follower একসাথে ঘুমিয়ে পড়া', 'Disk ভেঙে data হারিয়ে যাওয়া', 'Network হঠাৎ অনেক দ্রুত হওয়া'], 'দুজন লিখলে data নষ্ট।'],
    ['n = ৫, w = ৩, r = ২ হলে quorum-এর নিশ্চয়তা?', ['নেই: ৩ + ২ = ৫, ৫-এর বেশি নয়', 'আছে, কারণ ৩ অর্ধেকের বেশি', 'আছে, কিন্তু শুধু পড়ার সময়', 'আছে, কিন্তু শুধু লেখার সময়'], 'w + r > n লাগে।'],
    ['Multi-leader-এ conflict কেন?', ['একই data দুই জায়গায় একসাথে বদলায়', 'কোনো leader না থাকলে সবসময় হয়', 'Network খুব ছোট হলে এমন হয়', 'Disk ছোট হয়ে গেলে এমন হয়'], 'পরে মেলাতে নিয়ম লাগে।'],
  ],
});

export const l37 = level({
  id: 37, chapter: 7,
  title: 'Data ভাগ করা', concept: 'Key range · Hash · Hot spot · Rebalancing',
  story: 'আজকের তারিখের shard একাই ভারী',
  briefing: 'Parcel-এর data এক machine-এ ধরে না, তাই shard করা হলো। প্রথমে key রাখা হলো সৃষ্টির তারিখ। সেল-এর দিনে এক shard-ই সব চাপ নিয়ে বসে গেল। কীভাবে ভাগ করলে চাপ ছড়ায়?',
  ref: ddia(7, 'Sharding'),
  predict: ['Parcel-এর shard key তারিখ-সময় হলে নতুন সব লেখা কোথায় যায়?', ['আজকের এক shard-এ', 'সব shard-এ সমান', 'এলোমেলো', 'কোথাও না']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['r', 'Router', 'lb', 32, 50], ['s1', 'Shard ১', 'db', 62, 18], ['s2', 'Shard ২', 'db', 62, 50], ['s3', 'Shard ৩', 'db', 62, 82], ['map', 'মানচিত্র', 'key', 90, 50],
  ],
  steps: [
    { text: 'Router মানচিত্র দেখে কোন key কোন shard-এ তা ঠিক করে।', add: ['c', 'r', 'map', 's1', 's2', 's3'], flow: [['c', 'r'], ['r', 's2']] },
    { text: 'Key = তারিখ: সব নতুন parcel আজকের shard-এ যায়, বাকিরা বসে থাকে।', down: ['s1'], flow: [['r', 's1']], badges: { s1: 'hot spot' }, ask: ['এই hot spot দূর করতে key বদলে কী করবেন?', ['Parcel ID-র hash আগে রাখা', 'আরও পুরোনো তারিখ রাখা', 'আজকের তারিখই রেখে দেওয়া', 'Shard-এর সংখ্যা কমিয়ে দেওয়া']] },
    { text: 'Hash দিয়ে ছড়ানো সমান। কিন্তু কাছাকাছি key ছড়িয়ে যায়, তাই range query-তে সব shard ঘাঁটতে হয়।', ok: ['s1'], flow: [['r', 's1'], ['r', 's2'], ['r', 's3']] },
    { text: 'Compound key: merchant ID-র hash আগে, তারপর সময়। লেখা ছড়ায়, আবার এক merchant-এর সময়ের range সহজ।', focus: ['r', 'map'] },
    { text: 'একটা বিখ্যাত merchant-এর key-তে সবাই আসছে। Hash-এও এক key এক shard-এই।', down: ['s3'], flow: [['r', 's3']], badges: { s3: 'জনপ্রিয় key' } },
    { text: 'Shard বাড়ানো: hash mod N হলে প্রায় সব data সরে।', ok: ['s3'], ask: ['চার machine থেকে পাঁচে গেলে hash mod N-এ কত data সরে?', ['প্রায় ৮০%', 'প্রায় ২০%', 'ঠিক ১%', 'কিছুই না']] },
    { text: 'Fixed partition (আগে থেকে অনেক partition) হলে শুধু নতুন machine-এর ন্যায্য ভাগ, প্রায় ২০%, সরে। আর secondary index: local হলে লেখা সস্তা, পড়ায় সবাইকে জিজ্ঞেস; global হলে উল্টো।', focus: ['r'] },
  ],
  summary: ['Range: range query সহজ, কিন্তু hot spot; hash: ছড়ানো সমান', 'Hot key আলাদা কৌশল চায়', 'hash mod N নয়; fixed partition দিয়ে rebalance'],
  play: {
    kind: 'missions', intro: 'তিনটা সিদ্ধান্ত।',
    missions: [
      ['লেখা ছড়াতে চাই, কিন্তু merchant ধরে সময়ের range-ও লাগে। Key?', ['Merchant-এর hash, তারপর সময়', 'শুধু সময় দিয়ে ভাগ করা', 'শুধু parcel ID দিয়ে ভাগ', 'এক machine-এই সব রাখা'], 'Compound key।'],
      ['এক জনপ্রিয় key-তে পড়া-লেখা বিপুল। কী করবেন?', ['Key-র শেষে এলোমেলো সংখ্যা জুড়ে ভাঙা', 'কিছু না করে চুপচাপ অপেক্ষা করা', 'Shard-এর সংখ্যাটাই কমিয়ে ফেলা', 'Hash function বদলে একবার দেখা'], 'পড়ার সময় সব অংশ জুড়তে হয়, তাই শুধু hot key-তে।'],
      ['Zone ধরে parcel খুঁজতে চাই, shard key parcel ID। Local index-এ কী হয়?', ['সব shard-কে জিজ্ঞেস করে জুড়তে হয়', 'এক shard-ই সরাসরি উত্তর দেয়', 'Zone ধরে খোঁজা যায়ই না', 'এখানে index-ই লাগে না'], 'Scatter/gather।'],
    ],
  },
  boss: [
    ['Key-range sharding-এর লাভ?', ['Range query সহজ', 'Hot spot হয় না', 'সবসময় সমান ভাগ', 'কোনো লাভ নেই'], 'কাছাকাছি key একসাথে।'],
    ['Hash sharding-এর দাম?', ['Range query-তে সব shard ঘাঁটা', 'প্রতিটা লেখা অনেক ধীর হয়', 'কিছু data চিরতরে হারায়', 'Shard-এর সংখ্যা বাড়ানো যায় না'], 'কাছাকাছি key ছড়িয়ে যায়।'],
    ['Hash mod N-এ shard বাড়ালে?', ['প্রায় সব data সরে', 'কিছুই সরে না', 'শুধু নতুন shard', 'অর্ধেক'], 'N বদলালে নিয়মই বদলায়।'],
    ['Fixed partition-এ নতুন node এলে?', ['সবার কাছ থেকে কিছু partition সরে', 'সব partition নতুন করে সাজাতে হয়', 'কোনো partition-ই সরে না', 'পুরোনো node-এর data মুছে যায়'], 'Key-র partition কখনো বদলায় না।'],
    ['Global secondary index-এর দাম?', ['লেখায় একাধিক shard ছোঁয়া', 'পড়া সবসময় অনেক ধীর হয়', 'কোনো বাড়তি দামই নেই', 'Index আসলে কিছু রাখে না'], 'পড়া সস্তা, লেখা ভারী।'],
  ],
});

export const l38 = level({
  id: 38, chapter: 7,
  title: 'দুই cashier, শেষ ১টা stock', concept: 'ACID · Isolation · Lost update · Write skew',
  story: 'একটা জিনিস, দুই ক্রেতা',
  briefing: 'দোকানে শেষ ১টা জিনিস। দুই cashier প্রায় একই সময়ে বিক্রি করলেন, দুজনেই "বিক্রি হয়েছে" পেলেন। Transaction এই ধরনের ছোঁয়াছুঁয়ি সামলানোর জন্য, কিন্তু কতটা কড়া isolation লাগে?',
  ref: ddia(8, 'Transaction'),
  predict: ['দুই cashier একই সময়ে stock = ১ পড়ে ০ লিখলে?', ['দুজনেই বিক্রি করে ফেলে', 'শুধু একজন বিক্রি করে', 'Database বসে যায়', 'কোনো তফাত হয় না']],
  nodes: [
    ['a', 'Cashier ক', 'user', 10, 22], ['b', 'Cashier খ', 'user', 10, 78], ['st', 'Stock = ১', 'db', 46, 50], ['lk', 'Lock / atomic', 'key', 78, 22], ['ser', 'Serializable', 'service', 78, 78],
  ],
  steps: [
    { text: 'ক পড়ল stock = ১। খ-ও প্রায় একই সময়ে পড়ল stock = ১।', add: ['a', 'b', 'st'], flow: [['a', 'st'], ['b', 'st']] },
    { text: 'দুজনেই "১ − ১ = ০" লিখল। দুজনেই "বিক্রি হয়েছে" পেল।', badges: { st: 'দুই বিক্রি, ১ জিনিস' }, down: ['st'], ask: ['এই ভুলের নাম?', ['Lost update', 'Dirty read', 'Phantom', 'Deadlock']] },
    { text: 'সমাধান: পড়া-বদলানো-লেখা আলাদা না করে এক atomic আপডেট: "stock = stock − ১ যেখানে stock > ০"।', add: ['lk'], ok: ['st'], flow: [['a', 'lk'], ['lk', 'st']], focus: ['lk'] },
    { text: 'আরেক ধরন: "অন্তত একজন rider অন-ডিউটি থাকতেই হবে"। দুজন একসাথে নিজের ছুটি নিল, ভিন্ন সারি বদলে।', badges: { st: 'দুজন ছুটিতে' } },
    { text: 'এটা write skew: কেউ কারও সারি বদলায়নি, তাই lost update-এর সুরক্ষা ধরে না। Snapshot isolation-এও হয়।', add: ['ser'], focus: ['ser'], ask: ['কোন স্তর write skew আটকায়?', ['Serializable', 'Read committed', 'শুধু snapshot', 'কোনোটাই না']] },
    { text: 'Serializable তিন পথে: এক thread-এ একটার পর একটা, two-phase locking (lock, deadlock-সহ), আর SSI (আশাবাদী, commit-এ যাচাই)।', ok: ['ser'] },
    { text: 'Distributed transaction (two-phase commit) সবাইকে একমত করে, কিন্তু coordinator ভাঙলে "in doubt" হয়ে lock ধরে ঝুলে থাকে।', focus: ['st'] },
  ],
  summary: ['Lost update: atomic operation বা lock', 'Write skew: ভিন্ন সারি, serializable লাগে', 'Two-phase commit-এ coordinator ভাঙলে সবাই আটকা'],
  play: {
    kind: 'missions', intro: 'তিনটা incident।',
    missions: [
      ['Counter বাড়ানো app-এ পড়ে লিখছে, মাঝে মাঝে কমে যায়। সবচেয়ে সরল সমাধান?', ['Atomic: counter = counter + ১', 'আরও কয়েকটা server বসানো', 'আগে cache-এ জমিয়ে নেওয়া', 'এখন কিছু করার দরকার নেই'], 'Database-কেই করতে দিন।'],
      ['দুজন একই সময়ে শেষ মিটিং-ঘর book করল, ভিন্ন সময়-slot সারিতে?', ['Serializable বা শর্তের উপর lock', 'এখানে Read committed-ই যথেষ্ট', 'এখন কিছু করার দরকার নেই', 'আগে cache-এ দেখে নেওয়া'], 'শর্ত পড়ে, ভিন্ন সারি লেখা: write skew।'],
      ['Payment আর order দুই database। একসাথে commit করতে?', ['Two-phase commit বা idempotent retry', 'শুধু আশা করা যে দুটোই হবে', 'দুটো আলাদা লেখা, একটার পর একটা', 'পরে হাতে মিলিয়ে ঠিক করে নেওয়া'], 'কিন্তু coordinator ভাঙার ঝুঁকি।'],
    ],
  },
  boss: [
    ['Read committed কী আটকায়?', ['Dirty read আর dirty write', 'Lost update আর write skew', 'Phantom আর deadlock দুটোই', 'কিছুই আটকায় না'], 'বাকিগুলো থেকে যায়।'],
    ['ACID-এর Atomicity মানে?', ['মাঝপথে ভাঙলে সব ফেরত যায়', 'সব কাজ দ্রুত শেষ হয়', 'সব data এক machine-এ থাকে', 'শুধু পড়ার কাজ চলে'], 'আধা কাজ থাকে না।'],
    ['Write skew আর lost update-এর তফাত?', ['ভিন্ন সারি বনাম একই সারি', 'কোনো তফাত নেই, শুধু নাম', 'একটা শুধু পড়ার সময় হয়', 'একটা শুধু replica-তে হয়'], 'তাই সারি-ভিত্তিক সুরক্ষা ধরে না।'],
    ['2PL-এ কী হয় যদি দুজন একে অন্যের lock-এর অপেক্ষায়?', ['Deadlock হয়; একজনকে abort করা', 'দুজনেই নির্বিঘ্নে জিতে যায়', 'কিছুই হয় না, অপেক্ষা চলে', 'সব data আপনাআপনি মুছে যায়'], 'Database একজনকে বাতিল করে।'],
    ['Two-phase commit-এ coordinator ভাঙলে?', ['Participant-রা in doubt, lock ধরে থাকে', 'সবাই নিজে থেকেই commit করে ফেলে', 'সবাই নিজে থেকেই abort করে ফেলে', 'কিছুই ঘটে না, সব ঠিকঠাক চলে'], 'হ্যাঁ বলার পর পিছু হটা যায় না।'],
  ],
});

export const l39 = level({
  id: 39, chapter: 7,
  title: 'উত্তর নেই', concept: 'Timeout · Clock · Process pause · Fencing token',
  story: 'দুই "প্রধান" worker',
  briefing: 'একটা call-এর উত্তর এল না। Request হারাল, server ভাঙল, নাকি উত্তরই পথে হারাল? আবার দুই worker দুজনেই ভাবছে lock তার। অনেক machine-এ কিছু ভাঙা থাকবেই। তাই design-এ কী ধরে নিতে হয়?',
  ref: ddia(9, 'Distributed system-এর ঝামেলা'),
  predict: ['Request পাঠিয়ে উত্তর পেলেন না। কী জানা যায়?', ['কিছুই নিশ্চিত না: কাজ হয়ে থাকতেও পারে', 'নিশ্চিতভাবে কাজটা হয়নি বোঝা যায়', 'নিশ্চিত যে server ভেঙে গেছে', 'নিশ্চিত যে network ঠিক আছে']],
  nodes: [
    ['cl', 'Client', 'user', 8, 50], ['nw', 'Network', 'lb', 32, 50], ['sv', 'Server', 'server', 56, 50], ['ck', 'Clock', 'clock', 82, 20], ['lk', 'Lock service', 'key', 56, 82], ['stg', 'Storage', 'db', 90, 82],
  ],
  steps: [
    { text: 'Client request পাঠাল। উত্তর এল না।', add: ['cl', 'nw', 'sv'], flow: [['cl', 'nw'], ['nw', 'sv']], badges: { cl: 'নীরবতা' }, ask: ['এই নীরবতার সম্ভাব্য কারণ?', ['হারানো, ভাঙা, অথবা কাজ হয়ে যাওয়া', 'শুধু request পথে হারিয়ে গেছে', 'শুধু server-টা ভেঙে পড়েছে', 'শুধু client-এর কোডে ভুল আছে']] },
    { text: 'Client চারটা কারণ আলাদা করতে পারে না। একমাত্র উপায় timeout, আর retry নিরাপদ করতে idempotent request।', focus: ['cl'] },
    { text: 'Timeout ছোট হলে সুস্থ কিন্তু ধীর node-কে ভুল মৃত বলা; বড় হলে ভাঙা node ধরতে দেরি।', badges: { sv: 'ধীর, মৃত নয়' } },
    { text: 'ঘড়িও ভরসাযোগ্য নয়: দুই machine-এর ঘড়ি সরে যায়। Time-of-day ঘড়ি পিছাতে পারে; কত সময় গেল মাপতে monotonic ঘড়ি।', add: ['ck'], focus: ['ck'], badges: { ck: 'drift' } },
    { text: 'Process pause: worker lock নিয়ে GC-তে ১৫ সেকেন্ড থেমে গেল। মেয়াদ শেষ, অন্য worker lock পেল।', add: ['lk', 'stg'], down: ['sv'], flow: [['sv', 'lk']], badges: { sv: 'থামা' } },
    { text: 'পুরোনো worker জেগে লিখতে এল, ভাবছে lock তার।', ok: ['sv'], flow: [['sv', 'stg']], ask: ['এই পুরোনো লেখা কীভাবে আটকাবেন?', ['Fencing token: ছোট token storage ফেরায়', 'লেখার আগে ঘড়ি দেখে নেওয়া', 'Worker-কে বিশ্বাস করে ছেড়ে দেওয়া', 'Lock-এর timeout আরও বাড়ানো']] },
    { text: 'সত্য ঠিক করে সংখ্যাগরিষ্ঠ (quorum), কোনো একজন node-এর নিজের বিচার নয়।', focus: ['lk', 'stg'], ok: ['stg'] },
  ],
  summary: ['নীরবতার চার কারণ: timeout আর idempotent retry', 'ঘড়ি দিয়ে ক্রম নয়; monotonic দিয়ে সময় মাপা', 'Lock-এর সাথে fencing token'],
  play: {
    kind: 'missions', intro: 'তিনটা incident।',
    missions: [
      ['Payment call-এ timeout এল। Retry করলে?', ['Idempotency key ছাড়া দুবার চার্জ হতে পারে', 'নিশ্চিতভাবে ঠিক একবারই চার্জ হয়ে যায়', 'retry-তে কোনো ঝুঁকিই থাকে না, নিশ্চিন্ত', 'Retry করা কখনোই কোনোভাবে উচিত নয়'], 'কাজ হয়ে থাকতে পারে।'],
      ['দুই machine-এর timestamp দেখে last write wins। ঝুঁকি?', ['পিছিয়ে-থাকা ঘড়ির লেখা বাদ পড়তে পারে', 'কোনো ঝুঁকি নেই, সব ঘড়ি মেলানো', 'প্রতিটা লেখা দ্বিগুণ হয়ে যায়', 'Disk দ্রুত ভরে যায়'], 'ঘড়ি মেলে না।'],
      ['Lock-ধারক GC-তে থেমে ফিরে লিখল। সুরক্ষা?', ['Fencing token', 'আরও লম্বা lease', 'ঘড়ি মেলানো', 'কিছু না'], 'Storage পুরোনো token ফেরায়।'],
    ],
  },
  boss: [
    ['Timeout ছোট রাখার দাম?', ['সুস্থ ধীর node-কে মৃত বলা', 'ভাঙা node ধরা পড়ে না', 'নেটওয়ার্ক বাড়ে', 'কোনো দাম নেই'], 'অকারণ failover।'],
    ['Monotonic ঘড়ি কিসের জন্য?', ['কত সময় গেল মাপা', 'তারিখ দেখানো', 'দুই machine-এর ক্রম', 'কিছু না'], 'সে কখনো পিছায় না।'],
    ['Process pause কেন বিপজ্জনক?', ['Lock-এর মেয়াদ গেছে, process জানে না', 'Disk হঠাৎ করে ভেঙে পড়ে যায়', 'Network পুরোপুরি কেটে বিচ্ছিন্ন হয়', 'Memory আপনাআপনি বেড়ে চলতে থাকে'], 'ফিরে ভাবে lock এখনো তার।'],
    ['Fencing token কী করে?', ['বাড়তি সংখ্যা; ছোটগুলো প্রত্যাখ্যান করে', 'Lock-এর মেয়াদ ছোট করে দেয়', 'সব machine-এর ঘড়ি মিলিয়ে দেয়', 'Worker-এর নামটা গোপন রাখে'], 'পুরোনো ধারকের ক্ষতি আটকায়।'],
    ['Quorum কেন ব্যবহার হয়?', ['এক node-এর বিচার বিশ্বাসযোগ্য নয়', 'শুধু গতি বাড়ানোর জন্য', 'শুধু storage-এর জায়গা বাঁচাতে', 'কোনো বিশেষ কারণ নেই'], 'সংখ্যাগরিষ্ঠ সিদ্ধান্ত নেয়।'],
  ],
});

export const l40 = level({
  id: 40, chapter: 7,
  title: 'রাতের বড় হিসাব', concept: 'Batch · MapReduce · Shuffle · Skew',
  story: 'এক merchant, সারা রাত',
  briefing: 'প্রতি রাতে সারাদিনের কোটি delivery থেকে প্রতি merchant-এর হিসাব। Online request-এর মতো মুহূর্তে উত্তর লাগে না; লাগে বড় data-র ওপর বড় কাজ, আর ভাঙলে আবার চালানো। কিন্তু এক merchant-এর জন্য পুরো job আটকে গেল।',
  ref: ddia(11, 'Batch processing'),
  predict: ['Batch job মাঝপথে একটা task ভাঙল। সবচেয়ে সহজ উত্তর?', ['শুধু সেই task আবার চালানো', 'পুরো job মুছে নতুন করে শুরু', 'আর কখনো job চালানো নয়', 'বাকি ফল দেখে অনুমান করা']],
  nodes: [
    ['in', 'Input (object store)', 'store', 8, 50], ['m1', 'Map ১', 'worker', 34, 24], ['m2', 'Map ২', 'worker', 34, 76], ['sh', 'Shuffle', 'queue', 60, 50], ['r1', 'Reduce (hot key)', 'worker', 88, 24], ['r2', 'Reduce', 'worker', 88, 76],
  ],
  steps: [
    { text: 'Input অপরিবর্তনীয়; কাজ টুকরো টুকরো হয়ে অনেক worker-এ।', add: ['in', 'm1', 'm2'], flow: [['in', 'm1'], ['in', 'm2']] },
    { text: 'Map প্রতি রেকর্ড থেকে (merchant, ১) জোড়া বানায়।', focus: ['m1', 'm2'] },
    { text: 'Shuffle: key ধরে সাজিয়ে একই merchant-এর সব জোড়া এক reducer-এ। এটাই সবচেয়ে ভারী ধাপ: সব node থেকে সব node-এ data।', add: ['sh'], flow: [['m1', 'sh'], ['m2', 'sh']], ask: ['কোন ধাপ সবচেয়ে ভারী?', ['Shuffle: নেটওয়ার্কে সব data ঘোরে', 'Map: প্রতিটা record একবার পড়া', 'শুধু input file পড়ে নেওয়া', 'কোনোটাই বিশেষ ভারী নয়']] },
    { text: 'Reduce প্রতি key-র মান জুড়ে ফল দেয়।', add: ['r1', 'r2'], flow: [['sh', 'r1'], ['sh', 'r2']] },
    { text: 'এক বিশাল merchant: সব রেকর্ড এক reducer-এ। বাকিরা শেষ, সে একা চলছে (skew)।', down: ['r1'], ok: ['r2'], badges: { r1: 'ঘণ্টা ধরে' }, ask: ['Skew কমাতে?', ['Hot key ভেঙে আংশিক গুনে জোড়া', 'Worker-এর সংখ্যা কমিয়ে দেওয়া', 'Input data অর্ধেক করে ফেলা', 'কিছু না করে অপেক্ষা করা']] },
    { text: 'ছোট table-এর সাথে join: broadcast, ছোটটা সব worker-এ পাঠিয়ে shuffle এড়ানো।', ok: ['r1'], focus: ['sh'] },
    { text: 'Spark-ধরনের dataflow engine মাঝের ফল ফাইলে না লিখে সোজা পরের ধাপে পাঠায়। Output পুরোটা বানিয়ে একবারে বসানো ভালো, এক এক রেকর্ড করে নয়।', focus: ['in'] },
  ],
  summary: ['Input অপরিবর্তনীয়, তাই ভাঙলে শুধু task আবার', 'Shuffle সবচেয়ে ভারী; skew সবচেয়ে ধীর task-এ আটকায়', 'Broadcast join, dataflow engine, output একবারে বসানো'],
  play: {
    kind: 'missions', intro: 'তিনটা সিদ্ধান্ত।',
    missions: [
      ['Job-এর ২০ মিনিট পর বাকি সব task শেষ, একটা সারা রাত চলছে?', ['Skew: hot key ভেঙে ভাগ করা', 'আরও worker জুড়ে দেওয়া', 'Input আরও ছোট করে ফেলা', 'কিছুই না করে অপেক্ষা করা'], 'Job ধীরতম task-এর সাথে শেষ হয়।'],
      ['বিশাল delivery table-এর সাথে ছোট merchant table জুড়তে?', ['Broadcast hash join', 'দুটোই shuffle', 'নকল করে বড় বানানো', 'কিছু না'], 'ছোটটা সবার কাছে পাঠিয়ে shuffle বাঁচে।'],
      ['Batch-এর ফল চালু database-এ ঢোকাবেন কীভাবে?', ['পুরোটা বানিয়ে একবারে বদলে নেওয়া', 'এক এক রেকর্ড করে লিখে যাওয়া', 'সরাসরি app-এর ভেতরে ঢোকানো', 'ফল database-এ কখনোই না ঢোকানো'], 'আধা অবস্থা app দেখে না।'],
    ],
  },
  boss: [
    ['Batch আর online-এর পার্থক্য?', ['Batch: বড় data, throughput-ই মাপ', 'Batch মুহূর্তে একটা উত্তর দেয়', 'Online-এ কোনো data থাকে না', 'দুটোর মধ্যে কোনো তফাত নেই'], 'মাপ throughput।'],
    ['Map আর reduce কী করে?', ['Map জোড়া বানায়; reduce key ধরে জোড়ে', 'Map জোড়ে; reduce আলাদা ভাগ করে', 'দুটোই একই কাজ, নাম আলাদা', 'দুটোই শুধু file কপি করে'], 'মাঝে shuffle।'],
    ['Shuffle কেন ভারী?', ['সব node থেকে সব node-এ data যায়', 'শুধু disk থেকে একবার পড়া', 'শুধু CPU-র হিসাব চলে', 'আসলে এটা মোটেও ভারী নয়'], 'নেটওয়ার্ক-ভারী।'],
    ['Dataflow engine কেন দ্রুত?', ['মাঝের ফল file-এ না লিখে সোজা পাঠায়', 'শুরু থেকেই data অনেক কম নেয়', 'প্রতিটা ধাপে disk আরও বেশি ব্যবহার', 'এর কোনো আলাদা কারণই নেই'], 'পুরো কাজ এক গ্রাফ।'],
    ['Skew-এ job কেন ধীর?', ['এক task অসম ভার পায়, বাকিরা বসে', 'সব worker একসাথে ধীর হয়', 'Disk ছোট বলে সব আটকে যায়', 'এর কোনো আলাদা কারণই নেই'], 'শেষ হয় ধীরতমের সাথে।'],
  ],
});

export const l41 = level({
  id: 41, chapter: 7,
  title: 'Event-এর স্রোত', concept: 'Log broker · CDC · Event time · Exactly-once',
  story: 'দুইবার চলা SMS',
  briefing: 'Batch-এর ফল আসে পরের দিন, কিন্তু "ডেলিভারড" হতেই SMS চাই। Stream-এ event সীমাহীন চলে। কিন্তু job ভাঙার পর ৬০০ জন একই SMS দুবার পেলেন। Stream-এ ভুল ছাড়া কীভাবে চলবে?',
  ref: ddia(12, 'Stream processing'),
  predict: ['Database আর search index দুই জায়গায় আলাদা লিখলে (dual write) কী হতে পারে?', ['একটা ব্যর্থ হয়ে দুটো মিলে না', 'সবসময় মেলে', 'দ্রুত হয়, কোনো ঝুঁকি নেই', 'Index নিজে ঠিক করে']],
  nodes: [
    ['db', 'Orders DB', 'db', 8, 50], ['cdc', 'CDC', 'worker', 30, 50], ['lg', 'Log (broker)', 'queue', 54, 50], ['ix', 'Search index', 'db', 82, 22], ['sms', 'SMS job', 'worker', 82, 78], ['ck', 'Event time', 'clock', 54, 14],
  ],
  steps: [
    { text: 'App শুধু database-এ লেখে। কিছু অন্য জায়গায়ও লাগে।', add: ['db'], focus: ['db'] },
    { text: 'CDC database-এর নিজের পরিবর্তনের log পড়ে event বানায়: database একমাত্র লেখা-জায়গা, বাকিরা একই ক্রমে অনুসরণ করে।', add: ['cdc', 'lg'], flow: [['db', 'cdc'], ['cdc', 'lg']], ask: ['Dual write-এর চেয়ে CDC কেন ভালো?', ['একই ক্রমে অনুসরণ করে; অমিল হয় না', 'শুধু বেশি দ্রুত, আর কিছু না', 'শুধু অনেক বেশি সস্তা বলে', 'এর কোনো বিশেষ সুবিধা নেই']] },
    { text: 'Log-ভিত্তিক broker event রেখে দেয়, consumer শুধু offset এগোয়। তাই index আর SMS আলাদা আলাদা পড়ে।', add: ['ix', 'sms'], flow: [['lg', 'ix'], ['lg', 'sms']] },
    { text: 'ফোন offline ছিল। ১০:০২-র event এল ১০:০৯-এ। কোন সময়ে window?', add: ['ck'], focus: ['ck'], ask: ['Event time ধরলে ১০:০২-র event কোন window-এ?', ['১০:০০–১০:০৫ (ঘটার সময়)', '১০:০৫–১০:১০ (পাওয়ার সময়)', 'কোথাও না', 'দুটোতেই']] },
    { text: 'Watermark: "এর আগের সব event এসে গেছে ধরি", তারপর window বন্ধ; পরে আসা event আলাদাভাবে সামলাতে হয়।', focus: ['ck', 'lg'] },
    { text: 'SMS job ভাঙল, checkpoint থেকে ফিরে ৬০০ event আবার চালাল। ৬০০ জন একই SMS দুবার পেলেন।', down: ['sms'], badges: { sms: 'দ্বিতীয়বার' } },
    { text: 'Exactly-once মানে প্রভাব একবার: event ID থেকে idempotency key, বা ফল আর offset একই transaction-এ।', ok: ['sms'], focus: ['sms'] },
  ],
  summary: ['CDC: database-এর log থেকে সবাইকে একই ক্রমে', 'Event time আর watermark: দেরির event ঠিক window-এ', 'Exactly-once = idempotent প্রভাব'],
  play: {
    kind: 'missions', intro: 'তিনটা incident।',
    missions: [
      ['Search index প্রায়ই database-এর সাথে মেলে না, দুই জায়গায় আলাদা লেখার কারণে?', ['CDC দিয়ে database-এর log অনুসরণ', 'দুই জায়গায় আরও বেশি করে লেখা', 'Index-টা পুরোপুরি মুছে ফেলা', 'কিছু না করে চুপচাপ অপেক্ষা'], 'এক উৎস, এক ক্রম।'],
      ['Consumer-এর গতি আসার হারের চেয়ে ধীর, backlog বাড়ছে?', ['Consumer বাড়ান বা ধীর ধাপ খুঁজুন', 'Producer পুরোপুরি বন্ধ করে দিন', 'Log মুছে ফেলে নতুন করে শুরু', 'কিছু না করে অপেক্ষা করুন'], 'ধরে ফেলতে আসা-হারের চেয়ে দ্রুত হতে হবে।'],
      ['Job ভাঙার পর SMS দুবার যাচ্ছে?', ['Event ID ধরে idempotency key রাখা', 'Checkpoint আরও কম করে নেওয়া', 'SMS-এর ব্যবস্থাই বন্ধ করে দেওয়া', 'কিছু না করে ধরে নেওয়া'], 'বাইরের প্রভাব ফেরানো যায় না।'],
    ],
  },
  boss: [
    ['Queue আর log-ভিত্তিক broker-এর পার্থক্য?', ['Log event রেখে দেয়, আবার পড়া যায়', 'Queue আবার পড়ায়, log পড়ায় না', 'দুটো একই, শুধু নামে আলাদা', 'Log পড়ার সাথে সাথে মুছে ফেলে'], 'Offset এগোয়, event থাকে।'],
    ['CDC কী?', ['Database-এর পরিবর্তন event হিসেবে পাঠানো', 'Cache-টা পুরোপুরি বন্ধ করে দেওয়া', 'পুরোনো index মুছে ফেলার কাজ', 'Client-এর ঘড়ি মিলিয়ে নেওয়া'], 'Replication log পড়ে।'],
    ['Event time বনাম processing time?', ['ঘটার সময় বনাম পাওয়ার সময়', 'দুটো একই জিনিস, নাম আলাদা', 'দুটোই শুধু file-এর নাম মাত্র', 'দুটোই ঘড়ির সাথে যুক্ত নয়'], 'Late event-এর জন্য ফারাক।'],
    ['Watermark কী বলে?', ['এই সময়ের আগের সব event এসেছে ধরি', 'এখনই সব event মুছে ফেলুন', 'Window-টা আরও অনেক বড় করুন', 'এটা আসলে কিছুই বলে না'], 'Window বন্ধ করার সংকেত।'],
    ['Exactly-once কীভাবে সম্ভব?', ['প্রভাব idempotent করে', 'event কখনো দুবার চলে না বলে', 'Network নির্ভরযোগ্য বলে', 'সম্ভব না'], 'ভেতরে দুবার চলতে পারে, প্রভাব একবার।'],
  ],
});
