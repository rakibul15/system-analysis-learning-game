import { refs } from '@/content/refs';
import { tr } from '@/shared/lib/i18n';

export interface DesignPrompt { id: string; title: string; prompt: string; level: number; ref: { label: string; url: string } }

/** Open design challenges, ParcelGo-flavoured, each tied to the level that teaches it. */
export const designPrompts: DesignPrompt[] = [
  { id: 'shortener', title: 'Tracking link shortener', level: 8, ref: refs.p3, prompt: tr('প্রতিদিন ১ কোটি SMS-এ যাওয়া tracking link ছোট করার service design করুন। Click গোনা লাগবে।', 'Design a service that shortens the tracking links in 10 million SMS a day. Clicks must be counted.') },
  { id: 'ratelimit', title: 'API rate limiter', level: 4, ref: refs.v1_4, prompt: tr('Merchant API-র জন্য rate limiter: প্রতি merchant মিনিটে ১,০০০ request, অনেক API server জুড়ে।', 'A rate limiter for the merchant API: 1,000 requests per merchant per minute, across many API servers.') },
  { id: 'notify', title: 'Delivery notification', level: 10, ref: refs.p3, prompt: tr('Parcel-এর প্রতিটা অবস্থায় SMS, push আর email। দিনে ৫ কোটি notification, দুবার যেন না যায়।', 'SMS, push and email at every parcel status. 50 million notifications a day, none sent twice.') },
  { id: 'chat', title: 'Rider–customer chat', level: 12, ref: refs.p4, prompt: tr('Rider আর customer-এর ১-১ chat, online/offline দেখানো, offline হলে message জমা।', '1-to-1 chat between rider and customer, online/offline status, messages kept while offline.') },
  { id: 'nearby', title: tr('কাছের rider খোঁজা', 'Finding the nearest rider'), level: 16, ref: refs.p5, prompt: tr('Order এলে ২ km-এর মধ্যে ফাঁকা rider খোঁজা; ৫ লাখ rider, প্রতি ৫ সেকেন্ডে location।', 'Find a free rider within 2 km when an order arrives; 500,000 riders, location every 5 seconds.') },
  { id: 'queue', title: 'Order event pipeline', level: 19, ref: refs.p5, prompt: tr('Order-এর প্রতিটা ঘটনা অন্য ১০টা service-এ পৌঁছানো; কিছু যেন না হারায়, ক্রম যেন ঠিক থাকে।', 'Deliver every order event to 10 other services; nothing lost, order preserved.') },
  { id: 'payment', title: tr('COD আর online payment', 'COD and online payment'), level: 26, ref: refs.p6, prompt: tr('Customer-এর online payment আর merchant payout; দুবার কাটা যাবে না, হিসাব মিলতে হবে।', 'Customer online payments and merchant payouts; no double charges, the books must balance.') },
  { id: 'feed', title: 'Merchant offer feed', level: 11, ref: refs.p3, prompt: tr('Customer যেসব merchant follow করে তাদের offer feed; কিছু merchant-এর লাখো follower।', 'An offer feed from the merchants a customer follows; some merchants have hundreds of thousands of followers.') },
];

export const designRubric = [
  tr('Functional আর non-functional প্রয়োজন জিজ্ঞেস/লিখেছি', 'Asked about / wrote down functional and non-functional requirements'),
  tr('হিসাব করেছি (QPS, storage, peak)', 'Did the estimates (QPS, storage, peak)'),
  tr('API ঠিক করেছি', 'Defined the API'),
  tr('Data model আর database বাছাই, কারণসহ', 'Chose a data model and database, with reasons'),
  tr('High-level diagram: মূল component আর পথ', 'High-level diagram: main components and paths'),
  tr('অন্তত দুটো অংশে deep dive', 'Deep dive into at least two parts'),
  tr('SPOF আর bottleneck চিহ্নিত, সমাধান সহ', 'Named SPOFs and bottlenecks, with fixes'),
  tr('Trade-off নিজে থেকে বলেছি', 'Raised trade-offs unprompted'),
] as const;

export interface SpeakPrompt { id: string; prompt: string; level: number }

export const speakPrompts: SpeakPrompt[] = [
  { id: 'spof', prompt: tr('Single point of failure কী, আর ParcelGo-তে একটা উদাহরণ দিয়ে কীভাবে এড়াবেন?', 'What is a single point of failure, and how would you avoid one in ParcelGo, with an example?'), level: 1 },
  { id: 'cache', prompt: tr('Cache-aside কীভাবে কাজ করে, আর TTL কত হবে কীভাবে ঠিক করবেন?', 'How does cache-aside work, and how do you decide the TTL?'), level: 2 },
  { id: 'estimate', prompt: tr('১ কোটি DAU থেকে QPS আর peak কীভাবে হিসাব করবেন, মুখে বলুন।', 'Out loud: how do you get QPS and peak from 10 million DAU?'), level: 3 },
  { id: 'token', prompt: tr('Token bucket আর fixed window-এর পার্থক্য, আর কোনটা কখন?', 'Token bucket versus fixed window: the difference, and when to use each?'), level: 4 },
  { id: 'ring', prompt: tr('Consistent hashing কেন লাগে, আর virtual node কী সমাধান করে?', 'Why do you need consistent hashing, and what do virtual nodes solve?'), level: 5 },
  { id: 'cap', prompt: tr('CAP theorem ব্যাখ্যা করুন; payment system CP না AP, কেন?', 'Explain the CAP theorem; is a payment system CP or AP, and why?'), level: 6 },
  { id: 'snowflake', prompt: tr('Snowflake ID-র ৬৪ bit কীভাবে ভাগ, আর কেন সময়ের ক্রমে সাজানো থাকে?', 'How are a snowflake ID\'s 64 bits split, and why are they sorted by time?'), level: 7 },
  { id: 'fanout', prompt: tr('News feed-এ push আর pull, আর celebrity সমস্যা কীভাবে সামলাবেন?', 'Push versus pull in a news feed, and how do you handle the celebrity problem?'), level: 11 },
  { id: 'geohash', prompt: tr('Geohash দিয়ে কাছের rider খোঁজা, আর প্রতিবেশী ঘর কেন দেখতে হয়?', 'Finding nearby riders with geohash, and why you must check neighbouring cells?'), level: 16 },
  { id: 'semantics', prompt: tr('At-most-once, at-least-once আর exactly-once: কোনটা কখন?', 'At-most-once, at-least-once and exactly-once: which, and when?'), level: 19 },
  { id: 'idempotency', prompt: tr('Idempotency key কী, আর payment retry-তে কীভাবে বাঁচায়?', 'What is an idempotency key, and how does it save a payment retry?'), level: 26 },
  { id: 'saga', prompt: tr('2PC বনাম Saga: merchant payout-এর জন্য কোনটা, কেন?', '2PC versus Saga: which for merchant payouts, and why?'), level: 27 },
  { id: 'outbox', prompt: tr('Transactional outbox কোন সমস্যা মেটায়, আর relay crash করলে কী হয়?', 'What problem does the transactional outbox solve, and what happens if the relay crashes?'), level: 29 },
];

export const speakRubric = [tr('সংজ্ঞা নির্ভুল', 'The definition was accurate'), tr('ParcelGo-র একটা উদাহরণ দিয়েছি', 'I gave a ParcelGo example'), tr('একটা trade-off বা সীমা বলেছি', 'I named a trade-off or limit')];
