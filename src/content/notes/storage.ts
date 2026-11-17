import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const storage: Note = {
  id: 'storage',
  title: 'Storage engine: data disk-এ কীভাবে বসে',
  gist: 'একই data রাখার দুই বড় পথ (LSM আর B-tree), আর analytics-এর জন্য কলাম ধরে রাখা: কোনটা কখন দ্রুত।',
  levels: [6, 13, 20],
  angles: {
    xu: 'Key-value store-এর লেখার পথ: commit log, memtable, SSTable, Bloom filter',
    ddia: 'LSM আর B-tree-র ভেতরের কাজ, কোনটার দাম কোথায়, আর OLTP বনাম analytics-এর আলাদা storage',
  },
  blocks: [
    { kind: 'h', text: 'কেন জানা দরকার' },
    { kind: 'p', text: 'Rider-এর অবস্থান সেকেন্ডে হাজারবার লেখা হয়, পড়া হয় কদাচিৎ। Order table-এ লেখা কম, পড়া অনেক, আর প্রতিটা পড়া একটা নির্দিষ্ট order। মাসের রিপোর্ট লাখো সারি পড়ে, কিন্তু তিনটা কলাম। তিনটা কাজের জন্য সেরা storage আলাদা; ভেতরের কাজ জানলে কোন DB কোথায় বসবে বলা সহজ।' },

    { kind: 'h', text: 'LSM: আগে memory, পরে ক্রমিকভাবে disk' },
    { kind: 'list', items: [
      'লেখা প্রথমে একটা log-এর শেষে যোগ হয় (crash-এ ফেরত আনার জন্য), তারপর memory-র সাজানো গঠনে (memtable)।',
      'Memtable ভরলে পুরোটা সাজানো অবস্থায় disk-এ নতুন একটা file (SSTable) হয়ে যায়: ক্রমিক লেখা, তাই দ্রুত।',
      'পড়তে গেলে memtable, তারপর নতুন থেকে পুরনো file: "এই key এখানে নেই" দ্রুত বলতে প্রতিটা file-এর Bloom filter।',
      'পেছনে compaction পুরনো file-গুলো মিলিয়ে ছোট করে, পুরনো মান আর মোছার চিহ্ন বাদ দেয়।',
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 4, items: [
      { n: '4-2', page: 119, look: 'Key ধরে সাজানো file আর তার ছোট index' },
      { n: '4-3', page: 121, look: 'কয়েকটা file মিলিয়ে প্রতিটা key-এর শেষ মান রাখা' },
      { n: '4-4', page: 123, look: 'Bloom filter: "নিশ্চিত নেই" বা "হয়তো আছে"' },
    ] },
    { kind: 'says', topic: 'লেখার পথ',
      xu: { text: 'Key-value store design-এ: লেখা আগে commit log-এ, তারপর memory cache-এ, ভরলে SSTable হয়ে disk-এ। পড়ায় আগে memory, না পেলে Bloom filter দেখে কোন SSTable-এ থাকতে পারে।', ref: { book: 'xu1', chapter: 6 } },
      ddia: { text: 'সবচেয়ে সাধারণ log থেকে শুরু করে ধাপে ধাপে SSTable আর LSM-tree পর্যন্ত গড়ে তোলে, তারপর compaction-এর ধরন আর Bloom filter কীভাবে পড়া বাঁচায়।', ref: { book: 'ddia2', chapter: 4, section: 'Log-Structured Storage', pages: [118, 124] } } },

    { kind: 'h', text: 'B-tree: নির্দিষ্ট আকারের পাতায় সাজানো' },
    { kind: 'p', text: 'Data কয়েক KB-র পাতায় ভাগ, পাতাগুলো একটা গাছ: root থেকে কয়েক ধাপে যেকোনো key। লেখা মানে ঠিক পাতাটা জায়গায় বদলানো; পাতা ভরলে দুই ভাগ। বেশিরভাগ relational DB-র ভিত এটা: পড়া স্থির আর অনুমানযোগ্য।' },
    { kind: 'figs', book: 'ddia2', chapter: 4, items: [
      { n: '4-5', page: 126, look: 'Root থেকে পাতা ধরে একটা key খোঁজা' },
      { n: '4-6', page: 127, look: 'পাতা ভরলে দুই ভাগ হওয়া' },
    ] },

    { kind: 'h', text: 'কোনটা কোথায়' },
    { kind: 'table', head: ['', 'LSM-tree', 'B-tree'], rows: [
      ['লেখা', 'খুব দ্রুত, ক্রমিক', 'জায়গায় বদল, একটু ধীর'],
      ['পড়া', 'কয়েক file দেখতে হতে পারে', 'স্থির, অনুমানযোগ্য'],
      ['পেছনের কাজ', 'Compaction মাঝে মাঝে disk খায়', 'কম'],
      ['ParcelGo-তে', 'Rider location, metrics, event log', 'Order, payment, user'],
    ] },
    { kind: 'tip', title: 'Index-এর দাম', text: 'প্রতিটা secondary index প্রতিটা লেখায় আরেকটা লেখা। পড়ার query যেভাবে filter আর sort করে, সেই ক্রমে একটা মিলিত index প্রায়ই পাঁচটা আলাদা index-এর চেয়ে ভালো।' },

    { kind: 'h', text: 'Analytics: সারি না, কলাম ধরে' },
    { kind: 'p', text: '"গত মাসে এলাকা ধরে মোট COD" ৫ কোটি সারি পড়ে, কিন্তু দরকার শুধু area_id, delivered_at, cod। সারি ধরে রাখলে প্রতিটা ৪০-কলামের সারি পুরোটা পড়তে হয়। কলাম ধরে রাখলে শুধু ওই তিনটা কলামের file পড়া, আর একই ধরনের মান পাশাপাশি থাকায় খুব ভালো compress হয়।' },
    { kind: 'figs', book: 'ddia2', chapter: 4, items: [
      { n: '4-7', page: 138, look: 'একই table সারির বদলে কলাম ধরে রাখা' },
      { n: '4-8', page: 139, look: 'একটা কলাম compress করা' },
    ] },
    { kind: 'says', topic: 'Metrics-এর মতো সময়-ভিত্তিক data',
      xu: { text: 'Metrics system-এ time-series DB বেছে নেওয়ার যুক্তি: লেখা অনেক, পড়া কম, পরপর মান প্রায় একই বলে delta encoding আর পুরনো data-র resolution কমানো।', ref: { book: 'xu2', chapter: 5 } },
      ddia: { text: 'Column-oriented storage কেন analytics-এ দ্রুত, compression আর bitmap, আর বারবার একই যোগফল না করে materialized view বা data cube রাখা।', ref: { book: 'ddia2', chapter: 4, section: 'Column-Oriented Storage', pages: [136, 141] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"Rider location লেখা-ভারী, তাই LSM-ভিত্তিক store; order আর payment-এ B-tree-ভিত্তিক relational DB।"',
      '"Dashboard-এর query (merchant_id, created_at) ক্রমে, তাই ঠিক সেই মিলিত index।"',
      '"রিপোর্ট live DB-তে না; CDC দিয়ে column store-এ।"',
    ] },
    { kind: 'mistakes', items: [
      'প্রতিটা কলামে index: লেখা ধীর, disk বেশি, আর query planner বিভ্রান্ত।',
      'Live order DB-তে মাসিক রিপোর্ট চালানো।',
      'LSM-এ মোছা মানে সাথে সাথে জায়গা খালি ভাবা: আগে চিহ্ন, পরে compaction।',
    ] },
    { kind: 'check', items: [
      { q: 'Bloom filter কোন প্রশ্নের উত্তর নিশ্চিত দেয়?', a: '"এই key এখানে নেই"। "আছে" বললে হয়তো আছে, disk দেখে নিশ্চিত হতে হয়।' },
      { q: 'লেখা-ভারী কাজে LSM কেন দ্রুত?', a: 'লেখা memory-তে জমে, তারপর একবারে সাজানো file হিসেবে ক্রমিকভাবে disk-এ যায়; জায়গায় জায়গায় বদলাতে হয় না।' },
      { q: '৪০ কলামের মধ্যে ৩টা দরকার, ৫ কোটি সারি। কোন storage?', a: 'Column-oriented: শুধু ৩টা কলাম পড়ে, ভালো compress হয়।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 4, pages: [115, 160] },
    { book: 'xu1', chapter: 6 },
  ],
  refs: [
    { book: 'xu1', chapter: 6 },
    { book: 'xu2', chapter: 5 },
    { book: 'ddia2', chapter: 4, section: 'Log-Structured Storage', pages: [118, 124] },
    { book: 'ddia2', chapter: 4, section: 'B-Trees', pages: [125, 128] },
    { book: 'ddia2', chapter: 4, section: 'Comparing B-Trees and LSM-Trees', pages: [129, 131] },
    { book: 'ddia2', chapter: 4, section: 'Column-Oriented Storage', pages: [136, 141] },
  ],
};
