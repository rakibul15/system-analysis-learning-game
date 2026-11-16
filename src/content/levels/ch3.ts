import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৩ · ParcelGo-র app-গুলো — Vol 1, ch 8–15 */

export const l8 = level({
  id: 8, chapter: 3,
  title: 'ছোট link', concept: 'URL shortener',
  story: 'SMS-এ tracking link লম্বা',
  briefing: 'প্রতিটা SMS-এ tracking link ১২০ অক্ষরের, SMS দুই ভাগ হয়ে খরচ দ্বিগুণ। link ছোট করতে হবে: pgo.to/zn9edcu।',
  ref: refs.p3,
  predict: ['Short code-এর জন্য কোন অক্ষরগুলো?', ['০–৯, a–z, A–Z: ৬২টা (base 62)', 'শুধু ০–৯', 'বাংলা অক্ষর', 'শুধু a–z']],
  nodes: [
    ['u', 'User', 'user', 8, 50], ['web', 'Web server', 'server', 36, 50], ['cache', 'Cache', 'cache', 64, 20],
    ['db', 'Database', 'db', 88, 50], ['id', 'ID generator', 'step', 64, 82],
  ],
  steps: [
    { text: 'লম্বা URL এল: আগে একটা unique ID নিই (snowflake ধরনের)।', add: ['u', 'web', 'id', 'db'], flow: [['u', 'web'], ['web', 'id']], badges: { id: '2009215674938' } },
    { text: 'ID-কে base 62-এ লিখি।', badges: { web: 'base 62 → ?' }, ask: ['2009215674938 base 62-এ লিখলে দৈর্ঘ্য মোটামুটি?', ['৭ অক্ষর', '২ অক্ষর', '২০ অক্ষর', '১৩ অক্ষর']] },
    { text: 'zn9edcu: ৭ অক্ষর। ৬২^৭ ≈ ৩.৫ লাখ কোটি, বহু বছর চলে।', flow: [['web', 'db']], badges: { web: 'zn9edcu' } },
    { text: 'Short link-এ click: আগে cache, না পেলে DB থেকে লম্বা URL।', add: ['cache'], flow: [['u', 'web'], ['web', 'cache']], ok: ['cache'], badges: { cache: 'hit' } },
    { text: 'Server redirect পাঠায়: 301 বা 302।', ask: ['Browser একবার 301 পেলে দ্বিতীয় click কোথায় যায়?', ['সরাসরি লম্বা URL-এ, আমাদের server-এ আসে না', 'আবার আমাদের server-এ', 'কোথাও না', 'DB-তে']] },
    { text: '301 = স্থায়ী, browser মনে রাখে (চাপ কম)। 302 = সাময়িক, প্রতি click আমাদের কাছে আসে (click গোনা যায়)।', flow: [['u', 'web']], badges: { web: '301 বনাম 302' } },
  ],
  summary: ['Unique ID → base 62 → ৭ অক্ষরের code', 'Click: cache → DB → redirect', '301 চাপ কমায়; 302 analytics দেয়'],
  play: {
    kind: 'missions', intro: 'Redirect, হিসাব আর ঝুঁকি।',
    missions: [
      ['Click analytics লাগবে। 301 না 302?', ['302', '301', 'কোনোটা না', '200'], 'প্রতি click server-এ এলে তবে গোনা যায়।'],
      ['দিনে ১০ কোটি নতুন URL, ১০ বছর। মোট কত?', ['~৩৬৫ বিলিয়ন', '~৩৬৫ মিলিয়ন', '~৩.৬৫ বিলিয়ন', '~১০ কোটি'], '১০^৮ × ৩৬৫ × ১০ = ৩.৬৫ × ১০^১১।'],
      ['Base 62 conversion-এর একটা অসুবিধা?', ['পরের ID অনুমান করা যায় (নিরাপত্তার ঝুঁকি)', 'Collision বেশি', 'দৈর্ঘ্য স্থির', 'ID generator লাগে না'], 'ক্রমিক ID মানে ক্রমিক code; কেউ সব link ঘুরে দেখতে পারে।'],
    ],
  },
  boss: [
    ['৩৬৫ বিলিয়ন URL-এর জন্য short code কত অক্ষর?', ['৭', '৫', '১০', '৩'], '৬২^৬ ≈ ৫৬ বিলিয়ন (কম), ৬২^৭ ≈ ৩.৫ ট্রিলিয়ন (যথেষ্ট)।', '৬২^৬ কত?'],
    ['Hash (CRC32/MD5)-এর প্রথম ৭ অক্ষর নিলে সমস্যা?', ['Collision; DB-তে খুঁজে দেখতে হয় (bloom filter দিয়ে দ্রুত)', 'কোনো সমস্যা নেই', 'খুব লম্বা', 'Unique ID লাগে'], 'কেটে নিলে দুই URL-এর একই code হতে পারে।'],
    ['একই লম্বা URL দুবার এলে?', ['DB-তে আগে আছে কি না দেখে পুরনো code ফেরত', 'সবসময় নতুন code', 'Error', 'Cache মুছে'], 'জায়গা বাঁচে, একই link একই code।'],
    ['Read অনেক বেশি (১০:১)। কী যোগ করবেন?', ['Cache (short → long)', 'আরও write server', 'Queue', 'কিছু না'], 'জনপ্রিয় link memory থেকেই।'],
    ['Abuse ঠেকাতে?', ['Rate limiter, আর অনুমানযোগ্য code এড়ানো', 'বেশি অক্ষর', '301 বন্ধ', 'DB বাদ'], 'একজন যেন লাখ link বানাতে বা ঘুরে দেখতে না পারে।'],
  ],
});

export const l9 = level({
  id: 9, chapter: 3,
  title: 'দোকানের তালিকা টানা', concept: 'Web crawler',
  story: 'Merchant-এর দোকান থেকে product টানা',
  briefing: 'হাজার merchant-এর website থেকে product তালিকা নিয়মিত টানতে হবে। কিন্তু খুব জোরে টানলে তাদের site বসে যায়, আর একই page বারবার টানা অপচয়।',
  ref: refs.p3,
  predict: ['Crawler একই site-এ সেকেন্ডে শত request করলে?', ['Site চাপে পড়ে বা ব্লক করে; politeness লাগে', 'দ্রুত শেষ, সমস্যা নেই', 'URL কমে', 'DNS বন্ধ হয়']],
  nodes: [
    ['seed', 'Seed URL', 'step', 8, 50], ['fr', 'URL frontier', 'queue', 28, 50], ['dl', 'Downloader', 'worker', 48, 50],
    ['pa', 'Parser', 'service', 68, 26], ['seen', 'Content seen?', 'store', 68, 76], ['ex', 'URL extractor', 'service', 90, 26], ['us', 'URL seen?', 'store', 90, 76],
  ],
  steps: [
    { text: 'Seed URL দিয়ে শুরু; সব যায় URL frontier (queue)-তে।', add: ['seed', 'fr', 'dl'], flow: [['seed', 'fr'], ['fr', 'dl']] },
    { text: 'Page নামানো, parse, তারপর একই content আগে দেখা কি না (hash মিলিয়ে)।', add: ['pa', 'seen'], flow: [['dl', 'pa'], ['pa', 'seen']] },
    { text: 'নতুন link বের করি।', add: ['ex', 'us'], flow: [['pa', 'ex'], ['ex', 'us']], badges: { us: 'আগে দেখা' }, ask: ['এই URL আগে visit হয়েছে। Frontier-এ ঢুকবে?', ['না, URL seen filter বাদ দেয়', 'হ্যাঁ, আবার', 'দুবার', 'শুধু রাতে']] },
    { text: 'আগে দেখা URL বাদ (bloom filter বা hash table); বাকিগুলো frontier-এ ফেরত।', flow: [['us', 'fr']] },
    { text: 'Frontier-এর ভিতরে দুই স্তর: front queue (priority) আর back queue।', focus: ['fr'], badges: { fr: 'front + back queue' }, ask: ['একই host-এর দুই URL পরপর এলে?', ['একই back queue-তে, মাঝে delay রেখে (politeness)', 'দুই worker একসাথে টানে', 'বাদ', 'সবার আগে']] },
    { text: 'Host প্রতি একটা back queue, একজন worker, মাঝে delay। Priority ঠিক হয় PageRank আর update হার দিয়ে।', focus: ['fr', 'dl'], flow: [['fr', 'dl']] },
    { text: 'Robots.txt মানা, DNS cache, timeout, আর spider trap (অসীম link) এড়াতে URL দৈর্ঘ্যের সীমা।', focus: ['dl'] },
  ],
  summary: ['Frontier → download → parse → content seen → extract → URL seen → frontier', 'Politeness: host প্রতি এক queue, এক worker, delay', 'Bloom filter, DNS cache, robots.txt, spider trap সতর্কতা'],
  play: {
    kind: 'missions', intro: 'Crawler চালানোর তিনটা সিদ্ধান্ত।',
    missions: [
      ['BFS না DFS?', ['BFS (frontier queue); DFS অনেক গভীরে আটকে যায়', 'DFS', 'Random', 'কোনোটা না'], 'Web graph খুব গভীর; BFS চওড়া করে এগোয়।'],
      ['Bloom filter-এর trade-off?', ['কম memory, কিন্তু মাঝে মাঝে false positive', 'কখনো ভুল নয়', 'বেশি memory', 'শুধু ছোট data-য়'], 'কিছু নতুন URL-কে আগে দেখা ভেবে বাদ দিতে পারে।'],
      ['Spider trap কী?', ['অসীম link গভীরতা তৈরি করা page (যেমন অসীম calendar)', 'Spam email', 'DNS ভুল', 'Robots.txt'], 'URL দৈর্ঘ্যের সীমা আর নজরদারি দিয়ে এড়ানো।'],
    ],
  },
  boss: [
    ['১০ worker একই host-এর queue থেকে টানছে। Politeness ঠিক করতে?', ['Host প্রতি একটা back queue, এক worker, delay', 'আরও worker', 'DNS বন্ধ', 'Cache বড়'], 'Host-কে একসাথে একটাই connection।'],
    ['কোন page আগে আবার crawl করবেন?', ['যেগুলো বেশি বদলায় বা গুরুত্বপূর্ণ', 'সবসময় সবচেয়ে পুরনোটা', 'Random', 'বড় page'], 'Freshness: update হার আর গুরুত্ব।'],
    ['DNS resolve ধীর (১০–২০০ ms)। কী করবেন?', ['DNS cache রাখা, নিয়মিত update', 'প্রতি request-এ নতুন resolve', 'IP মুখস্থ', 'DNS বাদ'], 'DNS crawler-এর bottleneck হতে পারে।'],
    ['একই content আলাদা URL-এ (প্রায় ৩০%)। ধরবেন কীভাবে?', ['Content-এর hash/checksum মিলিয়ে', 'URL দৈর্ঘ্য দিয়ে', 'Title দেখে', 'ধরা লাগে না'], 'পুরো লেখা তুলনার বদলে hash।'],
    ['Crawler বড় করতে?', ['অনেক server-এ ভাগ, ভৌগোলিকভাবে কাছে', 'একটা বড় server', 'শুধু cache', 'Thread কমানো'], 'Distributed crawl, host-এর কাছের server থেকে।'],
  ],
});

export const l10 = level({
  id: 10, chapter: 3,
  title: 'SMS দুবার', concept: 'Notification system',
  story: 'SMS দুবার যাচ্ছে বা যাচ্ছেই না',
  briefing: 'কেউ "parcel পৌঁছেছে" SMS দুবার পাচ্ছে, কেউ একবারও না। Provider মাঝে মাঝে বন্ধ হয়, আর retry ঠিকমতো হচ্ছে না।',
  ref: refs.p3,
  predict: ['SMS provider একবার fail করল। Retry করলে ঝুঁকি?', ['একই SMS দুবার যেতে পারে', 'কখনো যাবে না', 'Provider বন্ধ হবে', 'কিছু না']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['ns', 'Notification server', 'server', 30, 50], ['q', 'Queue', 'queue', 52, 50],
    ['w', 'Worker', 'worker', 72, 50], ['p', 'SMS provider', 'service', 92, 26], ['log', 'Notification log', 'db', 92, 78],
  ],
  steps: [
    { text: 'Order service → notification server → queue → worker → provider। SMS, push, email-এর আলাদা queue।', add: ['svc', 'ns', 'q', 'w', 'p'], flow: [['svc', 'ns'], ['ns', 'q'], ['q', 'w'], ['w', 'p']] },
    { text: 'Queue মাঝে থাকায় provider ধীর বা বন্ধ হলেও notification হারায় না, আর অংশগুলো আলাদা scale হয়।', focus: ['q'] },
    { text: 'Provider fail করল।', down: ['p'], ask: ['Worker কী করবে?', ['Message queue-তে ফেরত রেখে পরে retry', 'সাথে সাথে মুছে ফেলবে', 'User-কে email', 'কিছু না']] },
    { text: 'Fail হলে queue-তে ফেরত, পরে retry (backoff সহ)।', down: ['p'], flow: [['w', 'q']] },
    { text: 'Retry চলছে।', add: ['log'], flow: [['w', 'log']], ask: ['Retry-তে একই SMS যেন দুবার না যায়?', ['Event ID দিয়ে dedupe: আগে পাঠানো হলে বাদ', 'সবসময় দুবার পাঠানো', 'Retry বন্ধ', 'Provider বদল']] },
    { text: 'প্রতিটা event ID log-এ; আগে দেখা হলে বাদ। তবু exactly-once নিশ্চিত নয়: provider-এর দিকেও duplicate হতে পারে।', ok: ['p'], flow: [['w', 'p'], ['w', 'log']] },
    { text: 'আরও: user setting (opt-out), template, rate limit (অতিরিক্ত নয়), open/click tracking।', focus: ['ns'] },
  ],
  summary: ['Service → notification server → ধরন প্রতি queue → worker → provider', 'Fail হলে queue-তে ফেরত আর backoff সহ retry', 'Event ID-তে dedupe; exactly-once নয়, at-least-once'],
  play: {
    kind: 'missions', intro: 'পাঠানোর আগে, মাঝে আর পরে।',
    missions: [
      ['iOS push notification যায় কার মাধ্যমে?', ['APNs', 'FCM', 'Twilio', 'SMTP'], 'Apple-এর APNs; Android-এ FCM।'],
      ['User এক ধরনের notification বন্ধ রেখেছে। কোথায় দেখবেন?', ['পাঠানোর আগে notification setting table', 'Provider-এর কাছে', 'Log-এ', 'দেখার দরকার নেই'], 'Opt-out মানা বাধ্যতামূলক।'],
      ['একই user ঘণ্টায় ১০০ notification পাচ্ছে?', ['Rate limit, বা একসাথে জড়ো করা', 'সব পাঠান', 'App মুছে দিন', 'Queue বন্ধ'], 'অতিরিক্ত হলে user সব বন্ধ করে দেয়।'],
    ],
  },
  boss: [
    ['Exactly-once কেন হয় না?', ['Ack হারাতে পারে; retry করলে duplicate, না করলে হারানো, তাই at-least-once + dedupe', 'হয়, সবসময়', 'Provider চায় না', 'Queue ছোট'], 'Distributed system-এ নিশ্চিত হওয়ার উপায় নেই কোনটা ঘটেছে।'],
    ['Notification server device token আর contact পায় কোথা থেকে?', ['Cache আর DB থেকে user info পড়ে', 'Provider থেকে', 'User প্রতিবার দেয়', 'Code-এ লেখা'], 'User-এর device আর contact আগে থেকে সংরক্ষিত।'],
    ['SMS provider বন্ধ। Push notification-এর কী হবে?', ['প্রভাব নেই, কারণ প্রতি ধরনের আলাদা queue', 'সব বন্ধ', 'সব মুছে যায়', 'DB crash'], 'আলাদা queue এক ভাঙন অন্যত্র ছড়াতে দেয় না।'],
    ['Data হারানো ঠেকাতে?', ['Notification log DB-তে রাখা আর retry', 'শুধু memory-তে রাখা', 'Log না রাখা', 'একবারই চেষ্টা'], 'Log থাকলে কী গেল আর কী গেল না জানা যায়।'],
    ['আরও বেশি notification সামলাতে?', ['Queue-র পেছনে worker বাড়ানো', 'Provider বাড়ানো', 'Queue বাদ', 'DB বাড়ানো'], 'Worker stateless, horizontal-ভাবে বাড়ে।'],
  ],
});

export const l11 = level({
  id: 11, chapter: 3,
  title: 'Merchant feed', concept: 'News feed',
  story: 'Merchant feed ধীর',
  briefing: 'Customer-রা যেসব merchant follow করে, তাদের নতুন offer feed-এ দেখে। কিন্তু feed খুলতে ৫ সেকেন্ড, আর বড় merchant post দিলে সব আটকে যায়।',
  ref: refs.p3,
  predict: ['কেউ post দিলে follower-দের feed-এ পৌঁছানোর দুটো পথ?', ['Post-এর সময় সবার feed-এ লেখা (push) বা পড়ার সময় জোগাড় (pull)', 'শুধু email', 'SMS', 'Database copy']],
  nodes: [
    ['au', 'Merchant', 'user', 8, 50], ['ps', 'Post service', 'service', 28, 50], ['fo', 'Fanout', 'worker', 50, 50],
    ['fc', 'Feed cache', 'cache', 76, 22], ['gr', 'Follower graph', 'db', 50, 86], ['rd', 'Follower', 'user', 92, 50],
  ],
  steps: [
    { text: 'Post এলে fanout service follower তালিকা আনে।', add: ['au', 'ps', 'fo', 'gr'], flow: [['au', 'ps'], ['ps', 'fo'], ['fo', 'gr']] },
    { text: 'Push (fanout on write): প্রতিটা follower-এর feed cache-এ post ID লেখা।', add: ['fc'], flow: [['fo', 'fc']] },
    { text: 'Follower feed খুললে cache থেকে সাথে সাথে।', add: ['rd'], flow: [['rd', 'fc']], ok: ['fc'] },
    { text: 'এবার ৫০ লাখ follower-এর এক বড় merchant post দিল।', badges: { au: '৫০ লাখ follower' }, ask: ['Push করলে কত write?', ['প্রতি follower-এর জন্য একটা: ৫০ লাখ', 'একটা', '১০০', 'শূন্য']] },
    { text: 'একটা post-এ ৫০ লাখ write: hotkey সমস্যা, fanout ধীর।', down: ['fo'] },
    { text: 'Hybrid: সাধারণ user-এর post push, বড় merchant-এর post পড়ার সময় pull।', ok: ['fo'], flow: [['rd', 'ps']], badges: { au: 'pull' } },
    { text: 'Feed cache-এ কী রাখব?', focus: ['fc'], ask: ['Feed cache-এ পুরো post না শুধু ID?', ['শুধু post ID; পুরো post আর user data আলাদা cache-এ', 'পুরো post আর সব ছবি', 'শুধু merchant-এর নাম', 'কিছুই না']] },
    { text: 'Feed cache-এ শুধু ID রাখা; post আর user data আলাদা cache-এ, যাতে memory কম লাগে আর একই post বারবার জমা না হয়।', focus: ['fc'], ok: ['fc'] },
  ],
  summary: ['Push: লেখার সময় সবার feed-এ; pull: পড়ার সময় জোগাড়', 'Celebrity-র জন্য push ব্যয়বহুল, তাই hybrid', 'Feed cache-এ শুধু post ID; বাকি data আলাদা cache-এ'],
  play: {
    kind: 'missions', intro: 'Push, pull আর cache।',
    missions: [
      ['বেশিরভাগ follower কম active। Push-এর অপচয় কোথায়?', ['নিষ্ক্রিয় user-এর feed আগে থেকে বানানো বৃথা', 'কোনো অপচয় নেই', 'Pull-এ বেশি', 'Read ধীর'], 'যে feed কেউ খুলবে না, তার জন্য write।'],
      ['Pull-এর সমস্যা?', ['Feed খুলতে ধীর, কারণ পড়ার সময় হিসাব', 'Write বেশি', 'Celebrity সমস্যা', 'Cache লাগে না'], 'প্রতিবার অনেক জায়গা থেকে জোগাড়।'],
      ['Feed cache-এ কী রাখবেন?', ['<post_id, user_id> জোড়া, পুরো post নয়', 'পুরো post আর ছবি', 'শুধু user name', 'কিছু না'], 'ছোট রাখলে অনেক বেশি feed ধরে।'],
    ],
  },
  boss: [
    ['Hybrid-এ কোন user-এর জন্য pull?', ['Follower একটা সীমার উপরে (যেমন লাখের বেশি) হলে', 'সবার জন্য push', 'সবার জন্য pull', 'Random'], 'সীমা ঠিক করা design-এর সিদ্ধান্ত।'],
    ['Fanout-এর কাজ ধীর। কী বসাবেন?', ['Message queue + fanout worker', 'আরও cache', 'DB index', 'CDN'], 'Post-এর response দ্রুত, fanout পরে আলাদাভাবে।'],
    ['Graph DB কিসের জন্য?', ['Follower সম্পর্ক রাখা আর দ্রুত খোঁজা', 'ছবি রাখা', 'Session রাখা', 'Log'], 'কে কাকে follow করে, দ্রুত।'],
    ['Feed-এ কতগুলো post cache-এ?', ['সীমা রেখে (সাম্প্রতিক কয়েকশো), পুরনোগুলো দরকারে DB থেকে', 'সব post চিরকাল', 'একটা', 'শূন্য'], 'মানুষ পুরনো feed খুব কম স্ক্রল করে।'],
    ['Post publish-এ authentication আর rate limit কেন?', ['Spam ঠেকাতে আর নিরাপত্তায়', 'দ্রুত করতে', 'Cache-এর জন্য', 'লাগে না'], 'Feed-এ spam সবার অভিজ্ঞতা নষ্ট করে।'],
  ],
});

export const l12 = level({
  id: 12, chapter: 3,
  title: 'Rider-এর সাথে কথা', concept: 'Chat system',
  story: 'Rider আর merchant-এর chat',
  briefing: 'Rider ঠিকানা খুঁজে পাচ্ছে না, merchant-কে message দিল। Message গেল ৩০ সেকেন্ড পরে! Real-time chat চাই, offline থাকলেও যেন হারায় না।',
  ref: refs.p4,
  predict: ['Server থেকে client-এ নতুন message সাথে সাথে পাঠাতে সবচেয়ে ভালো?', ['WebSocket', 'প্রতি সেকেন্ডে polling', 'Email', 'Page reload']],
  nodes: [
    ['a', 'Rider', 'user', 8, 42], ['b', 'Merchant', 'user', 92, 42], ['c1', 'Chat server ১', 'server', 32, 42], ['c2', 'Chat server ২', 'server', 68, 42],
    ['kv', 'Message store', 'db', 50, 86], ['sq', 'Sync queue', 'queue', 50, 12], ['pr', 'Presence', 'service', 30, 82],
  ],
  steps: [
    { text: 'Polling: client বারবার জিজ্ঞেস করে, বেশিরভাগ উত্তর "কিছু নেই"—অপচয়।', add: ['a', 'b', 'c1', 'c2'], flow: [['a', 'c1']] },
    { text: 'WebSocket: একবার connection, তারপর দুই দিকেই message, persistent।', flow: [['a', 'c1'], ['c1', 'a']], badges: { a: 'WebSocket' } },
    { text: 'Message: server ১ → sync queue → server ২ → merchant; সাথে message store-এ সংরক্ষণ।', add: ['kv', 'sq'], flow: [['a', 'c1'], ['c1', 'sq'], ['sq', 'c2'], ['c2', 'b'], ['c1', 'kv']] },
    { text: 'Merchant এখন offline।', down: ['b'], ask: ['Message কোথায় যায়?', ['Store-এ থাকে; push notification যায়, online হলে sync', 'হারিয়ে যায়', 'Rider-এর কাছে ফেরত', 'শুধু server-এর memory-তে']] },
    { text: 'Store-এ জমা; offline user-কে push notification। ফিরলে শেষ পড়া ID থেকে sync।', down: ['b'], flow: [['c1', 'kv']] },
    { text: 'Presence: client নির্দিষ্ট সময় পরপর heartbeat পাঠায়; সময়মতো না এলে offline।', add: ['pr'], flow: [['a', 'pr']], badges: { pr: 'heartbeat' }, ask: ['Rider lift-এ ৩ সেকেন্ড network হারাল। Presence কী দেখাবে?', ['Online, যদি heartbeat-এর সময়সীমা (যেমন ৩০ সেকেন্ড) পার না হয়', 'সাথে সাথে offline', 'Logout', 'Error']] },
    { text: 'অল্প সময়ের কাঁপুনিতে online/offline দোলানো এড়াতে heartbeat-এর সময়সীমা ধরে রাখা।', ok: ['pr'] },
  ],
  summary: ['WebSocket: দুই দিকে persistent connection', 'Message → sync queue → অন্য chat server; সব key-value store-এ', 'Presence heartbeat দিয়ে, সময়সীমা ধরে'],
  play: {
    kind: 'missions', intro: 'Protocol, store আর ID।',
    missions: [
      ['Chat history-র জন্য কোন store?', ['Key-value store (HBase/Cassandra): বিশাল data, সাম্প্রতিক read', 'একটা MySQL table', 'শুধু memory', 'CSV file'], 'বইয়ের পছন্দ: horizontal scale আর কম latency।'],
      ['Long polling-এর সমস্যা?', ['Sender আর receiver আলাদা server-এ থাকতে পারে, disconnect বোঝা কঠিন', 'খুব দ্রুত', 'State থাকে না', 'কোনো সমস্যা নেই'], 'আর message না থাকলেও connection timeout পর্যন্ত ঝুলে থাকে।'],
      ['Message ID-র শর্ত?', ['Unique আর সময়ের ক্রমে সাজানো', 'Random', 'শুধু unique', 'শুধু ক্রম'], 'Level ৭-এর snowflake বা local sequence।'],
    ],
  },
  boss: [
    ['ছোট group chat-এ message কীভাবে ছড়ায়?', ['প্রতিটা member-এর sync queue-তে copy', 'সবার জন্য একটা queue', 'Email', 'সারা দুনিয়ায় broadcast'], 'ছোট দলে copy সহজ; বড় দলে খরচ বেশি।'],
    ['কোন chat server-এ connect করবে কে ঠিক করে?', ['Service discovery (যেমন Zookeeper): কাছের আর কম চাপের server', 'Random', 'User নিজে', 'শুধু DNS'], 'Login-এর পর সেরা server-এর ঠিকানা দেওয়া হয়।'],
    ['Chat server আর API server-এর পার্থক্য?', ['Chat server connection ধরে রাখে (stateful); login, profile stateless', 'সব stateless', 'সব stateful', 'কোনো পার্থক্য নেই'], 'Stateful অংশ ছোট রাখা ভালো।'],
    ['ফোন আর laptop দুটোতেই message?', ['প্রতিটা device-এর শেষ পড়া message ID রেখে sync', 'শুধু শেষ device-এ', 'Email', 'কোনোটাতে না'], 'cur_max_message_id-এর পরের সব আনে।'],
    ['Presence কাঁপা ঠেকানোর মূল কৌশল?', ['Heartbeat আর সময়সীমা; প্রতিটা disconnect-এ offline নয়', 'প্রতি সেকেন্ডে status বদল', 'Presence বাদ', 'Email'], 'অস্থায়ী ভাঙনকে উপেক্ষা।'],
  ],
});

export const l13 = level({
  id: 13, chapter: 3,
  title: 'ঠিকানা খোঁজা', concept: 'Search autocomplete',
  story: 'ঠিকানা খোঁজা ধীর',
  briefing: 'Customer ঠিকানা লিখতে শুরু করলেই নিচে suggestion আসার কথা। এখন প্রতি অক্ষরে পুরো database খোঁজা হয়, suggestion আসে টাইপ শেষ হওয়ার পরে।',
  ref: refs.p4,
  predict: ['প্রতি keypress-এ পুরো database-এ LIKE query?', ['ধীর আর scale হয় না; আগে থেকে গোছানো structure লাগে', 'দ্রুত', 'ঠিক আছে', 'Cache লাগে না']],
  nodes: [
    ['root', 'root', 'step', 50, 10], ['t', 't', 'step', 32, 36], ['w', 'w', 'step', 76, 36],
    ['tr', 'tr', 'step', 20, 62], ['to', 'to', 'step', 44, 62], ['tre', 'tree', 'key', 20, 88], ['toy', 'toy', 'key', 44, 88],
  ],
  steps: [
    { text: 'Trie: প্রতিটা node একটা prefix।', add: ['root', 't', 'w'] },
    { text: '"tree" খুঁজতে root থেকে অক্ষর ধরে নামা।', add: ['tr', 'to', 'tre', 'toy'], flow: [['root', 't'], ['t', 'tr'], ['tr', 'tre']] },
    { text: 'প্রতিটা node-এ top-k জনপ্রিয় শব্দ cache: প্রতি keypress-এ প্রায় সাথে সাথে উত্তর।', badges: { t: 'top: tree, toy, try' } },
    { text: '"toy" আরও জনপ্রিয় হয়ে উঠল।', badges: { toy: '+১ search' }, ask: ['কোন node-এর cache বদলাতে পারে?', ['root থেকে toy পর্যন্ত পথের সব node', 'শুধু toy', 'শুধু root', 'কোনোটাই না']] },
    { text: 'পথের সব node-এর top-k বদলাতে পারে, তাই trie live update নয়, সপ্তাহে একবার নতুন করে গড়া।', focus: ['root', 't', 'to', 'toy'], flow: [['toy', 'to'], ['to', 't'], ['t', 'root']] },
    { text: 'অনেক user "a" দিয়ে শুরু করে।', focus: ['root'], ask: ['Trie ভাগ (shard) করবেন কীভাবে?', ['আগের data দেখে, যাতে প্রতি ভাগে সমান চাপ পড়ে', 'অক্ষর প্রতি সমান ভাগ', 'Random', 'একটা server-এই সব']] },
    { text: 'Shard map manager আগের distribution দেখে ভাগ রাখে। Data: search log → aggregator → trie DB → trie cache।', focus: ['root'] },
  ],
  summary: ['Trie-তে prefix ধরে নামা, node-এ top-k cache', 'Update ব্যয়বহুল, তাই batch-এ নতুন trie', 'Browser cache আর debounce দিয়ে request কমানো; shard আগের data দেখে'],
  play: {
    kind: 'missions', intro: 'Trie-র তিনটা trade-off।',
    missions: [
      ['Top-k cache-এর trade-off?', ['দ্রুত query, কিন্তু বেশি জায়গা', 'কম জায়গা, ধীর', 'কোনো trade-off নেই', 'Update দ্রুত'], 'প্রতি node-এ তালিকা রাখতে memory।'],
      ['Prefix দৈর্ঘ্যের সীমা (যেমন ৫০) কেন?', ['Prefix খোঁজা ছোট আর স্থির সময়ে রাখতে', 'দেখতে সুন্দর', 'Memory বাড়াতে', 'লাগে না'], 'মানুষ খুব লম্বা prefix লেখে না।'],
      ['Typing-এর সময় request কমাতে?', ['Browser cache আর debounce', 'প্রতি অক্ষরে নতুন DB query', 'Server বাড়ানো', 'Index বাদ'], 'একই prefix আবার চাইলে browser থেকেই।'],
    ],
  },
  boss: [
    ['প্রতি search-এ trie update করলে?', ['খুব ব্যয়বহুল (পথের সব node), তাই batch-এ', 'দ্রুত', 'ঠিক আছে', 'কিছু হয় না'], 'Update-এর খরচ গুনুন: প্রতি search-এ পথ ধরে সব cache।'],
    ['ক্ষতিকর শব্দ suggestion-এ না আনতে?', ['Trie cache-এর সামনে filter layer', 'User-কে বলা', 'Log মুছে', 'কিছু না'], 'Trie নতুন করে না গড়েই বাদ দেওয়া যায়।'],
    ['Real-time trending (এই ঘণ্টার খবর)?', ['সাম্প্রতিক data-কে বেশি ওজন, streaming দিয়ে', 'সপ্তাহে একবার যথেষ্ট', 'কখনো না', 'Cache মুছে'], 'বইয়ের মূল design সাপ্তাহিক; trending-এর জন্য আলাদা ব্যবস্থা।'],
    ['Search log থেকে trie কে বানায়?', ['Aggregator (সাপ্তাহিক), তারপর worker trie গড়ে', 'Browser', 'CDN', 'Load balancer'], 'Log → aggregated data → trie DB।'],
    ['Trie DB-র জন্য কোনটা?', ['Document store-এ serialized trie, বা key-value-তে prefix → node', 'শুধু Excel', 'CDN', 'Queue'], 'বই দুই বিকল্পই দেখায়।'],
  ],
});

export const l14 = level({
  id: 14, chapter: 3,
  title: 'Training video', concept: 'Video streaming (YouTube)',
  story: 'Rider training video upload',
  briefing: 'নতুন rider-দের জন্য training video। Upload হয়, কিন্তু কারো ফোনে চলে না, কারো data শেষ হয়ে যায়, আর CDN-এর bill আকাশছোঁয়া।',
  ref: refs.p4,
  predict: ['Video upload হলেই কি সবার ফোনে চালানো যায়?', ['না, আগে বিভিন্ন format আর resolution-এ transcoding', 'হ্যাঁ, সরাসরি', 'শুধু ছোট হলে', 'কখনো না']],
  nodes: [
    ['up', 'Uploader', 'user', 8, 50], ['raw', 'Raw storage', 'store', 28, 50], ['dag', 'Transcoding DAG', 'worker', 50, 50],
    ['enc', 'Encoded storage', 'store', 72, 50], ['cdn', 'CDN', 'cdn', 92, 26], ['v', 'Viewer', 'user', 92, 80],
  ],
  steps: [
    { text: 'Video সরাসরি blob storage-এ (pre-signed URL দিয়ে)।', add: ['up', 'raw'], flow: [['up', 'raw']] },
    { text: 'Video GOP টুকরোয় ভাগ; DAG-এ কাজ: video encode, audio, thumbnail, watermark।', add: ['dag'], flow: [['raw', 'dag']], badges: { dag: 'টুকরো' }, ask: ['কোন কাজগুলো একসাথে চলতে পারে?', ['Video encode, audio encode, thumbnail—একে অন্যের উপর নির্ভর না করায়', 'কোনোটা না', 'সব পরপর', 'শুধু watermark']] },
    { text: 'নির্ভরতা না থাকলে DAG-এর কাজগুলো সমান্তরালে। বিভিন্ন resolution (৩৬০p–১০৮০p) আর format-এ encoded storage-এ।', add: ['enc'], flow: [['dag', 'enc']] },
    { text: 'জনপ্রিয় video CDN থেকে stream; user-এর network অনুযায়ী resolution বদলায় (adaptive bitrate)।', add: ['cdn', 'v'], flow: [['enc', 'cdn'], ['cdn', 'v']] },
    { text: 'মাসের শেষে CDN-এর bill এল।', badges: { cdn: 'খরচ বেশি' }, ask: ['CDN খরচ কমাতে?', ['শুধু জনপ্রিয় video CDN-এ, বাকি নিজের server থেকে', 'সব video CDN-এ', 'CDN বাদ', 'Resolution বাড়ানো']] },
    { text: 'জনপ্রিয়গুলো CDN-এ, কম দেখা video নিজের server থেকে আর কম format-এ; কিছু অঞ্চলে ISP-র সাথে।', flow: [['enc', 'v']], ok: ['cdn'] },
  ],
  summary: ['Upload → raw storage → DAG transcoding → encoded storage → CDN', 'DAG-এ স্বাধীন কাজ সমান্তরালে; adaptive bitrate', 'CDN খরচ: জনপ্রিয়গুলোই CDN-এ'],
  play: {
    kind: 'missions', intro: 'Upload আর pipeline।',
    missions: [
      ['Upload দ্রুত আর ভরসাযোগ্য করতে?', ['ছোট টুকরোয় ভাগ করে upload, ব্যর্থ অংশ আবার', 'একবারে পুরো file', 'Email', 'Compress না করা'], 'Network ভাঙলে শুধু সেই টুকরো।'],
      ['Transcoding শেষে client জানবে কীভাবে?', ['Completion queue/handler থেকে callback বা notification', 'Client বারবার জিজ্ঞেস', 'Admin বলবে', 'কেউ না'], 'Pipeline শেষ হলে event।'],
      ['Copyright বা ক্ষতিকর video ঠেকাতে কোথায়?', ['Transcoding pipeline-এর যাচাই ধাপে', 'CDN-এ', 'Browser-এ', 'কোথাও না'], 'Publish হওয়ার আগে।'],
    ],
  },
  boss: [
    ['CDN খরচ কমানোর ৩টা উপায়?', ['জনপ্রিয়গুলোই CDN-এ, কম দেখা video কম encode, অঞ্চল ধরে বিতরণ', 'সব CDN-এ', 'Bitrate বাড়ানো', 'Server বন্ধ'], 'বইয়ের long-tail যুক্তি।'],
    ['Transcoding server crash করলে?', ['Queue থেকে কাজ আবার চেষ্টা', 'Video মুছে দেওয়া', 'User-কে আবার upload করতে বলা', 'কিছু না'], 'কাজ queue-তে থাকে, তাই হারায় না।'],
    ['Pre-signed URL কেন?', ['Client অনুমতি সহ সরাসরি storage-এ upload; API server-এ চাপ নেই', 'সুন্দর URL', 'SEO', 'Cache'], 'Upload-এর বিশাল data API server ছোঁয় না।'],
    ['Adaptive bitrate streaming কী?', ['Network অনুযায়ী resolution বদলায়', 'সবসময় 4K', 'শুধু audio', 'Resolution স্থির'], 'ধীর network-এ নিচু resolution, buffer কম।'],
    ['Title, likes-এর মতো metadata কোথায়?', ['Metadata DB আর cache; video blob আলাদা', 'Video file-এর ভিতরে', 'CDN-এ', 'Queue-তে'], 'ছোট data আর বড় binary আলাদা।'],
  ],
});

export const l15 = level({
  id: 15, chapter: 3,
  title: 'Invoice sync', concept: 'File sync (Google Drive)',
  story: 'Invoice file sync',
  briefing: 'Merchant-এর invoice file laptop-এ বদলায়, ফোনে পুরনোটা দেখায়। আবার ২০০ MB file-এ এক লাইন বদলালেও পুরোটা upload হয়।',
  ref: refs.p4,
  predict: ['বড় file-এ একটা লাইন বদলালে পুরো file আবার upload?', ['না, শুধু বদলানো block (delta sync)', 'হ্যাঁ, সবসময়', 'কিছুই না', 'Email করে']],
  nodes: [
    ['c1', 'Laptop', 'user', 8, 36], ['c2', 'ফোন', 'user', 8, 82], ['api', 'API server', 'server', 36, 36], ['bs', 'Block server', 'worker', 36, 82],
    ['meta', 'Metadata DB', 'db', 66, 36], ['s3', 'Cloud storage', 'store', 66, 82], ['nt', 'Notification', 'service', 92, 58],
  ],
  steps: [
    { text: 'File block-এ ভাগ (৪ MB), compress, encrypt করে storage-এ।', add: ['c1', 'bs', 's3'], flow: [['c1', 'bs'], ['bs', 's3']] },
    { text: '১০ block-এর file-এ ৩ নম্বর block বদলাল।', badges: { c1: 'block ৩ বদল' }, ask: ['কতগুলো block যাবে?', ['১টা', '১০টা', '৫টা', '০']] },
    { text: 'শুধু বদলানো block: delta sync, bandwidth বাঁচে।', flow: [['c1', 'bs'], ['bs', 's3']] },
    { text: 'Metadata (কোন file, কোন block, কোন version) আলাদা DB-তে, strong consistency সহ।', add: ['api', 'meta'], flow: [['c1', 'api'], ['api', 'meta']] },
    { text: 'অন্য device-কে notification service জানায় (long polling)।', add: ['c2', 'nt'], flow: [['api', 'nt'], ['nt', 'c2']] },
    { text: 'দুজন একসাথে একই file বদলাল।', ask: ['এখন কী হবে?', ['প্রথমটা জেতে, দ্বিতীয়টা conflict copy হিসেবে থাকে', 'দুটোই মুছে যায়', 'শেষটা নীরবে জেতে', 'Server crash']] },
    { text: 'প্রথম process হওয়া version জেতে; অন্যজনকে দুই version দেখিয়ে বেছে নিতে দেওয়া।', ok: ['meta'] },
  ],
  summary: ['Block-এ ভাগ, শুধু বদলানো block upload (delta sync)', 'Metadata আলাদা DB-তে, strong consistency', 'Long polling notification; conflict-এ প্রথম জেতে'],
  play: {
    kind: 'missions', intro: 'Sync-এর তিনটা সিদ্ধান্ত।',
    missions: [
      ['Notification-এ WebSocket না long polling?', ['Long polling: যোগাযোগ বেশিরভাগ এক দিকে, কম ঘন', 'WebSocket', 'Email', 'SMS'], 'বইয়ের যুক্তি: দুই দিকের real-time দরকার নেই।'],
      ['একই block দুই file-এ থাকলে?', ['Hash দিয়ে deduplication: একবারই রাখা', 'দুবার রাখা', 'মুছে ফেলা', 'Compress না'], 'Storage খরচ বাঁচে।'],
      ['Metadata DB-তে strong consistency কেন?', ['দুই device আলাদা file তালিকা দেখলে বিপদ', 'দ্রুত হয়', 'সস্তা', 'দরকার নেই'], 'File তালিকা ভুল হলে data হারানোর মতো।'],
    ],
  },
  boss: [
    ['WebSocket নাকি long polling, কেন?', ['Long polling, কারণ notification এক দিকে আর কম ঘন', 'সবসময় WebSocket', 'কোনোটা না', 'প্রতি ms-এ polling'], 'সরল সমাধান যথেষ্ট।'],
    ['Storage খরচ কমাতে?', ['Dedupe, পুরনো version-এর সীমা, কম ব্যবহৃত data cold storage-এ', 'সব version চিরকাল', 'Compress বাদ', 'বেশি replica'], 'বইয়ের তিন কৌশল।'],
    ['Block server-এর কাজ?', ['Block-এ ভাগ, compress, encrypt, upload', 'Login', 'Notification', 'Metadata রাখা'], 'Upload-এর ভারী কাজ এখানে।'],
    ['Offline client পরে online হলে?', ['জমে থাকা বদলগুলো টেনে sync', 'সব আবার download', 'কিছু না', 'Account মুছে'], 'Offline backup queue থেকে।'],
    ['Upload অর্ধেক পথে ব্যর্থ?', ['Resumable upload: বাকি block থেকে', 'শুরু থেকে', 'বাতিল', 'Email'], 'Block ভাগের আরেকটা লাভ।'],
  ],
});
