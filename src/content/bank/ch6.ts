import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { pick, Q, wrongs } from './q';
import type { Generator, LevelBank } from './types';

/* Our own questions for chapter 6 (levels 29–30). First option is always right. */
const n = (v: number) => bn(v);

const catchUp: Generator = {
  id: 'l29-g1', concept: 'lag',
  make: (rand) => {
    const lag = pick(rand, [600_000, 1_200_000, 3_600_000]);
    const [k, per, inflow] = pick(rand, [[4, 1000, 2000], [6, 500, 1000], [10, 500, 3000], [6, 1000, 4000], [10, 1000, 5000]] as const);
    const net = k * per - inflow;
    const right = Math.round(lag / net / 60);
    return {
      prompt: tr(`Lag ${n(lag)}টা message। ${n(k)}টা consumer, প্রত্যেকে সেকেন্ডে ${n(per)}টা পড়ে; নতুন আসছে সেকেন্ডে ${n(inflow)}টা। ধরতে কত মিনিট?`, `Lag is ${n(lag)} messages. ${n(k)} consumers each read ${n(per)} a second; ${n(inflow)} new ones arrive a second. Minutes to catch up?`),
      options: [`~${n(right)}`, ...wrongs(right, [Math.round(lag / (k * per) / 60), Math.round(lag / inflow / 60), right * 2, right * 3, Math.round(lag / net)]).map((o) => `~${n(o)}`)],
      explain: tr(`আসলে কমে সেকেন্ডে ${n(k * per)} − ${n(inflow)} = ${n(net)}টা; ${n(lag)} ÷ ${n(net)} ≈ ${n(right)} মিনিট।`, `The backlog shrinks by ${n(k * per)} − ${n(inflow)} = ${n(net)} a second; ${n(lag)} ÷ ${n(net)} ≈ ${n(right)} minutes.`),
    };
  },
};
const bucket: Generator = {
  id: 'l30-g1', concept: 'bucket',
  make: (rand) => {
    const cap = pick(rand, [10, 20, 50, 100]), refill = pick(rand, [5, 10]), burst = pick(rand, [200, 500]);
    return {
      prompt: tr(`Token bucket: capacity ${n(cap)}, সেকেন্ডে ${n(refill)}টা token যোগ হয়। অনেকক্ষণ চুপ থাকার পর একসাথে ${n(burst)}টা request এল। সাথে সাথে কয়টা যায়?`, `Token bucket: capacity ${n(cap)}, refilled at ${n(refill)} tokens a second. After a long quiet spell, ${n(burst)} requests arrive at once. How many pass immediately?`),
      options: [n(cap), ...wrongs(cap, [refill, burst, cap * 2, cap + refill]).map(n)],
      explain: tr(`বালতি ভরা থাকলে ${n(cap)}টা token; বাকিরা অপেক্ষা বা বাতিল, তারপর সেকেন্ডে ${n(refill)}টা করে।`, `A full bucket holds ${n(cap)} tokens; the rest wait or are rejected, then ${n(refill)} pass each second.`),
    };
  },
};
const ringPoints: Generator = {
  id: 'l30-g2', concept: 'ring',
  make: (rand) => {
    const s = pick(rand, [4, 10, 50]), v = pick(rand, [100, 200]);
    const right = s * v;
    return {
      prompt: tr(`${n(s)}টা server, প্রত্যেকের ${n(v)}টা virtual node। Ring-এ মোট কয়টা বিন্দু?`, `${n(s)} servers with ${n(v)} virtual nodes each. How many points on the ring?`),
      options: [n(right), ...wrongs(right, [s, v, s + v, right * 2]).map(n)],
      explain: tr(`${n(s)} × ${n(v)} = ${n(right)}; বিন্দু যত বেশি, ভাগ তত সমান।`, `${n(s)} × ${n(v)} = ${n(right)}; more points give more even shares.`),
    };
  },
};

export const ch6Bank: Record<number, LevelBank> = {
  29: {
    concepts: [
      { id: 'rollback', label: 'Rollback' },
      { id: 'lag', label: 'Consumer lag' },
      { id: 'herd', label: 'Thundering herd' },
      { id: 'ryw', label: tr('নিজের লেখা পড়া', 'Read your own writes') },
      { id: 'region', label: tr('পুরো region বন্ধ', 'A region goes down') },
    ],
    gens: [catchUp],
    items: [
      Q('l29-x1', 'rollback', ['Deploy-এর পরে error বাড়ছে, কারণ এখনো অজানা। প্রথম কাজ?', 'Errors climb after a deploy and the cause is unknown. First move?'], [['আগে rollback, পরে কারণ খোঁজা', 'Roll back first, investigate after'], ['কারণ না জেনে কিছু না করা', 'Do nothing until the cause is known'], ['আরেকটা নতুন fix deploy', 'Ship another new fix on top'], ['সব server restart করা', 'Restart every server at once']], ['আগে ক্ষতি থামান; ভালো version-এ ফিরলে শান্তভাবে খোঁজা যায়।', 'Stop the damage first; back on a good version, you can dig calmly.']),
      Q('l29-x2', 'rollback', ['দ্রুত rollback-এর জন্য আগে থেকে কী লাগে?', 'What makes a fast rollback possible?'], [['আগের build প্রস্তুত, এক ধাপে ফেরা', 'The previous build, ready to go back'], ['প্রতিবার শূন্য থেকে নতুন build', 'Rebuilding from scratch each time'], ['Rollback-এর কোনো পরিকল্পনাই না', 'Having no rollback plan at all'], ['শুধু রাতের বেলায় deploy করা', 'Deploying only late at night']], ['পুরনো version-এ ফেরা যত সহজ, deploy তত সাহসী করা যায়।', 'The easier it is to go back, the bolder you can deploy.']),
      Q('l29-x3', 'rollback', ['DB schema বদলসহ deploy rollback কঠিন কেন?', 'Why is rolling back a deploy that changed the DB schema hard?'], [['পুরনো code নতুন schema বোঝে না', 'Old code may not read the new schema'], ['Schema কখনো বদলানোই যায় না', 'Schemas can never be changed at all'], ['Rollback করলে data দ্বিগুণ হয়', 'Rolling back doubles the data'], ['কঠিন না, সবসময় একদম সহজ', 'It is not hard; it is always easy']], ['Schema বদল আলাদা ধাপে করুন, যাতে পুরনো-নতুন দুই code চলে।', 'Change schemas in separate steps that both old and new code can handle.']),
      Q('l29-x4', 'lag', ['Consumer lag বাড়ছে। প্রথমে কী দেখবেন?', 'Consumer lag is growing. What do you check first?'], [['কোন কাজ ধীর, আর partition কয়টা', 'What is slow, and the partition count'], ['সব producer সাথে সাথে বন্ধ', 'Stop every producer right away'], ['পুরো topic মুছে আবার শুরু', 'Delete the topic and start over'], ['কিছু না, নিজে থেকে কমবে', 'Nothing; it will shrink by itself']], ['Consumer partition-এর বেশি হলে বসে থাকে; ধীর DB call-ই প্রায়ই কারণ।', 'Consumers beyond the partition count sit idle; a slow DB call is often the cause.']),
      Q('l29-x5', 'lag', ['Partition ১০টা, consumer ২০টা। কতজন কাজ পায়?', '10 partitions and 20 consumers. How many get work?'], [['১০ জন', '10'], ['২০ জন', '20'], ['৫ জন', '5'], ['১ জন', '1']], ['এক group-এ এক partition একজনই পড়ে; বাকি ১০ জন বসে থাকে।', 'Within a group, each partition has one reader; the other 10 idle.']),
      Q('l29-x6', 'lag', ['Lag কমাতে consumer বাড়ালেন, কিন্তু ধীর DB-তে চাপ বাড়ল। এখন?', 'You added consumers, but the slow DB is now struggling. Now what?'], [['DB-র কাজ batch বা cache করা', 'Batch or cache the DB work'], ['আরও অনেক consumer যোগ করা', 'Add yet more consumers'], ['DB কিছুক্ষণ বন্ধ রাখা', 'Turn the DB off for a while'], ['Lag পুরোপুরি উপেক্ষা করা', 'Ignore the lag completely']], ['আসল বাধা সরান; না হলে চাপ শুধু জায়গা বদলায়।', 'Fix the real bottleneck, or the pressure just moves.']),
      Q('l29-x7', 'herd', ['Cache restart হলো, সবাই একসাথে DB-তে। এই সমস্যার নাম?', 'The cache restarts and everyone hits the DB at once. The name?'], [['Thundering herd', 'A thundering herd'], ['Split brain', 'A split brain'], ['Write skew', 'Write skew'], ['Clock drift', 'Clock drift']], ['ঠান্ডা cache: একই key-তে হাজার request একসাথে DB-তে।', 'A cold cache sends thousands of requests for one key to the DB.']),
      Q('l29-x8', 'herd', ['Request coalescing কী?', 'What is request coalescing?'], [['একই key-র অনেক miss, একটা DB call', 'Misses for one key share one DB call'], ['আসা সব request বাতিল করা', 'Rejecting every incoming request'], ['Request-গুলো এলোমেলো করা', 'Shuffling requests into random order'], ['Cache পুরোপুরি বন্ধ রাখা', 'Switching the cache off entirely']], ['প্রথমজন আনে, বাকিরা তার উত্তরের জন্য অপেক্ষা করে।', 'The first fetches; the rest wait for its answer.']),
      Q('l29-x9', 'herd', ['লাখো key-র TTL একই মুহূর্তে শেষ হওয়া এড়াতে?', 'How do you avoid millions of keys expiring at the same moment?'], [['TTL-এ একটু jitter যোগ করা', 'Add a little jitter to the TTLs'], ['সব TTL একদম সমান রাখা', 'Keep every TTL exactly equal'], ['TTL পুরোপুরি বাদ দেওয়া', 'Drop TTLs from keys entirely'], ['Cache-এর আকার ছোট করা', 'Shrink the cache by half']], ['মেয়াদ ছড়িয়ে পড়লে miss-ও ছড়িয়ে পড়ে।', 'Spread-out expiry spreads out the misses.']),
      Q('l29-x10', 'ryw', ['User order দিয়েই তালিকায় দেখছে না। কারণ?', 'A user places an order but cannot see it in their list. Why?'], [['Replica এখনো লেখাটা পায়নি', 'The replica has not caught up yet'], ['Order চিরতরে হারিয়ে গেছে', 'The order was lost for good'], ['User নিজেই ভুল দেখছে', 'The user is simply mistaken'], ['Cache অতিরিক্ত দ্রুত চলছে', 'The cache is running too fast']], ['Leader-এ লেখা, replica-য় পড়া: মাঝে কয়েক ms থেকে কয়েক সেকেন্ড।', 'Written to the leader, read from a replica: a gap of ms to seconds.']),
      Q('l29-x11', 'ryw', ['Read-your-writes দেওয়ার একটা সহজ উপায়?', 'An easy way to give read-your-writes?'], [['কিছুক্ষণ নিজের data leader থেকে', 'Own data from the leader for a while'], ['সবসময় এলোমেলো replica থেকে', 'Always read from a random replica'], ['Cache পুরোপুরি বন্ধ রাখা', 'Switch the cache off entirely'], ['সব লেখা ইচ্ছে করে ধীর', 'Slow every write down on purpose']], ['বাকিদের data replica থেকে চলে; শুধু নিজেরটা টাটকা লাগে।', 'Others\' data can come from replicas; only your own must be fresh.']),
      Q('l29-x12', 'ryw', ['Replica কতটা পিছিয়ে, কীভাবে জানবেন?', 'How do you know how far behind a replica is?'], [['Replica-র lag metric দেখে', 'From the replica\'s lag metric'], ['মোটামুটি আন্দাজ করে নিয়ে', 'By making a rough guess'], ['User-দের জিজ্ঞেস করে', 'By asking users about it'], ['জানার কোনো উপায় নেই', 'There is no way to know']], ['Lag বেশি হলে ওই replica-কে পড়া থেকে বাদ দিন।', 'If lag is high, take that replica out of the read pool.']),
      Q('l29-x13', 'region', ['পুরো region বন্ধ। Failover-এর আগে কী নিশ্চিত থাকা চাই?', 'A whole region is down. What must be true before failover?'], [['অন্য region-এ data আর ক্ষমতা আছে', 'The other region has data and room'], ['কিছুই নিশ্চিত করার দরকার নেই', 'Nothing at all needs checking first'], ['সব user-কে logout করানো', 'Every user has been logged out'], ['DNS পুরোপুরি বন্ধ রাখা', 'DNS has been switched off']], ['Failover মহড়া আগে থেকে না করলে আসল দিনে কাজ নাও করতে পারে।', 'Without failover drills, it may not work on the real day.']),
      Q('l29-x14', 'region', ['DNS TTL লম্বা হলে region failover কেমন হয়?', 'With long DNS TTLs, region failover is?'], [['ধীর: পুরনো ঠিকানা cache-এ থাকে', 'Slow: old addresses stay cached'], ['আরও অনেক দ্রুত হয়ে যায়', 'Much faster than it would be'], ['একেবারে অসম্ভব হয়ে যায়', 'Completely impossible to do'], ['কোনো প্রভাবই পড়ে না', 'Not affected in any way']], ['ছোট TTL বা global load balancer দিয়ে দ্রুত সরানো যায়।', 'Short TTLs or a global load balancer move traffic faster.']),
      Q('l29-x15', 'region', ['Async replication-এ region পড়ে গেলে কী হারাতে পারে?', 'With async replication, what can be lost when a region dies?'], [['শেষ কয়েক সেকেন্ডের লেখা', 'The last few seconds of writes'], ['পুরো database-এর সব data', 'All of the data, everywhere'], ['কিছুই না, কখনোই না', 'Nothing; replication is instant'], ['শুধু ছবিগুলো হারায়', 'Only the uploaded images']], ['যা পাঠানো হয়নি তা হারায়: RPO শূন্য না।', 'Whatever had not shipped is lost: RPO is not zero.']),
    ],
  },
  30: {
    concepts: [
      { id: 'bucket', label: 'Token bucket' },
      { id: 'ring', label: 'Consistent hashing' },
      { id: 'geo', label: tr('কাছের rider', 'The nearest rider') },
      { id: 'idem', label: 'Idempotency key' },
      { id: 'outbox', label: 'Transactional outbox' },
    ],
    gens: [bucket, ringPoints],
    items: [
      Q('l30-x1', 'bucket', ['Token bucket-এ capacity আর refill rate কী ঠিক করে?', 'In a token bucket, what do capacity and refill rate set?'], [['Burst-এর আকার আর গড় হার', 'Burst size and the average rate'], ['শুধু server-এর সংখ্যা কত', 'Only how many servers run'], ['User-এর password কত লম্বা', 'How long passwords must be'], ['Cache-এর TTL কতক্ষণ', 'How long the cache TTL is']], ['বালতি ভরা থাকলে একসাথে অনেক; লম্বা সময়ে গড় refill হারেই।', 'A full bucket allows a burst; over time the refill rate rules.']),
      Q('l30-x2', 'bucket', ['Leaking bucket আর token bucket-এর পার্থক্য?', 'Leaking bucket versus token bucket?'], [['Leaking সমান হারে, token-এ burst', 'Leaking smooths; token allows bursts'], ['দুটো আসলে হুবহু একই জিনিস', 'They are exactly the same thing'], ['Leaking-এ burst আরও বেশি হয়', 'Leaking allows the bigger bursts'], ['Token bucket-এ queue লাগে', 'The token bucket needs a queue']], ['স্থির হারে কাজ চাইলে leaking; মাঝে মাঝে ভিড় মানতে চাইলে token।', 'Use leaking for a steady rate, token to tolerate occasional bursts.']),
      Q('l30-x3', 'bucket', ['অনেক server-এ rate limit-এর গণনা কোথায় রাখবেন?', 'Where do you keep rate-limit counters across many servers?'], [['Redis-এর মতো ভাগাভাগি store-এ', 'In a shared store such as Redis'], ['প্রতিটা server-এর নিজের memory-তে', 'In each server\'s own memory'], ['User-এর browser cookie-তে', 'In a cookie on the user\'s side'], ['একটা log file-এর ভেতরে', 'Inside an append-only log file']], ['আলাদা গুনলে user প্রতিটা server-এ পুরো সীমা পায়।', 'Counting separately gives the user the full limit on every server.']),
      Q('l30-x4', 'ring', ['৪টা cache server-এর একটা পড়ে গেল। Consistent hashing-এ কত key সরে?', 'One of 4 cache servers dies. With consistent hashing, how many keys move?'], [['শুধু ওর ভাগ, ~২৫%', 'Only its share, about 25%'], ['প্রায় সব key-ই জায়গা বদলায়', 'Nearly all of them'], ['ঠিক অর্ধেক key সরে', 'Exactly half'], ['একটাও না', 'None at all']], ['পড়ে যাওয়া server-এর key পরের জনের কাছে যায়; বাকিরা ঠিক থাকে।', 'Its keys go to the next server; everything else stays put.']),
      Q('l30-x5', 'ring', ['ParcelGo-র কোথায় consistent hashing মানায়?', 'Where in ParcelGo does consistent hashing fit?'], [['Tracking cache কয়েক server-এ ভাগ', 'Spreading the tracking cache'], ['Login-এর password hash করা', 'Hashing login passwords'], ['Parcel-এর ছবি resize করা', 'Resizing parcel photos'], ['SMS-এর লেখা তৈরি করা', 'Writing the SMS text']], ['Server যোগ-বাদে কম key সরানোই এর কাজ।', 'Its job is moving few keys when servers change.']),
      Q('l30-x6', 'ring', ['Virtual node-এর কাজ কী?', 'What do virtual nodes do?'], [['ভাগ সমান করা', 'Even out the shares'], ['Hot key ঠিক করা', 'Fix hot keys'], ['Data encrypt করা', 'Encrypt the data'], ['Backup নেওয়া', 'Take backups']], ['প্রতিটা server ring-এ অনেক জায়গায় বসে; গড়ে সমান।', 'Each server sits at many points, so shares even out.']),
      Q('l30-x7', 'geo', ['সবচেয়ে কাছের rider খুঁজতে কোন index?', 'Which index finds the nearest rider?'], [['Geohash বা quadtree', 'Geohash or a quadtree'], ['Rider-এর নামের index', 'An index on rider names'], ['Order-এর সময়ের index', 'An index on order time'], ['কোনো index না', 'No index at all']], ['২D অবস্থানকে খোঁজার মতো গঠনে আনে।', 'They turn 2D position into something searchable.']),
      Q('l30-x8', 'geo', ['Rider চলমান, প্রতি ৫ সেকেন্ডে অবস্থান বদলায়। কোথায় রাখবেন?', 'Riders move and update every 5 s. Where do you keep positions?'], [['Memory-তে (যেমন Redis GEO)', 'In memory, such as Redis GEO'], ['প্রতিবার disk-এর table-এ লিখে', 'A disk table updated each time'], ['CDN-এর edge server-এ', 'On the CDN\'s edge servers'], ['Email-এর ভেতরে পাঠিয়ে', 'Sent around inside emails']], ['ঘন ঘন বদলানো, কম দিন দরকারি data: memory-ই ঠিক।', 'Fast-changing, short-lived data belongs in memory.']),
      Q('l30-x9', 'geo', ['কাছে কোনো rider নেই। কী করবেন?', 'No rider is nearby. What do you do?'], [['খোঁজার এলাকা ধাপে ধাপে বড় করা', 'Widen the search area step by step'], ['সাথে সাথে order বাতিল করা', 'Cancel the order right away'], ['দেশের যেকোনো rider পাঠানো', 'Send any rider in the country'], ['শুধু অপেক্ষা, কিছু না করা', 'Just wait and do nothing']], ['Geohash prefix ছোট করলেই বড় এলাকা।', 'A shorter geohash prefix means a bigger area.']),
      Q('l30-x10', 'idem', ['Idempotency key কে বানায়?', 'Who creates the idempotency key?'], [['Client, প্রতিটা নতুন কাজের জন্য', 'The client, once per new action'], ['Server, প্রতি request-এ নতুন', 'The server, new on every request'], ['Customer-এর bank নিজে', 'The customer\'s own bank'], ['কেউই বানায় না, লাগে না', 'Nobody; it is not needed']], ['Retry-তে একই key; নতুন কাজে নতুন key।', 'Retries reuse the key; a new action gets a new one.']),
      Q('l30-x11', 'idem', ['একই key-তে দ্বিতীয় request এলে server কী করে?', 'A second request arrives with the same key. The server?'], [['আগের ফলই ফেরত, আবার charge না', 'Replays the first result, no charge'], ['আবার নতুন করে charge করে', 'Charges the customer again'], ['সবসময় একটা error দেয়', 'Always rejects it with an error'], ['Key মুছে নতুন করে চালায়', 'Deletes the key and reruns it']], ['ফলাফল key-র সাথে জমা থাকে।', 'The result is stored with the key.']),
      Q('l30-x12', 'idem', ['Idempotency key কতদিন রাখবেন?', 'How long do you keep idempotency keys?'], [['যতক্ষণ retry আসতে পারে', 'As long as retries can arrive'], ['মাত্র এক সেকেন্ডের জন্য', 'For just a single second'], ['চিরকাল, কখনো না মুছে', 'Forever, never deleting them'], ['একদম রাখার দরকার নেই', 'They need not be kept at all']], ['খুব কম রাখলে দেরিতে আসা retry দুবার charge করবে।', 'Too short, and a late retry charges twice.']),
      Q('l30-x13', 'outbox', ['DB-তে order লিখে তারপর Kafka-তে event পাঠালেন। মাঝে crash হলে?', 'You write the order to the DB, then publish to Kafka. A crash in between?'], [['Order আছে, event হারায়', 'The order exists; the event is lost'], ['দুটোই ঠিকঠাক থাকে', 'Both are safely written anyway'], ['দুটোই একসাথে হারায়', 'Both are lost together for good'], ['কিছুই হয় না, সব ঠিক', 'Nothing; all stays consistent']], ['দুই আলাদা system-এ লেখা একসাথে সফল হবে, এমন নিশ্চয়তা নেই।', 'Writes to two systems are not guaranteed to succeed together.']),
      Q('l30-x14', 'outbox', ['Outbox pattern-এ event কোথায় লেখা হয়?', 'In the outbox pattern, where is the event written?'], [['একই transaction-এ outbox table-এ', 'An outbox table, same transaction'], ['আগে সরাসরি Kafka-তে পাঠিয়ে', 'Straight to Kafka beforehand'], ['একটা email-এ লিখে পাঠিয়ে', 'Into an email to the team'], ['শুধু server-এর memory-তে', 'Only in the server\'s memory']], ['Order আর event একসাথে commit বা একসাথে বাতিল।', 'The order and the event commit or fail together.']),
      Q('l30-x15', 'outbox', ['Outbox table থেকে Kafka-তে কে পাঠায়?', 'Who moves events from the outbox table to Kafka?'], [['আলাদা relay বা CDC process', 'A separate relay or CDC process'], ['User নিজে হাতে পাঠায়', 'The user sends them by hand'], ['DB নিজে থেকে মুছে দেয়', 'The DB deletes them on its own'], ['কেউই পাঠায় না, থেকে যায়', 'Nobody; they stay there forever']], ['Relay at-least-once পাঠায়; consumer-কে idempotent রাখুন।', 'The relay sends at least once, so keep consumers idempotent.']),
    ],
  },
};
