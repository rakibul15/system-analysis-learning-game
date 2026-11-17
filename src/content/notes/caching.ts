import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const caching: Note = {
  id: 'caching',
  title: 'Cache: বারবার একই প্রশ্নের উত্তর হাতের কাছে',
  gist: 'যা প্রায়ই পড়া হয় তা দ্রুত memory-তে রাখা, যাতে DB-তে চাপ কমে; আর পুরনো হয়ে গেলে কী করবেন তা আগেই ঠিক রাখা।',
  levels: [1, 2, 8],
  angles: {
    xu: 'কোথায় cache বসে, cache-aside, মেয়াদ, CDN, আর cache ভরে যাওয়া বা পড়ে যাওয়া',
    ddia: 'Cache-কে derived data হিসেবে দেখা: মূল data থেকে বানানো কপি, তাই হালনাগাদ রাখার দায়',
  },
  blocks: [
    { kind: 'h', text: 'কেন লাগে' },
    { kind: 'p', text: 'একটা tracking page দিনে হাজারবার খোলে, কিন্তু parcel-এর অবস্থা বদলায় দিনে ৫ বার। প্রতিবার DB-তে গেলে DB ব্যস্ত থাকে একই উত্তর দিতে। Cache সেই উত্তর memory-তে রাখে: microsecond-এ উত্তর, DB আসল কাজে মন দেয়।' },
    { kind: 'flow', label: 'আগে cache দেখা; না পেলে DB থেকে এনে cache-এ রাখা', h: 30, nodes: [
      { id: 'api', label: 'API', x: 10, y: 15 },
      { id: 'c', label: 'Cache', x: 50, y: 6, sub: 'বেশিরভাগ এখানেই' },
      { id: 'db', label: 'DB', x: 50, y: 25, tone: 'cold', sub: 'শুধু miss হলে' },
    ], links: [
      { from: 'api', to: 'c', rate: 5, color: '#0B8A7A' },
      { from: 'api', to: 'db', rate: 1, color: '#E0483E' },
    ] },

    { kind: 'h', text: 'Cache-aside: সবচেয়ে প্রচলিত' },
    { kind: 'list', items: [
      'পড়া: আগে cache; পেলে ফেরত। না পেলে DB থেকে পড়ে cache-এ রাখা (মেয়াদ সহ), তারপর ফেরত।',
      'লেখা: DB-তে লেখা, তারপর cache-এর ওই key মুছে দেওয়া (বদলানো না)।',
      'মুছে দেওয়ার কারণ: দুটো লেখা একসাথে হলে "বদলানো" ভুল ক্রমে পুরনো মান রেখে দিতে পারে; মুছলে পরের পড়া DB থেকে ঠিকটা আনে।',
    ] },
    { kind: 'says', topic: 'Cache কোথায় আর কীভাবে',
      xu: { text: 'Web server আর DB-র মাঝে cache স্তর, read-through/cache-aside, মেয়াদ রাখা, cache server বন্ধ হলে কী, ভরে গেলে কোনটা ফেলা (LRU), আর ছবি-ফাইলের জন্য CDN।', ref: { book: 'xu1', chapter: 1 } },
      ddia: { text: 'Cache, index আর materialized view একই পরিবারের: মূল data থেকে বানানো কপি। আসল প্রশ্ন হলো মূল data বদলালে কপি কীভাবে আর কতক্ষণে হালনাগাদ হয়।', ref: { book: 'ddia2', chapter: 13, section: 'Combining Specialized Tools by Deriving Data', pages: [540, 543] } } },

    { kind: 'h', text: 'তিনটা পরিচিত বিপদ' },
    { kind: 'story', title: '১. Cache ঠান্ডা, সবাই DB-তে (thundering herd)', steps: [
      'Cache server restart হলো, memory খালি।',
      'একসাথে লাখো tracking request miss করল, সবাই DB-তে।',
      'DB ডুবে গেল; cache ভরার আগেই সব timeout।',
    ], fix: 'একই key-এর miss একসাথে একটাই DB call-এ মেলান (request coalescing), ধীরে ধীরে cache গরম করুন, দরকারে কিছু request ফিরিয়ে দিন।' },
    { kind: 'story', title: '২. একসাথে মেয়াদ শেষ', steps: [
      'সকাল ৯টায় সব key ১ ঘণ্টা মেয়াদে বসানো হলো।',
      '১০টায় সবগুলোর মেয়াদ একসাথে শেষ।',
      'হঠাৎ miss-এর ঢল।',
    ], fix: 'মেয়াদে একটু এলোমেলো যোগ করুন (৫৫–৬৫ মিনিট), যাতে miss ছড়িয়ে পড়ে।' },
    { kind: 'story', title: '৩. পুরনো দেখানো', steps: [
      'Parcel "Delivered" হলো, DB-তে লেখা হলো।',
      'Cache মুছতে ভুলে গেল (বা মুছতে গিয়ে ব্যর্থ)।',
      'এক ঘণ্টা ধরে customer দেখল "পথে আছে"।',
    ], fix: 'লেখার পরে cache মোছা, ছোট মেয়াদ রাখা, আর গুরুত্বপূর্ণ বদলে (status) CDC দিয়ে cache মোছা।' },

    { kind: 'h', text: 'কী cache করবেন, কী করবেন না' },
    { kind: 'table', head: ['ভালো', 'সাবধানে'], rows: [
      ['Tracking status, merchant profile, short URL → long URL', 'Wallet balance (টাকার সিদ্ধান্ত cache থেকে না)'],
      ['ছবি, JS, map tile (CDN-এ)', 'প্রতিটা user-এর আলাদা, একবারই পড়া data'],
      ['বারবার একই হিসাব (top list)', 'যা সেকেন্ডে সেকেন্ডে বদলায় আর ঠিক হতেই হবে'],
    ] },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"পড়া লেখার ১০০ গুণ, তাই tracking-এ cache-aside, ৬০ সেকেন্ড মেয়াদ, status বদলালে key মুছব।"',
      '"Cache পড়লে DB বাঁচাতে request coalescing আর ধীরে গরম করা।"',
      '"Balance বা payment-এর সিদ্ধান্ত সবসময় DB থেকে।"',
    ] },
    { kind: 'mistakes', items: [
      'Cache-কে সত্যের উৎস ভাবা: মেয়াদ শেষ বা restart-এ data হারায়।',
      'লেখার সময় cache বদলানো (মোছার বদলে): দুই লেখার দৌড়ে পুরনো মান থেকে যায়।',
      'সব key-এ একই মেয়াদ।',
      'Hit rate না মেপে cache বাড়ানো।',
    ] },
    { kind: 'check', items: [
      { q: 'লেখার পরে cache বদলানো না মুছে দেওয়া, কেন?', a: 'দুটো লেখা একসাথে হলে বদলানো ভুল ক্রমে পুরনো মান রেখে দিতে পারে; মুছলে পরের পড়া DB থেকে ঠিকটা আনে।' },
      { q: 'Cache restart-এর পরে DB ডুবে যাওয়া কীভাবে ঠেকাবেন?', a: 'একই key-এর miss এক DB call-এ মেলানো, ধীরে ধীরে গরম করা, প্রয়োজনে কিছু request ফেরানো।' },
      { q: 'সব key একই সময়ে মেয়াদ শেষ হলে কী হয়, সমাধান?', a: 'একসাথে miss-এর ঢল; মেয়াদে jitter যোগ করুন।' },
    ] },
  ],
  chapters: [
    { book: 'xu1', chapter: 1 },
  ],
  refs: [
    { book: 'xu1', chapter: 1 },
    { book: 'xu1', chapter: 8 },
    { book: 'ddia2', chapter: 4, section: 'Keeping Everything in Memory', pages: [133, 134] },
    { book: 'ddia2', chapter: 13, section: 'Combining Specialized Tools by Deriving Data', pages: [540, 543] },
  ],
};
