import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৪ · জায়গা আর ঘটনার স্রোত — Vol 2, ch 1–6 */

export const l16 = level({
  id: 16, chapter: 4,
  title: 'কাছের rider', concept: 'Proximity service',
  story: 'কাছের rider খোঁজা',
  briefing: 'Order এলেই কাছের ফাঁকা rider চাই। Lat/lng দিয়ে database-এ খুঁজলে ধীর, আর সীমানার ঠিক ওপারের rider চোখেই পড়ে না।',
  ref: refs.p5,
  predict: ['কাছের rider খুঁজতে lat আর lng-এর উপর দুটো range query?', ['ধীর; geohash বা quadtree লাগে', 'দ্রুত, দুটো index থাকলেই', 'ঠিক আছে, ছোট শহরে', 'দ্রুত, শুধু cache লাগবে']],
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
    { text: 'একজন rider ঠিক পাশের ঘরে, আপনার খুব কাছে।', add: ['r'], ask: ['শুধু নিজের ঘর খুঁজলে কে বাদ পড়ে?', ['সীমানার ওপারের কাছের rider', 'কেউ না, ঘরেই সবাই আছে', 'শুধু অনেক দূরের rider', 'নিজের ঘরের ভিতরের rider']] },
    { text: 'তাই নিজের ঘর আর ৮টা প্রতিবেশী ঘর মিলিয়ে খোঁজা।', add: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'], ok: ['r'] },
    { text: 'আশেপাশে rider খুব কম।', badges: { c: 'ফল কম' }, ask: ['যথেষ্ট ফল না এলে?', ['এক অক্ষর ছোট করে বড় ঘরে', 'এক অক্ষর বড় করে ছোট ঘরে', 'খোঁজা বন্ধ করে খালি ফল', 'Random কোনো rider পাঠানো']] },
    { text: 'Prefix ছোট মানে বড় ঘর। Quadtree আরেক পথ: ঘন এলাকায় ছোট ঘর, ফাঁকায় বড়; গাছটা memory-তে থাকে।', focus: ['c', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
  ],
  summary: ['Geohash: map বারবার চার ভাগ, string-এর দৈর্ঘ্য = ঘরের আকার', 'নিজের ঘর + ৮ প্রতিবেশী; ফল কম হলে prefix ছোট', 'Quadtree ঘনত্ব অনুযায়ী ভাগ, memory-তে'],
  play: {
    kind: 'missions', intro: 'Radius, scale আর update।',
    missions: [
      ['৫ km radius। Geohash দৈর্ঘ্য কত?', ['৪', '৬', '৮', '১'], '০.৫ km → ৬, ১–২ km → ৫, ৫–২০ km → ৪।'],
      ['Business data বেশিরভাগ read। Database scale?', ['Read replica', 'সবার আগে sharding', 'Write-heavy design', 'Cache বাদ'], 'Data ছোট, read বেশি।'],
      ['Rider প্রতি কয়েক সেকেন্ডে জায়গা বদলায়। কোনটায় update সহজ?', ['Geohash: শুধু string বদলায়', 'Quadtree: গাছ নিজে বদলায়', 'দুটোই সমান কঠিন', 'কোনোটাই update নেয় না'], 'Quadtree-তে গাছ বদলাতে হয়।'],
    ],
  },
  boss: [
    ['ঘন শহর আর ফাঁকা গ্রাম, k-nearest দরকার। Geohash নাকি quadtree?', ['Quadtree (ঘনত্ব ধরে ভাগ)', 'Geohash (সমান আকারের ঘর)', 'সাধারণ সমান grid', 'শুধু lat/lng index'], 'Geohash-এর ঘর স্থির আকারের।'],
    ['Geohash-এর boundary সমস্যা?', ['কাছের দুই বিন্দুর prefix না মিলতে পারে', 'দূরের দুই বিন্দুর prefix সবসময় মেলে', 'String বড় হলে খোঁজা খুব ধীর', 'প্রতিটা ঘরে memory অনেক লাগে'], 'তাই প্রতিবেশী ঘরও খোঁজা।'],
    ['২০ কোটি business-এর quadtree কত memory?', ['~২ GB, এক server-এ ধরে', '~২০০ GB, অনেক server লাগে', '~২ TB, disk-এ রাখতে হয়', '~২ MB, phone-এও ধরে'], 'বইয়ের হিসাব ~১.৭১ GB।'],
    ['Location service কি stateless?', ['হ্যাঁ, read-heavy, replica সহজ', 'না, প্রতি user-এর state রাখে', 'না, তাই একটাই server থাকে', 'হ্যাঁ, কিন্তু write-heavy'], 'তাই horizontal scale সহজ।'],
    ['Geohash index টেবিল shard করবেন?', ['সাধারণত না: data ছোট, replica যথেষ্ট', 'অবশ্যই, প্রথম দিন থেকেই', 'হ্যাঁ, geohash-এর প্রতি অক্ষরে', 'হ্যাঁ, random hash ধরে'], 'Sharding-এর জটিলতা লাভের চেয়ে বেশি।'],
  ],
});

export const l17 = level({
  id: 17, chapter: 4,
  title: 'Live rider', concept: 'Nearby friends',
  story: 'Live rider location',
  briefing: 'Customer map-এ দেখতে চায় তার rider কোথায়, মুহূর্তে মুহূর্তে। হাজারো rider প্রতি কয়েক সেকেন্ডে location পাঠায়।',
  ref: refs.p5,
  predict: ['হাজারো rider প্রতি ৩০ সেকেন্ডে location পাঠায়। কোন connection?', ['WebSocket (দুই দিক, persistent)', 'প্রতিবার নতুন HTTP request', 'প্রতি মিনিটে polling', 'SMS']],
  nodes: [
    ['r', 'Rider', 'user', 8, 50], ['ws', 'WebSocket server', 'server', 32, 50], ['lc', 'Location cache', 'cache', 56, 18],
    ['hist', 'Location history', 'db', 56, 84], ['ps', 'Redis pub/sub', 'queue', 72, 50], ['f', 'Customer', 'user', 92, 50],
  ],
  steps: [
    { text: 'Rider location পাঠায় persistent WebSocket-এ।', add: ['r', 'ws'], flow: [['r', 'ws']] },
    { text: 'সর্বশেষ location cache-এ (TTL সহ), ইতিহাস আলাদা DB-তে।', add: ['lc', 'hist'], flow: [['ws', 'lc'], ['ws', 'hist']] },
    { text: 'Rider-এর নিজের channel-এ publish।', add: ['ps'], flow: [['ws', 'ps']] },
    { text: 'Channel-এ অনেকে subscribe করে আছে।', add: ['f'], ask: ['কে update পাবে?', ['Subscriber, দূরত্বের মধ্যে হলে', 'সব subscriber, দূরত্ব ছাড়া', 'শহরের সবাই', 'শুধু admin']] },
    { text: 'Subscriber-এর WebSocket handler দূরত্ব মেপে, কাছে হলে পাঠায়।', flow: [['ps', 'ws'], ['ws', 'f']], badges: { f: '৫ km-এর মধ্যে?' } },
    { text: 'লাখো channel। Pub/sub server একটায় কুলায় না।', badges: { ps: 'অনেক server?' }, ask: ['Channel অনেক Redis server-এ ভাগ করবেন কীভাবে?', ['Consistent hashing: channel → server', 'সব channel একটা server-এ রাখা', 'প্রতি message random server-এ', 'Channel নামের প্রথম অক্ষর ধরে']] },
    { text: 'Consistent hashing + service discovery। Pub/sub-এর চাপ মূলত CPU-তে, memory-তে নয়।', ok: ['ps'] },
  ],
  summary: ['WebSocket-এ location; cache-এ সর্বশেষ, DB-তে ইতিহাস', 'Rider-এর channel-এ publish, subscriber দূরত্ব মেপে পায়', 'Pub/sub channel consistent hashing-এ ভাগ'],
  play: {
    kind: 'missions', intro: 'Live location চালানোর তিনটা সিদ্ধান্ত।',
    missions: [
      ['Location cache-এ TTL কেন?', ['পুরনো location নিজে মুছে যায়', 'Cache থেকে দ্রুত পড়া যায়', 'Cache-এর খরচ কমে যায়', 'দরকার নেই, সবসময় রাখা ভালো'], 'বন্ধ app-এর rider map-এ ঝুলে থাকে না।'],
      ['WebSocket server stateful—নতুন version deploy করবেন কীভাবে?', ['Draining: পুরনো connection শেষ হলে বন্ধ', 'সাথে সাথে বন্ধ, client নিজে ফিরবে', 'কখনো deploy নয়', 'সবাইকে logout করে'], 'নতুন connection নতুন server-এ যায়।'],
      ['Pub/sub-এর মূল চাপ কোথায়?', ['CPU (message ছড়ানো)', 'Disk (message রাখা)', 'Network (নেই বললেই চলে)', 'Memory (channel রাখা)'], 'বইয়ের হিসাব: memory যথেষ্ট, CPU লাগে বেশি।'],
    ],
  },
  boss: [
    ['Redis pub/sub server মোটামুটি কত লাগবে?', ['~১৪০ (CPU-র হিসাবে)', '~১০ (memory-র হিসাবে)', '~১০,০০০ (user প্রতি একটা)', '১টাই যথেষ্ট'], 'বইয়ের হিসাব।', 'CPU সীমাবদ্ধ'],
    ['Channel-এর memory: ১০ কোটি user × ২০ বন্ধু × ২০ byte…?', ['~২০০ GB, তাই memory সমস্যা নয়', '~২০ TB, তাই memory বড় সমস্যা', '~২০ MB, এক phone-এ ধরে', '~২ PB, disk লাগবে'], 'কয়েকটা server-এই ধরে।'],
    ['Pub/sub server যোগ-বাদে?', ['Ring update; কিছু resubscribe লাগে', 'কিছু না, নিজে থেকেই চলে', 'সব server একসাথে restart লাগে', 'Database বদলে নতুন করে লাগে'], 'যোগ-বাদ রাতে, কম ভিড়ে করা ভালো।'],
    ['বন্ধু নয়, কাছের random মানুষ দেখাতে?', ['Geohash ঘর প্রতি একটা channel', 'প্রতি বন্ধুর জন্য একটা channel', 'সবার জন্য একটাই channel', 'কোনো channel নয়, DB query'], 'ঘর বদলালে channel বদলায়।'],
    ['Location history কোন DB?', ['Cassandra (write-heavy)', 'একটা বড় MySQL', 'শুধু Redis memory', 'দিনে একটা CSV file'], 'প্রতি সেকেন্ডে লাখো write।'],
  ],
});

export const l18 = level({
  id: 18, chapter: 4,
  title: 'ETA ভুল', concept: 'Maps · Routing',
  story: 'ETA ভুল দেখাচ্ছে',
  briefing: 'App বলছে ১৫ মিনিটে পৌঁছাবে, আসল সময় ৪৫ মিনিট। জ্যামের খবর পৌঁছায় না, আর পুরো দেশের রাস্তায় route খুঁজতে অনেক সময়।',
  ref: refs.p5,
  predict: ['পুরো দেশের রাস্তা এক graph-এ রেখে shortest path?', ['খুব বড়; tile-এ স্তরে স্তরে খোঁজা', 'দ্রুত, Dijkstra এক graph-এই পারে', 'ঠিক আছে, শুধু memory বেশি লাগে', 'অসম্ভব, তাই route দেওয়াই যায় না']],
  nodes: [
    ['a', 'A', 'user', 8, 88], ['b', 'B', 'user', 92, 88], ['t1', 'ছোট tile: গলি', 'step', 22, 66],
    ['t2', 'মাঝারি tile: সড়ক', 'step', 50, 40], ['t3', 'বড় tile: highway', 'step', 78, 16], ['tr', 'Live traffic', 'service', 56, 84],
  ],
  steps: [
    { text: 'Road graph tile-এ ভাগ; route খোঁজা শুরু ছোট tile-এ।', add: ['a', 'b', 't1'], flow: [['a', 't1']] },
    { text: 'দূরে যেতে উপরের স্তরে: সেখানে শুধু বড় রাস্তা।', add: ['t2', 't3'], flow: [['t1', 't2'], ['t2', 't3']] },
    { text: 'গন্তব্যের কাছে আবার নিচে নামা। A* ধরনের খোঁজা।', flow: [['t3', 't2'], ['t2', 't1'], ['t1', 'b']] },
    { text: 'একটা রাস্তায় হঠাৎ জ্যাম।', add: ['tr'], flow: [['tr', 't1']], badges: { tr: 'জ্যাম!' }, ask: ['কোন user-এর route বদলাতে হবে?', ['যাদের route-এর tile-এ জ্যাম', 'শহরের সব active user', 'কেউ না, user নিজে বুঝবে', 'শুধু নতুন route চাওয়া user']] },
    { text: 'Active navigation-এর route tile ধরে index; প্রভাবিত tile-এর user-দের reroute।', ok: ['t2'] },
    { text: 'Map দেখানোর জন্য tile।', ask: ['Map tile আসে কোথা থেকে?', ['CDN থেকে, আগে বানানো tile', 'প্রতিবার server-এ আঁকা', 'Database থেকে', 'Client নিজে বানায়']] },
    { text: 'Pre-computed tile CDN থেকে; vector tile হলে আরও কম bandwidth। ETA আসে live আর আগের traffic থেকে ML model-এ।', ok: ['t1', 't2', 't3'] },
  ],
  summary: ['Routing tile-এর স্তর: গলি → সড়ক → highway', 'জ্যাম হলে শুধু প্রভাবিত tile-এর user reroute', 'Map tile CDN থেকে; ETA live + ইতিহাস'],
  play: {
    kind: 'missions', intro: 'Map চালানোর তিনটা প্রশ্ন।',
    missions: [
      ['প্রতি সেকেন্ডে কোটি location update। কীভাবে?', ['Batch করে কম ঘনঘন, Kafka-তে', 'প্রতি সেকেন্ডে আলাদা HTTP', 'প্রতিটা সরাসরি database-এ', 'বাদ, শুধু শুরু আর শেষ'], 'বইয়ের ধারণা: ১৫–৩০ সেকেন্ডে batch।'],
      ['Map data মোটামুটি কত বড়?', ['Petabyte স্তর', 'কয়েক Gigabyte', 'কয়েক Terabyte', 'কয়েক Megabyte'], 'Zoom level ২১ পর্যন্ত সব tile।'],
      ['Geocoding মানে?', ['ঠিকানা → lat/lng', 'lat/lng → tile ছবি', 'দূরত্ব → ETA', 'শুরু → শেষ route'], 'উল্টোটা reverse geocoding।'],
    ],
  },
  boss: [
    ['Reroute জানানোর দক্ষ উপায়?', ['প্রতি navigation-এর tile ধরে খোঁজা', 'সব user-কে বারবার জানিয়ে দেওয়া', 'কাউকে না, user নিজে দেখবে', 'Random কিছু user-কে জানানো'], 'প্রতি জ্যামে সব user ঘোরা অপচয়।'],
    ['Vector tile-এর সুবিধা?', ['কম bandwidth, মসৃণ zoom', 'বেশি ছবি, ভালো রং', 'Server-এ আঁকা, client হালকা', 'কোনো সুবিধা নেই'], 'Client নিজে আঁকে।'],
    ['Location update-এর ব্যবহার?', ['Live traffic, ETA, নতুন রাস্তা', 'শুধু বিজ্ঞাপন দেখানোর জন্য', 'শুধু login যাচাইয়ের জন্য', 'কাজে লাগে না, মুছে ফেলা হয়'], 'একই stream অনেক কাজে।'],
    ['Routing tile কোথায় রাখা?', ['Object storage + cache', 'সব client-এর phone-এ', 'SQL table-এর row-এ', 'Message queue-তে'], 'Tile স্থির file।'],
    ['ETA সঠিক করতে কী লাগে?', ['Live আর আগের traffic থেকে prediction', 'শুধু দূরত্ব ÷ রাস্তার গতিসীমা', 'দূরত্বের সাথে random সময় যোগ', 'User-কে জিজ্ঞেস করে গড় নেওয়া'], 'শুধু দূরত্ব দিয়ে ঢাকায় ETA হয় না!'],
  ],
});

export const l19 = level({
  id: 19, chapter: 4,
  title: 'Event হারাচ্ছে', concept: 'Distributed message queue',
  story: 'Event হারাচ্ছে',
  briefing: 'Order event-গুলো মাঝে মাঝে হারায়, আবার কখনো দুবার process হয়। Service-গুলোর মাঝে একটা নির্ভরযোগ্য পাইপ দরকার।',
  ref: refs.p5,
  predict: ['Event যেন হারায় না, consumer ধীর হলেও। কী লাগে?', ['Disk-এ log আর consumer offset', 'Memory-তে একটা list', 'Database-এ শুধু একটা table', 'Email-এ event']],
  nodes: [
    ['pr', 'Producer', 'service', 8, 50], ['p0', 'Partition ০', 'queue', 42, 22], ['p1', 'Partition ১', 'queue', 42, 50], ['p2', 'Partition ২', 'queue', 42, 78],
    ['ca', 'Consumer A', 'worker', 82, 32], ['cb', 'Consumer B', 'worker', 82, 72], ['off', 'Offset', 'step', 82, 8],
  ],
  steps: [
    { text: 'Topic অনেক partition-এ ভাগ। Message key-র hash দিয়ে partition ঠিক হয়।', add: ['pr', 'p0', 'p1', 'p2'], flow: [['pr', 'p1']], badges: { pr: 'key = order#7' } },
    { text: 'একই key সবসময় একই partition-এ: সেই key-র ক্রম বজায়।', flow: [['pr', 'p1']], ok: ['p1'] },
    { text: 'Consumer group: প্রতিটা partition group-এর একজন consumer পড়ে।', add: ['ca', 'cb'], flow: [['p0', 'ca'], ['p1', 'ca'], ['p2', 'cb']] },
    { text: 'Consumer A ১০৪ পর্যন্ত commit করল, ১০৫–১০৭ process করছিল, তারপর crash।', add: ['off'], down: ['ca'], badges: { off: 'p1: ১০৪' }, ask: ['এখন কী হবে?', ['১০৫ থেকে আবার (duplicate)', '১০৮ থেকে, কিছু আবার না', 'শুরু (০) থেকে সব', '১০৫–১০৭ হারিয়ে যায়']] },
    { text: 'Partition B-কে দেওয়া হল; শেষ commit থেকে আবার: at-least-once।', down: ['ca'], flow: [['p0', 'cb'], ['p1', 'cb']] },
    { text: 'প্রতিটা partition-এর leader আর follower replica।', ask: ['ack = all মানে?', ['সব in-sync replica লিখলে', 'শুধু leader লিখলেই', 'কেউ না লিখলেও সফল', 'Consumer পড়লে তবে']] },
    { text: 'ack=all নিরাপদ কিন্তু ধীর; ack=1 মাঝামাঝি; ack=0 দ্রুত কিন্তু হারাতে পারে।', focus: ['p0', 'p1', 'p2'] },
  ],
  summary: ['Topic → partition; key একই হলে একই partition, ক্রম বজায়', 'Consumer group আর offset; crash হলে শেষ commit থেকে', 'ack দিয়ে durability বনাম গতি'],
  play: {
    kind: 'missions', intro: 'Delivery semantics বাছুন।',
    missions: [
      ['Payment event: হারানো চলবে না, duplicate সামলানো যায়।', ['At-least-once + idempotent consumer', 'At-most-once, ack ছাড়া দ্রুত', 'Fire and forget, retry ছাড়া', 'Exactly-once, কোনো dedupe ছাড়া'], 'হারানোর চেয়ে দুবার আসা ভালো, যদি consumer সামলাতে পারে।'],
      ['Metric log: কিছু হারালে ক্ষতি নেই, গতি জরুরি।', ['At-most-once (ack=0)', 'Exactly-once', 'At-least-once ack=all', 'Sync'], 'সবচেয়ে হালকা।'],
      ['Consumer সংখ্যা partition-এর চেয়ে বেশি?', ['বাড়তিরা বসে থাকে', 'সব আরও দ্রুত চলে', 'Partition নিজে বাড়ে', 'Consumer crash করে'], 'এক partition এক consumer।'],
    ],
  },
  boss: [
    ['Disk-এ sequential write কেন?', ['Sequential দ্রুত, page cache কাজে লাগে', 'Random write disk-এ সবচেয়ে দ্রুত', 'Memory নেই বলেই disk-এ লিখতে হয়', 'Disk ধীর, তাই যত কম লেখা যায়'], 'Kafka-র গতির রহস্য।'],
    ['Pull নাকি push consumer?', ['Pull: নিজের গতিতে, batch সুবিধা', 'Push: broker যত দ্রুত পারে', 'দুটোই একসাথে বাধ্যতামূলক', 'Email দিয়ে consumer-কে'], 'ধীর consumer ডুবে যায় না।'],
    ['Exactly-once-এর কাছাকাছি পেতে?', ['Idempotent producer + transaction/dedupe', 'শুধু বেশি বেশি retry করে যাওয়া', 'ack=0 দিয়ে দ্রুত পাঠিয়ে দেওয়া', 'Offset না রেখে সব আবার পড়া'], 'Duplicate চেনার উপায় লাগে।'],
    ['Retention শেষ হলে?', ['পুরনো segment মুছে যায়', 'চিরকাল থেকে যায়', 'Consumer group মুছে যায়', 'Producer error পায়'], 'Log অসীম বাড়ে না।'],
    ['একটা order-এর event-গুলো ক্রমে চাই। কী করবেন?', ['Order ID-কে message key', 'সব event-এর জন্য ১টা partition', 'Random key প্রতি event-এ', 'Key ছাড়া পাঠানো'], 'Key একই, partition একই, ক্রম বজায়।'],
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
    { text: 'একটা alert rule বসালাম।', add: ['al'], badges: { al: 'CPU > ৮০% ৫ মিনিট' }, ask: ['এই rule কখন alert দেবে?', ['টানা ৫ মিনিট ৮০%-এর উপরে', 'একবার ৮০% ছুঁলেই', '৫ মিনিটে একবার ছুঁলেই', 'প্রতি মিনিটে, শর্ত ছাড়া']] },
    { text: 'শর্ত টানা পূরণ হলে তবে alert, dedupe করে email/pager-এ।', flow: [['ts', 'al']], ok: ['al'] },
    { text: 'পুরনো data কী করব?', add: ['ds'], ask: ['এক মাস পুরনো data-র resolution?', ['কমিয়ে, যেমন ১ ঘণ্টা', '১০ সেকেন্ডই রাখা', 'আরও বাড়িয়ে ১ ms', 'সব মুছে ফেলা']] },
    { text: 'Downsample: ৭ দিন পর ১ মিনিট, ৩০ দিন পর ১ ঘণ্টা। আর label-এ user_id দিলে series অসংখ্য: cardinality-র ফাঁদ।', flow: [['ts', 'ds']] },
  ],
  summary: ['Collector → Kafka → time-series DB → dashboard আর alert', 'Alert: টানা শর্ত, dedupe', 'Downsample পুরনো data; label-এ সীমিত মান'],
  play: {
    kind: 'missions', intro: 'Metric system-এর তিনটা ফাঁদ।',
    missions: [
      ['Metric label হিসেবে user_id দেওয়া কেন খারাপ?', ['অসংখ্য time series, DB ফুলে যায়', 'Query আগের চেয়ে দ্রুত হয়', 'Dashboard আরও সুন্দর দেখায়', 'কোনো সমস্যা নেই, সব ঠিক'], 'প্রতিটা label মানের জোড়া একটা আলাদা series।'],
      ['Alert যেন বারবার না বাজে?', ['Dedupe আর grouping', 'প্রতিবার পাঠানো', 'সব alert বন্ধ', 'Rule মুছে দেওয়া'], 'Alert fatigue-এ মানুষ সব উপেক্ষা করে।'],
      ['অল্পক্ষণ চলা batch job-এর metric?', ['Push, শেষের আগে পাঠায়', 'Pull, collector টেনে নেয়', 'কোনো metric লাগে না', 'Email-এ ফল'], 'Pull করার আগেই job শেষ।'],
    ],
  },
  boss: [
    ['Pull model-এর সুবিধা?', ['Collector জানে কে বেঁচে আছে', 'Firewall পার হওয়া সহজ', 'Short-lived job-এ সবচেয়ে ভালো', 'Agent লাগে না কোনো server-এ'], 'Endpoint সাড়া না দিলেই বোঝা যায়।'],
    ['Metric data-র compression?', ['Delta encoding-এ অনেক কমে', 'Compress হয় না একদম', 'Compress করলে আরও বাড়ে', 'শুধু ছবি compress হয়'], 'পাশাপাশি মান কাছাকাছি।'],
    ['কোন label নিরাপদ?', ['Region বা service নাম', 'প্রতিটা Request ID', 'প্রতিটা User email', 'সঠিক Timestamp'], 'Cardinality-র ফাঁদ এড়ান।'],
    ['Kafka বাদ দিলে ঝুঁকি?', ['DB বন্ধ হলে metric হারায়', 'কিছু না, সব একই', 'সব আরও দ্রুত হয়', 'খরচ বাড়ে, কিছু হারায় না'], 'Buffer না থাকলে চাপের সময় data পড়ে যায়।'],
    ['Metric write বেশি না read?', ['Write অনেক বেশি', 'Read অনেক বেশি', 'দুটো সমান', 'কোনোটাই হয় না'], 'তাই write-optimized time-series DB।'],
  ],
});

export const l21 = level({
  id: 21, chapter: 4,
  title: 'মিনিটে কত parcel', concept: 'Stream aggregation',
  story: 'Hub-এ মিনিটে কত parcel',
  briefing: 'প্রতিটা hub-এ মিনিটে কত parcel scan হল, dashboard-এ live দেখাতে হবে, আর মাস শেষে এই সংখ্যা দিয়েই partner-কে টাকা দেওয়া হবে। তাই গোনা নির্ভুল হতে হবে।',
  ref: refs.p5,
  predict: ['দেরিতে আসা event কোন মিনিটে গুনবেন?', ['Event time (ঘটনার সময়)', 'Processing time (পৌঁছানোর সময়)', 'Window শেষের সময়', 'Server-এর ঘড়ির সময়']],
  nodes: [
    ['lg', 'Scan log', 'step', 8, 50], ['kq', 'Kafka', 'queue', 28, 50], ['ag', 'Aggregator', 'worker', 52, 50],
    ['out', 'Kafka (ফল)', 'queue', 74, 50], ['db', 'DB', 'db', 92, 50], ['raw', 'Raw store', 'store', 52, 86], ['rc', 'Reconciliation', 'service', 74, 86],
  ],
  steps: [
    { text: 'Scan event stream হয়ে aggregator-এ, প্রতি মিনিটের window-এ গোনা।', add: ['lg', 'kq', 'ag'], flow: [['lg', 'kq'], ['kq', 'ag']] },
    { text: 'Tumbling window: প্রতি মিনিট আলাদা ঘর।', badges: { ag: '১০:০১ window' } },
    { text: 'একটা event ১০:০০:৫৮-এ ঘটেছিল, পৌঁছাল ১০:০১:০৫-এ।', badges: { lg: 'দেরিতে এল' }, ask: ['এই event কোন মিনিটে গোনা হবে?', ['১০:০০, watermark-এর মধ্যে হলে', '১০:০১, যখন এসে পৌঁছাল', 'বাদ, কারণ দেরিতে এসেছে', 'দুটো মিনিটেই একবার করে']] },
    { text: 'Watermark: window কিছুক্ষণ খোলা রেখে দেরির event ধরা; খুব দেরির জন্য পরে মিলানো।', badges: { ag: 'watermark ১৫ s' }, ok: ['ag'] },
    { text: 'ফল আবার Kafka হয়ে DB-তে।', add: ['out', 'db'], flow: [['ag', 'out'], ['out', 'db']] },
    { text: 'মাস শেষে টাকা দেওয়ার আগে।', add: ['raw', 'rc'], ask: ['Stream-এর ফল যাচাই করবেন কীভাবে?', ['Raw data থেকে batch-এ আবার গোনা', 'যাচাই লাগে না, stream নিখুঁত', 'Dashboard-এর graph দেখে', 'Random কয়েকটা নমুনা দেখে']] },
    { text: 'রাতে raw data থেকে batch-এ আবার গুনে stream-এর ফলের সাথে মেলানো।', flow: [['kq', 'raw'], ['raw', 'rc'], ['db', 'rc']] },
  ],
  summary: ['Event time ধরে window; watermark দেরির event ধরে', 'Aggregator → Kafka → DB; raw data আলাদা রাখা', 'টাকার হিসাবে reconciliation'],
  play: {
    kind: 'missions', intro: 'Window আর নির্ভুলতা।',
    missions: [
      ['Watermark বড় করলে?', ['বেশি event ধরে, ফল দেরিতে', 'কম event ধরে, ফল দ্রুত', 'কিছুই বদলায় না', 'Memory কমে, নির্ভুলতা বাড়ে'], 'নির্ভুলতা বনাম latency।'],
      ['Exactly-once গোনা জরুরি কেন?', ['টাকা জড়িত', 'দেখতে সুন্দর', 'দ্রুত', 'লাগে না'], 'বেশি গুনলে বেশি টাকা, কম গুনলে partner ঠকে।'],
      ['Raw data রাখেন কেন?', ['আবার হিসাব আর debug', 'লাগে না, জায়গা নষ্ট', 'Cache হিসেবে ব্যবহার', 'Ad দেখাতে'], 'Bug ধরা পড়লে ইতিহাস থেকে আবার।'],
    ],
  },
  boss: [
    ['Reconciliation কেন লাগে?', ['Stream-এর ভুল batch-এর সাথে মিলিয়ে ধরা', 'Stream দ্রুত করতে batch যোগ করা', 'Dashboard আরও সুন্দর দেখাতে', 'লাগে না, কারণ stream নিখুঁত'], 'দুই পথের ফল মেলা উচিত।'],
    ['Aggregator crash করলে?', ['Snapshot + offset থেকে আবার', 'সব হারায়, শূন্য থেকে', 'শেষ মিনিটটা বাদ দিয়ে চলা', 'কিছু না, নিজে সামলায়'], 'অবস্থা মাঝে মাঝে সংরক্ষণ।'],
    ['একটা hub-এ বিশাল ভিড় (hotspot)?', ['ওই key-র জন্য বেশি node', 'কিছু না, অপেক্ষা', 'Hub-এর scan বন্ধ', 'Cache-এ রেখে পরে গোনা'], 'চাপ যেখানে, শক্তিও সেখানে।'],
    ['Lambda বনাম Kappa?', ['Kappa: এক streaming path, replay করে', 'Lambda: শুধু batch, stream নেই', 'Kappa: শুধু batch path', 'দুটো একই জিনিস'], 'Kappa-তে code একটাই।'],
    ['প্রতি মিনিটে top ১০০ hub?', ['Window-এ heap দিয়ে top-k', 'প্রতি event-এ সব sort', 'প্রতি সেকেন্ডে DB query', 'দিনের শেষে একবার'], 'Heap ছোট আর দ্রুত।'],
  ],
});
