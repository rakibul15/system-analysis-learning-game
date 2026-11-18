import { tr } from '@/shared/lib/i18n';
import type { Scenario } from '../types';

/** Level 1 · প্রথম ভিড়: one server is not enough, a load balancer shares the load, a health check routes around a dead server. */
export const lbScenario: Scenario = {
  id: 'lb',
  level: 1,
  title: tr('প্রথম ভিড়', 'The first rush'),
  story: tr('ParcelGo চলছে একটা মাত্র server-এ। আজ সন্ধ্যায় প্রথম বড় ভিড় আসবে।', 'ParcelGo runs on a single server. Tonight brings its first big rush.'),
  budget: 200,
  start: { servers: 1, lb: false, health: false, limiter: false },
  maxServers: 4,
  costs: { server: 100, lb: 120, health: 60 },
  server: { capacity: 12, queue: 18 },
  patience: 1.5,
  customers: 60,
  waves: [
    {
      label: tr('সকালের order', 'Morning orders'),
      forecast: tr('সেকেন্ডে ৮টা request। একটা server সেকেন্ডে ১২টা সামলায়।', '8 requests a second. One server handles 12 a second.'),
      duration: 18, real: 8, reward: 150,
    },
    {
      label: tr('সন্ধ্যার ভিড়', 'The evening rush'),
      forecast: tr('সেকেন্ডে ২৮টা request আসবে, একটা server-এর দুই গুণেরও বেশি।', '28 requests a second are coming: more than twice what one server can do.'),
      duration: 22, real: 28, reward: 150,
    },
    {
      label: tr('পুরোনো server গরম', 'An old server runs hot'),
      forecast: tr('একই ভিড়। আর কানাঘুষা: Server ২ আজ বেশ গরম, যেকোনো সময় বন্ধ হয়ে যেতে পারে।', 'The same rush. And a rumour: server 2 is running hot and could go down at any moment.'),
      duration: 26, real: 28, crash: { server: 1, at: 7 }, reward: 0,
    },
  ],
  why: {
    overload: {
      q: tr('ভিড়ে system ভাঙল কেন?', 'Why did the system break in the rush?'),
      options: [
        tr('যত request আসছে, server-রা তত শেষ করতে পারছে না: হয় সব যাচ্ছে একটা server-এ (load balancer নেই), নয়তো মোট server কম', 'More requests arrive than the servers can finish: either all of them go to one server (no load balancer), or there are too few servers'),
        tr('Customer-রা বেশি অধৈর্য', 'The customers are too impatient'),
        tr('Network ধীর', 'The network is slow'),
      ],
      answer: 0,
      explain: tr('Server কিনলেই হয় না: load balancer না থাকলে সব request আগের মতো প্রথম server-এই যায়। Load balancer request ভাগ করে দেয়, তখন প্রতিটা নতুন server কাজে লাগে। ২৮টা request-এর জন্য সেকেন্ডে ১২টা পারা server লাগবে অন্তত ৩টা।', 'Buying servers is not enough: without a load balancer every request still goes to the first server. A load balancer shares the requests out, and then each new server helps. For 28 requests a second you need at least 3 servers that each manage 12.'),
    },
    'dead-server': {
      q: tr('Server বন্ধ হওয়ার পরেও customer-রা error পেল কেন?', 'Why did customers keep getting errors after the server went down?'),
      options: [
        tr('Load balancer জানত না server বন্ধ, তাই তখনো ওর ভাগের request ওখানে পাঠাচ্ছিল', 'The load balancer did not know the server was down, so it kept sending it its share'),
        tr('বাকি server-গুলোও বন্ধ হয়ে গেছে', 'The other servers went down too'),
        tr('Customer-রা ভুল ঠিকানায় যাচ্ছিল', 'Customers were going to the wrong address'),
      ],
      answer: 0,
      explain: tr('Health check নিয়মিত প্রতিটা server-কে ডাকে। সাড়া না পেলে load balancer ওকে তালিকা থেকে বাদ দেয়, বাকিরা ভার নেয়। তাই একটা server হারালেও বাকিদের মোট ক্ষমতা যথেষ্ট থাকা চাই: একটা বাড়তি server রাখুন।', 'A health check calls each server regularly. When one does not answer, the load balancer drops it from its list and the others take the load. So the others together must still be enough when one is lost: keep one spare server.'),
    },
    slow: {
      q: tr('Customer-রা অপেক্ষা করে করে বিরক্ত হলো কেন?', 'Why did customers get fed up waiting?'),
      options: [
        tr('Server-এর queue লম্বা হয়ে গেছে: আসছে বেশি, শেষ হচ্ছে কম', 'The server queues grew long: more arrives than gets done'),
        tr('Load balancer বেশি দ্রুত', 'The load balancer is too fast'),
        tr('Server বেশি', 'Too many servers'),
      ],
      answer: 0,
      explain: tr('Queue মানে অপেক্ষা। আসার হার শেষ করার হারের চেয়ে বেশি হলে queue বাড়তেই থাকে। আরেকটা server যোগ করে মোট ক্ষমতা বাড়ান।', 'A queue is waiting. When requests arrive faster than they are finished, the queue keeps growing. Add a server to raise the total.'),
    },
  },
};
