import { dur, num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 12 (Stream Processing), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-12',
  goals: [
    'Event stream কীভাবে বহন করা হয়, আর message queue (AMQP-ধরনের) আর log-ভিত্তিক broker (Kafka-ধরনের) আলাদা করে বলতে পারবেন।',
    'Change data capture আর event sourcing দিয়ে database আর অন্য system কীভাবে সমান রাখা যায় ব্যাখ্যা করতে পারবেন।',
    'Event time বনাম processing time, window, stream join আর fault tolerance (exactly-once) বলতে পারবেন।',
  ],
  related: ['streams', 'replication'],
  blocks: [
    { kind: 'p', text: 'Batch-এর সমস্যা: ফল আসে পরের দিন। কিন্তু অনেক কাজে data আসতেই কাজ চাই: নতুন order এলেই SMS, গাড়ির অবস্থান বদলাতেই map। Stream processing মানে সীমাহীন, অনবরত আসা event-এর ওপর কাজ করা। Batch-এর মতোই, শুধু input-এর শেষ নেই, তাই "সব পড়ে ফেলে শেষ" নেই; চলতেই থাকে।' },

    { kind: 'h', text: 'Event পাঠানো: broker-এর দুই ধরন' },
    { kind: 'p', text: 'Event হলো কিছু একটা ঘটেছে তার ছোট, অপরিবর্তনীয় রেকর্ড। Producer পাঠায়, consumer নেয়, মাঝে broker। Broker-এর দুটো আলাদা চরিত্র আছে।' },
    { kind: 'table', head: ['', 'ঐতিহ্যবাহী message queue', 'Log-ভিত্তিক broker (Kafka-ধরনের)'], rows: [
      ['বার্তা নেওয়ার পর', 'ack এলে মুছে যায়', 'থাকে (মেয়াদ বা মাপ পর্যন্ত), শুধু consumer-এর offset এগোয়'],
      ['ক্রম', 'একাধিক consumer-এ ক্রম ভাঙতে পারে', 'প্রতি partition-এর ভেতরে ক্রম বজায়'],
      ['আবার পড়া', 'যায় না', 'যায়: offset পিছিয়ে নতুন করে পড়া'],
      ['কাজে লাগে', 'ভারী task কর্মীদের মধ্যে ভাগ, ক্রম গুরুত্বহীন', 'ঘটনার প্রবাহ, ক্রম গুরুত্বপূর্ণ, একাধিক consumer, পুনরায় চালানো'],
    ] },
    { kind: 'flow', label: 'Log-ভিত্তিক broker: partition-এর ভেতরে ক্রম, প্রতি consumer নিজের offset-এ', nodes: [
      { id: 'p', label: 'Producer', x: 12, y: 17, w: 20 },
      { id: 'a', label: 'Partition ১', x: 50, y: 6, w: 22 },
      { id: 'b', label: 'Partition ২', x: 50, y: 28, w: 22 },
      { id: 'c1', label: 'Consumer ক', x: 88, y: 6, w: 20 },
      { id: 'c2', label: 'Consumer খ', x: 88, y: 28, w: 20 },
    ], links: [
      { from: 'p', to: 'a', rate: 4 },
      { from: 'p', to: 'b', rate: 4 },
      { from: 'a', to: 'c1', rate: 4 },
      { from: 'b', to: 'c2', rate: 4 },
    ], h: 34 },
    { kind: 'p', text: 'Log-ভিত্তিক broker দেখতে বড় একটা append-only file: প্রতিটা partition একটা লগ, প্রতি event-এর একটা offset সংখ্যা। Consumer শুধু মনে রাখে সে কোন offset পর্যন্ত পড়েছে। ভাঙলে ফিরে এসে সেখান থেকে ধরে। এক group-এর ভেতরে প্রতি partition ঠিক একজন consumer-এর, তাই একই partition-এর ক্রম বজায়। দাম: partition সংখ্যাই সমান্তরালতার সীমা, আর একটা ধীর বার্তা সেই partition-এর পেছনের সবাইকে আটকায় (head-of-line blocking)।' },
    { kind: 'calc', label: 'Consumer পিছিয়ে পড়লে backlog কত', inputs: [
      { id: 'in', label: 'প্রতি সেকেন্ডে event আসে', min: 100, max: 100_000, step: 100, value: 10_000 },
      { id: 'out', label: 'Consumer প্রতি সেকেন্ডে শেষ করে', min: 100, max: 100_000, step: 100, value: 8_000 },
      { id: 'min', label: 'কতক্ষণ এভাবে চলল', min: 1, max: 240, step: 1, value: 30, unit: 'মিনিট' },
    ], out: (v) => {
      const lag = Math.max(0, (v.in! - v.out!) * v.min! * 60);
      const catchUp = v.out! > v.in! ? lag / (v.out! - v.in!) : Infinity;
      return [
        { label: 'জমা backlog', value: `${num(lag)} event`, bar: Math.min(1, lag / 20_000_000), tone: lag > 1_000_000 ? 'bad' : 'ok', how: `(${num(v.in!)} − ${num(v.out!)}) × ${num(v.min! * 60)} সেকেন্ড` },
        { label: 'পুরনো event-এর দেরি', value: v.out! > 0 ? dur(lag / v.out!) : '—', how: 'backlog ÷ consumer-এর গতি: সবচেয়ে পুরোনো event এখন যে দেরিতে পৌঁছায়' },
        { label: 'ধরে ফেলতে সময়', value: Number.isFinite(catchUp) ? dur(catchUp) : 'কখনো না', tone: Number.isFinite(catchUp) ? 'ok' : 'bad', how: 'Consumer আসা-হারের চেয়ে দ্রুত হলে তবেই ধরা যায়' },
      ];
    } },

    { kind: 'h', text: 'Database আর stream' },
    { kind: 'p', text: 'এক data প্রায়ই একাধিক জায়গায় লাগে: database, search index, cache, warehouse। "দুই জায়গায় লিখে দাও" প্রথমে সহজ মনে হলেও (dual write) ভুল: দুই লেখা একসাথে ঘটে না, একটা সফল আর অন্যটা ব্যর্থ হলে দুই জায়গা মেলে না, আর দুই লেখকের ক্রম আলাদা হলে চিরস্থায়ী অমিল।' },
    { kind: 'p', text: 'সমাধান change data capture (CDC): database-এর নিজের পরিবর্তনের log (replication log) পড়ে প্রতিটা বদলকে event হিসেবে stream-এ পাঠানো। তখন database-ই একমাত্র লেখা-জায়গা, বাকি সবাই তার অনুসারী, একই ক্রমে।' },
    { kind: 'seq', label: 'CDC: database বদলালে search index নিজে নিজে সমান থাকে', actors: ['App', 'Database', 'CDC → Stream', 'Search index'], steps: [
      { from: 0, to: 1, msg: 'parcel-এর অবস্থা বদলালাম', note: 'App শুধু database-এ লেখে। আর কোথাও নয়।' },
      { from: 1, to: 1, msg: 'নিজের log-এ পরিবর্তনের রেকর্ড', tone: 'ok' },
      { from: 1, to: 2, msg: 'CDC সেই log পড়ে event বানাল', note: 'ক্রম database-এর মতোই।' },
      { from: 2, to: 3, msg: 'index-এ প্রয়োগ', tone: 'ok', note: 'Index কিছুটা পিছিয়ে (async), কিন্তু শেষে মেলে। কখনো ভিন্ন ক্রমে নয়।' },
    ] },
    { kind: 'list', items: [
      'Log compaction: একই key-র পুরোনো event মুছে শুধু সর্বশেষটা রাখা। তাতে log থেকে পুরো database-এর বর্তমান অবস্থা আবার বানানো যায়, আর লগ অনন্ত বাড়ে না।',
      'Event sourcing: শুরু থেকেই event-কে সত্য মানা (ডেটা মডেলের অধ্যায়ে দেখা)। CDC-র উল্টো দিক: ওখানে database সত্য, event তার ছায়া।',
      'অপরিবর্তনীয়তার সুবিধা: ইতিহাস থেকে নতুন view বানানো যায়, ভুল হলে ঠিক করে আবার চালানো যায়। অসুবিধা: ব্যক্তিগত তথ্য মোছা কঠিন, আর খুব ঘন বদলালে log বিশাল।',
    ] },

    { kind: 'h', text: 'Stream প্রক্রিয়া করা' },
    { kind: 'p', text: 'Stream-এ কী করা যায়: নতুন stream বানানো (filter, রূপান্তর), data-র ওপর নজর রাখা (এক মিনিটে ৫০টার বেশি failed delivery হলে alert), অবস্থা জমা রাখা (প্রতি merchant-এর আজকের যোগফল), বা derived view হালনাগাদ করা। Complex event processing-এ ছাঁচ লিখে রাখা, তার সাথে মিললে সংকেত। Search stream-এ উল্টো: query আগে থেকে রাখা, ঢুকে আসা event তার সাথে মেলানো।' },

    { kind: 'h', text: 'সময়: কখন ঘটল, না কখন পেলাম' },
    { kind: 'p', text: 'Window করে গোনার সময় প্রশ্ন: কোন সময় ধরব? Processing time: কখন system event-টা পেল। সহজ, কিন্তু দেরিতে আসা event ভুল জানালায় পড়ে। Event time: event আসলে কখন ঘটেছিল। সঠিক, কিন্তু কখনো কখনো দেরিতে (ফোন offline ছিল) আসা event-এর জন্য কতক্ষণ অপেক্ষা করবেন? একটা watermark ধরেন: "এর আগের সব event এসে গেছে মনে করি", আর তার পরে আসা late event হয় ফেলে দেওয়া, নয় জানালা সংশোধন করা।' },
    { kind: 'seq', label: 'Event time বনাম processing time: ফোন offline ছিল', actors: ['Rider-এর ফোন', 'Stream job', 'Window ১০:০০–১০:০৫'], steps: [
      { from: 0, to: 0, msg: '১০:০২-এ delivery, কিন্তু signal নেই', note: 'Event-এর নিজের সময় ১০:০২।' },
      { from: 0, to: 1, msg: '১০:০৯-এ signal ফিরল, event পৌঁছাল', note: 'Processing time ১০:০৯।' },
      { from: 1, to: 2, msg: 'Processing time ধরলে: ১০:০৫–১০:১০ জানালায় গেল', tone: 'bad', note: 'ভুল জানালা: ১০:০০–১০:০৫-এর সংখ্যা কম দেখাল।' },
      { from: 1, to: 2, msg: 'Event time ধরলে: ১০:০০–১০:০৫ জানালায়, যদি এখনো খোলা', tone: 'ok', note: 'সঠিক। দাম: জানালা বন্ধ করতে দেরি, আর কতক্ষণ অপেক্ষা তার সিদ্ধান্ত।' },
    ] },
    { kind: 'list', items: [
      'Window-এর ধরন: tumbling (পরপর, অমিল নেই, প্রতি ৫ মিনিট), hopping (ওভারল্যাপ, প্রতি মিনিটে শেষ ৫ মিনিট), sliding (প্রতি event-এর চারপাশে), session (একজনের কাজের ফাঁকে ফাঁকে, ৩০ মিনিট চুপ থাকলে শেষ)।',
      'Stream join: stream-stream (দুই stream-এর event সময়ের কাছাকাছি জুড়া, যেমন বিজ্ঞাপন দেখা আর ক্লিক), stream-table (প্রতি event-কে একটা table-এর সর্বশেষ মান দিয়ে সমৃদ্ধ করা, table নিজে CDC দিয়ে হালনাগাদ), table-table (দুই table-এর পরিবর্তন জোড়া)।',
      'Join-এর ঝামেলা: ক্রম। একই দাবির দুই event ভিন্ন stream-এ ভিন্ন ক্রমে এলে ফল বদলাতে পারে, তাই ক্রমের ওপর নির্ভর করে এমন join পুনরায় চালালে ভিন্ন ফল দিতে পারে।',
    ] },

    { kind: 'h', text: 'Fault tolerance' },
    { kind: 'p', text: 'Batch-এ ব্যর্থ task আবার চালানো সহজ, কারণ input সীমিত আর অপরিবর্তনীয়। Stream-এ কাজ চলছেই। উপায়: নিয়মিত checkpoint (অবস্থার ছবি আর কোন offset পর্যন্ত পড়া) রাখা; ভাঙলে শেষ checkpoint-এ ফিরে আবার চালানো। কিন্তু ফেরার ফলে checkpoint-এর পরের কিছু event দুবার প্রক্রিয়া হতে পারে।' },
    { kind: 'list', items: [
      'Exactly-once বলতে আসলে বোঝায়: প্রভাব একবারের মতোই দেখায়, যদিও ভেতরে একই event একাধিকবার চলতে পারে।',
      'দুই উপায়: (ক) একই transaction-এ ফল আর offset অগ্রগতি একসাথে সংরক্ষণ, ব্যর্থ হলে দুটোই বাতিল; (খ) idempotent operation: একই কাজ দুবার চললেও ফল একই (যেমন "stock = ৭" লেখা, "stock − ১" নয়, বা event ID দেখে ডুপ্লিকেট বাদ)।',
      'বাইরের জগতে পাঠানো প্রভাব (SMS, ইমেইল) ফেরানো যায় না, তাই সেখানে idempotency key ছাড়া উপায় নেই।',
    ] },

    { kind: 'story', title: 'দুইবার চলা SMS', steps: [
      'ParcelGo-র stream job প্রতি "ডেলিভারড" event-এ SMS পাঠায়, প্রতি ১,০০০ event-এ checkpoint।',
      'Job ভাঙল। শেষ checkpoint থেকে ফিরে চালু হতেই আগের ৬০০টা event আবার প্রক্রিয়া হলো।',
      '৬০০ জন ক্রেতা একই SMS দুবার পেলেন।',
    ], fix: 'প্রতিটা SMS-এ event ID থেকে একটা idempotency key বানান; SMS gateway বা আমাদের নিজস্ব "পাঠানো হয়েছে" table দেখে ডুপ্লিকেট বাদ দিন। Checkpoint-এ ফিরলে আবার চললেও প্রভাব একবার।' },

    { kind: 'mistakes', items: [
      'Dual write: database আর search index-এ আলাদা আলাদা লেখা। একটা ব্যর্থ হলে বা ক্রম ভিন্ন হলে চিরস্থায়ী অমিল।',
      'Processing time দিয়ে window করে দেরিতে আসা event-এর ভুল জানালা না ভাবা।',
      '"Exactly-once" শুনে ধরে নেওয়া ভেতরে কিছুই দুবার চলে না; বাইরের প্রভাবে idempotency ছাড়া চলে না।',
      'Consumer-এর ধীর হওয়া নজরে না রাখা: backlog জমে ফল ঘণ্টা-দেরি হয়ে যায়।',
    ] },
    { kind: 'check', items: [
      { q: 'Message queue আর log-ভিত্তিক broker-এর মূল তফাত?', a: 'Queue-তে ack-এর পর বার্তা মুছে যায়, আবার পড়া যায় না। Log-ভিত্তিক broker event রেখে দেয়, consumer শুধু offset এগোয়, তাই আবার পড়া যায় আর partition-এর ভেতরে ক্রম থাকে।' },
      { q: 'কেন database আর index-এ দুটো আলাদা লেখার চেয়ে CDC ভালো?', a: 'দুই লেখা একসাথে ঘটে না, একটা ব্যর্থ হলে বা ক্রম ভিন্ন হলে অমিল স্থায়ী। CDC-তে database-ই একমাত্র লেখা-জায়গা, আর অন্যরা তার log একই ক্রমে অনুসরণ করে।' },
      { q: 'Event time আর processing time-এর পার্থক্য, আর watermark কী?', a: 'Event time: ঘটনা আসলে কখন ঘটেছে। Processing time: system কখন পেল। Watermark বলে "এই সময়ের আগের সব event এসে গেছে ধরি", যাতে window বন্ধ করা যায়; তার পরে আসা late event আলাদাভাবে সামলাতে হয়।' },
      { q: 'Exactly-once কীভাবে সম্ভব?', a: 'ভেতরে event একাধিকবার চললেও প্রভাব একবার: হয় ফল আর offset একই transaction-এ সংরক্ষণ করে, নয়তো operation idempotent বানিয়ে (ID দেখে ডুপ্লিকেট বাদ)।' },
    ] },
  ],
};
