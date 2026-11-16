import { refs } from '@/content/refs';

export interface DesignPrompt { id: string; title: string; prompt: string; level: number; ref: { label: string; url: string } }

/** Open design challenges, ParcelGo-flavoured, each tied to the level that teaches it. */
export const designPrompts: DesignPrompt[] = [
  { id: 'shortener', title: 'Tracking link shortener', level: 8, ref: refs.p3, prompt: 'প্রতিদিন ১ কোটি SMS-এ যাওয়া tracking link ছোট করার service design করুন। Click গোনা লাগবে।' },
  { id: 'ratelimit', title: 'API rate limiter', level: 4, ref: refs.p1, prompt: 'Merchant API-র জন্য rate limiter: প্রতি merchant মিনিটে ১,০০০ request, অনেক API server জুড়ে।' },
  { id: 'notify', title: 'Delivery notification', level: 10, ref: refs.p3, prompt: 'Parcel-এর প্রতিটা অবস্থায় SMS, push আর email। দিনে ৫ কোটি notification, দুবার যেন না যায়।' },
  { id: 'chat', title: 'Rider–customer chat', level: 12, ref: refs.p4, prompt: 'Rider আর customer-এর ১-১ chat, online/offline দেখানো, offline হলে message জমা।' },
  { id: 'nearby', title: 'কাছের rider খোঁজা', level: 16, ref: refs.p5, prompt: 'Order এলে ২ km-এর মধ্যে ফাঁকা rider খোঁজা; ৫ লাখ rider, প্রতি ৫ সেকেন্ডে location।' },
  { id: 'queue', title: 'Order event pipeline', level: 19, ref: refs.p5, prompt: 'Order-এর প্রতিটা ঘটনা অন্য ১০টা service-এ পৌঁছানো; কিছু যেন না হারায়, ক্রম যেন ঠিক থাকে।' },
  { id: 'payment', title: 'COD আর online payment', level: 26, ref: refs.p6, prompt: 'Customer-এর online payment আর merchant payout; দুবার কাটা যাবে না, হিসাব মিলতে হবে।' },
  { id: 'feed', title: 'Merchant offer feed', level: 11, ref: refs.p3, prompt: 'Customer যেসব merchant follow করে তাদের offer feed; কিছু merchant-এর লাখো follower।' },
];

export const designRubric = [
  'Functional আর non-functional প্রয়োজন জিজ্ঞেস/লিখেছি',
  'হিসাব করেছি (QPS, storage, peak)',
  'API ঠিক করেছি',
  'Data model আর database বাছাই, কারণসহ',
  'High-level diagram: মূল component আর পথ',
  'অন্তত দুটো অংশে deep dive',
  'SPOF আর bottleneck চিহ্নিত, সমাধান সহ',
  'Trade-off নিজে থেকে বলেছি',
] as const;

export interface SpeakPrompt { id: string; prompt: string; level: number }

export const speakPrompts: SpeakPrompt[] = [
  { id: 'spof', prompt: 'Single point of failure কী, আর ParcelGo-তে একটা উদাহরণ দিয়ে কীভাবে এড়াবেন?', level: 1 },
  { id: 'cache', prompt: 'Cache-aside কীভাবে কাজ করে, আর TTL কত হবে কীভাবে ঠিক করবেন?', level: 2 },
  { id: 'estimate', prompt: '১ কোটি DAU থেকে QPS আর peak কীভাবে হিসাব করবেন, মুখে বলুন।', level: 3 },
  { id: 'token', prompt: 'Token bucket আর fixed window-এর পার্থক্য, আর কোনটা কখন?', level: 4 },
  { id: 'ring', prompt: 'Consistent hashing কেন লাগে, আর virtual node কী সমাধান করে?', level: 5 },
  { id: 'cap', prompt: 'CAP theorem ব্যাখ্যা করুন; payment system CP না AP, কেন?', level: 6 },
  { id: 'snowflake', prompt: 'Snowflake ID-র ৬৪ bit কীভাবে ভাগ, আর কেন সময়ের ক্রমে সাজানো থাকে?', level: 7 },
  { id: 'fanout', prompt: 'News feed-এ push আর pull, আর celebrity সমস্যা কীভাবে সামলাবেন?', level: 11 },
  { id: 'geohash', prompt: 'Geohash দিয়ে কাছের rider খোঁজা, আর প্রতিবেশী ঘর কেন দেখতে হয়?', level: 16 },
  { id: 'semantics', prompt: 'At-most-once, at-least-once আর exactly-once: কোনটা কখন?', level: 19 },
  { id: 'idempotency', prompt: 'Idempotency key কী, আর payment retry-তে কীভাবে বাঁচায়?', level: 26 },
  { id: 'saga', prompt: '2PC বনাম Saga: merchant payout-এর জন্য কোনটা, কেন?', level: 27 },
  { id: 'outbox', prompt: 'Transactional outbox কোন সমস্যা মেটায়, আর relay crash করলে কী হয়?', level: 29 },
];

export const speakRubric = ['সংজ্ঞা নির্ভুল', 'ParcelGo-র একটা উদাহরণ দিয়েছি', 'একটা trade-off বা সীমা বলেছি'] as const;
