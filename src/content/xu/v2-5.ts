import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 5 (Metrics Monitoring and Alerting System), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-5',
  goals: [
    'Metric একটা time series: নাম, label আর (সময়, মান) জোড়া, আর কেন এটা সাধারণ SQL-এর চেয়ে আলাদা store চায় বলতে পারবেন।',
    'Pull বনাম push আর Kafka-র মাঝখানের বাফার, query আর alert-এর পথ আঁকতে পারবেন।',
    'Retention আর downsampling দিয়ে storage কীভাবে কমে, হিসাব করে দেখাতে পারবেন।',
  ],
  related: ['storage', 'streams'],
  blocks: [
    { kind: 'p', text: 'Metrics system পরিমাপ জমায়: CPU কত, প্রতি সেকেন্ডে কত request, কতগুলো 5xx। জমানো সংখ্যা থেকে আঁকে dashboard, আর কিছু ভুল হলে alert ডাকে: "মিনিটে ৫০০টা checkout ফেল"। ParcelGo-র উদাহরণ: প্রতি server, প্রতি hub-এর scanner আর প্রতি OTP-র সফল-ব্যর্থ। রাত দুটোয় যেন মানুষের আগে system নিজে জানায় কিছু ভাঙছে।' },
    { kind: 'list', items: [
      'বিশাল: ১০ কোটি metric, প্রতিটা নতুন সংখ্যা প্রতি কয়েক সেকেন্ডে।',
      'শুধু যোগ হয়: পুরোনো সংখ্যা বদলায় না। লেখা অসম্ভব বেশি, পড়া তুলনায় কম (কিন্তু ঝটপট দরকার)।',
      'নির্ভরযোগ্য: যে system অন্য সবাইকে দেখে, সে নিজে ডাউন থাকলে সবচেয়ে ক্ষতি।',
      'পুরোনো তথ্য: কয়েক সপ্তাহের বিস্তারিত, তারপর মোটামুটি।',
    ] },

    { kind: 'h', text: 'ডেটার ধরন: time series' },
    { kind: 'p', text: 'প্রতিটা metric মানে একটা নাম, কয়েকটা label (tag), আর (সময়, মান) জোড়ার তালিকা। যেমন: নাম "http_requests", label {server=web-3, status=500}, আর প্রতি ১০ সেকেন্ডে একটা সংখ্যা। Label-এর প্রতিটা আলাদা সংমিশ্রণ আলাদা একটা সিরিজ। অতিরিক্ত label (যেমন user ID) দিলে সিরিজ ফেটে বাড়ে।' },
    { kind: 'calc', label: 'অনুমান: কত ডেটা আর কত জায়গা', inputs: [
      { id: 'm', label: 'সিরিজ (metric × label)', min: 1, max: 500, step: 1, value: 100, unit: 'M' },
      { id: 'iv', label: 'কত সেকেন্ডে একবার', min: 1, max: 60, step: 1, value: 10 },
      { id: 'd', label: 'কত দিন রাখবেন', min: 1, max: 400, step: 1, value: 30 },
      { id: 'b', label: 'প্রতি সংখ্যা', min: 2, max: 16, step: 1, value: 8, unit: 'byte' },
    ], out: (v) => {
      const wps = (v.m! * 1e6) / v.iv!;
      const total = wps * 86400 * v.d! * v.b!;
      return [
        { label: 'লেখা প্রতি সেকেন্ডে', value: num(Math.round(wps)), how: `${num(v.m!)}M ÷ ${num(v.iv!)} সেকেন্ড`, bar: Math.min(1, wps / 50_000_000) },
        { label: `${num(v.d!)} দিনের storage (যেমন আছে তেমন)`, value: bytes(total), how: `${num(Math.round(wps))}/সেকেন্ড × ৮৬,৪০০ × ${num(v.d!)} × ${num(v.b!)} byte`, tone: 'bad' },
        { label: 'সংকুচিত (সংখ্যা কাছাকাছি, ~১০ গুণ কমে)', value: bytes(total / 10), how: 'পরপর সংখ্যার ফারাক ছোট, তাই time series ভালো সংকুচিত হয়', tone: 'ok' },
      ];
    } },
    { kind: 'tip', title: 'সাধারণ database কেন নয়', text: 'প্রতি সেকেন্ডে কোটি লেখা আর "গত এক ঘণ্টার গড়" ধরনের query: সাধারণ relational database এতে কষ্ট পায়। Time series database (InfluxDB, Prometheus-ধাঁচের) এই কাজের জন্য বানানো: সময় ধরে সাজানো, লেখা দ্রুত, সংকোচন ভালো।' },

    { kind: 'h', text: 'সার্বিক পথ' },
    { kind: 'flow', label: 'সংগ্রহ → বাফার (Kafka) → জমা → query/alert/dashboard', nodes: [
      { id: 'src', label: 'সব server, service', sub: 'metric উৎস', x: 10, y: 17, w: 20 },
      { id: 'col', label: 'Collector', x: 34, y: 17, w: 16 },
      { id: 'kf', label: 'Kafka', sub: 'বাফার', x: 56, y: 17, w: 14 },
      { id: 'cs', label: 'Consumer', x: 76, y: 6, w: 14 },
      { id: 'tsdb', label: 'Time series DB', x: 92, y: 17, w: 18 },
      { id: 'q', label: 'Query service', x: 76, y: 29, w: 18 },
    ], links: [
      { from: 'src', to: 'col', rate: 4 }, { from: 'col', to: 'kf', rate: 4 }, { from: 'kf', to: 'cs', rate: 3.5 }, { from: 'cs', to: 'tsdb', rate: 3.5 }, { from: 'q', to: 'tsdb', rate: 1.2, color: '#2f7de1' },
    ], h: 36 },
    { kind: 'list', items: [
      'Metrics source: যারা সংখ্যা দেয়: server, database, load balancer।',
      'Collector: সংখ্যা তুলে এনে বাফারে।',
      'Kafka (v2-4): লেখা আর জমানোর মাঝখানের বাফার। Time series DB ধীর বা ডাউন হলেও সংখ্যা হারায় না, আর collector আর DB আলাদা করে বাড়ে।',
      'Time series DB: সময়-ধরে-সাজানো store, label দিয়ে খোঁজা।',
      'Query service: dashboard আর alert-এর জন্য একই API।',
      'Alert manager: নিয়ম মেলালে ডাকে। Visualization: Grafana-ধাঁচের ছবি।',
    ] },

    { kind: 'h', text: 'Pull বনাম push' },
    { kind: 'table', head: ['', 'Pull (collector গিয়ে তোলে)', 'Push (service নিজে পাঠায়)'], rows: [
      ['কীভাবে', 'Collector প্রতি ১০ সেকেন্ডে প্রতিটা service-এর /metrics URL ডাকে', 'প্রতিটা service সংখ্যা collector-এ পাঠায়'],
      ['কে কাকে খোঁজে', 'Collector service-এর তালিকা জানে (service discovery)', 'Service collector-এর ঠিকানা জানে'],
      ['Service মরলে', 'সহজে বোঝা যায়: উত্তর আসেনি', 'বোঝা কঠিন: সংখ্যা না এলে মরল না চুপ?'],
      ['ক্ষণস্থায়ী কাজ (batch)', 'কঠিন, বেঁচে থাকে না তোলার মতো', 'ভালো: মরার আগে পাঠিয়ে যায়'],
      ['Firewall', 'ভেতরে ঢোকার পথ লাগে', 'বাইরে যাওয়া সহজ'],
      ['বড় করা', 'Collector-কে ভাগ করে (consistent hashing): কে কোন সার্ভার তোলে', 'Collector-এর সামনে load balancer, বা autoscale'],
    ] },
    { kind: 'p', text: 'দুই পথই বাস্তবে চলে। কোনটা ভালো এই নিয়ে তর্ক চলে; interview-এ দুটোর দাম বলতে পারাই মূল।' },

    { kind: 'h', text: 'Alert: ভুল ডাকা ঠেকানো' },
    { kind: 'seq', label: 'Alert নিয়ম: "মিনিটে ৫০০-র বেশি checkout ফেল, ৫ মিনিট ধরে"', actors: ['Rule engine', 'Query service', 'Alert manager', 'অন-কল ইঞ্জিনিয়ার'], steps: [
      { from: 0, to: 1, msg: 'নিয়ম চালাও: গত ১ মিনিটে checkout ফেল কত?' },
      { from: 1, to: 0, msg: '৬২০ (সীমা ৫০০)', tone: 'bad' },
      { from: 0, to: 0, msg: 'সীমা পেরিয়েছে, কিন্তু অপেক্ষা: ৫ মিনিট ধরে থাকতে হবে', note: '"for" সময়: এক মুহূর্তের কাঁপুনিতে ডাকা নয়।' },
      { from: 0, to: 1, msg: '৫ মিনিট পরে আবার: ৫৮০' },
      { from: 0, to: 2, msg: 'আগুন: checkout ফেল', tone: 'bad' },
      { from: 2, to: 2, msg: 'একই রকম alert জুড়ে একটা করো, আর একই সমস্যায় বারবার না', note: 'Dedupe আর group: একটা কারণে ৫০টা server-এর alert = ১টা বার্তা।' },
      { from: 2, to: 3, msg: 'SMS + push + email, আর কেউ না দেখলে পরের জনকে', tone: 'ok', note: 'On-call roster: প্রথমজন সাড়া না দিলে দ্বিতীয়জন।' },
    ] },
    { kind: 'list', items: [
      'Alert-এর নিয়ম config ফাইলে (YAML), version-এ।',
      'বেশি alert = কেউ আর পড়ে না (alert fatigue)। তাই শুধু যা মানুষ এখনই করতে পারে, তাই alert; বাকি dashboard-এ।',
      'Alert পাঠানো শেষ না হওয়া পর্যন্ত নিয়ম ধরে রাখা; আর alert manager নিজেও কপি রাখে (একটা ডাউন হলে সব নিস্তব্ধ না হয়)।',
      'নিজের monitoring-কে monitor করার কথাও ভাবুন: "monitoring চলছে কিনা" জানার আলাদা পথ।',
    ] },

    { kind: 'h', text: 'পুরোনো তথ্য: কম বিস্তারিত' },
    { kind: 'bars', label: 'একই metric, বয়স বাড়লে কম বিস্তারিত (downsampling): প্রতি সংখ্যা কত সেকেন্ডের গড়', scale: 'log', note: 'পুরোনো সংখ্যা কেউ সেকেন্ডে সেকেন্ডে দেখে না। ৩০ দিনের পরে ১ মিনিটের গড়, ১ বছরের পরে ১ ঘণ্টার: জায়গা কয়েক গুণ কমে।', items: [
      { label: 'শেষ ৭ দিন: মূল সংখ্যা', value: 10, show: '১০ সেকেন্ড', tone: 'ok' },
      { label: '৭–৩০ দিন', value: 60, show: '১ মিনিট', tone: 'warn' },
      { label: '৩০–৩৬৫ দিন', value: 3600, show: '১ ঘণ্টা', tone: 'violet' },
    ] },

    { kind: 'story', title: 'এক label-এ সিরিজ বিস্ফোরণ', steps: [
      'কেউ ParcelGo-র request metric-এ "user_id" label জুড়ে দিল, ডিবাগের জন্য।',
      'প্রতিটা user আলাদা সিরিজ: লাখ লাখ নতুন সিরিজ রাতারাতি।',
      'Time series DB-র memory ফুরাল; পুরো monitoring অচল, আর তখনই আসল বিপদ এল।',
    ], fix: 'Label-এ কম মানের তালিকা (status, region), user ID বা order ID কখনো না। সিরিজ সংখ্যার সীমা দেওয়া, আর সীমা ছাড়ালে নতুন সিরিজ ফেলে alert।' },

    { kind: 'mistakes', items: [
      'Metrics সাধারণ relational database-এ রাখা।',
      'Collector থেকে সরাসরি database-এ, মাঝে বাফার ছাড়া।',
      'Alert-এ "for" সময় না দেওয়া: এক ঝলকেই ডাক।',
      'High-cardinality label (user ID, order ID)।',
      'সব পুরোনো ডেটা পূর্ণ বিস্তারিতে চিরকাল রাখা।',
    ] },
    { kind: 'check', items: [
      { q: 'Time series কী?', a: 'একটা metric (নাম আর label) আর তার (সময়, মান) জোড়ার তালিকা। শুধু যোগ হয়, সময় ধরে সাজানো।' },
      { q: 'Collector আর DB-র মাঝে Kafka কেন?', a: 'বাফার: DB ধীর বা ডাউন হলেও সংখ্যা হারায় না। আর দুই দিক আলাদা করে বাড়ে।' },
      { q: 'Pull ও push-এর মূল ফারাক?', a: 'Pull-এ collector গিয়ে তোলে: service মরলে সহজে বোঝা যায়। Push-এ service পাঠায়: ক্ষণস্থায়ী কাজের জন্য ভালো।' },
      { q: 'Alert-এ ভুল ডাক কীভাবে কমান?', a: 'সীমা অনেকক্ষণ ধরে পেরোলে তবেই (for সময়), একই কারণের alert জুড়ে একটা, আর শুধু যেটা মানুষ এখনই করতে পারে।' },
    ] },
  ],
};
