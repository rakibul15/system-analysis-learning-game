import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ৬ · বড় দিনের প্রস্তুতি — architecture guide আর final */

export const l29 = level({
  id: 29, chapter: 6,
  title: 'টিকে থাকার নিয়ম', concept: 'Outbox · Circuit breaker · Resilience',
  story: 'পুরো system টিকিয়ে রাখা',
  briefing: 'সব আলাদা অংশ এখন জোড়া লাগানো। কিন্তু একটা ধীর dependency পুরো site ধীর করে দিচ্ছে, আর DB-তে order আছে অথচ event যায়নি। Production-এ টিকে থাকার নিয়মগুলো।',
  ref: refs.p7,
  predict: ['Order DB-তে লেখা আর Kafka-তে event পাঠানো দুই আলাদা কাজ। মাঝে crash হলে?', ['DB-তে order আছে কিন্তু event যায়নি (বা উল্টো)', 'কিছু না', 'দুটোই হারায়', 'দুটোই হয়']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['db', 'DB: orders', 'db', 36, 28], ['ob', 'DB: outbox', 'db', 36, 74], ['rl', 'Relay', 'worker', 64, 74],
    ['kq', 'Kafka', 'queue', 90, 74], ['dep', 'Payment dependency', 'service', 64, 22], ['cb', 'Circuit breaker', 'lb', 90, 22],
  ],
  steps: [
    { text: 'Outbox: order আর event একই DB transaction-এ লেখা।', add: ['svc', 'db', 'ob'], flow: [['svc', 'db'], ['svc', 'ob']], badges: { db: 'এক transaction' } },
    { text: 'Relay outbox পড়ে Kafka-তে পাঠায়, পাঠানো হলে চিহ্ন দেয়।', add: ['rl', 'kq'], flow: [['ob', 'rl'], ['rl', 'kq']] },
    { text: 'Relay crash করল।', down: ['rl'], ask: ['এখন কী হয়?', ['Event outbox-এ থেকে যায়; relay ফিরে পাঠায় (duplicate হতে পারে)', 'Event হারায়', 'Order মুছে যায়', 'DB crash']] },
    { text: 'At-least-once: relay ফিরে পাঠায়; consumer idempotent হলে নিরাপদ।', ok: ['rl'], flow: [['rl', 'kq']] },
    { text: 'Payment dependency ধীর; প্রতিটা request অপেক্ষায় thread আটকাচ্ছে।', add: ['dep', 'cb'], down: ['dep'], flow: [['svc', 'cb']], badges: { cb: 'closed' } },
    { text: 'Error হার অনেক বেড়ে গেল।', badges: { cb: '?' }, ask: ['Circuit breaker কী করে?', ['Open: কিছুক্ষণ সরাসরি fail/fallback, dependency-কে বিশ্রাম', 'আরও request পাঠায়', 'Server restart', 'কিছু না']] },
    { text: 'Open অবস্থায় সাথে সাথে fallback। কিছু পরে half-open: অল্প request দিয়ে পরীক্ষা, সফল হলে আবার closed।', badges: { cb: 'open → half-open' }, ok: ['cb'] },
  ],
  summary: ['Outbox: DB আর event একই transaction; relay পরে পাঠায়', 'Circuit breaker: closed → open → half-open', 'Timeout, backoff সহ retry, bulkhead: ভাঙন ছড়াতে না দেওয়া'],
  play: {
    kind: 'missions', intro: 'তিনটা incident। প্রথম কাজটা বাছুন।',
    missions: [
      ['এক dependency ধীর, পুরো site ধীর। প্রথম কাজ?', ['Timeout আর circuit breaker', 'আরও thread', 'Retry দ্বিগুণ', 'অপেক্ষা'], 'ধীর অংশকে বাকিদের টেনে নামাতে না দেওয়া।'],
      ['Retry-র ঝড়ে dependency আরও ডুবছে?', ['Exponential backoff + jitter, retry-র সীমা', 'আরও retry', 'সব একসাথে', 'কিছু না'], 'সবাই একসাথে retry করলে thundering herd।'],
      ['একটা ধীর feature বাকি সব thread খেয়ে নিচ্ছে?', ['Bulkhead: আলাদা thread pool', 'একটা pool', 'Server বাড়ানো', 'Restart'], 'জাহাজের কামরার মতো আলাদা।'],
    ],
  },
  boss: [
    ['Deploy-এর পর error বাড়ল?', ['দ্রুত rollback; canary বা feature flag', 'অপেক্ষা', 'আরও deploy', 'DB মুছুন'], 'আগে আগুন নেভানো, পরে কারণ।'],
    ['Kafka consumer lag বাড়ছে?', ['Consumer বাড়ান (partition পর্যন্ত), ধীর কাজ খুঁজুন', 'Producer বন্ধ', 'Topic মুছুন', 'কিছু না'], 'Level ১৯ মনে করুন।'],
    ['Cache পুরো খালি, সবাই একসাথে DB-তে (thundering herd)?', ['Request coalescing/lock আর ধীরে warm-up', 'আরও request', 'Cache বন্ধ', 'DB বন্ধ'], 'একই key-র জন্য একজনই DB-তে যায়।'],
    ['Replica lag-এ user নিজের নতুন order দেখছে না?', ['নিজের লেখা master থেকে পড়া (read-your-writes)', 'Cache মুছে', 'কিছু না', 'Replica বন্ধ'], 'বাকিরা replica থেকেই পড়ুক।'],
    ['একটা region পুরো বন্ধ?', ['অন্য region-এ failover (DNS), data আগে থেকে replicate', 'অপেক্ষা', 'Data মুছে', 'কিছু না'], 'Level ১ থেকে শুরু হওয়া গল্পের শেষ।'],
  ],
});

export const l30 = level({
  id: 30, chapter: 6,
  title: 'Interview-এর দিন', concept: 'Final · ৪৫ মিনিটের interview',
  story: 'Interview-এর দিন',
  briefing: 'আজ আসল দিন। ৪৫ মিনিট, একটা খোলা প্রশ্ন, একজন interviewer। ৩০ level-এর সব জ্ঞান এক জায়গায়, আর সময় ভাগের কৌশল।',
  ref: refs.hub,
  predict: ['৪৫ মিনিটের interview-এ সময় ভাগ মোটামুটি?', ['প্রয়োজন ৩–১০, high-level ১০–১৫, deep dive ১০–২৫, শেষ ৩–৫ মিনিট', 'সবটা deep dive', 'সবটা প্রশ্ন করা', 'প্রথম ৩০ মিনিট চুপচাপ ভাবা']],
  nodes: [
    ['ck', '৪৫ মিনিট', 'clock', 50, 14], ['s1', 'প্রয়োজন', 'step', 14, 56], ['s2', 'High-level', 'step', 38, 56], ['s3', 'Deep dive', 'step', 62, 56], ['s4', 'শেষ কথা', 'step', 86, 56],
  ],
  steps: [
    { text: 'প্রশ্ন করে scope, user আর scale বোঝা। অনুমান লিখে রাখা।', add: ['ck', 's1'], focus: ['s1'], badges: { s1: '৩–১০ মি' } },
    { text: 'Box diagram, API, data model; interviewer-এর সাথে মিলিয়ে নেওয়া।', add: ['s2'], focus: ['s2'], flow: [['s1', 's2']], badges: { s2: '১০–১৫ মি' } },
    { text: 'এবার গভীরে যাওয়ার পালা।', add: ['s3'], focus: ['s3'], ask: ['Deep dive-এ কত মিনিট?', ['১০–২৫', '১–২', '৪০', 'শূন্য']] },
    { text: 'দুই-তিনটা অংশে গভীরে: bottleneck আর trade-off।', focus: ['s3'], flow: [['s2', 's3']], badges: { s3: '১০–২৫ মি' } },
    { text: 'শেষ কয়েক মিনিট।', add: ['s4'], focus: ['s4'], ask: ['শেষ ধাপে কী বলবেন?', ['Bottleneck, error সামলানো, scale বাড়লে কী বদলাবে, monitoring', 'নতুন design শুরু', 'কিছু না', 'বেতনের কথা']] },
    { text: 'শেষে সারাংশ, নিজের design-এর দুর্বলতা নিজে বলা, পরের ধাপ।', focus: ['s4'], flow: [['s3', 's4']], badges: { s4: '৩–৫ মি' } },
  ],
  summary: ['প্রয়োজন → high-level → deep dive → শেষ কথা', 'সময়: ৩–১০ / ১০–১৫ / ১০–২৫ / ৩–৫ মিনিট', 'অনুমান আর trade-off খোলাখুলি; দুর্বলতা নিজে বলা'],
  play: {
    kind: 'missions', intro: 'Interview ঘরের তিনটা মুহূর্ত।',
    missions: [
      ['Interviewer বলল "design a chat app"। আপনার প্রথম বাক্য?', ['"কোনটা জরুরি: ১-১ না group, কতজন user?" জিজ্ঞেস করা', 'Database-এর নাম বলা', 'Diagram আঁকা শুরু', 'চুপ থাকা'], 'আগে scope।'],
      ['Interviewer একটা অংশে বারবার প্রশ্ন করছে?', ['সেটাই deep dive-এর জায়গা, সেদিকে যান', 'উপেক্ষা', 'অন্য প্রসঙ্গে যান', 'তর্ক'], 'সংকেত বুঝুন।'],
      ['নিশ্চিত নন এমন অংশে?', ['অনুমান আর trade-off খোলাখুলি বলা', 'বানিয়ে বলা', 'এড়িয়ে যাওয়া', 'চুপ থাকা'], 'সৎ চিন্তার প্রক্রিয়াই নম্বর পায়।'],
    ],
  },
  boss: [
    ['Burst চলবে, কিন্তু গড় হার বাঁধা। কোন জিনিস?', ['Token bucket rate limiter', 'Consistent hashing', 'Geohash', 'Outbox'], 'Level ৪।'],
    ['Cache server যোগ করলে কম key সরাতে?', ['Consistent hashing', 'Token bucket', 'Saga', 'Bloom filter'], 'Level ৫।'],
    ['কাছের rider খুঁজতে?', ['Geohash বা quadtree', 'Snowflake', 'Trie', '2PC'], 'Level ১৬।'],
    ['Payment retry-তে দুবার কাটা ঠেকাতে?', ['Idempotency key', 'Vector clock', 'CDN', 'Sharding'], 'Level ২৬।'],
    ['DB-তে লেখা আর event পাঠানো একসাথে নিশ্চিত?', ['Transactional outbox', 'Leaky bucket', 'Pub/sub', 'Base 62'], 'Level ২৯।'],
  ],
});
