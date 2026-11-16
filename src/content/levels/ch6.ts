import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৬ · বড় দিনের প্রস্তুতি — architecture guide আর final */

export const l29 = level({
  id: 29, chapter: 6,
  title: 'টিকে থাকার নিয়ম', concept: 'Outbox · Circuit breaker · Resilience',
  story: 'পুরো system টিকিয়ে রাখা',
  briefing: 'সব আলাদা অংশ এখন জোড়া লাগানো। কিন্তু একটা ধীর dependency পুরো site ধীর করে দিচ্ছে, আর DB-তে order আছে অথচ event যায়নি। Production-এ টিকে থাকার নিয়মগুলো।',
  ref: refs.p7,
  predict: ['Order DB-তে লেখা আর Kafka-তে event পাঠানো দুই আলাদা কাজ। মাঝে crash হলে?', ['একটা হয়, অন্যটা হয় না', 'কিছু না, দুটোই হয়', 'দুটোই হারায়', 'DB নিজে event পাঠায়']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['db', 'DB: orders', 'db', 36, 28], ['ob', 'DB: outbox', 'db', 36, 74], ['rl', 'Relay', 'worker', 64, 74],
    ['kq', 'Kafka', 'queue', 90, 74], ['dep', 'Payment dependency', 'service', 64, 22], ['cb', 'Circuit breaker', 'lb', 90, 22],
  ],
  steps: [
    { text: 'Outbox: order আর event একই DB transaction-এ লেখা।', add: ['svc', 'db', 'ob'], flow: [['svc', 'db'], ['svc', 'ob']], badges: { db: 'এক transaction' } },
    { text: 'Relay outbox পড়ে Kafka-তে পাঠায়, পাঠানো হলে চিহ্ন দেয়।', add: ['rl', 'kq'], flow: [['ob', 'rl'], ['rl', 'kq']] },
    { text: 'Relay crash করল।', down: ['rl'], ask: ['এখন কী হয়?', ['Event থেকে যায়, relay পরে পাঠায়', 'Event চিরতরে হারিয়ে যায়', 'Order-টাও মুছে যায়', 'Database crash করে']] },
    { text: 'At-least-once: relay ফিরে পাঠায়; consumer idempotent হলে নিরাপদ।', ok: ['rl'], flow: [['rl', 'kq']] },
    { text: 'Payment dependency ধীর; প্রতিটা request অপেক্ষায় thread আটকাচ্ছে।', add: ['dep', 'cb'], down: ['dep'], flow: [['svc', 'cb']], badges: { cb: 'closed' } },
    { text: 'Error হার অনেক বেড়ে গেল।', badges: { cb: '?' }, ask: ['Circuit breaker কী করে?', ['Open: সরাসরি fallback', 'আরও request পাঠায়', 'Server restart করে', 'কিছু না']] },
    { text: 'Open অবস্থায় সাথে সাথে fallback। কিছু পরে half-open: অল্প request দিয়ে পরীক্ষা, সফল হলে আবার closed।', badges: { cb: 'open → half-open' }, ok: ['cb'] },
  ],
  summary: ['Outbox: DB আর event একই transaction; relay পরে পাঠায়', 'Circuit breaker: closed → open → half-open', 'Timeout, backoff সহ retry, bulkhead: ভাঙন ছড়াতে না দেওয়া'],
  play: {
    kind: 'missions', intro: 'তিনটা incident। প্রথম কাজটা বাছুন।',
    missions: [
      ['এক dependency ধীর, পুরো site ধীর। প্রথম কাজ?', ['Timeout আর circuit breaker', 'আরও thread যোগ করা', 'Retry সংখ্যা দ্বিগুণ', 'ঠিক হওয়া পর্যন্ত অপেক্ষা'], 'ধীর অংশকে বাকিদের টেনে নামাতে না দেওয়া।'],
      ['Retry-র ঝড়ে dependency আরও ডুবছে?', ['Backoff + jitter, retry সীমা', 'আরও বেশি বেশি retry', 'সবাই একসাথে retry', 'কিছু না, নিজে থামবে'], 'সবাই একসাথে retry করলে thundering herd।'],
      ['একটা ধীর feature বাকি সব thread খেয়ে নিচ্ছে?', ['Bulkhead: আলাদা pool', 'সবার জন্য একটা বড় pool', 'আরও server যোগ করা', 'Service restart করা'], 'জাহাজের কামরার মতো আলাদা।'],
    ],
  },
  boss: [
    ['Deploy-এর পর error বাড়ল?', ['দ্রুত rollback', 'অপেক্ষা, নিজে ঠিক হবে', 'আরেকটা deploy', 'Database restart'], 'আগে আগুন নেভানো, পরে কারণ।'],
    ['Kafka consumer lag বাড়ছে?', ['Consumer বাড়ান, ধীর কাজ খুঁজুন', 'Producer বন্ধ করে দিন', 'Topic মুছে নতুন বানান', 'কিছু না, নিজে থেকে কমবে'], 'Level ১৯ মনে করুন।'],
    ['Cache পুরো খালি, সবাই একসাথে DB-তে (thundering herd)?', ['Request coalescing আর ধীরে warm-up', 'আরও request পাঠিয়ে দ্রুত ভরা', 'Cache বন্ধ রেখে সব DB থেকে', 'DB কিছুক্ষণ বন্ধ রাখা'], 'একই key-র জন্য একজনই DB-তে যায়।'],
    ['Replica lag-এ user নিজের নতুন order দেখছে না?', ['নিজের লেখা master থেকে পড়া', 'Cache মুছে দেওয়া', 'কিছু না, একটু পরে দেখবে', 'Replica বন্ধ করা'], 'বাকিরা replica থেকেই পড়ুক।'],
    ['একটা region পুরো বন্ধ?', ['অন্য region-এ failover', 'অপেক্ষা, region ফিরবে', 'Data মুছে নতুন করে', 'কিছু না'], 'Level ১ থেকে শুরু হওয়া গল্পের শেষ।'],
  ],
});

export const l30 = level({
  id: 30, chapter: 6,
  title: 'Interview-এর দিন', concept: 'Final · ৪৫ মিনিটের interview',
  story: 'Interview-এর দিন',
  briefing: 'আজ আসল দিন। ৪৫ মিনিট, একটা খোলা প্রশ্ন, একজন interviewer। ৩০ level-এর সব জ্ঞান এক জায়গায়, আর সময় ভাগের কৌশল।',
  ref: refs.hub,
  predict: ['৪৫ মিনিটের interview-এ সময় ভাগ মোটামুটি?', ['৩–১০ / ১০–১৫ / ১০–২৫ / ৩–৫ মিনিট', '১–২ / ৫–৮ / ৩০–৩৫ / ২–৩ মিনিট', '১৫–২০ / ১০–১৫ / ৫–১০ / ৫ মিনিট', '৫ / ২৫–৩০ / ৫–১০ / ২–৩ মিনিট']],
  nodes: [
    ['ck', '৪৫ মিনিট', 'clock', 50, 14], ['s1', 'প্রয়োজন', 'step', 14, 56], ['s2', 'High-level', 'step', 38, 56], ['s3', 'Deep dive', 'step', 62, 56], ['s4', 'শেষ কথা', 'step', 86, 56],
  ],
  steps: [
    { text: 'প্রশ্ন করে scope, user আর scale বোঝা। অনুমান লিখে রাখা।', add: ['ck', 's1'], focus: ['s1'], badges: { s1: '৩–১০ মি' } },
    { text: 'Box diagram, API, data model; interviewer-এর সাথে মিলিয়ে নেওয়া।', add: ['s2'], focus: ['s2'], flow: [['s1', 's2']], badges: { s2: '১০–১৫ মি' } },
    { text: 'এবার গভীরে যাওয়ার পালা।', add: ['s3'], focus: ['s3'], ask: ['Deep dive-এ কত মিনিট?', ['১০–২৫', '১–২', '৪০', 'শূন্য']] },
    { text: 'দুই-তিনটা অংশে গভীরে: bottleneck আর trade-off।', focus: ['s3'], flow: [['s2', 's3']], badges: { s3: '১০–২৫ মি' } },
    { text: 'শেষ কয়েক মিনিট।', add: ['s4'], focus: ['s4'], ask: ['শেষ ধাপে কী বলবেন?', ['Bottleneck, error, scale, monitoring', 'নতুন একটা design শুরু করা', 'শুধু ধন্যবাদ জানিয়ে শেষ', 'আগের সবকিছু আবার বলা']] },
    { text: 'শেষে সারাংশ, নিজের design-এর দুর্বলতা নিজে বলা, পরের ধাপ।', focus: ['s4'], flow: [['s3', 's4']], badges: { s4: '৩–৫ মি' } },
  ],
  summary: ['প্রয়োজন → high-level → deep dive → শেষ কথা', 'সময়: ৩–১০ / ১০–১৫ / ১০–২৫ / ৩–৫ মিনিট', 'অনুমান আর trade-off খোলাখুলি; দুর্বলতা নিজে বলা'],
  play: {
    kind: 'missions', intro: 'Interview ঘরের তিনটা মুহূর্ত।',
    missions: [
      ['Interviewer বলল "design a chat app"। আপনার প্রথম বাক্য?', ['Scope আর scale জিজ্ঞেস করা', 'সাথে সাথে database-এর নাম বলা', 'Diagram আঁকা শুরু করা', 'চুপচাপ কয়েক মিনিট ভাবা'], 'আগে scope।'],
      ['Interviewer একটা অংশে বারবার প্রশ্ন করছে?', ['সেটাই deep dive, সেদিকে যান', 'উপেক্ষা করে নিজের পরিকল্পনা', 'অন্য প্রসঙ্গে যান', 'তর্ক করুন'], 'সংকেত বুঝুন।'],
      ['নিশ্চিত নন এমন অংশে?', ['অনুমান আর trade-off খোলাখুলি', 'নিশ্চিতভাবে বানিয়ে বলা', 'এড়িয়ে পরের অংশে যাওয়া', 'চুপ থাকা'], 'সৎ চিন্তার প্রক্রিয়াই নম্বর পায়।'],
    ],
  },
  boss: [
    ['Burst চলবে, কিন্তু গড় হার বাঁধা। কোন জিনিস?', ['Token bucket', 'Consistent hashing', 'Geohash', 'Outbox'], 'Level ৪।'],
    ['Cache server যোগ করলে কম key সরাতে?', ['Consistent hashing', 'Token bucket limiter', 'Saga pattern', 'Bloom filter'], 'Level ৫।'],
    ['কাছের rider খুঁজতে?', ['Geohash/quadtree', 'Snowflake ID', 'Trie', '2PC'], 'Level ১৬।'],
    ['Payment retry-তে দুবার কাটা ঠেকাতে?', ['Idempotency key', 'Vector clock', 'CDN', 'Sharding'], 'Level ২৬।'],
    ['DB-তে লেখা আর event পাঠানো একসাথে নিশ্চিত?', ['Transactional outbox', 'Leaky bucket', 'Pub/sub channel', 'Base 62 code'], 'Level ২৯।'],
  ],
});
