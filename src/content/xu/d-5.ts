import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 5 (Encoding and Evolution), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-5',
  goals: [
    'Memory-র object কেন সরাসরি disk বা network-এ পাঠানো যায় না, আর JSON, Protocol Buffers আর Avro-র মূল তফাত বলতে পারবেন।',
    'Forward আর backward compatibility কী, আর rolling upgrade-এ কেন দুটোই লাগে ব্যাখ্যা করতে পারবেন।',
    'Data এক জায়গা থেকে আরেক জায়গায় যাওয়ার তিন পথ (database, service call, event) আর তাদের ঝুঁকি বলতে পারবেন।',
  ],
  related: ['encoding'],
  blocks: [
    { kind: 'p', text: 'Program-এর ভেতরে data থাকে object, list, pointer-এর চেহারায়। ফাইলে লিখতে বা network-এ পাঠাতে হলে তাকে বাইটের ধারায় বদলাতে হয়। একে বলে encoding (serialization)। উল্টো কাজটা decoding। আর সংস্করণ বদলের সমস্যা: নতুন কোড নতুন ছাঁদে লেখে, পুরোনো কোড তা পড়তে পারে কি না, আর উল্টোটা?' },

    { kind: 'h', text: 'কোন format-এ লিখবেন' },
    { kind: 'list', items: [
      'ভাষার নিজস্ব format (Java serialization, Python pickle): সুবিধাজনক, কিন্তু একটা ভাষায় আটকে যায়, আর decode করার সময় যেকোনো class বানানো যায় বলে নিরাপত্তার ঝুঁকি। দীর্ঘস্থায়ী data-তে এড়ানো ভালো।',
      'JSON, XML, CSV: মানুষ পড়তে পারে, সব ভাষায় চলে। কিন্তু সংখ্যার ধরন নিয়ে অস্পষ্টতা (বড় integer JS-এ নির্ভুল থাকে না), বাইনারি data সরাসরি বহন করা যায় না, আর প্রতিটা record-এ field-এর নাম বারবার লেখা হয়।',
      'Protocol Buffers আর Thrift: schema আগে লেখা থাকে, field চেনা যায় একটা সংখ্যা (tag) দিয়ে, নাম দিয়ে নয়। ছোট, দ্রুত।',
      'Avro: schema আলাদা রাখা হয়, data-তে field-এর নামও নেই, tag-ও নেই। লেখার schema আর পড়ার schema মিলিয়ে নেওয়া হয়। Schema বদলায় প্রায়ই এমন জায়গায় (যেমন data pipeline) ভালো।',
    ] },
    { kind: 'calc', label: 'Field-এর নাম বারবার লেখার খরচ', inputs: [
      { id: 'n', label: 'Record সংখ্যা', min: 1000, max: 1_000_000_000, step: 1000, value: 100_000_000, show: (x) => num(x) },
      { id: 'f', label: 'প্রতি record-এ field', min: 3, max: 40, step: 1, value: 12 },
      { id: 'nm', label: 'গড়ে নামের দৈর্ঘ্য', min: 3, max: 30, step: 1, value: 10, unit: 'byte' },
    ], out: (v) => {
      const json = v.n! * v.f! * v.nm!;
      const tag = v.n! * v.f! * 1;
      return [
        { label: 'JSON-এ শুধু নামের জন্য', value: bytes(json), bar: 1, tone: 'bad', how: `${num(v.n!)} × ${num(v.f!)} field × ${num(v.nm!)} byte` },
        { label: 'Protobuf-এ tag-এর জন্য', value: bytes(tag), bar: Math.min(1, tag / json), tone: 'ok', how: 'ধরা হলো প্রতি field-এর tag ১ byte' },
        { label: 'Avro-তে নামের জন্য', value: '০', tone: 'ok', how: 'Schema একবার আলাদা রাখা হয়, data-তে নাম নেই' },
      ];
    } },
    { kind: 'tip', title: 'কখন কোনটা', text: 'Debug করা আর বাইরের কারও সাথে ভাগ করার জন্য JSON সুবিধাজনক। ভেতরের বড় আর ঘন ঘন চলা পথে schema-ওয়ালা বাইনারি format ছোট আর দ্রুত, তার ওপর schema নিজেই একটা চুক্তির দলিল।' },

    { kind: 'h', text: 'Schema বদলালে কী ঠিক থাকে' },
    { kind: 'p', text: 'Server-এ নতুন সংস্করণ একসাথে সব machine-এ বসে না। এক এক করে বদলানো হয় (rolling upgrade), যাতে সেবা না থামে। কিছুক্ষণ পুরোনো আর নতুন কোড পাশাপাশি চলে। Client app তো আরও ধীরে বদলায়, কেউ কখনো update-ই করে না। তাই দুটো দিকই চাই।' },
    { kind: 'table', head: ['', 'মানে', 'কখন দরকার'], rows: [
      ['Backward compatibility', 'নতুন কোড পুরোনো data পড়তে পারে', 'নতুন সংস্করণ চালু হলে আগের লেখা data-র জন্য'],
      ['Forward compatibility', 'পুরোনো কোড নতুন data পড়তে পারে (অচেনা field উপেক্ষা করে)', 'Rolling upgrade-এ নতুন machine যা লিখল তা পুরোনো machine পড়ে'],
    ] },
    { kind: 'seq', label: 'Rolling upgrade: নতুন field "priority" যোগ হলো', actors: ['নতুন server', 'Database', 'পুরোনো server'], steps: [
      { from: 0, to: 1, msg: 'লেখে: parcel + priority = "জরুরি"', note: 'নতুন কোড নতুন field সহ লেখে।' },
      { from: 2, to: 1, msg: 'পড়ে সেই parcel' },
      { from: 1, to: 2, msg: 'priority সহ record', note: 'পুরোনো কোড field-টা চেনে না।' },
      { from: 2, to: 2, msg: 'অচেনা field উপেক্ষা করে কাজ চালায়', tone: 'ok', note: 'Forward compatibility এটাই।' },
      { from: 2, to: 1, msg: 'আবার লেখে, কিন্তু priority ফেলে দেয়', tone: 'bad', note: 'বিপদ: পড়ে-বদলে-লেখার সময় অচেনা field হারিয়ে যেতে পারে। Decode করা object আবার encode করলে তা বাদ পড়ে।' },
    ] },
    { kind: 'p', text: 'Protobuf-এ নিয়ম: নতুন field-এ নতুন tag, আর পুরোনো tag কখনো ফেরত দেবেন না, আর required বানাবেন না। Avro-তে নতুন field-এ default মান দিন, যাতে পুরোনো data-তেও পড়া যায়। দুই ক্ষেত্রেই বিদ্যমান field-এর অর্থ বা ধরন বদলানো বিপজ্জনক।' },

    { kind: 'h', text: 'Data কীভাবে এক জায়গা থেকে আরেক জায়গায় যায়' },
    { kind: 'p', text: 'Encoding-এর প্রশ্ন আসলে এই তিন পথের প্রশ্ন, কারণ প্রতিবার লেখক আর পাঠক আলাদা সময়ের বা আলাদা সংস্করণের হতে পারে।' },
    { kind: 'table', head: ['পথ', 'লেখক ও পাঠক', 'সংস্করণ নিয়ে ঝুঁকি'], rows: [
      ['Database', 'আজকের কোড লেখে, কয়েক বছর পরের কোড পড়ে', 'পুরোনো data-তে পুরোনো ছাঁদ পড়ে থাকে। সব সারি নতুন করে লেখা ব্যয়বহুল, তাই default দিয়ে চালাতে হয়।'],
      ['Service call (REST, RPC)', 'Client আর server আলাদা দল, আলাদা সময়ে বদলায়', 'Server আগে বদলে client পরে: তাই API-কে আগে-পরে দুইভাবেই চলতে হয়।'],
      ['Event / message', 'Producer আর consumer একে অন্যকে চেনে না', 'Consumer অনেক, কেউ ধীরে বদলায়। Event একবার লেখা হলে বহুদিন থাকে।'],
    ] },
    { kind: 'list', items: [
      'REST আর RPC: দূরের call-কে স্থানীয় function call-এর মতো দেখালেও তা আলাদা: network ভাঙে, উত্তর দেরিতে আসে, call দুবার চলে যেতে পারে। তাই retry-তে idempotency (একই call দুবার চললে ক্ষতি নেই) ভাবতে হয়।',
      'Durable execution আর workflow: একটা দীর্ঘ কাজের (payment, তারপর delivery, তারপর email) প্রতিটা ধাপের ফল সংরক্ষিত থাকে। মাঝপথে crash করলে আগের ধাপের ফল ধরে আবার চলে, দ্বিতীয়বার টাকা কাটে না। শর্ত: কোড নির্ধারিত (একই ইনপুটে একই ধাপ) হতে হবে।',
      'Event-driven: producer একটা broker-এ event ফেলে, consumer নিজের সময়ে পড়ে। সংযোগ আলগা, কিন্তু event-এর ছাঁদ একটা দীর্ঘস্থায়ী চুক্তি।',
    ] },
    { kind: 'flow', label: 'Event-driven: producer আর consumer একে অন্যকে চেনে না, মাঝে broker', nodes: [
      { id: 'p', label: 'Order service', x: 14, y: 17, w: 22 },
      { id: 'b', label: 'Broker', sub: 'event রাখে', x: 50, y: 17, w: 20 },
      { id: 'c1', label: 'Billing', x: 86, y: 8, w: 18 },
      { id: 'c2', label: 'SMS', x: 86, y: 26, w: 18 },
    ], links: [
      { from: 'p', to: 'b', rate: 4 },
      { from: 'b', to: 'c1', rate: 3 },
      { from: 'b', to: 'c2', rate: 3 },
    ], h: 34 },

    { kind: 'story', title: 'নতুন field আর ফেলে-দেওয়া তথ্য', steps: [
      'ParcelGo-র নতুন সংস্করণ parcel-এ "priority" field যোগ করল, আর rolling upgrade শুরু হলো।',
      'এক পুরোনো server সেই parcel পড়ে, নাম বদলে আবার লিখল। তার object-এ priority-র জায়গাই ছিল না, তাই লেখার সময় বাদ।',
      'কিছু parcel-এর "জরুরি" চিহ্ন নিঃশব্দে উধাও। কেউ কিছু ভাঙতে দেখেনি, শুধু আচরণ বদলে গেল।',
    ], fix: 'পুরো rollout শেষ না হওয়া পর্যন্ত নতুন field-এ নির্ভর করবেন না। অচেনা field-কে রেখে দিয়ে আবার লিখুন (বা শুধু পরিবর্তিত field আপডেট করুন), আর rollout-এর মাঝে এই পথটা পরীক্ষা করুন।' },

    { kind: 'mistakes', items: [
      'দীর্ঘস্থায়ী data বা বাইরের API-তে ভাষার নিজস্ব serialization ব্যবহার।',
      'শুধু নতুন কোড নতুন data পড়ে কি না দেখা; পুরোনো কোড নতুন data-য় কী করে ভুলে যাওয়া।',
      'Protobuf-এ পুরোনো tag নতুন field-এ ফেরত দেওয়া, বা field-এর ধরন বদলানো।',
      'Remote call-কে স্থানীয় call-এর মতো ভাবা, retry-তে idempotency না ভেবে।',
    ] },
    { kind: 'check', items: [
      { q: 'JSON-এর চেয়ে Protobuf ছোট কেন?', a: 'JSON-এ প্রতি record-এ প্রতিটা field-এর নাম লেখা হয়। Protobuf আগে থেকে schema জানে বলে নামের বদলে ছোট একটা tag সংখ্যা লেখে।' },
      { q: 'Backward আর forward compatibility-র তফাত?', a: 'Backward: নতুন কোড পুরোনো data পড়তে পারে। Forward: পুরোনো কোড নতুন data পড়তে পারে, অচেনা field উপেক্ষা করে। Rolling upgrade-এ দুটোই লাগে।' },
      { q: 'Avro-তে নতুন field যোগ করার সময় কী করবেন?', a: 'Default মান দিন, যাতে পুরোনো data নতুন schema দিয়ে পড়লেও field-টার একটা মান থাকে।' },
      { q: 'Durable execution কোন সমস্যা সমাধান করে?', a: 'দীর্ঘ কাজের মাঝপথে crash হলে আগের ধাপের ফল সংরক্ষিত থাকে, তাই আবার চালালে সম্পন্ন ধাপ (যেমন টাকা কাটা) দ্বিতীয়বার চলে না।' },
    ] },
  ],
};
