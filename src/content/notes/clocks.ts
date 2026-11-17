import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const clocks: Note = {
  id: 'clocks',
  title: 'ঘড়ি, timeout আর lock: ছড়ানো system-এর বিপদ',
  gist: 'Network-এ উত্তর না এলে কারণ জানা যায় না, আর প্রতিটা machine-এর ঘড়ি একটু আলাদা: এই দুই সত্য মেনে design করা।',
  levels: [7, 21, 29],
  angles: {
    xu: 'Snowflake ID-তে সময়ের bit, ঘড়ি পেছালে কী করা; retry, timeout আর heartbeat design-এ',
    ddia: 'কেন ঘড়ির ওপর ক্রম ঠিক করা বিপজ্জনক, process থেমে থাকলে lock কীভাবে ভাঙে, আর fencing token',
  },
  blocks: [
    { kind: 'h', text: 'উত্তর আসেনি: কী হয়েছে জানা যায় না' },
    { kind: 'p', text: 'Payment service PSP-কে request পাঠাল, ৫ সেকেন্ডে উত্তর নেই। হতে পারে request পৌঁছায়ইনি, PSP কাজ করছে কিন্তু ধীর, টাকা কেটে উত্তর পাঠিয়েছে কিন্তু উত্তর হারিয়েছে। Client-এর দিক থেকে তিনটা একই রকম দেখায়। তাই "timeout মানে ব্যর্থ" ধরে নেওয়া যায় না; retry নিরাপদ করতে idempotency key লাগে।' },
    { kind: 'figs', book: 'ddia2', chapter: 9, items: [
      { n: '9-1', page: 348, look: 'Request আর উত্তরের পথে কোথায় কোথায় হারাতে পারে' },
    ] },
    { kind: 'tip', title: 'Timeout কত হবে', text: 'খুব ছোট হলে ধীর-কিন্তু-জীবিত node-কে মৃত ধরে বাড়তি retry আর failover; খুব বড় হলে সত্যিই মৃত node-এর জন্য অনেকক্ষণ অপেক্ষা। মাপা p99 দেরি দেখে ঠিক করুন, আর retry-তে exponential backoff আর jitter দিন।' },

    { kind: 'h', text: 'দুই রকম ঘড়ি' },
    { kind: 'table', head: ['ঘড়ি', 'কী বলে', 'কখন ব্যবহার', 'বিপদ'], rows: [
      ['Time-of-day (দেয়াল ঘড়ি)', 'এখন কয়টা বাজে', 'মানুষকে দেখানো, "কবে ঘটেছে" লেখা', 'NTP হঠাৎ এগিয়ে বা পিছিয়ে দিতে পারে'],
      ['Monotonic', 'কোনো এক বিন্দু থেকে কতক্ষণ গেল', 'Timeout, কতক্ষণ লাগল মাপা', 'দুই machine-এর মান তুলনা করা যায় না'],
    ] },
    { kind: 'story', title: 'ভুল ক্রমে last write wins', steps: [
      'Merchant ঠিকানা বদলাল: server A লিখল সময় ১০:০০:০০.০০৫ দিয়ে।',
      'মাত্র ২০ ms পরে আবার বদলাল: server B লিখল, কিন্তু B-র ঘড়ি ৫০ ms পিছিয়ে, তাই সময় দেখাল ০৯:৫৯:৫৯.৯৭৫।',
      'Replica-গুলো "বড় সময় জেতে" নিয়মে পুরনো ঠিকানা রাখল। নতুন বদল চুপচাপ হারাল।',
    ], fix: 'ক্রম ঠিক করতে দেয়াল ঘড়ির ওপর ভরসা করবেন না। একটা জায়গা থেকে ক্রমিক version, বা logical clock, বা একটা leader-এ লেখা।' },
    { kind: 'figs', book: 'ddia2', chapter: 9, items: [
      { n: '9-3', page: 363, look: 'পরে লেখা মান ছোট timestamp পেয়ে হেরে যায়' },
    ] },
    { kind: 'says', topic: 'সময় দিয়ে ID বা ক্রম',
      xu: { text: 'Snowflake ID-তে উপরের bit-এ timestamp, তাই ID মোটামুটি সময়-ক্রমে সাজে। এর জন্য machine-এর ঘড়ি NTP দিয়ে মিলিয়ে রাখা জরুরি বলে ধরা হয়।', ref: { book: 'xu1', chapter: 7 } },
      ddia: { text: 'ঘড়ি কতটা ভুল হতে পারে (drift, NTP-র লাফ, leap second), কেন সময় দিয়ে ঘটনার ক্রম ঠিক করা বিপজ্জনক, আর সময়কে একটা মান না ভেবে একটা পরিসর (confidence interval) ভাবা।', ref: { book: 'ddia2', chapter: 9, section: 'Unreliable Clocks', pages: [358, 370] } } },

    { kind: 'h', text: 'Process থেমে থাকে, নিজে জানে না' },
    { kind: 'p', text: 'Garbage collection, VM সরানো, laptop-এর ঘুম: একটা process কয়েক সেকেন্ড থেমে থাকতে পারে, আর জেগে উঠে ভাবে কিছুই হয়নি। এর মধ্যে বাকিরা তাকে মৃত ধরে নতুন কাউকে দায়িত্ব দিয়েছে।' },
    { kind: 'story', title: 'দুজন একসাথে lock-এর মালিক', steps: [
      'Payout worker ১ lock নিল ("আমি এখন merchant X-কে টাকা পাঠাচ্ছি"), মেয়াদ ১০ সেকেন্ড।',
      'Worker ১ GC-তে ১৫ সেকেন্ড থেমে গেল।',
      'Lock-এর মেয়াদ শেষ, worker ২ lock নিয়ে payout পাঠাল।',
      'Worker ১ জেগে উঠল, ভাবল lock এখনো তার, আবার payout পাঠাল: merchant দুবার টাকা পেল।',
    ], fix: 'Fencing token: lock দেওয়ার সময় একটা বাড়তে থাকা নম্বর দিন; storage আগের চেয়ে ছোট নম্বরের লেখা ফিরিয়ে দেবে। শুধু lock-এর মেয়াদে ভরসা করবেন না।' },
    { kind: 'figs', book: 'ddia2', chapter: 9, items: [
      { n: '9-4', page: 374, look: 'মেয়াদ পেরোনো lock নিয়ে লেখা: data নষ্ট' },
      { n: '9-6', page: 375, look: 'Fencing token দিয়ে পুরনো মালিকের লেখা আটকানো' },
    ] },

    { kind: 'h', text: 'Majority-ই সত্য' },
    { kind: 'p', text: 'একটা node নিজে নিজে "আমি leader" বা "আমি জীবিত" বললে হয় না; বেশিরভাগ node যা মানে সেটাই সিদ্ধান্ত। এজন্যই leader election আর lock service-গুলো quorum দিয়ে চলে, আর ৫টা node থাকলে ২টা হারিয়েও সিদ্ধান্ত নেওয়া যায়।' },
    { kind: 'says', topic: 'জীবিত কিনা বোঝা',
      xu: { text: 'Chat-এ presence: client নিয়মিত heartbeat পাঠায়, কিছুক্ষণ না এলে তবেই offline, যাতে network একটু দুললেই অবস্থা না কাঁপে।', ref: { book: 'xu1', chapter: 12 } },
      ddia: { text: 'Network আর timeout দিয়ে নিশ্চিতভাবে মৃত বোঝা অসম্ভব কেন, আর তাই সিদ্ধান্ত majority-র হাতে, lease আর fencing দিয়ে পুরনো মালিককে থামানো।', ref: { book: 'ddia2', chapter: 9, section: 'Knowledge, Truth, and Lies', pages: [371, 384] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"PSP timeout মানে অজানা, ব্যর্থ না; একই idempotency key দিয়ে retry বা status দেখব।"',
      '"Event-এর ক্রম ঠিক করতে দেয়াল ঘড়ি না, প্রতি order-এ বাড়তে থাকা sequence নম্বর।"',
      '"Payout-এর lock-এ fencing token, যাতে থেমে থাকা পুরনো worker লিখতে না পারে।"',
    ] },
    { kind: 'mistakes', items: [
      'Timeout-কে ব্যর্থতা ধরে নতুন request: দুবার charge।',
      'দুই machine-এর timestamp তুলনা করে "কোনটা আগে" ঠিক করা।',
      'Timeout মাপতে দেয়াল ঘড়ি: NTP লাফালে timeout অকারণে ফুরায় বা কখনো ফুরায় না।',
      'Lock-এর মেয়াদে ভরসা করে fencing ছাড়া লেখা।',
    ] },
    { kind: 'check', items: [
      { q: 'PSP-তে timeout। তিনটা সম্ভাব্য কারণ বলুন।', a: 'Request পৌঁছায়নি; PSP এখনো কাজ করছে; কাজ শেষ কিন্তু উত্তর হারিয়েছে।' },
      { q: 'কাজের সময় মাপতে কোন ঘড়ি?', a: 'Monotonic ঘড়ি, কারণ NTP দেয়াল ঘড়িকে লাফ দেওয়াতে পারে।' },
      { q: 'Fencing token কী আটকায়?', a: 'মেয়াদ পেরোনো lock-ধারী (যেমন GC-তে থেমে থাকা worker) জেগে উঠে যে লেখা দেয়, storage সেটা ফিরিয়ে দেয়।' },
      { q: 'Snowflake ID-তে ঘড়ি পেছালে কী ঝুঁকি, কী করবেন?', a: 'আগের timestamp আবার আসলে একই ID দ্বিতীয়বার বানানো যেতে পারে। ঘড়ি পেছালে ঘড়ি এগোনো পর্যন্ত অপেক্ষা বা error।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 9, pages: [345, 400] },
    { book: 'xu1', chapter: 7 },
  ],
  refs: [
    { book: 'xu1', chapter: 7 },
    { book: 'xu1', chapter: 12 },
    { book: 'ddia2', chapter: 9, section: 'Timeouts and Unbounded Delays', pages: [352, 354] },
    { book: 'ddia2', chapter: 9, section: 'Unreliable Clocks', pages: [358, 370] },
    { book: 'ddia2', chapter: 9, section: 'Process Pauses', pages: [366, 370] },
    { book: 'ddia2', chapter: 9, section: 'Distributed Locks and Leases', pages: [373, 376] },
  ],
};
