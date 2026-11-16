import type { TrafficRules } from '@/simulators/traffic';
import type { TrafficLevel } from '../schema';

const scoring = { pointsPerParcel: 10, comboStep: 5, maxMultiplier: 3, happinessLossPerDrop: 12 };
const hubs = [
  { capacity: 6, serviceSeconds: 1.8 },
  { capacity: 6, serviceSeconds: 1.8 },
];
const travelSeconds = { approach: 2.2, branch: 1.3 };

const manual: TrafficRules = {
  durationSeconds: 30,
  spawnInterval: { start: 1.3, end: 0.9 },
  travelSeconds,
  hubs,
  outages: [{ hub: 1, downAt: 13, upAt: 20, warnBefore: 2 }],
  policy: 'manual',
  healthCheck: false,
  scoring,
};

/** Level ৩ · Traffic controller: one door, two hubs. Book: Vol 1, ch 1 (load balancer). */
export const level03: TrafficLevel = {
  id: 3,
  chapter: 1,
  slug: 'traffic-controller',
  title: 'Traffic controller',
  concept: 'Load balancer',
  estMinutes: 18,
  intro: {
    kicker: 'খেলা · ৩০ সেকেন্ড',
    heading: 'ভিড়ের সময়!',
    body: 'এখন আপনিই traffic controller। Hub-এ tap করলে lever সেদিকে ঘোরে, parcel সেদিকে যায়।',
    rules: [
      'একটা hub-এ একসাথে সর্বোচ্চ ৬টা parcel জমে, বেশি হলে উপচে পড়ে',
      'বন্ধ hub-এ পাঠালে parcel হারিয়ে যায়',
      'টানা ৫টা ঠিক পৌঁছালে নম্বর ×২, ১০টায় ×৩',
    ],
  },
  rounds: {
    demo: { ...manual, durationSeconds: null, outages: [], policy: 'roundRobin', healthCheck: true, spawnInterval: { start: 1.3, end: 1.3 } },
    manual,
    auto: {
      ...manual,
      durationSeconds: 18,
      spawnInterval: { start: 0.95, end: 0.95 },
      outages: [{ hub: 1, downAt: 6, upAt: 12, warnBefore: 2 }],
      policy: 'roundRobin',
      healthCheck: true,
    },
  },
  concepts: [
    { id: 'round-robin', label: 'Round robin', litAt: 0 },
    { id: 'health-check', label: 'Health check', litAt: 6 },
    { id: 'failover', label: 'Failover + retry', litAt: 6 },
  ],
  captions: {
    idle: 'পেছনে যেটা চলছে সেটা auto controller। আগে নিজে হাতে চেষ্টা করুন, তারপর বুঝবেন ওটা কেন দরকার।',
    manual: 'Hub-এ tap করে lever ঘোরান। কোনো hub-এ ৬টার বেশি জমতে দেবেন না।',
    manualHubDown: 'Hub ২ বন্ধ! এখন ওদিকে পাঠালে parcel হারাবে। Hub ১ একা কতটা টানতে পারে খেয়াল করুন।',
    manualHubBack: 'Hub ২ ফিরেছে। আবার দুই দিকে পালা করে ভাগ করুন।',
    autoStart: 'Round robin: controller নিজেই পালা করে পাঠাচ্ছে, ১, ২, ১, ২… Lever-টা দেখুন।',
    autoHubDown: 'Health check ব্যর্থ, তাই Hub ২ তালিকা থেকে বাদ (failover)। রাস্তায় থাকা parcel ঘুরে Hub ১-এ যাচ্ছে (retry)।',
    autoHubBack: 'Health check আবার পাস করেছে, Hub ২ নিজে থেকেই তালিকায় ফিরেছে। কাউকে কিছু করতে হয়নি।',
    afterManual: 'এইমাত্র হাতে যা করলেন (পালা করে ভাগ, বন্ধ hub এড়ানো), একটা load balancer সেটাই নিজে করে। এবার একই ভিড়ে auto controller বসিয়ে দেখুন।',
    afterAuto: 'একই ভিড়, একই বিগড়ে যাওয়া hub, কিন্তু কাউকে lever ধরতে হয়নি। পালা করে ভাগ, অসুস্থ hub বাদ, সুস্থ হলে ফেরত: এই তিনটাই load balancer-এর মূল।',
  },
};
