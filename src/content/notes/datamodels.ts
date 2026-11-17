import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const datamodels: Note = {
  id: 'datamodels',
  title: 'Data model: table, document, graph না event',
  gist: 'একই data কয়েক রকমভাবে সাজানো যায়; কোনটা বাছবেন তা ঠিক করে কোন query সহজ আর কোনটা কষ্টের।',
  levels: [11, 18, 23],
  angles: {
    xu: 'News feed, chat, email, maps-এ কোন data কোন store-এ, আর কেন',
    ddia: 'Relational বনাম document, normalization, many-to-many, graph, star schema আর event sourcing',
  },
  blocks: [
    { kind: 'h', text: 'কেন জানা দরকার' },
    { kind: 'p', text: 'একটা order-এর ভেতরে কয়েকটা item, প্রতিটা item একটা product, product একটা merchant-এর। Customer চায় নিজের order-এর পুরো ছবি একবারে; merchant চায় product ধরে বিক্রি; analyst চায় এলাকা ধরে মাসের হিসাব। একই data, তিন রকম প্রশ্ন: model ঠিক করে কোনটা এক query-তে আর কোনটায় দশটা join।' },

    { kind: 'h', text: 'Relational বনাম document' },
    { kind: 'table', head: ['', 'Relational (table)', 'Document (JSON)'], rows: [
      ['ভালো যখন', 'অনেক সম্পর্ক, many-to-many, নানা দিক থেকে খোঁজা', 'পুরো জিনিসটা একসাথে পড়া-লেখা, গঠন একেক রকম'],
      ['Join', 'DB নিজে করে', 'App-এ করতে হয়, বা data কপি'],
      ['Schema', 'লেখার সময় যাচাই', 'পড়ার সময় বোঝা; বদলানো সহজ'],
      ['ParcelGo-তে', 'Order, merchant, payment', 'Merchant-এর দোকানের সেটিং, parcel-এর ভেতরের item তালিকা'],
    ] },
    { kind: 'figs', book: 'ddia2', chapter: 3, items: [
      { n: '3-1', page: 70, look: 'একটা profile কয়েকটা table-এ ভাঙা' },
      { n: '3-3', page: 76, look: 'Many-to-many: মাঝে একটা সংযোগ table' },
    ] },

    { kind: 'h', text: 'Normalize না denormalize' },
    { kind: 'p', text: 'এলাকার নাম প্রতিটা order-এ কপি করলে পড়া দ্রুত (join লাগে না), কিন্তু "Mirpur-10" বানান বদলালে লাখো সারি বদলাতে হয়, আর কিছু পুরনো থেকে যায়। ID রেখে নাম এক জায়গায় রাখলে বদল এক জায়গায়, কিন্তু পড়ায় join। নিয়ম: আগে normalize, তারপর যে পড়া সত্যিই ধীর সেখানে মেপে মেপে কপি (আর কপি হালনাগাদের দায় নিন)।' },
    { kind: 'says', topic: 'Feed: লেখার সময় কপি না পড়ার সময় জোগাড়',
      xu: { text: 'News feed-এ post-এর ID প্রতিটা follower-এর feed cache-এ আগেই কপি করা (fanout on write), আর লাখো follower-এর তারকাদের বেলায় পড়ার সময় জোগাড় (fanout on read): দুটো মিলিয়ে hybrid।', ref: { book: 'xu1', chapter: 11 } },
      ddia: { text: 'Timeline-কে derived data হিসেবে দেখা: লেখার সময় আগে থেকে হিসাব করে রাখলে পড়া সস্তা, কিন্তু লেখার কাজ বাড়ে; কোথায় ভারসাম্য, সেই উদাহরণ ধরে।', ref: { book: 'ddia2', chapter: 2, section: 'Case Study: Social Network Home Timelines', pages: [34, 36] } } },

    { kind: 'h', text: 'Graph: সম্পর্কই যখন আসল' },
    { kind: 'p', text: 'রাস্তার মোড় আর রাস্তা, বা "কে কাকে follow করে": এখানে প্রশ্নগুলো সম্পর্ক ধরে হাঁটা ("দুই মোড়ের মাঝে সবচেয়ে ছোট পথ", "বন্ধুর বন্ধু")। Table-এ প্রতিটা ধাপ একটা join, ধাপ বাড়লে query জটিল আর ধীর। Graph model-এ বিন্দু আর তীর, হাঁটা স্বাভাবিক।' },
    { kind: 'figs', book: 'ddia2', chapter: 3, items: [
      { n: '3-6', page: 86, look: 'বিন্দু আর তীর দিয়ে নানা ধরনের সম্পর্ক' },
    ] },

    { kind: 'h', text: 'Analytics-এর star schema' },
    { kind: 'p', text: 'মাঝে একটা বিশাল fact table: প্রতিটা delivery একটা সারি (সময়, কত টাকা, কোন merchant, কোন এলাকা)। চারপাশে dimension table: merchant-এর বিবরণ, এলাকার বিবরণ। রিপোর্ট লেখা সহজ, join কম।' },
    { kind: 'figs', book: 'ddia2', chapter: 3, items: [
      { n: '3-5', page: 78, look: 'মাঝে ঘটনার table, চারপাশে বিবরণের table' },
    ] },

    { kind: 'h', text: 'Event sourcing: ঘটনাই সত্য' },
    { kind: 'p', text: 'Parcel-এর "বর্তমান status" না রেখে প্রতিটা ঘটনা রাখুন: created, picked up, at hub, delivered। বর্তমান অবস্থা ঘটনাগুলো থেকে হিসাব করা (এবং দ্রুত পড়ার জন্য আলাদা read model-এ রাখা: CQRS)। লাভ: পুরো ইতিহাস, ভুল হলে আবার হিসাব। দাম: read model হালনাগাদ রাখা, আর ঘটনার গঠন বদলানো কঠিন।' },
    { kind: 'figs', book: 'ddia2', chapter: 3, items: [
      { n: '3-8', page: 102, look: 'অপরিবর্তনীয় ঘটনার log থেকে পড়ার জন্য আলাদা view' },
    ] },
    { kind: 'says', topic: 'কোন data কোন store-এ',
      xu: { text: 'Email service-এ metadata-র জন্য user ধরে ভাগ করা NoSQL, attachment object storage-এ, খোঁজার জন্য আলাদা search index; প্রতিটা প্রশ্নের জন্য আলাদা store।', ref: { book: 'xu2', chapter: 8 } },
      ddia: { text: 'কোন model কোন ধরনের প্রশ্নে মানায়, আর একই data কয়েকটা model-এ রাখার পথ (event log থেকে আলাদা আলাদা view)।', ref: { book: 'ddia2', chapter: 3, section: 'When to Use Which Model', pages: [80, 83] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"Order, payment relational: সম্পর্ক অনেক, transaction লাগে।"',
      '"Parcel-এর ঘটনাগুলো আলাদা table-এ, শুধু যোগ হয়; বর্তমান status order-এ কপি, দ্রুত দেখাতে।"',
      '"রিপোর্টের জন্য warehouse-এ star schema।"',
    ] },
    { kind: 'mistakes', items: [
      '"NoSQL মানে দ্রুত" ধরে নেওয়া: প্রশ্নের ধরন না দেখে store বাছা।',
      'সব কিছু denormalize করে পরে হালনাগাদ ভুলে যাওয়া।',
      'Many-to-many সম্পর্ক document-এ ঢুকিয়ে app-এ join লেখা।',
    ] },
    { kind: 'check', items: [
      { q: 'এলাকার নাম প্রতিটা order-এ কপি করার লাভ আর ক্ষতি?', a: 'লাভ: পড়ায় join লাগে না। ক্ষতি: নাম বদলালে সব সারি বদলাতে হয়, কিছু পুরনো থেকে যায়।' },
      { q: 'কোন প্রশ্নে graph model স্বাভাবিক?', a: 'সম্পর্ক ধরে কয়েক ধাপ হাঁটা: সবচেয়ে ছোট পথ, বন্ধুর বন্ধু।' },
      { q: 'Event sourcing-এ বর্তমান অবস্থা কোথা থেকে আসে?', a: 'সব ঘটনা ক্রমে চালিয়ে; দ্রুত পড়ার জন্য তা থেকে বানানো আলাদা read model।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 3, pages: [65, 114] },
    { book: 'xu1', chapter: 11 },
  ],
  refs: [
    { book: 'xu1', chapter: 11 },
    { book: 'xu2', chapter: 8 },
    { book: 'ddia2', chapter: 3, section: 'Relational Versus Document Models', pages: [67, 83] },
    { book: 'ddia2', chapter: 3, section: 'Normalization, Denormalization, and Joins', pages: [72, 74] },
    { book: 'ddia2', chapter: 3, section: 'Graph-Like Data Models', pages: [84, 100] },
    { book: 'ddia2', chapter: 3, section: 'Event Sourcing and CQRS', pages: [101, 104] },
  ],
};
