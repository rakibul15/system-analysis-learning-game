import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 14 (Design YouTube), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-14',
  goals: [
    'Upload আর streaming দুই পথ আলাদা করে আঁকতে পারবেন, আর কেন দুটো আলাদা বলতে পারবেন।',
    'Video encode (transcode) কেন লাগে, আর কেন সেটা ভাগ করে সমান্তরালে চলে (DAG) বুঝিয়ে বলতে পারবেন।',
    'CDN খরচ আর কোন video কোথায় রাখবেন (জনপ্রিয় কাছে, বাকি দূরে) হিসাব করে বলতে পারবেন।',
  ],
  related: ['caching', 'storage'],
  blocks: [
    { kind: 'p', text: 'Video প্ল্যাটফর্মে মূল দুই কাজ: কেউ video তোলে (upload), আর লাখো মানুষ দেখে (streaming)। ParcelGo-র উদাহরণ: merchant-রা পণ্যের ছোট video তুলে দেয়, customer ফোনে ধীর network-এও দেখে। এখানে বড় প্রশ্ন আর কাজ নয়, খরচ: video বড়, আর দেখা বিশ্বজুড়ে ছড়ানো।' },
    { kind: 'list', items: [
      'Upload দ্রুত, আর বড় file (কয়েক GB) মাঝপথে ভাঙলে আবার নতুন করে নয়।',
      'চলার মান ভালো: সবার network আলাদা, তাই ধীর ফোনে কম মান, দ্রুতটায় বেশি।',
      'মানের কিছু ছাড়: ধরা যাক user বহু device থেকে: ফোন, TV, browser।',
      'খরচ কম: storage আর CDN-ই বড় খরচ, তাই হিসাব করে চলা।',
    ] },
    { kind: 'calc', label: 'অনুমান: storage আর CDN খরচ', inputs: [
      { id: 'dau', label: 'দিনে user', min: 1, max: 100, step: 1, value: 5, unit: 'M' },
      { id: 'w', label: 'প্রতি user দিনে দেখে', min: 1, max: 20, step: 1, value: 5, unit: 'video' },
      { id: 'mb', label: 'একটা video-র গড় আকার', min: 10, max: 500, step: 10, value: 300, unit: 'MB' },
      { id: 'cost', label: 'CDN দাম প্রতি GB', min: 1, max: 10, step: 1, value: 2, unit: 'সেন্ট' },
    ], out: (v) => {
      const gb = (v.dau! * 1e6 * v.w! * v.mb!) / 1000;
      const day = (gb * v.cost!) / 100;
      return [
        { label: 'দিনে মোট ডেটা (দেখার জন্য)', value: bytes(gb * 1e9), how: `${num(v.dau!)}M × ${num(v.w!)} × ${num(v.mb!)} MB` },
        { label: 'CDN খরচ দিনে', value: `$${num(Math.round(day))}`, how: `${bytes(gb * 1e9)} × ${num(v.cost!)} সেন্ট/GB`, tone: 'bad', bar: Math.min(1, day / 300_000) },
        { label: 'বছরে', value: `$${num(Math.round(day * 365))}`, how: 'দিনে খরচ × ৩৬৫' },
      ];
    } },
    { kind: 'tip', title: 'সংখ্যাই বলে দেয় কোথায় সাশ্রয়', text: 'এই খরচ নিয়েই design-এর বেশিরভাগ ঝুঁকি। সব video সব জায়গায় CDN-এ রাখলে খরচ আকাশছোঁয়া। জনপ্রিয়গুলোই CDN-এ; বাকিগুলো কম দামি জায়গা থেকে।' },

    { kind: 'h', text: 'Upload: পথ' },
    { kind: 'flow', label: 'Upload: মূল file আগে রাখা, তারপর পেছনে encode, তারপর ছড়ানো। User অপেক্ষা করে না', nodes: [
      { id: 'u', label: 'User', x: 8, y: 6 },
      { id: 'os', label: 'মূল video', sub: 'object storage', x: 34, y: 6, w: 22 },
      { id: 'tr', label: 'Transcoder', sub: 'নানা মানে', x: 62, y: 6, w: 20 },
      { id: 'ts', label: 'Encode-করা video', x: 90, y: 6, w: 20 },
      { id: 'cdn', label: 'CDN', x: 90, y: 28 },
      { id: 'md', label: 'Metadata DB', sub: 'শিরোনাম, URL', x: 34, y: 28, w: 22 },
    ], links: [
      { from: 'u', to: 'os', rate: 2.4, secs: 1.6 },
      { from: 'os', to: 'tr', rate: 1.6 },
      { from: 'tr', to: 'ts', rate: 1.6 },
      { from: 'ts', to: 'cdn', rate: 1.2 },
      { from: 'u', to: 'md', rate: 1 },
    ], h: 36 },
    { kind: 'list', items: [
      'বড় file একটা request-এ নয়: টুকরো করে (chunk) পাঠানো। মাঝপথে ভাঙলে শুধু বাকি টুকরো আবার।',
      'Metadata (শিরোনাম, বিবরণ, কে তুলেছে) আলাদা database-এ, দ্রুত খোঁজার জন্য; কখনো cache-এও।',
      'Upload শেষ মানে video দেখার জন্য তৈরি নয়: encode বাকি। User-কে বলা হয় "প্রস্তুত হচ্ছে"।',
    ] },

    { kind: 'h', text: 'Encode: একই video, অনেক রূপ' },
    { kind: 'p', text: 'তোলা video-র ধরন (format) অনেক, আর বড়। সব device সব ধরন চালায় না, আর সব network বড় file টানতে পারে না। তাই একই video নানা মান (রেজোলিউশন) আর নানা ধরনে বদলে নেওয়া হয়: এটাই encode বা transcode। ফলে কম গতিতে ছোট মান, বেশি গতিতে বড়।' },
    { kind: 'stages', label: 'Encode-এর পাইপলাইন: একটা video ভেঙে সমান্তরালে', stages: [
      { title: 'ভাগ করা', problem: 'পুরো video একটা machine-এ encode করলে ঘণ্টার পর ঘণ্টা।', fix: 'Video-কে কয়েক সেকেন্ডের টুকরোয় (GOP) ভাগ করুন। প্রতিটা টুকরো স্বাধীন।', cost: 'ভাগ-জোড়ার আলাদা কাজ, আর টুকরো সীমানায় ঠিক কাটা চাই।',
        nodes: [{ id: 'v', label: 'পুরো video', x: 14, y: 17, w: 20 }, { id: 'a', label: 'টুকরো ১', x: 62, y: 5, w: 16 }, { id: 'b', label: 'টুকরো ২', x: 62, y: 17, w: 16 }, { id: 'c', label: 'টুকরো ৩', x: 62, y: 29, w: 16 }],
        links: [{ from: 'v', to: 'a', rate: 1.6 }, { from: 'v', to: 'b', rate: 1.6 }, { from: 'v', to: 'c', rate: 1.6 }] },
      { title: 'সমান্তরালে encode', problem: 'টুকরো আলাদা হলেও একটা একটা করে encode করলে তো ধীরই।', fix: 'প্রতি টুকরো আলাদা worker-এ, একসাথে। Message queue (v2-4) দিয়ে কাজ বিলি; ভিড় বাড়লে worker বাড়ান।', cost: 'অনেক machine লাগে, আর কোনো worker ভাঙলে তার টুকরো আবার দিতে হয়।',
        nodes: [{ id: 'q', label: 'Task queue', x: 12, y: 17, w: 18 }, { id: 'w1', label: 'Worker ১', x: 52, y: 5, w: 18 }, { id: 'w2', label: 'Worker ২', x: 52, y: 17, w: 18 }, { id: 'w3', label: 'Worker ৩', x: 52, y: 29, w: 18 }, { id: 'o', label: 'ফল', x: 90, y: 17 }],
        links: [{ from: 'q', to: 'w1', rate: 1.8 }, { from: 'q', to: 'w2', rate: 1.8 }, { from: 'q', to: 'w3', rate: 1.8 }, { from: 'w1', to: 'o', rate: 1.8 }, { from: 'w2', to: 'o', rate: 1.8 }, { from: 'w3', to: 'o', rate: 1.8 }] },
      { title: 'জোড়া লাগানো', problem: 'টুকরোগুলো আলাদা আলাদা: user-এর কাছে একটা video চাই।', fix: 'সব মানের টুকরো মিলিয়ে নিয়ে ক্রম অনুযায়ী ম্যানিফেস্ট (তালিকা) বানানো। Player তালিকা ধরে একটার পর একটা টুকরো টানে।', cost: 'শেষ ধাপ সবাইকে অপেক্ষা করায়: একটা ধীর টুকরো সবাইকে আটকায়।',
        nodes: [{ id: 'p', label: 'সব টুকরো', x: 14, y: 17, w: 20 }, { id: 'm', label: 'Merger', x: 52, y: 17 }, { id: 'f', label: 'Manifest + টুকরো', sub: 'CDN-এ', x: 86, y: 17, w: 22 }],
        links: [{ from: 'p', to: 'm', rate: 2.4 }, { from: 'm', to: 'f', rate: 2.4 }] },
    ] },
    { kind: 'list', items: [
      'বাস্তবে পাইপলাইন একটা DAG (দিক-ওয়ালা, চক্রহীন গ্রাফ): কাজগুলো একটার পর একটা বা সমান্তরালে। যেমন: video ভাগ, audio আলাদা encode, thumbnail বানানো, watermark দেওয়া, আর সব শেষে জোড়া।',
      'আলাদা অংশ আলাদা করে বাড়ে: encode করতে CPU, সেই কাজের জন্য আলাদা worker pool।',
      'নিরাপত্তা: শুধু অনুমতিপ্রাপ্ত user-ই upload করবে (pre-signed URL); আর সরাসরি ছবি বা video নকল ঠেকাতে digital rights (DRM) বা watermark।',
    ] },

    { kind: 'h', text: 'Streaming: দেখার পথ' },
    { kind: 'p', text: 'Streaming মানে পুরো file নামিয়ে তবে চালানো নয়: টুকরো টুকরো নামাতে নামাতে চালানো। Player ধীর network দেখলে কম মানের টুকরো চায়, দ্রুত হলে বেশি মানের (adaptive bitrate)। এজন্য প্রোটোকল: Apple-এর HLS, আর DASH। দুটোই টুকরোর তালিকা ধরে HTTP-তে নামে।' },
    { kind: 'seq', label: 'Player ধীর network-এ মান নামিয়ে আনে', actors: ['Player', 'CDN'], steps: [
      { from: 0, to: 1, msg: 'manifest দাও: কোন মানে কোন টুকরো' },
      { from: 1, to: 0, msg: 'তালিকা: ৩৬০p, ৭২০p, ১০৮০p', tone: 'ok' },
      { from: 0, to: 1, msg: 'টুকরো ১, ৭২০p' },
      { from: 1, to: 0, msg: 'টুকরো ১ (৪ সেকেন্ডের)', tone: 'ok', note: 'Player নামানোর গতি মাপে।' },
      { from: 0, to: 1, msg: 'টুকরো ২, ৭২০p' },
      { from: 1, to: 0, msg: 'দেরি: network ধীর', tone: 'bad', note: 'চালানোর আগেই buffer ফুরোয় বুঝে।' },
      { from: 0, to: 1, msg: 'টুকরো ৩, এবার ৩৬০p', tone: 'ok', note: 'ছোট টুকরো, দ্রুত নামে। দেখা থামে না, শুধু মান একটু কমে।' },
    ] },

    { kind: 'h', text: 'CDN: কোন video কোথায়' },
    { kind: 'p', text: 'CDN মানে বিশ্বজুড়ে ছড়ানো server, user-এর কাছেরটা থেকে video আসে। দূরের server থেকে ধীর, আর বিদেশে দূরত্ব = দাম। কিন্তু সব video সব জায়গায় রাখা খরচের কাজ না। বেশির ভাগ video খুব কম দেখা হয়, আর হাতে গোনা কয়েকটা অসংখ্য বার।' },
    { kind: 'bars', label: 'কোথায় রাখবেন, দেখার ধরন অনুযায়ী', scale: 'stack', note: 'সংখ্যাগুলো ধারণা দেওয়ার মতো: বাস্তবে নির্ভর করে আপনার দেখার হিসাবের উপর।', items: [
      { label: 'জনপ্রিয় (অল্প video, বেশিরভাগ দেখা): CDN-এ', value: 20, show: '~২০% video → ~৮০% দেখা', tone: 'ok' },
      { label: 'মাঝামাঝি: আঞ্চলিক cache', value: 30, show: '~৩০%', tone: 'warn' },
      { label: 'বাকি (প্রায় কেউ দেখে না): সস্তা storage থেকে', value: 50, show: '~৫০%', tone: 'violet' },
    ] },
    { kind: 'list', items: [
      'কম দেখা video-র কম মানের কপি আর কম ধরন রাখা: সব ১০৮০p আর সব ধরনে নয়।',
      'সাধারণ নিয়ম: একই এলাকায় বেশি দেখা হয় এমন video সেই এলাকার CDN-এ; বাকি মূল storage থেকে।',
      'নিজে CDN বানানো খুব দামি; সাধারণত ভাড়া নেওয়া। ঠিক করতে হয় কতটা নিজের, কতটা ভাড়ার।',
    ] },

    { kind: 'h', text: 'ভুল সামলানো' },
    { kind: 'list', items: [
      'Upload-এ: ভাঙা chunk আবার পাঠানো; পুরো file নয়।',
      'Encode-এ: একটা worker মরলে তার টুকরো queue থেকে অন্য worker-কে। কাজ বারবার ব্যর্থ হলে alert।',
      'Streaming-এ: CDN-এর server ডাউন হলে অন্যটায়; player নিজেই আবার চেষ্টা।',
      'Metadata database: কপি রাখা (replica), পড়া অনেক বেশি তাই।',
    ] },

    { kind: 'story', title: 'সেলের video, ধীর network', steps: [
      'ParcelGo-র সেলের একটা পণ্য-video একটাই ১২০p মানে ছিল।',
      'গ্রামের ধীর network-এর customer চালাতে গিয়ে বারবার "buffering" দেখল।',
      'বেশিরভাগ গিয়ে video না দেখেই চলে গেল।',
    ], fix: 'একই video ৩৬০p, ৪৮০p, ৭২০p এই তিন মানে encode, আর adaptive streaming। Network বুঝে player নিজে মান বদলায়।' },

    { kind: 'mistakes', items: [
      'Upload-এর পরই video "প্রস্তুত" ধরে নেওয়া: encode বাকি।',
      'পুরো video একটা machine-এ encode করা।',
      'সব video সব জায়গায় CDN-এ রাখা: খরচ আকাশে।',
      'শুধু একটা মানে video রাখা।',
      'বড় file একটা request-এ পাঠানো।',
    ] },
    { kind: 'check', items: [
      { q: 'Video encode কেন লাগে?', a: 'Device আর network আলাদা। একই video নানা মান আর ধরনে বানাতে হয়, যাতে ধীর network-এ ছোট মান, দ্রুতটায় বড় মান চালানো যায়।' },
      { q: 'Encode দ্রুত করতে কী করেন?', a: 'Video ছোট টুকরোয় ভেঙে প্রতিটা আলাদা worker-এ সমান্তরালে encode, তারপর জোড়া। কাজ বিলি হয় queue দিয়ে।' },
      { q: 'Adaptive streaming কীভাবে কাজ করে?', a: 'Player টুকরোর তালিকা (manifest) নামায়, তারপর প্রতি টুকরো নামার গতি মেপে পরের টুকরো কোন মানে চাইবে ঠিক করে।' },
      { q: 'CDN-এ সব video রাখেন না কেন?', a: 'খরচ। অল্প জনপ্রিয় video-ই বেশিরভাগ দেখা হয়, তাই সেগুলোই CDN-এ; বাকি কম দামি storage থেকে।' },
    ] },
  ],
};
