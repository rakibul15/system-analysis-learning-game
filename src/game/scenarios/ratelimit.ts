import { tr } from '@/shared/lib/i18n';
import type { Scenario } from '../types';

/** Level 4 · Bot-এর বন্যা: a few bots drown the servers; a rate limiter stops them, but too strict a limit stops real customers in a sale. */
export const rateLimitScenario: Scenario = {
  id: 'ratelimit',
  level: 4,
  title: tr('Bot-এর বন্যা', 'The bot flood'),
  story: tr('ParcelGo-র order API খোলা। আজ রাতে BPL final, আর তার সাথে flash sale।', 'ParcelGo\'s order API is public. Tonight is the cricket final, with a flash sale.'),
  budget: 150,
  start: { servers: 2, lb: true, health: true, limiter: false },
  maxServers: 4,
  costs: { server: 150, limiter: 100 },
  server: { capacity: 25, queue: 30 },
  patience: 1.5,
  customers: 40,
  waves: [
    {
      label: tr('সাধারণ সন্ধ্যা', 'An ordinary evening'),
      forecast: tr('৪০ জন customer মিলে সেকেন্ডে ২০টা request। দুই server মিলে সেকেন্ডে ৫০টা পারে।', '40 customers send 20 requests a second between them. The two servers manage 50.'),
      duration: 15, real: 20, reward: 100,
    },
    {
      label: tr('Bot-এর বন্যা', 'The bot flood'),
      forecast: tr('খবর এসেছে: ৩টা bot আসছে, প্রতিটা সেকেন্ডে ৪০টা request পাঠাবে। একজন সাধারণ customer পাঠায় সেকেন্ডে আধটা।', 'Word is that 3 bots are coming, each sending 40 requests a second. A normal customer sends half a request a second.'),
      duration: 20, real: 20, bots: { count: 3, rate: 40 }, reward: 100,
    },
    {
      label: tr('Flash sale', 'The flash sale'),
      forecast: tr('Final শেষে sale! প্রতিটা customer sale page বারবার refresh করবে: জনপ্রতি সেকেন্ডে ১টার বেশি request। Bot-রাও থাকছে।', 'A sale after the final! Every customer will keep refreshing the sale page: more than one request a second each. The bots are still here.'),
      duration: 25, real: 48, bots: { count: 3, rate: 40 }, reward: 0,
    },
  ],
  why: {
    overload: {
      q: tr('Server-গুলো ডুবে গেল কেন?', 'Why did the servers drown?'),
      options: [
        tr('কয়েকটা bot সেকেন্ডে শত শত request পাঠাচ্ছে, আর কেউ তাদের থামাচ্ছে না (বা limit খুব ঢিলা, বা মোট ক্ষমতা কম)', 'A few bots send hundreds of requests a second and nothing stops them (or the limit is too loose, or there is too little capacity)'),
        tr('আসল customer হঠাৎ দশ গুণ', 'Real customers suddenly multiplied tenfold'),
        tr('একটা server বন্ধ', 'A server is down'),
      ],
      answer: 0,
      explain: tr('Rate limiter প্রতিটা client-কে সেকেন্ডে নির্দিষ্ট কয়েকটা request দেয় (token bucket)। Bot-এর বাড়তি request gateway-তেই আটকায়, server পর্যন্ত যায় না। Limit ঢিলা হলে bot-এর ভাগই server ভরিয়ে ফেলে।', 'A rate limiter gives each client a fixed number of requests a second (a token bucket). The bots\' extra requests stop at the gateway and never reach a server. With too loose a limit, the bots\' share alone fills the servers.'),
    },
    blocked: {
      q: tr('Flash sale-এ আসল customer-রা আটকে গেল কেন?', 'Why were real customers blocked in the flash sale?'),
      options: [
        tr('Limit এত কড়া যে সাধারণ customer-এর স্বাভাবিক request-ও আটকাচ্ছে', 'The limit is so strict that it stops normal customers\' ordinary requests'),
        tr('Bot-রা customer সেজে ঢুকেছে', 'The bots disguised themselves as customers'),
        tr('Server বন্ধ', 'A server is down'),
      ],
      answer: 0,
      explain: tr('Limit ঠিক করতে হয় আসল customer-এর ব্যস্ততম সময় দেখে: sale-এ একজন সেকেন্ডে কয়েকবার refresh করে। Bot থামবে, মানুষ না, এমন জায়গায় রাখুন: এখানে সেকেন্ডে ৪টার কাছাকাছি।', 'Set the limit from real customers at their busiest: in a sale a person refreshes a few times a second. Put it where bots stop but people do not: here, around 4 a second.'),
    },
    slow: {
      q: tr('Customer-রা অপেক্ষা করে করে বিরক্ত হলো কেন?', 'Why did customers get fed up waiting?'),
      options: [
        tr('Server-এর queue লম্বা: আসছে বেশি, শেষ হচ্ছে কম', 'The server queues are long: more arrives than gets done'),
        tr('Limit বেশি কড়া', 'The limit is too strict'),
        tr('Bot নেই', 'There are no bots'),
      ],
      answer: 0,
      explain: tr('Sale-এর ভিড়ে bot থামানোর পরেও আসল customer-দের জন্য মোট ক্ষমতা যথেষ্ট কিনা দেখুন: দরকার হলে আরেকটা server।', 'Even with the bots stopped, check there is enough capacity for real customers in the sale rush: add a server if needed.'),
    },
  },
};
