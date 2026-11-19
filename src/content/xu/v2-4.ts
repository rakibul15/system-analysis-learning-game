import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 4 (Distributed Message Queue), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-4',
  goals: [
    'Topic, partition, consumer group আর offset কী, আর কেন partition-ই বাড়ার একক বলতে পারবেন।',
    'ack মোড (০, ১, সব) আর ISR দিয়ে "বার্তা হারায় কিনা" বলতে পারবেন।',
    'At-most-once, at-least-once, exactly-once: কোনটা কীভাবে হয় আর কোনটার দাম কত বলতে পারবেন।',
  ],
  related: ['streams', 'replication', 'consensus'],
  blocks: [
    { kind: 'p', text: 'Message queue দুই পক্ষের মাঝে বার্তার ডাকবাক্স: এক পক্ষ (producer) বার্তা রাখে, অন্য পক্ষ (consumer) নিজের সময়ে তুলে নেয়। এতে দুজন একে অপরের গতির উপর নির্ভর করে না: এক পক্ষ ধীর হলে বার্তা জমে, ভাঙলে বার্তা হারায় না। ParcelGo-র উদাহরণ: order জমা পড়লে ছবির প্রসেস, SMS, hub-এ জানানো: সব আলাদা consumer। Kafka, RocketMQ-র মতো system এই ধরনের।' },
    { kind: 'list', items: [
      'মাঝখানে রাখা: সরাসরি ডাকলে প্রাপক ডাউন থাকলে বার্তা হারায়, queue থাকলে জমে।',
      'ভিড় সামলানো: হঠাৎ ভিড় এলে queue শোষে নেয়, consumer নিজের গতিতে।',
      'একটা বার্তা অনেকের জন্য: একই order-কে SMS, hub, analytics সবাই পায়।',
      'বার্তার ক্রম: অন্তত একই বিষয়ের মধ্যে।',
    ] },

    { kind: 'h', text: 'Topic আর partition' },
    { kind: 'p', text: 'বার্তা রাখা হয় একটা topic-এ (যেমন "orders")। একটা topic-এ সব বার্তা এক জায়গায় রাখলে সেই machine-ই বাড়ার সীমা। তাই topic-কে ভাগ করা হয় partition-এ। প্রতিটা partition একটা আলাদা লগ ফাইল: শুধু শেষে জুড়ে যায়, আর প্রতিটা বার্তার একটা ক্রমিক সংখ্যা (offset) আছে। ভাগ করলে partition অনেক machine-এ ছড়ায়, লেখা আর পড়া একসাথে বাড়ে।' },
    { kind: 'seq', label: 'বার্তা কোন partition-এ: key ধরে, তাই একই order-এর বার্তা একই partition-এ, ক্রমে', actors: ['Producer', 'Topic "orders"', 'Partition ০', 'Partition ১'], steps: [
      { from: 0, to: 1, msg: 'key = order-501: "জমা পড়েছে"', note: 'Key-র hash ঠিক করে কোন partition।' },
      { from: 1, to: 2, msg: 'partition ০ (offset ১৪২)', tone: 'ok' },
      { from: 0, to: 1, msg: 'key = order-777: "জমা পড়েছে"' },
      { from: 1, to: 3, msg: 'partition ১ (offset ৯১)', tone: 'ok', note: 'আলাদা key, আলাদা partition, সমান্তরালে।' },
      { from: 0, to: 1, msg: 'key = order-501: "পাঠানো হয়েছে"' },
      { from: 1, to: 2, msg: 'আবার partition ০ (offset ১৪৩)', tone: 'ok', note: 'একই key মানে একই partition, তাই "জমা" সবসময় "পাঠানো"-র আগে। ক্রম টেকে।' },
    ] },
    { kind: 'tip', title: 'ক্রম শুধু partition-এর ভেতরে', text: 'দুটো আলাদা partition-এর মধ্যে ক্রমের কোনো গ্যারান্টি নেই। তাই যে বার্তাগুলোর ক্রম জরুরি (একই order-এর ধাপ), তাদের একই key দিন, যাতে একই partition-এ যায়।' },

    { kind: 'h', text: 'Consumer group' },
    { kind: 'p', text: 'একই কাজের কয়েকজন consumer মিলে একটা group। Topic-এর প্রতিটা partition group-এর শুধু একজনকে দেওয়া হয়। এতে একই বার্তা group-এ দুবার প্রক্রিয়া হয় না, আর consumer বাড়ালে কাজ ভাগ হয়। কিন্তু partition-এর চেয়ে বেশি consumer থাকলে বাড়তিরা বসে থাকে।' },
    { kind: 'calc', label: 'Consumer আর partition মেলানো', inputs: [
      { id: 'p', label: 'Partition', min: 1, max: 24, step: 1, value: 6 },
      { id: 'c', label: 'Consumer (এক group-এ)', min: 1, max: 24, step: 1, value: 4 },
      { id: 'tps', label: 'এক consumer পারে', min: 100, max: 5000, step: 100, value: 1000, unit: '/সেকেন্ড' },
    ], out: (v) => {
      const active = Math.min(v.p!, v.c!);
      const idle = Math.max(0, v.c! - v.p!);
      const per = Math.ceil(v.p! / v.c!);
      return [
        { label: 'কাজ করছে', value: `${num(active)} জন`, how: `min(partition ${num(v.p!)}, consumer ${num(v.c!)})`, tone: 'ok' },
        { label: 'বসে আছে', value: `${num(idle)} জন`, tone: idle > 0 ? 'bad' : undefined, how: idle > 0 ? 'Partition-এর চেয়ে বেশি consumer: বাড়তিরা কিছু পায় না' : 'সবাই কিছু না কিছু পাচ্ছে' },
        { label: 'সবচেয়ে ব্যস্ত consumer-এর partition', value: `${num(per)}টা`, how: `⌈${num(v.p!)} ÷ ${num(v.c!)}⌉` },
        { label: 'মোট ক্ষমতা', value: `${num(active * v.tps!)}/সেকেন্ড`, how: `${num(active)} × ${num(v.tps!)}`, bar: Math.min(1, (active * v.tps!) / 24000) },
      ];
    } },
    { kind: 'list', items: [
      'আলাদা group আলাদা কাজ: SMS group, analytics group: প্রতিটা group পুরো topic-এর সব বার্তা পায় আলাদাভাবে।',
      'Offset: প্রতিটা group প্রতিটা partition-এ কোন পর্যন্ত পড়েছে মনে রাখে (queue-র নিজের এক store-এ)। Consumer মরলে নতুন consumer সেখান থেকেই ধরে।',
      'Rebalance: consumer যোগ বা বাদ হলে partition নতুন করে বিলি; সামান্য থামা।',
    ] },

    { kind: 'h', text: 'বার্তা সংরক্ষণ' },
    { kind: 'list', items: [
      'Partition disk-এ শুধু শেষে জুড়ে লেখা: পরপর disk লেখা দ্রুত (random নয়)।',
      'বড় ফাইল টুকরো (segment) করে: পুরোনো segment মুছতে সহজ।',
      'পড়ার সময় OS-এর page cache আর zero copy: disk থেকে network-এ সোজা, বার্তা copy না করে।',
      'মেয়াদ: বার্তা পড়া হলেই মোছে না; নির্দিষ্ট দিন বা আকার পর্যন্ত থাকে। তাই নতুন consumer পুরোনো থেকে শুরু করতে পারে, বা আবার চালানো যায়।',
      'বার্তার ছোট batch: প্রতিটা আলাদা না পাঠিয়ে কয়েকটা একসাথে: network আর disk উভয়েই দ্রুত। দাম: একটু দেরি।',
    ] },

    { kind: 'h', text: 'কপি আর ISR' },
    { kind: 'p', text: 'প্রতিটা partition-এর কপি (replica) থাকে আলাদা machine-এ। একটা leader (এটাই লেখা আর পড়ার জায়গা), বাকিরা follower যারা leader থেকে নকল করে। যে follower পিছিয়ে নেই তাদের তালিকাকে বলে ISR (in-sync replicas)। Leader গেলে ISR-এর একজন নতুন leader।' },
    { kind: 'seq', label: 'ack = সব: লেখা সফল শুধু যখন ISR-এর সবাই পেয়েছে', actors: ['Producer', 'Leader', 'Follower ক', 'Follower খ'], steps: [
      { from: 0, to: 1, msg: 'বার্তা: order-501' },
      { from: 1, to: 2, msg: 'নকল করো' },
      { from: 1, to: 3, msg: 'নকল করো' },
      { from: 2, to: 1, msg: 'পেয়েছি', tone: 'ok' },
      { from: 3, to: 1, msg: 'পেয়েছি', tone: 'ok' },
      { from: 1, to: 0, msg: 'ack: সফল', tone: 'ok', note: 'এখন leader মরলেও বার্তা অন্য কপিতে আছে।' },
    ] },
    { kind: 'table', head: ['ack', 'কখন সফল বলে', 'লাভ', 'ঝুঁকি'], rows: [
      ['০', 'পাঠিয়েই, উত্তরের অপেক্ষা না করে', 'সবচেয়ে দ্রুত', 'হারাতে পারে: কেউ জানেও না'],
      ['১', 'শুধু leader পেলে', 'দ্রুত, মাঝামাঝি', 'Leader নকলের আগেই মরলে বার্তা হারায়'],
      ['সব (ISR)', 'ISR-এর সবাই পেলে', 'হারানো প্রায় অসম্ভব', 'ধীর: ধীরতম follower-এর গতি'],
    ] },

    { kind: 'h', text: 'কতবার পৌঁছাবে' },
    { kind: 'table', head: ['প্রতিশ্রুতি', 'মানে', 'কীভাবে', 'কখন'], rows: [
      ['At-most-once', 'বড়জোর একবার; হারাতে পারে', 'Consumer আগে offset লিখে, তারপর প্রক্রিয়া', 'মেট্রিক, লগ: কয়েকটা হারালে ক্ষতি নেই'],
      ['At-least-once', 'অন্তত একবার; দুবার আসতে পারে', 'আগে প্রক্রিয়া, তারপর offset লেখা। মাঝে মরলে আবার', 'বেশিরভাগ কাজ; consumer নিজে "দুবার এলে সমস্যা নেই" বানাবে (idempotent)'],
      ['Exactly-once', 'ঠিক একবার', 'Idempotent লেখা আর transaction; বাড়তি খরচ', 'টাকা, হিসাব: যেখানে দুবারও চলবে না'],
    ] },
    { kind: 'seq', label: 'At-least-once: consumer মাঝপথে মরলে বার্তা আবার আসে', actors: ['Consumer ক', 'Queue', 'Consumer খ'], steps: [
      { from: 0, to: 1, msg: 'বার্তা ১৪২ দাও' },
      { from: 1, to: 0, msg: 'order-501: SMS পাঠাও' },
      { from: 0, to: 0, msg: 'SMS গেল, কিন্তু offset লেখার আগে মরল', tone: 'bad' },
      { from: 2, to: 1, msg: 'ক-র partition আমাকে। কত পর্যন্ত পড়া?' },
      { from: 1, to: 2, msg: '১৪১ পর্যন্ত: ১৪২ আবার নাও', tone: 'bad', note: 'বার্তা হারায়নি, কিন্তু আবার এল: SMS দুবার যেতে পারে।' },
      { from: 2, to: 2, msg: '"order-501-র SMS আগে গেছে?" দেখে নিল', tone: 'ok', note: 'এটাই idempotency: একই বার্তা আবার এলে ফল বদলায় না।' },
    ] },

    { kind: 'story', title: 'একই order-এর দুটো SMS', steps: [
      'Consumer SMS পাঠিয়ে তারপর offset লিখত, কিন্তু মাঝে server restart হলো।',
      'নতুন consumer একই বার্তা আবার পেয়ে আবার SMS পাঠাল: customer পেল দুটো, রাগ করল।',
      'Queue ঠিকই ছিল: বার্তা হারায়নি; দোষ ছিল দুবার চললে কী হবে তা না ভাবা।',
    ], fix: 'প্রতিটা বার্তার ID লিখে রাখা: "এই ID-র SMS আগে গেছে?" দেখে তবেই পাঠানো। At-least-once আর idempotent consumer প্রায়ই exactly-once-এর সস্তা বিকল্প।' },

    { kind: 'mistakes', items: [
      'এক partition ধরে সব বার্তা: ভাগ ছাড়া বাড়ে না।',
      'Partition-এর চেয়ে বেশি consumer রাখা: বাড়তিরা বসে।',
      'দুটো আলাদা partition-এর বার্তায় ক্রম আশা করা।',
      'ack = ১ ধরে "হারায় না" বলা।',
      'At-least-once-এর consumer idempotent না করা।',
    ] },
    { kind: 'check', items: [
      { q: 'Partition কেন লাগে?', a: 'এক machine-এ সব বার্তা রাখলে সেটাই সীমা। Partition-এ ভাগ করলে লেখা আর পড়া অনেক machine-এ ছড়ায়, আর consumer-রা সমান্তরালে পড়ে।' },
      { q: 'একই order-এর বার্তার ক্রম কীভাবে ঠিক রাখেন?', a: 'একই key (order ID): hash করে একই partition-এ যায়, আর partition-এর ভেতরে ক্রম বজায়।' },
      { q: '৬ partition আর ১০ consumer হলে কী হয়?', a: '৬ জন কাজ করে, ৪ জন বসে। Partition-ই consumer-এর সর্বোচ্চ সংখ্যা।' },
      { q: 'ack মোড কোনটায় হারানো প্রায় অসম্ভব, আর দাম কী?', a: 'ack = সব (ISR-এর সবাই পাওয়ার পর): দাম হলো ধীর, কারণ ধীরতম follower-এর অপেক্ষা।' },
      { q: 'At-least-once-এ দুবার প্রক্রিয়া কীভাবে সামলান?', a: 'Consumer idempotent করে: বার্তার ID মনে রেখে, আগে প্রক্রিয়া হয়ে থাকলে আবার না করে।' },
    ] },
  ],
};
