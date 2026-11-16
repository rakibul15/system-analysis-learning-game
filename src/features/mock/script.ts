/** The interviewer's script for a 45-minute mock: five phases and prompt-specific follow-ups. */
export interface MockPhase { id: string; title: string; minutes: number; ask: string[] }

export const mockPhases: MockPhase[] = [
  { id: 'req', title: 'প্রয়োজন বোঝা', minutes: 5, ask: ['কোন feature-গুলো এই আলোচনায় থাকবে, কোনগুলো বাদ?', 'কত user, কত request? কোন অঞ্চলে?', 'কোনটা বেশি জরুরি: latency, availability না consistency?'] },
  { id: 'est', title: 'হিসাব', minutes: 5, ask: ['গড় আর peak QPS কত?', 'বছরে কত storage লাগবে?', 'Read আর write-এর অনুপাত কেমন?'] },
  { id: 'hld', title: 'High-level design', minutes: 15, ask: ['মূল API-গুলো লিখুন।', 'Data model আর database: কোনটা, কেন?', 'একটা request শুরু থেকে শেষ পর্যন্ত কোন পথে যায়, এঁকে দেখান।'] },
  { id: 'deep', title: 'Deep dive', minutes: 15, ask: [] },
  { id: 'wrap', title: 'শেষ কথা', minutes: 5, ask: ['Single point of failure কোথায়?', 'Traffic ১০ গুণ হলে আগে কী ভাঙবে?', 'আরও সময় পেলে কী বদলাতেন?'] },
];

/** Deep-dive questions the interviewer asks for each design prompt. */
export const followUps: Record<string, string[]> = {
  shortener: ['একই লম্বা URL দুবার এলে কী করবেন?', 'Click গুনতে 301 না 302, কেন?', 'ID কোথা থেকে আসবে যাতে দুই server একই code না দেয়?'],
  ratelimit: ['অনেক API server-এর মধ্যে counter কোথায় রাখবেন?', 'দুই server একসাথে counter বাড়ালে race condition কীভাবে আটকাবেন?', 'Rate limiter নিজে বন্ধ হলে request ঢুকতে দেবেন না আটকাবেন?'],
  notify: ['Provider ব্যর্থ হলে retry কীভাবে, কতবার?', 'একই notification দুবার যাওয়া কীভাবে আটকাবেন?', 'User notification বন্ধ রাখলে সেটা কোথায় দেখবেন?'],
  chat: ['WebSocket server-গুলোর মধ্যে message কীভাবে পৌঁছাবে?', 'Online/offline কীভাবে জানবেন, ঝিকমিক কীভাবে আটকাবেন?', 'Message-এর ক্রম কীভাবে ঠিক রাখবেন?'],
  nearby: ['প্রতি ৫ সেকেন্ডে ৫ লাখ location write কোথায় রাখবেন?', 'Geohash-এর ঘরের কিনারায় rider থাকলে?', 'একই rider দুটো order পেয়ে গেলে?'],
  queue: ['Consumer পড়ে ব্যর্থ হলে message হারাবে না কীভাবে?', 'ক্রম শুধু কোথায় দরকার: সব topic-এ, নাকি এক order-এর মধ্যে?', 'Consumer পিছিয়ে পড়লে কী দেখবেন, কী করবেন?'],
  payment: ['Network-এ উত্তর হারালে retry-তে দুবার কাটা কীভাবে আটকাবেন?', 'আমাদের হিসাব আর PSP-র হিসাব না মিললে?', 'Merchant payout ব্যর্থ হলে কী হবে?'],
  feed: ['লাখো follower-ওয়ালা merchant post করলে কী হবে?', 'Feed cache-এ কী রাখবেন, কতক্ষণ?', 'Follow বাদ দিলে পুরনো offer feed থেকে সরবে কীভাবে?'],
};
