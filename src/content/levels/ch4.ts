import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৪ · জায়গা আর ঘটনার স্রোত — Vol 2, ch 1–6 */

export const l16 = level({
  id: 16, chapter: 4,
  title: 'কাছের rider', concept: 'Proximity service',
  story: 'কাছের rider খোঁজা',
  briefing: 'Order এলেই কাছের ফাঁকা rider চাই। Lat/lng দিয়ে database-এ খুঁজলে ধীর, আর সীমানার ঠিক ওপারের rider চোখেই পড়ে না।',
  ref: refs.p5,
  predict: ['কাছের rider খুঁজতে lat আর lng-এর উপর দুটো range query?', ['ধীর, কারণ দুই dimension; geohash বা quadtree লাগে', 'দ্রুত', 'ঠিক আছে', 'অসম্ভব']],
  nodes: [
    ['c', 'আপনার ঘর', 'step', 50, 50],
    ['n1', 'প্রতিবেশী', 'step', 22, 18], ['n2', 'প্রতিবেশী', 'step', 50, 18], ['n3', 'প্রতিবেশী', 'step', 78, 18],
    ['n4', 'প্রতিবেশী', 'step', 22, 50], ['n5', 'প্রতিবেশী', 'step', 78, 50],
    ['n6', 'প্রতিবেশী', 'step', 22, 82], ['n7', 'প্রতিবেশী', 'step', 50, 82], ['n8', 'প্রতিবেশী', 'step', 78, 82],
    ['r', 'Rider', 'user', 66, 50],
  ],
  steps: [
    { text: 'Map-কে বারবার চার ভাগ: প্রতিটা ঘরের একটা string নাম (geohash)। দৈর্ঘ্য যত বেশি, ঘর তত ছোট।', add: ['c'], badges: { c: 'geohash ৬' } },
    { text: 'দৈর্ঘ্য ৬ ≈ ১.২ km × ০.৬ km; ০.৫ km radius-এর জন্য উপযুক্ত।', focus: ['c'], badges: { c: '১.২ km × ০.৬ km' } },
    { text: 'একজন rider ঠিক পাশের ঘরে, আপনার খুব কাছে।', add: ['r'], ask: ['শুধু নিজের ঘর খুঁজলে কে বাদ পড়ে?', ['সীমানার ঠিক ওপারের কাছের rider', 'কেউ না', 'দূরের rider', 'নিজের ঘরের rider']] },
    { text: 'তাই নিজের ঘর আর ৮টা প্রতিবেশী ঘর মিলিয়ে খোঁজা।', add: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'], ok: ['r'] },
    { text: 'আশেপাশে rider খুব কম।', badges: { c: 'ফল কম' }, ask: ['যথেষ্ট ফল না এলে?', ['Geohash এক অক্ষর ছোট করে বড় ঘরে খোঁজা', 'খোঁজা বন্ধ', 'Random rider', 'Radius কমানো']] },
    { text: 'Prefix ছোট মানে বড় ঘর। Quadtree আরেক পথ: ঘন এলাকায় ছোট ঘর, ফাঁকায় বড়; গাছটা memory-তে থাকে।', focus: ['c', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
  ],
  summary: ['Geohash: map বারবার চার ভাগ, string-এর দৈর্ঘ্য = ঘরের আকার', 'নিজের ঘর + ৮ প্রতিবেশী; ফল কম হলে prefix ছোট', 'Quadtree ঘনত্ব অনুযায়ী ভাগ, memory-তে'],
  play: {
    kind: 'missions', intro: 'Radius, scale আর update।',
    missions: [
      ['৫ km radius। Geohash দৈর্ঘ্য কত?', ['৪', '৬', '৮', '১'], '০.৫ km → ৬, ১–২ km → ৫, ৫–২০ km → ৪।'],
      ['Business data বেশিরভাগ read। Database scale?', ['Read replica', 'সবার আগে sharding', 'Write-heavy design', 'Cache বাদ'], 'Data ছোট, read বেশি।'],
      ['Rider প্রতি কয়েক সেকেন্ডে জায়গা বদলায়। কোনটায় update সহজ?', ['Geohash: শুধু string বদলায়', 'Quadtree', 'দুটোই সমান কঠিন', 'কোনোটা না'], 'Quadtree-তে গাছ বদলাতে হয়।'],
    ],
  },
  boss: [
    ['ঘন শহর আর ফাঁকা গ্রাম, k-nearest দরকার। Geohash নাকি quadtree?', ['Quadtree (ঘনত্ব অনুযায়ী ভাগ)', 'সবসময় Geohash', 'কোনোটা না', 'সমান grid'], 'Geohash-এর ঘর স্থির আকারের।'],
    ['Geohash-এর boundary সমস্যা?', ['কাছাকাছি দুই বিন্দুর prefix না-ও মিলতে পারে', 'কোনো সমস্যা নেই', 'খুব ধীর', 'Memory বেশি'], 'তাই প্রতিবেশী ঘরও খোঁজা।'],
    ['২০ কোটি business-এর quadtree কত memory?', ['~২ GB-এর মতো, এক server-এ ধরে', '১ TB', '১ MB', 'অসীম'], 'বইয়ের হিসাব ~১.৭১ GB।'],
    ['Location service কি stateless?', ['হ্যাঁ, read-heavy, সহজে replica বাড়ে', 'না', 'শুধু একটা থাকে', 'DB-তে stateful'], 'তাই horizontal scale সহজ।'],
    ['Geohash index টেবিল shard করবেন?', ['সাধারণত না: data ছোট, read replica যথেষ্ট', 'অবশ্যই', 'প্রতি অক্ষরে', 'Random'], 'Sharding-এর জটিলতা লাভের চেয়ে বেশি।'],
  ],
});

export const l17 = level({
  id: 17, chapter: 4,
  title: 'Live rider', concept: 'Nearby friends',
  story: 'Live rider location',
  briefing: 'Customer map-এ দেখতে চায় তার rider কোথায়, মুহূর্তে মুহূর্তে। হাজারো rider প্রতি কয়েক সেকেন্ডে location পাঠায়।',
  ref: refs.p5,
  predict: ['হাজারো rider প্রতি ৩০ সেকেন্ডে location পাঠায়। কোন connection?', ['WebSocket (দুই দিক, persistent)', 'প্রতিবার নতুন HTTP', 'Email', 'FTP']],
  nodes: [
    ['r', 'Rider', 'user', 8, 50], ['ws', 'WebSocket server', 'server', 32, 50], ['lc', 'Location cache', 'cache', 56, 18],
    ['hist', 'Location history', 'db', 56, 84], ['ps', 'Redis pub/sub', 'queue', 72, 50], ['f', 'Customer', 'user', 92, 50],
  ],
  steps: [
    { text: 'Rider location পাঠায় persistent WebSocket-এ।', add: ['r', 'ws'], flow: [['r', 'ws']] },
    { text: 'সর্বশেষ location cache-এ (TTL সহ), ইতিহাস আলাদা DB-তে।', add: ['lc', 'hist'], flow: [['ws', 'lc'], ['ws', 'hist']] },
    { text: 'Rider-এর নিজের channel-এ publish।', add: ['ps'], flow: [['ws', 'ps']] },
    { text: 'Channel-এ অনেকে subscribe করে আছে।', add: ['f'], ask: ['কে update পাবে?', ['যারা subscribe করেছে এবং নির্দিষ্ট দূরত্বের মধ্যে', 'সবাই', 'কেউ না', 'শুধু admin']] },
    { text: 'Subscriber-এর WebSocket handler দূরত্ব মেপে, কাছে হলে পাঠায়।', flow: [['ps', 'ws'], ['ws', 'f']], badges: { f: '৫ km-এর মধ্যে?' } },
    { text: 'লাখো channel। Pub/sub server একটায় কুলায় না।', badges: { ps: 'অনেক server?' }, ask: ['Channel অনেক Redis server-এ ভাগ করবেন কীভাবে?', ['Consistent hashing দিয়ে channel → server', 'সব এক server-এ', 'Random প্রতি message', 'User-এর নামের অক্ষর ধরে']] },
    { text: 'Consistent hashing + service discovery। Pub/sub-এর চাপ মূলত CPU-তে, memory-তে নয়।', ok: ['ps'] },
  ],
  summary: ['WebSocket-এ location; cache-এ সর্বশেষ, DB-তে ইতিহাস', 'Rider-এর channel-এ publish, subscriber দূরত্ব মেপে পায়', 'Pub/sub channel consistent hashing-এ ভাগ'],
  play: {
    kind: 'missions', intro: 'Live location চালানোর তিনটা সিদ্ধান্ত।',
    missions: [
      ['Location cache-এ TTL কেন?', ['Inactive user-এর পুরনো location নিজে থেকে মুছে যাওয়া', 'দ্রুত', 'সস্তা', 'লাগে না'], 'বন্ধ app-এর rider map-এ ঝুলে থাকে না।'],
      ['WebSocket server stateful—নতুন version deploy করবেন কীভাবে?', ['পুরনো connection শেষ হওয়া পর্যন্ত draining, তারপর বন্ধ', 'সাথে সাথে বন্ধ', 'কখনো না', 'সবাইকে logout'], 'নতুন connection নতুন server-এ যায়।'],
      ['Pub/sub-এর মূল চাপ কোথায়?', ['CPU (message ছড়ানো)', 'Disk', 'Network নেই', 'Memory'], 'বইয়ের হিসাব: memory যথেষ্ট, CPU লাগে বেশি।'],
    ],
  },
  boss: [
    ['Redis pub/sub server মোটামুটি কত লাগবে?', ['~১৪০ (CPU-র হিসাবে)', '১', '১০,০০০', '৫'], 'বইয়ের হিসাব।', 'CPU সীমাবদ্ধ'],
    ['Channel-এর memory: ১০ কোটি user × ২০ বন্ধু × ২০ byte…?', ['~২০০ GB, তাই memory সমস্যা নয়', '২০ TB', '২০ MB', '২ KB'], 'কয়েকটা server-এই ধরে।'],
    ['Pub/sub server যোগ-বাদে?', ['Ring update; কিছু channel resubscribe লাগে', 'কিছু না', 'সব restart', 'DB বদল'], 'যোগ-বাদ রাতে, কম ভিড়ে করা ভালো।'],
    ['বন্ধু নয়, কাছের random মানুষ দেখাতে?', ['Geohash ঘর প্রতি channel, ঘরের সবাই subscribe', 'বন্ধুর channel', 'সবাইকে', 'কাউকে না'], 'ঘর বদলালে channel বদলায়।'],
    ['Location history কোন DB?', ['Write-heavy, horizontal scale: Cassandra', 'একটা MySQL', 'শুধু Redis', 'CSV'], 'প্রতি সেকেন্ডে লাখো write।'],
  ],
});

export const l18 = level({
  id: 18, chapter: 4,
  title: 'ETA ভুল', concept: 'Maps · Routing',
  story: 'ETA ভুল দেখাচ্ছে',
  briefing: 'App বলছে ১৫ মিনিটে পৌঁছাবে, আসল সময় ৪৫ মিনিট। জ্যামের খবর পৌঁছায় না, আর পুরো দেশের রাস্তায় route খুঁজতে অনেক সময়।',
  ref: refs.p5,
  predict: ['পুরো দেশের রাস্তা এক graph-এ রেখে shortest path?', ['খুব বড়; tile-এ ভাগ করে স্তরে স্তরে খোঁজা', 'দ্রুত', 'ঠিক আছে', 'অসম্ভব']],
  nodes: [
    ['a', 'A', 'user', 8, 88], ['b', 'B', 'user', 92, 88], ['t1', 'ছোট tile: গলি', 'step', 22, 66],
    ['t2', 'মাঝারি tile: সড়ক', 'step', 50, 40], ['t3', 'বড় tile: highway', 'step', 78, 16], ['tr', 'Live traffic', 'service', 56, 84],
  ],
  steps: [
    { text: 'Road graph tile-এ ভাগ; route খোঁজা শুরু ছোট tile-এ।', add: ['a', 'b', 't1'], flow: [['a', 't1']] },
    { text: 'দূরে যেতে উপরের স্তরে: সেখানে শুধু বড় রাস্তা।', add: ['t2', 't3'], flow: [['t1', 't2'], ['t2', 't3']] },
    { text: 'গন্তব্যের কাছে আবার নিচে নামা। A* ধরনের খোঁজা।', flow: [['t3', 't2'], ['t2', 't1'], ['t1', 'b']] },
    { text: 'একটা রাস্তায় হঠাৎ জ্যাম।', add: ['tr'], flow: [['tr', 't1']], badges: { tr: 'জ্যাম!' }, ask: ['কোন user-এর route বদলাতে হবে?', ['যাদের route-এর tile-এ এই জ্যাম', 'সব user', 'কেউ না', 'শুধু নতুন user']] },
    { text: 'Active navigation-এর route tile ধরে index; প্রভাবিত tile-এর user-দের reroute।', ok: ['t2'] },
    { text: 'Map দেখানোর জন্য tile।', ask: ['Map tile আসে কোথা থেকে?', ['CDN থেকে, zoom level অনুযায়ী আগে বানানো tile', 'প্রতিবার server-এ আঁকা', 'Database', 'Client নিজে বানায়']] },
    { text: 'Pre-computed tile CDN থেকে; vector tile হলে আরও কম bandwidth। ETA আসে live আর আগের traffic থেকে ML model-এ।', ok: ['t1', 't2', 't3'] },
  ],
  summary: ['Routing tile-এর স্তর: গলি → সড়ক → highway', 'জ্যাম হলে শুধু প্রভাবিত tile-এর user reroute', 'Map tile CDN থেকে; ETA live + ইতিহাস'],
  play: {
    kind: 'missions', intro: 'Map চালানোর তিনটা প্রশ্ন।',
    missions: [
      ['প্রতি সেকেন্ডে কোটি location update। কীভাবে?', ['Client-এ batch করে কম ঘনঘন পাঠানো, Kafka-তে', 'প্রতি সেকেন্ডে আলাদা HTTP', 'Email', 'বাদ'], 'বইয়ের ধারণা: ১৫–৩০ সেকেন্ডে batch।'],
      ['Map data মোটামুটি কত বড়?', ['Petabyte স্তর (প্রায় ৬৭–১০০ PB tile)', 'কয়েক GB', '১ TB', 'কয়েক MB'], 'Zoom level ২১ পর্যন্ত সব tile।'],
      ['Geocoding মানে?', ['ঠিকানা → lat/lng রূপান্তর', 'Tile আঁকা', 'ETA', 'Route'], 'উল্টোটা reverse geocoding।'],
    ],
  },
  boss: [
    ['Reroute জানানোর দক্ষ উপায়?', ['প্রতিটা navigation-এর tile সেট রেখে জ্যাম-tile ধরে খোঁজা', 'সবাইকে বারবার', 'কাউকে না', 'Random'], 'প্রতি জ্যামে সব user ঘোরা অপচয়।'],
    ['Vector tile-এর সুবিধা?', ['কম bandwidth, মসৃণ zoom', 'বেশি ছবি', 'Server-এ আঁকা', 'কোনোটা না'], 'Client নিজে আঁকে।'],
    ['Location update-এর ব্যবহার?', ['Live traffic, ETA model, নতুন রাস্তা শনাক্ত', 'শুধু ad', 'কিছু না', 'Login'], 'একই stream অনেক কাজে।'],
    ['Routing tile কোথায় রাখা?', ['Object storage + cache; routing service পড়ে', 'Client-এ সব', 'SQL row', 'Queue'], 'Tile স্থির file।'],
    ['ETA সঠিক করতে কী লাগে?', ['Live traffic আর আগের traffic-এর ভিত্তিতে prediction', 'শুধু দূরত্ব', 'Random', 'User-কে জিজ্ঞেস'], 'শুধু দূরত্ব দিয়ে ঢাকায় ETA হয় না!'],
  ],
});

export const l19 = level({
  id: 19, chapter: 4,
  title: 'Event হারাচ্ছে', concept: 'Distributed message queue',
  story: 'Event হারাচ্ছে',
  briefing: 'Order event-গুলো মাঝে মাঝে হারায়, আবার কখনো দুবার process হয়। Service-গুলোর মাঝে একটা নির্ভরযোগ্য পাইপ দরকার।',
  ref: refs.p5,
  predict: ['Event যেন হারায় না, consumer ধীর হলেও। কী লাগে?', ['Disk-এ রাখা message log আর consumer offset', 'Memory-তে list', 'Email', 'শুধু DB']],
  nodes: [
    ['pr', 'Producer', 'service', 8, 50], ['p0', 'Partition ০', 'queue', 42, 22], ['p1', 'Partition ১', 'queue', 42, 50], ['p2', 'Partition ২', 'queue', 42, 78],
    ['ca', 'Consumer A', 'worker', 82, 32], ['cb', 'Consumer B', 'worker', 82, 72], ['off', 'Offset', 'step', 82, 8],
  ],
  steps: [
    { text: 'Topic অনেক partition-এ ভাগ। Message key-র hash দিয়ে partition ঠিক হয়।', add: ['pr', 'p0', 'p1', 'p2'], flow: [['pr', 'p1']], badges: { pr: 'key = order#7' } },
    { text: 'একই key সবসময় একই partition-এ: সেই key-র ক্রম বজায়।', flow: [['pr', 'p1']], ok: ['p1'] },
    { text: 'Consumer group: প্রতিটা partition group-এর একজন consumer পড়ে।', add: ['ca', 'cb'], flow: [['p0', 'ca'], ['p1', 'ca'], ['p2', 'cb']] },
    { text: 'Consumer A ১০৪ পর্যন্ত commit করল, ১০৫–১০৭ process করছিল, তারপর crash।', add: ['off'], down: ['ca'], badges: { off: 'p1: ১০৪' }, ask: ['এখন কী হবে?', ['Rebalance-এর পর ১০৫ থেকে আবার আসবে (duplicate)', 'কিছুই আবার আসবে না', 'সব শুরু থেকে', 'Message মুছে যায়']] },
    { text: 'Partition B-কে দেওয়া হল; শেষ commit থেকে আবার: at-least-once।', down: ['ca'], flow: [['p0', 'cb'], ['p1', 'cb']] },
    { text: 'প্রতিটা partition-এর leader আর follower replica।', ask: ['ack = all মানে?', ['সব in-sync replica লিখলে তবে সফল', 'Leader লিখলেই', 'কেউ না লিখলেও', 'Consumer পড়লে']] },
    { text: 'ack=all নিরাপদ কিন্তু ধীর; ack=1 মাঝামাঝি; ack=0 দ্রুত কিন্তু হারাতে পারে।', focus: ['p0', 'p1', 'p2'] },
  ],
  summary: ['Topic → partition; key একই হলে একই partition, ক্রম বজায়', 'Consumer group আর offset; crash হলে শেষ commit থেকে', 'ack দিয়ে durability বনাম গতি'],
  play: {
    kind: 'missions', intro: 'Delivery semantics বাছুন।',
    missions: [
      ['Payment event: হারানো চলবে না, duplicate সামলানো যায়।', ['At-least-once + idempotent consumer', 'At-most-once', 'Fire and forget', 'কোনোটা না'], 'হারানোর চেয়ে দুবার আসা ভালো, যদি consumer সামলাতে পারে।'],
      ['Metric log: কিছু হারালে ক্ষতি নেই, গতি জরুরি।', ['At-most-once (ack=0)', 'Exactly-once', 'At-least-once ack=all', 'Sync'], 'সবচেয়ে হালকা।'],
      ['Consumer সংখ্যা partition-এর চেয়ে বেশি?', ['বাড়তিরা বসে থাকে', 'সব দ্রুত', 'Partition বাড়ে', 'Crash'], 'এক partition এক consumer।'],
    ],
  },
  boss: [
    ['Disk-এ sequential write কেন?', ['Sequential access দ্রুত, OS page cache কাজে লাগে', 'Disk ধীর তাই', 'Memory নেই', 'Random দ্রুত'], 'Kafka-র গতির রহস্য।'],
    ['Pull নাকি push consumer?', ['Pull: consumer নিজের গতিতে, batch সুবিধা', 'সবসময় push', 'কোনোটা না', 'Email'], 'ধীর consumer ডুবে যায় না।'],
    ['Exactly-once-এর কাছাকাছি পেতে?', ['Idempotent producer + transaction বা dedupe', 'শুধু retry', 'ack=0', 'Offset না রাখা'], 'Duplicate চেনার উপায় লাগে।'],
    ['Retention শেষ হলে?', ['পুরনো segment মুছে যায় (সময় বা আকার ধরে)', 'চিরকাল থাকে', 'Consumer মুছে যায়', 'Error'], 'Log অসীম বাড়ে না।'],
    ['একটা order-এর event-গুলো ক্রমে চাই। কী করবেন?', ['Order ID-কে message key বানানো', 'Partition ১টা রাখা সবার জন্য', 'Random key', 'Key ছাড়া'], 'Key একই, partition একই, ক্রম বজায়।'],
  ],
});

export const l20 = level({
  id: 20, chapter: 4,
  title: 'কেউ জানে না site ধীর', concept: 'Metrics · Alerting',
  story: 'কেউ জানে না site ধীর',
  briefing: 'গতকাল দুই ঘণ্টা checkout ধীর ছিল, team জানল customer-এর অভিযোগে। এখন থেকে আগে জানতে চাই: সংখ্যা, graph আর সময়মতো alert।',
  ref: refs.p5,
  predict: ['Server-এর CPU আর latency প্রতি ১০ সেকেন্ডে। কোন DB?', ['Time-series DB', 'সাধারণ SQL table', 'Graph DB', 'Blob storage']],
  nodes: [
    ['sv', 'Servers', 'server', 8, 50], ['co', 'Collector', 'worker', 28, 50], ['kq', 'Kafka', 'queue', 48, 50],
    ['ts', 'Time-series DB', 'db', 68, 26], ['al', 'Alert manager', 'service', 90, 26], ['db', 'Dashboard', 'step', 90, 76], ['ds', 'Downsample', 'worker', 68, 76],
  ],
  steps: [
    { text: 'Metric সংগ্রহ: pull (collector টানে) বা push (agent পাঠায়)।', add: ['sv', 'co'], flow: [['sv', 'co']] },
    { text: 'মাঝে Kafka: DB ধীর বা বন্ধ হলেও data হারায় না।', add: ['kq', 'ts'], flow: [['co', 'kq'], ['kq', 'ts']] },
    { text: 'Dashboard (Grafana ধরনের) query করে দেখায়।', add: ['db'], flow: [['ts', 'db']] },
    { text: 'একটা alert rule বসালাম।', add: ['al'], badges: { al: 'CPU > ৮০% ৫ মিনিট' }, ask: ['এই rule কখন alert দেবে?', ['টানা ৫ মিনিট ৮০%-এর উপরে থাকলে', 'একবার ছুঁলেই', 'কখনো না', 'প্রতি মিনিটে']] },
    { text: 'শর্ত টানা পূরণ হলে তবে alert, dedupe করে email/pager-এ।', flow: [['ts', 'al']], ok: ['al'] },
    { text: 'পুরনো data কী করব?', add: ['ds'], ask: ['এক মাস পুরনো data-র resolution?', ['কমিয়ে (downsample): যেমন ১ ঘণ্টা', '১০ সেকেন্ডই রাখা', '১ ms', 'সব মুছে ফেলা বাধ্যতামূলক']] },
    { text: 'Downsample: ৭ দিন পর ১ মিনিট, ৩০ দিন পর ১ ঘণ্টা। আর label-এ user_id দিলে series অসংখ্য: cardinality-র ফাঁদ।', flow: [['ts', 'ds']] },
  ],
  summary: ['Collector → Kafka → time-series DB → dashboard আর alert', 'Alert: টানা শর্ত, dedupe', 'Downsample পুরনো data; label-এ সীমিত মান'],
  play: {
    kind: 'missions', intro: 'Metric system-এর তিনটা ফাঁদ।',
    missions: [
      ['Metric label হিসেবে user_id দেওয়া কেন খারাপ?', ['অসংখ্য time series (high cardinality), DB ফুলে যায়', 'দ্রুত হয়', 'ভালো', 'কিছু না'], 'প্রতিটা label মানের জোড়া একটা আলাদা series।'],
      ['Alert যেন বারবার না বাজে?', ['Dedupe আর grouping', 'প্রতিবার পাঠান', 'Alert বন্ধ', 'Rule মুছুন'], 'Alert fatigue-এ মানুষ সব উপেক্ষা করে।'],
      ['অল্পক্ষণ চলা batch job-এর metric?', ['Push (job শেষের আগে পাঠায়)', 'Pull', 'কোনোটা না', 'Email'], 'Pull করার আগেই job শেষ।'],
    ],
  },
  boss: [
    ['Pull model-এর সুবিধা?', ['Collector জানে কে বেঁচে আছে, debug সহজ', 'Firewall-এ সহজ', 'Short-lived job-এ ভালো', 'কোনোটা না'], 'Endpoint সাড়া না দিলেই বোঝা যায়।'],
    ['Metric data-র compression?', ['Delta encoding ইত্যাদিতে অনেক কমে', 'Compress হয় না', 'আরও বাড়ে', 'শুধু ছবিতে হয়'], 'পাশাপাশি মান কাছাকাছি।'],
    ['কোন label নিরাপদ?', ['Region, service নাম (সীমিত মান)', 'Request ID', 'User email', 'Timestamp'], 'Cardinality-র ফাঁদ এড়ান।'],
    ['Kafka বাদ দিলে ঝুঁকি?', ['DB বন্ধ হলে metric হারায়', 'কিছু না', 'দ্রুত হয়', 'সস্তা'], 'Buffer না থাকলে চাপের সময় data পড়ে যায়।'],
    ['Metric write বেশি না read?', ['Write অনেক বেশি; read কম কিন্তু হঠাৎ ভারী', 'Read বেশি', 'সমান', 'কোনোটাই না'], 'তাই write-optimized time-series DB।'],
  ],
});

export const l21 = level({
  id: 21, chapter: 4,
  title: 'মিনিটে কত parcel', concept: 'Stream aggregation',
  story: 'Hub-এ মিনিটে কত parcel',
  briefing: 'প্রতিটা hub-এ মিনিটে কত parcel scan হল, dashboard-এ live দেখাতে হবে, আর মাস শেষে এই সংখ্যা দিয়েই partner-কে টাকা দেওয়া হবে। তাই গোনা নির্ভুল হতে হবে।',
  ref: refs.p5,
  predict: ['দেরিতে আসা event কোন মিনিটে গুনবেন?', ['Event time (ঘটনার সময়), পৌঁছানোর সময় নয়', 'যখন পৌঁছাল', 'কখনো না', 'Random']],
  nodes: [
    ['lg', 'Scan log', 'step', 8, 50], ['kq', 'Kafka', 'queue', 28, 50], ['ag', 'Aggregator', 'worker', 52, 50],
    ['out', 'Kafka (ফল)', 'queue', 74, 50], ['db', 'DB', 'db', 92, 50], ['raw', 'Raw store', 'store', 52, 86], ['rc', 'Reconciliation', 'service', 74, 86],
  ],
  steps: [
    { text: 'Scan event stream হয়ে aggregator-এ, প্রতি মিনিটের window-এ গোনা।', add: ['lg', 'kq', 'ag'], flow: [['lg', 'kq'], ['kq', 'ag']] },
    { text: 'Tumbling window: প্রতি মিনিট আলাদা ঘর।', badges: { ag: '১০:০১ window' } },
    { text: 'একটা event ১০:০০:৫৮-এ ঘটেছিল, পৌঁছাল ১০:০১:০৫-এ।', badges: { lg: 'দেরিতে এল' }, ask: ['এই event কোন মিনিটে গোনা হবে?', ['১০:০০, যদি watermark-এর মধ্যে পৌঁছায়', '১০:০১', 'বাদ', 'দুটোতেই']] },
    { text: 'Watermark: window কিছুক্ষণ খোলা রেখে দেরির event ধরা; খুব দেরির জন্য পরে মিলানো।', badges: { ag: 'watermark ১৫ s' }, ok: ['ag'] },
    { text: 'ফল আবার Kafka হয়ে DB-তে।', add: ['out', 'db'], flow: [['ag', 'out'], ['out', 'db']] },
    { text: 'মাস শেষে টাকা দেওয়ার আগে।', add: ['raw', 'rc'], ask: ['Stream-এর ফল যাচাই করবেন কীভাবে?', ['Raw data থেকে batch-এ আবার গুনে মিলানো (reconciliation)', 'যাচাই লাগে না', 'Dashboard দেখে', 'Random নমুনা']] },
    { text: 'রাতে raw data থেকে batch-এ আবার গুনে stream-এর ফলের সাথে মেলানো।', flow: [['kq', 'raw'], ['raw', 'rc'], ['db', 'rc']] },
  ],
  summary: ['Event time ধরে window; watermark দেরির event ধরে', 'Aggregator → Kafka → DB; raw data আলাদা রাখা', 'টাকার হিসাবে reconciliation'],
  play: {
    kind: 'missions', intro: 'Window আর নির্ভুলতা।',
    missions: [
      ['Watermark বড় করলে?', ['বেশি দেরির event ধরে, কিন্তু ফল দেরিতে', 'সব দ্রুত', 'কিছু না', 'কম নির্ভুল'], 'নির্ভুলতা বনাম latency।'],
      ['Exactly-once গোনা জরুরি কেন?', ['টাকা জড়িত', 'দেখতে সুন্দর', 'দ্রুত', 'লাগে না'], 'বেশি গুনলে বেশি টাকা, কম গুনলে partner ঠকে।'],
      ['Raw data রাখেন কেন?', ['আবার হিসাব আর debug-এর জন্য', 'লাগে না', 'Cache', 'Ad দেখাতে'], 'Bug ধরা পড়লে ইতিহাস থেকে আবার।'],
    ],
  },
  boss: [
    ['Reconciliation কেন লাগে?', ['Stream-এর দেরি, duplicate বা bug-এর ভুল batch-এর সাথে মিলিয়ে ধরা', 'Stream সবসময় ভুল', 'দ্রুত করতে', 'লাগে না'], 'দুই পথের ফল মেলা উচিত।'],
    ['Aggregator crash করলে?', ['Snapshot + offset থেকে আবার; at-least-once + dedupe', 'সব হারায়', 'শূন্য থেকে', 'কিছু না'], 'অবস্থা মাঝে মাঝে সংরক্ষণ।'],
    ['একটা hub-এ বিশাল ভিড় (hotspot)?', ['ওই key-র জন্য বেশি aggregator node ভাগ করে', 'কিছু না', 'Hub বন্ধ', 'Cache'], 'চাপ যেখানে, শক্তিও সেখানে।'],
    ['Lambda বনাম Kappa?', ['Kappa: একই streaming path-এ real-time আর আবার হিসাব (replay)', 'Lambda সবসময় সহজ', 'কোনোটা না', 'দুটো একই'], 'Kappa-তে code একটাই।'],
    ['প্রতি মিনিটে top ১০০ hub?', ['Window-এর ভিতরে heap দিয়ে top-k', 'প্রতি event-এ সব sort', 'প্রতি সেকেন্ডে DB query', 'কখনো না'], 'Heap ছোট আর দ্রুত।'],
  ],
});
