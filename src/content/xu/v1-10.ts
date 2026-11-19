import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 10 (Design A Notification System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-10',
  goals: [
    'Push, SMS আর email তিন পথে বার্তা কীভাবে যায় (APNs, FCM, গেটওয়ে) বলতে পারবেন।',
    'Queue দিয়ে ভাঙা অংশ আলাদা করে কেন একটা channel বসে গেলে বাকিরা চলে, বুঝিয়ে বলতে পারবেন।',
    'একই বার্তা দুবার না যাওয়া আর হারিয়ে না যাওয়ার উপায় (retry, dedupe) বলতে পারবেন।',
  ],
  related: ['streams', 'transactions'],
  blocks: [
    { kind: 'p', text: 'Notification সেই বার্তা যা user চায়নি কিন্তু দরকার: "আপনার parcel দরজায়", "OTP: ৪৮২১", "আজ সেল"। তিনটা মূল পথ: ফোনের push, SMS, email। দেখতে সহজ, কিন্তু প্রতিটা বার্তা আমাদের বাইরের একটা service দিয়ে যায়, যাকে আমরা চালাই না, আর যা ধীর বা বন্ধ হতে পারে। এই অধ্যায় সেই ভাঙা পথ সামলানোর।' },

    { kind: 'h', text: 'তিন পথ' },
    { kind: 'table', head: ['পথ', 'কার হাত দিয়ে যায়', 'কী লাগে', 'কখন'], rows: [
      ['iOS push', 'Apple-এর APNs', 'ফোনের device token, আমাদের provider-এর key', 'App আছে, তাৎক্ষণিক, সস্তা'],
      ['Android push', 'Google-এর FCM', 'Device token', 'একই'],
      ['SMS', 'তৃতীয় পক্ষ SMS গেটওয়ে (Twilio-ধাঁচের, আমাদের দেশে স্থানীয়)', 'ফোন নম্বর', 'App নেই বা জরুরি (OTP); প্রতিটায় টাকা'],
      ['Email', 'Mail সেবা (SendGrid-ধাঁচের)', 'Email ঠিকানা', 'লম্বা বার্তা, রসিদ; ধীর, কিন্তু সস্তা'],
    ] },
    { kind: 'p', text: 'কোনো পথ দিয়ে পাঠাতে হলে আগে user-এর contact info লাগে: সাইন-আপ বা app প্রথম খোলার সময় ধরে রাখা: email, নম্বর, প্রতি device-এর token। একজন user-এর অনেক device হতে পারে, তাই এক user, অনেক token।' },

    { kind: 'h', text: 'প্রথম নকশা ও তার ফাঁক' },
    { kind: 'flow', label: 'সরল নকশা: সবাই এক server-এ, সেখান থেকে সরাসরি প্রতিটা পথে। এক পথ বসলে সব আটকে', nodes: [
      { id: 'sv', label: 'Service', sub: 'order, rider', x: 13, y: 17, w: 20 },
      { id: 'n', label: 'Notifier', sub: 'একটাই server', x: 48, y: 17, w: 22, tone: 'hot' },
      { id: 'a', label: 'APNs / FCM', x: 88, y: 5, w: 18 },
      { id: 's', label: 'SMS গেটওয়ে', sub: 'ধীর', x: 88, y: 17, w: 18, tone: 'down' },
      { id: 'e', label: 'Email সেবা', x: 88, y: 29, w: 18 },
    ], links: [
      { from: 'sv', to: 'n', rate: 5 },
      { from: 'n', to: 'a', rate: 2, secs: 1 },
      { from: 'n', to: 's', rate: 2, drop: 0.7 },
      { from: 'n', to: 'e', rate: 2 },
    ], h: 34 },
    { kind: 'list', items: [
      'একটাই server: বসে গেলে সব বার্তা বন্ধ।',
      'এক পথ ধীর হলে (SMS) সেই অপেক্ষায় সবাই আটকে: push-ও দেরিতে যায়।',
      'বাড়ানো কঠিন: ভিড় বাড়লে পুরোটা একসাথে বাড়াতে হয়, অথচ শুধু SMS ধীর।',
      'কোনো পথে যদি বার্তা হারায়, ফিরে দেখার উপায় নেই।',
    ] },

    { kind: 'h', text: 'ভাগ করুন: queue আর worker' },
    { kind: 'p', text: 'সমাধান আগের অধ্যায়গুলোর চেনা কৌশল: ঘটকগুলোকে আলাদা করুন, মাঝে queue বসান। প্রতিটা পথের নিজের queue আর নিজের worker। এখন SMS গেটওয়ে ধীর হলে শুধু SMS queue বাড়ে; push আর email যেমন চলছিল তেমনই চলে।' },
    { kind: 'flow', label: 'ভাগ করা নকশা: প্রতি পথের আলাদা queue। SMS ধীর হলেও push আর email আটকায় না', nodes: [
      { id: 'sv', label: 'Service', sub: 'order, rider', x: 11, y: 17, w: 20 },
      { id: 'n', label: 'Notifier', x: 36, y: 17, w: 18 },
      { id: 'qa', label: 'Push queue', x: 62, y: 5, w: 16 },
      { id: 'qs', label: 'SMS queue', sub: 'জমছে', x: 62, y: 17, w: 16, tone: 'hot' },
      { id: 'qe', label: 'Email queue', x: 62, y: 29, w: 18 },
      { id: 'a', label: 'APNs / FCM', x: 90, y: 5, w: 16 },
      { id: 's', label: 'SMS gateway', sub: 'ধীর', x: 89, y: 17, w: 20, tone: 'down' },
      { id: 'e', label: 'Email', x: 90, y: 29, w: 16 },
    ], links: [
      { from: 'sv', to: 'n', rate: 5 },
      { from: 'n', to: 'qa', rate: 1.8 }, { from: 'n', to: 'qs', rate: 1.8 }, { from: 'n', to: 'qe', rate: 1.8 },
      { from: 'qa', to: 'a', rate: 1.8 },
      { from: 'qs', to: 's', rate: 0.5, secs: 2.4 },
      { from: 'qe', to: 'e', rate: 1.8 },
    ], h: 34 },
    { kind: 'list', items: [
      'Notification server শুধু যাচাই (contact info, user-এর পছন্দ), বার্তা সাজানো আর queue-তে রাখে। Service থেকে ডাকার জন্য API দেয়।',
      'Worker queue থেকে নিয়ে বাইরের পথে পাঠায়। বেশি ভিড়ে শুধু সেই পথের worker বাড়ান।',
      'Cache: user-এর contact info আর settings বারবার database-এ না গিয়ে cache থেকে।',
    ] },

    { kind: 'h', text: 'হারাবে না, দুবার যাবে না' },
    { kind: 'p', text: 'বার্তা একবারও না হারানো খুব কঠিন। ঠিক একবার পৌঁছানো আরও কঠিন, কারণ বাইরের পথ উত্তর না দিলে আমরা জানি না বার্তা গেল কিনা। বাস্তব নিয়ম: অন্তত একবার পাঠাব, আর কখনো কখনো দুবার গেলে সেটা ধরে ফেলার চেষ্টা।' },
    { kind: 'seq', label: 'পাঠানো ব্যর্থ হলে retry, আর দুবার না যাওয়া', actors: ['Worker', 'Notification log', 'SMS গেটওয়ে'], steps: [
      { from: 0, to: 1, msg: 'event "e-901" আগে পাঠানো হয়েছে?', note: 'প্রতিটা বার্তার একটা অনন্য event ID। Worker আগে log-এ দেখে।' },
      { from: 1, to: 0, msg: 'না' },
      { from: 0, to: 2, msg: 'OTP ৪৮২১ পাঠাও' },
      { from: 2, to: 0, msg: 'সময় শেষ, উত্তর নেই', tone: 'bad', note: 'গেল কিনা আমরা জানি না।' },
      { from: 0, to: 0, msg: 'একটু পরে আবার (বিরতি বাড়িয়ে, একটু এলোমেলো করে)', note: 'Exponential backoff আর jitter। আর বেশি বার চেষ্টা হলে হাল ছেড়ে দিন, error log-এ।' },
      { from: 0, to: 2, msg: 'আবার: OTP ৪৮২১' },
      { from: 2, to: 0, msg: 'গেছে ✓', tone: 'ok' },
      { from: 0, to: 1, msg: 'e-901 পাঠানো হয়েছে লিখে রাখো', tone: 'ok', note: 'পরে আবার কোনো worker একই event পেলে log দেখেই বুঝবে। তবে একেবারে নিখুঁত না: উত্তর হারালে দুবারও যায়।' },
    ] },
    { kind: 'list', items: [
      'বার্তা আগে database বা log-এ লিখে তারপর queue-তে। Server বসে গেলেও log থেকে আবার পাঠানো যায়।',
      'Dedupe: প্রতিটা বার্তার অনন্য ID। আগে দেখা হলে ফেলে দাও।',
      'নিয়ম মানা: user "SMS চাই না" বললে সেটা মানা (opt-out); প্রতিটা পাঠানোর আগে যাচাই।',
      'Rate limit (v1-4): একজন user-কে দিনে অতিরিক্ত বার্তা নয়; বিরক্ত হয়ে সবাই বন্ধ করে দেয়।',
      'Template: একই ধরনের বার্তা ("আপনার parcel {স্থান}-এ") ছাঁচ থেকে; ভাষা আর বসানো তথ্য আলাদা।',
      'Analytics: কয়টা গেল, কয়টা খোলা হলো, কয়টা ফেল; এটা না মাপলে সমস্যা ধরা পড়ে না।',
    ] },

    { kind: 'calc', label: 'অনুমান: queue-তে কত জমবে', inputs: [
      { id: 'in', label: 'বার্তা আসছে', min: 1, max: 5000, step: 10, value: 1000, unit: '/সেকেন্ড' },
      { id: 'out', label: 'Gateway পারে', min: 1, max: 5000, step: 10, value: 400, unit: '/সেকেন্ড' },
      { id: 'min', label: 'কতক্ষণ ভিড়', min: 1, max: 60, step: 1, value: 10, unit: 'মিনিট' },
    ], out: (v) => {
      const backlog = Math.max(0, v.in! - v.out!) * v.min! * 60;
      const drainSec = v.out! > v.in! ? 0 : backlog / v.out!;
      return [
        { label: 'Queue-তে জমল', value: num(Math.round(backlog)), how: `(${num(v.in!)} − ${num(v.out!)}) × ${num(v.min! * 60)} সেকেন্ড`, tone: backlog > 0 ? 'bad' : 'ok', bar: Math.min(1, backlog / 1_000_000) },
        { label: 'ভিড় থামলেও শেষ হতে', value: backlog === 0 ? '—' : `${num(Math.round(drainSec / 60))} মিনিট`, how: 'জমা বার্তা ÷ gateway-র হার (নতুন ভিড় না এলে)' },
        { label: 'দেরিতে পাওয়া OTP-র কী মূল্য', value: backlog > 0 ? 'অনেকের OTP মেয়াদ পেরিয়ে যাবে' : 'ঠিক আছে', tone: backlog > 0 ? 'bad' : 'ok', how: 'OTP আলাদা queue-তে, আগে চলার অধিকারে (priority)' },
      ];
    } },
    { kind: 'tip', title: 'OTP আর বিজ্ঞাপন এক queue-তে নয়', text: 'আজকের সেলের প্রচারণা আর এখনই চাওয়া OTP একই queue-তে থাকলে OTP আটকে যায় সেল-এর পেছনে। জরুরি আর গুরুত্বহীন বার্তার আলাদা queue আর আলাদা worker।' },

    { kind: 'story', title: 'সেলের বার্তায় চাপা পড়ল OTP', steps: [
      'ঈদের সেলের প্রচারণা ১০ লাখ SMS একসাথে queue-তে ঢালা হলো।',
      'ঠিক তখন নতুন user-রা সাইন-আপ করছে: তাদের OTP ওই লম্বা queue-র পেছনে।',
      'OTP পৌঁছাল ২০ মিনিট পরে, মেয়াদ শেষ; সাইন-আপ কমে গেল।',
    ], fix: 'জরুরি আর বিজ্ঞাপনের আলাদা queue, আলাদা worker pool, আর বিজ্ঞাপনের হার সীমা। OTP আগে।' },

    { kind: 'mistakes', items: [
      'সব পথ এক server-এ, সরাসরি বাইরের service-এ ডাকা।',
      'এক queue-তে সব ধরনের বার্তা।',
      'পাঠানোর আগে কিছু লিখে না রাখা: server বসলে বার্তা চিরতরে হারায়।',
      'Retry-তে প্রতিবার একই বিরতি: সবাই একসাথে ফিরে এসে গেটওয়েকে আবার ডোবায়।',
      'User-এর opt-out না মানা।',
    ] },
    { kind: 'check', items: [
      { q: 'Queue দিয়ে ভাগ করলে কী সুবিধা?', a: 'এক পথ (যেমন SMS) ধীর বা বন্ধ হলে সেটার queue-তে জমে, বাকি পথ যেমন চলছিল তেমন। আর প্রতি পথের worker আলাদা করে বাড়ানো যায়।' },
      { q: 'বার্তা দুবার যাওয়া কীভাবে ঠেকান?', a: 'প্রতিটা বার্তার অনন্য event ID। পাঠানোর আগে log-এ দেখুন আগে গেছে কিনা। (পুরোপুরি নিখুঁত নয়: উত্তর হারালে দুবার যেতেও পারে।)' },
      { q: 'গেটওয়ে উত্তর না দিলে কী করবেন?', a: 'বিরতি বাড়িয়ে (এলোমেলো করে) আবার চেষ্টা, কয়েকবার পরে হাল ছেড়ে error log।' },
      { q: 'OTP আর বিজ্ঞাপন একই queue-তে কেন রাখবেন না?', a: 'বিজ্ঞাপনের ভিড়ের পেছনে OTP আটকে মেয়াদ পেরিয়ে যায়। জরুরির আলাদা queue আর আগে-যাওয়ার অধিকার।' },
    ] },
  ],
};
