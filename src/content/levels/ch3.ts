import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৩ · ParcelGo-র app-গুলো — Vol 1, ch 8–15 */

export const l8 = level({
  id: 8, chapter: 3, simulator: 'shortener',
  title: 'ছোট link', concept: 'URL shortener',
  story: 'SMS-এ tracking link লম্বা',
  briefing: 'প্রতিটা SMS-এ tracking link ১২০ অক্ষরের, SMS দুই ভাগ হয়ে খরচ দ্বিগুণ। link ছোট করতে হবে: pgo.to/zn9edcu।',
  ref: refs.p3,
  predict: ['Short code-এর জন্য কোন অক্ষরগুলো?', ['০–৯, a–z, A–Z: ৬২টা', 'শুধু ০–৯: ১০টা', 'a–z আর ০–৯: ৩৬টা', 'সব ASCII: ১২৮টা']],
  nodes: [
    ['u', 'User', 'user', 8, 50], ['web', 'Web server', 'server', 36, 50], ['cache', 'Cache', 'cache', 64, 20],
    ['db', 'Database', 'db', 88, 50], ['id', 'ID generator', 'step', 64, 82],
  ],
  steps: [
    { text: 'লম্বা URL এল: আগে একটা unique ID নিই (snowflake ধরনের)।', add: ['u', 'web', 'id', 'db'], flow: [['u', 'web'], ['web', 'id']], badges: { id: '2009215674938' } },
    { text: 'ID-কে base 62-এ লিখি।', badges: { web: 'base 62 → ?' }, ask: ['2009215674938 base 62-এ লিখলে দৈর্ঘ্য মোটামুটি?', ['৭ অক্ষর', '২ অক্ষর', '২০ অক্ষর', '১৩ অক্ষর']] },
    { text: 'zn9edcu: ৭ অক্ষর। ৬২^৭ ≈ ৩.৫ লাখ কোটি, বহু বছর চলে।', flow: [['web', 'db']], badges: { web: 'zn9edcu' } },
    { text: 'Short link-এ click: আগে cache, না পেলে DB থেকে লম্বা URL।', add: ['cache'], flow: [['u', 'web'], ['web', 'cache']], ok: ['cache'], badges: { cache: 'hit' } },
    { text: 'Server redirect পাঠায়: 301 বা 302।', ask: ['Browser একবার 301 পেলে দ্বিতীয় click কোথায় যায়?', ['সরাসরি লম্বা URL-এ', 'আবার আমাদের server-এ', 'আগে cache, তারপর DB-তে', 'Browser error দেখায়']] },
    { text: '301 = স্থায়ী, browser মনে রাখে (চাপ কম)। 302 = সাময়িক, প্রতি click আমাদের কাছে আসে (click গোনা যায়)।', flow: [['u', 'web']], badges: { web: '301 বনাম 302' } },
  ],
  summary: ['Unique ID → base 62 → ৭ অক্ষরের code', 'Click: cache → DB → redirect', '301 চাপ কমায়; 302 analytics দেয়'],
  play: {
    kind: 'missions', intro: 'Redirect, হিসাব আর ঝুঁকি।',
    missions: [
      ['Click analytics লাগবে। 301 না 302?', ['302', '301', 'কোনোটা না', '200'], 'প্রতি click server-এ এলে তবে গোনা যায়।'],
      ['দিনে ১০ কোটি নতুন URL, ১০ বছর। মোট কত?', ['~৩৬৫ বিলিয়ন', '~৩৬৫ মিলিয়ন', '~৩.৬৫ বিলিয়ন', '~১০ কোটি'], '১০^৮ × ৩৬৫ × ১০ = ৩.৬৫ × ১০^১১।'],
      ['Base 62 conversion-এর একটা অসুবিধা?', ['পরের code অনুমান করা যায়', 'Collision প্রায়ই হয়', 'Code-এর দৈর্ঘ্য বদলায় না', 'আলাদা ID generator লাগে না'], 'ক্রমিক ID মানে ক্রমিক code; কেউ সব link ঘুরে দেখতে পারে।'],
    ],
  },
  boss: [
    ['৩৬৫ বিলিয়ন URL-এর জন্য short code কত অক্ষর?', ['৭', '৫', '১০', '৩'], '৬২^৬ ≈ ৫৬ বিলিয়ন (কম), ৬২^৭ ≈ ৩.৫ ট্রিলিয়ন (যথেষ্ট)।', '৬২^৬ কত?'],
    ['Hash (CRC32/MD5)-এর প্রথম ৭ অক্ষর নিলে সমস্যা?', ['Collision; আগে আছে কি না যাচাই লাগে', 'কোড ৭ অক্ষরের চেয়ে লম্বা হয়ে যায়', 'Hash বের করতে অনেক সময় লাগে', 'একই URL-এর দুটো আলাদা code আসে'], 'কেটে নিলে দুই URL-এর একই code হতে পারে।'],
    ['একই লম্বা URL দুবার এলে?', ['আগে আছে কি না দেখে পুরনো code ফেরত', 'সবসময় নতুন code, পুরনোটা মুছে', 'Error দিয়ে বলা: আগেই আছে', 'দুটো code-ই রেখে দুটোই ফেরত'], 'জায়গা বাঁচে, একই link একই code।'],
    ['Read অনেক বেশি (১০:১)। কী যোগ করবেন?', ['Cache (short → long)', 'আরও write server', 'Message queue', 'আরও ID generator'], 'জনপ্রিয় link memory থেকেই।'],
    ['Abuse ঠেকাতে?', ['Rate limiter, অনুমান-অযোগ্য code', 'কোডে আরও বেশি অক্ষর রাখা', '301 বন্ধ করে শুধু 302', 'Database বাদ দিয়ে memory-তে'], 'একজন যেন লাখ link বানাতে বা ঘুরে দেখতে না পারে।'],
  ],
});

export const l9 = level({
  id: 9, chapter: 3,
  title: 'দোকানের তালিকা টানা', concept: 'Web crawler',
  story: 'Merchant-এর দোকান থেকে product টানা',
  briefing: 'হাজার merchant-এর website থেকে product তালিকা নিয়মিত টানতে হবে। কিন্তু খুব জোরে টানলে তাদের site বসে যায়, আর একই page বারবার টানা অপচয়।',
  ref: refs.p3,
  predict: ['Crawler একই site-এ সেকেন্ডে শত request করলে?', ['Site চাপে পড়ে বা ব্লক করে', 'দ্রুত শেষ, কোনো সমস্যা নেই', 'URL কম পাওয়া যায়', 'DNS বন্ধ হয়ে যায়']],
  nodes: [
    ['seed', 'Seed URL', 'step', 8, 50], ['fr', 'URL frontier', 'queue', 28, 50], ['dl', 'Downloader', 'worker', 48, 50],
    ['pa', 'Parser', 'service', 68, 26], ['seen', 'Content seen?', 'store', 68, 76], ['ex', 'URL extractor', 'service', 90, 26], ['us', 'URL seen?', 'store', 90, 76],
  ],
  steps: [
    { text: 'Seed URL দিয়ে শুরু; সব যায় URL frontier (queue)-তে।', add: ['seed', 'fr', 'dl'], flow: [['seed', 'fr'], ['fr', 'dl']] },
    { text: 'Page নামানো, parse, তারপর একই content আগে দেখা কি না (hash মিলিয়ে)।', add: ['pa', 'seen'], flow: [['dl', 'pa'], ['pa', 'seen']] },
    { text: 'নতুন link বের করি।', add: ['ex', 'us'], flow: [['pa', 'ex'], ['ex', 'us']], badges: { us: 'আগে দেখা' }, ask: ['এই URL আগে visit হয়েছে। Frontier-এ ঢুকবে?', ['না, URL seen filter বাদ দেয়', 'হ্যাঁ, freshness-এর জন্য আবার', 'হ্যাঁ, কিন্তু queue-র শেষে', 'শুধু content বদলালে ঢোকে']] },
    { text: 'আগে দেখা URL বাদ (bloom filter বা hash table); বাকিগুলো frontier-এ ফেরত।', flow: [['us', 'fr']] },
    { text: 'Frontier-এর ভিতরে দুই স্তর: front queue (priority) আর back queue।', focus: ['fr'], badges: { fr: 'front + back queue' }, ask: ['একই host-এর দুই URL পরপর এলে?', ['একই queue-তে, মাঝে delay', 'দুই worker একসাথে টানে', 'দ্বিতীয়টা বাদ পড়ে', 'দুটোই সবার আগে যায়']] },
    { text: 'Host প্রতি একটা back queue, একজন worker, মাঝে delay। Priority ঠিক হয় PageRank আর update হার দিয়ে।', focus: ['fr', 'dl'], flow: [['fr', 'dl']] },
    { text: 'Robots.txt মানা, DNS cache, timeout, আর spider trap (অসীম link) এড়াতে URL দৈর্ঘ্যের সীমা।', focus: ['dl'] },
  ],
  summary: ['Frontier → download → parse → content seen → extract → URL seen → frontier', 'Politeness: host প্রতি এক queue, এক worker, delay', 'Bloom filter, DNS cache, robots.txt, spider trap সতর্কতা'],
  play: {
    kind: 'missions', intro: 'Crawler চালানোর তিনটা সিদ্ধান্ত।',
    missions: [
      ['BFS না DFS?', ['BFS: চওড়া হয়ে এগোয়', 'DFS: গভীরে গিয়ে দ্রুত শেষ', 'Random: দুটোর মাঝামাঝি', 'দুটোই সমান, পার্থক্য নেই'], 'Web graph খুব গভীর; BFS চওড়া করে এগোয়।'],
      ['Bloom filter-এর trade-off?', ['কম memory, মাঝে false positive', 'কখনো ভুল নয়, memory বেশি', 'False negative দেয় মাঝে মাঝে', 'শুধু ছোট data-য় কাজ করে'], 'কিছু নতুন URL-কে আগে দেখা ভেবে বাদ দিতে পারে।'],
      ['Spider trap কী?', ['অসীম link তৈরি করা page', 'Spam ভরা মেইলের page', 'ভুল DNS দেওয়া host', 'Robots.txt-এ নিষেধ করা page'], 'URL দৈর্ঘ্যের সীমা আর নজরদারি দিয়ে এড়ানো।'],
    ],
  },
  boss: [
    ['১০ worker একই host-এর queue থেকে টানছে। Politeness ঠিক করতে?', ['Host প্রতি এক queue, এক worker, delay', 'আরও worker দিয়ে দ্রুত শেষ করা', 'DNS cache বন্ধ করে ধীর করা', 'সব host-এর জন্য এক queue'], 'Host-কে একসাথে একটাই connection।'],
    ['কোন page আগে আবার crawl করবেন?', ['যেগুলো বেশি বদলায় বা গুরুত্বপূর্ণ', 'সবসময় যেটা সবচেয়ে পুরনো', 'Random, সবাই সমান সুযোগ পায়', 'যেগুলোর আকার সবচেয়ে বড়'], 'Freshness: update হার আর গুরুত্ব।'],
    ['DNS resolve ধীর (১০–২০০ ms)। কী করবেন?', ['DNS cache রাখা, নিয়মিত update', 'প্রতি request-এ নতুন resolve', 'IP হাতে লিখে রাখা চিরকাল', 'DNS ছাড়াই host নামে যাওয়া'], 'DNS crawler-এর bottleneck হতে পারে।'],
    ['একই content আলাদা URL-এ (প্রায় ৩০%)। ধরবেন কীভাবে?', ['Content-এর hash মিলিয়ে', 'URL-এর দৈর্ঘ্য মিলিয়ে', 'Page-এর title মিলিয়ে', 'দরকার নেই, দুবার রাখা যায়'], 'পুরো লেখা তুলনার বদলে hash।'],
    ['Crawler বড় করতে?', ['অনেক server-এ ভাগ, কাছাকাছি', 'একটা আরও বড় server', 'শুধু cache বাড়ানো', 'Thread কমিয়ে ধীরে চালানো'], 'Distributed crawl, host-এর কাছের server থেকে।'],
  ],
});

export const l10 = level({
  id: 10, chapter: 3, simulator: 'notify',
  title: 'SMS দুবার', concept: 'Notification system',
  story: 'SMS দুবার যাচ্ছে বা যাচ্ছেই না',
  briefing: 'কেউ "parcel পৌঁছেছে" SMS দুবার পাচ্ছে, কেউ একবারও না। Provider মাঝে মাঝে বন্ধ হয়, আর retry ঠিকমতো হচ্ছে না।',
  ref: refs.p3,
  predict: ['SMS provider একবার fail করল। Retry করলে ঝুঁকি?', ['একই SMS দুবার যেতে পারে', 'SMS কখনো যাবে না', 'Provider আমাদের block করবে', 'Retry-তে কোনো ঝুঁকি নেই']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['ns', 'Notification server', 'server', 30, 50], ['q', 'Queue', 'queue', 52, 50],
    ['w', 'Worker', 'worker', 72, 50], ['p', 'SMS provider', 'service', 92, 26], ['log', 'Notification log', 'db', 92, 78],
  ],
  steps: [
    { text: 'Order service → notification server → queue → worker → provider। SMS, push, email-এর আলাদা queue।', add: ['svc', 'ns', 'q', 'w', 'p'], flow: [['svc', 'ns'], ['ns', 'q'], ['q', 'w'], ['w', 'p']] },
    { text: 'Queue মাঝে থাকায় provider ধীর বা বন্ধ হলেও notification হারায় না, আর অংশগুলো আলাদা scale হয়।', focus: ['q'] },
    { text: 'Provider fail করল।', down: ['p'], ask: ['Worker কী করবে?', ['Queue-তে ফেরত রেখে পরে retry', 'সাথে সাথে মুছে ফেলবে', 'এখনই ১০ বার পরপর চেষ্টা', 'User-কে email করে জানাবে']] },
    { text: 'Fail হলে queue-তে ফেরত, পরে retry (backoff সহ)।', down: ['p'], flow: [['w', 'q']] },
    { text: 'Retry চলছে।', add: ['log'], flow: [['w', 'log']], ask: ['Retry-তে একই SMS যেন দুবার না যায়?', ['Event ID দিয়ে dedupe', 'সবসময় দুবার পাঠানো, নিশ্চিত হতে', 'Retry একেবারে বন্ধ', 'প্রতিবার অন্য provider']] },
    { text: 'প্রতিটা event ID log-এ; আগে দেখা হলে বাদ। তবু exactly-once নিশ্চিত নয়: provider-এর দিকেও duplicate হতে পারে।', ok: ['p'], flow: [['w', 'p'], ['w', 'log']] },
    { text: 'আরও: user setting (opt-out), template, rate limit (অতিরিক্ত নয়), open/click tracking।', focus: ['ns'] },
  ],
  summary: ['Service → notification server → ধরন প্রতি queue → worker → provider', 'Fail হলে queue-তে ফেরত আর backoff সহ retry', 'Event ID-তে dedupe; exactly-once নয়, at-least-once'],
  play: {
    kind: 'missions', intro: 'পাঠানোর আগে, মাঝে আর পরে।',
    missions: [
      ['iOS push notification যায় কার মাধ্যমে?', ['APNs', 'FCM', 'Twilio', 'SMTP'], 'Apple-এর APNs; Android-এ FCM।'],
      ['User এক ধরনের notification বন্ধ রেখেছে। কোথায় দেখবেন?', ['পাঠানোর আগে setting table', 'Provider-এর কাছে জিজ্ঞেস করে', 'পাঠানোর পরে log দেখে', 'দেখার দরকার নেই, সবাইকে'], 'Opt-out মানা বাধ্যতামূলক।'],
      ['একই user ঘণ্টায় ১০০ notification পাচ্ছে?', ['Rate limit বা একসাথে জড়ো', 'সব পাঠান, কোনোটা বাদ না', 'App থেকে notification বন্ধ', 'Queue বন্ধ করে দিন'], 'অতিরিক্ত হলে user সব বন্ধ করে দেয়।'],
    ],
  },
  boss: [
    ['Exactly-once কেন হয় না?', ['Ack হারাতে পারে; তাই at-least-once', 'হয়, retry বন্ধ রাখলেই', 'Provider exactly-once নিশ্চিত করে', 'Queue বড় হলেই হয়'], 'Distributed system-এ নিশ্চিত হওয়ার উপায় নেই কোনটা ঘটেছে।'],
    ['Notification server device token আর contact পায় কোথা থেকে?', ['Cache আর DB থেকে user info', 'Provider-এর কাছ থেকে প্রতিবার', 'User প্রতিবার request-এ দেয়', 'Code-এ আগে থেকে লেখা'], 'User-এর device আর contact আগে থেকে সংরক্ষিত।'],
    ['SMS provider বন্ধ। Push notification-এর কী হবে?', ['প্রভাব নেই, আলাদা queue', 'সব notification বন্ধ হয়', 'Push-ও SMS-এর queue-তে আটকায়', 'Push SMS হিসেবে যায়'], 'আলাদা queue এক ভাঙন অন্যত্র ছড়াতে দেয় না।'],
    ['Data হারানো ঠেকাতে?', ['Log DB-তে রাখা আর retry', 'শুধু memory-তে রাখা', 'Log না রাখা, জায়গা বাঁচে', 'একবার চেষ্টা, তারপর ছেড়ে দেওয়া'], 'Log থাকলে কী গেল আর কী গেল না জানা যায়।'],
    ['আরও বেশি notification সামলাতে?', ['Queue-র পেছনে worker বাড়ানো', 'আরও provider যোগ করা', 'Queue বাদ দিয়ে সরাসরি', 'Database server বাড়ানো'], 'Worker stateless, horizontal-ভাবে বাড়ে।'],
  ],
});

export const l11 = level({
  id: 11, chapter: 3, simulator: 'feed',
  title: 'Merchant feed', concept: 'News feed',
  story: 'Merchant feed ধীর',
  briefing: 'Customer-রা যেসব merchant follow করে, তাদের নতুন offer feed-এ দেখে। কিন্তু feed খুলতে ৫ সেকেন্ড, আর বড় merchant post দিলে সব আটকে যায়।',
  ref: refs.p3,
  predict: ['কেউ post দিলে follower-দের feed-এ পৌঁছানোর দুটো পথ?', ['লেখার সময় push, বা পড়ার সময় pull', 'শুধু email, বা শুধু SMS', 'Database copy, বা file copy', 'Cache মোছা, বা DB মোছা']],
  nodes: [
    ['au', 'Merchant', 'user', 8, 50], ['ps', 'Post service', 'service', 28, 50], ['fo', 'Fanout', 'worker', 50, 50],
    ['fc', 'Feed cache', 'cache', 76, 22], ['gr', 'Follower graph', 'db', 50, 86], ['rd', 'Follower', 'user', 92, 50],
  ],
  steps: [
    { text: 'Post এলে fanout service follower তালিকা আনে।', add: ['au', 'ps', 'fo', 'gr'], flow: [['au', 'ps'], ['ps', 'fo'], ['fo', 'gr']] },
    { text: 'Push (fanout on write): প্রতিটা follower-এর feed cache-এ post ID লেখা।', add: ['fc'], flow: [['fo', 'fc']] },
    { text: 'Follower feed খুললে cache থেকে সাথে সাথে।', add: ['rd'], flow: [['rd', 'fc']], ok: ['fc'] },
    { text: 'এবার ৫০ লাখ follower-এর এক বড় merchant post দিল।', badges: { au: '৫০ লাখ follower' }, ask: ['Push করলে কত write?', ['৫০ লাখ, প্রতি follower-এ একটা', 'একটা, শুধু post-এর জন্য', '১০০, প্রথম পাতার follower-দের', 'শূন্য, কেউ খুললে তখন লেখা']] },
    { text: 'একটা post-এ ৫০ লাখ write: hotkey সমস্যা, fanout ধীর।', down: ['fo'] },
    { text: 'Hybrid: সাধারণ user-এর post push, বড় merchant-এর post পড়ার সময় pull।', ok: ['fo'], flow: [['rd', 'ps']], badges: { au: 'pull' } },
    { text: 'Feed cache-এ কী রাখব?', focus: ['fc'], ask: ['Feed cache-এ পুরো post না শুধু ID?', ['শুধু post ID', 'পুরো post আর সব ছবি', 'শুধু merchant-এর নাম', 'Post-এর HTML page']] },
    { text: 'Feed cache-এ শুধু ID রাখা; post আর user data আলাদা cache-এ, যাতে memory কম লাগে আর একই post বারবার জমা না হয়।', focus: ['fc'], ok: ['fc'] },
  ],
  summary: ['Push: লেখার সময় সবার feed-এ; pull: পড়ার সময় জোগাড়', 'Celebrity-র জন্য push ব্যয়বহুল, তাই hybrid', 'Feed cache-এ শুধু post ID; বাকি data আলাদা cache-এ'],
  play: {
    kind: 'missions', intro: 'Push, pull আর cache।',
    missions: [
      ['বেশিরভাগ follower কম active। Push-এর অপচয় কোথায়?', ['নিষ্ক্রিয়দের feed বানানো বৃথা', 'কোনো অপচয় নেই, সব কাজে লাগে', 'অপচয় pull-এ বেশি, push-এ নয়', 'Read ধীর হয়ে যায় সবার'], 'যে feed কেউ খুলবে না, তার জন্য write।'],
      ['Pull-এর সমস্যা?', ['Feed খুলতে ধীর', 'Write অনেক বেশি', 'Celebrity-তে আটকে যায়', 'Cache রাখাই যায় না'], 'প্রতিবার অনেক জায়গা থেকে জোগাড়।'],
      ['Feed cache-এ কী রাখবেন?', ['<post_id, user_id> জোড়া', 'পুরো post আর তার ছবি', 'শুধু merchant-এর নাম', 'Post-এর পুরো HTML page'], 'ছোট রাখলে অনেক বেশি feed ধরে।'],
    ],
  },
  boss: [
    ['Hybrid-এ কোন user-এর জন্য pull?', ['Follower খুব বেশি হলে (সীমার উপরে)', 'সবার জন্য push, কোনো ব্যতিক্রম না', 'সবার জন্য pull, সহজ বলে', 'Random, প্রতি post-এ আলাদা'], 'সীমা ঠিক করা design-এর সিদ্ধান্ত।'],
    ['Fanout-এর কাজ ধীর। কী বসাবেন?', ['Message queue আর fanout worker', 'আরও কয়েকটা feed cache server', 'Database-এ follower-এর index', 'পুরো feed CDN-এ রেখে দেওয়া'], 'Post-এর response দ্রুত, fanout পরে আলাদাভাবে।'],
    ['Graph DB কিসের জন্য?', ['Follower সম্পর্ক রাখা আর খোঁজা', 'Post-এর ছবি আর video রাখা', 'Login session আর token রাখা', 'Feed খোলার log জমিয়ে রাখা'], 'কে কাকে follow করে, দ্রুত।'],
    ['Feed-এ কতগুলো post cache-এ?', ['সাম্প্রতিক কয়েকশো, পুরনো DB থেকে', 'সব post চিরকাল cache-এ রাখা', 'শুধু সর্বশেষ একটা post রাখা', 'কোনোটা না, প্রতিবার DB থেকে'], 'মানুষ পুরনো feed খুব কম স্ক্রল করে।'],
    ['Post publish-এ authentication আর rate limit কেন?', ['Spam আর নিরাপত্তা', 'Post দ্রুত publish করতে', 'Feed cache ভরতে', 'লাগে না, সবাই বিশ্বস্ত'], 'Feed-এ spam সবার অভিজ্ঞতা নষ্ট করে।'],
  ],
});

export const l12 = level({
  id: 12, chapter: 3, simulator: 'chat',
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
    { text: 'Merchant এখন offline।', down: ['b'], ask: ['Message কোথায় যায়?', ['Store-এ থাকে, পরে sync', 'হারিয়ে যায়', 'Rider-এর কাছে ফেরত যায়', 'শুধু server memory-তে থাকে']] },
    { text: 'Store-এ জমা; offline user-কে push notification। ফিরলে শেষ পড়া ID থেকে sync।', down: ['b'], flow: [['c1', 'kv']] },
    { text: 'Presence: client নির্দিষ্ট সময় পরপর heartbeat পাঠায়; সময়মতো না এলে offline।', add: ['pr'], flow: [['a', 'pr']], badges: { pr: 'heartbeat' }, ask: ['Rider lift-এ ৩ সেকেন্ড network হারাল। Presence কী দেখাবে?', ['Online, সময়সীমা পার না হলে', 'সাথে সাথে offline দেখাবে', 'Rider app থেকে logout হবে', 'Status-এ error দেখাবে']] },
    { text: 'অল্প সময়ের কাঁপুনিতে online/offline দোলানো এড়াতে heartbeat-এর সময়সীমা ধরে রাখা।', ok: ['pr'] },
  ],
  summary: ['WebSocket: দুই দিকে persistent connection', 'Message → sync queue → অন্য chat server; সব key-value store-এ', 'Presence heartbeat দিয়ে, সময়সীমা ধরে'],
  play: {
    kind: 'missions', intro: 'Protocol, store আর ID।',
    missions: [
      ['Chat history-র জন্য কোন store?', ['Key-value store (Cassandra)', 'একটা MySQL table', 'শুধু chat server-এর memory', 'Client-এর phone storage'], 'বইয়ের পছন্দ: horizontal scale আর কম latency।'],
      ['Long polling-এর সমস্যা?', ['আলাদা server, disconnect বোঝা কঠিন', 'খুব দ্রুত, তাই অনেক অপচয়', 'Server কোনো state রাখতে পারে না', 'Message-এর ক্রম সবসময় উল্টায়'], 'আর message না থাকলেও connection timeout পর্যন্ত ঝুলে থাকে।'],
      ['Message ID-র শর্ত?', ['Unique আর সময়ের ক্রমে', 'শুধু random, অনুমান অযোগ্য', 'শুধু unique, ক্রম লাগে না', 'শুধু ক্রমে, duplicate চলে'], 'Level ৭-এর snowflake বা local sequence।'],
    ],
  },
  boss: [
    ['ছোট group chat-এ message কীভাবে ছড়ায়?', ['প্রতিটা member-এর queue-তে copy', 'সবার জন্য একটা shared queue', 'শুধু group admin-এর queue-তে', 'সবাইকে email-এ একটা copy'], 'ছোট দলে copy সহজ; বড় দলে খরচ বেশি।'],
    ['কোন chat server-এ connect করবে কে ঠিক করে?', ['Service discovery (Zookeeper)', 'Random, প্রতিবার নতুন server', 'User নিজে server বেছে নেয়', 'শুধু DNS round robin দিয়ে'], 'Login-এর পর সেরা server-এর ঠিকানা দেওয়া হয়।'],
    ['Chat server আর API server-এর পার্থক্য?', ['Chat server stateful; বাকিরা stateless', 'সব server stateless', 'সব server stateful', 'API server stateful, chat stateless'], 'Stateful অংশ ছোট রাখা ভালো।'],
    ['ফোন আর laptop দুটোতেই message?', ['প্রতি device-এর শেষ পড়া ID রেখে sync', 'শুধু শেষ ব্যবহার করা device-এ', 'সব device-এ email copy', 'একবারে একটাই device চলে'], 'cur_max_message_id-এর পরের সব আনে।'],
    ['Presence কাঁপা ঠেকানোর মূল কৌশল?', ['Heartbeat আর সময়সীমা', 'প্রতি সেকেন্ডে status বদল', 'Presence দেখানো বাদ', 'Disconnect হলেই offline'], 'অস্থায়ী ভাঙনকে উপেক্ষা।'],
  ],
});

export const l13 = level({
  id: 13, chapter: 3,
  title: 'ঠিকানা খোঁজা', concept: 'Search autocomplete',
  story: 'ঠিকানা খোঁজা ধীর',
  briefing: 'Customer ঠিকানা লিখতে শুরু করলেই নিচে suggestion আসার কথা। এখন প্রতি অক্ষরে পুরো database খোঁজা হয়, suggestion আসে টাইপ শেষ হওয়ার পরে।',
  ref: refs.p4,
  predict: ['প্রতি keypress-এ পুরো database-এ LIKE query?', ['ধীর; আগে থেকে গোছানো structure লাগে', 'দ্রুত, index থাকলে সমস্যা নেই', 'ঠিক আছে, শুধু cache লাগবে', 'ধীর, তবে server বাড়ালেই চলে']],
  nodes: [
    ['root', 'root', 'step', 50, 10], ['t', 't', 'step', 32, 36], ['w', 'w', 'step', 76, 36],
    ['tr', 'tr', 'step', 20, 62], ['to', 'to', 'step', 44, 62], ['tre', 'tree', 'key', 20, 88], ['toy', 'toy', 'key', 44, 88],
  ],
  steps: [
    { text: 'Trie: প্রতিটা node একটা prefix।', add: ['root', 't', 'w'] },
    { text: '"tree" খুঁজতে root থেকে অক্ষর ধরে নামা।', add: ['tr', 'to', 'tre', 'toy'], flow: [['root', 't'], ['t', 'tr'], ['tr', 'tre']] },
    { text: 'প্রতিটা node-এ top-k জনপ্রিয় শব্দ cache: প্রতি keypress-এ প্রায় সাথে সাথে উত্তর।', badges: { t: 'top: tree, toy, try' } },
    { text: '"toy" আরও জনপ্রিয় হয়ে উঠল।', badges: { toy: '+১ search' }, ask: ['কোন node-এর cache বদলাতে পারে?', ['root থেকে toy পথের সব node', 'শুধু toy node-এর নিজের cache', 'শুধু root node-এর cache', 'কোনোটাই না, সপ্তাহ শেষ পর্যন্ত']] },
    { text: 'পথের সব node-এর top-k বদলাতে পারে, তাই trie live update নয়, সপ্তাহে একবার নতুন করে গড়া।', focus: ['root', 't', 'to', 'toy'], flow: [['toy', 'to'], ['to', 't'], ['t', 'root']] },
    { text: 'অনেক user "a" দিয়ে শুরু করে।', focus: ['root'], ask: ['Trie ভাগ (shard) করবেন কীভাবে?', ['আগের data দেখে সমান চাপে', 'অক্ষর প্রতি সমান ভাগ', 'Random ভাগ', 'একটা server-এই সব']] },
    { text: 'Shard map manager আগের distribution দেখে ভাগ রাখে। Data: search log → aggregator → trie DB → trie cache।', focus: ['root'] },
  ],
  summary: ['Trie-তে prefix ধরে নামা, node-এ top-k cache', 'Update ব্যয়বহুল, তাই batch-এ নতুন trie', 'Browser cache আর debounce দিয়ে request কমানো; shard আগের data দেখে'],
  play: {
    kind: 'missions', intro: 'Trie-র তিনটা trade-off।',
    missions: [
      ['Top-k cache-এর trade-off?', ['দ্রুত query, বেশি জায়গা', 'কম জায়গা, ধীর query', 'কোনো trade-off নেই', 'দ্রুত update, ধীর query'], 'প্রতি node-এ তালিকা রাখতে memory।'],
      ['Prefix দৈর্ঘ্যের সীমা (যেমন ৫০) কেন?', ['খোঁজা ছোট, স্থির সময়ে', 'দেখতে সুন্দর লাগে', 'Memory বাড়ানোর জন্য', 'দরকার নেই, শুধু নিয়ম'], 'মানুষ খুব লম্বা prefix লেখে না।'],
      ['Typing-এর সময় request কমাতে?', ['Browser cache আর debounce', 'প্রতি অক্ষরে নতুন DB query', 'Server বাড়ানো', 'Index বাদ'], 'একই prefix আবার চাইলে browser থেকেই।'],
    ],
  },
  boss: [
    ['প্রতি search-এ trie update করলে?', ['ব্যয়বহুল, তাই batch-এ', 'দ্রুত, কোনো সমস্যা নেই', 'ঠিক আছে, শুধু leaf বদলায়', 'অসম্ভব, trie বদলায় না'], 'Update-এর খরচ গুনুন: প্রতি search-এ পথ ধরে সব cache।'],
    ['ক্ষতিকর শব্দ suggestion-এ না আনতে?', ['Trie cache-এর সামনে filter', 'User-কে report করতে বলা', 'Search log মুছে ফেলা', 'প্রতি সপ্তাহে trie মুছে ফেলা'], 'Trie নতুন করে না গড়েই বাদ দেওয়া যায়।'],
    ['Real-time trending (এই ঘণ্টার খবর)?', ['সাম্প্রতিক data-য় বেশি ওজন', 'সপ্তাহে একবারই যথেষ্ট', 'কখনো দেখানো উচিত নয়', 'Browser cache মুছে'], 'বইয়ের মূল design সাপ্তাহিক; trending-এর জন্য আলাদা ব্যবস্থা।'],
    ['Search log থেকে trie কে বানায়?', ['Aggregator, তারপর worker', 'দর্শকের browser নিজে', 'CDN-এর edge server', 'Load balancer নিজে'], 'Log → aggregated data → trie DB।'],
    ['Trie DB-র জন্য কোনটা?', ['Document বা key-value store', 'একটা Excel file', 'CDN-এর cache', 'Message queue-র topic'], 'বই দুই বিকল্পই দেখায়।'],
  ],
});

export const l14 = level({
  id: 14, chapter: 3,
  title: 'Training video', concept: 'Video streaming (YouTube)',
  story: 'Rider training video upload',
  briefing: 'নতুন rider-দের জন্য training video। Upload হয়, কিন্তু কারো ফোনে চলে না, কারো data শেষ হয়ে যায়, আর CDN-এর bill আকাশছোঁয়া।',
  ref: refs.p4,
  predict: ['Video upload হলেই কি সবার ফোনে চালানো যায়?', ['না, আগে transcoding লাগে', 'হ্যাঁ, সব ফোন সব format চালায়', 'শুধু ছোট file হলে চলে', 'শুধু Wi-Fi-তে চলে']],
  nodes: [
    ['up', 'Uploader', 'user', 8, 50], ['raw', 'Raw storage', 'store', 28, 50], ['dag', 'Transcoding DAG', 'worker', 50, 50],
    ['enc', 'Encoded storage', 'store', 72, 50], ['cdn', 'CDN', 'cdn', 92, 26], ['v', 'Viewer', 'user', 92, 80],
  ],
  steps: [
    { text: 'Video সরাসরি blob storage-এ (pre-signed URL দিয়ে)।', add: ['up', 'raw'], flow: [['up', 'raw']] },
    { text: 'Video GOP টুকরোয় ভাগ; DAG-এ কাজ: video encode, audio, thumbnail, watermark।', add: ['dag'], flow: [['raw', 'dag']], badges: { dag: 'টুকরো' }, ask: ['কোন কাজগুলো একসাথে চলতে পারে?', ['Video, audio আর thumbnail', 'কোনোটা না, সব পরপর', 'শুধু watermark আর audio', 'শুধু thumbnail আগে']] },
    { text: 'নির্ভরতা না থাকলে DAG-এর কাজগুলো সমান্তরালে। বিভিন্ন resolution (৩৬০p–১০৮০p) আর format-এ encoded storage-এ।', add: ['enc'], flow: [['dag', 'enc']] },
    { text: 'জনপ্রিয় video CDN থেকে stream; user-এর network অনুযায়ী resolution বদলায় (adaptive bitrate)।', add: ['cdn', 'v'], flow: [['enc', 'cdn'], ['cdn', 'v']] },
    { text: 'মাসের শেষে CDN-এর bill এল।', badges: { cdn: 'খরচ বেশি' }, ask: ['CDN খরচ কমাতে?', ['শুধু জনপ্রিয় video CDN-এ', 'সব video CDN-এ রাখা', 'CDN একেবারে বাদ দেওয়া', 'সব video-র resolution বাড়ানো']] },
    { text: 'জনপ্রিয়গুলো CDN-এ, কম দেখা video নিজের server থেকে আর কম format-এ; কিছু অঞ্চলে ISP-র সাথে।', flow: [['enc', 'v']], ok: ['cdn'] },
  ],
  summary: ['Upload → raw storage → DAG transcoding → encoded storage → CDN', 'DAG-এ স্বাধীন কাজ সমান্তরালে; adaptive bitrate', 'CDN খরচ: জনপ্রিয়গুলোই CDN-এ'],
  play: {
    kind: 'missions', intro: 'Upload আর pipeline।',
    missions: [
      ['Upload দ্রুত আর ভরসাযোগ্য করতে?', ['ছোট টুকরোয় ভাগ করে upload', 'একবারে পুরো file', 'আগে email-এ পাঠানো', 'Compress না করে পাঠানো'], 'Network ভাঙলে শুধু সেই টুকরো।'],
      ['Transcoding শেষে client জানবে কীভাবে?', ['Completion handler থেকে callback', 'Client প্রতি সেকেন্ডে জিজ্ঞেস', 'Admin হাতে জানাবে', 'Client জানবে না'], 'Pipeline শেষ হলে event।'],
      ['Copyright বা ক্ষতিকর video ঠেকাতে কোথায়?', ['Pipeline-এর যাচাই ধাপে', 'CDN-এর edge-এ', 'দর্শকের browser-এ', 'কোথাও না, report-এ'], 'Publish হওয়ার আগে।'],
    ],
  },
  boss: [
    ['CDN খরচ কমানোর ৩টা উপায়?', ['জনপ্রিয়গুলোই CDN-এ, বাকিরা কম format-এ', 'সব video CDN-এ, সব format-এ রাখা', 'Bitrate বাড়িয়ে request সংখ্যা কমানো', 'রাতে কম দর্শক, তখন CDN বন্ধ রাখা'], 'বইয়ের long-tail যুক্তি।'],
    ['Transcoding server crash করলে?', ['Queue থেকে কাজ আবার চেষ্টা', 'Video মুছে দেওয়া', 'User-কে আবার upload করতে বলা', 'কিছু না'], 'কাজ queue-তে থাকে, তাই হারায় না।'],
    ['Pre-signed URL কেন?', ['Client সরাসরি storage-এ upload করে', 'URL দেখতে ছোট আর সুন্দর হয়', 'Search engine video খুঁজে পায়', 'Video আপনা থেকে cache হয়'], 'Upload-এর বিশাল data API server ছোঁয় না।'],
    ['Adaptive bitrate streaming কী?', ['Network অনুযায়ী resolution বদলায়', 'সবসময় সর্বোচ্চ 4K-তে চলে', 'শুধু audio আগে, video পরে আসে', 'Resolution শুরুতে একবার ঠিক হয়'], 'ধীর network-এ নিচু resolution, buffer কম।'],
    ['Title, likes-এর মতো metadata কোথায়?', ['Metadata DB আর cache', 'Video file-এর ভিতরে', 'CDN-এর edge-এ', 'Upload queue-তে'], 'ছোট data আর বড় binary আলাদা।'],
  ],
});

export const l15 = level({
  id: 15, chapter: 3,
  title: 'Invoice sync', concept: 'File sync (Google Drive)',
  story: 'Invoice file sync',
  briefing: 'Merchant-এর invoice file laptop-এ বদলায়, ফোনে পুরনোটা দেখায়। আবার ২০০ MB file-এ এক লাইন বদলালেও পুরোটা upload হয়।',
  ref: refs.p4,
  predict: ['বড় file-এ একটা লাইন বদলালে পুরো file আবার upload?', ['না, শুধু বদলানো block', 'হ্যাঁ, পুরো file সবসময়', 'না, কিছুই upload হয় না', 'শুধু রাতে পুরো file']],
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
    { text: 'দুজন একসাথে একই file বদলাল।', ask: ['এখন কী হবে?', ['প্রথমটা জেতে, অন্যটা conflict copy', 'দুটোই মুছে আগের version ফেরে', 'শেষটা নীরবে আগেরটা মুছে দেয়', 'দুটো মিলিয়ে একটা file বানায়']] },
    { text: 'প্রথম process হওয়া version জেতে; অন্যজনকে দুই version দেখিয়ে বেছে নিতে দেওয়া।', ok: ['meta'] },
  ],
  summary: ['Block-এ ভাগ, শুধু বদলানো block upload (delta sync)', 'Metadata আলাদা DB-তে, strong consistency', 'Long polling notification; conflict-এ প্রথম জেতে'],
  play: {
    kind: 'missions', intro: 'Sync-এর তিনটা সিদ্ধান্ত।',
    missions: [
      ['Notification-এ WebSocket না long polling?', ['Long polling', 'WebSocket', 'Short polling', 'Server-sent email'], 'বইয়ের যুক্তি: দুই দিকের real-time দরকার নেই।'],
      ['একই block দুই file-এ থাকলে?', ['Hash দিয়ে একবারই রাখা', 'দুবার রাখা, নিরাপদে', 'একটা মুছে ফেলা', 'Compress না করা'], 'Storage খরচ বাঁচে।'],
      ['Metadata DB-তে strong consistency কেন?', ['Device-গুলো আলাদা তালিকা দেখবে না', 'Strong হলে দ্রুত হয়', 'Strong হলে সস্তা হয়', 'দরকার নেই, eventual যথেষ্ট'], 'File তালিকা ভুল হলে data হারানোর মতো।'],
    ],
  },
  boss: [
    ['WebSocket নাকি long polling, কেন?', ['Long polling: এক দিকে, কম ঘন', 'WebSocket: সবসময় দ্রুত', 'প্রতি ms-এ polling', 'Email notification'], 'সরল সমাধান যথেষ্ট।'],
    ['Storage খরচ কমাতে?', ['Dedupe, version সীমা, cold storage', 'সব version চিরকাল রেখে দেওয়া', 'Compress বন্ধ করে CPU বাঁচানো', 'আরও replica রেখে নিরাপদ করা'], 'বইয়ের তিন কৌশল।'],
    ['Block server-এর কাজ?', ['Block-এ ভাগ, compress, encrypt', 'User-এর login আর session সামলানো', 'অন্য device-এ notification পাঠানো', 'File-এর নাম আর version রাখা'], 'Upload-এর ভারী কাজ এখানে।'],
    ['Offline client পরে online হলে?', ['জমে থাকা বদল টেনে sync', 'সব file আবার download', 'কিছু না, নতুন বদল থেকে', 'Account reset করে'], 'Offline backup queue থেকে।'],
    ['Upload অর্ধেক পথে ব্যর্থ?', ['বাকি block থেকে আবার', 'শুরু থেকে পুরোটা', 'Upload বাতিল', 'পুরো file email-এ'], 'Block ভাগের আরেকটা লাভ।'],
  ],
});
