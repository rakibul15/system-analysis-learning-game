import type { XuNote } from './types';

/** Vol 1, chapter 3 (A Framework For System Design Interviews), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-3',
  goals: [
    '৪৫ মিনিট চার ধাপে ভাগ করে নিজে চালাতে পারবেন, কোন ধাপে কতক্ষণ।',
    'প্রথম কয়েক মিনিটে ঠিক প্রশ্নগুলো করে scope আর সংখ্যা ঠিক করতে পারবেন।',
    'Interviewer কোন signal খোঁজেন আর কোনগুলো red flag, জানবেন।',
  ],
  blocks: [
    { kind: 'p', text: 'এক ঘণ্টায় কেউ ParcelGo বা Google বানিয়ে ফেলবে, এটা কেউ আশা করে না। System design interview আসলে দুজন সহকর্মীর একসাথে একটা অস্পষ্ট সমস্যা নিয়ে ভাবার মহড়া। শেষ design-এর চেয়ে বেশি দেখা হয় আপনি কীভাবে ভাবেন: প্রশ্ন করেন কিনা, বিকল্প তুলনা করেন কিনা, feedback নেন কিনা।' },

    { kind: 'h', text: 'চার ধাপ, ৪৫ মিনিট' },
    { kind: 'bars', label: '৪৫ মিনিটের একটা সাধারণ ভাগ', scale: 'stack', note: 'এটা মোটামুটি হিসাব; সমস্যা আর interviewer-এর উপর ভাগ বদলায়। সবচেয়ে বেশি সময় যায় গভীরে যাওয়ায়। সবচেয়ে সাধারণ ভুল প্রথম ধাপে তাড়াহুড়া।', items: [
      { label: 'বুঝে নেওয়া, scope ঠিক করা', value: 7, show: '৩–১০ মি', tone: 'warn' },
      { label: 'খসড়া design, সম্মতি নেওয়া', value: 12, show: '১০–১৫ মি', tone: 'ok' },
      { label: 'গভীরে যাওয়া', value: 20, show: '১০–২৫ মি' },
      { label: 'গুছিয়ে শেষ', value: 4, show: '৩–৫ মি', tone: 'violet' },
    ] },

    { kind: 'h', text: 'ধাপ ১: বুঝে নেওয়া, scope ঠিক করা' },
    { kind: 'p', text: 'ক্লাসে সবার আগে হাত তোলা ছাত্রের মতো হবেন না, যে প্রশ্ন পুরো শোনার আগেই উত্তর দেয়। এখানে তাড়াতাড়ি উত্তরে কোনো নম্বর নেই; requirement না বুঝে design করা বরং বড় red flag। প্রশ্ন করলে interviewer হয় উত্তর দেবেন, নয়তো বলবেন "আপনি ধরে নিন"। তখন assumption বোর্ডে লিখে রাখুন: পরে কাজে লাগবে।' },
    { kind: 'list', items: [
      'ঠিক কোন কোন feature বানাতে হবে? কোনগুলো এবার বাদ?',
      'কতজন user? প্রতিদিন কতজন (DAU)?',
      '৩ মাস, ৬ মাস, এক বছরে কত বড় হবে?',
      'Company-র এখনকার tech stack কী? কোন service আগে থেকেই আছে যা ব্যবহার করা যায়?',
      'Phone, web, না দুটোই? কোন দেশে? কতটা দ্রুত (latency) আর কতটা নির্ভুল হতে হবে?',
    ] },
    { kind: 'dialog', label: '"ParcelGo-র parcel tracking design করুন": প্রথম পাঁচ মিনিট', lines: [
      { who: 'q', text: 'চলুন ParcelGo-র parcel tracking design করি।' },
      { who: 'a', text: 'শুরুর আগে কয়েকটা প্রশ্ন। Customer শুধু অবস্থা দেখবেন, নাকি rider-এর চলন্ত location-ও map-এ?' },
      { who: 'q', text: 'অবস্থা আর সময়ের হিসাব। Map এবার লাগবে না।' },
      { who: 'a', text: 'অবস্থা বদলায় কে? Rider-এর app, hub-এর scanner, দুটোই?' },
      { who: 'q', text: 'দুটোই। আর merchant-কে webhook-এ জানাতে হবে।' },
      { who: 'tip', text: 'একটা প্রশ্নে লুকানো requirement বেরিয়ে এল: webhook। না জিজ্ঞেস করলে design-এ থাকত না।' },
      { who: 'a', text: 'কত বড়? দিনে কত parcel, আর কতজন দেখেন?' },
      { who: 'q', text: 'দিনে ৩ লাখ parcel, দেখেন ২০ লাখ মানুষ।' },
      { who: 'a', text: 'তাহলে লেখা কম, পড়া অনেক বেশি; cache কাজে আসবে। লিখে রাখছি: ৩ লাখ parcel/দিন, ২০ লাখ DAU, phone আর web, শুধু বাংলাদেশ।' },
      { who: 'tip', text: 'প্রশ্নের শেষে scope আর সংখ্যা বোর্ডে লেখা: এটাই ধাপ ১-এর ফল।' },
    ] },

    { kind: 'h', text: 'ধাপ ২: খসড়া design, সম্মতি নেওয়া' },
    { kind: 'p', text: 'এবার পুরো system-এর একটা নকশা: client, API, service, data store, cache, queue-এর box আর তীর। Interviewer-কে teammate ভেবে বলুন "এটা ঠিক দিকে যাচ্ছে মনে হয়?" দরকার মনে হলে (জিজ্ঞেস করে) একটা মোটামুটি হিসাব দিয়ে যাচাই করুন, আর দু-একটা ঘটনা ধরে নকশার মধ্য দিয়ে হেঁটে দেখান।' },
    { kind: 'flow', label: 'খসড়া: customer দেখেন, rider আর hub অবস্থা বদলান; লেখা queue হয়ে DB-তে, merchant-কে webhook', h: 36, nodes: [
      { id: 'app', label: 'Customer app', x: 11, y: 7, w: 20 },
      { id: 'rider', label: 'Rider / hub', x: 11, y: 29, w: 20 },
      { id: 'api', label: 'API gateway', x: 38, y: 18, w: 19 },
      { id: 'track', label: 'Tracking', sub: 'cache সহ', x: 66, y: 7 },
      { id: 'q', label: 'Queue', x: 66, y: 29 },
      { id: 'db', label: 'DB', x: 90, y: 18, w: 13 },
      { id: 'hook', label: 'Webhook', sub: 'merchant', x: 90, y: 32, w: 15 },
    ], links: [
      { from: 'app', to: 'api', rate: 4 }, { from: 'rider', to: 'api', rate: 2 },
      { from: 'api', to: 'track', rate: 4 }, { from: 'api', to: 'q', rate: 2 },
      { from: 'q', to: 'db', rate: 2 }, { from: 'track', to: 'db', rate: 0.8 }, { from: 'q', to: 'hook', rate: 1, color: '#FFC02E' },
    ] },
    { kind: 'p', text: 'API endpoint আর database schema এই ধাপে দেখাবেন কিনা, সমস্যার উপর নির্ভর করে। "Google search design করুন"-এ সেটা অনেক নিচু স্তরের কথা; একটা multiplayer খেলার backend-এ যুক্তিসঙ্গত। জিজ্ঞেস করে নিন।' },

    { kind: 'h', text: 'ধাপ ৩: গভীরে যাওয়া' },
    { kind: 'p', text: 'এখানে আসার আগে scope-এ মিল, নকশা আঁকা, আর feedback নেওয়া হয়ে গেছে। এবার interviewer-এর সাথে ঠিক করুন কোন অংশ সবচেয়ে গুরুত্বপূর্ণ, আর সেটার গভীরে যান। যে খুঁটিনাটি কোনো signal দেয় না (যেমন কোনো কোম্পানির ranking algorithm-এর ভেতরের সূত্র), তাতে সময় নষ্ট করবেন না।' },
    { kind: 'table', head: ['সমস্যা', 'সাধারণত কোথায় গভীরে'], rows: [
      ['URL shortener', 'লম্বা link থেকে ছোট code বানানোর উপায়'],
      ['Chat', 'বার্তা কত দ্রুত পৌঁছায়; কে online'],
      ['News feed', 'Post ছড়ানো আর feed জোড়া দেওয়া'],
      ['ParcelGo tracking', 'ঈদের সময় লেখার ভিড়; একই parcel হাজারজন দেখলে (hot key)'],
      ['Senior পদের জন্য', 'Performance, bottleneck, সংখ্যা দিয়ে resource-এর হিসাব'],
    ] },

    { kind: 'h', text: 'ধাপ ৪: গুছিয়ে শেষ' },
    { kind: 'list', items: [
      'Bottleneck কোথায়, কী দিয়ে উন্নত করবেন। কখনো বলবেন না design নিখুঁত।',
      'পুরো design-এর এক মিনিটের সারাংশ, বিশেষ করে একাধিক বিকল্প দিয়ে থাকলে।',
      'Error-এর কথা: server বসে গেলে, network কেটে গেলে কী হয়।',
      'চালানোর কথা: কী metric দেখবেন, কীভাবে নতুন version ধীরে ধীরে ছাড়বেন।',
      'পরের scale: ১০ লাখ থেকে ১ কোটি user হলে কী বদলাবেন।',
    ] },

    { kind: 'h', text: 'Interviewer যা খোঁজেন' },
    { kind: 'table', head: ['ভালো signal', 'Red flag'], rows: [
      ['প্রশ্ন করে অস্পষ্টতা দূর করা', 'Requirement না বুঝেই উত্তর'],
      ['জোরে ভাবা: কী ভাবছেন জানানো', 'চুপচাপ অনেকক্ষণ ভাবা'],
      ['একাধিক বিকল্প আর তাদের দাম-লাভ', 'Tradeoff না দেখে নিখুঁত design-এর পেছনে ছোটা (over-engineering)'],
      ['নিজের যুক্তি দেখানো, feedback নেওয়া', 'একগুঁয়েমি, অন্য মত না শোনা'],
      ['আগে পুরো ছবি, তারপর গভীরে', 'শুরুতেই একটা অংশের খুঁটিনাটিতে ডুবে যাওয়া'],
      ['আটকে গেলে hint চাওয়া', 'আটকে গিয়েও চুপ থাকা'],
    ] },
    { kind: 'tip', title: 'শেষ বলে interviewer, আপনি নন', text: 'নকশা দিয়েই কাজ শেষ ভাববেন না। আগে আগে আর বারবার জিজ্ঞেস করুন: "এই অংশটা আরও গভীরে দেখব, নাকি পরেরটায় যাব?"' },

    { kind: 'mistakes', items: [
      'প্রথম মিনিটেই box আঁকা শুরু।',
      'সংখ্যা না জেনে design: শেষে বোঝা গেল দরকার ছিল দশ গুণ ছোট বা বড় কিছু।',
      'Deep dive-এ সব অংশ একটু একটু, কোনোটাই গভীরে না।',
      'শেষে bottleneck বা error-এর কথা না বলা।',
    ] },
    { kind: 'check', items: [
      { q: 'চারটা ধাপের নাম আর সময়?', a: 'বুঝে নেওয়া ও scope (৩–১০ মি), খসড়া design ও সম্মতি (১০–১৫), গভীরে যাওয়া (১০–২৫), গুছিয়ে শেষ (৩–৫)।' },
      { q: 'Interviewer বললেন "আপনি ধরে নিন"। কী করবেন?', a: 'একটা যুক্তিসঙ্গত assumption বলে বোর্ডে লিখে রাখুন, যেমন "দিনে ৩ লাখ parcel ধরলাম"। পরের হিসাব আর সিদ্ধান্ত সেখান থেকে।' },
      { q: 'Wrap up-এ কোন চারটা বিষয় তুলবেন?', a: 'Bottleneck ও উন্নতি, সংক্ষেপে সারাংশ, error-এর ক্ষেত্রে কী হয়, আর পরের scale-এ কী বদলাবে (সাথে monitoring ও rollout)।' },
    ] },
  ],
};
