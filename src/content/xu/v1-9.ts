import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 9 (Design A Web Crawler), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-9',
  goals: [
    'Crawler-এর ঘটকগুলো (seed, URL frontier, downloader, parser, "দেখা হয়েছে" যাচাই, storage) পরপর সাজিয়ে বলতে পারবেন।',
    'ভদ্রতা (politeness), গুরুত্ব (priority), তাজা থাকা (freshness): frontier কীভাবে তিনটা সামলায় বলতে পারবেন।',
    'একই পাতা দুবার না নেওয়ার উপায় আর "ফাঁদ"-এ আটকানো থেকে বাঁচার উপায় বলতে পারবেন।',
  ],
  related: ['streams', 'sharding'],
  blocks: [
    { kind: 'p', text: 'Web crawler একটা রোবট যে কিছু পাতা দিয়ে শুরু করে, সেখানকার link ধরে ধরে নতুন পাতা খুঁজে খুঁজে নামায়। Search engine এভাবে নিজের index বানায়; আরও কাজ: archive, price-তুলনা, নিজের site-এর সব ভাঙা link খোঁজা। ParcelGo-র উদাহরণ: প্রতিদিন কয়েক শো courier-এর site ঘুরে তাদের শিপিং রেট আর সময় সংগ্রহ।' },
    { kind: 'list', items: [
      'বিশাল: মাসে শত কোটি পাতা।',
      'ভদ্র: একটা site-কে এত request নয় যে বসে যায়।',
      'মজবুত: ভাঙা HTML, ধীর server, বন্ধ site, আর অনন্ত loop-এ আটকানো যাবে না।',
      'বাড়ানো সহজ: নতুন ধরনের content (ছবি, PDF) যোগ করা যাবে।',
    ] },
    { kind: 'calc', label: 'অনুমান: মাসে শত কোটি পাতা', inputs: [
      { id: 'p', label: 'মাসে পাতা (শত কোটি)', min: 1, max: 20, step: 1, value: 1 },
      { id: 's', label: 'গড় পাতার আকার', min: 50, max: 2000, step: 50, value: 500, unit: 'KB' },
      { id: 'y', label: 'কত বছর রাখবেন', min: 1, max: 10, step: 1, value: 5 },
    ], out: (v) => {
      const pages = v.p! * 1e9;
      const qps = pages / (30 * 86400);
      const monthly = pages * v.s! * 1e3;
      return [
        { label: 'পাতা প্রতি সেকেন্ডে', value: num(Math.round(qps)), how: `${num(v.p!)}B ÷ (৩০ × ৮৬,৪০০ সেকেন্ড)` },
        { label: 'ভিড়ের সময়ে (প্রায় দ্বিগুণ)', value: num(Math.round(qps * 2)), tone: 'bad' },
        { label: 'মাসে storage', value: bytes(monthly), how: `${num(pages)} × ${num(v.s!)} KB` },
        { label: `${num(v.y!)} বছরে`, value: bytes(monthly * 12 * v.y!), how: 'মাসের সংখ্যা × ১২ × বছর', tone: 'bad' },
      ];
    } },

    { kind: 'h', text: 'পাইপলাইন: একটা পাতার যাত্রা' },
    { kind: 'flow', label: 'Crawler-এর পথ: URL বেরিয়ে আসে frontier থেকে, পাতা হয়ে ফিরে নতুন URL হয়ে আবার ঢোকে', nodes: [
      { id: 'seed', label: 'Seed URL', x: 8, y: 6 },
      { id: 'fr', label: 'URL frontier', sub: 'কোনটা পরে', x: 34, y: 6, w: 22 },
      { id: 'dl', label: 'Downloader', sub: 'DNS + HTML', x: 62, y: 6, w: 20 },
      { id: 'pr', label: 'Parser', sub: 'মিলিয়ে দেখো', x: 90, y: 6 },
      { id: 'cs', label: 'Content seen?', x: 90, y: 28, w: 20 },
      { id: 'ex', label: 'Link বের করা', x: 62, y: 28, w: 20 },
      { id: 'us', label: 'URL seen?', sub: 'Bloom filter', x: 34, y: 28, w: 20 },
    ], links: [
      { from: 'seed', to: 'fr', rate: 1.2 },
      { from: 'fr', to: 'dl', rate: 3 },
      { from: 'dl', to: 'pr', rate: 3 },
      { from: 'pr', to: 'cs', rate: 3, drop: 0.2 },
      { from: 'cs', to: 'ex', rate: 2.4 },
      { from: 'ex', to: 'us', rate: 2.4, drop: 0.3 },
      { from: 'us', to: 'fr', rate: 1.8 },
    ], h: 36 },
    { kind: 'table', head: ['ঘটক', 'কাজ'], rows: [
      ['Seed URL', 'শুরুর কিছু পাতা। ভালো seed বেছে নিলে বেশি পাতা ছোঁয়া যায় (বিষয় বা দেশ ধরে)।'],
      ['URL frontier', 'যে URL-গুলো নামানো বাকি, তার তালিকা (queue)। কোনটা কখন, এটাই crawler-এর মূল চাল।'],
      ['HTML downloader', 'URL থেকে পাতা নামায়। DNS-এর উত্তর cache করে রাখে, কারণ DNS খোঁজা ধীর।'],
      ['Parser', 'পাতা ঠিক কিনা যাচাই করে (ভাঙা বা অনর্থক পাতা ফেলে দেয়)।'],
      ['Content seen', 'এই পাতার আসল লেখা কি আগে নামানো? Page-এর hash মিলিয়ে দেখে। মিললে ফেলে দেয়।'],
      ['Link extractor', 'পাতা থেকে সব link বের করে, সম্পূর্ণ URL বানায় (/track → https://site.com/track)।'],
      ['URL filter', 'বাদ দেয়: বিশেষ ধরনের file, কালো তালিকার site, error-এর URL।'],
      ['URL seen', 'এই URL-ই কি আগে দেখা? Bloom filter বা hash set। দেখা হলে আবার frontier-এ যায় না।'],
      ['Storage', 'পাতা বড় হলে disk-এ; popular পাতা memory-তে।'],
    ] },

    { kind: 'h', text: 'BFS আর DFS' },
    { kind: 'p', text: 'Web হলো একটা বিরাট graph: পাতা তার বিন্দু, link তার রেখা। এই graph-এ ঘোরার দুটো সাধারণ পথ: DFS (এক পথে গভীরে যেতে যেতে), আর BFS (এক স্তরের সব পাতা নিয়ে তারপর পরের স্তর)। Crawler-এ সাধারণত BFS, queue দিয়ে। DFS-এ একটা site-এর গভীরে অনন্ত নেমে যেতে পারে।' },
    { kind: 'p', text: 'কিন্তু সরল BFS-এর দুটো ঝামেলা: এক site-এর অনেক link একসাথে queue-তে, তাই সেই site-কে হঠাৎ ঝড়ের মতো request পাঠানো; আর সব URL সমান ধরা: আজকের খবর আর তিন বছরের পুরোনো পাতা একই গুরুত্ব পায়। Frontier এই দুটোই সামলায়।' },

    { kind: 'h', text: 'URL frontier: ভদ্রতা, গুরুত্ব, তাজা থাকা' },
    { kind: 'seq', label: 'ভদ্রতা: প্রতিটা site-এর জন্য আলাদা queue, আর একজন worker একটা site-এ', actors: ['Router', 'Queue: siteA.com', 'Queue: siteB.com', 'Worker ১', 'Worker ২'], steps: [
      { from: 0, to: 1, msg: 'siteA.com/a1, /a2, /a3 একই queue-তে', note: 'Hostname ধরে router ঠিক করে কোন queue।' },
      { from: 0, to: 2, msg: 'siteB.com/b1' },
      { from: 1, to: 3, msg: 'Worker ১ শুধু siteA-র queue থেকে নেয়', tone: 'ok', note: 'একজন worker একটা site-এ, তাই একসাথে সেই site-এ অনেক request যায় না।' },
      { from: 3, to: 3, msg: 'একটা নামানো শেষ হলে একটু বিরতি, তারপর পরেরটা', tone: 'ok', note: 'এই বিরতিই "ভদ্রতা"। Site-টা বসে যায় না, আমরাও কালো তালিকায় যাই না।' },
      { from: 2, to: 4, msg: 'Worker ২ siteB-র queue নেয়, সমান্তরালে' },
    ] },
    { kind: 'list', items: [
      'গুরুত্ব (priority): পাতার জনপ্রিয়তা, কতবার বদলায় বা site-এর মান দেখে আগে-পরে। উঁচু গুরুত্বের জন্য আলাদা queue; বেশি মনোযোগ সেখানে।',
      'তাজা থাকা (freshness): পাতা বদলায়। কত ঘন ঘন বদলায় দেখে আবার নামানো, শুধু যেগুলো বেশি বদলায় সেগুলো ঘন ঘন।',
      'বিশাল frontier: সব URL memory-তে ধরে না। বেশিরভাগ disk-এ, আর কাজের কিছু অংশ memory-র buffer-এ।',
    ] },

    { kind: 'h', text: 'আরও সতর্কতা' },
    { kind: 'list', items: [
      'robots.txt: প্রতিটা site বলে দেয় কোন কোন অংশ crawler-এর জন্য নিষিদ্ধ। আগে সেটা নামিয়ে মানুন, আর cache করে রাখুন।',
      'ধীর বা মরা server: timeout বেঁধে দিন, বারবার মরলে সেই site থেকে কিছুদিন বিরতি।',
      'Spider trap: এমন link যা অনন্ত গভীরে নিয়ে যায় (যেমন /a/b/a/b/a/b…)। URL-এর দৈর্ঘ্য বা গভীরতার সীমা দিন; খুব বড় পাতা বা অনর্থক বিষয় আলাদা করে দেখুন।',
      'ডুপ্লিকেট: একই লেখা অনেক URL-এ। Content hash মিলিয়ে ছেঁটে ফেলা।',
      'অনেক machine: কাজ ভাগ করতে hostname ধরে hash (v1-5), তাহলে একই site-এর সব URL একই machine-এ।',
      'JavaScript-এ আঁকা পাতা: HTML-এ link নেই; আগে render করে নিতে হয় (server-side rendering)।',
    ] },

    { kind: 'seq', label: 'একটা URL-এর পুরো যাত্রা, শুরু থেকে শেষ', actors: ['Frontier', 'Downloader', 'Parser', 'Seen-যাচাই', 'Storage'], steps: [
      { from: 0, to: 1, msg: 'https://courier.com/rates নামাও' },
      { from: 1, to: 1, msg: 'DNS cache থেকে IP, তারপর HTML নামালো', note: 'robots.txt আগেই মেনে নেওয়া হয়েছে।' },
      { from: 1, to: 2, msg: 'HTML দিলাম' },
      { from: 2, to: 3, msg: 'পাতার hash: আগে দেখা হয়েছে?', note: 'Hash আগের কোনো পাতার সাথে মিললে এখানেই শেষ, কাজ বাঁচল।' },
      { from: 3, to: 4, msg: 'নতুন পাতা: রেখে দাও', tone: 'ok' },
      { from: 2, to: 3, msg: 'পাতা থেকে ১২টা link: কোনগুলো আগে দেখা?' },
      { from: 3, to: 0, msg: 'শুধু ৫টা নতুন, বাকিটা ফেলে: frontier-এ ঢোকাও', tone: 'ok' },
    ] },

    { kind: 'story', title: 'এক courier-এর site ডুবে গেল', steps: [
      'ParcelGo-র rate crawler সব URL একসাথে একটা queue-তে রেখে ১০০ থ্রেডে নামাচ্ছিল।',
      'একটা ছোট courier-এর site-এর শত শত rate-পাতা ছিল, সব এসে পড়ল একই মুহূর্তে।',
      'Site বসে গেল, courier ফোন করে অভিযোগ করল, আর IP কালো তালিকায়।',
    ], fix: 'প্রতিটা hostname-এর জন্য আলাদা queue আর প্রতি request-এর মাঝে বিরতি, আর robots.txt-এর Crawl-delay মানা। Crawler যত ভদ্র, তত বেশিদিন কাজ করে।' },

    { kind: 'mistakes', items: [
      'সব URL একটা queue-তে, কোনো ভদ্রতা নেই।',
      'DFS ধরে একটা site-এর গভীরে অনন্ত নেমে যাওয়া।',
      'robots.txt না মানা।',
      '"দেখা হয়েছে" যাচাই না করে একই পাতা বারবার নামানো।',
      'ধীর server-এর জন্য timeout না দেওয়া।',
    ] },
    { kind: 'check', items: [
      { q: 'একটা site-কে অতিরিক্ত request থেকে কীভাবে বাঁচাবেন?', a: 'Hostname ধরে আলাদা queue, প্রতি queue-তে একজন worker, আর প্রতিটা নামানোর পর একটু বিরতি। সাথে robots.txt মানা।' },
      { q: 'Crawler-এ BFS কেন DFS-এর চেয়ে ভালো?', a: 'DFS একটা site-এর গভীরে অনন্ত নামতে পারে; BFS স্তর ধরে এগোয়, queue দিয়ে সহজে হয়। তবে সরল BFS-এ priority আর politeness যোগ করতে হয়।' },
      { q: 'একই পাতা দুবার না নামাতে কী কী যাচাই?', a: 'URL আগে দেখা কিনা (URL seen, Bloom filter বা hash set), আর লেখা আগে দেখা কিনা (content hash)।' },
      { q: 'Spider trap কী, কীভাবে এড়ান?', a: 'এমন link-এর চক্র যা অনন্ত নতুন URL বানায়। URL-এর সর্বোচ্চ দৈর্ঘ্য আর গভীরতা বেঁধে, আর সন্দেহজনক site হাতে দেখে।' },
    ] },
  ],
};
