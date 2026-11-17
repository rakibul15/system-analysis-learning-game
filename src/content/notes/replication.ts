import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const replication: Note = {
  id: 'replication',
  title: 'Replication: একই data কয়েক জায়গায়',
  gist: 'একই data কয়েকটা machine-এ রাখা, যাতে একটা পড়ে গেলেও কাজ চলে আর পড়ার চাপ ভাগ হয়ে যায়।',
  levels: [1, 6],
  angles: {
    xu: 'Design-এ কোথায় replica বসাবেন, পড়া কোথা থেকে, লেখা কোথায়',
    ddia: 'Replica পিছিয়ে থাকলে user কী অদ্ভুত জিনিস দেখে, আর leader বদলের সময় কী হারায়',
  },
  blocks: [
    { kind: 'h', text: 'কেন লাগে' },
    { kind: 'p', text: 'ParcelGo-র order database একটাই হলে দুটো বিপদ। এক, ওই machine পড়লে order নেওয়া, tracking সব বন্ধ। দুই, প্রতিটা order একবার লেখা হয় কিন্তু tracking page-এ সেটা পড়া হয় শতবার: পড়ার চাপেই একটা machine হাঁপিয়ে ওঠে। Replication দুটোরই উত্তর: data-র কয়েকটা কপি রাখুন, পড়া ভাগ করে দিন, একটা গেলে আরেকটা আছে।' },
    { kind: 'flow', label: 'লেখা যায় leader-এ, সেখান থেকে follower-রা কপি নেয়; পড়া আসে follower থেকে', h: 34, nodes: [
      { id: 'app', label: 'API', x: 10, y: 17 },
      { id: 'l', label: 'Leader', x: 46, y: 17, sub: 'লেখা এখানে' },
      { id: 'f1', label: 'Follower ১', x: 86, y: 6 },
      { id: 'f2', label: 'Follower ২', x: 86, y: 28, tone: 'hot', sub: 'একটু পিছিয়ে' },
    ], links: [
      { from: 'app', to: 'l', rate: 2, color: '#E0483E' },
      { from: 'l', to: 'f1', rate: 2 },
      { from: 'l', to: 'f2', rate: 2, secs: 2.6 },
      { from: 'f1', to: 'app', rate: 4, color: '#2F6FDE' },
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 6, items: [
      { n: '6-1', page: 199, look: 'Leader থেকে follower-দের দিকে লেখার স্রোত' },
      { n: '6-2', page: 200, look: 'একটা follower sync, আরেকটা async: কে কখন "পেয়েছি" বলে' },
    ] },

    { kind: 'h', text: 'তিন ধরনের replication' },
    { kind: 'table', head: ['ধরন', 'কে লেখা নেয়', 'কখন ভালো', 'ঝুঁকি'], rows: [
      ['Single-leader', 'শুধু একটা leader', 'বেশিরভাগ app: সহজ, ক্রম পরিষ্কার', 'Leader বদলের সময় গোলমাল; সব লেখা এক জায়গায়'],
      ['Multi-leader', 'কয়েকটা leader, যেমন প্রতি অঞ্চলে একটা', 'অনেক অঞ্চল, বা offline-এ কাজ করা app', 'দুই জায়গায় একই জিনিস বদলালে সংঘাত'],
      ['Leaderless', 'যেকোনো কয়েকটা node', 'খুব বেশি লেখা, কিছুটা পুরনো data চলে', 'Quorum-এর হিসাব আর পুরনো মান মেরামত করা লাগে'],
    ] },

    { kind: 'h', text: 'সাথে সাথে না পরে: sync বনাম async' },
    { kind: 'p', text: 'Sync মানে leader অপেক্ষা করে follower "পেয়েছি" না বলা পর্যন্ত: data নিরাপদ, কিন্তু একটা ধীর follower সব লেখা আটকে দেয়। Async মানে leader অপেক্ষা করে না: দ্রুত, কিন্তু leader হঠাৎ মরলে শেষ কয়েকটা লেখা কোনো follower-এ পৌঁছায়নি, সেগুলো হারায়। বাস্তবে প্রায়ই মাঝামাঝি: একটা follower sync, বাকিরা async।' },

    { kind: 'h', text: 'Leader পড়ে গেলে (failover)' },
    { kind: 'list', items: [
      'টের পাওয়া: কিছুক্ষণ সাড়া না দিলে "মৃত" ধরা হয়। Timeout ছোট হলে অকারণে failover, বড় হলে অনেকক্ষণ লেখা বন্ধ।',
      'নতুন leader বাছা: সাধারণত যে follower সবচেয়ে এগিয়ে।',
      'সবাইকে জানানো: app যেন নতুন leader-এ লেখে।',
      'বিপদ ১: async-এ পিছিয়ে থাকা follower leader হলে কিছু লেখা চিরতরে হারায়। সেই order-এর ID যদি অন্য কোথাও (cache, SMS) চলে গিয়ে থাকে, গোলমাল আরও বড়।',
      'বিপদ ২: পুরনো leader ফিরে এসে নিজেকে এখনো leader ভাবে, দুজনেই লেখা নেয় (split brain)।',
    ] },
    { kind: 'says', topic: 'Leader বা master পড়ে গেলে',
      xu: { text: 'Master-slave কাঠামো: লেখা master-এ, পড়া slave থেকে। Master গেলে একটা slave-কে master বানানো হয়; সেই slave পুরো আপডেট না থাকলে বাকি data recovery script দিয়ে মেলাতে হয়। মূল লাভ হিসেবে বলা: ভালো performance, নির্ভরযোগ্যতা, আর সবসময় চালু থাকা।', ref: { book: 'xu1', chapter: 1 } },
      ddia: { text: 'Failover-কে তিন ধাপে ভাঙে: মৃত্যু টের পাওয়া, নতুন leader বাছা, সবাইকে জানানো। তারপর দেখায় প্রতিটা ধাপে কী ভুল হতে পারে: async-এ লেখা হারানো, দুই leader, আর timeout কত হবে সেই দ্বিধা।', ref: { book: 'ddia2', chapter: 6, section: 'Handling Node Outages', pages: [204, 205] } } },

    { kind: 'h', text: 'Replica পিছিয়ে থাকলে তিনটা অদ্ভুত জিনিস' },
    { kind: 'story', title: '১. নিজের লেখা নিজে দেখি না', steps: ['Merchant pickup ঠিকানা বদলে Save চাপল (লেখা গেল leader-এ)।', 'Page reload হলো, পড়া এল এক পিছিয়ে থাকা follower থেকে।', 'Merchant দেখল পুরনো ঠিকানা, ভাবল save হয়নি, আবার বদলাল।'], fix: 'নিজের সদ্য বদলানো জিনিস কিছুক্ষণ (যেমন ১ মিনিট) leader থেকে পড়ুন, অথবা শেষ লেখার সময়ের পরের data আছে এমন replica থেকে।' },
    { kind: 'story', title: '২. সময় পেছনে যায়', steps: ['Customer tracking খুলল: "Delivered" (এগিয়ে থাকা follower)।', 'Refresh দিল, এবার পড়া এল পিছিয়ে থাকা follower থেকে।', 'দেখাল "পথে আছে"। Customer ঘাবড়ে গেল।'], fix: 'একজন user-কে সবসময় একই replica-য় পাঠান (যেমন user id-র hash ধরে), তাহলে সময় অন্তত পেছনে যাবে না।' },
    { kind: 'story', title: '৩. কারণের আগে ফল', steps: ['Customer chat-এ জিজ্ঞেস করল "কখন আসবেন?"', 'Rider উত্তর দিল "৫ মিনিটে"।', 'কেউ এমন replica থেকে পড়ল যেখানে উত্তর আগে পৌঁছেছে, প্রশ্ন পরে।'], fix: 'যে লেখাগুলো একটার সাথে আরেকটা জড়িত, সেগুলো একই ক্রমে একই জায়গায় লিখুন (যেমন একটা chat-এর সব message এক partition-এ)।' },
    { kind: 'figs', book: 'ddia2', chapter: 6, items: [
      { n: '6-3', page: 210, look: 'নিজের লেখা নিজে না দেখা: লেখা আর পড়া দুই জায়গায়' },
      { n: '6-4', page: 213, look: 'দুইবার পড়ায় সময় পেছনে যাওয়া' },
      { n: '6-5', page: 214, look: 'উত্তর আগে, প্রশ্ন পরে: ক্রম ভাঙা' },
    ] },

    { kind: 'h', text: 'Quorum: কয়টার কাছে লিখব, কয়টা থেকে পড়ব' },
    { kind: 'p', text: 'Leaderless-এ N টা কপি। লেখা সফল ধরা হয় W টা node "পেয়েছি" বললে, পড়ায় নেওয়া হয় R টা node-এর উত্তর। W + R > N হলে লেখার দল আর পড়ার দল অন্তত একটা node-এ মিলবেই, তাই সর্বশেষ মান অন্তত একজনের কাছে থাকে। N = 3, W = 2, R = 2 সাধারণ পছন্দ: একটা node বন্ধ থাকলেও লেখা আর পড়া দুটোই চলে।' },
    { kind: 'tip', title: 'তবে এটা জাদু না', text: 'দুটো লেখা একই সময়ে এলে কোনটা আগে, সেটা বোঝার আলাদা ব্যবস্থা (version) লাগে। আর node বন্ধ থাকার সময় অন্য node-এ লেখা রাখলে হিসাব ঢিলে হয়ে যায়। "W + R > N মানে সবসময় সর্বশেষ" ধরে নেবেন না।' },
    { kind: 'says', topic: 'Quorum',
      xu: { text: 'Key-value store design-এর অংশ হিসেবে N, W, R বোঝায়, আর কোন মান নিলে দ্রুত পড়া, দ্রুত লেখা বা strong consistency পাওয়া যায় তার ছক দেয়। Node বন্ধ থাকলে sloppy quorum আর hinted handoff, পরে কপি মেলাতে Merkle tree।', ref: { book: 'xu1', chapter: 6 } },
      ddia: { text: 'একই ধারণা, কিন্তু সীমাগুলোয় জোর: W + R > N থাকলেও কোন কোন অবস্থায় পুরনো মান ফেরত আসতে পারে, আর একই সময়ের দুই লেখা কীভাবে আলাদা করে চেনা যায়।', ref: { book: 'ddia2', chapter: 6, section: 'Leaderless Replication', pages: [229, 242] } } },
    { kind: 'figs', book: 'ddia2', chapter: 6, items: [
      { n: '6-12', page: 230, look: 'একটা node বন্ধ থাকার সময় লেখা আর পরে পড়া' },
      { n: '6-13', page: 232, look: 'W আর R-এর দল কোথায় মেলে' },
    ] },

    { kind: 'h', text: 'Multi-leader-এ সংঘাত' },
    { kind: 'p', text: 'ঢাকা আর চট্টগ্রাম অফিসে দুজন একই parcel-এর ঠিকানা একসাথে বদলাল। "যে পরে লিখেছে সে জিতবে" (last write wins) সহজ, কিন্তু একজনের বদল চুপচাপ হারায়, আর দুই machine-এর ঘড়ি না মিললে "পরে" কে, সেটাও ভুল হতে পারে। ভালো উপায়: একটা parcel সবসময় একটা অঞ্চলের leader-এ লেখা হবে (সংঘাতই হবে না), অথবা দুটো বদল মিলিয়ে ফেলার নিয়ম থাকবে।' },
    { kind: 'says', topic: 'একই জিনিস দুই জায়গায় বদলালে',
      xu: { text: 'Vector clock দিয়ে বোঝানো হয় কোন version কোনটার পরে, আর কখন দুটো সত্যিই সংঘাতে। সংঘাত মেলানোর দায় তখন client-এর।', ref: { book: 'xu1', chapter: 6 } },
      ddia: { text: 'সংঘাত এড়ানো, last write wins-এর দাম, নিজে থেকে মিলে যাওয়া data type, আর offline-এ চলা app-এর sync engine: কোনটা কখন, তার পুরো আলোচনা।', ref: { book: 'ddia2', chapter: 6, section: 'Dealing with Conflicting Writes', pages: [222, 228] } } },
    { kind: 'figs', book: 'ddia2', chapter: 6, items: [
      { n: '6-9', page: 222, look: 'দুই leader-এ একই জিনিসের দুই রকম বদল' },
    ] },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"পড়া লেখার চেয়ে অনেক বেশি, তাই একটা leader আর কয়েকটা read replica।"',
      '"Replica একটু পিছিয়ে থাকে; নিজের বদল দেখার পাতায় leader থেকে পড়ব।"',
      '"Leader পড়লে সবচেয়ে এগিয়ে থাকা replica leader হবে; async-এ শেষ কয়েকটা লেখা হারানোর ঝুঁকি মানছি, টাকার হিসাব হলে sync follower রাখব।"',
    ] },

    { kind: 'mistakes', items: [
      'Replica-কে backup ভাবা: ভুল করে কিছু মুছলে replica-তেও সাথে সাথে মুছে যায়। Backup আলাদা জিনিস।',
      'Replica বাড়ালে লেখার চাপও কমবে ভাবা: সব লেখা তো leader-এই যায়। লেখা ভাগ করতে sharding লাগে।',
      'Failover-কে নিরাপদ ধরে নেওয়া: হারানো লেখা আর দুই leader, দুটো ঝুঁকিই বলুন।',
    ] },

    { kind: 'check', items: [
      { q: 'Async replication-এ leader হঠাৎ মরলে কী হারাতে পারে?', a: 'যে লেখাগুলো leader নিয়েছে কিন্তু কোনো follower-এ পৌঁছায়নি। নতুন leader সেগুলো জানেই না।' },
      { q: 'Customer refresh দিলে "Delivered" থেকে "পথে আছে" দেখল। কারণ আর সমাধান?', a: 'দুইবার দুই আলাদা replica থেকে পড়া হয়েছে, দ্বিতীয়টা পিছিয়ে। সমাধান: একজন user-কে সবসময় একই replica-য় পাঠানো।' },
      { q: 'N = 5 হলে, W = 3 ধরলে R কমপক্ষে কত লাগবে যাতে পড়ায় সর্বশেষ মান থাকে?', a: 'R = 3, কারণ W + R > N লাগবে: 3 + 3 = 6 > 5।' },
      { q: 'লেখা খুব বেশি হলে আরও replica যোগ করা কেন সমাধান না?', a: 'সব লেখা leader-এই যায়, আর প্রতিটা replica-কেও প্রতিটা লেখা কপি করতে হয়। লেখা ভাগ করতে sharding লাগে।' },
    ] },
  ],
  refs: [
    { book: 'xu1', chapter: 1 },
    { book: 'xu1', chapter: 6 },
    { book: 'ddia2', chapter: 6, section: 'Single-Leader Replication', pages: [198, 208] },
    { book: 'ddia2', chapter: 6, section: 'Problems with Replication Lag', pages: [209, 214] },
    { book: 'ddia2', chapter: 6, section: 'Multi-Leader Replication', pages: [215, 228] },
    { book: 'ddia2', chapter: 6, section: 'Leaderless Replication', pages: [229, 242] },
  ],
};
