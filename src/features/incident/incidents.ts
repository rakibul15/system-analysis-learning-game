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
  /** A simulator to try the fix in, opened after the postmortem. */
  fix?: SimulatorId;
}

import { isEn } from '@/shared/lib/i18n';
import type { SimulatorId } from '@/content/schema';
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
  {
    id: 'retrystorm', title: 'থামতে না পারা ঝড়', level: 29, severity: 'SEV-1', fix: 'retrystorm',
    alert: 'Payment provider ৩০ সেকেন্ড বন্ধ ছিল, ১০ মিনিট আগে ঠিক হয়েছে। তবু payment service এখনো ডুবে আছে, ৮০% checkout ব্যর্থ।',
    series: [
      { label: 'Payment-এ request / সে.', unit: '', values: t(1000, 1020, 2900, 8800, 9100, 9000, 9200, 8900, 9100, 9000, 9050, 9100), bad: true },
      { label: 'Provider error rate', unit: '%', values: t(1, 1, 100, 2, 1, 1, 1, 1, 1, 1, 1, 1) },
      { label: 'Checkout সফল', unit: '%', values: t(99, 99, 10, 15, 18, 20, 19, 20, 21, 19, 20, 20), bad: true },
    ],
    logs: ['10:01:30 provider: 503 Service Unavailable (30s)', '10:02:00 provider: recovered', 'gateway: retry=3 backoff=none', 'order-service: retry=3 backoff=none', 'payment-service: retry=3 on provider timeout', '10:12:00 payment-service: thread pool 400/400, queue 52,000'],
    stages: [
      { prompt: 'Provider ঠিক হয়ে গেছে, তবু ঝড় থামছে না। আগে কোন graph ধরবেন?', options: ['Payment-এ request, স্বাভাবিকের ৯ গুণ হয়ে আছে', 'Provider error rate, এখনো কত বেশি আছে', 'Checkout সফল, কোন সময় থেকে কমেছে', 'Payment server-এর memory আর GC-র সময়'], explain: 'User বাড়েনি, অথচ payment-এ ৯ গুণ request: এই বাড়তি request কেউ বানাচ্ছে।' },
      { prompt: 'Log দেখে মূল কারণ কী?', options: ['তিন layer-এ ৩টা করে retry, চাপ গুণ হয়ে ফিরছে', 'Provider পুরো ঠিক হয়নি, মাঝে মাঝে পড়ছে', 'Campaign-এর জন্য হঠাৎ অনেক নতুন user এসেছে', 'Payment service-এর নতুন deploy-এ একটা bug'], explain: 'প্রতিটা layer নিজে retry করে: সবচেয়ে খারাপে ৪ × ৪ × ৪ = ৬৪ গুণ। Payment ধীর হলে আরও ব্যর্থ, আরও retry: ঝড় নিজেকেই খাওয়ায়।' },
      { prompt: 'আবার যেন না হয়, সবচেয়ে ভালো সমাধান?', options: ['এক জায়গায় retry, retry budget, backoff-এ jitter', 'Payment server দ্বিগুণ করে বাড়তি চাপ নেওয়া', 'সব retry বন্ধ, প্রথম ব্যর্থতাতেই হাল ছাড়া', 'Provider বদলে আরও বড় একটা provider নেওয়া'], explain: 'Retry একটাই layer-এ, মোট retry-র সীমা (budget), আর এলোমেলো দেরি: তাহলে retry সাহায্য করে, ঝড় বানায় না। শুধু server বাড়ালে পরের ঝড়ে আবার ডুববে।' },
    ],
  },
  {
    id: 'cascade', title: 'এক ধীর service, পুরো app বন্ধ', level: 29, severity: 'SEV-1', fix: 'resilience',
    alert: 'Homepage খুলছে না, order-ও না। অথচ শুধু "কখন পৌঁছাবে" (ETA) service-টা ধীর হয়েছে।',
    series: [
      { label: 'ETA service p99', unit: 's', values: t(0.2, 0.2, 0.3, 8, 25, 30, 30, 31, 30, 30, 29, 30), bad: true },
      { label: 'Order service-এর ব্যস্ত thread', unit: '%', values: t(12, 13, 15, 60, 100, 100, 100, 100, 100, 100, 100, 100), bad: true },
      { label: 'Homepage সফল', unit: '%', values: t(100, 100, 100, 70, 5, 2, 1, 2, 1, 1, 2, 1), bad: true },
    ],
    logs: ['14:03 eta-service: p99 latency 30s (map provider slow)', 'order-service: http client timeout=60s, retries=2', '14:05 order-service: thread pool exhausted 200/200', 'homepage: calls order-service for "your active orders" widget'],
    stages: [
      { prompt: 'তিনটা graph-ই লাল। কোথা থেকে শুরু করবেন?', options: ['Order service-এর thread, ২০০টার সবই আটকে আছে', 'ETA service-এর CPU, সেটা কতটা ব্যস্ত', 'Homepage-এর request সংখ্যা, কমেছে কি না', 'Load balancer-এর health check-এর log'], explain: 'ETA ধীর হলেও homepage-এর ETA লাগে না। মাঝখানের order service আটকে থাকলেই দুটো জোড়া লাগে।' },
      { prompt: 'কারণ কী?', options: ['ধীর ETA-র জন্য ৬০ সেকেন্ডের timeout-এ thread আটকা', 'ETA service পুরো বন্ধ, তাই সব request ব্যর্থ', 'Order service-এর database-এ বড় একটা lock', 'Homepage-এ নতুন একটা বড় ছবি যোগ হয়েছে'], explain: 'প্রতিটা ETA call ৩০ সেকেন্ড thread ধরে রাখে, timeout আরও লম্বা। ২০০টা thread শেষ, তাই order service কাউকেই উত্তর দিতে পারে না: ধীর একটা অংশ পুরো app বসিয়ে দিল।' },
      { prompt: 'সবচেয়ে ভালো সমাধান?', options: ['ছোট timeout, circuit breaker, ETA ছাড়াই order চালু', 'ETA service-এ আরও server যোগ করে দ্রুত করা', 'Order service-এর thread সংখ্যা ১০ গুণ বাড়ানো', 'ETA ঠিক না হওয়া পর্যন্ত পুরো site বন্ধ রাখা'], explain: 'ছোট timeout thread ছেড়ে দেয়, breaker ধীর service-কে ডাকা বন্ধ করে, আর ETA না থাকলে "শীঘ্রই" দেখিয়ে order চালু থাকে (graceful degradation)। ETA ধীর হয়েছিল map provider-এর জন্য, server বাড়িয়ে লাভ নেই।' },
    ],
  },
  {
    id: 'overload', title: 'ঈদের sale-এ ডুবে যাওয়া', level: 4, severity: 'SEV-1', fix: 'overload',
    alert: 'রাত ৮টার sale শুরু হতেই server CPU ১০০%, কিন্তু সফল order প্রায় শূন্য। গড় অপেক্ষা ৪০ সেকেন্ড।',
    series: [
      { label: 'আসা request / সে.', unit: '', values: t(1500, 1600, 4800, 5000, 5100, 4900, 5000, 5100, 5000, 4900, 5000, 5000), bad: true },
      { label: 'সময়মতো সফল order / সে.', unit: '', values: t(1500, 1600, 1500, 600, 180, 90, 60, 70, 60, 50, 60, 55), bad: true },
      { label: 'গড় অপেক্ষা', unit: 's', values: t(0.1, 0.1, 2, 9, 18, 26, 33, 38, 40, 41, 40, 41) },
    ],
    logs: ['20:00 marketing: Eid sale live', 'api: request queue length 310,000 (no limit)', 'app: client timeout 2s, then "try again" button', '20:04 api: 96% of finished requests had no client waiting'],
    stages: [
      { prompt: 'Server পুরো গতিতে চলছে, তবু order নেই। আগে কোনটা দেখবেন?', options: ['সময়মতো সফল order, ভিড় বাড়তেই প্রায় শূন্য', 'আসা request, ভিড় ঠিক কত গুণ বেড়েছে', 'Server-এর CPU, পুরো ১০০% হয়েছে কি না', 'Payment provider-এর সাড়া দেওয়ার সময়'], explain: 'আসল মাপ "কতটা কাজ হলো" নয়, "কতটা কাজ সময়মতো কারো কাজে লাগল" (goodput)।' },
      { prompt: 'কারণ কী?', options: ['সীমাহীন queue: user চলে যাওয়ার পরও পুরনো request-এ খাটুনি', 'Server সংখ্যা কম, তাই সব request একটু ধীরে চলছে', 'Database-এর connection pool ভরে সব আটকে গেছে', 'CDN-এর cache বন্ধ হয়ে সব traffic server-এ আসছে'], explain: 'Queue-এর কোনো সীমা নেই, তাই অপেক্ষা ৪০ সেকেন্ড। User ২ সেকেন্ডে চলে যায় আর আবার চাপে; server এমন request-এ খাটে যার জন্য কেউ আর অপেক্ষা করছে না।' },
      { prompt: 'সবচেয়ে ভালো সমাধান?', options: ['Queue-এ সীমা, বাড়তি request সাথে সাথে ফেরত, checkout আগে', 'Autoscale চালু রাখা, ভিড় এলে নতুন server আসবে', 'App-এর timeout ২ থেকে বাড়িয়ে ৬০ সেকেন্ড করা', 'Sale-এর দিন browse বন্ধ রেখে শুধু checkout খোলা'], explain: 'সীমা পেরোলে সাথে সাথে "একটু পরে চেষ্টা করুন" (load shedding), আর checkout-কে আগে রাখা: যারা ঢোকে তারা সময়মতো পায়। নতুন server আসতে মিনিট লাগে, ভিড় আসে এক সেকেন্ডে।' },
    ],
  },
];

/** The incidents in the current language. */
export const incidents: Incident[] = isEn ? enIncidents : bnIncidents;
