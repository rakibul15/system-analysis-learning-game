import type { Note } from './types';

/** Written for ParcelGo in our own words; see the books for the full treatment. */
export const consensus: Note = {
  id: 'consensus',
  title: 'Linearizability আর consensus: সবাই একমত',
  gist: 'অনেক machine থাকলেও যেন একটাই কপি আছে মনে হয়, আর এক leader, এক মালিক, এক ক্রমে সবাই একমত হয়।',
  levels: [7, 27, 28],
  angles: {
    xu: 'Wallet-এ Raft দিয়ে event log-এর কপি, exchange-এ এক ক্রমে সব order, ID generator',
    ddia: 'Linearizable মানে ঠিক কী, তার দাম (CAP), logical clock, আর consensus কোন কোন সমস্যার একই চেহারা',
  },
  blocks: [
    { kind: 'h', text: 'Linearizable: যেন একটাই কপি' },
    { kind: 'p', text: 'Customer দেখল "Delivered", পাশে বসা merchant একই মুহূর্তে refresh দিয়ে দেখল "পথে আছে"। প্রতিটা replica নিজের মতো ঠিক, কিন্তু একসাথে দেখলে অদ্ভুত। Linearizable system কথা দেয়: কোনো একজন নতুন মান দেখলে, তার পরে যে-ই পড়ুক, নতুনটাই দেখবে। যেন data-র একটাই কপি।' },
    { kind: 'figs', book: 'ddia2', chapter: 10, items: [
      { n: '10-1', page: 403, look: 'একজন নতুন ফল জানে, পাশের জন পুরনো দেখে' },
      { n: '10-3', page: 405, look: 'একবার নতুন মান দেখা গেলে পরের সব পড়ায় নতুন' },
    ] },
    { kind: 'h', text: 'কোথায় সত্যিই লাগে' },
    { kind: 'list', items: [
      'Leader election আর lock: দুজন যেন একসাথে নিজেকে মালিক না ভাবে।',
      'Unique নিয়ম: একই username বা একই slot দুজন যেন না পায়।',
      'দুই channel-এর দৌড়: ছবি upload হলো, তারপর queue-তে "resize করো" গেল; resize worker যেন পুরনো ছবি না পায়।',
    ] },
    { kind: 'h', text: 'দাম: network ভাঙলে বেছে নিতে হয়' },
    { kind: 'p', text: 'ঢাকা আর চট্টগ্রাম data center-এর মাঝের যোগাযোগ কাটা গেল। Linearizable থাকতে চাইলে যে পাশ majority পায় না সে লেখা বন্ধ রাখবে (unavailable)। চালু রাখতে চাইলে দুই পাশ আলাদা লিখবে, পরে মেলাতে হবে। এটাই CAP-এর আসল কথা: partition হলে consistency আর availability-র মধ্যে একটা।' },
    { kind: 'figs', book: 'ddia2', chapter: 10, items: [
      { n: '10-7', page: 414, look: 'Network কাটা গেলে: চালু থাকা না একমত থাকা' },
    ] },

    { kind: 'h', text: 'ক্রম: ঘড়ি ছাড়া কে আগে' },
    { kind: 'p', text: 'Lamport timestamp: প্রতিটা node একটা counter রাখে, প্রতিটা কাজে বাড়ায়, আর অন্যের বার্তায় বড় counter দেখলে নিজেরটা সেখানে তুলে নেয়। ফলে কারণের আগে ফল কখনো আসে না। কিন্তু শুধু এতে "এই মুহূর্তে username খালি কিনা" বলা যায় না, কারণ এখনো না-দেখা কোনো node-এর লেখা ছোট নম্বরে থাকতে পারে। সেটার জন্য consensus লাগে।' },
    { kind: 'figs', book: 'ddia2', chapter: 10, items: [
      { n: '10-8', page: 418, look: 'এক জায়গা থেকে ক্রমিক ID দেওয়া' },
      { n: '10-9', page: 421, look: 'Lamport timestamp: counter আর node নম্বর দিয়ে ক্রম' },
    ] },
    { kind: 'says', topic: 'অনন্য আর ক্রমিক ID',
      xu: { text: 'চার পথ পাশাপাশি: multi-master auto-increment, UUID, ticket server, আর snowflake। প্রতিটার দুর্বলতা: ক্রম না থাকা, single point, বা ঘড়ির ওপর নির্ভরতা।', ref: { book: 'xu1', chapter: 7 } },
      ddia: { text: 'ID generator-কে consistency-র চোখে দেখা: কোনটা শুধু অনন্য, কোনটা কারণ-ক্রম রাখে (logical clock), আর কোনটা linearizable; এবং প্রতিটার দাম।', ref: { book: 'ddia2', chapter: 10, section: 'ID Generators and Logical Clocks', pages: [417, 424] } } },

    { kind: 'h', text: 'Consensus: majority মিলে একটা সিদ্ধান্ত' },
    { kind: 'p', text: 'Raft-এর মতো algorithm-এ একজন leader log-এ লেখা নেয়, follower-দের পাঠায়, majority পেলে তবেই commit। Leader মরলে বাকিরা ভোট দিয়ে নতুন leader বাছে; শুধু সবচেয়ে হালনাগাদ log-ওয়ালা প্রার্থী জিততে পারে। ৫টা node-এ ২টা হারালেও চলে।' },
    { kind: 'tip', title: 'একই সমস্যার অনেক চেহারা', text: 'Leader বাছা, lock দেওয়া, unique নিয়ম রক্ষা, atomic commit, সব বার্তা এক ক্রমে সবার কাছে পৌঁছানো: এগুলো আসলে একই সমস্যা। তাই নিজে বানাবেন না; ZooKeeper, etcd বা DB-র ভেতরের consensus ব্যবহার করুন।' },
    { kind: 'says', topic: 'টাকা আর order-এ এক ক্রম',
      xu: { text: 'Wallet-এ সেকেন্ডে লাখো লেনদেনের জন্য partition, প্রতিটা partition-এর event log Raft দিয়ে কয়েক node-এ কপি; exchange-এ matching engine এক ক্রমে সব order চালায়, আর standby একই ক্রম আবার চালিয়ে একই অবস্থায় থাকে।', ref: { book: 'xu2', chapter: 12 } },
      ddia: { text: 'Consensus-এর নানা চেহারা কেন একই, বাস্তবে Raft/Paxos-এর মতো algorithm কী দেয় আর কী দেয় না, আর coordination service কোন কাজে।', ref: { book: 'ddia2', chapter: 10, section: 'Consensus', pages: [425, 439] } } },

    { kind: 'h', text: 'Interview-এ যেভাবে বলবেন' },
    { kind: 'list', items: [
      '"Payout lock-এর জন্য etcd বা ZooKeeper, নিজের lock বানাব না; সাথে fencing token।"',
      '"Wallet partition প্রতি event log, Raft দিয়ে ৩ বা ৫ কপি; majority পেলে commit।"',
      '"Network ভাঙলে টাকার দিকে consistency বাছব; tracking page একটু পুরনো দেখালে চলবে।"',
    ] },
    { kind: 'mistakes', items: [
      'Quorum (W + R > N) থাকলেই linearizable ভাবা: সময়ের মারপ্যাঁচে তবু পুরনো মান আসতে পারে।',
      'দুই node-এর cluster-এ consensus: একটা গেলে majority নেই। বিজোড় সংখ্যা রাখুন।',
      'সব data-কে linearizable করা: দেরি আর দাম অকারণে বাড়ে।',
    ] },
    { kind: 'check', items: [
      { q: '৫ node-এর Raft-এ কয়টা হারিয়েও চলে?', a: '২টা; majority ৩ থাকলেই চলে।' },
      { q: 'Lamport timestamp কোন প্রশ্নের উত্তর দেয় না?', a: '"এই মুহূর্তে এটা অনন্য কিনা" (যেমন username খালি কিনা), কারণ না-দেখা লেখা থাকতে পারে।' },
      { q: 'Network partition-এ টাকার system কোনটা বাছবে?', a: 'Consistency: যে পাশ majority পায় না, সে লেখা বন্ধ রাখবে।' },
    ] },
  ],
  chapters: [
    { book: 'ddia2', chapter: 10, pages: [401, 450] },
    { book: 'xu1', chapter: 7 },
    { book: 'xu2', chapter: 12 },
  ],
  refs: [
    { book: 'xu1', chapter: 7 },
    { book: 'xu2', chapter: 12 },
    { book: 'xu2', chapter: 13 },
    { book: 'ddia2', chapter: 10, section: 'Linearizability', pages: [402, 416] },
    { book: 'ddia2', chapter: 10, section: 'The Cost of Linearizability', pages: [413, 416] },
    { book: 'ddia2', chapter: 10, section: 'Logical Clocks', pages: [420, 422] },
    { book: 'ddia2', chapter: 10, section: 'Consensus', pages: [425, 439] },
  ],
};
