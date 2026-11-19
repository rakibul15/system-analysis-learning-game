import { dur, num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 11 (Payment System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-11',
  goals: [
    'Pay-in আর pay-out কী, আর কার্ডের তথ্য নিজের server ছুঁয়ে না গিয়ে PSP-র hosted পাতায় কেন যায় বলতে পারবেন।',
    'ডবল চার্জ ঠেকাতে idempotency key আর retry (backoff) কীভাবে একসাথে কাজ করে বলতে পারবেন।',
    'Double-entry ledger আর reconciliation কেন লাগে, আর কী ধরা পড়ে বলতে পারবেন।',
  ],
  related: ['transactions', 'consensus'],
  blocks: [
    { kind: 'p', text: 'Payment system টাকা সরায়: customer ParcelGo-তে delivery-র জন্য কার্ডে দাম দেয় (pay-in), আর পরে ParcelGo merchant-কে তার ভাগ পাঠায় (pay-out)। টাকার ব্যাপারে দুই ভুলই মারাত্মক: দুবার কাটলে customer রাগ করবে, একবারও না কাটলে ParcelGo-র লোকসান। আর টাকার ঘটনা কখনো "প্রায়" হয় না, প্রতিটা পয়সার হিসাব।' },
    { kind: 'list', items: [
      'দুই দিক: pay-in (customer থেকে আমাদের) আর pay-out (আমাদের থেকে merchant-দের)।',
      'ঠিকঠাক: একটাও চার্জ বাদ নয়, একটাও ডবল নয়।',
      'বাইরের ওপর নির্ভর: ব্যাংক, কার্ড নেটওয়ার্ক। ওরা ধীর, ডাউন হয়, উত্তর হারায়।',
      'পরিসর: দিনে ১০ লক্ষ লেনদেন, সেকেন্ডে ~১০: ছোট, কিন্তু একটাও ভুল নয়। আর আইন: কার্ড-ডেটা সুরক্ষা (PCI)।',
    ] },

    { kind: 'h', text: 'কে কার সাথে' },
    { kind: 'table', head: ['অংশ', 'কাজ'], rows: [
      ['PSP (Payment Service Provider)', 'Stripe, bKash gateway-র মতো: কার্ড আর ব্যাংকের সাথে কথা বলে, আমাদের হয়ে টাকা তোলে'],
      ['Payment service', 'আমাদের ভেতরের: order থেকে payment event নেয়, PSP-কে ডাকে'],
      ['Payment executor', 'একটা একটা করে PSP-র কাছে আসল চার্জ চালায়'],
      ['Ledger', 'হিসাবের খাতা: কে কাকে কত দিল, কোনোদিন বদলানো যায় না'],
      ['Wallet', 'merchant-এর জমা টাকা (v2-12)'],
    ] },
    { kind: 'tip', title: 'কার্ড নম্বর আমাদের server ছুঁবে না', text: 'কার্ডের তথ্য (নম্বর, CVV) রাখা মানে কঠিন নিরাপত্তার দায় (PCI)। তাই PSP-র "hosted payment page" ব্যবহার: customer সরাসরি PSP-র পাতায় কার্ড লেখে, আমরা পাই শুধু একটা token। কার্ড কখনো আমাদের database-এ আসে না।' },
    { kind: 'seq', label: 'Pay-in: customer-এর কার্ড কাটা, এক ধাপ একটা', actors: ['Customer', 'Payment service', 'PSP (hosted পাতা)', 'Ledger'], steps: [
      { from: 0, to: 1, msg: 'order-এর জন্য pay করব' },
      { from: 1, to: 1, msg: 'অনন্য payment ID (R-91) বানাই, payment order "ঝুলে আছে" লিখি', note: 'আগে লিখে নেওয়া: পরে কিছু হারালে খুঁজে পাওয়া যাবে।' },
      { from: 1, to: 2, msg: 'R-91-এর জন্য hosted পাতার লিংক দাও' },
      { from: 0, to: 2, msg: 'পাতায় কার্ড লিখে "pay" চাপল', note: 'আমাদের server কার্ডের কিছু দেখে না।' },
      { from: 2, to: 1, msg: 'webhook: R-91 সফল', tone: 'ok', note: 'PSP আমাদের জানায়। আমরা সংশয়ে: ঠিকই কি PSP-র ডাক?' },
      { from: 1, to: 2, msg: 'যাচাই: R-91-এর অবস্থা বলো', note: 'Webhook-এ সরাসরি বিশ্বাস নয়, আসল উৎসে আবার দেখে নেওয়া।' },
      { from: 1, to: 3, msg: 'ledger-এ লেখো: customer −৫০০, ParcelGo +৫০০', tone: 'ok' },
    ] },

    { kind: 'h', text: 'ডবল চার্জ ঠেকানো: idempotency' },
    { kind: 'p', text: 'সবচেয়ে ভয়ানক ভুল: আমরা PSP-কে বললাম "কাটো", উত্তর এল না (network)। কাটা হলো কিনা জানি না। আবার বললে কাটা পড়তে পারে দুবার। না বললে একবারও না। সমাধান: প্রতিটা চার্জের একটা idempotency key (এখানে payment ID)। PSP একই key দুবার পেলে আগের ফলই ফেরত দেয়, নতুন চার্জ করে না।' },
    { kind: 'seq', label: 'উত্তর হারাল: retry, তবু একবারই কাটে', actors: ['Executor', 'PSP', 'কার্ড'], steps: [
      { from: 0, to: 1, msg: 'চার্জ ৫০০, key = R-91' },
      { from: 1, to: 2, msg: '৫০০ কাটো', tone: 'ok' },
      { from: 1, to: 0, msg: '(উত্তর পথে হারাল)', tone: 'bad', note: 'কাটা হয়েছে, কিন্তু আমরা জানি না।' },
      { from: 0, to: 0, msg: 'সময় শেষ: একটু পরে আবার', note: 'বিরতি বাড়িয়ে (backoff) আর একটু এলোমেলো (jitter)।' },
      { from: 0, to: 1, msg: 'চার্জ ৫০০, key = R-91 (আবার)' },
      { from: 1, to: 1, msg: 'R-91 আগেই হয়েছে: কিছু করব না', tone: 'ok', note: 'নতুন কাটা নেই।' },
      { from: 1, to: 0, msg: 'আগের ফল: সফল', tone: 'ok' },
    ] },
    { kind: 'calc', label: 'Retry-এর সময়সূচি (exponential backoff)', inputs: [
      { id: 'b', label: 'প্রথম বিরতি', min: 1, max: 30, step: 1, value: 2, unit: 'সেকেন্ড' },
      { id: 'f', label: 'প্রতিবার গুণ', min: 1, max: 4, step: 1, value: 2 },
      { id: 'n', label: 'কয়বার চেষ্টা', min: 1, max: 10, step: 1, value: 5 },
    ], out: (v) => {
      let total = 0, last = 0;
      for (let i = 0; i < v.n!; i++) { last = v.b! * v.f! ** i; total += last; }
      return [
        { label: 'শেষ বিরতি', value: dur(last), how: `${num(v.b!)} × ${num(v.f!)}^${num(v.n! - 1)}` },
        { label: 'সব চেষ্টায় মোট অপেক্ষা', value: dur(total), how: 'বিরতিগুলোর যোগফল', bar: Math.min(1, total / 3600), tone: total > 900 ? 'bad' : undefined },
        { label: 'কেন বাড়ানো', value: 'বাইরের service-কে দম নিতে দেওয়া', how: 'সবাই একসাথে ঘনঘন চেষ্টা করলে বসে থাকা service আরও বসে যায়', tone: 'ok' },
      ];
    } },
    { kind: 'list', items: [
      'কোন ভুলে retry: network, সময় শেষ, অস্থায়ী ভুল। কোনটায় নয়: কার্ড প্রত্যাখ্যাত, টাকা কম: আবার চেষ্টায় লাভ নেই।',
      'সীমা: কয়েকবারের পর হাল ছেড়ে "ব্যর্থ" চিহ্ন, আর মানুষকে alert (বা dead-letter queue)।',
      'Customer-দিকে: "pay" বোতাম একবার ক্লিকেই নিষ্ক্রিয়, আর সেই payment ID একই। (hotel বুকিংয়ের v2-7-এর মতো।)',
    ] },

    { kind: 'h', text: 'Ledger: double-entry খাতা' },
    { kind: 'p', text: 'টাকা কোথাও থেকে আসে, কোথাও যায়: কখনো শূন্য থেকে তৈরি হয় না। Double-entry খাতায় প্রতিটা লেনদেনের দুই লাইন: একটা অ্যাকাউন্ট থেকে বিয়োগ, আরেকটাতে যোগ, আর দুটোর যোগফল সবসময় শূন্য। তাই খাতার সব সংখ্যা যোগ করলে শূন্য না এলে কোথাও ভুল।' },
    { kind: 'table', head: ['লেনদেন', 'অ্যাকাউন্ট', 'ডেবিট', 'ক্রেডিট'], rows: [
      ['Customer ৫০০ দিল', 'Customer (কার্ড)', '৫০০', ''],
      ['', 'ParcelGo (আমাদের জমা)', '', '৫০০'],
      ['Merchant-কে ৪৫০ দেওয়া, ৫০ ParcelGo-র ফি', 'ParcelGo (আমাদের জমা)', '৫০০', ''],
      ['', 'Merchant', '', '৪৫০'],
      ['', 'ParcelGo (ফি)', '', '৫০'],
    ] },
    { kind: 'list', items: [
      'শুধু যোগ হয়, বদলানো বা মোছা নয়। ভুল হলে উল্টো একটা নতুন লাইন (সংশোধন), যাতে ইতিহাস অটুট।',
      'প্রতিটা লাইনের আসল লেনদেন-ID: কোন payment থেকে এসেছে।',
      'Merchant-এর "কত পাওনা" এই খাতা থেকেই, আলাদা সংখ্যা রেখে নয়।',
    ] },

    { kind: 'h', text: 'Reconciliation: প্রতিদিন মিলিয়ে দেখা' },
    { kind: 'p', text: 'সবকিছু ঠিকঠাক চললেও PSP-র সাথে আমাদের হিসাব কখনো কখনো মেলে না: webhook হারিয়েছে, উত্তর দেরি করেছে। তাই প্রতিদিন PSP-র পাঠানো settlement ফাইল (তাদের হিসাব) আর আমাদের ledger লাইনে লাইনে মেলানো।' },
    { kind: 'seq', label: 'রাতের মিলানো: তিন ধরনের গরমিল', actors: ['Reconciliation job', 'PSP ফাইল', 'আমাদের ledger'], steps: [
      { from: 0, to: 1, msg: 'গতকালের সব লেনদেন দাও' },
      { from: 0, to: 2, msg: 'গতকালের সব লেখা দাও' },
      { from: 0, to: 0, msg: 'দুই তালিকা মেলাও (payment ID ধরে)' },
      { from: 0, to: 0, msg: 'মিলে গেলে ঠিক: বেশিরভাগ', tone: 'ok' },
      { from: 0, to: 0, msg: 'PSP-তে আছে, আমাদের নেই: webhook হারিয়েছে। ledger-এ যোগ করো', tone: 'bad', note: 'সাধারণত স্বয়ংক্রিয়ভাবে সারানো যায়।' },
      { from: 0, to: 0, msg: 'দুটোতেই আছে, কিন্তু পরিমাণ আলাদা', tone: 'bad', note: 'মানুষের চোখে: আর্থিক ক্ষতি হতে পারে।' },
      { from: 0, to: 0, msg: 'আমাদের আছে, PSP-তে নেই: PSP-কে জিজ্ঞেস', tone: 'bad', note: 'টাকা কাটেনি, কিন্তু আমরা মনে করেছিলাম কেটেছে।' },
    ] },

    { kind: 'story', title: 'ভুয়া ডবল চার্জ নয়: আসল ঘটনা', steps: [
      'Customer অভিযোগ করল তার কার্ড থেকে দুবার কাটা পড়েছে।',
      'লগে দেখা গেল ParcelGo-র payment service retry করেছে, কিন্তু প্রতিবার নতুন payment ID বানিয়ে।',
      'PSP দুটো আলাদা চার্জ ভেবে দুবারই কেটেছে।',
    ], fix: 'Payment ID একবারই বানানো (order তৈরির সময়), retry-তে একই ID, একই idempotency key। আর reconciliation-এ একই order-এ একাধিক সফল চার্জ খুঁজে alert।' },

    { kind: 'mistakes', items: [
      'কার্ডের নম্বর নিজের server বা database-এ রাখা।',
      'প্রতিটা retry-তে নতুন payment ID।',
      'Webhook-কে বিশ্বাস করে আবার যাচাই না করা।',
      'Ledger-এর লাইন বদলানো বা মোছা।',
      'Reconciliation ছাড়া "সব ঠিক আছে" ধরা।',
      'সব retry একই বিরতিতে, বিরতি না বাড়িয়ে।',
    ] },
    { kind: 'check', items: [
      { q: 'কার্ড নম্বর আমাদের server-এ আসে না কেন?', a: 'নিরাপত্তার কঠিন দায় (PCI) এড়াতে। Customer PSP-র hosted পাতায় কার্ড লেখে, আমরা শুধু token পাই।' },
      { q: 'উত্তর হারালে ডবল চার্জ কীভাবে ঠেকান?', a: 'প্রতিটা payment-এর একটা idempotency key। Retry-তে একই key। PSP আগের ফলই ফেরত দেয়, নতুন চার্জ করে না।' },
      { q: 'Double-entry খাতা কেন?', a: 'প্রতিটা লেনদেনে দুই লাইন, যোগফল শূন্য। টাকা শূন্য থেকে আসে না, তাই সব যোগ করলে শূন্য না এলে ভুল ধরা পড়ে।' },
      { q: 'Reconciliation কী ধরে?', a: 'PSP-র হিসাব আর আমাদের ledger লাইনে লাইনে মেলানো: হারানো webhook, পরিমাণের গরমিল, আর "আমাদের আছে কিন্তু PSP-তে নেই"।' },
    ] },
  ],
};
