import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const encoding: Note = {
  id: 'encoding',
  title: 'Encoding আর বিবর্তন: পুরনো-নতুন একসাথে চলা',
  gist: 'Data byte-এ রূপান্তরের নিয়ম, আর schema বদলালেও পুরনো code নতুন data আর নতুন code পুরনো data পড়তে পারা।',
  levels: [15, 29],
  angles: {
    xu: 'Deploy, rollback আর client sync-এ পুরনো-নতুন version একসাথে',
    ddia: 'JSON, Protocol Buffers, Avro; backward আর forward compatibility; DB, API আর event-এ data কীভাবে বয়ে যায়',
  },
  blocks: [
    { kind: 'h', text: 'কেন জানা দরকার' },
    { kind: 'p', text: 'ParcelGo-র rider app লাখো phone-এ, সবাই সাথে সাথে update করে না। Server-এ নতুন field যোগ হলো, পুরনো app সেটা চিনবে না; আবার rolling deploy-এর সময় কিছু server পুরনো, কিছু নতুন। Encoding-এর নিয়ম ঠিক না থাকলে একটা field যোগ করাই crash-এর কারণ।' },

    { kind: 'h', text: 'দুই দিকের compatibility' },
    { kind: 'table', head: ['ধরন', 'মানে', 'কখন লাগে'], rows: [
      ['Backward', 'নতুন code পুরনো data পড়তে পারে', 'DB-তে পুরনো সারি, পুরনো event replay'],
      ['Forward', 'পুরনো code নতুন data পড়তে পারে (অচেনা field উপেক্ষা)', 'Rolling deploy, পুরনো app, rollback'],
    ] },
    { kind: 'tip', title: 'নিরাপদ বদলের নিয়ম', text: 'নতুন field যোগ করুন optional হিসেবে, default সহ। কোনো field-এর নম্বর বা নাম আবার অন্য অর্থে ব্যবহার করবেন না। মোছার আগে নিশ্চিত হন কেউ আর পড়ে না।' },

    { kind: 'h', text: 'Format-গুলো' },
    { kind: 'table', head: ['Format', 'বৈশিষ্ট্য', 'সতর্কতা'], rows: [
      ['JSON', 'মানুষ পড়তে পারে, সব জায়গায় চলে', 'বড়, সংখ্যার নির্ভুলতা নিয়ে ঝামেলা (বড় ID ভাঙে), schema নেই'],
      ['Protocol Buffers', 'ছোট binary, প্রতিটা field-এর নম্বর', 'নম্বর বদলানো বা আবার ব্যবহার নিষেধ'],
      ['Avro', 'লেখকের আর পাঠকের schema মিলিয়ে পড়া', 'লেখকের schema কোথায় পাওয়া যাবে তা ঠিক রাখতে হয়'],
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 5, items: [
      { n: '5-3', page: 170, look: 'Field নম্বর আর type দিয়ে ছোট binary' },
      { n: '5-4', page: 173, look: 'Schema-নির্ভর আরও ছোট encoding' },
      { n: '5-6', page: 174, look: 'লেখক আর পাঠকের schema মিলিয়ে পড়া' },
    ] },
    { kind: 'story', title: 'বড় ID আর JavaScript', steps: [
      'Order ID snowflake: ১৯ অঙ্কের সংখ্যা।',
      'API JSON-এ সংখ্যা হিসেবে পাঠাল।',
      'Merchant dashboard (JavaScript) পড়ল; ৫৩ bit-এর বেশি বলে শেষ অঙ্কগুলো বদলে গেল।',
      'Dashboard ভুল order খুলছে।',
    ], fix: 'বড় ID JSON-এ string হিসেবে পাঠান।' },

    { kind: 'h', text: 'Data কোন পথে বয়ে যায়' },
    { kind: 'list', items: [
      'DB দিয়ে: আজ লেখা সারি পাঁচ বছর পরের code পড়বে। পুরনো সারি নতুন field ছাড়া থাকবে; code-কে মানিয়ে নিতে হবে।',
      'API দিয়ে: server আগে বদলায়, client পরে; তাই server-কে পুরনো client-এর request বুঝতে হয়, আর API version রাখতে হয়।',
      'Event দিয়ে: পুরনো event replay হবে নতুন consumer-এ; event-এর schema বদল সবচেয়ে সাবধানে।',
    ] },
    { kind: 'says', topic: 'Version রাখা আর পুরনোর সাথে চলা',
      xu: { text: 'File sync design-এ প্রতিটা file-এর version-এর ইতিহাস রাখা, পুরনো version-এ ফেরা, আর দুই client একসাথে বদলালে প্রথমটা জেতে, অন্যটা conflict কপি হিসেবে থাকে।', ref: { book: 'xu1', chapter: 15 } },
      ddia: { text: 'Rolling upgrade-এ কেন দুই দিকের compatibility লাগে, কোন format কোন বদল সহ্য করে, আর DB, service আর workflow-এ data বয়ে যাওয়ার সময় কী মাথায় রাখতে হয়।', ref: { book: 'ddia2', chapter: 5, section: 'Modes of Dataflow', pages: [178, 190] } } },

    { kind: 'h', text: 'Schema migration-এর নিরাপদ ক্রম' },
    { kind: 'list', items: [
      'Expand: নতুন কলাম যোগ (optional), পুরনো code-এ কিছু ভাঙে না।',
      'দুই জায়গায় লেখা, পুরনো data কপি, যাচাই।',
      'পড়া নতুন কলামে সরানো।',
      'Contract: সবাই নতুনটা ব্যবহার করছে নিশ্চিত হলে পুরনো কলাম মোছা।',
    ] },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"নতুন field optional, default সহ; পুরনো app অচেনা field উপেক্ষা করবে।"',
      '"Internal service-এ Protobuf, field নম্বর কখনো আবার ব্যবহার না।"',
      '"Schema বদল expand-contract ধাপে, প্রতি ধাপে rollback সম্ভব।"',
    ] },
    { kind: 'mistakes', items: [
      'একই deploy-এ কলাম rename: পুরনো server-গুলো সাথে সাথে ভাঙে।',
      'Required field যোগ করা: পুরনো data আর পুরনো client দুটোই ব্যর্থ।',
      'পুরনো code অচেনা field পেয়ে লিখতে গিয়ে তা মুছে ফেলা।',
    ] },
    { kind: 'check', items: [
      { q: 'Rolling deploy-এ কোন compatibility দুটোই লাগে?', a: 'Backward আর forward: নতুন server পুরনো data, পুরনো server নতুন data পড়বে।' },
      { q: 'Protobuf-এ একটা field মুছে তার নম্বর নতুন field-কে দিলে কী হয়?', a: 'পুরনো data-র মান নতুন field হিসেবে ভুলভাবে পড়া হয়।' },
      { q: '১৯ অঙ্কের ID JSON-এ সংখ্যা হিসেবে পাঠালে কী ঝুঁকি?', a: 'JavaScript-এ নির্ভুলতা হারিয়ে ID বদলে যায়; string পাঠান।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 5, pages: [161, 196] },
  ],
  refs: [
    { book: 'xu1', chapter: 15 },
    { book: 'ddia2', chapter: 5, section: 'Formats for Encoding Data', pages: [163, 177] },
    { book: 'ddia2', chapter: 5, section: 'Protocol Buffers', pages: [169, 171] },
    { book: 'ddia2', chapter: 5, section: 'Modes of Dataflow', pages: [178, 190] },
  ],
};
