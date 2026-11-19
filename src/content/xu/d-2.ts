import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 2 (Defining Nonfunctional Requirements), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-2',
  goals: [
    'Response time বলতে average নয়, percentile (p50, p99) ব্যবহার করতে আর কেন তা বলতে পারবেন।',
    'Reliability, scalability আর maintainability প্রতিটা কী মাপে, আর "99.9% available" মানে কত মিনিট বন্ধ তা হিসাব করতে পারবেন।',
    'Load কীভাবে বর্ণনা করবেন, আর scale করার তিন ধরনের architecture-এর তফাত বলতে পারবেন।',
  ],
  related: ['caching', 'sharding'],
  blocks: [
    { kind: 'p', text: '"App-টা ভালো চলবে" একটা বাক্য, requirement নয়। Requirement হলো: কত user, প্রতি request কত তাড়াতাড়ি, বছরে কতক্ষণ বন্ধ থাকা চলবে, বদলানো কত সহজ। এগুলোকে বলে nonfunctional requirement, কারণ app কী করে তা নয়, কেমন করে করে তা। অধ্যায়টা এগুলোকে সংখ্যায় বলার ভাষা শেখায়।' },

    { kind: 'h', text: 'উদাহরণ: social network-এর home timeline' },
    { kind: 'p', text: 'বইয়ের গোটা অধ্যায় একটা উদাহরণ ধরে চলে: কেউ post করলে তার follower-দের timeline-এ কীভাবে দেখাবেন। দুই উপায়: পড়ার সময় follow-করা সবার post খুঁজে জোড়া দেওয়া, অথবা post করার সময়ই প্রতি follower-এর timeline আগে থেকে বানিয়ে রাখা (materialize করা)। প্রথমটায় লেখা সস্তা, পড়া ভারী। দ্বিতীয়টায় পড়া সস্তা, লেখা ভারী, বিশেষ করে যার লাখ follower তার জন্য। কোনটা ঠিক, তা নির্ভর করে load-এর চেহারার উপর: পড়া বেশি না লেখা বেশি, আর কারও follower কতটা অসমান। এই কারণেই প্রথমে load বর্ণনা করতে শিখতে হয়।' },

    { kind: 'h', text: 'Performance: average নয়, percentile' },
    { kind: 'p', text: 'একই request বারবার পাঠালে প্রতিবার সময় আলাদা আসে। বেশিরভাগ দ্রুত, কিছু ধীর। এক সংখ্যায় বলতে গেলে average ধরার লোভ হয়, কিন্তু তা কোনো সত্যিকারের user-এর অভিজ্ঞতা নয়। Median (p50) বলে অর্ধেক user এর চেয়ে দ্রুত পায়। p99 বলে একশোর মধ্যে একজন এর চেয়ে ধীর পায়। Tail বলতে এই p99, p999-এর মতো দিকটাকেই বোঝায়।' },
    { kind: 'bars', label: 'একটা endpoint-এর ১০০টা request: কে কত সময় নিল', scale: 'linear', items: [
      { label: 'Median (p50)', value: 120, show: '১২০ ms', tone: 'ok' },
      { label: 'Average', value: 210, show: '২১০ ms', tone: 'warn' },
      { label: 'p95', value: 480, show: '৪৮০ ms', tone: 'warn' },
      { label: 'p99', value: 1900, show: '১,৯০০ ms', tone: 'bad' },
    ], note: 'নিরানব্বইটা request দ্রুত, একটা অনেক ধীর। Average সেই একটার টানে উপরে উঠল, অথচ তা কারও আসল অভিজ্ঞতা নয়।' },
    { kind: 'p', text: 'Tail কেন গুরুত্বপূর্ণ: যাদের request সবচেয়ে ধীর, তারা প্রায়ই সবচেয়ে বেশি data-র user (যেমন যার অনেক order)। আর এক পাতা বানাতে যদি অনেকগুলো backend call লাগে, একটাও ধীর হলে পুরো পাতা ধীর। তাতে ধীর হওয়ার সম্ভাবনা বেড়ে যায়। নিচে নিজে চালিয়ে দেখুন।' },
    { kind: 'calc', label: 'এক পাতায় N call: পাতা ধীর হওয়ার সম্ভাবনা', inputs: [
      { id: 'n', label: 'এক পাতা বানাতে backend call', min: 1, max: 100, step: 1, value: 20, unit: 'টা' },
      { id: 'slow', label: 'প্রতি call ধীর হওয়ার সম্ভাবনা', min: 0.1, max: 5, step: 0.1, value: 1, unit: '%' },
    ], out: (v) => {
      const p = 1 - Math.pow(1 - v.slow! / 100, v.n!);
      return [
        { label: 'পাতা ধীর হয়', value: `${num(Math.round(p * 1000) / 10)}%`, bar: p, tone: p > 0.15 ? 'bad' : 'ok', how: `১ − (১ − ${num(v.slow! / 100)})^${num(v.n!)}` },
        { label: 'প্রতি ১০০ বার পাতা খুললে ধীর', value: `${num(Math.round(p * 100))} বার`, how: 'এটা অনুমান: call-গুলো একে অন্যের উপর নির্ভর করে না ধরে' },
      ];
    } },
    { kind: 'tip', title: 'SLO লিখে রাখুন', text: 'Service level objective মানে লক্ষ্য: যেমন "p99 ৫০০ ms-এর নিচে, আর ৯৯.৯% request সফল"। এভাবে লিখলে বোঝা যায় কখন ঠিক আছে, কখন নয়। Average-ভিত্তিক লক্ষ্য ধীর user-দের লুকিয়ে ফেলে।' },

    { kind: 'h', text: 'Reliability: ভুল হবে ধরে নিয়ে' },
    { kind: 'p', text: 'Fault মানে একটা অংশ ঠিকমতো চলছে না। Failure মানে পুরো system user-কে সেবা দিতে পারছে না। Fault-tolerant system মানে এমন, যেখানে fault হলেও failure হয় না। Fault তিন দিক থেকে আসে।' },
    { kind: 'list', items: [
      'Hardware: disk নষ্ট, power যাওয়া, network cable খোলা। হাজার হাজার machine থাকলে প্রায় প্রতিদিন কিছু না কিছু নষ্ট হয়, তাই এটা নিয়মিত ঘটনা।',
      'Software: একই bug সব machine-এ একসাথে লাগে, তাই এগুলো বেশি বিপজ্জনক। একটা খারাপ deploy, কোনো এক তারিখে গোলমাল, একটা বিশেষ input-এ crash।',
      'মানুষ: সবচেয়ে বেশি outage আসে ভুল configuration আর ভুল operation থেকে। তাই মানুষের ভুল সহজে করা না যাওয়া, করলেও ফেরত নেওয়া যাওয়া, আর ছোট পরিসরে আগে চালিয়ে দেখা ভালো system-এর লক্ষণ।',
    ] },
    { kind: 'calc', label: '"কয়টা নাইন" মানে বছরে কত মিনিট বন্ধ', inputs: [
      { id: 'a', label: 'Availability', min: 90, max: 99.999, step: 0.001, value: 99.9, unit: '%', show: (x) => `${x.toFixed(3)}%` },
    ], out: (v) => {
      const down = (1 - v.a! / 100) * 365 * 24 * 60;
      return [
        { label: 'বছরে বন্ধ থাকা চলে', value: down >= 120 ? `${num(Math.round(down / 60))} ঘণ্টা` : `${num(Math.round(down))} মিনিট`, bar: Math.min(1, down / 5000), tone: down > 600 ? 'bad' : 'ok', how: `(১ − ${v.a!.toFixed(3)}/১০০) × ৩৬৫ × ২৪ × ৬০ মিনিট` },
        { label: 'মাসে গড়ে', value: `${num(Math.round(down / 12))} মিনিট`, how: 'মোট ÷ ১২' },
      ];
    } },

    { kind: 'h', text: 'Scalability: load বাড়লে কী হবে' },
    { kind: 'p', text: 'Scalability কোনো আছে-নেই গুণ নয়। প্রশ্নটা নির্দিষ্ট: "প্রতিদিনের order দশ গুণ হলে কোথায় ভাঙবে, আর তখন কী করব?" তার জন্য আগে load-এর সংখ্যা ঠিক করুন: প্রতি সেকেন্ডে request, একসাথে কত user, পড়া আর লেখার অনুপাত, সবচেয়ে বড় user-এর size। এই সংখ্যাগুলোকেই বলে load parameter।' },
    { kind: 'p', text: 'বাড়ানোর দুটো পথ: machine বড় করা (vertical), বা অনেক machine জোড়া (horizontal)। অনেক machine জোড়ার তিন ছাঁদ আছে।' },
    { kind: 'table', head: ['ছাঁদ', 'কে কী ভাগ করে নেয়', 'কেমন'], rows: [
      ['Shared-memory', 'সব CPU এক machine-এর memory আর disk', 'সবচেয়ে সরল, কিন্তু দাম বাড়ে হু হু করে, আর একটাই ভাঙার জায়গা'],
      ['Shared-disk', 'আলাদা machine, কিন্তু একই disk (network-এ)', 'Cloud storage-এ চেনা; locking-এর খরচ আর সীমা আছে'],
      ['Shared-nothing', 'প্রতিটা node-এর নিজের CPU, memory, disk', 'সবচেয়ে বেশি বাড়ানো যায়, সস্তা machine চলে; কিন্তু data ভাগ করা আপনার দায়িত্ব'],
    ] },
    { kind: 'flow', label: 'Shared-nothing: প্রতি node-এর নিজের data, load balancer ভাগ করে দেয়', nodes: [
      { id: 'u', label: 'User', x: 10, y: 17 },
      { id: 'lb', label: 'Router', x: 38, y: 17 },
      { id: 'n1', label: 'Node ক', sub: 'নিজের disk', x: 82, y: 6, w: 20 },
      { id: 'n2', label: 'Node খ', sub: 'নিজের disk', x: 82, y: 17, w: 20 },
      { id: 'n3', label: 'Node গ', sub: 'নিজের disk', x: 82, y: 28, w: 20 },
    ], links: [
      { from: 'u', to: 'lb', rate: 6 },
      { from: 'lb', to: 'n1', rate: 2 },
      { from: 'lb', to: 'n2', rate: 2 },
      { from: 'lb', to: 'n3', rate: 2 },
    ], h: 34 },
    { kind: 'p', text: 'নীতি: প্রতিটা সমস্যায় একই সমাধান খাটে না। যে system এক বছরে দশ গুণ হতে পারে তাকে নিয়মিত নতুন করে ভাবতে হয়। তবে খুব আগে থেকে অতিরিক্ত বানিয়ে রাখাও ক্ষতি: যে load আসবে কি না ঠিক নেই তার জন্য জটিলতা বানাবেন না। আজকের সবচেয়ে সম্ভাব্য load ধরুন, আর বদলানো সহজ রাখুন।' },

    { kind: 'h', text: 'Maintainability: বছর পরে কেউ হাত দিলে' },
    { kind: 'list', items: [
      'Operability: যারা চালান তাদের কাজ সহজ করা। কী হচ্ছে দেখা যায়, বদলানো নিরাপদ, ভাঙলে কী করতে হবে লেখা আছে।',
      'Simplicity: জটিলতা কমানো। বাড়তি জটিলতার লক্ষণ: অকারণ নির্ভরতার জট, একই কাজের তিন রকম উপায়, এক গোপন নিয়ম যা শুধু একজন জানে। ভালো abstraction জটিলতা লুকিয়ে সরল করে।',
      'Evolvability: বদলানো সহজ রাখা। চাহিদা সবসময় বদলায়, তাই system-ও বদলাতে পারা চাই। ছোট ছোট ধাপ, ভালো test, আর সরল গঠন এখানে সাহায্য করে।',
    ] },

    { kind: 'story', title: 'গড় ঠিক, তবু অভিযোগ', steps: [
      'ParcelGo-র dashboard বলছে গড় response ১৫০ ms, সব সবুজ।',
      'অথচ বড় merchant-রা (যাদের হাজার হাজার order) বলছেন পাতা খুলতে কয়েক সেকেন্ড লাগে।',
      'কারণ: তাদের request সবচেয়ে ভারী, তারা পড়ে p99-এর দিকে। গড় তাদের কথা লুকিয়ে রেখেছিল।',
    ], fix: 'Dashboard-এ p50, p95, p99 আলাদা দেখান, আর লক্ষ্য বসান p99-এ। ভারী user-দের জন্য আলাদা করে মাপুন।' },

    { kind: 'mistakes', items: [
      'Average response time দেখে সুস্থ ভাবা, tail না দেখে।',
      '"Scalable" বলে ছেড়ে দেওয়া, কীসের load কতগুণ হলে তা না বলে।',
      'Hardware ভাঙার কথা ভেবে মানুষের ভুল আর খারাপ deploy-কে ভুলে যাওয়া, অথচ বেশিরভাগ outage সেখান থেকেই আসে।',
      'আজ যে load নেই, তার জন্য এত জটিল system বানানো যে বদলানোই কঠিন।',
    ] },
    { kind: 'check', items: [
      { q: 'Average response time কেন ভরসাযোগ্য নয়?', a: 'এটা কোনো সত্যিকারের user-এর অভিজ্ঞতা বলে না, আর কয়েকটা অতি ধীর request তাকে টানে। Median আর p95, p99 দেখলে বোঝা যায় বেশিরভাগ আর সবচেয়ে ধীর user কেমন আছে।' },
      { q: 'এক পাতায় ২০টা backend call, প্রতিটার ১% ধীর হওয়ার সম্ভাবনা। পাতা ধীর হয় কতটা?', a: 'প্রায় ১৮%: ১ − ০.৯৯^২০ ≈ ০.১৮। প্রতি call-এর tail ছোট হলেও অনেক call জুড়লে পাতার tail বড় হয়।' },
      { q: '৯৯.৯% availability মানে বছরে কত বন্ধ?', a: 'প্রায় ৮ ঘণ্টা ৪৫ মিনিট (০.১% × ৩৬৫ দিন)। ৯৯.৯৯% হলে প্রায় ৫২ মিনিট।' },
      { q: 'Shared-nothing আর shared-memory-র মূল তফাত?', a: 'Shared-memory-তে সব CPU এক machine-এর memory-disk ভাগ করে, তাই বাড়ানোর সীমা আছে আর দাম বাড়ে দ্রুত। Shared-nothing-এ প্রতি node-এর নিজের সব, তাই অনেক বাড়ানো যায়, কিন্তু data ভাগ করার দায় আপনার।' },
    ] },
  ],
};
