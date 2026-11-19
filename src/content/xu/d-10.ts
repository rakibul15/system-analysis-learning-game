import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 10 (Consistency and Consensus), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-10',
  goals: [
    'Linearizability মানে কী, কোথায় দরকার (lock, unique নাম, leader নির্বাচন), আর তার দাম কী বলতে পারবেন।',
    'Lamport timestamp কীভাবে ঘড়ি ছাড়া ক্রম দেয়, আর তা কেন linearizable ID-র জন্য যথেষ্ট নয় ব্যাখ্যা করতে পারবেন।',
    'Consensus কী সমস্যা মেটায়, কতগুলো node ভাঙলে চলে, আর ZooKeeper-ধরনের coordination service কেন আছে বলতে পারবেন।',
  ],
  related: ['consensus', 'clocks'],
  blocks: [
    { kind: 'p', text: 'আগের অধ্যায়ে দেখা গেল সব কিছু ভাঙতে পারে। এখন প্রশ্ন: তবু কীভাবে system-কে এমন দেখানো যায়, যেন data একটাই, আর সবাই একমত? এর দুটো মূল ধারণা আছে: linearizability (একটা কপির ভান) আর consensus (সবাইকে এক সিদ্ধান্তে আনা)। দুটোই দামি, তাই কোথায় লাগে তা জানাই শিল্প।' },

    { kind: 'h', text: 'Linearizability' },
    { kind: 'p', text: 'Replica অনেক থাকলেও system এমন আচরণ করে যেন data-র কপি মাত্র একটা, আর প্রতিটা পরিবর্তন এক মুহূর্তে (atomically) ঘটে। নিয়মটা: কোনো পড়া যদি একবার নতুন মান দেখে ফেলে, তার পরে শুরু হওয়া কোনো পড়া আর পুরোনো মান দেখতে পারবে না, তা যে client-ই পড়ুক। অর্থাৎ নতুন মান একবার দৃশ্যমান হলে সবার কাছে।' },
    { kind: 'seq', label: 'Linearizable নয়: একজন নতুন দেখল, পরে আরেকজন পুরোনো', actors: ['Rider', 'Replica ১ (নতুন)', 'Replica ২ (পিছিয়ে)', 'Customer'], steps: [
      { from: 0, to: 1, msg: 'parcel = "ডেলিভারড" লিখলাম' },
      { from: 1, to: 0, msg: 'হয়েছে', tone: 'ok' },
      { from: 3, to: 1, msg: 'অবস্থা কী?' },
      { from: 1, to: 3, msg: 'ডেলিভারড', tone: 'ok', note: 'Customer নতুন মান দেখল।' },
      { from: 3, to: 2, msg: 'পাতা রিফ্রেশ: অবস্থা কী?' },
      { from: 2, to: 3, msg: 'পথে', tone: 'bad', note: 'একবার ডেলিভারড দেখার পরে আবার "পথে": সময়ে পিছিয়ে গেল। Linearizable system এমন কখনো করে না।' },
    ] },
    { kind: 'p', text: 'এটা read-your-writes-এর চেয়েও কড়া: কোনো একজন client-এর অভিজ্ঞতা নয়, পুরো system-এর সময়ক্রম। Linearizable আর serializable ভিন্ন: প্রথমটা একক জিনিসের সাম্প্রতিকতা, দ্বিতীয়টা অনেক জিনিস জুড়ে transaction-এর isolation।' },

    { kind: 'h', text: 'কোথায় লাগে' },
    { kind: 'list', items: [
      'Lock আর leader নির্বাচন: "কে leader" নিয়ে দুজন ভিন্ন উত্তর পেলে split brain। সবাই একই উত্তর দেখা চাই।',
      'Uniqueness constraint: দুজন এক ইউজারনেম বা এক সিটে booking নিতে পারবে না। নিশ্চিত করতে একজনকেই "জয়ী" ঘোষণা হতে হয়।',
      'দুই channel-এর সমন্বয়: যেমন ছবি আপলোড হলো object storage-এ, আর নামটা গেল বার্তায়; যদি ছবিটা পৌঁছানোর আগে বার্তা এসে যায়, কর্মী পাবে না। এখানে ক্রমের গ্যারান্টি দরকার।',
    ] },
    { kind: 'h', text: 'কীভাবে বানায় আর দাম' },
    { kind: 'list', items: [
      'Single-leader: সব পড়া-লেখা leader-এ, তা linearizable হতে পারে, শর্ত leader সত্যিই leader (consensus লাগে)। আর follower থেকে পড়লে নয়।',
      'Consensus algorithm (Raft, Paxos): নিচে। এগুলো linearizable storage দেয়।',
      'Multi-leader: না, কারণ দুই leader একই সময়ে বদলাতে পারে।',
      'Leaderless quorum: শুধু quorum হলেও নিশ্চিত নয়: দেরি আর ঘড়ির গোলমালে ক্রম ভাঙে।',
    ] },
    { kind: 'p', text: 'দাম: প্রতি পড়া-লেখায় সমন্বয় লাগে, তাই ধীর। আর নেটওয়ার্ক ভাগ (partition) হলে linearizable system-কে বেছে নিতে হয়: হয় সেবা বন্ধ (কম অংশটা সাড়া দেয় না), নয় linearizable গ্যারান্টি ছেড়ে দেওয়া। এটাই CAP-এর সারকথা, তবে বইয়ের মতে CAP-এর কথা খুব সংকীর্ণ: শুধু নেটওয়ার্ক ভাগ হলেই খাটে, আর তা ছাড়াও linearizable system ধীর, কারণ সমন্বয়ের নিজস্ব দেরি আছে। অনেক system তাই কঠোর গ্যারান্টি ছেড়ে গতি বেছে নেয়।' },

    { kind: 'h', text: 'ID আর logical clock' },
    { kind: 'p', text: 'ঘড়ি ভরসাযোগ্য নয়, তবু ঘটনার ক্রম দরকার। Logical clock ঘড়ির সময় নয়, শুধু ক্রম রাখে। Lamport timestamp: প্রতিটা node একটা counter রাখে। ঘটনা ঘটলে counter বাড়ে। বার্তা পাঠানোর সময় counter সংযুক্ত করে। যে পায় সে নিজের counter-কে max(নিজের, পাওয়া) করে তারপর এক বাড়ায়। এতে কারণ-ফল সম্পর্ক সবসময় বজায় থাকে: কিছু ঘটনা অন্যটার কারণ হলে তার সংখ্যা ছোট।' },
    { kind: 'seq', label: 'Lamport timestamp: দুই node, ঘড়ি ছাড়া ক্রম', actors: ['Node ক', 'Node খ'], steps: [
      { from: 0, to: 0, msg: 'ঘটনা: counter = ১' },
      { from: 0, to: 1, msg: 'বার্তা পাঠাল (counter = ২)', note: 'বার্তার সাথে সংখ্যা চলে।' },
      { from: 1, to: 1, msg: 'খ-র নিজের counter ছিল ০; পেল ২: max(০, ২) + ১ = ৩', tone: 'ok', note: 'এখন "খ-র ঘটনা" ক-এর পরের, সংখ্যাতেই ধরা আছে।' },
      { from: 1, to: 0, msg: 'উত্তর (counter = ৪)' },
      { from: 0, to: 0, msg: 'ক: max(২, ৪) + ১ = ৫', tone: 'ok' },
    ] },
    { kind: 'p', text: 'সীমা: Lamport timestamp শুধু শেষে ক্রম ঠিক করে, ঘটনার সময়ে নয়। যেমন ইউজারনেম বেছে নেওয়ার সময় দুজন একসাথে চাইলে দুজনেই ভাবে সে প্রথম; timestamp তুলনা করে পরে জানা যায় কে জিতেছে, কিন্তু তখন অনেক দেরি। যদি এখনই জানতে হয় (linearizable), সবার সাথে সমন্বয় লাগে। কারণ ছাড়া ঘটনাগুলোর (concurrent) ক্রম Lamport-এ মনগড়া। Hybrid logical clock সামান্য বাস্তব সময় আর counter মিলিয়ে নেয়, যাতে সংখ্যা সময়ের কাছাকাছিও থাকে।' },
    { kind: 'tip', title: 'Linearizable ID', text: 'এমন counter যা কখনো পিছায় না আর সবাই একই ক্রম দেখে। এক জায়গায় একটা counter রাখুন যা consensus দিয়ে সুরক্ষিত, আর batch করে ID দিন (এক-এক করে নয়, ১,০০০ ID-র ঘর একবারে নিয়ে নিজের কাছে বিলি করুন), যাতে প্রতিবার সমন্বয় না লাগে। শুধু বাড়তি সংখ্যা হলে চলবে, ফাঁক চলবে, কিন্তু ক্রম ঠিক চাইলে ব্যাচ ঠিক রাখতে হয়।' },

    { kind: 'h', text: 'Consensus' },
    { kind: 'p', text: 'Consensus মানে কয়েকটা node একটা মানে একমত হওয়া, যদিও কেউ ভাঙতে পারে বা বার্তা দেরি হতে পারে। চারটা গ্যারান্টি: একটা মানই বাছাই হয় (uniform agreement), কেউ বদলায় না (integrity), যে সিদ্ধান্ত নেয় সে বৈধ প্রস্তাব থেকেই (validity), আর সব ভালো node শেষে সিদ্ধান্ত নেবে (termination)। শেষটা হলো জীবন্ততা: সংখ্যাগরিষ্ঠ node বেঁচে থাকলেই চলবে।' },
    { kind: 'calc', label: 'কতগুলো node ভাঙলেও consensus চলে', inputs: [
      { id: 'n', label: 'মোট node', min: 1, max: 15, step: 1, value: 5 },
    ], out: (v) => {
      const maj = Math.floor(v.n! / 2) + 1;
      const f = v.n! - maj;
      return [
        { label: 'সংখ্যাগরিষ্ঠ (quorum) লাগে', value: `${num(maj)}টা`, bar: maj / v.n!, how: `⌊${num(v.n!)} ÷ ২⌋ + ১` },
        { label: 'ভাঙা সইতে পারে', value: `${num(f)}টা`, bar: f / v.n!, tone: f >= 1 ? 'ok' : 'bad', how: `${num(v.n!)} − ${num(maj)}` },
        { label: 'বেজোড় কেন ভালো', value: v.n! % 2 === 1 ? 'বেজোড়: ঠিক আছে' : `জোড়: ${num(v.n! - 1)} হলেও একই ${num(f)}টা সহ্য`, tone: v.n! % 2 === 1 ? 'ok' : 'bad', how: 'একটা node বাড়িয়ে জোড় করলে সহনশীলতা বাড়ে না, শুধু খরচ' },
      ];
    } },
    { kind: 'list', items: [
      'Raft, Paxos, Zab, Viewstamped Replication: কাজের কথা একই, "term" বা "epoch" নামের নির্বাচনী সংখ্যায় একজন leader বেছে নেয় আর তার প্রস্তাব সংখ্যাগরিষ্ঠ মেনে নিলে সিদ্ধান্ত পাকা।',
      'Leader বদলের সময়ও কোরাম: নতুন leader হতে হলে সংখ্যাগরিষ্ঠের ভোট; আর leader-এর প্রতিটা সিদ্ধান্ত সংখ্যাগরিষ্ঠের স্বীকৃতিতে। দুই কোরামের অন্তত একটা সদস্য মিলে যায়, তাই পুরোনো সিদ্ধান্ত হারায় না।',
      'Consensus থেকে সব পাওয়া যায়: linearizable storage, atomic commit, total order broadcast (সবাই একই ক্রমে বার্তা পায়), দুই-পক্ষের lock।',
      'সীমা: কঠোর সংখ্যাগরিষ্ঠ লাগে বলে ছোট ভাগ কাজ করে না, আর নেটওয়ার্ক-ঘটিত timeout-এ বারবার leader নির্বাচন হলে ধীর।',
    ] },
    { kind: 'h', text: 'Coordination service' },
    { kind: 'p', text: 'Consensus নিজে বানানো কঠিন। তাই ZooKeeper আর etcd-র মতো ছোট একটা cluster সবার হয়ে consensus চালায়, আর বাইরের system-কে সরল API দেয়: key-value, lock, নজর রাখা (watch), ephemeral node (client মরলে মুছে যায়)। বড় system এগুলো দিয়ে শুধু দরকারি জিনিস সামলায়: কে leader, কোন shard কোন node-এ, কে জীবিত। বড় data এখানে নয়।' },

    { kind: 'story', title: 'দুই "প্রধান" worker', steps: [
      'ParcelGo-র রাতের batch job চালাতে একটা worker "প্রধান" থাকা দরকার। দুটো worker নিজেরা ঘড়ি দেখে ঠিক করত কে আগে ছিল।',
      'একটার ঘড়ি ৩ সেকেন্ড পিছিয়ে ছিল। দুজনেই ভাবল সে-ই প্রধান, আর দুজনেই একই job চালাল।',
      'দ্বিগুণ SMS চলে গেল গ্রাহকদের কাছে।',
    ], fix: 'প্রধান বাছাই consensus-ভিত্তিক coordination service-এ রাখুন: যে lock বা lease পাবে সে প্রধান, আর কাজের সময় fencing token। নিজেদের ঘড়ির ওপর ভরসা নয়।' },

    { kind: 'mistakes', items: [
      'Linearizable আর serializable গুলিয়ে ফেলা: একটা জিনিসের সাম্প্রতিকতা বনাম transaction-এর isolation।',
      'সব জায়গায় linearizable চাওয়া। দামি, তাই লাগে শুধু lock, uniqueness আর leader নির্বাচনের মতো জায়গায়।',
      'Lamport timestamp-কে বাস্তব সময় ভাবা, বা ভাবা যে তা এখনই জানাতে পারে কে আগে।',
      'জোড় সংখ্যক node-এর consensus cluster: একটা node বাড়ানোতে ভাঙা-সহ্য বাড়ে না।',
    ] },
    { kind: 'check', items: [
      { q: 'Linearizable system-এর মূল নিয়ম কী?', a: 'কোনো পড়া একবার নতুন মান দেখলে, তার পরে শুরু হওয়া কোনো পড়া (যে-ই পড়ুক) আর পুরোনো মান দেখতে পারবে না। system যেন একটা কপির মতো আচরণ করে।' },
      { q: 'Linearizability কোথায় অপরিহার্য?', a: 'Lock আর leader নির্বাচন, uniqueness নিশ্চিত করা (ইউজারনেম, সিট), আর দুই পথে আসা তথ্যের ক্রম মেলানোর মতো জায়গায়।' },
      { q: '৫টা node-এর consensus cluster কয়টা ভাঙা সইতে পারে? আর ৬টা হলে?', a: '৫-এ ২টা (সংখ্যাগরিষ্ঠ ৩)। ৬-এ সংখ্যাগরিষ্ঠ ৪, তাই আবার ২টা; একটা বাড়ল, কিন্তু সহনশীলতা বাড়ল না।' },
      { q: 'Lamport timestamp কী দেয়, কী দেয় না?', a: 'দেয়: কারণ-ফল মেনে ক্রম, ঘড়ি ছাড়াই। দেয় না: বাস্তব সময়, আর ঘটনার মুহূর্তে সবার মধ্যে কে প্রথম তা, তার জন্য সমন্বয় লাগে।' },
    ] },
  ],
};
