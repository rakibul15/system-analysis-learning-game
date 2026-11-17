import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const sharding: Note = {
  id: 'sharding',
  title: 'Sharding: data ভাগ করে কয়েকটা machine-এ',
  gist: 'Data এত বড় বা লেখা এত বেশি যে এক machine পারে না, তখন data টুকরো করে আলাদা আলাদা machine-এ রাখা।',
  levels: [5, 16, 25],
  angles: {
    xu: 'Consistent hashing দিয়ে key কোন server-এ যাবে, server যোগ-বাদে কম key সরানো',
    ddia: 'কোন ভাগের নিয়ম কোন query-তে ভালো, hot spot, secondary index ভাগ করলে কী হয়, request কীভাবে ঠিক জায়গায় যায়',
  },
  blocks: [
    { kind: 'h', text: 'কেন লাগে' },
    { kind: 'p', text: 'Replication পড়া ভাগ করে, কিন্তু প্রতিটা লেখা তবু সব কপিতে যায়। ঈদের আগে ParcelGo দিনে ৫০ লাখ order নিলে সেই লেখার চাপ একটা leader আর সামলাতে পারে না, data-ও এক disk-এ আঁটে না। Sharding মানে data ভাগ করা: কিছু merchant-এর order এক machine-এ, বাকিদের আরেকটায়। তখন লেখাও ভাগ হয়, জায়গাও।' },
    { kind: 'p', text: 'সাধারণত দুটো একসাথে চলে: প্রতিটা shard-এর কয়েকটা replica থাকে। একটা machine কয়েকটা shard-এর leader আর অন্য কয়েকটার follower হতে পারে।' },
    { kind: 'figs', book: 'ddia2', chapter: 7, items: [
      { n: '7-1', page: 252, look: 'একই machine কোনো shard-এর leader, আবার অন্য shard-এর follower' },
    ] },

    { kind: 'h', text: 'ভাগের দুই নিয়ম' },
    { kind: 'table', head: ['নিয়ম', 'কীভাবে', 'ভালো দিক', 'ঝুঁকি'], rows: [
      ['Key range', 'Key-এর ক্রম ধরে ভাগ: order_id ১–১০ লাখ shard A-তে, তারপর B-তে…', 'পরপর key একসাথে: "গত এক ঘণ্টার order" এক জায়গায় পড়া যায়', 'সব নতুন লেখা শেষের shard-এ: এক machine গরম'],
      ['Key-এর hash', 'hash(key) দেখে shard ঠিক হয়', 'লেখা সমানভাবে ছড়ায়', 'পরপর key ছড়িয়ে যায়: range query সব shard-এ যায়'],
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 7, items: [
      { n: '7-2', page: 256, look: 'ক্রম ধরে ভাগ: প্রতিটা খণ্ডের শুরু আর শেষ key' },
      { n: '7-5', page: 261, look: 'Hash-এর পরিসর ভাগ করে shard দেওয়া' },
    ] },

    { kind: 'h', text: 'hash % N-এর ফাঁদ' },
    { kind: 'p', text: 'সবচেয়ে সহজ: shard = hash(key) % N। কিন্তু N বদলালেই প্রায় সব key-এর shard বদলায়। ৪টা থেকে ৫টা server করলে প্রায় ৮০% data সরাতে হয়, আর সেই সময় cache-এ সব miss। এজন্যই আগে থেকে অনেক বেশি shard বানিয়ে রাখা (যেমন ১,০২৪টা) আর server-এ শুধু shard সরানো, অথবা consistent hashing।' },
    { kind: 'figs', book: 'ddia2', chapter: 7, items: [
      { n: '7-3', page: 259, look: 'mod N দিয়ে key বসানো' },
      { n: '7-4', page: 259, look: 'একটা node বাদ গেলে mod N-এ কত key সরে' },
    ] },
    { kind: 'says', topic: 'Server যোগ-বাদে কম data সরানো',
      xu: { text: 'Hash ring-এ server আর key দুটোই বসে; key clockwise প্রথম server-এ যায়। Server যোগ-বাদে শুধু পাশের ভাগটা সরে। ভাগ অসমান হলে প্রতিটা server-কে ring-এ অনেক জায়গায় বসানো হয় (virtual node)।', ref: { book: 'xu1', chapter: 5 } },
      ddia: { text: 'একই সমস্যার কয়েকটা সমাধান পাশাপাশি: আগে থেকে নির্দিষ্ট সংখ্যক shard, data বাড়লে shard ভাগ হওয়া, আর hash-এর পরিসর ভাগ। কোনটায় কতটা data সরে আর কখন হাতে নিয়ন্ত্রণ ভালো, তার আলোচনা।', ref: { book: 'ddia2', chapter: 7, section: 'Sharding by Hash of Key', pages: [258, 262] } } },

    { kind: 'h', text: 'Hot spot: এক key-এ সবাই' },
    { kind: 'story', title: 'এক বড় merchant-এর flash sale', steps: [
      'Order merchant_id দিয়ে shard করা।',
      'এক বিশাল fashion merchant রাত ১২টায় sale দিল: মিনিটে লাখো order, সব একই merchant_id।',
      'ওই একটা shard-এর CPU ১০০%, বাকি shard-গুলো প্রায় ফাঁকা। Server বাড়িয়ে লাভ নেই, কারণ key একটাই।',
    ], fix: 'জানা বড় merchant-এর key-এ ছোট একটা suffix (০–৯) জুড়ে ১০ ভাগে ছড়ান; পড়ার সময় ১০টা থেকে মিলিয়ে নিন। শুধু গরম key-এর জন্য করুন, সবার জন্য না।' },
    { kind: 'tip', title: 'Server বাড়ালেই সমান হয় না', text: 'ভাগ যদি key ধরে হয়, তাহলে একটা key-এর সব কাজ এক জায়গায়। এক key-এর চাপ কমাতে key-টাকেই ভাঙতে হয়।' },

    { kind: 'h', text: 'Secondary index ভাগ করলে' },
    { kind: 'p', text: 'Order shard করা order_id দিয়ে, কিন্তু customer খুঁজবে নিজের ফোন নম্বর দিয়ে। দুই উপায়: প্রতিটা shard নিজের order-এর ফোন index রাখে (লেখা সহজ, কিন্তু খুঁজতে সব shard-কে জিজ্ঞেস করতে হয়), অথবা ফোন নম্বর ধরে আলাদা করে ভাগ করা একটা global index (খোঁজা এক জায়গায়, কিন্তু একটা লেখায় দুই জায়গায় হালনাগাদ, প্রায়ই একটু দেরিতে)।' },
    { kind: 'figs', book: 'ddia2', chapter: 7, items: [
      { n: '7-9', page: 269, look: 'Local index: প্রতিটা shard শুধু নিজেরটা, খুঁজতে সবাইকে জিজ্ঞেস' },
      { n: '7-10', page: 270, look: 'Global index: index নিজেই আলাদা ভাগে' },
    ] },

    { kind: 'h', text: 'Request ঠিক shard-এ যায় কীভাবে' },
    { kind: 'list', items: [
      'যেকোনো node-এ পাঠান; ভুল হলে সে ঠিক node-এ পাঠিয়ে দেয়।',
      'মাঝে একটা routing স্তর রাখুন যে জানে কোন shard কোথায়।',
      'Client নিজেই তালিকা রাখে আর সরাসরি ঠিক node-এ যায়।',
      'যেটাই হোক, "কোন shard কোথায়" তালিকা সবাইকে একই রাখতে হয়: সাধারণত একটা coordination service (যেমন ZooKeeper) এই দায়িত্ব নেয়।',
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 7, items: [
      { n: '7-7', page: 266, look: 'ঠিক node খুঁজে পাওয়ার তিন পথ' },
    ] },
    { kind: 'says', topic: 'কোন key দিয়ে ভাগ করবেন',
      xu: { text: 'Leaderboard design-এ দুই পথ: score-এর পরিসর ধরে ভাগ (top list এক জায়গায়) আর user id-র hash ধরে ভাগ (প্রতিটা ভাগের top মিলিয়ে নেওয়া), আর প্রতিটার দাম।', ref: { book: 'xu2', chapter: 10 } },
      ddia: { text: 'নিয়ম থেকে শুরু: যে query সবচেয়ে বেশি চলে, সেই query যেন এক shard-এ শেষ হয়। তারপর skew, hot spot আর rebalancing হাতে না নিজে থেকে, তার দাম।', ref: { book: 'ddia2', chapter: 7, section: 'Skewed Workloads and Relieving Hot Spots', pages: [263, 263] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"লেখা এক machine-এর ক্ষমতার বেশি, তাই order shard করব merchant_id-এর hash দিয়ে; dashboard-এর query এক shard-এই শেষ হবে।"',
      '"শুরুতেই ১,০২৪টা logical shard বানাব; server বাড়লে শুধু shard সরবে, key-এর হিসাব বদলাবে না।"',
      '"বড় merchant-এর জন্য hot key ভেঙে দেব; customer-এর ফোন দিয়ে খোঁজার জন্য একটা global index, একটু দেরিতে হালনাগাদ।"',
    ] },
    { kind: 'mistakes', items: [
      'প্রয়োজনের আগেই shard করা: জটিলতা অনেক, আর অনেক app এক machine আর কয়েকটা replica-তেই চলে।',
      'সময় দিয়ে shard করা ("এই মাসের order এই shard-এ"): সব লেখা এক shard-এ গিয়ে পড়ে।',
      'hash % N বেছে নিয়ে server সংখ্যা বদলানো: প্রায় সব data সরাতে হয়।',
      'Cross-shard transaction সহজ ভাবা: দুই shard-এ একসাথে লেখা নিশ্চিত করতে আলাদা ব্যবস্থা লাগে।',
    ] },
    { kind: 'check', items: [
      { q: 'Key range আর hash: "গত ১ ঘণ্টার সব order" কোনটায় দ্রুত?', a: 'Key range (সময় বা ক্রমিক ID ধরে), কারণ পরপর key এক জায়গায়। Hash-এ সব shard-কে জিজ্ঞেস করতে হয়।' },
      { q: '৪ থেকে ৫ server-এ hash % N হলে মোটামুটি কত data সরে?', a: 'প্রায় ৮০%। Consistent hashing বা আগে থেকে বেশি shard থাকলে মাত্র ~২০%।' },
      { q: 'এক merchant-এর জন্য এক shard ১০০%, বাকিরা ফাঁকা। server বাড়ালে কাজ হবে?', a: 'না, key একটাই তাই কাজ এক জায়গায়। ওই key-কে কয়েক ভাগে (suffix দিয়ে) ছড়াতে হবে।' },
      { q: 'Local আর global secondary index-এর মূল লেনদেন কী?', a: 'Local: লেখা সহজ, খোঁজা সব shard-এ। Global: খোঁজা এক জায়গায়, লেখা দুই জায়গায় আর প্রায়ই একটু দেরিতে।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 7, pages: [251, 276] },
    { book: 'xu1', chapter: 5 },
  ],
  refs: [
    { book: 'xu1', chapter: 5 },
    { book: 'xu2', chapter: 10 },
    { book: 'ddia2', chapter: 7, section: 'Sharding by Key Range', pages: [256, 257] },
    { book: 'ddia2', chapter: 7, section: 'Sharding by Hash of Key', pages: [258, 262] },
    { book: 'ddia2', chapter: 7, section: 'Request Routing', pages: [265, 267] },
    { book: 'ddia2', chapter: 7, section: 'Sharding and Secondary Indexes', pages: [268, 270] },
  ],
};
