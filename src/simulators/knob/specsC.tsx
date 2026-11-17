import { bn } from '@/shared/lib/bn';
import { spec } from './specsA';
import { Flow, vis } from './anim';
import { tr } from '@/shared/lib/i18n';

/* Retry storm: retries at every layer multiply; a retry budget and jitter keep them in check. */
const BASE = 1000, CAP = 2000, P_FAIL = 0.2, BUDGET = 0.1;
const attempts = (f: number, r: number) => (f >= 1 ? r + 1 : (1 - f ** (r + 1)) / (1 - f));

export function stormModel(s: { layers: number; retries: number; edgeOnly: boolean; budget: boolean; jitter: boolean }) {
  let f = P_FAIL, amp = 1, peak = BASE;
  for (let k = 0; k < 40; k++) {
    let e = attempts(f, s.retries);
    if (s.budget) e = Math.min(e, 1 + BUDGET);
    amp = s.edgeOnly ? e : e ** s.layers;
    peak = BASE * amp * (s.jitter ? 1 : 1.8);
    f = Math.min(0.99, P_FAIL + Math.max(0, 1 - CAP / peak));
  }
  const share = Math.min(1, BUDGET / f);
  const extra = s.edgeOnly
    ? (s.budget ? Math.min(s.retries, share) : s.retries)
    : (s.budget ? Math.min((1 + s.retries) ** s.layers - 1, s.layers * share) : (1 + s.retries) ** s.layers - 1);
  const success = (1 - f ** (1 + extra)) * 100;
  return { amp, peak, f, success };
}

export const retrystorm = spec<{ layers: number; retries: number; edgeOnly: boolean; budget: boolean; jitter: boolean }>({
  title: tr('Retry-র ঝড়', 'The retry storm'),
  intro: tr(`App → gateway → order → payment: প্রতিটা ধাপ নিচের ধাপকে ডাকে। Payment service সেকেন্ডে ${bn(CAP)}টা সামলায়, আর এমনিতেই ${bn(P_FAIL * 100)}% request ব্যর্থ হয়। সবাই একটু retry করলে কী হয়?`, `App → gateway → order → payment: each layer calls the one below. The payment service handles ${CAP} a second and ${P_FAIL * 100}% of requests fail anyway. What happens when everyone retries a little?`),
  init: { layers: 3, retries: 0, edgeOnly: false, budget: false, jitter: false },
  controls: [
    { kind: 'slider', key: 'layers', label: tr('কয়টা layer retry করে', 'Layers that retry'), min: 1, max: 4 },
    { kind: 'slider', key: 'retries', label: tr('প্রতি layer-এ retry', 'Retries per layer'), min: 0, max: 4 },
    { kind: 'toggle', key: 'edgeOnly', label: tr('শুধু সবচেয়ে বাইরের layer retry করে', 'Only the outermost layer retries') },
    { kind: 'toggle', key: 'budget', label: tr(`Retry budget (মোটের ${bn(BUDGET * 100)}%-এর বেশি retry নয়)`, `Retry budget (no more than ${BUDGET * 100}% extra)`) },
    { kind: 'toggle', key: 'jitter', label: tr('Backoff + jitter (retry ছড়িয়ে দেওয়া)', 'Backoff + jitter (spread retries out)') },
  ],
  model: (s) => {
    const m = stormModel(s);
    const over = m.peak > CAP;
    return {
      readings: [
        { id: 'amp', label: tr('Payment-এ চাপ (মূলের কত গুণ)', 'Load on payment (× the original)'), value: m.amp, unit: '×', digits: 1, good: m.amp <= 1.5 },
        { id: 'success', label: tr('User-এর সফল request', 'User requests that succeed'), value: m.success, unit: '%', digits: 1, good: m.success >= 99 },
        { id: 'fail', label: tr('Payment-এ ব্যর্থতা', 'Failure rate at payment'), value: m.f * 100, unit: '%', good: !over },
      ],
      picture: (
        <Flow label={tr('প্রতিটা layer নিচেরটাকে ডাকে; লাল = retry', 'Each layer calls the one below; red = retries')} h={34} nodes={[
          { id: 'u', label: 'App', x: 8, y: 17 },
          { id: 'g', label: 'Gateway', x: 32, y: 17 },
          { id: 'o', label: 'Order', x: 56, y: 17 },
          { id: 'p', label: 'Payment', x: 86, y: 17, w: 18, tone: over ? 'down' : m.amp > 1.5 ? 'hot' : 'ok', sub: `${bn(Math.round(BASE * m.amp))}/${tr('সে.', 's')}` },
        ]} links={[
          { from: 'u', to: 'g', rate: vis(BASE) , mix: 0 },
          { from: 'g', to: 'o', rate: vis(BASE * Math.max(1, m.amp ** (1 / 3))), mix: s.retries ? 0.3 : 0, mixColor: '#E0483E' },
          { from: 'o', to: 'p', rate: vis(BASE * m.amp) * 1.6, mix: s.retries ? Math.min(0.8, 1 - 1 / m.amp) : 0, mixColor: '#E0483E', drop: Math.min(0.9, m.f) },
        ]} />
      ),
      note: over
        ? tr('Retry-ই নতুন traffic। Payment যত ডোবে, তত বেশি ব্যর্থ, তত বেশি retry: নিজে নিজেই ঝড় বাড়ে।', 'Retries are new traffic. The more payment drowns, the more fails, the more retries: the storm feeds itself.')
        : s.retries && !s.edgeOnly && !s.budget ? tr(`${bn(s.layers)}টা layer × ${bn(s.retries + 1)} চেষ্টা = সবচেয়ে খারাপ ক্ষেত্রে ${bn((s.retries + 1) ** s.layers)} গুণ।`, `${s.layers} layers × ${s.retries + 1} attempts = up to ${(s.retries + 1) ** s.layers}× in the worst case.`) : undefined,
    };
  },
  missions: [
    { text: tr('Retry বাড়িয়ে payment-এ ১০ গুণ চাপের ঝড় তুলুন', 'Raise retries until payment gets 10× the load'), ok: (_, r) => r.amp! >= 10 },
    { text: tr('৯৯% সফল, অথচ চাপ ১.৫ গুণের মধ্যে', '99% success with load within 1.5×'), ok: (_, r) => r.success! >= 99 && r.amp! <= 1.5, hint: tr('একটা জায়গাতেই retry করলে?', 'What if only one place retries?') },
    { text: tr('৪টা layer-ই retry করে, তবু ৯৯% সফল আর চাপ ১.৫ গুণের মধ্যে', 'All 4 layers retry, yet 99% success and load within 1.5×'), ok: (s, r) => s.layers === 4 && !s.edgeOnly && s.retries >= 2 && r.success! >= 99 && r.amp! <= 1.5, hint: tr('প্রতিটা layer-এর retry-র একটা মোট সীমা থাকলে, আর সব retry একসাথে না পড়লে?', 'What if each layer\'s retries had an overall cap, and retries did not all land at once?') },
  ],
});

/* Overload: a traffic spike, an unbounded queue, and why rejecting early saves the day. */
const OCAP = 2000, TIMEOUT = 2, CHECKOUT = 0.2;

export function overloadModel(s: { incoming: number; bounded: boolean; maxWait: number; priority: boolean }) {
  const over = Math.max(0, s.incoming - OCAP);
  const served = Math.min(s.incoming, OCAP);
  let latency: number, rejected = 0;
  if (!over) latency = 0.05;
  else if (s.bounded) { latency = s.maxWait / 1000; rejected = (over / s.incoming) * 100; }
  else latency = (over * 60) / OCAP / 2; // average wait after a minute of backlog
  const wasted = latency > TIMEOUT ? (latency - TIMEOUT) / latency : 0;
  const goodput = served * (1 - wasted);
  const checkout = s.priority && s.bounded
    ? Math.min(1, OCAP / (CHECKOUT * s.incoming)) * (1 - wasted) * 100
    : (goodput / s.incoming) * 100;
  return { latency, rejected, goodput, checkout };
}

export const overload = spec<{ incoming: number; bounded: boolean; maxWait: number; priority: boolean }>({
  title: tr('Flash sale-এর ভিড়', 'The flash-sale crush'),
  intro: tr(`Server সেকেন্ডে ${bn(OCAP)}টা order সামলায়। User ${bn(TIMEOUT)} সেকেন্ড অপেক্ষা করে, তারপর ছেড়ে দেয়। ভিড় তার চেয়ে বেশি হলে কী হয়?`, `The servers handle ${OCAP} orders a second. Users wait ${TIMEOUT} seconds, then give up. What happens when the crowd is bigger than that?`),
  init: { incoming: 1500, bounded: false, maxWait: 1000, priority: false },
  controls: [
    { kind: 'slider', key: 'incoming', label: tr('আসা request / সে.', 'Incoming requests / s'), min: 500, max: 5000, step: 500 },
    { kind: 'toggle', key: 'bounded', label: tr('Queue-এ সীমা: বেশি হলে সাথে সাথে "পরে চেষ্টা করুন"', 'Bounded queue: past the limit, answer "try later" at once') },
    { kind: 'slider', key: 'maxWait', label: tr('Queue-এ সর্বোচ্চ অপেক্ষা', 'Longest wait in the queue'), min: 200, max: 5000, step: 200, unit: 'ms' },
    { kind: 'toggle', key: 'priority', label: tr('Checkout আগে, browse পরে (priority)', 'Checkout first, browsing later (priority)') },
  ],
  model: (s) => {
    const m = overloadModel(s);
    const collapsed = m.goodput < OCAP * 0.5 && s.incoming > OCAP;
    return {
      readings: [
        { id: 'goodput', label: tr('সময়মতো শেষ হওয়া order / সে.', 'Orders finished in time / s'), value: m.goodput, good: m.goodput >= Math.min(s.incoming, OCAP) * 0.9 },
        { id: 'latency', label: tr('গড় অপেক্ষা', 'Average wait'), value: m.latency, unit: tr('সে.', 's'), digits: 1, good: m.latency <= TIMEOUT },
        { id: 'rejected', label: tr('সাথে সাথে ফেরানো', 'Turned away at once'), value: m.rejected, unit: '%' },
        { id: 'checkout', label: tr('Checkout সফল', 'Checkouts that succeed'), value: m.checkout, unit: '%', good: m.checkout >= 99 },
      ],
      picture: (
        <Flow label={tr('ভিড় থেকে queue হয়ে server-এ', 'From the crowd through the queue to the servers')} h={34} nodes={[
          { id: 'c', label: tr('ভিড়', 'Crowd'), x: 9, y: 17, sub: `${bn(s.incoming)}/${tr('সে.', 's')}` },
          { id: 'q', label: 'Queue', x: 45, y: 17, w: 18, tone: collapsed ? 'down' : m.latency > 1 ? 'hot' : 'ok', sub: `${bn(m.latency.toFixed(1), { grouping: false })} ${tr('সে.', 's')}` },
          { id: 's', label: 'Servers', x: 84, y: 17, tone: collapsed ? 'hot' : 'ok', sub: `${bn(OCAP)}/${tr('সে.', 's')}` },
        ]} links={[
          { from: 'c', to: 'q', rate: vis(s.incoming), drop: m.rejected / 100, color: '#2F6FDE' },
          { from: 'q', to: 's', rate: vis(Math.min(s.incoming, OCAP)), mix: collapsed ? 0.9 : 0, mixColor: '#AAB3A8' },
        ]} />
      ),
      note: collapsed
        ? tr('Server পুরো গতিতে কাজ করছে, কিন্তু যাদের কাজ করছে তারা অনেক আগেই চলে গেছে: সব খাটুনি নষ্ট (ধূসর বিন্দু)।', 'The servers work flat out, but the people they serve left long ago: all that work is wasted (grey dots).')
        : m.rejected ? tr('কিছু user সাথে সাথে "পরে চেষ্টা করুন" পেল, তাই বাকিরা সময়মতো পেল।', 'Some users got "try later" right away, so the rest were served in time.') : undefined,
    };
  },
  missions: [
    { text: tr('৪,০০০+ ভিড়ে system-কে ডুবতে দেখুন (সময়মতো order ৫০০-র নিচে)', 'Watch the system drown at 4,000+ (under 500 orders in time)'), ok: (s, r) => s.incoming >= 4000 && r.goodput! < 500 },
    { text: tr('৪,০০০+ ভিড়েও সেকেন্ডে ১,৮০০+ order সময়মতো', 'At 4,000+, still 1,800+ orders a second in time'), ok: (s, r) => s.incoming >= 4000 && r.goodput! >= 1800, hint: tr('সবাইকে লাইনে রাখলে কেউই সময়মতো পায় না।', 'Keep everyone in line and nobody is served in time.') },
    { text: tr('৫,০০০ ভিড়ে প্রতিটা checkout সফল', 'At 5,000, every checkout succeeds'), ok: (s, r) => s.incoming >= 5000 && r.checkout! >= 99, hint: tr('কোন request বেশি দামি?', 'Which requests are worth more?') },
  ],
});
