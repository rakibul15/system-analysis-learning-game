import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 6 (Ad Click Event Aggregation), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-6',
  goals: [
    'Click-এর স্রোত থেকে মিনিটে মিনিটে হিসাবের পাইপলাইন আঁকতে পারবেন, আর কেন আসল event না ফেলে জমানো হয় বলতে পারবেন।',
    'Tumbling আর sliding window আর দেরিতে আসা event (watermark) বলতে পারবেন।',
    'Exactly-once হিসাব কীভাবে হয় (offset, dedupe, atomic commit) বলতে পারবেন।',
  ],
  related: ['streams', 'consensus', 'transactions'],
  blocks: [
    { kind: 'p', text: 'বিজ্ঞাপনে প্রতিটা click-এর পেছনে টাকা: কেউ বিজ্ঞাপন দেখে click করলে বিজ্ঞাপনদাতা পয়সা দেয়। তাই সংখ্যা ঠিক হতে হবে। এই system click-এর স্রোত থেকে হিসাব করে: কোন বিজ্ঞাপনে গত মিনিটে কত click, কোন দেশে কত, কোনটা সবচেয়ে বেশি। ParcelGo-র উদাহরণ: merchant-দের পণ্যের বিজ্ঞাপনে click গুনে বিল।' },
    { kind: 'list', items: [
      'প্রতি সেকেন্ডে লাখ লাখ click, ভিড়ের সময় আরও কয়েক গুণ।',
      'দুটো প্রশ্ন: "বিজ্ঞাপন X-এ গত M মিনিটে কত click?" আর "গত M মিনিটে সবচেয়ে বেশি click-খাওয়া শীর্ষ ১০০ বিজ্ঞাপন কোনগুলো?"',
      'ঠিক হতে হবে: একটা click দুবার বা একবারও গোনা না হলে টাকার হিসাব ভুল।',
      'দেরি সহ্য: কিছুক্ষণ পরে দেখা গেলে চলে, কিন্তু প্রায় ঠিক-ঠিক। আর ডেটা পুরোনো অবস্থায় আবার হিসাব করা যায়।',
    ] },
    { kind: 'calc', label: 'অনুমান: click কত', inputs: [
      { id: 'dau', label: 'দিনে click', min: 100, max: 20000, step: 100, value: 1000, unit: 'M' },
      { id: 'b', label: 'একটা click event', min: 50, max: 500, step: 10, value: 100, unit: 'byte' },
      { id: 'pk', label: 'ভিড়ে গুণ', min: 1, max: 10, step: 1, value: 5 },
    ], out: (v) => {
      const qps = (v.dau! * 1e6) / 86400;
      const tb = (v.dau! * 1e6 * v.b!) / 1e12;
      return [
        { label: 'Click প্রতি সেকেন্ডে (গড়)', value: num(Math.round(qps)), how: `${num(v.dau!)}M ÷ ৮৬,৪০০`, bar: Math.min(1, qps / 500_000) },
        { label: 'ভিড়ের সময়', value: num(Math.round(qps * v.pk!)), tone: 'bad', how: `× ${num(v.pk!)}` },
        { label: 'দিনে নতুন ডেটা', value: `${num(Math.round(tb * 10) / 10)} TB`, how: `${num(v.dau!)}M × ${num(v.b!)} byte`, tone: undefined },
      ];
    } },

    { kind: 'h', text: 'আসল event রাখুন, শুধু যোগফল নয়' },
    { kind: 'p', text: 'সোজা ভাবনা: প্রতি click-এ একটা counter বাড়ানো। কিন্তু যোগফল রাখলে ভুল হলে আর কিছু করার নেই: কোথাও bug হলে, কোনটা ঠিক ছিল জানার উপায় নেই। তাই আসল click event (কাঁচা তথ্য) আলাদা store-এ রাখা হয়, আর যোগফল (aggregated) আলাদা। কাঁচা থেকে যেকোনো সময় আবার হিসাব করা যায়: ভুল ঠিক করতে বা নতুন প্রশ্নের জন্য।' },

    { kind: 'h', text: 'পাইপলাইন' },
    { kind: 'flow', label: 'Click → queue → মিনিটের হিসাব → queue → জমা। কাঁচা event-ও আলাদা জমে', nodes: [
      { id: 'lg', label: 'Log watcher', sub: 'click event', x: 8, y: 17, w: 18 },
      { id: 'q1', label: 'Queue ১', sub: 'কাঁচা', x: 30, y: 17, w: 14 },
      { id: 'ag', label: 'Aggregator', sub: 'মিনিটে গোনা', x: 54, y: 17, w: 18 },
      { id: 'q2', label: 'Queue ২', sub: 'যোগফল', x: 76, y: 17, w: 14 },
      { id: 'db', label: 'Aggregation DB', x: 92, y: 6, w: 18 },
      { id: 'raw', label: 'কাঁচা event store', x: 54, y: 30, w: 22 },
    ], links: [
      { from: 'lg', to: 'q1', rate: 4 }, { from: 'q1', to: 'ag', rate: 4 }, { from: 'ag', to: 'q2', rate: 1.5 }, { from: 'q2', to: 'db', rate: 1.5 }, { from: 'q1', to: 'raw', rate: 2, color: '#2f7de1' },
    ], h: 36 },
    { kind: 'list', items: [
      'Queue ১ (কাঁচা): Kafka-র মতো। Click-এর তুফান সামলে নেয়।',
      'Aggregator: প্রতি মিনিটে (বা ছোট জানালায়) গোনা: কোন বিজ্ঞাপনে কত।',
      'Queue ২ (যোগফল): হিসাবের ফল জমার আগে আরেকটা queue: যাতে exactly-once-এর (নিচে) জন্য একসাথে অফসেট আর ফল লেখা যায়।',
      'কাঁচা event store: সস্তা, অনেক বড়, পরে আবার হিসাবের জন্য।',
      'Query service: dashboard ও বিলের জন্য যোগফল পড়ে।',
    ] },

    { kind: 'h', text: 'জানালা (window)' },
    { kind: 'p', text: '"প্রতি মিনিটে কত" হিসাব করতে সময়কে জানালায় ভাগ করা। দুই প্রধান ধরন (v1-4-এর মতোই ধারণা)।' },
    { kind: 'table', head: ['', 'Tumbling (ফেলা)', 'Sliding (চলন্ত)'], rows: [
      ['আকার', 'পরপর, কোনো ওভারল্যাপ নেই: ১০:০০–১০:০১, ১০:০১–১০:০২…', 'প্রতি মিনিটে সরে, ওভারল্যাপ: গত ৫ মিনিট, প্রতি মিনিটে নতুন'],
      ['কার জন্য', 'মিনিটে মিনিটে বিল, মোট click', '"শেষ ৫ মিনিটে শীর্ষ ১০০ বিজ্ঞাপন" ধরনের প্রশ্ন'],
      ['দাম', 'সহজ, কম হিসাব', 'বেশি হিসাব (একটা event একাধিক জানালায়)'],
    ] },
    { kind: 'seq', label: 'দেরিতে আসা event: জানালা বন্ধ হওয়ার আগে একটু অপেক্ষা (watermark)', actors: ['ফোন', 'Aggregator', 'জানালা ১০:০১'], steps: [
      { from: 0, to: 1, msg: 'click, ঘটেছে ১০:০১:৫৮ (network ধীর)', note: 'ঘটার সময় (event time) আর পৌঁছানোর সময় (processing time) আলাদা।' },
      { from: 1, to: 1, msg: 'ঘড়িতে ১০:০২:০০: জানালা ১০:০১ এখনই বন্ধ করব?', note: 'এখনই বন্ধ করলে এই click হারায়।' },
      { from: 1, to: 2, msg: 'একটু অপেক্ষা: ১৫ সেকেন্ড (watermark)', tone: 'ok', note: 'Watermark বলে "এর আগের event আর আসবে না ধরি"।' },
      { from: 0, to: 1, msg: 'দেরির click এল, ১০:০২:০৮-এ', tone: 'ok' },
      { from: 1, to: 2, msg: 'জানালা ১০:০১-এ গোনা হলো', tone: 'ok' },
      { from: 0, to: 1, msg: 'আরেক click এল ১০:০২:৪০-এ, ঘটেছিল ১০:০১:৫০', tone: 'bad', note: 'অনেক দেরি: জানালা বন্ধ। এটা ধরা পড়ে না: ছোট ভুল।' },
      { from: 1, to: 1, msg: 'ছাড়ুন, কাঁচা store থেকে রাতে আবার সব হিসাব', tone: 'ok', note: 'Batch পুনর্গণনা (reconciliation): রাতে কাঁচা থেকে সব আবার, যোগফলের সাথে মিলিয়ে।' },
    ] },
    { kind: 'tip', title: 'Watermark বাড়ালে ঠিক কিন্তু ধীর', text: 'বেশিক্ষণ অপেক্ষা: বেশি দেরির event ধরা, কিন্তু ফল দেরিতে। কম অপেক্ষা: দ্রুত, কিন্তু কিছু হারাতে পারে। বিলের মতো হিসাবে এই ফাঁক রাতের পুনর্গণনায় ঠিক করা।' },

    { kind: 'h', text: 'ঠিক একবার গোনা' },
    { kind: 'p', text: 'Aggregator মাঝপথে মরলে? Queue থেকে কিছু event ফের আসবে, আর আবার গোনা হবে: দুবার। উল্টোদিকে, আগে offset লিখে রাখলে উল্টো হারাবে। সমাধান: ফল আর offset (queue-তে কতদূর পড়া) একই atomic কাজে লেখা, সব-বা-কিছুই-না।' },
    { kind: 'seq', label: 'Exactly-once: ফল আর offset একসাথে', actors: ['Aggregator', 'Queue ১ (কাঁচা)', 'Queue ২ + offset store'], steps: [
      { from: 0, to: 1, msg: 'event ১০০ থেকে ১২০ দাও' },
      { from: 0, to: 0, msg: 'গুনলাম: বিজ্ঞাপন A = ১৪টা' },
      { from: 0, to: 2, msg: 'একসাথে লেখো: (A = ১৪) আর (offset = ১২০)', tone: 'ok', note: 'এক transaction: হয় দুটোই, নয়তো কোনোটাই।' },
      { from: 0, to: 0, msg: 'এখন মরল' },
      { from: 0, to: 2, msg: 'ফিরে এসে: আমি কত পর্যন্ত?', note: 'নতুন aggregator offset স্টোর থেকে জানে।' },
      { from: 2, to: 0, msg: '১২০: তাই ১২১ থেকে', tone: 'ok', note: 'ফল আর offset এক সাথে সংরক্ষিত, তাই ১০০–১২০ আর আবার গোনা হয় না।' },
    ] },
    { kind: 'list', items: [
      'প্রতিটা event-এর অনন্য ID: একই click দুবার এলে (ফোন আবার পাঠাল) ID দেখে ফেলে দেওয়া (dedupe)।',
      'ফল লেখা আর offset লেখা একই transaction (বা একই stream-processing framework-এর exactly-once মোড)।',
      'Click জালিয়াতি: bot-এর click বাদ দিতে ফিল্টার (IP, ব্যবহার-ধরন)। হিসাবের আগে।',
    ] },

    { kind: 'h', text: 'ভিড় আর hot partition' },
    { kind: 'list', items: [
      'একটা বিজ্ঞাপন হঠাৎ ভাইরাল: তার সব click একই partition-এ (key = বিজ্ঞাপন ID), একটা worker অতিরিক্ত বোঝায়। সমাধান: hot বিজ্ঞাপনের ID-র সাথে একটা এলোমেলো সংখ্যা জুড়ে কয়েকটা partition-এ ছড়ানো, পরে আবার জোড়া।',
      'Aggregator বাড়ানো: partition সংখ্যা বাড়িয়ে; consumer তখন বাড়ে।',
      'ভুল ধরা: কাঁচা আর যোগফল রোজ মেলানো, না মিললে alert (v2-5)।',
      'Lambda না Kappa: আগে batch (নির্ভুল, ধীর) আর stream (দ্রুত, আনুমানিক) দুই পথ; পরে stream-কেই নির্ভুল বানিয়ে এক পথ (Kappa)। কাঁচা event রাখা থাকলেই আবার চালানো যায়।',
    ] },

    { kind: 'story', title: 'ঈদের সেলে click দুবার গোনা', steps: [
      'Aggregator-এ memory ফুরিয়ে server restart হলো সেলের মাঝে।',
      'Restart হয়ে সে কিছু click আবার পড়ল, আর ফল দুবার লিখে দিল।',
      'Merchant-দের বিল বেশি এল; কয়েকজন অভিযোগ করল।',
    ], fix: 'ফল আর offset একই transaction-এ, আর প্রতিটা click-এর ID দেখে dedupe। রাতে কাঁচা থেকে পুনর্গণনা করে ফারাক ধরা।' },

    { kind: 'mistakes', items: [
      'শুধু যোগফল রাখা, কাঁচা event ফেলে দেওয়া।',
      'ফল লিখে তারপর আলাদাভাবে offset লেখা: মাঝে মরলে দুবার বা হারানো।',
      'Event time আর processing time এক ধরা: দেরির click হারায়।',
      'সবচেয়ে জনপ্রিয় বিজ্ঞাপনের hot partition উপেক্ষা।',
    ] },
    { kind: 'check', items: [
      { q: 'কাঁচা click কেন রাখেন?', a: 'ভুল হলে বা নতুন প্রশ্ন এলে আবার হিসাব করতে। শুধু যোগফল থাকলে ভুল ঠিক করার উপায় থাকে না।' },
      { q: 'Tumbling আর sliding window-এর ফারাক?', a: 'Tumbling জানালা পরপর, ওভারল্যাপ ছাড়া (মিনিটের বিল)। Sliding চলতে চলতে, ওভারল্যাপ করে ("শেষ ৫ মিনিটে শীর্ষ ১০০")।' },
      { q: 'Watermark কী?', a: 'দেরিতে আসা event ধরতে জানালা বন্ধ করার আগে নির্দিষ্ট সময় অপেক্ষা। বেশি অপেক্ষা: নির্ভুল কিন্তু ধীর।' },
      { q: 'Exactly-once কীভাবে?', a: 'ফল আর offset একই atomic কাজে লেখা (মরলে দুটোই নেই বা দুটোই আছে), আর প্রতিটা event-এর ID দেখে duplicate ফেলা।' },
    ] },
  ],
};
