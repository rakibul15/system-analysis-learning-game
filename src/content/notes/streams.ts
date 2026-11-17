import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const streams: Note = {
  id: 'streams',
  title: 'Queue আর stream: ঘটনা বয়ে নেওয়া',
  gist: 'একটা service ঘটনা লিখে দেয়, অন্যরা নিজের গতিতে পড়ে: চাপ সামলানো, আলাদা করা, আর পরে আবার চালানো।',
  levels: [10, 19, 21],
  angles: {
    xu: 'Notification, message queue আর click aggregation design-এ queue কোথায়, কতবার পৌঁছাবে, কীভাবে গুনবেন',
    ddia: 'সাধারণ queue বনাম log-ভিত্তিক broker, CDC, আর stream-এ সময় নিয়ে ঝামেলা',
  },
  blocks: [
    { kind: 'h', text: 'কেন লাগে' },
    { kind: 'p', text: 'Delivery হলে ParcelGo-কে SMS পাঠাতে হয়, merchant-এর balance বাড়াতে হয়, analytics-এ গুনতে হয়। Order service যদি সবগুলো নিজে ডাকে, SMS provider ধীর হলে order-ও ধীর। তার বদলে "delivered" ঘটনাটা একবার লিখে দিন; SMS, wallet, analytics যার যার গতিতে পড়বে। কেউ পড়ে থাকলে ঘটনা জমে থাকে, হারায় না।' },
    { kind: 'flow', label: 'Order service একবার লেখে; তিনজন আলাদা consumer নিজের গতিতে পড়ে', h: 34, nodes: [
      { id: 'o', label: 'Order', x: 10, y: 17 },
      { id: 'q', label: 'Topic', x: 44, y: 17, sub: 'delivered' },
      { id: 's', label: 'SMS', x: 86, y: 5, tone: 'hot', sub: 'ধীর' },
      { id: 'w', label: 'Wallet', x: 86, y: 17 },
      { id: 'a', label: 'Analytics', x: 86, y: 29 },
    ], links: [
      { from: 'o', to: 'q', rate: 3 },
      { from: 'q', to: 's', rate: 1, secs: 3 },
      { from: 'q', to: 'w', rate: 3 },
      { from: 'q', to: 'a', rate: 3 },
    ] },

    { kind: 'h', text: 'দুই ধরনের broker' },
    { kind: 'table', head: ['', 'সাধারণ queue (RabbitMQ-ধাঁচের)', 'Log (Kafka-ধাঁচের)'], rows: [
      ['পড়ার পরে', 'Ack হলে message মুছে যায়', 'থেকে যায়, retention পর্যন্ত'],
      ['কাজ ভাগ', 'যেকোনো worker যেকোনো message নেয়', 'Partition ভাগ: এক partition এক consumer'],
      ['ক্রম', 'Retry-তে ক্রম বদলাতে পারে', 'Partition-এর ভেতরে স্থির'],
      ['আবার চালানো', 'সম্ভব না', 'Offset পেছনে নিলেই হয়'],
      ['ভালো যেখানে', 'আলাদা আলাদা কাজ (SMS পাঠানো)', 'ঘটনার ধারা, অনেকে পড়ে, ক্রম জরুরি'],
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 12, items: [
      { n: '12-1', page: 493, look: 'কাজ ভাগ করা বনাম সবাইকে একই message' },
      { n: '12-2', page: 494, look: 'Consumer মাঝপথে মরলে আবার পাঠানো, ক্রম বদলে যাওয়া' },
      { n: '12-3', page: 496, look: 'Partition-এর শেষে যোগ, consumer-রা offset ধরে পড়ে' },
    ] },
    { kind: 'says', topic: 'কতবার পৌঁছাবে',
      xu: { text: 'Message queue design-এ producer-এর ack স্তর আর consumer কখন offset commit করে, তার ওপর নির্ভর করে at-most, at-least না exactly-once; সাথে partition, retention আর consumer group।', ref: { book: 'xu2', chapter: 4 } },
      ddia: { text: 'Log-ভিত্তিক broker-এ offset আর partition কেন ক্রম আর আবার চালানো সহজ করে, আর idempotent লেখা দিয়ে exactly-once প্রভাব।', ref: { book: 'ddia2', chapter: 12, section: 'Log-Based Message Brokers', pages: [495, 499] } } },

    { kind: 'h', text: 'DB আর stream একসাথে রাখা' },
    { kind: 'story', title: 'Dual write-এর ফাঁদ', steps: [
      'Order service DB-তে order লিখল, তারপর Kafka-তে "order created" পাঠাতে গেল।',
      'মাঝে server crash।',
      'Order আছে, কিন্তু কেউ জানে না: SMS যায়নি, rider-ও পায়নি।',
    ], fix: 'Outbox: ঘটনাটা একই DB transaction-এ একটা outbox table-এ লিখুন, আলাদা relay পরে Kafka-তে পাঠাবে। অথবা CDC: DB-র নিজের change log পড়ে stream বানানো।' },
    { kind: 'figs', book: 'ddia2', chapter: 12, items: [
      { n: '12-4', page: 502, look: 'দুই জায়গায় আলাদা লেখা ক্রম হারায়' },
      { n: '12-5', page: 503, look: 'DB-র বদল ধরে অন্য system-এ পৌঁছানো (CDC)' },
    ] },

    { kind: 'h', text: 'Stream-এ সময়' },
    { kind: 'p', text: '"প্রতি মিনিটে কোন hub-এ কত scan" গুনতে গেলে কোন মিনিট? Scan যখন ঘটেছে (event time), নাকি server যখন পেয়েছে (processing time)? Rider-এর phone network ছাড়া ছিল, ১০ মিনিট পরে সব পাঠাল: processing time ধরলে ভুল মিনিটে গোনা হবে। Event time ধরলে প্রশ্ন: কতক্ষণ দেরিতে আসা event-এর জন্য window খোলা রাখবেন (watermark)?' },
    { kind: 'figs', book: 'ddia2', chapter: 12, items: [
      { n: '12-8', page: 520, look: 'Processing time ধরে window করলে দেরির জন্য ভুল চূড়া' },
    ] },
    { kind: 'says', topic: 'Stream-এ গোনা',
      xu: { text: 'Ad click aggregation: প্রতি মিনিটের window-এ গোনা, top-k-এর জন্য heap, crash-এ snapshot আর offset থেকে ফেরা, hot key ভাগ, আর batch-এর সাথে মিলিয়ে দেখা (reconciliation)।', ref: { book: 'xu2', chapter: 6 } },
      ddia: { text: 'Event time বনাম processing time, window-এর ধরন, দেরিতে আসা event, আর stream join; crash-এর পরে ঠিক একবারের প্রভাব পেতে checkpoint আর idempotency।', ref: { book: 'ddia2', chapter: 12, section: 'Reasoning About Time', pages: [518, 522] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"Delivered ঘটনা Kafka-তে, order_id key: এক order-এর ঘটনা ক্রমে থাকবে।"',
      '"At-least-once; consumer event ID দেখে duplicate ফেলবে।"',
      '"DB আর Kafka-তে আলাদা লেখা না, outbox বা CDC।"',
    ] },
    { kind: 'mistakes', items: [
      'Partition-এর চেয়ে বেশি consumer যোগ করে throughput আশা করা: বাড়তিরা বসে থাকে।',
      'Offset আগে commit করে তারপর কাজ: crash-এ message হারায়।',
      'Server-এর সময় ধরে window: দেরিতে আসা event ভুল জায়গায় গোনা।',
    ] },
    { kind: 'check', items: [
      { q: 'Kafka-তে এক order-এর ঘটনা ক্রমে রাখতে কী করবেন?', a: 'order_id-কে message key বানান: একই key একই partition-এ, আর partition-এর ভেতরে ক্রম রক্ষা হয়।' },
      { q: 'DB-তে লিখে তারপর Kafka-তে পাঠালে কী ঝুঁকি?', a: 'মাঝে crash হলে DB-তে আছে কিন্তু event যায়নি। Outbox বা CDC দিয়ে সমাধান।' },
      { q: 'Event time আর processing time-এর পার্থক্য কেন জরুরি?', a: 'দেরিতে আসা event processing time-এ ভুল window-এ পড়ে; গণনা ভুল হয়।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 12, pages: [487, 538] },
    { book: 'xu2', chapter: 4 },
    { book: 'xu2', chapter: 6 },
  ],
  refs: [
    { book: 'xu1', chapter: 10 },
    { book: 'xu2', chapter: 4 },
    { book: 'xu2', chapter: 6 },
    { book: 'ddia2', chapter: 12, section: 'Messaging Systems', pages: [489, 494] },
    { book: 'ddia2', chapter: 12, section: 'Log-Based Message Brokers', pages: [495, 499] },
    { book: 'ddia2', chapter: 12, section: 'Change Data Capture', pages: [503, 507] },
    { book: 'ddia2', chapter: 12, section: 'Reasoning About Time', pages: [518, 522] },
  ],
};
