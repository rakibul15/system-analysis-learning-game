import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 3 (Data Models and Query Languages), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-3',
  goals: [
    'Relational আর document model-এর মূল তফাত, আর কোন ধরনের data-তে কোনটা মানায় বলতে পারবেন।',
    'Normalization আর denormalization-এর লাভ-ক্ষতি, আর many-to-many সম্পর্ক কেন join চায় ব্যাখ্যা করতে পারবেন।',
    'Graph model, event sourcing আর star schema কোন সমস্যার জন্য, এক লাইনে বলতে পারবেন।',
  ],
  related: ['datamodels', 'storage'],
  blocks: [
    { kind: 'p', text: 'Data model মানে আপনি data-কে কীভাবে ভাবছেন: সারি-column-এর টেবিল, নেস্ট করা document, নাকি বিন্দু আর রেখার জাল। এই ভাবনাই ঠিক করে কোন কাজ সহজ, কোনটা কঠিন। তাই model বাছা হলো একটা বড় সিদ্ধান্ত, শুধু সিনট্যাক্সের ব্যাপার নয়।' },

    { kind: 'h', text: 'Relational বনাম document' },
    { kind: 'p', text: 'Relational model data-কে টেবিলে ভাঙে, আর সম্পর্ক জোড়া দেয় join দিয়ে। Document model একটা জিনিসের সব কিছু এক জায়গায় রাখে, ভেতরে ভেতরে নেস্ট করে। App-এর কোড সাধারণত object নিয়ে কাজ করে, তাই object আর টেবিলের মধ্যে অনুবাদ লাগে। এই অনুবাদের ঝামেলাকে বলে object-relational mismatch।' },
    { kind: 'seq', label: 'একটা order-এর পাতা দেখানো: দুই model-এ', actors: ['App', 'Relational DB', 'Document DB'], steps: [
      { from: 0, to: 1, msg: 'order + customer + items + address: ৪ টেবিলের join', note: 'এক সারি এক টেবিলে। সম্পর্ক জুড়তে হয়।' },
      { from: 1, to: 0, msg: 'জোড়া লাগানো সারিগুলো', tone: 'ok', note: 'সব ঠিক, কিন্তু এক পাতার জন্য কাজ বেশি।' },
      { from: 0, to: 2, msg: 'order-এর document চাই', note: 'Items আর address ভেতরেই নেস্ট করা।' },
      { from: 2, to: 0, msg: 'এক পড়ায় পুরো order', tone: 'ok', note: 'এক জায়গায় থাকায় locality ভালো: এক disk-পড়ায় সব।' },
    ] },
    { kind: 'table', head: ['', 'Relational', 'Document'], rows: [
      ['কোথায় ভালো', 'অনেক সম্পর্ক, ভিন্ন ভিন্ন প্রশ্ন, join', 'এক জিনিসের সব তথ্য একসাথে পড়া, গাছের মতো গঠন'],
      ['Schema', 'আগে থেকে ঠিক করা, database জোর খাটায়', 'নমনীয়; আসলে পড়ার সময় ধরে নেওয়া (schema-on-read)'],
      ['Join', 'প্রথম শ্রেণির', 'দুর্বল; অনেক সময় app-এই করতে হয়'],
      ['Many-to-many', 'সহজ', 'কঠিন, নকল (duplicate) বা জোড়া দিতে হয়'],
    ] },
    { kind: 'tip', title: 'Schema-less বলতে নেই', text: 'Document database-এ schema নেই বলা হয়, আসলে schema থাকে app-এর কোডে: কোন field থাকবে ধরে নিয়ে পড়ে। তফাত শুধু কে জোর খাটায়। Database জোর খাটালে ভুল তাড়াতাড়ি ধরা পড়ে, app-এ ধরলে পড়ার সময় ভাঙে।' },

    { kind: 'h', text: 'Normalization আর denormalization' },
    { kind: 'p', text: 'Normalize করা মানে প্রতিটা তথ্য ঠিক এক জায়গায় রাখা, বাকিরা ID দিয়ে তাকে দেখায়। যেমন দোকানের নাম এক টেবিলে, order-এ শুধু দোকানের ID। সুবিধা: নাম বদলালে এক জায়গায় বদলালেই হয়। Denormalize করা মানে একই তথ্য অনেক জায়গায় নকল রাখা, যাতে পড়ার সময় join না লাগে। সুবিধা: পড়া দ্রুত। অসুবিধা: তথ্য বদলালে সব নকল বদলাতে হয়, নইলে অমিল।' },
    { kind: 'calc', label: 'দোকানের নাম বদলাল: কত সারি ছুঁতে হবে', inputs: [
      { id: 'orders', label: 'ওই দোকানের order', min: 100, max: 1_000_000, step: 100, value: 50_000 },
      { id: 'reads', label: 'প্রতিদিন order পাতা দেখা হয়', min: 1000, max: 10_000_000, step: 1000, value: 1_000_000 },
    ], out: (v) => [
      { label: 'Normalized: নাম বদলাতে লেখা', value: `${num(1)} সারি`, bar: 0.02, tone: 'ok', how: 'নাম থাকে শুধু দোকানের সারিতে' },
      { label: 'Denormalized: নাম বদলাতে লেখা', value: `${num(v.orders! + 1)} সারি`, bar: Math.min(1, v.orders! / 1_000_000), tone: v.orders! > 10_000 ? 'bad' : 'ok', how: 'প্রতি order-এ নাম নকল করা' },
      { label: 'Normalized: দিনে অতিরিক্ত join', value: `${num(v.reads!)} বার`, bar: Math.min(1, v.reads! / 10_000_000), how: 'প্রতি পাতায় একটা করে join' },
    ] },
    { kind: 'p', text: 'মোটা নিয়ম: যেটা প্রায়ই পড়া হয়, কিন্তু কদাচিৎ বদলায়, তার নকল সস্তা। যেটা প্রায়ই বদলায়, সেটা normalize রাখুন। তবে লক্ষ করুন, denormalize করা মানে কাজটা পড়া থেকে লেখার দিকে সরানো। আর যাকে নকল রাখলেন, তাকে ঠিক রাখার দায়ও আপনার।' },

    { kind: 'h', text: 'Analytics-এর schema: তারা আর snowflake' },
    { kind: 'p', text: 'Analytics-এ প্রচলিত ছাঁদ: মাঝখানে একটা বড় fact table, যার প্রতি সারি একটা ঘটনা (একটা delivery)। চারপাশে ছোট dimension table: কে, কোথায়, কখন, কোন product। Fact table-এ শুধু dimension-এর ID আর সংখ্যা। চারপাশে ছড়ানো এই চেহারার জন্য নাম star schema। Dimension-গুলো আরও ভেঙে গেলে হয় snowflake।' },
    { kind: 'flow', label: 'Star schema: মাঝে ঘটনার টেবিল, চারপাশে বর্ণনার টেবিল', nodes: [
      { id: 'fact', label: 'Deliveries', sub: 'fact: প্রতি ঘটনা', x: 50, y: 17, w: 24 },
      { id: 'd1', label: 'Merchant', x: 14, y: 8, w: 18 },
      { id: 'd2', label: 'Zone', x: 14, y: 26, w: 18 },
      { id: 'd3', label: 'Date', x: 86, y: 8, w: 18 },
      { id: 'd4', label: 'Rider', x: 86, y: 26, w: 18 },
    ], links: [
      { from: 'd1', to: 'fact', rate: 2 },
      { from: 'd2', to: 'fact', rate: 2 },
      { from: 'd3', to: 'fact', rate: 2 },
      { from: 'd4', to: 'fact', rate: 2 },
    ], h: 34 },

    { kind: 'h', text: 'Graph model' },
    { kind: 'p', text: 'যেখানে সম্পর্কই মূল জিনিস (কে কাকে চেনে, কোন রাস্তা কোথায় যায়, কোন rider কোন hub-এ), সেখানে graph model। তাতে vertex (বিন্দু) আর edge (রেখা), দুটোরই property থাকে। Query হলো "এই বিন্দু থেকে শুরু করে তিন ধাপ পর্যন্ত সবাইকে খুঁজে আনো"। Relational-এ এমন ধাপে ধাপে চলা কঠিন, কারণ ধাপ কয়টা তা আগে থেকে জানা না থাকলে join-এর সংখ্যাও জানা যায় না।' },
    { kind: 'list', items: [
      'Property graph (Neo4j, Cypher): vertex আর edge-এ label আর property।',
      'Triple store (SPARQL): সব কিছু "বিষয়-সম্পর্ক-মান" তিনের গুচ্ছ।',
      'Datalog: নিয়ম দিয়ে recursive প্রশ্ন, "যদি এই হয় তবে ওই হয়" ধরনের।',
      'GraphQL: এটা graph database নয়। Client বলে দেয় কোন field চাই, server ঠিক সেটুকু দেয়।',
    ] },

    { kind: 'h', text: 'Event sourcing আর CQRS' },
    { kind: 'p', text: 'সাধারণত আমরা বর্তমান অবস্থা রাখি, আর বদলালে পুরোনো মান মুছে ফেলি। Event sourcing উল্টো: প্রতিটা ঘটনা (event) যোগ হতে থাকে, কখনো মোছা হয় না। বর্তমান অবস্থা মানে ঘটনাগুলো আগাগোড়া চালানোর ফল। তা থেকে বহু রকম view বানানো যায়, একেকটা এক এক প্রশ্নের জন্য, এটাই CQRS: লেখার রূপ আর পড়ার রূপ আলাদা।' },
    { kind: 'seq', label: 'Parcel-এর event log থেকে আজকের অবস্থা', actors: ['Event log', 'Current view', 'Audit view'], steps: [
      { from: 0, to: 0, msg: 'যোগ: তোলা হলো → hub-এ → বেরোল → পৌঁছাল', note: 'প্রতিটা শুধু যোগ হয়, কিছু বদলায় না।' },
      { from: 0, to: 1, msg: 'শেষ event দেখে "পৌঁছেছে"', tone: 'ok', note: 'এই view বদলে নতুন ছাঁদ বানাতেও পারেন; event আছেই।' },
      { from: 0, to: 2, msg: 'সব event সময়ক্রমে: কে কখন কী বদলাল', tone: 'ok', note: 'কোনো ঘটনা হারায় না, তাই ইতিহাস, ভুল খুঁজে বের করা, নতুন প্রশ্ন সবই সম্ভব।' },
    ] },
    { kind: 'p', text: 'দাম: query করা অবস্থা সরাসরি থাকে না, view বানাতে হয়; আর event-এর ছাঁদ পরে বদলানো কঠিন। ব্যক্তিগত তথ্য মুছতে বললে অপরিবর্তনীয় log-এও মুছতে হয়, এটাও মাথায় রাখবেন।' },

    { kind: 'h', text: 'DataFrame, matrix আর array' },
    { kind: 'p', text: 'Data science আর machine learning-এ data আসে বড় সংখ্যার ছকে। DataFrame (pandas-এর মতো) টেবিলের মতো দেখতে, কিন্তু column ধরে হিসাব আর বদলানো সহজ। Matrix আর array-তে সংখ্যার সারি-column দিয়ে সরাসরি গণিত চলে। এগুলো relational টেবিলের পাশের আরেক model, ভিন্ন কাজের জন্য।' },

    { kind: 'story', title: 'Merchant-এর নাম আর পুরোনো order', steps: [
      'ParcelGo প্রতিটা order document-এ merchant-এর নাম নকল রেখেছিল, যাতে পাতা খুলতে join না লাগে।',
      'একজন merchant দোকানের নাম বদলালেন। নতুন order-এ নতুন নাম, পুরোনো ৫০ হাজার order-এ পুরোনো নাম।',
      'Invoice-এ কোথাও দুটো নাম, কোথাও একটা: গ্রাহক বিভ্রান্ত।',
    ], fix: 'আগে ঠিক করুন নামটা কি ইতিহাস (order-এর সময়ের নাম থাকাই ঠিক), নাকি বর্তমান তথ্য। ইতিহাস হলে নকল রাখাই সঠিক। বর্তমান হলে ID রেখে পড়ার সময় আনুন।' },

    { kind: 'mistakes', items: [
      'এক model-কে সবকিছুর উত্তর ভাবা: সম্পর্কের জাল document-এ, বা গাছের মতো data অযথা বহু টেবিলে।',
      'Denormalize করে ঠিক রাখার দায় নিজের ঘাড়ে আছে তা ভুলে যাওয়া।',
      '"Schema-less" শুনে ভাবা কোনো নিয়মই লাগবে না, তারপর পুরোনো আর নতুন field-এর জট।',
      'Graph-এর প্রশ্নকে জোর করে join-এর পর join-এ লেখা, ধাপ কয়টা আগে থেকে না জেনে।',
    ] },
    { kind: 'check', items: [
      { q: 'Document model কখন সুবিধা দেয়, কখন বিপদে ফেলে?', a: 'এক জিনিসের সব তথ্য একসাথে পড়লে আর গঠন গাছের মতো হলে ভালো (locality, কম join)। Many-to-many সম্পর্ক বেশি হলে বিপদ, কারণ join দুর্বল আর নকল বাড়ে।' },
      { q: 'Normalize আর denormalize-এ কী বদলায়?', a: 'Normalize: তথ্য এক জায়গায়, বদলানো সস্তা, পড়ায় join। Denormalize: তথ্য নকল, পড়া দ্রুত, বদলানো ভারী আর অমিলের ঝুঁকি। কাজটা পড়া থেকে লেখার দিকে সরে যায়।' },
      { q: 'Star schema-য় fact আর dimension কী?', a: 'Fact table-এ প্রতি ঘটনার এক সারি (সংখ্যা আর ID)। Dimension table বর্ণনা দেয়: কে, কোথায়, কখন। Analytics query fact স্ক্যান করে dimension দিয়ে ভাগ করে।' },
      { q: 'Event sourcing-এ বর্তমান অবস্থা কোথায়?', a: 'সরাসরি রাখা নেই। সব event-এর log থেকে আগাগোড়া চালিয়ে বানানো view-ই বর্তমান অবস্থা। Log কখনো বদলায় না, শুধু যোগ হয়।' },
    ] },
  ],
};
