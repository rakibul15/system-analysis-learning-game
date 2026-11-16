import { tr } from '@/shared/lib/i18n';

/** One thing a good answer to a step covers. `keys` are words that suggest the answer mentions it. */
export interface CheckItem { text: string; keys: string[] }
export interface GuidedStep { id: StepId; ask: string; hint: string; items: CheckItem[]; model: string }
export interface GuidedProblem { id: string; title: string; level: number; brief: string; steps: GuidedStep[] }
export type StepId = 'req' | 'est' | 'api' | 'hld' | 'deep';

export const STEP_TITLES: Record<StepId, string> = {
  req: tr('প্রয়োজন', 'Requirements'),
  est: tr('হিসাব', 'Estimation'),
  api: tr('API আর data', 'API and data'),
  hld: 'High-level design',
  deep: 'Deep dive',
};
export const STEP_MINUTES: Record<StepId, number> = { req: 5, est: 5, api: 7, hld: 10, deep: 10 };

const i = (text: string, ...keys: string[]): CheckItem => ({ text, keys });

export const guidedProblems: GuidedProblem[] = [
  {
    id: 'shortener', title: 'Tracking link shortener', level: 8,
    brief: tr('ParcelGo প্রতিদিন ১ কোটি SMS পাঠায়, প্রতিটায় একটা লম্বা tracking link। Link ছোট করার service বানান, marketing team click গুনতে চায়।', 'ParcelGo sends 10 million SMS a day, each with a long tracking link. Build a service that shortens links; the marketing team wants clicks counted.'),
    steps: [
      { id: 'req', ask: tr('কী কী করতে হবে আর কী বাদ? Non-functional দিকগুলো কী?', 'What must it do, and what is out of scope? What are the non-functional needs?'), hint: tr('লম্বা → ছোট, ছোট → redirect, click গোনা, link কতদিন বাঁচবে।', 'Long → short, short → redirect, counting clicks, how long links live.'),
        items: [
          i(tr('লম্বা URL দিলে ছোট code ফেরত', 'A long URL in, a short code out'), 'shorten', 'short', 'ছোট', 'code'),
          i(tr('ছোট link-এ click করলে আসল URL-এ redirect', 'Clicking the short link redirects to the original'), 'redirect', 'রিডাইরেক্ট'),
          i(tr('Click গোনা (analytics)', 'Counting clicks (analytics)'), 'click', 'analytics', 'count', 'গোনা'),
          i(tr('Redirect খুব দ্রুত আর প্রায় সবসময় চালু (high availability, low latency)', 'Redirects are fast and almost always up (high availability, low latency)'), 'latency', 'availab', 'fast', 'দ্রুত'),
        ],
        model: tr('করতে হবে: লম্বা URL থেকে ৭ অক্ষরের code, code থেকে redirect, প্রতি click গোনা। বাদ: custom alias, link edit। Non-functional: redirect ১০০ ms-এর নিচে, ৯৯.৯৯% চালু, code অনুমান করা কঠিন হলে ভালো। Read অনেক বেশি, write কম।', 'In scope: long URL to a 7-character code, code to redirect, counting every click. Out: custom aliases, editing links. Non-functional: redirects under 100 ms, 99.99% up, codes hard to guess is a plus. Reads far outnumber writes.') },
      { id: 'est', ask: tr('দিনে কত write, কত read? Peak? ৫ বছরে কত storage? কত code লাগবে?', 'How many writes and reads a day? Peak? Storage over 5 years? How many codes?'), hint: tr('১ কোটি নতুন link/দিন; প্রতি link-এ গড়ে ৩টা click ধরুন।', '10 million new links a day; assume 3 clicks per link on average.'),
        items: [
          i(tr('Write QPS ≈ ১ কোটি / ৮৬,৪০০ ≈ ১২০', 'Write QPS ≈ 10M / 86,400 ≈ 120'), 'qps', '86400', '86,400', '120', '116'),
          i(tr('Read QPS কয়েকগুণ বেশি, peak আরও ২-৩ গুণ', 'Read QPS several times higher, peak 2–3× more'), 'peak', 'read', '360', 'পিক'),
          i(tr('Storage: ৫ বছরে ~১৮০০ কোটি link × ~৫০০ byte ≈ ৯ TB', 'Storage: ~18 billion links in 5 years × ~500 bytes ≈ 9 TB'), 'tb', 'storage', 'byte', 'স্টোরেজ'),
          i(tr('Base62-এ ৭ অক্ষরে ৬২⁷ ≈ ৩.৫ লাখ কোটি code: যথেষ্ট', '7 characters of base 62 give 62⁷ ≈ 3.5 trillion codes: enough'), 'base62', 'base 62', '62', '3.5'),
        ],
        model: tr('Write ≈ ১২০/সেকেন্ড, read ≈ ৩৫০/সেকেন্ড, peak ≈ ১,০০০। ৫ বছরে ~১৮০০ কোটি link, প্রতিটা ~৫০০ byte ধরলে ~৯ TB। ৭ অক্ষরের base62 code ≈ ৩.৫ লাখ কোটি, তাই ফুরাবে না।', 'Writes ≈ 120/s, reads ≈ 350/s, peak ≈ 1,000. About 18 billion links in 5 years at ~500 bytes is ~9 TB. A 7-character base62 code space is ~3.5 trillion, so it will not run out.') },
      { id: 'api', ask: tr('মূল API আর table কী হবে?', 'What are the main APIs and the table?'), hint: tr('দুটো endpoint যথেষ্ট; table-এ key কী?', 'Two endpoints are enough; what is the table key?'),
        items: [
          i('POST /links {longUrl} → {code}', 'post', '/links', 'longurl'),
          i(tr('GET /{code} → 302 redirect', 'GET /{code} → 302 redirect'), 'get', '302', '301'),
          i(tr('Table: code (primary key), longUrl, createdAt, expiresAt', 'Table: code (primary key), longUrl, createdAt, expiresAt'), 'primary key', 'table', 'code', 'schema'),
          i(tr('Click আলাদা জায়গায় (event/queue), মূল table-এ নয়', 'Clicks go elsewhere (events/queue), not into the main table'), 'event', 'queue', 'kafka', 'click'),
        ],
        model: tr('POST /links {longUrl} → {code}; GET /{code} → 302 + Location। Table: code (PK), longUrl, createdAt, expiresAt। Key-value ধরনের read, তাই সহজ KV বা যেকোনো DB চলে। Click event queue-তে যায়, পরে গোনা হয়।', 'POST /links {longUrl} → {code}; GET /{code} → 302 + Location. Table: code (PK), longUrl, createdAt, expiresAt. Reads are key–value lookups, so a simple KV store or any DB works. Click events go to a queue and are counted later.') },
      { id: 'hld', ask: tr('Request কোন পথে যায়? Component-গুলো কী?', 'Which path does a request take? What are the components?'), hint: tr('Redirect-এর পথটা সবচেয়ে গরম। কোথায় cache?', 'The redirect path is the hottest. Where is the cache?'),
        items: [
          i(tr('Load balancer-এর পেছনে একাধিক stateless server', 'Several stateless servers behind a load balancer'), 'load balancer', 'lb', 'stateless'),
          i(tr('Redirect-এ আগে cache (code → URL), না পেলে DB', 'Redirects check a cache (code → URL) first, then the DB'), 'cache', 'redis', 'ক্যাশ'),
          i(tr('ID generator থেকে অনন্য ID, তারপর base62', 'Unique IDs from an ID generator, then base62'), 'id', 'snowflake', 'counter', 'base62'),
          i(tr('Click event queue হয়ে analytics-এ, redirect-কে আটকায় না', 'Click events flow through a queue to analytics without slowing redirects'), 'queue', 'async', 'kafka', 'analytics'),
        ],
        model: tr('User → LB → URL server (অনেকগুলো, stateless)। লেখা: ID generator থেকে ID → base62 → DB-তে রাখা। পড়া: cache-এ code খোঁজা, miss হলে DB, তারপর cache-এ বসানো। প্রতিটা redirect একটা click event queue-তে ছাড়ে; worker গুনে analytics DB-তে রাখে।', 'User → LB → URL servers (many, stateless). Write: ID from the generator → base62 → store in the DB. Read: look the code up in the cache, on a miss go to the DB, then fill the cache. Each redirect drops a click event on a queue; workers count it into an analytics store.') },
      { id: 'deep', ask: tr('দুটো গভীর প্রশ্ন: 301 না 302? দুই server যেন একই code না দেয় কীভাবে?', 'Two deep questions: 301 or 302? How do two servers never issue the same code?'), hint: tr('Browser 301 মনে রাখে।', 'Browsers remember a 301.'),
        items: [
          i(tr('302, কারণ 301 browser cache করে আর click আর server-এ আসে না', '302, because browsers cache a 301 and later clicks never reach the server'), '302', 'cache', 'browser'),
          i(tr('অনন্য ID: snowflake বা range-ভাগ করা counter, hash collision নয়', 'Unique IDs: snowflake or range-allocated counters rather than hash collisions'), 'snowflake', 'range', 'counter', 'collision', 'zookeeper'),
          i(tr('একই লম্বা URL আবার এলে: আগের code ফেরত (longUrl-এ index) বা নতুন, trade-off বলা', 'Same long URL again: return the old code (index on longUrl) or a new one, and say the trade-off'), 'duplicate', 'index', 'same', 'একই'),
          i(tr('পুরনো link মেয়াদ শেষে মোছা / TTL', 'Expired links cleaned up / TTL'), 'ttl', 'expire', 'মেয়াদ'),
        ],
        model: tr('302 নিন: 301 browser মনে রাখে, তাই click গোনা যায় না, যদিও 301-এ server-এর চাপ কম। ID: প্রতি server-কে counter-এর একটা range দিন (যেমন ১০ লাখ করে), অথবা snowflake; তাহলে collision-ই হয় না। একই URL-এর জন্য index রেখে পুরনো code ফেরত দিলে জায়গা বাঁচে, কিন্তু আলাদা campaign-এর click আলাদা হয় না।', 'Choose 302: browsers remember a 301 so clicks cannot be counted, even though 301 means less server load. IDs: give each server a range of the counter (say a million at a time), or use snowflake; then collisions never happen. Returning the old code via an index on longUrl saves space, but separate campaigns can no longer be counted separately.') },
    ],
  },
  {
    id: 'ratelimit', title: 'API rate limiter', level: 4,
    brief: tr('Merchant-রা ParcelGo-র API দিয়ে order দেয়। প্রতি merchant মিনিটে ১,০০০ request, ২০টা API server জুড়ে একটাই সীমা। কিছু merchant-এর bot পাগলের মতো চালায়।', 'Merchants place orders through ParcelGo\'s API. 1,000 requests per merchant per minute, one limit across 20 API servers. Some merchants\' bots go wild.'),
    steps: [
      { id: 'req', ask: tr('কাকে, কতটা, কোথায় আটকাবেন? সীমা পেরোলে কী উত্তর?', 'Whom do you limit, by how much, and where? What does an over-limit caller get back?'), hint: tr('Key কী: merchant, IP, না API key?', 'What is the key: merchant, IP or API key?'),
        items: [
          i(tr('Key: merchant id / API key', 'Key: merchant id / API key'), 'merchant', 'api key', 'key'),
          i(tr('সীমা পেরোলে HTTP 429 + Retry-After', 'Over the limit: HTTP 429 + Retry-After'), '429', 'retry-after', 'retry'),
          i(tr('সব server জুড়ে একটাই হিসাব (distributed)', 'One count across all servers (distributed)'), 'distributed', 'shared', 'সব server', 'global'),
          i(tr('Limiter নিজে খুব কম latency যোগ করবে', 'The limiter itself adds very little latency'), 'latency', 'fast', 'ms'),
        ],
        model: tr('প্রতি merchant (API key ধরে) মিনিটে ১,০০০। সীমা পেরোলে 429 আর Retry-After header, যাতে client বুঝে থামে। হিসাব সব API server জুড়ে এক। প্রতি request-এ বাড়তি কয়েক ms-এর বেশি নয়। Limiter বন্ধ হলে কী হবে সেটাও ঠিক করতে হবে।', 'Per merchant (by API key), 1,000 a minute. Over the limit: 429 with a Retry-After header so clients back off. The count is shared across all API servers. No more than a few ms added per request. Decide too what happens when the limiter is down.') },
      { id: 'est', ask: tr('কত merchant, কত counter, কত memory?', 'How many merchants, counters and how much memory?'), hint: tr('ধরুন ২ লাখ merchant সক্রিয়।', 'Assume 200,000 active merchants.'),
        items: [
          i(tr('Counter-এর সংখ্যা ≈ সক্রিয় merchant (২ লাখ)', 'Counters ≈ active merchants (200,000)'), '200', 'লাখ', 'counter'),
          i(tr('প্রতি counter কয়েক দশ byte → মোট কয়েক MB, এক Redis-এ ধরে', 'Tens of bytes per counter → a few MB total, fits in one Redis'), 'mb', 'memory', 'byte', 'redis'),
          i(tr('Redis-এ প্রতি request-এ ১টা অপারেশন; peak QPS অনুযায়ী shard লাগতে পারে', 'One Redis operation per request; sharding may be needed at peak QPS'), 'qps', 'shard', 'peak'),
        ],
        model: tr('২ লাখ counter × ~৫০ byte ≈ ১০ MB, এক Redis-এ সহজে ধরে। আসল চাপ ops/সেকেন্ড: প্রতিটা API request-এ একটা INCR। Peak ধরুন ২০,০০০ QPS, এক Redis সামলায়, বেশি হলে merchant id ধরে shard।', '200,000 counters × ~50 bytes ≈ 10 MB, easily one Redis. The real load is ops per second: one INCR per API request. Say a 20,000 QPS peak, which one Redis handles; beyond that, shard by merchant id.') },
      { id: 'api', ask: tr('কোন algorithm, কোন data structure?', 'Which algorithm, which data structure?'), hint: tr('Fixed window-এর কিনারার সমস্যা মনে আছে?', 'Remember the fixed-window edge problem?'),
        items: [
          i(tr('Algorithm বাছাই কারণসহ: token bucket / sliding window', 'Algorithm chosen with a reason: token bucket / sliding window'), 'token bucket', 'sliding', 'leaky', 'window'),
          i(tr('Fixed window-এ মিনিটের কিনারায় দ্বিগুণ request ঢুকতে পারে', 'Fixed windows can let in double at the minute boundary'), 'fixed', 'boundary', 'edge', 'কিনারা', 'burst'),
          i(tr('Redis key: rate:{merchant}:{window}, সাথে TTL', 'Redis key: rate:{merchant}:{window}, with a TTL'), 'key', 'ttl', 'expire'),
        ],
        model: tr('Token bucket: প্রতি merchant-এর bucket-এ ১,০০০ token, প্রতি সেকেন্ডে ~১৭টা ভরে; ছোট burst চলে, গড় থাকে সীমায়। Redis-এ hash: tokens, lastRefill; key-তে TTL যাতে নিষ্ক্রিয় merchant-এর key মুছে যায়। Fixed window সহজ, কিন্তু ১২:০০:৫৯ আর ১২:০১:০০-তে মিলিয়ে ২,০০০ ঢুকতে পারে।', 'Token bucket: each merchant\'s bucket holds 1,000 tokens and refills ~17 a second; small bursts pass while the average stays under the limit. In Redis, a hash of tokens and lastRefill; a TTL on the key clears idle merchants. A fixed window is simpler, but 12:00:59 and 12:01:00 together can let in 2,000.') },
      { id: 'hld', ask: tr('Limiter কোথায় বসবে, counter কোথায়?', 'Where does the limiter sit, and where are the counters?'), hint: tr('২০টা server, একটাই সীমা।', '20 servers, one limit.'),
        items: [
          i(tr('Limiter API-র আগে: gateway বা middleware', 'The limiter sits before the API: gateway or middleware'), 'gateway', 'middleware', 'before', 'আগে'),
          i(tr('Counter shared Redis-এ, প্রতিটা server-এর memory-তে নয়', 'Counters in a shared Redis, not in each server\'s memory'), 'redis', 'shared', 'central'),
          i(tr('Rule (কার কত সীমা) config-এ, cache করে পড়া', 'Rules (who gets what limit) in config, read through a cache'), 'rule', 'config'),
        ],
        model: tr('Client → LB → API gateway (limiter middleware) → API server। Gateway প্রতি request-এ Redis-এ merchant-এর bucket দেখে/কমায়। Merchant-ভেদে সীমা config-এ, gateway memory-তে cache করে। পার হলে API-তে, না হলে সাথে সাথে 429।', 'Client → LB → API gateway (limiter middleware) → API servers. On each request the gateway checks and decrements the merchant\'s bucket in Redis. Per-merchant limits live in config, cached in the gateway\'s memory. Pass: on to the API. Fail: an immediate 429.') },
      { id: 'deep', ask: tr('Race condition আর limiter বন্ধ হলে কী?', 'Race conditions, and what if the limiter is down?'), hint: tr('দুই gateway একসাথে পড়ে-লিখলে কী হয়?', 'What happens when two gateways read and write at once?'),
        items: [
          i(tr('Atomic অপারেশন: Lua script বা INCR, read-then-write নয়', 'Atomic operations: a Lua script or INCR, not read-then-write'), 'atomic', 'lua', 'incr', 'race'),
          i(tr('Redis বন্ধ হলে fail-open না fail-closed, কারণসহ', 'If Redis is down: fail open or fail closed, with a reason'), 'fail open', 'fail-open', 'fail closed', 'fail-closed'),
          i(tr('Client-কে X-RateLimit-Remaining header জানানো', 'Tell clients via X-RateLimit-Remaining headers'), 'header', 'remaining'),
        ],
        model: tr('দুই gateway একই সময়ে "৯৯৯" পড়ে দুজনেই ঢুকতে দিতে পারে; তাই check-আর-কমানো এক Lua script-এ atomic করুন। Redis বন্ধ হলে order API-তে fail-open (ব্যবসা চলুক, কিছুক্ষণ সীমা ছাড়া) আর login-এর মতো জায়গায় fail-closed। Remaining আর Reset header দিলে ভালো client নিজেই ধীর হয়।', 'Two gateways can both read "999" and both let a request in; make check-and-decrement atomic in one Lua script. If Redis is down, fail open for the order API (keep the business running without limits for a while) and fail closed for places like login. Remaining and Reset headers let well-behaved clients slow themselves down.') },
    ],
  },
  {
    id: 'notify', title: 'Delivery notification', level: 10,
    brief: tr('Parcel-এর প্রতিটা অবস্থায় (pickup, পথে, delivered) customer-কে SMS, push আর email। দিনে ৫ কোটি, কোনোটা যেন দুবার না যায়, আর SMS provider মাঝে মাঝে ধীর।', 'At every parcel status (picked up, on the way, delivered) the customer gets SMS, push and email. 50 million a day, none sent twice, and the SMS provider is sometimes slow.'),
    steps: [
      { id: 'req', ask: tr('কোন channel, কোন ঘটনায়, কী গ্যারান্টি?', 'Which channels, on which events, with what guarantees?'), hint: tr('User notification বন্ধ রাখতে পারে।', 'Users can turn notifications off.'),
        items: [
          i('SMS, push, email', 'sms', 'push', 'email'),
          i(tr('User-এর পছন্দ/opt-out মানা', 'Respect user preferences / opt-out'), 'opt', 'preference', 'setting', 'বন্ধ'),
          i(tr('দুবার নয় (dedupe), হারাবে না (retry)', 'Never twice (dedupe), never lost (retry)'), 'dedupe', 'duplicate', 'retry', 'once'),
          i(tr('Order নেওয়া notification-এর জন্য আটকাবে না (async)', 'Taking orders never waits on notifications (async)'), 'async', 'queue', 'block'),
        ],
        model: tr('তিন channel: SMS, push, email। ঘটনা: parcel-এর অবস্থা বদলালে। User channel ধরে বন্ধ রাখতে পারে। গ্যারান্টি: at-least-once পাঠানো + dedupe = কার্যত একবার। Order service কখনো notification-এর জন্য অপেক্ষা করবে না। কয়েক সেকেন্ড দেরি চলে।', 'Three channels: SMS, push, email. Trigger: a parcel status change. Users can turn off each channel. Guarantee: at-least-once sending plus dedupe gives effectively once. The order service never waits on notifications. A few seconds of delay is fine.') },
      { id: 'est', ask: tr('গড় আর peak QPS? Provider কতটা সামলায়?', 'Average and peak QPS? How much can the provider take?'), hint: tr('৫ কোটি / ৮৬,৪০০।', '50M / 86,400.'),
        items: [
          i(tr('গড় ≈ ৬০০/সেকেন্ড', 'Average ≈ 600/s'), '600', '578', 'qps'),
          i(tr('Peak (সন্ধ্যার delivery) ৫-১০ গুণ', 'Peak (evening deliveries) 5–10×'), 'peak', '5x', '10x', 'পিক'),
          i(tr('Provider-এর নিজের সীমা আছে: পাঠানোর গতি বাঁধতে হবে', 'The provider has its own limit: throttle sending'), 'provider', 'limit', 'throttle'),
        ],
        model: tr('৫ কোটি / ৮৬,৪০০ ≈ ৬০০/সেকেন্ড, সন্ধ্যার peak-এ ৩,০০০-৬,০০০। SMS provider হয়তো ১,০০০/সেকেন্ড নেয়, তাই queue-তে জমিয়ে সেই গতিতে ছাড়তে হবে।', '50M / 86,400 ≈ 600/s, with 3,000–6,000/s in the evening peak. The SMS provider may take only 1,000/s, so hold messages in a queue and release them at that rate.') },
      { id: 'api', ask: tr('Notification event-এ কী থাকবে? কী মনে রাখবেন?', 'What goes in a notification event? What do you remember?'), hint: tr('Dedupe-এর জন্য একটা অনন্য id।', 'A unique id for dedupe.'),
        items: [
          i(tr('Event: notificationId, userId, channel, template, data', 'Event: notificationId, userId, channel, template, data'), 'notificationid', 'id', 'template', 'userid'),
          i(tr('পাঠানো id-র record (status, retry সংখ্যা)', 'A record of sent ids (status, retry count)'), 'status', 'log', 'record', 'sent'),
          i(tr('User setting আর device token table', 'User settings and device token tables'), 'token', 'device', 'setting'),
        ],
        model: tr('Order service ছাড়ে: {notificationId = orderId+status+channel, userId, channel, template, data}। Notification log: id, status (queued/sent/failed), attempts। আলাদা table: user setting, push-এর device token। id-টা ঘটনা থেকেই তৈরি, তাই একই ঘটনা দুবার এলেও id এক।', 'The order service emits {notificationId = orderId+status+channel, userId, channel, template, data}. A notification log holds id, status (queued/sent/failed) and attempts. Separate tables hold user settings and push device tokens. The id is derived from the event, so the same event arriving twice has the same id.') },
      { id: 'hld', ask: tr('ঘটনা থেকে ফোন পর্যন্ত পথ আঁকুন।', 'Draw the path from event to phone.'), hint: tr('Channel-ভেদে আলাদা queue?', 'A queue per channel?'),
        items: [
          i(tr('Order service → notification service → queue', 'Order service → notification service → queue'), 'queue', 'kafka', 'notification service'),
          i(tr('Channel-ভেদে আলাদা queue আর worker, যাতে ধীর SMS email আটকায় না', 'A queue and workers per channel, so slow SMS never blocks email'), 'channel', 'separate', 'আলাদা', 'per'),
          i(tr('Worker → provider (SMS gateway / APNs-FCM / email)', 'Workers → providers (SMS gateway / APNs-FCM / email)'), 'worker', 'fcm', 'apns', 'provider'),
          i(tr('পাঠানোর আগে setting দেখা, পরে log', 'Check settings before sending, log afterwards'), 'setting', 'log', 'check'),
        ],
        model: tr('Order service → notification service (setting দেখে, template ভরে) → channel-ভেদে queue → worker → provider। Worker পাঠানোর আগে log-এ id দেখে, পাঠানোর পরে status লেখে। SMS queue জমলেও push আর email স্বাভাবিক চলে।', 'Order service → notification service (checks settings, fills templates) → a queue per channel → workers → providers. Workers check the id in the log before sending and write the status afterwards. If the SMS queue backs up, push and email carry on normally.') },
      { id: 'deep', ask: tr('Retry আর "দুবার নয়" একসাথে কীভাবে?', 'How do retries and "never twice" work together?'), hint: tr('Provider পাঠিয়েছে কিন্তু উত্তর হারাল।', 'The provider sent it but the reply was lost.'),
        items: [
          i(tr('Exponential backoff সহ retry, সীমিত সংখ্যায়', 'Retries with exponential backoff, limited in number'), 'backoff', 'exponential', 'retry'),
          i(tr('বারবার ব্যর্থ হলে dead-letter queue', 'Repeated failures go to a dead-letter queue'), 'dead', 'dlq'),
          i(tr('Dedupe: পাঠানোর আগে id দেখা; provider-কেও idempotency key', 'Dedupe: check the id before sending; pass an idempotency key to the provider too'), 'idempot', 'dedupe', 'key'),
          i(tr('Provider ব্যর্থ হলে বিকল্প provider', 'A fallback provider when one fails'), 'fallback', 'secondary', 'বিকল্প'),
        ],
        model: tr('ব্যর্থ হলে ১, ২, ৪, ৮ সেকেন্ড পরপর retry, ৫ বারের পর dead-letter queue-তে, যেখানে মানুষ দেখে। উত্তর হারানোয় একই SMS দুবার যেতে পারে, তাই worker log-এ id দেখে আর provider সমর্থন করলে idempotency key পাঠায়। এক provider বারবার ব্যর্থ হলে দ্বিতীয় provider-এ সরে যান।', 'On failure retry after 1, 2, 4, 8 seconds; after 5 tries move it to a dead-letter queue that a person reviews. A lost reply can make the same SMS go twice, so workers check the id in the log and send an idempotency key when the provider supports one. When one provider keeps failing, switch to a second.') },
    ],
  },
  {
    id: 'chat', title: 'Rider–customer chat', level: 12,
    brief: tr('Delivery-র সময় rider আর customer ১-১ chat করে। লাখো খোলা সংযোগ, online/offline দেখানো, আর offline থাকলে message জমা থাকবে।', 'During a delivery, the rider and the customer chat 1-to-1. Hundreds of thousands of open connections, online/offline status, and messages kept while someone is offline.'),
    steps: [
      { id: 'req', ask: tr('Chat-এর কী কী লাগবে, কী বাদ?', 'What does the chat need, and what is out?'), hint: tr('Group chat লাগবে কি?', 'Is group chat needed?'),
        items: [
          i(tr('১-১ message, কম latency-তে', '1-to-1 messages with low latency'), '1-1', 'one', 'latency', 'real'),
          i(tr('Online/offline দেখানো', 'Online/offline status'), 'online', 'presence', 'offline'),
          i(tr('Offline থাকলে message জমা, পরে পৌঁছানো', 'Messages kept while offline and delivered later'), 'offline', 'store', 'জমা', 'persist'),
          i(tr('Message-এর ক্রম ঠিক থাকা', 'Messages stay in order'), 'order', 'ক্রম', 'sequence'),
        ],
        model: tr('লাগবে: ১-১ text, ২০০ ms-এর মধ্যে পৌঁছানো, online/offline, offline-এ জমা, ক্রম ঠিক। বাদ: group, ছবি/ভিডিও, end-to-end encryption। Chat শুধু delivery চলাকালীন, তাই পুরনো chat ৩০ দিন পরে মুছলেও চলে।', 'In: 1-to-1 text delivered within 200 ms, online/offline, stored while offline, kept in order. Out: groups, photos/videos, end-to-end encryption. Chats only exist during a delivery, so old chats can be deleted after 30 days.') },
      { id: 'est', ask: tr('কতগুলো খোলা সংযোগ, কত server?', 'How many open connections, how many servers?'), hint: tr('এক server ধরুন ৫০,০০০ সংযোগ রাখে।', 'Assume one server holds 50,000 connections.'),
        items: [
          i(tr('একসাথে online: লাখের ঘরে', 'Concurrent online: hundreds of thousands'), 'concurrent', 'লাখ', 'online'),
          i(tr('সংযোগ / ৫০,০০০ = server সংখ্যা, সাথে বাড়তি', 'Connections / 50,000 = servers, plus headroom'), 'server', '50,000', '50000', 'connection'),
          i(tr('Message/সেকেন্ড আর storage আলাদা হিসাব', 'Messages per second and storage, worked out separately'), 'message', 'storage', 'per second'),
        ],
        model: tr('ধরুন একসাথে ৫ লাখ rider আর customer online। ৫০,০০০ করে ধরলে ১০টা WebSocket server, বাড়তি নিয়ে ১৫টা। প্রতি delivery-তে গড়ে ৬টা message, দিনে ২০ লাখ delivery → ১.২ কোটি message, ~১৪০/সেকেন্ড: storage-এর চাপ কম, আসল চ্যালেঞ্জ খোলা সংযোগ।', 'Say 500,000 riders and customers online at once. At 50,000 each that is 10 WebSocket servers, 15 with headroom. Six messages per delivery on average and 2 million deliveries a day gives 12 million messages, ~140/s: storage is light; the real challenge is open connections.') },
      { id: 'api', ask: tr('Protocol আর data model?', 'Protocol and data model?'), hint: tr('Polling কেন নয়?', 'Why not polling?'),
        items: [
          i(tr('WebSocket (দুই দিকে খোলা সংযোগ), polling নয়', 'WebSocket (an open two-way connection), not polling'), 'websocket', 'socket', 'polling'),
          i(tr('Message: chatId, messageId, from, text, sentAt', 'Message: chatId, messageId, from, text, sentAt'), 'messageid', 'chatid', 'sentat', 'timestamp'),
          i(tr('chatId দিয়ে partition, messageId সময়-ক্রমে', 'Partition by chatId, messageIds in time order'), 'partition', 'chatid', 'snowflake', 'sort'),
        ],
        model: tr('WebSocket: server নিজে থেকে message ঠেলে দিতে পারে, polling-এর মতো বারবার জিজ্ঞেস নয়। Table: messages(chatId PK, messageId sort key, from, text, sentAt); messageId সময়-ক্রমের (snowflake)। এক chat-এর সব message এক partition-এ, তাই পড়া সস্তা।', 'WebSocket: the server can push messages itself instead of being asked repeatedly as with polling. Table: messages(chatId partition key, messageId sort key, from, text, sentAt), with time-ordered messageIds (snowflake). All of a chat\'s messages sit in one partition, so reads are cheap.') },
      { id: 'hld', ask: tr('A একটা server-এ, B অন্য server-এ। Message কীভাবে পৌঁছায়?', 'A is on one server, B on another. How does the message get there?'), hint: tr('কে কোন server-এ, সেটা কোথায় লেখা?', 'Where is it recorded who is on which server?'),
        items: [
          i(tr('LB-এর পেছনে অনেক WebSocket server', 'Many WebSocket servers behind a load balancer'), 'load balancer', 'lb', 'websocket'),
          i(tr('কে কোন server-এ: Redis-এ (session/presence)', 'Who is on which server: in Redis (session/presence)'), 'redis', 'session', 'presence', 'registry'),
          i(tr('Server-দের মধ্যে pub/sub বা message queue', 'Pub/sub or a message queue between servers'), 'pub/sub', 'pubsub', 'queue', 'kafka'),
          i(tr('Message আগে DB-তে, তারপর পাঠানো', 'Messages hit the DB first, then are sent'), 'database', 'db', 'store', 'persist'),
        ],
        model: tr('A → LB → WS server ১। Server ১ message DB-তে রাখে, তারপর Redis-এ দেখে B কোন server-এ: server ৩। Redis pub/sub-এ B-র channel-এ ছাড়ে, server ৩ B-কে ঠেলে দেয়। B offline হলে push notification যায়, পরে B খুললে DB থেকে বাকি message টেনে নেয়।', 'A → LB → WS server 1. Server 1 stores the message in the DB, then checks Redis for B\'s server: server 3. It publishes on B\'s Redis pub/sub channel, and server 3 pushes it to B. If B is offline a push notification goes out, and when B opens the app it pulls the missed messages from the DB.') },
      { id: 'deep', ask: tr('Online/offline-এর ঝিকমিক আর message-এর ক্রম।', 'Online/offline flicker and message order.'), hint: tr('Network ১ সেকেন্ডের জন্য গেলে কী দেখাবেন?', 'What do you show when the network drops for one second?'),
        items: [
          i(tr('Heartbeat: নির্দিষ্ট সময় সাড়া না দিলে তবেই offline', 'Heartbeat: offline only after no response for a set time'), 'heartbeat', 'ping', 'timeout'),
          i(tr('ক্রম: প্রতি chat-এ ক্রমিক id, client সেই ক্রমে সাজায়', 'Order: per-chat sequence ids, clients sort by them'), 'sequence', 'order', 'ক্রম', 'snowflake'),
          i(tr('Client-এর পাঠানো message-এ নিজের id, যাতে retry-তে দুবার না দেখায়', 'Client-generated ids on sent messages so a retry never shows twice'), 'client id', 'idempot', 'dedupe', 'duplicate'),
        ],
        model: tr('Client প্রতি ৩০ সেকেন্ডে heartbeat দেয়; ৬০ সেকেন্ড চুপ থাকলে তবেই offline, তাই tunnel-এ ঢুকে বেরোলে ঝিকমিক হয় না। ক্রম: প্রতি chat-এ সময়-ক্রমের id, client সেই ধরে সাজায়। পাঠানোর সময় client একটা নিজস্ব id দেয়; network-এ উত্তর হারিয়ে আবার পাঠালেও server সেই id দেখে দ্বিতীয়টা ফেলে দেয়।', 'Clients send a heartbeat every 30 seconds; they go offline only after 60 seconds of silence, so driving through a tunnel causes no flicker. Order: time-ordered ids per chat, and clients sort by them. On send, the client attaches its own id; if a reply is lost and it resends, the server sees the id and drops the copy.') },
    ],
  },
];

/** Checklist items a written answer seems to cover, by keyword. Only a hint: the learner confirms. */
export function suggestCovered(answer: string, items: CheckItem[]): boolean[] {
  const text = answer.toLowerCase();
  return items.map((it) => it.keys.some((k) => text.includes(k.toLowerCase())));
}
