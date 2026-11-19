import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 12 (Design A Chat System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-12',
  goals: [
    'Polling, long polling আর WebSocket-এর ফারাক বলতে পারবেন, আর কেন chat-এ WebSocket বলতে পারবেন।',
    'Stateful chat server আর stateless বাকি অংশ কেন আলাদা, আর সেই ভাগ কীভাবে চলে আঁকতে পারবেন।',
    'বার্তার ক্রম (message ID), অনেক device-এ সিঙ্ক আর online দেখানোর (heartbeat) উপায় বলতে পারবেন।',
  ],
  related: ['streams', 'replication', 'clocks'],
  blocks: [
    { kind: 'p', text: 'Chat মানে দ্রুত বার্তা: একজন লিখল, অন্যজন প্রায় সাথে সাথে দেখল। ParcelGo-র উদাহরণ: rider আর customer-এর মধ্যে বার্তা ("গেটে আছি"), আর rider-দের একটা group। সাধারণ web-এ client অনুরোধ করে, server উত্তর দেয়। Chat-এ উল্টো দরকার: server-কে নিজে থেকে client-কে খবর দিতে হয়। সেটাই এই অধ্যায়ের মূল অসুবিধা।' },
    { kind: 'list', items: [
      '১-১ chat আর group chat (ছোট group, ১০০ জন পর্যন্ত ধরুন)।',
      'Online দেখানো (presence), অনেক device-এ একই account, আর ছবি-ফাইল পাঠানো।',
      'Push notification: app বন্ধ থাকলেও খবর।',
      'বার্তা সংরক্ষণ: কত দিন, যাতে নতুন device-এও পুরোনো কথা দেখা যায়।',
    ] },

    { kind: 'h', text: 'বার্তা পাঠানো সহজ, পাওয়ানো কঠিন' },
    { kind: 'p', text: 'Sender-এর দিক সহজ: HTTP দিয়ে server-এ পাঠান। Receiver-কে নতুন বার্তা কীভাবে জানাবেন? তিনটা উপায়।' },
    { kind: 'seq', label: 'Receiver-এর কাছে বার্তা পৌঁছানোর তিন উপায়: polling', actors: ['Receiver', 'Server'], steps: [
      { from: 0, to: 1, msg: 'নতুন বার্তা আছে?' },
      { from: 1, to: 0, msg: 'না' },
      { from: 0, to: 1, msg: 'এখন?' },
      { from: 1, to: 0, msg: 'না', note: 'বেশিরভাগ প্রশ্নের উত্তর "না": অকারণ খরচ।' },
      { from: 0, to: 1, msg: 'এখন?' },
      { from: 1, to: 0, msg: 'হ্যাঁ, এই নাও', tone: 'ok', note: 'ফাঁকের ভেতরে এলে দেরি; ঘন ঘন জিজ্ঞেস করলে server-এ অকারণ ভিড়।' },
    ] },
    { kind: 'seq', label: 'Long polling: প্রশ্ন খোলা রাখে, বার্তা এলে উত্তর', actors: ['Receiver', 'Server'], steps: [
      { from: 0, to: 1, msg: 'নতুন বার্তা? (উত্তর না এলে ঝুলে থাকব)' },
      { from: 1, to: 1, msg: 'কিছু আসেনি, connection খোলা রাখি', note: 'সময় শেষ হলে খালি উত্তর, তারপর client আবার একই প্রশ্ন।' },
      { from: 1, to: 0, msg: 'বার্তা এসেছে: এই নাও', tone: 'ok' },
      { from: 0, to: 1, msg: 'আবার প্রশ্ন, নতুন connection', note: 'প্রতিবার নতুন connection; server কোন client কোন connection-এ জানে না; কোনো connection ধরে রাখতে হয়।' },
    ] },
    { kind: 'seq', label: 'WebSocket: একবার জোড়া লাগলে দুই দিকেই যখন খুশি', actors: ['Client', 'Server'], steps: [
      { from: 0, to: 1, msg: 'HTTP-তে অনুরোধ: "WebSocket-এ বদলাই?"', note: 'শুরুটা সাধারণ HTTP, তাই firewall-ও পেরোয়।' },
      { from: 1, to: 0, msg: 'রাজি। এখন থেকে খোলা সংযোগ', tone: 'ok' },
      { from: 0, to: 1, msg: 'আমার বার্তা: "গেটে আছি"' },
      { from: 1, to: 0, msg: 'ওর পাল্টা বার্তা: "আসছি"', tone: 'ok', note: 'Server নিজে থেকে পাঠাল, কেউ জিজ্ঞেস না করেই। একই connection-এ।' },
    ] },
    { kind: 'p', text: 'Chat-এ প্রায় সবাই WebSocket বাছে: দুই দিকে চলে, কম খরচ, তাৎক্ষণিক। দাম: connection খোলা থাকে, তাই server-কে মনে রাখতে হয় কোন client কোন connection-এ। বাকি সব সাধারণ কাজ (সাইন-আপ, group বানানো, profile) HTTP-তেই।' },

    { kind: 'h', text: 'নকশা: stateful আর stateless আলাদা' },
    { kind: 'flow', label: 'সাধারণ কাজ stateless HTTP-তে (নীল), চলমান কথা stateful chat server-এ (কমলা)', nodes: [
      { id: 'c', label: 'Client', x: 8, y: 17 },
      { id: 'lb', label: 'Load balancer', x: 30, y: 17, w: 20 },
      { id: 'api', label: 'API server', sub: 'login, group, profile', x: 62, y: 6, w: 22 },
      { id: 'ch', label: 'Chat server', sub: 'WebSocket, state আছে', x: 62, y: 28, w: 22, tone: 'hot' },
      { id: 'kv', label: 'Key-value store', sub: 'বার্তা', x: 92, y: 28, w: 16 },
      { id: 'sd', label: 'Service discovery', x: 92, y: 6, w: 16 },
    ], links: [
      { from: 'c', to: 'lb', rate: 4 },
      { from: 'lb', to: 'api', rate: 1.2, color: '#2f7de1' },
      { from: 'c', to: 'ch', rate: 3, secs: 1.1 },
      { from: 'ch', to: 'kv', rate: 2.2 },
      { from: 'api', to: 'sd', rate: 1 },
    ], h: 36 },
    { kind: 'list', items: [
      'Stateless অংশ (API): login, group, profile। Load balancer যেকোনো server-এ পাঠাতে পারে।',
      'Service discovery: সাইন-ইনের পর client-কে বলে দেয় কোন chat server-এ যাবে (কাছের, কম ভিড়ের)।',
      'Stateful chat server: প্রতিটা client-এর সাথে একটা WebSocket জুড়ে থাকে। ভাঙলে client অন্যটায় ঢুকে নেয়।',
      'বার্তা সংরক্ষণ: key-value store: খুব বেশি লেখা, আর সাম্প্রতিক বার্তাই বেশি পড়া হয় (দ্রুত খুঁজতে)।',
      'Presence server: কে online, কে নয়।',
    ] },
    { kind: 'calc', label: 'একটা chat server-এ কত connection', inputs: [
      { id: 'u', label: 'একসাথে online', min: 1, max: 100, step: 1, value: 10, unit: 'M' },
      { id: 'c', label: 'এক server-এ connection ধরে', min: 10, max: 1000, step: 10, value: 100, unit: 'হাজার' },
    ], out: (v) => {
      const servers = Math.ceil((v.u! * 1e6) / (v.c! * 1e3));
      return [
        { label: 'Chat server লাগবে', value: num(servers), how: `${num(v.u!)}M ÷ ${num(v.c!)}K`, bar: Math.min(1, servers / 1000) },
        { label: 'এক server বসলে', value: `${num(v.c!)}K user-কে আবার জুড়তে হবে`, tone: 'bad', how: 'সবাই একসাথে অন্য server-এ ঢুকবে: ঝড়' },
        { label: 'বাস্তবে', value: 'ধরুন ১০% বাড়তি', how: 'সীমার কাছাকাছি না চালানো; কিন্তু ভিড় আসলে ছড়ানোর জায়গা' },
      ];
    } },
    { kind: 'tip', title: 'Server-এর state নষ্ট করা সহজ নয়', text: 'একটা chat server বন্ধ করতে হলে (আপগ্রেড) হঠাৎ করলে হাজার হাজার user-এর connection ভাঙে। ধীরে ধীরে ফাঁকা করে (draining) তারপর বন্ধ।' },

    { kind: 'h', text: '১-১ বার্তার পথ' },
    { kind: 'seq', label: 'ক-র বার্তা খ-র কাছে: প্রথমে ID, তারপর পৌঁছানো', actors: ['ক (sender)', 'Chat server ১', 'ID generator', 'Message queue', 'Chat server ২', 'খ (receiver)'], steps: [
      { from: 0, to: 1, msg: '"গেটে আছি" খ-কে' },
      { from: 1, to: 2, msg: 'বার্তার ID দাও', note: 'ID বড় হতে হবে ক্রম ধরে। সময়ের ID (v1-7) বা প্রতি chat-এ আলাদা গণনা।' },
      { from: 2, to: 1, msg: 'ID = ১২০৫' },
      { from: 1, to: 3, msg: 'বার্তা queue-তে (খ-র inbox)', tone: 'ok', note: 'আগে সংরক্ষণ, তারপর পাঠানো, যাতে হারায় না।' },
      { from: 3, to: 4, msg: 'খ যে server-এ জুড়ে, সেখানে', note: 'খ কোন server-এ আছে তা জানা থাকে।' },
      { from: 4, to: 5, msg: 'WebSocket-এ পাঠাও', tone: 'ok' },
      { from: 3, to: 5, msg: 'খ offline হলে: push notification', note: 'App বন্ধ বা ফোন বন্ধ: বার্তা জমা থাকে, আর push পাঠায় (v1-10)।' },
    ] },
    { kind: 'p', text: 'সময়ের ক্রম ঠিক রাখতে বার্তার ID লাগে যা শুধু বাড়ে। দুটো বার্তার সময় ঘড়ি দিয়ে তুলনা বিপজ্জনক (দুই ফোনের ঘড়ি মেলে না), তাই server-এ ID দেওয়া হয়। ১-১ chat-এ ID শুধু সেই chat-এর মধ্যে বাড়লেই চলে, পুরো system-এ একই সংখ্যা-ধারা লাগে না।' },

    { kind: 'h', text: 'Group chat আর অনেক device' },
    { kind: 'list', items: [
      'ছোট group-এ: সদস্য প্রতিজনের inbox-এ একটা কপি। এতে পড়া সহজ, কিন্তু সদস্য বাড়লে লেখাও বাড়ে। তাই সীমা (যেমন ১০০ জন)।',
      'অনেক device: প্রতিটা device শেষ কোন বার্তা (ID) পর্যন্ত দেখেছে মনে রাখে। ফিরে এসে বলে "১২০০-এর পরেরগুলো দাও"। সবকিছু নতুন করে নেওয়ার দরকার নেই।',
      'একই account দুই ফোনে: দুটো WebSocket, দুটোতেই বার্তা পৌঁছায়।',
    ] },

    { kind: 'h', text: 'Online দেখানো' },
    { kind: 'seq', label: 'Heartbeat: "আমি আছি" ছোট ছোট সংকেত, বন্ধ হলে offline', actors: ['Client', 'Presence server', 'বন্ধুর app'], steps: [
      { from: 0, to: 1, msg: 'সাইন-ইন: আমি online', note: 'সংযোগ হতেই status বদলায়।' },
      { from: 1, to: 2, msg: 'ক online ✓', tone: 'ok', note: 'শুধু বন্ধু-তালিকার মানুষদের জানানো, সবাইকে নয়।' },
      { from: 0, to: 1, msg: 'heartbeat (প্রতি ৫ সেকেন্ডে)', note: 'ছোট একটা পিং: "এখনো আছি"।' },
      { from: 0, to: 1, msg: 'heartbeat' },
      { from: 0, to: 0, msg: 'ফোনের network গেল, আর heartbeat আসে না', tone: 'bad' },
      { from: 1, to: 2, msg: '৩০ সেকেন্ডে heartbeat না এলে: ক offline', tone: 'ok', note: 'এক-দুটো হারালেই offline নয় (network সামান্য কেঁপে যায়)। তাই কিছুক্ষণ অপেক্ষা।' },
    ] },
    { kind: 'p', text: 'Status বদলানো অতি জ্বালাতন হয় যদি একজন প্রতি মুহূর্তে online-offline হয় (সংযোগ কাঁপে)। সেজন্য heartbeat-এর সময়সীমার ভেতরে থাকলে offline দেখানো হয় না।' },

    { kind: 'story', title: 'Rider-এর ফোনের network কাঁপছিল', steps: [
      'Rider গলির ভেতর, network বারবার যায়-আসে।',
      'প্রথম নকশায় সংযোগ ভাঙলেই "offline" আর সব অপঠিত বার্তা হারিয়ে যেত।',
      'Customer লিখল "গেটে আসুন", rider দেখলই না, parcel ফেরত।',
    ], fix: 'বার্তা আগে সংরক্ষণ, তারপর পাঠানো। Rider ফিরে এলে শেষ-দেখা ID থেকে পরের সব বার্তা সিঙ্ক। আর heartbeat-এ কয়েক সেকেন্ডের ছাড়।' },

    { kind: 'mistakes', items: [
      'Polling দিয়ে chat বানানো: ঘন ঘন প্রশ্ন, কম দেরির দাবি, দুটোই নষ্ট।',
      'সব কিছু WebSocket-এ: সাধারণ কাজ stateless HTTP-তে থাকা উচিত।',
      'বার্তার ক্রম ঠিক করতে ফোনের ঘড়ি ধরা।',
      'Receiver offline থাকলে বার্তা ফেলে দেওয়া।',
      'এক heartbeat না এলেই offline দেখানো।',
    ] },
    { kind: 'check', items: [
      { q: 'Chat-এ WebSocket কেন, polling কেন না?', a: 'WebSocket একবার জুড়লে দুই দিকেই তাৎক্ষণিক বার্তা চলে, খরচ কম। Polling-এ বেশিরভাগ প্রশ্নের উত্তর "না" আর বার্তা আসতে দেরি।' },
      { q: 'কোন অংশ stateful, কোনটা stateless?', a: 'Chat server stateful (খোলা WebSocket)। Login, group, profile, API stateless: যেকোনো server-এ যেতে পারে।' },
      { q: 'বার্তার ক্রম কীভাবে ঠিক রাখেন?', a: 'Server-এ দেওয়া ID, যা শুধু বাড়ে (সময় বা chat-ভিত্তিক গণনা)। ডিভাইসের ঘড়ি নয়।' },
      { q: 'দ্বিতীয় device কীভাবে সিঙ্ক করে?', a: 'প্রতি device শেষ কোন বার্তা ID পর্যন্ত দেখেছে মনে রাখে, আর ফিরে এসে তার পরের বার্তা চায়।' },
      { q: 'Online-offline কীভাবে ঠিক হয়?', a: 'Heartbeat: নিয়মিত ছোট সংকেত। কিছুক্ষণ না এলে offline। সামান্য কাঁপা সহ্য করতে সময়সীমা।' },
    ] },
  ],
};
