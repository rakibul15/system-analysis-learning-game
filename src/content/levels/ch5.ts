import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৫ · টাকা, slot আর গুদাম — Vol 2, ch 7–13 */

export const l22 = level({
  id: 22, chapter: 5,
  title: 'একই slot দুজনকে', concept: 'Reservation · Concurrency',
  story: 'একই pickup slot দুজনকে',
  briefing: 'বিকেল ৪টার শেষ pickup slot দুজন merchant একসাথে বুক করল, দুজনেই "সফল" দেখল। Rider একজন, অপেক্ষায় দুজন। Race condition-এর সাথে প্রথম দেখা।',
  ref: refs.p6,
  predict: ['দুজন একসাথে শেষ slot বুক করল, দুজনেই সফল। কেন?', ['দুজনেই আগে পড়ে, তারপর লিখল', 'Database ভেঙে গেছে', 'Network খুব দ্রুত ছিল', 'Merchant-রা ভুল চেপেছে']],
  nodes: [
    ['u1', 'Merchant ১', 'user', 8, 26], ['u2', 'Merchant ২', 'user', 8, 74], ['svc', 'Reservation service', 'service', 40, 50],
    ['db', 'Inventory DB', 'db', 76, 50], ['lk', 'Lock / version', 'step', 76, 14],
  ],
  steps: [
    { text: 'দুজনেই একসাথে পড়ে: বাকি ১।', add: ['u1', 'u2', 'svc', 'db'], flow: [['u1', 'svc'], ['u2', 'svc'], ['svc', 'db']], badges: { db: 'বাকি ১' } },
    { text: 'দুজনেই "খালি" দেখে লিখতে গেল।', ask: ['দুজনেই লিখলে শেষে reserved কত?', ['২ (মোট ১): overbooking', '১, শেষজন জেতে', '০, দুজনেই বাতিল', '৩, retry-তে আরও একটা']] },
    { text: 'Reserved ২, মোট ১: overbooking।', down: ['db'], badges: { db: 'reserved ২ / মোট ১' } },
    { text: 'Pessimistic lock: পড়ার সময়ই row lock (SELECT … FOR UPDATE); অন্যজন অপেক্ষা করে।', add: ['lk'], flow: [['u1', 'svc'], ['svc', 'lk']], badges: { lk: 'pessimistic' } },
    { text: 'Optimistic lock: row-এ version নম্বর।', badges: { lk: 'optimistic: version' }, ask: ['Version ৫ পড়ে লিখতে গেল, কিন্তু DB-তে এখন version ৬। কী হবে?', ['ব্যর্থ; আবার পড়ে চেষ্টা', 'সফল, নতুন version ৬', 'DB crash করে', 'Version ৫-এ ফিরে যায়']] },
    { text: 'ব্যর্থ হলে আবার পড়ে চেষ্টা। Database constraint-ও সম্ভব: reserved ≤ total, ভাঙলে rollback।', ok: ['db'], badges: { lk: 'DB constraint' } },
    { text: 'কম ভিড়ে optimistic ভালো (lock নেই); ভিড় খুব বেশি হলে বারবার ব্যর্থতা। আর একই user-এর দুবার click? Idempotency key।', focus: ['svc'] },
  ],
  summary: ['পড়ে-তারপর-লেখা = race condition, overbooking', 'Pessimistic lock, optimistic version, বা DB constraint', 'দুবার click-এ idempotency key'],
  play: {
    kind: 'missions', intro: 'Lock বাছাই।',
    missions: [
      ['Reservation data-র জন্য কোন DB?', ['Relational (ACID)', 'শুধু key-value', 'CSV file', 'শুধু cache'], 'Transaction আর constraint লাগে।'],
      ['একই merchant দুবার "Book" চাপল?', ['Idempotency key-তে দ্বিতীয়টা বাদ', 'দুটো আলাদা booking হয়ে যায়', 'দ্বিতীয়বার সবসময় error দেখায়', 'দ্বিতীয়টা প্রথমটাকে মুছে দেয়'], 'Reservation ID আগে থেকে তৈরি করে পাঠানো।'],
      ['Contention কম। কোন lock?', ['Optimistic', 'Pessimistic', 'Global lock', 'কোনো lock না'], 'বেশিরভাগ সময় সংঘর্ষ হয় না।'],
    ],
  },
  boss: [
    ['Flash sale-এ বিপুল contention। Optimistic lock-এর সমস্যা?', ['অনেক ব্যর্থতা আর বারবার retry', 'কখনো ব্যর্থ হয় না, সব সফল', 'Deadlock হয়ে সব আটকে যায়', 'Data হারিয়ে যায় চুপচাপ'], 'Version বারবার বদলায়।'],
    ['Pessimistic lock-এর ঝুঁকি?', ['Deadlock আর কম scale', 'Overbooking', 'কোনো ঝুঁকি নেই', 'Version বারবার বাড়ে'], 'Lock ধরে রাখলে অন্যরা আটকে থাকে।'],
    ['Inventory cache-এ রাখলে?', ['দ্রুত পড়া, চূড়ান্ত যাচাই DB-তে', 'সব cache-এ, DB বাদ দেওয়া', 'Cache-এ রাখা একেবারে নিষেধ', 'Cache-ই চূড়ান্ত সত্য, DB নয়'], 'Cache একটু পুরনো হতে পারে।'],
    ['Reservation আর payment আলাদা service আর DB হলে?', ['Saga বা 2PC', 'কিছু লাগে না', 'দুটো এক table-এ', 'Cache দিয়ে মেলানো'], 'এক transaction-এ দুই DB নেই।', 'Level ২৭-এ বিস্তারে'],
    ['ইচ্ছা করে ১০% overbooking (no-show-এর জন্য)?', ['Constraint-এ মোট × ১১০%', 'অসম্ভব, constraint মানে না', 'Lock তুলে দিলে হয়', 'Random কিছু booking বাদ'], 'Hotel-এর প্রচলিত নিয়ম, বইয়ে আছে।'],
  ],
});

export const l23 = level({
  id: 23, chapter: 5,
  title: 'Receipt spam-এ', concept: 'Email service',
  story: 'Receipt spam-এ যাচ্ছে',
  briefing: 'Delivery receipt email অর্ধেক customer-এর spam folder-এ যাচ্ছে। কেউ দেখছে না, অভিযোগ বাড়ছে। Email কোন পথে যায়, আর কে ঠিক করে inbox না spam?',
  ref: refs.p6,
  predict: ['Email পাঠানোর মূল protocol?', ['SMTP', 'শুধু HTTP', 'FTP', 'SSH']],
  nodes: [
    ['app', 'ParcelGo', 'service', 8, 50], ['ws', 'Web server', 'server', 28, 50], ['q', 'Outgoing queue', 'queue', 48, 50],
    ['sm', 'SMTP worker', 'worker', 68, 50], ['ot', 'প্রাপকের mail server', 'server', 90, 26], ['ib', 'Inbox / spam', 'store', 90, 78],
  ],
  steps: [
    { text: 'Email যায় outgoing queue-তে, SMTP worker পাঠায়।', add: ['app', 'ws', 'q', 'sm'], flow: [['app', 'ws'], ['ws', 'q'], ['q', 'sm']] },
    { text: 'SMTP দিয়ে প্রাপকের mail server-এ।', add: ['ot'], flow: [['sm', 'ot']] },
    { text: 'প্রাপকের দিকে পৌঁছাল।', add: ['ib'], ask: ['Spam check কোথায় হয়?', ['প্রাপকের mail server-এ', 'আমাদের SMTP worker-এ', 'DNS server-এ', 'আমাদের outgoing queue-তে']] },
    { text: 'প্রাপক SPF, DKIM, DMARC আর sender reputation দেখে ঠিক করে inbox না spam।', flow: [['ot', 'ib']], badges: { ib: 'spam?' } },
    { text: 'নতুন IP থেকে হঠাৎ অনেক email = সন্দেহ। ধীরে বাড়ানো (warm-up), receipt আর marketing-এর আলাদা IP।', badges: { sm: 'IP warm-up' } },
    { text: 'অনেকে receipt-কে spam চিহ্ন দিচ্ছে।', ask: ['এর প্রভাব?', ['Reputation কমে, আরও spam-এ যায়', 'কিছু না, শুধু ওই একটা email', 'Email আরও দ্রুত পৌঁছায়', 'Bounce আগের চেয়ে কমে যায়']] },
    { text: 'Bounce আর complaint দেখে তালিকা পরিষ্কার রাখা; unsubscribe সহজ রাখা।', ok: ['ib'] },
  ],
  summary: ['App → queue → SMTP worker → প্রাপকের server → inbox/spam', 'SPF, DKIM, DMARC আর reputation', 'IP warm-up, আলাদা IP, bounce/complaint সামলানো'],
  play: {
    kind: 'missions', intro: 'Deliverability-র তিনটা প্রশ্ন।',
    missions: [
      ['DKIM কী করে?', ['Signature: পথে বদলায়নি প্রমাণ', 'Email পুরোটা encrypt করে', 'কোন IP পাঠাতে পারে বলে', 'Spam folder খোঁজে'], 'প্রাপক domain-এর public key দিয়ে যাচাই করে।'],
      ['Marketing আর receipt একই IP থেকে?', ['আলাদা IP রাখুন', 'একই IP, সহজে চলে', 'IP লাগে না, domain যথেষ্ট', 'প্রতি ঘণ্টায় IP বদলান'], 'Transactional email-এর reputation রক্ষা।'],
      ['বারবার একই address থেকে bounce?', ['Suppression list-এ, আর না পাঠানো', 'বারবার পাঠানো, পৌঁছানো পর্যন্ত', 'Spam folder-এ পাঠানো', 'অন্য IP থেকে চেষ্টা'], 'Bounce বেশি হলে reputation কমে।'],
    ],
  },
  boss: [
    ['নতুন domain থেকে প্রথম দিনেই ১০ লাখ email। ভুলটা?', ['IP/domain warm-up না করা', 'SPF record বেশি দেওয়া', 'DKIM signature বেশি লম্বা', 'Email-এ বেশি ছবি রাখা'], 'বিশ্বাস ধীরে অর্জন।'],
    ['Attachment কোথায় রাখবেন?', ['Object storage, metadata-তে link', 'Database row-এর ভিতরে binary', 'Outgoing queue-র message-এ', 'Cache server-এর memory-তে'], 'বড় binary আলাদা।'],
    ['বিশাল mail metadata কোন DB?', ['Bigtable/Cassandra ধরনের NoSQL', 'একটা বড় MySQL server', 'শুধু Redis-এর memory', 'দিন প্রতি একটা CSV file'], 'বইয়ের পছন্দ।'],
    ['Web client-এ নতুন email সাথে সাথে?', ['WebSocket', 'প্রতি ms-এ polling', 'Email', 'Reload'], 'Real-time দুই দিকের connection।'],
    ['লাখো email-এ search?', ['Search index (Elasticsearch)', 'প্রতিবার সব email full scan', 'সব email cache-এ রেখে খোঁজা', 'পুরনো email মুছে খোঁজা ছোট'], 'Write-heavy search, সতর্ক design।'],
  ],
});

export const l24 = level({
  id: 24, chapter: 5,
  title: 'POD ছবির খরচ', concept: 'Object storage (S3)',
  story: 'Proof-of-delivery ছবি রাখার খরচ',
  briefing: 'প্রতিটা delivery-র proof ছবি রাখা আইনত বাধ্যতামূলক, ৫ বছর। প্রতিটার তিন copy রাখায় storage bill তিনগুণ। কম খরচে সমান নিরাপদ রাখা যায়?',
  ref: refs.p6,
  predict: ['নিরাপদ রাখতে ৩টা copy (replication)। বাড়তি storage কত?', ['২০০% (মোট ৩ গুণ)', '৫০% (মোট ১.৫ গুণ)', '১০০% (মোট ২ গুণ)', '৩০০% (মোট ৪ গুণ)']],
  nodes: [
    ['obj', 'Object', 'store', 10, 24], ['rep', '৩ copy', 'store', 40, 24], ['ec', 'Erasure coding ৮+৪', 'worker', 72, 24],
    ['d', '৮ data টুকরো', 'store', 54, 62], ['p', '৪ parity', 'store', 86, 62], ['dk', 'নষ্ট disk', 'db', 70, 90],
  ],
  steps: [
    { text: 'Replication: ৩ copy, ২০০% বাড়তি জায়গা, read দ্রুত।', add: ['obj', 'rep'], flow: [['obj', 'rep']], badges: { rep: 'খরচ ৩×' } },
    { text: 'Erasure coding: ৮ data + ৪ parity টুকরো, মাত্র ৫০% বাড়তি।', add: ['ec', 'd', 'p'], flow: [['obj', 'ec'], ['ec', 'd'], ['ec', 'p']], badges: { ec: 'খরচ ১.৫×' } },
    { text: 'একটা rack-এর কয়েকটা disk নষ্ট হল।', add: ['dk'], down: ['dk'], ask: ['৮+৪-এ কতগুলো টুকরো হারালেও data বাঁচে?', ['৪টা', '১টা', '৮টা', '০']] },
    { text: 'যেকোনো ৪টা হারালেও বাকি ৮টা থেকে গড়া যায়। তবে read-এ অনেক node থেকে আনতে হয়, ধীর।', down: ['dk'], ok: ['ec'] },
    { text: 'Metadata আলাদা: bucket আর object নাম → কোন data node, কোন offset।', focus: ['obj'] },
    { text: 'কোটি ছোট ছবি।', ask: ['প্রতিটা ছবি আলাদা file হলে সমস্যা?', ['Inode আর metadata শেষ হয়ে যায়', 'কোনো সমস্যা নেই, file তো file', 'প্রতিটা ছবির মান কমে যায়', 'CDN ছাড়া কোনো ছবি পড়া যায় না']] },
    { text: 'ছোট object একটা বড় file-এ জোড়া দিয়ে লেখা (WAL-এর মতো), offset metadata-তে।', focus: ['d'] },
  ],
  summary: ['Replication ৩×: দ্রুত, দামি; erasure coding ১.৫×: সস্তা, ধীর', '৮+৪ মানে ৪টা হারালেও চলে', 'Metadata আলাদা; ছোট object জোড়া দিয়ে বড় file'],
  play: {
    kind: 'missions', intro: 'কোন data-য় কোনটা।',
    missions: [
      ['প্রায়ই পড়া, latency জরুরি data?', ['Replication', 'Erasure coding', 'Tape', 'কোনোটা না'], 'এক জায়গা থেকেই পুরো object।'],
      ['আর্কাইভ, কম পড়া, খরচ জরুরি (POD ছবি)?', ['Erasure coding', '৫টা copy', 'Memory-তে রাখা', 'Cache-এ রাখা'], 'POD ছবি এর আদর্শ উদাহরণ।'],
      ['Object immutable হওয়ার সুবিধা?', ['Design সহজ, শুধু নতুন version', 'জায়গায় দ্রুত update', 'প্রতি write-এ lock লাগে', 'কোনো সুবিধা নেই'], 'S3-এ object জায়গায় বদলায় না।'],
    ],
  },
  boss: [
    ['Durability বাড়াতে copy রাখবেন কোথায়?', ['আলাদা failure domain (rack/AZ)', 'একই disk-এর আলাদা অংশে', 'একই server-এর আলাদা disk-এ', 'একই rack-এর পাশের server-এ'], 'এক বিদ্যুৎ বিভ্রাটে সব যেন না যায়।'],
    ['Data corruption ধরতে?', ['Checksum', 'শুধু copy বাড়ানো', 'Cache', 'কিছু না'], 'পড়ার সময় checksum মিলিয়ে।'],
    ['Versioning চালু থাকলে delete?', ['Delete marker; পুরনো version থাকে', 'সব version মুছে যায়', 'Error: versioned object মোছা যায় না', 'পুরো bucket মুছে যায়'], 'ভুলে মুছলেও ফেরানো যায়।'],
    ['বড় file upload?', ['Multipart upload', 'একবারে single upload', 'Email attachment', 'Compress করে single upload'], 'টুকরো ব্যর্থ হলে শুধু সেটা আবার।'],
    ['Garbage collection কেন?', ['মুছে ফেলা অংশের জায়গা ফেরত', 'Read আগের চেয়ে দ্রুত করা', 'Cache সবসময় গরম রাখা', 'দরকার নেই, disk সস্তা'], 'জোড়া দেওয়া file-এ মুছে ফেলা অংশ পরে পরিষ্কার।'],
  ],
});

export const l25 = level({
  id: 25, chapter: 5,
  title: 'Rider ranking', concept: 'Leaderboard',
  story: 'Rider ranking',
  briefing: 'মাসের সেরা rider-রা bonus পাবে। App-এ live ranking চাই: প্রতিটা delivery-তে score বাড়বে, আর প্রত্যেকে নিজের rank দেখবে।',
  ref: refs.p6,
  predict: ['লাখো rider-এর score থেকে rank বের করতে প্রতিবার SQL sort?', ['ধীর; sorted set লাগে', 'দ্রুত, index থাকলে', 'ঠিক আছে, রাতে চালালে', 'দ্রুত, cache লাগে না']],
  nodes: [
    ['rd', 'Rider', 'user', 8, 50], ['api', 'Leaderboard service', 'service', 32, 50], ['zs', 'Redis sorted set', 'cache', 62, 50],
    ['my', 'MySQL (ইতিহাস)', 'db', 88, 22], ['top', 'Top ১০', 'step', 88, 78],
  ],
  steps: [
    { text: 'Delivery শেষ হলে score বাড়ে: ZINCRBY।', add: ['rd', 'api', 'zs'], flow: [['rd', 'api'], ['api', 'zs']], badges: { zs: 'ZINCRBY +১' } },
    { text: 'Sorted set ভিতরে skip list + hash: insert আর rank O(log n)।', focus: ['zs'] },
    { text: 'Top ১০: ZREVRANGE ০ ৯।', add: ['top'], flow: [['zs', 'top']] },
    { text: 'এক rider নিজের rank দেখতে চায়।', badges: { rd: 'score ৪২০' }, ask: ['এই rider-এর rank কীভাবে?', ['ZREVRANK (O(log n))', 'পুরো set sort করে', 'MySQL scan করে', 'অসম্ভব']] },
    { text: 'ZREVRANK সাথে সাথে rank দেয়। স্থায়ী ইতিহাস MySQL-এ; Redis পড়লে আবার গড়া যায়।', add: ['my'], flow: [['api', 'my']] },
    { text: 'User সংখ্যা ১০০ গুণ হল।', badges: { zs: '১০০× scale' }, ask: ['এক Redis-এ না ধরলে?', ['Shard: range বা hash ধরে', 'একটা আরও বড় Redis চিরকাল', 'SQL-এ ফেরা', 'Cache বাদ']] },
    { text: 'Score range ধরে shard করলে top-k এক shard থেকে; hash ধরে করলে সব shard-এর top-k জোড়া লাগাতে হয়।', ok: ['zs'] },
  ],
  summary: ['Redis sorted set: ZINCRBY, ZREVRANGE, ZREVRANK', 'ভিতরে skip list: O(log n)', 'বড় হলে shard: score range বা hash'],
  play: {
    kind: 'missions', intro: 'Memory আর নিয়ম।',
    missions: [
      ['২.৫ কোটি MAU × ২৬ byte, memory কত?', ['~৬৫০ MB', '~৬৫ GB', '~৬৫ MB', '~৬.৫ TB'], '২.৫ × ১০^৭ × ২৬ ≈ ৬.৫ × ১০^৮ byte।'],
      ['Redis crash করলে data?', ['Persistence আর replica, দরকারে MySQL থেকে', 'চিরতরে হারায়, নতুন করে শুরু', 'অন্য cache-এ আপনা থেকে থাকে', 'কিছু হয় না, Redis কখনো পড়ে না'], 'Sorted set আবার বানানো যায়।'],
      ['Score সমান হলে আগে কে?', ['আগে যে পৌঁছেছে', 'Random', 'নামের ক্রম অনুযায়ী', 'দুজনেই এক rank'], 'Score-এর সাথে সময় মিশিয়ে।'],
    ],
  },
  boss: [
    ['Hash ধরে shard করলে top ১০?', ['সব shard-এর top ১০ এনে জোড়া', 'একটা shard দেখলেই হবে', 'অসম্ভব, hash-এ ক্রম নেই', 'MySQL থেকে আনা'], 'রাউন্ড ট্রিপ বেশি।'],
    ['Score range ধরে shard-এর সুবিধা?', ['Top-k এক shard থেকেই', 'ভাগ সবসময় সমান থাকে', 'Memory কম লাগে', 'কোনো সুবিধা নেই'], 'কিন্তু score বদলালে shard বদলায়।'],
    ['১০০× scale (২,৫০,০০০ QPS, ৬৫ GB)?', ['Shard (range বা hash)', 'একটা আরও বড় Redis', 'SQL-এ ফিরে যাওয়া', 'Cache বাদ দেওয়া'], 'বইয়ের হিসাব।'],
    ['কেন SQL sort নয়?', ['প্রতি query-তে লাখো row sort', 'SQL-এ sort করাই যায় না', 'SQL বেশি দ্রুত, তাই অপচয়', 'Index বানানো যায় না'], 'Rank হিসাব O(n log n)।'],
    ['প্রতি মাসে নতুন leaderboard?', ['মাসের নামে নতুন key', 'একটাই key, মাস শেষে মুছে', 'শুধু MySQL-এ', 'কখনো নতুন নয়'], 'leaderboard_2026_11।'],
  ],
});

export const l26 = level({
  id: 26, chapter: 5, simulator: 'payment',
  title: 'COD দুবার কাটা', concept: 'Payment system',
  story: 'Online payment দুবার কাটা পড়ল',
  briefing: 'Customer pay চাপল, network কেটে গেল, আবার চাপল। দুবার টাকা কাটা! Payment-এ এমন ভুল মানে আস্থা শেষ। Idempotency আর ledger-এর পাঠ।',
  ref: refs.p6,
  predict: ['Pay চাপার পর network কাটল, user আবার চাপল। ঝুঁকি?', ['টাকা দুবার কাটা', 'টাকা কখনোই কাটবে না', 'Order বাতিল', 'কিছু না']],
  nodes: [
    ['u', 'Customer', 'user', 8, 50], ['pay', 'Payment service', 'service', 34, 50], ['psp', 'PSP (bKash/card)', 'service', 62, 50],
    ['lg', 'Ledger', 'db', 88, 22], ['wl', 'Wallet', 'db', 88, 78], ['ik', 'Idempotency key', 'key', 34, 86],
  ],
  steps: [
    { text: 'Customer → payment service → PSP।', add: ['u', 'pay', 'psp'], flow: [['u', 'pay'], ['pay', 'psp']] },
    { text: 'PSP টাকা কেটেছে, কিন্তু response পথে হারাল।', down: ['pay'], badges: { u: 'response হারাল' } },
    { text: 'User আবার চাপল, একই request।', flow: [['u', 'pay']], ask: ['Idempotency না থাকলে টাকা কতবার কাটবে?', ['দুবার', 'একবার', 'শূন্য', 'তিনবার']] },
    { text: 'Idempotency key (একই order-এর একটা UUID): আগে দেখা হলে আগের ফলই ফেরত, আবার কাটা নয়।', add: ['ik'], flow: [['pay', 'ik']], ok: ['pay'], badges: { ik: 'আগে দেখা' } },
    { text: 'সফল হলে wallet আর ledger update। Ledger double-entry: প্রতিটা debit-এর সমান credit।', add: ['lg', 'wl'], flow: [['pay', 'lg'], ['pay', 'wl']] },
    { text: 'মাস শেষে ledger যোগ করলাম।', badges: { lg: 'debit ৫০০, credit ৪৫০' }, ask: ['Debit ৫০০, credit ৪৫০ মানে?', ['কোথাও ভুল entry আছে', 'সব ঠিক আছে, এটাই স্বাভাবিক', '৫০ টাকা লাভ হয়েছে', '৫০ টাকা খরচ হয়েছে']] },
    { text: 'রাতে PSP-র settlement file-এর সাথে reconciliation; অমিল ধরে ঠিক করা।', ok: ['lg'] },
  ],
  summary: ['Retry-তে দুবার কাটা ঠেকাতে idempotency key', 'Double-entry ledger: debit = credit', 'PSP-র file-এর সাথে reconciliation'],
  play: {
    kind: 'missions', intro: 'Retry আর নিরাপত্তা।',
    missions: [
      ['Retry-র মাঝে কত সময় অপেক্ষা?', ['Exponential backoff', 'প্রতি ms-এ আবার', 'কখনো retry না', 'একসাথে হাজারবার'], 'ক্রমশ বাড়ানো, যাতে চাপ না বাড়ে।'],
      ['কোনো message বারবার ব্যর্থ?', ['Dead letter queue-তে রেখে তদন্ত', 'মুছে ফেলা, আর চেষ্টা না', 'অসীমবার retry করে যাওয়া', 'Queue-র শুরুতে ফেরত রাখা'], 'Poison message বাকিদের আটকায় না।'],
      ['Card নম্বর কোথায় রাখবেন?', ['PSP-র token; raw card নিজেরা না', 'নিজেদের DB-তে plain text-এ', 'Log file-এ, debug-এর জন্য', 'Cache-এ, দ্রুত পড়ার জন্য'], 'PCI DSS-এর ঝামেলা এড়ানো।'],
    ],
  },
  boss: [
    ['Double-entry-র নিয়ম?', ['Debit আর credit-এর যোগফল সমান', 'Debit সবসময় বেশি', 'Credit সবসময় বেশি', 'কোনো নির্দিষ্ট নিয়ম নেই'], 'যোগফল শূন্য না হলে ভুল।'],
    ['Reconciliation কেন?', ['নিজেদের আর PSP-র হিসাব মেলাতে', 'Payment-এর গতি বাড়াতে', 'Cache-এ data ভরে রাখতে', 'লাগে না, PSP সবসময় ঠিক'], 'Distributed system-এ অমিল হবেই।'],
    ['PSP-তে request timeout: সফল না ব্যর্থ জানি না?', ['একই key দিয়ে status যাচাই/retry', 'নতুন key দিয়ে নতুন request', 'ধরে নিন সফল', 'ধরে নিন ব্যর্থ'], 'Key একই, তাই নিরাপদ।'],
    ['Payment-এ consistency বেশি না availability?', ['Consistency', 'Availability', 'দুটোই সমান', 'কোনোটাই না'], 'টাকায় ভুল সবচেয়ে ব্যয়বহুল।'],
    ['Pay-in আর pay-out?', ['Customer থেকে আসা, merchant-কে যাওয়া', 'দুটো একই, শুধু নাম আলাদা', 'শুধু refund-এর দুটো নাম', 'শুধু bank-এর ভিতরের হিসাব'], 'ParcelGo-র COD-তে দুটোই আছে।'],
  ],
});

export const l27 = level({
  id: 27, chapter: 5,
  title: 'Payout মাঝপথে', concept: 'Digital wallet · Distributed transaction',
  story: 'Merchant payout মাঝপথে fail',
  briefing: 'Merchant-এর wallet থেকে টাকা কাটা হল, কিন্তু তার bank account-এ পৌঁছানোর আগেই সিস্টেম পড়ে গেল। টাকা কোথায়? দুই database-এর মধ্যে transaction-এর পাঠ।',
  ref: refs.p6,
  predict: ['দুই আলাদা DB: A থেকে কাটা, B-তে যোগ। মাঝে crash হলে?', ['কেটেছে, যোগ হয়নি: অসংগতি', 'কিছু না, DB নিজে মেলায়', 'দুটো একসাথে ফেরত আসে', 'দুবার যোগ হয়']],
  nodes: [
    ['co', 'Coordinator', 'lb', 50, 14], ['a', 'Wallet DB A', 'db', 22, 54], ['b', 'Wallet DB B', 'db', 78, 54], ['cp', 'Compensation', 'worker', 50, 88],
  ],
  steps: [
    { text: 'A থেকে ১,০০০ কাটা, B-তে যোগ: দুই DB।', flow: [['co', 'a'], ['co', 'b']] },
    { text: '2PC: আগে prepare (দুজনেই lock রেখে রাজি), তারপর commit। ধীর, আর coordinator SPOF।', badges: { co: '2PC' } },
    { text: 'Saga: ধাপগুলো পরপর, প্রতিটা নিজের local transaction।', badges: { co: 'Saga' }, flow: [['co', 'a']], ok: ['a'] },
    { text: 'B-তে যোগ ব্যর্থ।', down: ['b'], ask: ['Saga কী করবে?', ['Compensation: A-তে টাকা ফেরত', 'কিছু না, B ঠিক হলে চলবে', 'A থেকে আবার কাটবে', 'B-তে জোর করে লিখবে']] },
    { text: 'Compensating transaction পেছনের দিকে চলে।', add: ['cp'], flow: [['cp', 'a']], down: ['b'] },
    { text: 'হিসাবে বিশ্বাস চাই।', badges: { a: 'event log' }, ask: ['Wallet balance নির্ভরযোগ্যভাবে আবার গড়বেন কীভাবে?', ['সব event replay করে', 'Cache থেকে পড়ে', 'শেষ balance দেখে', 'Log ছাড়াই অনুমান করে']] },
    { text: 'Event sourcing: প্রতিটা বদল event হিসেবে চিরকাল; যেকোনো মুহূর্তের balance replay করে।', ok: ['a', 'b'] },
  ],
  summary: ['দুই DB-তে এক transaction নেই: 2PC, TC/C, Saga', 'Saga ব্যর্থ হলে compensation পেছনে', 'Event sourcing: replay করে যেকোনো সময়ের অবস্থা'],
  play: {
    kind: 'missions', intro: 'Distributed transaction-এর পথ বাছুন।',
    missions: [
      ['2PC-র দুর্বলতা?', ['Lock অনেকক্ষণ, coordinator-এ আটকে', 'খুব দ্রুত, তাই ভুল বেশি হয়', 'প্রতি ধাপে compensation লিখতে হয়', 'আলাদা event store রাখতে হয়'], 'Blocking protocol।'],
      ['TC/C (try-confirm/cancel) কোন স্তরে?', ['Application স্তরে', 'Database-এর ভিতরে', 'Network স্তরে', 'UI স্তরে'], '2PC-র মতো, কিন্তু DB lock ছাড়া।'],
      ['Saga-র ক্রম কে চালায়?', ['Orchestrator বা event', 'Database নিজে থেকে', 'User নিজে হাতে', 'কেউ না, random ক্রমে'], 'দুই ধরনের saga।'],
    ],
  },
  boss: [
    ['Payout-এ ধাপ কম, rollback সহজ, lock নয়: কোনটা?', ['Saga', '2PC', 'কোনো transaction না', 'Global lock'], 'Lock ছাড়া, compensation দিয়ে।'],
    ['Saga-র মাঝের অবস্থা অন্যরা দেখে ফেলে?', ['হ্যাঁ, isolation নেই', 'না, saga isolation দেয়', 'কখনো না, lock থাকে', 'শুধু DB ভিতরে দেখে'], 'যেমন আগে কাটা, পরে যোগ।'],
    ['১০ লাখ TPS-এর wallet?', ['Partition + event sourcing + Raft', 'একটা বড় database server', 'শুধু Redis cache-এ', 'প্রতিদিনের CSV file'], 'বইয়ের শেষ design।'],
    ['Raft কেন?', ['Log copy-দের মধ্যে consensus', 'দ্রুত hash হিসাব করা', 'Data encrypt করে রাখা', 'Cache গরম রাখা'], 'Leader পড়লে নতুন leader।'],
    ['Command বনাম event?', ['Command = অনুরোধ; event = সত্য', 'দুটো একই', 'Event = অনুরোধ; command = সত্য', 'Command কখনো ব্যর্থ হয় না'], 'Event কখনো বদলায় না।'],
  ],
});

export const l28 = level({
  id: 28, chapter: 5,
  title: 'দ্রুততম matching', concept: 'Stock exchange',
  story: 'দ্রুততম matching',
  briefing: 'নতুন feature: rider-রা delivery job-এর জন্য bid করবে, সবচেয়ে কম দাম আর আগে আসা জিতবে। লাখো bid, microsecond-এ মেলাতে হবে—ঠিক stock exchange-এর মতো।',
  ref: refs.p6,
  predict: ['Order matching অনেক server-এ ছড়ালে কি দ্রুত হবে?', ['না, এক জায়গায় memory-তে ভালো', 'হ্যাঁ, server বাড়ালে সবসময়', 'কোনো পার্থক্য নেই', 'হ্যাঁ, কিন্তু ক্রম হারায় না']],
  nodes: [
    ['br', 'Broker', 'user', 8, 50], ['gw', 'Gateway', 'lb', 28, 50], ['sq', 'Sequencer', 'step', 48, 50],
    ['ob', 'Order book', 'store', 70, 50], ['md', 'Market data', 'service', 92, 26], ['rp', 'Reporter', 'service', 92, 78],
  ],
  steps: [
    { text: 'Order আসে gateway হয়ে; sequencer প্রতিটাকে ক্রমিক নম্বর দেয়।', add: ['br', 'gw', 'sq'], flow: [['br', 'gw'], ['gw', 'sq']] },
    { text: 'Order book: price অনুযায়ী সাজানো buy আর sell।', add: ['ob'], flow: [['sq', 'ob']], badges: { ob: 'কিনব ১০০ @ ৳৫০' } },
    { text: 'নতুন sell order এল।', badges: { ob: 'বেচব ৫০ @ ৳৫০' }, ask: ['এই sell order কার সাথে মিলবে?', ['৳৫০-এর buy-এর সাথে ৫০টা', 'কারো সাথে না, বাতিল', '৳৫০-এর buy-এর সাথে ১০০টা', '৳৪৯-এর buy-এর সাথে']] },
    { text: 'মিলল: ৫০টা fill; একই price-এ আগে আসা আগে পায় (FIFO)।', ok: ['ob'], badges: { ob: 'filled ৫০, বাকি ৫০' } },
    { text: 'ফল market data আর reporter-এ।', add: ['md', 'rp'], flow: [['ob', 'md'], ['ob', 'rp']] },
    { text: 'পুরো critical path এক server-এ, memory-তে, mmap দিয়ে—network hop নেই, latency microsecond।', badges: { sq: 'mmap event store' }, ask: ['Matching engine crash করলে?', ['Event log replay; standby প্রস্তুত', 'সব order চিরতরে হারায়', 'নতুন করে শুরু, খালি order book', 'Broker-রা সব order আবার পাঠায়']] },
    { text: 'Standby primary-র event stream পড়ে প্রস্তুত থাকে; leader বদলায় Raft-এ।', ok: ['sq', 'ob'] },
  ],
  summary: ['Gateway → sequencer → order book → market data', 'Price তারপর সময়: FIFO matching', 'Critical path এক server-এ, memory-তে; deterministic replay'],
  play: {
    kind: 'missions', intro: 'Order book-এর তিনটা প্রশ্ন।',
    missions: [
      ['সেরা bid/ask দ্রুত পেতে order book কীভাবে সাজাবেন?', ['Price level ধরে map + list', 'প্রতি order-এ পুরো book sort', 'প্রতিবার database query', 'আসার ক্রমে একটা তালিকা'], 'Cancel-ও O(1)।'],
      ['Sequencer-এর কাজ?', ['প্রতিটা event-এ ক্রমিক নম্বর', 'প্রতিটা order encrypt করা', 'Market data cache গরম রাখা', 'প্রতিটা order-এর price ঠিক করা'], 'ক্রম ছাড়া replay অর্থহীন।'],
      ['Risk check কোথায়?', ['Matching-এর আগে', 'Matching-এর পরে', 'কখনো না', 'Reporter-এ'], 'ভুল order book-এ ঢোকার আগেই থামানো।'],
    ],
  },
  boss: [
    ['কেন সব এক server-এ?', ['Network hop বাদ, latency microsecond', 'Server ভাড়ার খরচ কম পড়ে', 'Code লেখা আর test সহজ', 'Exchange-এর আইনে বাধ্যতামূলক'], 'প্রতিটা hop ~ms যোগ করে।'],
    ['Exchange-এর availability লক্ষ্য?', ['৯৯.৯৯%', '৯৯.০%', '৯৫.০%', '৯০.০%'], 'বইয়ের হিসাব।'],
    ['সবাই একই সাথে market data পায় কীভাবে?', ['Multicast, সমান দূরত্ব', 'যে আগে চায় সে আগে', 'Random ক্রমে', 'বড় broker আগে'], 'Fairness।'],
    ['Deterministic replay কেন?', ['একই event ক্রমে একই অবস্থা', 'Replay নিজে দ্রুত হয়', 'Cache সবসময় গরম থাকে', 'দরকার নেই, log যথেষ্ট'], 'Event sourcing-এর মতো।'],
    ['Market data থেকে candlestick chart?', ['Trade stream-এ সময়ের window', 'Random মান দিয়ে', 'শুধু দিনের শেষে DB query', 'Admin হাতে আঁকে'], 'Level ২১-এর window-এর ধারণা।'],
  ],
});
