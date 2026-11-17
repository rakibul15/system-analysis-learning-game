import { level } from '../dsl';

/* Chapter ৭ · বোনাস: DDIA-র গভীরে — storage, analytics, encoding, consensus */

const note = (id: string, label: string) => ({ label: `নোট: ${label}`, url: `./#/notes/${id}` });

export const l31 = level({
  id: 31, chapter: 7,
  title: 'Disk-এ data কীভাবে বসে', concept: 'LSM-tree · B-tree · Index',
  story: 'Rider location লেখার ঝড়',
  briefing: '৫০,০০০ rider প্রতি ৫ সেকেন্ডে অবস্থান পাঠায়; order table-এ লেখা কম, পড়া অনেক। একই DB দুই কাজে সমান ভালো না। ভেতরের দুই গঠন, LSM আর B-tree, কোথায় জেতে।',
  ref: note('storage', 'Storage engine'),
  predict: ['সেকেন্ডে ১০,০০০ লেখা, পড়া খুব কম। কোন গঠন বেশি মানায়?', ['LSM-tree: memory-তে জমিয়ে ক্রমিক লেখা', 'B-tree: জায়গায় জায়গায় বদল', 'প্রতিটা কলামে index', 'একটা বড় JSON file']],
  nodes: [
    ['w', 'লেখা', 'user', 8, 50], ['log', 'Commit log', 'store', 32, 22], ['mem', 'Memtable', 'cache', 32, 72], ['ss', 'SSTable file', 'db', 60, 72],
    ['bf', 'Bloom filter', 'key', 60, 30], ['cmp', 'Compaction', 'worker', 86, 72], ['bt', 'B-tree page', 'db', 86, 26],
  ],
  steps: [
    { text: 'লেখা আগে commit log-এর শেষে যোগ হয়, crash-এ ফেরত আনার জন্য।', add: ['w', 'log'], flow: [['w', 'log']] },
    { text: 'তারপর memory-র সাজানো গঠনে (memtable)।', add: ['mem'], flow: [['w', 'mem']] },
    { text: 'Memtable ভরে গেল।', badges: { mem: 'ভরা' }, ask: ['এখন কী হয়?', ['সাজানো অবস্থায় disk-এ নতুন file', 'পুরনো লেখা মুছে জায়গা করা', 'নতুন লেখা পুরো বন্ধ হয়ে যায়', 'পুরোটা cache-এ সরিয়ে রাখা']] },
    { text: 'একবারে ক্রমিকভাবে disk-এ SSTable: এজন্যই লেখা দ্রুত।', add: ['ss'], flow: [['mem', 'ss']] },
    { text: 'পড়ায় "এই file-এ নেই" দ্রুত বলতে প্রতিটা file-এর Bloom filter; পেছনে compaction পুরনো file মিলিয়ে ছোট করে।', add: ['bf', 'cmp'], flow: [['bf', 'ss'], ['ss', 'cmp']] },
    { text: 'B-tree: নির্দিষ্ট আকারের পাতা, জায়গায় বদল; পড়া স্থির আর অনুমানযোগ্য। Order, payment-এর মতো table-এ।', add: ['bt'], focus: ['bt'], badges: { bt: 'পড়া স্থির' }, ask: ['Order আর payment table-এ কোন গঠন বেশি মানায়?', ['B-tree', 'Bloom filter', 'Memtable', 'Commit log']] },
    { text: 'মোটা দাগে: লেখা-ভারী, পড়া কম হলে LSM; পড়া-ভারী আর স্থির দেরি চাই হলে B-tree।', focus: ['ss', 'bt'] },
  ],
  summary: ['LSM: memory-তে জমিয়ে ক্রমিক লেখা, পরে compaction', 'B-tree: পাতা ধরে জায়গায় বদল, পড়া স্থির', 'প্রতিটা index প্রতিটা লেখায় বাড়তি কাজ'],
  play: {
    kind: 'missions', intro: 'তিনটা data, তিনটা সিদ্ধান্ত।',
    missions: [
      ['Rider location: সেকেন্ডে হাজারো লেখা, পড়া কদাচিৎ?', ['LSM-ভিত্তিক store', 'B-tree, প্রতিটা কলামে index', 'Spreadsheet', 'শুধু browser storage'], 'লেখা-ভারী কাজে ক্রমিক লেখা জেতে।'],
      ['Dashboard query: merchant_id দিয়ে filter, created_at দিয়ে sort?', ['দুই কলাম মিলিয়ে একটা index', 'দুই কলামে দুটো আলাদা index', 'কোনো index না, table ছোট', 'প্রতিটা কলামে একটা করে index'], 'Query-র ক্রমে index।'],
      ['LSM-এ একটা key মুছলেন, disk সাথে সাথে খালি হলো না কেন?', ['আগে মোছার চিহ্ন, পরে compaction', 'Disk-টা আসলে নষ্ট হয়ে গেছে', 'মোছার কাজটা ব্যর্থ হয়েছে', 'Bloom filter মোছা আটকেছে'], 'Tombstone, তারপর compaction।'],
    ],
  },
  boss: [
    ['LSM-এ লেখা দ্রুত কেন?', ['Memory-তে জমিয়ে ক্রমিক লেখা', 'Disk-এ কখনোই কিছু লেখে না', 'কোনো index রাখতে হয় না', 'কোনো network লাগে না বলে'], 'এলোমেলো লেখার চেয়ে ক্রমিক লেখা অনেক দ্রুত।'],
    ['Bloom filter "নেই" বললে?', ['নিশ্চিত নেই; disk দেখতে হয় না', 'হয়তো আছে, disk দেখতে হবে', 'নিশ্চিত আছে, সরাসরি পড়ো', 'আবার জিজ্ঞেস করতে হবে'], 'ভুল "আছে" হতে পারে, ভুল "নেই" না।'],
    ['Compaction কী করে?', ['File মিলিয়ে পুরনো মান বাদ দেয়', 'নতুন লেখা কিছুক্ষণ বন্ধ রাখে', 'নতুন একটা index বানায়', 'পুরো cache খালি করে দেয়'], 'জায়গা ফেরে, পড়া দ্রুত হয়।'],
    ['B-tree কোথায় বেশি মানায়?', ['পড়া বেশি, স্থির দেরি চাই', 'অবিরাম লেখার stream-এ', 'Append-only log file-এ', 'বড় video রাখার জায়গায়'], 'Relational DB-র ভিত।'],
    ['প্রতিটা কলামে index দিলে?', ['প্রতিটা লেখা ধীর, disk বেশি', 'সব query দ্রুত, কোনো দাম নেই', 'Data হারায়', 'কিছুই হয় না'], 'Index পড়ায় সাহায্য, লেখায় দাম।'],
  ],
});

export const l32 = level({
  id: 32, chapter: 7,
  title: 'Analytics-এর আলাদা জগৎ', concept: 'OLTP vs OLAP · Column store · Materialized view',
  story: 'মাস শেষের রিপোর্ট',
  briefing: 'মাসের শুরুতে সব merchant রিপোর্ট খোলে: লাখো সারি পড়া, তিনটা কলাম দরকার। Live order DB-তে চালালে order নেওয়া ধীর। Analytics-এর জন্য আলাদা গঠন।',
  ref: note('storage', 'Storage engine'),
  predict: ['৪০ কলামের ৫ কোটি সারি থেকে মাত্র ৩টা কলাম যোগ করতে হবে। কোন storage?', ['Column-oriented', 'Row-oriented, সব index সহ', 'Key-value', 'Message queue']],
  nodes: [
    ['oltp', 'Order DB (OLTP)', 'db', 12, 50], ['cdc', 'CDC', 'queue', 36, 50], ['wh', 'Warehouse (column)', 'store', 62, 50], ['mv', 'Daily rollup', 'cache', 86, 26], ['dash', 'Merchant dashboard', 'user', 86, 76],
  ],
  steps: [
    { text: 'Live order DB: ছোট ছোট পড়া-লেখা, প্রতিটা একটা order (OLTP)।', add: ['oltp'] },
    { text: 'রিপোর্ট সরাসরি এখানে চালালে কী হয়?', ask: ['বড় scan live DB-তে চালালে?', ['Order নেওয়া ধীর, timeout', 'কিছুই হয় না, সব ঠিক', 'রিপোর্ট আরও দ্রুত হয়', 'DB নিজে নিজে ভাগ হয়']] },
    { text: 'বদলগুলো CDC দিয়ে আলাদা warehouse-এ যায়।', add: ['cdc', 'wh'], flow: [['oltp', 'cdc'], ['cdc', 'wh']] },
    { text: 'Warehouse কলাম ধরে রাখে: শুধু দরকারি কলাম পড়া, একই ধরনের মান পাশাপাশি বলে দারুণ compress।', focus: ['wh'], badges: { wh: 'কলাম ধরে' }, ask: ['৪০টার মধ্যে ৩টা কলাম দরকার হলে column store কী পড়ে?', ['শুধু ওই ৩টা কলাম', 'পুরো ৪০ কলামের সারি', 'শুধু index', 'কিছুই না']] },
    { text: 'বারবার একই যোগফল না করে দিন-ভিত্তিক rollup আগে থেকে হিসাব; dashboard সেটা পড়ে।', add: ['mv', 'dash'], flow: [['wh', 'mv'], ['mv', 'dash']] },
  ],
  summary: ['OLTP আর analytics-এর চাপ আলাদা; আলাদা জায়গায় চালান', 'Column store: দরকারি কলাম পড়া, ভালো compression', 'Materialized view/rollup: বারবার একই হিসাব না'],
  play: {
    kind: 'missions', intro: 'তিনটা রিপোর্টের সমস্যা।',
    missions: [
      ['মাসের রিপোর্টে live API timeout দিচ্ছে?', ['রিপোর্ট আলাদা warehouse-এ', 'API server বাড়ানো', 'রিপোর্ট বন্ধ', 'Index বাড়ানো'], 'আলাদা কাজ, আলাদা জায়গা।'],
      ['Dashboard প্রতিবার একই মাসিক যোগ করছে?', ['আগে থেকে rollup রাখা', 'প্রতিবার কাঁচা সারি যোগ', 'Browser-এ হিসাব', 'Sample থেকে আন্দাজ'], 'Materialized view।'],
      ['Warehouse-এ data কীভাবে পৌঁছায়?', ['CDC বা নিয়মিত ETL', 'হাতে CSV', 'User নিজে পাঠায়', 'পৌঁছায় না'], 'Live DB-র বদল ধরে পাঠানো।'],
    ],
  },
  boss: [
    ['OLTP আর OLAP-এর মূল পার্থক্য?', ['ছোট কাজ বনাম বড় scan আর যোগ', 'আসলে দুটো একদম একই জিনিস', 'OLAP শুধু লেখে, পড়ে না', 'OLTP-তে কোনো index থাকে না'], 'চাপের ধরন আলাদা।'],
    ['Column store কেন analytics-এ দ্রুত?', ['দরকারি কলামই পড়ে, ভালো compress', 'প্রতিবার সব কলাম পড়ে নেয়', 'কোনো index লাগে না বলে', 'কোনো memory লাগে না বলে'], 'কম পড়া, কম disk।'],
    ['Star schema-র মাঝে কী?', ['ঘটনার fact table', 'User-দের table', 'একটা cache স্তর', 'একটা log file'], 'চারপাশে dimension।'],
    ['Materialized view কী?', ['আগে থেকে হিসাব করা ফল', 'একটা cache server', 'একটা বিশেষ index', 'একটা message queue'], 'বারবার একই হিসাব বাঁচায়।'],
    ['Warehouse হালনাগাদ রাখতে?', ['CDC বা ETL', 'প্রতিবার live DB-তে query', 'হাতে কপি', 'কিছু না'], 'Live DB-র বদল ধরে।'],
  ],
});

export const l33 = level({
  id: 33, chapter: 7,
  title: 'পুরনো আর নতুন একসাথে', concept: 'Encoding · Compatibility · Expand-contract',
  story: 'Rolling deploy-এর মাঝখানে',
  briefing: 'নতুন field "landmark" যোগ হচ্ছে। কিছু server নতুন, কিছু পুরনো; লাখো phone-এ পুরনো app। ভুল নিয়মে একটা field যোগ করাই data হারানো বা crash-এর কারণ।',
  ref: note('encoding', 'Encoding'),
  predict: ['Deploy-এর সময় পুরনো server নতুন field-ওয়ালা সারি পড়ে আবার লিখল। কী ঝুঁকি?', ['অচেনা field মুছে যেতে পারে', 'কোনো ঝুঁকিই নেই এখানে', 'সারিটা দ্বিগুণ হয়ে যায়', 'DB পুরোপুরি বন্ধ হয়ে যায়']],
  nodes: [
    ['v2', 'Server v2', 'server', 14, 26], ['v1', 'Server v1', 'server', 14, 74], ['db', 'DB', 'db', 50, 50], ['app', 'পুরনো app', 'user', 86, 26], ['sch', 'Schema', 'key', 86, 74],
  ],
  steps: [
    { text: 'v2 নতুন field সহ লেখে; v1 এখনো চালু।', add: ['v2', 'v1', 'db'], flow: [['v2', 'db']], badges: { db: '+landmark' } },
    { text: 'v1 সারিটা পড়ে বদলে আবার লেখে।', flow: [['db', 'v1'], ['v1', 'db']], ask: ['v1 অচেনা field ফেলে দিলে?', ['landmark হারায়', 'কিছুই হয় না', 'v1 crash করে', 'landmark দুবার হয়']] },
    { text: 'নিয়ম ১: পুরনো code অচেনা field অক্ষত রাখবে (forward compatibility)।', ok: ['v1'] },
    { text: 'নিয়ম ২: নতুন field optional, default সহ; নতুন code পুরনো data পড়তে পারবে (backward compatibility)।', add: ['sch'], focus: ['sch'], ask: ['নতুন code পুরনো সারি (landmark ছাড়া) পড়লে?', ['Default মান নেয়', 'Crash করে', 'সারি মুছে দেয়', 'পুরনো server-কে ডাকে']] },
    { text: 'পুরনো app-ও নতুন response পায়; অচেনা field উপেক্ষা করে।', add: ['app'], flow: [['db', 'app']] },
    { text: 'Schema বদল expand → copy → reads → writes → contract ধাপে; প্রতিটা ধাপে ফেরা যায়।', focus: ['db'], badges: { db: 'expand → contract' } },
  ],
  summary: ['Backward: নতুন code পুরনো data পড়ে; forward: পুরনো code নতুন data', 'নতুন field optional, default সহ; field নম্বর আবার ব্যবহার না', 'Schema বদল expand-contract ধাপে'],
  play: {
    kind: 'missions', intro: 'তিনটা deploy-এর সিদ্ধান্ত।',
    missions: [
      ['কলামের নাম বদলাতে হবে, deploy rolling?', ['নতুন কলাম, দুটোতে লেখা, পরে মোছা', 'একই deploy-এ সরাসরি rename', 'রাতে app বন্ধ রেখে বদলানো', 'কখনো নাম বদলানো যাবে না'], 'Expand-contract।'],
      ['Protobuf-এ field ৭ বাদ দিয়ে নতুন field-কে ৭ দেবেন?', ['না, নতুন নম্বর; ৭ সংরক্ষিত', 'হ্যাঁ, কোনো সমস্যা নেই', 'শুধু string field হলে', 'শুধু রাতের deploy-এ'], 'পুরনো data ভুল অর্থে পড়া হবে।'],
      ['১৯ অঙ্কের order ID JSON-এ?', ['String হিসেবে', 'Number হিসেবে', 'Float হিসেবে', 'দুই ভাগে'], 'JavaScript-এ ৫৩ bit-এর বেশি নির্ভুল না।'],
    ],
  },
  boss: [
    ['Rolling deploy-এ কোন compatibility লাগে?', ['দুটোই: backward আর forward', 'শুধু backward compatibility', 'শুধু forward compatibility', 'কোনোটাই লাগে না'], 'পুরনো-নতুন একসাথে চলে।'],
    ['নতুন field যোগের নিরাপদ উপায়?', ['Optional, default সহ', 'Required', 'পুরনো field-এর নামে', 'আলাদা DB-তে'], 'পুরনো data আর পুরনো client ভাঙে না।'],
    ['Protobuf-এ field নম্বর?', ['কখনো আবার ব্যবহার না', 'যত খুশি বদলানো', 'প্রতি deploy-এ নতুন', 'নম্বর লাগে না'], 'নম্বরই পরিচয়।'],
    ['Avro-তে পুরনো data পড়তে?', ['লেখক আর পাঠকের schema মিলিয়ে', 'শুধু পাঠকের schema দিয়ে', 'কোনো schema ছাড়াই পড়া', 'পুরনো data পড়াই যায় না'], 'দুই schema-র মিল।'],
    ['কলাম rename-এর নিরাপদ ক্রম?', ['Expand থেকে contract, ধাপে ধাপে', 'আগে rename, তারপর deploy', 'আগে contract, তারপর expand', 'সব ধাপ একসাথে এক deploy-এ'], 'প্রতি ধাপে ফেরার পথ।'],
  ],
});

export const l34 = level({
  id: 34, chapter: 7,
  title: 'সবাই একমত', concept: 'Linearizability · CAP · Raft · Fencing',
  story: 'Payout-এর একজনই মালিক',
  briefing: 'দুটো payout worker যেন একসাথে একই merchant-কে টাকা না পাঠায়; wallet-এর log কয়েক কপিতে, কিন্তু সবাই একই ক্রমে একমত। এর ভিত consensus।',
  ref: note('consensus', 'Consensus'),
  predict: ['৫ node-এর Raft cluster-এ কয়টা node হারিয়েও লেখা চলে?', ['২টা', '৪টা', '০টা', '৩টা']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['l', 'Leader', 'server', 38, 50], ['f1', 'Follower ১', 'server', 68, 18], ['f2', 'Follower ২', 'server', 68, 50],
    ['f3', 'Follower ৩', 'server', 68, 82], ['st', 'Storage (fencing)', 'db', 92, 50],
  ],
  steps: [
    { text: 'Client লেখা পাঠায় leader-কে; leader নিজের log-এ লিখে follower-দের পাঠায়।', add: ['c', 'l', 'f1', 'f2', 'f3'], flow: [['c', 'l'], ['l', 'f1'], ['l', 'f2'], ['l', 'f3']] },
    { text: 'কখন commit?', ask: ['Leader কখন লেখাকে commit ধরে?', ['Majority log-এ লিখলে', 'Leader নিজে লিখলেই', 'সবাই লিখলে তবেই', 'Client বলে দিলে']] },
    { text: '৪-এর মধ্যে নিজেকে নিয়ে ৩ (majority) পেলেই commit; একজন follower ধীর হলেও চলে।', badges: { l: 'commit' }, down: ['f3'] },
    { text: 'Leader পড়ে গেল; বাকিরা ভোট দিয়ে নতুন leader বাছে, শুধু হালনাগাদ log-ওয়ালা জিততে পারে।', down: ['l'], ok: ['f3'], badges: { f1: 'নতুন leader' }, ask: ['নতুন leader কে হতে পারে?', ['হালনাগাদ log, majority ভোট', 'যে প্রথমে জেগে ওঠে', 'সবচেয়ে পুরনো node', 'Client যাকে বেছে নেয়']] },
    { text: 'পুরনো leader ফিরে ভাবছে সে-ই leader। Storage বড় term/token দেখে তার লেখা ফেরায়।', add: ['st'], ok: ['l'], flow: [['l', 'st']], badges: { st: 'পুরনো token বাতিল' } },
  ],
  summary: ['Linearizable: যেন একটাই কপি; একবার নতুন দেখলে পরে সবাই নতুন', 'Raft: majority পেলে commit; ২f+১ node-এ f ব্যর্থতা সহ্য', 'Network ভাঙলে consistency না availability: টাকায় consistency'],
  play: {
    kind: 'missions', intro: 'তিনটা একমত হওয়ার সমস্যা।',
    missions: [
      ['Payout-এর জন্য lock লাগবে। কী ব্যবহার করবেন?', ['etcd/ZooKeeper-এর lock, সাথে fencing token', 'নিজের বানানো Redis lock, মেয়াদ দিয়ে', 'App memory-তে একটা flag', 'কিছু না'], 'Consensus নিজে বানাবেন না।'],
      ['দুই data center-এর যোগাযোগ কাটা গেল, wallet-এ কী করবেন?', ['Majority-হীন পাশ লেখা বন্ধ', 'দুই পাশেই লেখা চালু রাখা', 'সব কিছু পুরোপুরি বন্ধ', 'Data মুছে আবার শুরু'], 'টাকায় consistency আগে।'],
      ['Consensus cluster-এ কয়টা node?', ['৩ বা ৫টা', '২ বা ৪টা', '১টাই যথেষ্ট', '১০০টা'], 'Majority-র জন্য বিজোড়।'],
    ],
  },
  boss: [
    ['Linearizable মানে?', ['যেন data-র একটাই কপি', 'সব replica আলাদা মান', 'শুধু দ্রুত পড়া', 'কোনো ক্রম নেই'], 'নতুন দেখার পরে পুরনো আর না।'],
    ['Raft-এ commit কখন?', ['Majority log-এ লিখলে', 'Leader লিখলেই সাথে সাথে', 'সব node লিখলে তবেই', 'Client বলে দিলে'], 'Majority-ই সিদ্ধান্ত।'],
    ['Network partition-এ টাকার system?', ['Consistency বাছে', 'Availability বাছে', 'দুটোই পায়', 'কোনোটাই না'], 'ভুল টাকার চেয়ে দেরি ভালো।'],
    ['Fencing token কী আটকায়?', ['পুরনো মালিকের দেরির লেখা', 'নতুন মালিকের সব লেখা', 'সব রকমের লেখা', 'কিছুই আটকায় না'], 'বড় token জেতে।'],
    ['Lamport timestamp কী দেয়?', ['কারণ-ক্রম মানা মোট ক্রম', 'আসল সময়', 'Uniqueness-এর তাৎক্ষণিক নিশ্চয়তা', 'Encryption'], 'Counter আর node নম্বর।'],
  ],
});
