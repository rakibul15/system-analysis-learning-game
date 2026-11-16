/**
 * Incident mode: a production alert fires, the player reads the dashboard and logs,
 * then makes three calls: where to look, what the cause is, what to do.
 * As everywhere else in the content, the first option is the right one; the UI shuffles.
 */
export interface Series { label: string; unit: string; values: number[]; bad?: boolean }
export interface Stage { prompt: string; options: [string, string, string, string]; explain: string }
export interface Incident {
  id: string;
  title: string;
  level: number;
  severity: 'SEV-1' | 'SEV-2';
  alert: string;
  series: Series[];
  logs: string[];
  stages: [Stage, Stage, Stage];
}

import { isEn } from '@/shared/lib/i18n';
import { enIncidents } from './incidents.en';

const t = (...v: number[]) => v;

const bnIncidents: Incident[] = [
  {
    id: 'stampede', title: 'সকাল ৯টার ধস', level: 2, severity: 'SEV-1',
    alert: '০৯:০০ থেকে product page-এর p99 latency ৮ সেকেন্ড, database CPU ১০০%।',
    series: [
      { label: 'Cache hit rate', unit: '%', values: t(94, 95, 94, 95, 3, 8, 21, 40, 61, 80, 90, 93), bad: true },
      { label: 'DB CPU', unit: '%', values: t(32, 30, 33, 31, 100, 100, 99, 95, 80, 60, 41, 35), bad: true },
      { label: 'Request / সে.', unit: '', values: t(900, 920, 910, 950, 960, 940, 930, 950, 940, 960, 950, 945) },
    ],
    logs: ['08:59:58 cache-warmer: loaded 50,000 product keys, ttl=3600s', '09:00:00 db: active connections 2000/2000', '09:00:01 api: timeout reading product 18842 from db', '07:59:58 cache-warmer: loaded 50,000 product keys, ttl=3600s'],
    stages: [
      { prompt: 'Traffic বাড়েনি, তবু DB ভেঙে পড়ল। আগে কোন graph-টা ধরবেন?', options: ['Cache hit rate, ঠিক ৯টায় হঠাৎ পড়ে গেছে', 'Request / সে., traffic কতটা বেড়েছে', 'DB CPU, কোন query সবচেয়ে ধীর', 'API server-এর memory ব্যবহার'], explain: 'Traffic সমান, অথচ DB-র চাপ হঠাৎ: মানে request-গুলো আর cache-এ আটকাচ্ছে না।' },
      { prompt: 'Log দেখে মূল কারণ কী?', options: ['সব key একসাথে একই TTL-এ ঢুকেছিল, একসাথে মেয়াদ শেষ', 'Cache server ৯টায় restart হয়ে সব data হারিয়েছে', 'কেউ ৯টায় সব product-এর দাম একসাথে বদলেছে', 'DB-তে একটা দরকারি index রাতে মুছে গেছে'], explain: 'Warmer প্রতি ঘণ্টায় ৫০ হাজার key একই ttl দিয়ে ভরে। এক সেকেন্ডে সব মেয়াদ শেষ, সব request একসাথে DB-তে: cache stampede।' },
      { prompt: 'আবার যেন না হয়, সবচেয়ে ভালো সমাধান?', options: ['TTL-এ এলোমেলো jitter, আর একই key-র miss একটা DB read-এ', 'TTL বাড়িয়ে ২৪ ঘণ্টা করা, যাতে miss কম হয়', 'DB-র connection limit দ্বিগুণ করে চাপ সামলানো', 'Cache warmer বন্ধ করে সব user-এর হাতে ছেড়ে দেওয়া'], explain: 'Jitter মেয়াদ ছড়িয়ে দেয়; request coalescing একই key-র হাজারটা miss-কে একটা DB read বানায়।' },
    ],
  },
  {
    id: 'hotshard', title: 'এক shard-এর জ্বর', level: 5, severity: 'SEV-2',
    alert: 'Order database-এর shard-3 CPU ৯৫%, বাকি সাত shard ২০%-এর নিচে।',
    series: [
      { label: 'shard-3 CPU', unit: '%', values: t(25, 30, 48, 70, 88, 95, 96, 95, 94, 96, 95, 95), bad: true },
      { label: 'বাকি shard-এর গড় CPU', unit: '%', values: t(22, 21, 20, 19, 20, 18, 19, 20, 19, 18, 19, 20) },
      { label: 'মোট order / সে.', unit: '', values: t(400, 420, 610, 800, 950, 990, 1000, 980, 990, 1010, 1000, 995) },
    ],
    logs: ['11:02 marketing: flash sale started for merchant_id=777 (Mega Mart)', 'shard-router: merchant_id=777 → shard-3', '11:05 shard-3: slow query: INSERT INTO orders ... merchant_id=777'],
    stages: [
      { prompt: 'মোট traffic বেড়েছে, কিন্তু শুধু একটা shard কষ্টে। প্রথম প্রশ্ন কী?', options: ['বাড়তি order কোন key-তে যাচ্ছে, shard-এর ভাগ কীসের ওপর?', 'Shard-3-এর disk কতটা ভরা, জায়গা ফুরোচ্ছে কি না?', 'বাকি shard-গুলো এত অলস কেন, কাজ পাচ্ছে না কেন?', 'Network-এর bandwidth কত, কোথাও আটকাচ্ছে কি না?'], explain: 'Sharding key যদি একটা জিনিসে জমে যায়, সেই shard একাই সব ভার নেয়।' },
      { prompt: 'কারণ কী?', options: ['এক merchant-এর flash sale; shard key merchant_id, তাই এক shard-এ', 'Shard-3-এর hardware দুর্বল, তাই অল্পতেই হাঁপায়', 'Consistent hashing-এর ring ভেঙে সব এক জায়গায় জমেছে', 'Replica পিছিয়ে পড়ায় primary-তে বাড়তি চাপ পড়ছে'], explain: 'Hot key: Mega Mart-এর সব order merchant_id=777 দিয়ে shard-3-এ।' },
      { prompt: 'দীর্ঘমেয়াদে কী করবেন?', options: ['বড় merchant-এর key-তে salt দিয়ে কয়েক shard-এ ছড়ানো', 'Shard-3-কে আরও বড় আর দামি machine দেওয়া', 'Flash sale চলাকালীন নতুন order নেওয়া বন্ধ রাখা', 'সব shard মিলিয়ে আবার একটা বড় database বানানো'], explain: 'Key-র ভাগ ছড়ালে ভারও ছড়ায়; শুধু বড় machine পরের বড় sale-এ আবার ভাঙবে।' },
    ],
  },
  {
    id: 'leakylimit', title: 'Limit পার হয়ে গেল', level: 4, severity: 'SEV-2',
    alert: 'একটা bot merchant API-তে মিনিটে ৩,০০০ request পাঠাচ্ছে, অথচ limit ১,০০০।',
    series: [
      { label: 'Bot-এর সফল request / মিনিট', unit: '', values: t(990, 1000, 995, 2000, 2010, 2990, 3000, 2995, 3000, 3010, 2990, 3000), bad: true },
      { label: 'API server সংখ্যা', unit: '', values: t(1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3) },
      { label: '429 উত্তর / মিনিট', unit: '', values: t(400, 410, 405, 50, 40, 0, 0, 0, 0, 0, 0, 0) },
    ],
    logs: ['autoscaler: api replicas 1 → 2', 'autoscaler: api replicas 2 → 3', 'ratelimiter: using in-process counter (map size 1,204)'],
    stages: [
      { prompt: 'কোন দুটো graph একসাথে নড়ছে?', options: ['Server সংখ্যা আর bot-এর সফল request, একই ধাপে বাড়ছে', '429 আর server-এর সংখ্যা, দুটোই একসাথে বাড়ছে', 'Bot-এর request বাড়লে DB latency-ও সাথে বাড়ছে', 'কোনো দুটো graph-ই একসাথে ওঠানামা করছে না'], explain: 'প্রতিটা নতুন server-এ bot আরও ১,০০০ পাচ্ছে।' },
      { prompt: 'কেন?', options: ['প্রতিটা server নিজের memory-তে আলাদা counter রাখে', 'Token bucket-এর refill হার config-এ অনেক বেশি', 'Bot প্রতি মিনিটে নতুন IP থেকে request পাঠাচ্ছে', 'Limit-এর config ভুল করে ৩,০০০ লেখা হয়েছে'], explain: 'In-process counter: তিনটা server মানে তিনটা আলাদা বালতি।' },
      { prompt: 'ঠিক করবেন কীভাবে?', options: ['Counter ভাগাভাগি করা store-এ (Redis), atomic বাড়ানো', 'Autoscaling বন্ধ করে চিরকাল একটা server রাখা', 'Limit-কে server-এর সংখ্যা দিয়ে ভাগ করে বসানো', 'Bot-এর IP firewall-এ block করে দেওয়া'], explain: 'Central counter-এ সব server একই হিসাব দেখে; atomic increment race আটকায়।' },
    ],
  },
  {
    id: 'doublesms', title: 'দুবার SMS', level: 10, severity: 'SEV-2',
    alert: 'Customer support-এ অভিযোগ: "parcel আসছে" SMS দুবার করে আসছে।',
    series: [
      { label: 'SMS provider timeout', unit: '%', values: t(1, 1, 2, 9, 14, 15, 13, 14, 12, 3, 2, 1), bad: true },
      { label: 'পাঠানো SMS / order', unit: '', values: t(1, 1, 1, 1.3, 1.5, 1.5, 1.4, 1.5, 1.4, 1.1, 1, 1), bad: true },
      { label: 'Queue-র দৈর্ঘ্য', unit: '', values: t(20, 25, 22, 40, 60, 55, 50, 48, 40, 30, 22, 20) },
    ],
    logs: ['worker-2: send sms msg=8812 → timeout after 3s, retrying', 'provider callback: msg=8812 delivered (attempt 1)', 'provider callback: msg=8812 delivered (attempt 2)'],
    stages: [
      { prompt: 'কোন সংখ্যা SMS দুবার যাওয়ার সাথে মেলে?', options: ['Provider timeout বাড়ার সময়েই SMS/order বেড়েছে', 'Queue-র দৈর্ঘ্য বাড়ার সময় SMS/order বেড়েছে', 'Order-এর সংখ্যা বাড়ার সাথে SMS/order বেড়েছে', 'Worker-এর CPU বাড়ার সময় SMS/order বেড়েছে'], explain: 'Timeout যত, বাড়তি SMS তত।' },
      { prompt: 'Log থেকে কারণ?', options: ['Timeout মানে ব্যর্থ নয়: SMS গেছে, retry আবার পাঠিয়েছে', 'দুটো worker একই message একসাথে queue থেকে নিয়েছে', 'Customer-এর account-এ দুটো phone নম্বর রাখা আছে', 'Provider নিজের নিয়মে প্রতিটা SMS দুবার পাঠায়'], explain: 'attempt 1-ও delivered: timeout-এর পর retry-তে একই SMS আবার।' },
      { prompt: 'সমাধান?', options: ['প্রতিটা message-এ idempotency key, আগে দেখা হলে বাদ', 'Retry পুরো বন্ধ করে একবারেই পাঠানোর চেষ্টা', 'Timeout ৩ থেকে বাড়িয়ে ৩০ সেকেন্ড করে দেওয়া', 'অন্য একটা SMS provider-এ পুরোপুরি চলে যাওয়া'], explain: 'Retry রাখুন (না হলে হারাবে), কিন্তু একই id দ্বিতীয়বার না যায়।' },
    ],
  },
  {
    id: 'replicalag', title: 'পুরনো ঠিকানা', level: 6, severity: 'SEV-2',
    alert: 'Customer ঠিকানা বদলে save করছে, কিন্তু পরের page-এ পুরনো ঠিকানা দেখছে।',
    series: [
      { label: 'Replica lag', unit: 'সে.', values: t(0.2, 0.3, 0.2, 2, 6, 8, 8, 7, 8, 6, 3, 0.4), bad: true },
      { label: 'Primary write / সে.', unit: '', values: t(300, 310, 320, 900, 1500, 1600, 1550, 1500, 1520, 1100, 600, 320) },
      { label: 'Read / সে.', unit: '', values: t(5000, 5100, 5050, 5200, 5100, 5000, 5100, 5050, 5100, 5000, 5050, 5100) },
    ],
    logs: ['batch-job: re-indexing 2M orders (started 14:00)', 'api: GET /me/address → replica-2', 'api: PUT /me/address → primary'],
    stages: [
      { prompt: 'কোন graph সমস্যার সাথে মেলে?', options: ['Replica lag, কয়েক সেকেন্ডে উঠে গেছে', 'Read / সে., যেটা হঠাৎ অনেক বেড়ে গেছে', 'Primary-র CPU, যেটা পুরো ভরে আছে', 'Error rate, যেটা ধীরে ধীরে বাড়ছে'], explain: 'Write primary-তে, read replica-তে; replica ৮ সেকেন্ড পিছিয়ে।' },
      { prompt: 'Lag কেন বাড়ল?', options: ['Batch job primary-তে প্রচুর write করছে, replica পিছিয়ে', 'Read বেড়ে যাওয়ায় replica-গুলো সামলাতে পারছে না', 'Customer ভুল করে দুবার save চাপছে বারবার', 'Cache-এ পুরনো ঠিকানা আটকে আছে, মুছছে না'], explain: 'Write পাঁচ গুণ, ঠিক batch job-এর সময়।' },
      { prompt: 'Customer-এর অভিজ্ঞতা ঠিক করার সবচেয়ে সরাসরি উপায়?', options: ['Write-এর পর কিছুক্ষণ সেই user-এর read primary থেকে', 'এখন থেকে সব user-এর সব read primary থেকে', 'Replica-গুলো বন্ধ করে শুধু primary চালানো', 'Batch job রাতে সরিয়ে দেওয়া, আর কিছু না করা'], explain: 'নিজের লেখা নিজে দেখার নিশ্চয়তা; batch job সরানোও ভালো, কিন্তু lag আবার আসবে।' },
    ],
  },
  {
    id: 'poison', title: 'আটকে যাওয়া queue', level: 19, severity: 'SEV-1',
    alert: 'Order event consumer-এর lag ২ লাখ ছাড়াল, merchant dashboard ৪০ মিনিট পিছিয়ে।',
    series: [
      { label: 'Consumer lag', unit: '', values: t(50, 60, 4000, 20000, 60000, 110000, 160000, 200000, 210000, 215000, 220000, 230000), bad: true },
      { label: 'Consumer restart', unit: '', values: t(0, 0, 3, 9, 12, 12, 11, 12, 12, 12, 12, 12), bad: true },
      { label: 'Produce / সে.', unit: '', values: t(800, 820, 810, 800, 790, 810, 800, 805, 800, 810, 800, 805) },
    ],
    logs: ['consumer-1: processing offset 9918231', 'consumer-1: panic: invalid utf-8 in field "note"', 'consumer-1: restarting… resuming at offset 9918231'],
    stages: [
      { prompt: 'Produce স্বাভাবিক। কোন graph আসল সূত্র?', options: ['Consumer বারবার restart হচ্ছে', 'Produce / সে. হঠাৎ বেড়ে গেছে', 'Broker-এর disk প্রায় ভরে গেছে', 'Network latency অনেক বেড়েছে'], explain: 'Lag বাড়ছে কারণ consumer এগোতেই পারছে না।' },
      { prompt: 'কারণ?', options: ['একটা খারাপ message বারবার crash করাচ্ছে, একই offset-এ', 'Partition খুব কম, তাই consumer ভাগ পাচ্ছে না', 'Producer consumer-এর চেয়ে অনেক দ্রুত পাঠাচ্ছে', 'Broker চুপচাপ কিছু message হারিয়ে ফেলছে'], explain: 'একই offset 9918231-এ বারবার panic: poison message।' },
      { prompt: 'সমাধান?', options: ['কয়েকবার ব্যর্থ হলে message dead-letter queue-তে সরানো', 'আরও consumer যোগ করে lag তাড়াতাড়ি কমানো', 'পুরো queue খালি করে নতুন করে শুরু করা', 'Retention কমিয়ে পুরনো message মুছে ফেলা'], explain: 'DLQ পরে দেখা যায়, বাকি লাখো message আটকে থাকে না।' },
    ],
  },
  {
    id: 'doublecharge', title: 'টাকা দুবার কাটল', level: 26, severity: 'SEV-1',
    alert: '৩৮ জন customer বলছে delivery fee দুবার কাটা হয়েছে।',
    series: [
      { label: 'Mobile network error', unit: '%', values: t(1, 1, 1, 7, 9, 8, 2, 1, 1, 1, 1, 1), bad: true },
      { label: 'Charge / order', unit: '', values: t(1, 1, 1, 1.06, 1.09, 1.08, 1.01, 1, 1, 1, 1, 1), bad: true },
      { label: 'PSP latency', unit: 'ms', values: t(300, 310, 320, 330, 320, 310, 300, 310, 300, 320, 310, 300) },
    ],
    logs: ['app: POST /pay order=55120 → network error, retrying', 'payment-svc: charge created order=55120 psp_id=ch_91', 'payment-svc: charge created order=55120 psp_id=ch_92'],
    stages: [
      { prompt: 'কোন সংখ্যা দুবার কাটার সাথে মেলে?', options: ['Mobile network error বাড়ার সময় charge/order বেড়েছে', 'PSP latency বাড়ার সময় charge/order বেড়েছে', 'Order সংখ্যা বাড়ার সাথে charge/order বেড়েছে', 'Server CPU বাড়ার সময় charge/order বেড়েছে'], explain: 'Network খারাপ হলেই বাড়তি charge।' },
      { prompt: 'কারণ?', options: ['উত্তর হারালে app retry করে, server নতুন charge ভাবে', 'PSP নিজের ভুলে একই payment দুবার কাটে', 'Customer অধৈর্য হয়ে pay বোতাম দুবার চেপেছে', 'Database-এ একই order-এর duplicate row আছে'], explain: 'একই order-এ দুটো আলাদা psp_id: server জানেই না এটা একই চেষ্টা।' },
      { prompt: 'সমাধান?', options: ['App প্রতিটা payment-এ idempotency key পাঠাবে', 'Network খারাপ হলে retry পুরো বন্ধ রাখা', 'Network দুর্বল হলে pay বোতাম বন্ধ', 'দিনের শেষে বাড়তি টাকা হিসাব করে ফেরত'], explain: 'Idempotency key retry-কে নিরাপদ করে।' },
    ],
  },
  {
    id: 'clockskew', title: 'একই ID দুবার', level: 7, severity: 'SEV-1',
    alert: 'Order insert ব্যর্থ: "duplicate key orders_pkey", শুধু id-server-4 থেকে।',
    series: [
      { label: 'Duplicate key error', unit: '', values: t(0, 0, 0, 0, 37, 12, 0, 0, 0, 0, 0, 0), bad: true },
      { label: 'id-server-4 clock offset', unit: 'ms', values: t(0, 0, 0, 0, -800, -400, 0, 0, 0, 0, 0, 0), bad: true },
      { label: 'Order / সে.', unit: '', values: t(500, 510, 505, 500, 498, 502, 500, 505, 500, 510, 500, 505) },
    ],
    logs: ['ntpd(id-server-4): step time -0.812s', 'id-server-4: generated 1845521098817536 (again)', 'db: duplicate key value violates unique constraint "orders_pkey"'],
    stages: [
      { prompt: 'কোন দুটো জিনিস একসাথে ঘটেছে?', options: ['id-server-4-এর ঘড়ি পিছিয়েছে, ঠিক তখনই duplicate', 'Order বাড়ার সাথে সাথেই duplicate দেখা দিয়েছে', 'Database ধীর হওয়ার সময় duplicate এসেছে', 'সব id server-এ একসাথে error দেখা দিয়েছে'], explain: 'Clock offset −৮০০ ms, ঠিক সেই মিনিটে duplicate।' },
      { prompt: 'Snowflake-এ কেন duplicate হল?', options: ['ID শুরু হয় timestamp দিয়ে; ঘড়ি পিছোলে আগের ms ফেরে', 'দুটো server-এ ভুল করে একই machine id বসানো', 'এক ms-এ ১২ bit-এর sequence ফুরিয়ে গেছে', 'Database-এর unique index-এ একটা bug আছে'], explain: 'একই timestamp + একই machine + sequence ০ থেকে = আগের ID।' },
      { prompt: 'সমাধান?', options: ['ঘড়ি পিছোলে আগের timestamp পার না হওয়া পর্যন্ত থামা', 'Machine id-র bit বাড়িয়ে আরও জায়গা করা', 'ID থেকে timestamp অংশটা পুরো বাদ দেওয়া', 'Duplicate হলে চুপচাপ আবার insert করা'], explain: 'Generator শেষ timestamp মনে রাখে; ঘড়ি পিছোলে অপেক্ষা বা error, কখনো পুরনো সময়ে ID নয়।' },
    ],
  },
];

/** The incidents in the current language. */
export const incidents: Incident[] = isEn ? enIncidents : bnIncidents;
