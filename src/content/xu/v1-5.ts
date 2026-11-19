import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 5 (Design Consistent Hashing), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-5',
  goals: [
    'কেন "key mod server সংখ্যা" ভাঙে, আর server যোগ করলে কতগুলো key নড়ে তা সংখ্যায় বলতে পারবেন।',
    'Hash ring-এ key কোন server-এ যায়, আর server যোগ বা বাদ দিলে কোন key নড়ে, হাতে এঁকে দেখাতে পারবেন।',
    'Virtual node কেন লাগে, আর কতগুলো দিলে ভার কতটা সমান হয় বলতে পারবেন।',
  ],
  related: ['sharding', 'caching'],
  blocks: [
    { kind: 'p', text: 'অনেক server-এ data বা cache ছড়াতে হলে প্রথম প্রশ্ন: এই key কোন server-এ থাকবে? সবচেয়ে সহজ উত্তর: key-র hash বের করে server সংখ্যা দিয়ে ভাগশেষ নিন। যতক্ষণ server সংখ্যা বদলায় না, এটা পুরোপুরি ঠিক। সমস্যা শুরু হয় যেদিন একটা server বসে যায় বা একটা বাড়াতে হয়।' },

    { kind: 'h', text: 'Mod hash-এর বিপদ' },
    { kind: 'p', text: 'Server ৪টা থেকে ৫টা হলে ভাগশেষের নিয়মটাই বদলে যায়, তাই প্রায় সব key-র নতুন ঠিকানা আলাদা। Cache cluster-এ এর মানে: হঠাৎ প্রায় সব জায়গায় miss, আর সব request গিয়ে পড়ে database-এ। নিচে সংখ্যা বদলে দেখুন।' },
    { kind: 'calc', label: 'একটা server যোগ করলে কত key নতুন জায়গায় যায়', inputs: [
      { id: 'n', label: 'এখন server আছে', min: 2, max: 50, step: 1, value: 4, unit: 'টা' },
      { id: 'k', label: 'মোট key', min: 1000, max: 1_000_000, step: 1000, value: 100_000 },
    ], out: (v) => {
      const mod = v.n! / (v.n! + 1);
      const ring = 1 / (v.n! + 1);
      return [
        { label: 'Mod hash: নড়ে', value: `${num(Math.round(mod * 100))}% · ${num(Math.round(mod * v.k!))}টা key`, bar: mod, tone: 'bad', how: `${num(v.n!)} ÷ ${num(v.n! + 1)}: প্রায় সবাই` },
        { label: 'Consistent hashing: নড়ে', value: `${num(Math.round(ring * 100))}% · ${num(Math.round(ring * v.k!))}টা key`, bar: ring, tone: 'ok', how: `১ ÷ ${num(v.n! + 1)}: শুধু নতুন server-এর ভাগটুকু` },
      ];
    } },
    { kind: 'flow', label: 'Server বদলের পর mod hash-এ cache miss: request (লাল) database-এ গিয়ে পড়ছে', nodes: [
      { id: 'u', label: 'User', x: 9, y: 17 },
      { id: 'c', label: 'Cache cluster', sub: 'server ৪ → ৫', x: 42, y: 17, w: 24 },
      { id: 'db', label: 'Database', sub: 'একা সামলাচ্ছে', x: 84, y: 17, w: 22, tone: 'hot' },
    ], links: [
      { from: 'u', to: 'c', rate: 5 },
      { from: 'c', to: 'db', rate: 4, mix: 0.9, mixColor: '#e5484d' },
    ], h: 34 },

    { kind: 'h', text: 'Hash ring' },
    { kind: 'p', text: 'ধারণাটা সহজ: hash-এর পুরো সীমাকে একটা বৃত্তের মতো সাজান, যেন সবচেয়ে বড় সংখ্যার পরেই আবার শূন্য। প্রতিটা server-কে তার নামের hash দিয়ে বৃত্তের একটা বিন্দুতে বসান। একটা key-কেও hash করে বৃত্তে বসান, তারপর ঘড়ির কাঁটার দিকে এগিয়ে প্রথম যে server পান, key সেখানেই থাকবে। Server সংখ্যা এখানে কোথাও হিসাবে আসে না, তাই সংখ্যা বদলালে নিয়মও বদলায় না।' },
    { kind: 'seq', label: 'একটা key কোন server-এ যাবে: "PG-4821"', actors: ['Client', 'Hash ring', 'Server খ'], steps: [
      { from: 0, to: 1, msg: 'key = PG-4821 (hash করলে বৃত্তে একটা বিন্দু)' },
      { from: 1, to: 1, msg: 'ঘড়ির কাঁটার দিকে এগোও', note: 'বৃত্তে পরের বিন্দুগুলো server-এর। প্রথমটাতেই থামুন।' },
      { from: 1, to: 2, msg: 'প্রথম server পাওয়া গেল: খ', tone: 'ok' },
      { from: 2, to: 0, msg: 'data এখানেই লেখা বা পড়া হবে', tone: 'ok', note: 'একই key পরেরবার একই পথে একই জায়গায় পৌঁছায়, যতক্ষণ খ আছে।' },
    ] },

    { kind: 'h', text: 'Server যোগ বা বাদ' },
    { kind: 'seq', label: 'নতুন server "ঘ" বৃত্তে বসল: কোন key সরবে?', actors: ['পুরোনো server গ', 'Server ঘ (নতুন)', 'বাকি সব server'], steps: [
      { from: 1, to: 1, msg: 'ঘ বৃত্তে নিজের বিন্দুতে বসল', note: 'ঘ-র ঠিক আগের server খ। ঘ আর খ-র মাঝের অংশটা এখন ঘ-র।' },
      { from: 0, to: 1, msg: 'শুধু ঘ আর তার আগের server-এর মাঝের key-গুলো ঘ-তে আসে', tone: 'ok', note: 'আগে এই key-গুলো গ-তে ছিল, কারণ কাঁটার দিকে এগিয়ে গ-ই প্রথমে মিলত।' },
      { from: 2, to: 2, msg: 'বাকি সব key যেখানে ছিল সেখানেই', tone: 'ok', note: 'এটাই পুরো কৌশলের লাভ: বাকিদের কিছুই বদলাল না, cache গরম থাকল।' },
    ] },
    { kind: 'list', items: [
      'Server বাদ গেলে উল্টোটা: তার key-গুলো কাঁটার দিকে পরের server-এ চলে যায়, আর বাকিরা যেখানে ছিল সেখানে।',
      'গড়ে নড়ে মোট key-র প্রায় ১/(server সংখ্যা), যেমন ১০ server থেকে ১১ হলে প্রায় ৯%।',
      'Server কোথায় বসল তা hash ঠিক করে, তাই সবাই (client, cluster-এর সব সদস্য) আলাদা আলাদাভাবে একই বৃত্ত বানাতে পারে, কেউ কাউকে জিজ্ঞেস না করেই।',
    ] },

    { kind: 'h', text: 'দুটো ঝামেলা, আর virtual node' },
    { kind: 'list', items: [
      'অসমান ভাগ: server কম হলে hash এলোমেলোভাবে তাদের বৃত্তের কাছাকাছি বসাতে পারে। কারও ভাগে পড়ে বৃত্তের অর্ধেক, কারও এক ছিটে।',
      'Server বাদ গেলে তার সব কাজ পড়ে ঠিক পরের একটা server-এর ঘাড়ে, সে-ও তখন বসে যেতে পারে।',
    ] },
    { kind: 'p', text: 'সমাধান: একটা সত্যিকারের server-কে বৃত্তে একটা বিন্দুর বদলে অনেকগুলো বিন্দুতে বসান। এই বিন্দুগুলোকে বলে virtual node। বৃত্তে এখন অনেক ছোট ছোট ভাগ, আর প্রতিটা server-এর বহু ভাগ ছড়ানো। ভাগ সংখ্যা যত বাড়ে, গড়ের কাছাকাছি আসে। সাথে সুবিধা: একটা server বাদ গেলে তার ভার পড়ে বহু server-এ, একজনের ঘাড়ে না।' },
    { kind: 'calc', label: 'একটা server-এর virtual node কত দেবেন', inputs: [
      { id: 'v', label: 'প্রতি server-এ virtual node', min: 1, max: 400, step: 1, value: 100 },
      { id: 'n', label: 'Server', min: 3, max: 30, step: 1, value: 10, unit: 'টা' },
    ], out: (v) => {
      const dev = Math.min(100, 100 / Math.sqrt(v.v!));
      return [
        { label: 'ভার গড় থেকে মোটামুটি কতটা এদিক-ওদিক', value: `±${num(dev)}%`, bar: dev / 100, tone: dev > 25 ? 'bad' : dev > 12 ? undefined : 'ok', how: `আনুমানিক ১০০ ÷ √${num(v.v!)}; এটা অঙ্কের মোটা নিয়ম, ঠিক সংখ্যা নয়` },
        { label: 'বৃত্তে মোট বিন্দু', value: num(v.v! * v.n!), how: `${num(v.v!)} × ${num(v.n!)} (এগুলো ধরে রাখতে একটু বেশি memory লাগে)` },
        { label: 'একটা server বাদ গেলে ভার ছড়ায়', value: `${num(v.n! - 1)}টা server-এ`, tone: 'ok', how: 'তার ছড়ানো ভাগগুলো আলাদা আলাদা প্রতিবেশীর হাতে যায়' },
      ];
    } },
    { kind: 'tip', title: 'দাম আছে', text: 'Virtual node বাড়ালে ভাগ সমান হয়, কিন্তু বিন্দুগুলোর তালিকা রাখতে আর খুঁজতে একটু বেশি জায়গা আর কাজ লাগে। তাই সংখ্যাটা প্রয়োজন বুঝে ঠিক করুন; অনেক system প্রতি server-এ একশো থেকে কয়েকশো রাখে।' },

    { kind: 'h', text: 'কোথায় কাজে লাগে' },
    { kind: 'table', head: ['জায়গা', 'কী ভাগ হচ্ছে', 'কেন লাগে'], rows: [
      ['Key-value store (Dynamo-ধাঁচের)', 'Data-র partition', 'Node বাড়ালে বা ভাঙলে অল্প data সরে'],
      ['Cache cluster', 'Cache key', 'Server বদলালেও বেশিরভাগ cache গরম থাকে'],
      ['CDN আর load balancer', 'কোন content বা connection কোন server-এ', 'একই URL সবসময় একই server-এ, তাই সেখানকার cache কাজে লাগে'],
      ['Chat বা game server', 'কোন room কোন server-এ', 'Server যোগ করলে সব room নড়ে না'],
    ] },
    { kind: 'story', title: 'সেল-এর রাতে cache বাড়ানো', steps: [
      'ঈদের সেলে ParcelGo-র cache cluster-এ চতুর্থ server যোগ হলো, চাপ কমানোর জন্য।',
      'Mod hash ব্যবহার হচ্ছিল, তাই প্রায় সব key-র ঠিকানা একসাথে বদলাল।',
      'সব cache খালি; সব request সরাসরি database-এ; database বসে গেল, সেল-এর মাঝখানে।',
    ], fix: 'Consistent hashing-এ বদলানো, যাতে server যোগ করলে শুধু নতুন server-এর ভাগটুকু খালি থাকে। আর বড় বদলের আগে নতুন server-এ আগে থেকে data ভরে (warm করে) নেওয়া।' },

    { kind: 'mistakes', items: [
      '"Key mod server সংখ্যা" দিয়ে cache cluster বানিয়ে পরে server বাড়াতে চাওয়া।',
      'প্রতি server-এ একটাই বিন্দু রাখা: ভাগ অসমান হয়, একটা server বাদ গেলে প্রতিবেশীর উপর পুরো বোঝা।',
      '"কিছুই নড়ে না" ভাবা: consistent hashing-এও কিছু key নড়ে, শুধু অল্প। আর সেই data সরানোর কাজটা (rebalance) আলাদা করে করতে হয়।',
    ] },
    { kind: 'check', items: [
      { q: 'চার server থেকে পাঁচে গেলে mod hash-এ কত key নড়ে, আর consistent hashing-এ?', a: 'Mod hash-এ প্রায় ৪/৫, মানে ৮০%। Consistent hashing-এ প্রায় ১/৫, মানে ২০%, আর সেটাও শুধু নতুন server-এর ভাগ।' },
      { q: 'Ring-এ key-র ঠিকানা কীভাবে খুঁজবেন?', a: 'Key hash করে বৃত্তে বসান, তারপর ঘড়ির কাঁটার দিকে এগিয়ে প্রথম server-টা পর্যন্ত। সেটাই তার ঠিকানা।' },
      { q: 'Virtual node ছাড়া কী দুটো সমস্যা থাকে?', a: 'Server-দের ভাগ অসমান হতে পারে, আর একটা server বাদ গেলে তার পুরো ভার একটা প্রতিবেশীর ঘাড়ে পড়ে।' },
      { q: 'Virtual node বাড়ালে কী লাভ, কী দাম?', a: 'লাভ: ভার সমান হয়, আর server বাদ গেলে বহু server-এ ছড়ায়। দাম: বিন্দুর তালিকা ধরে রাখতে বেশি memory, আর খুঁজতে একটু বেশি কাজ।' },
    ] },
  ],
};
