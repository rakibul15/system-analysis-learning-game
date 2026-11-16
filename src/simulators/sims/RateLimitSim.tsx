import { useReducer, useRef, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { ActionButton, Choice, SimFrame, Slider, useLatched, useTicker, type Metric } from '../frame/SimFrame';
import { tr } from '@/shared/lib/i18n';

type Algo = 'token' | 'leaky' | 'fixed' | 'slog';
interface Req { t: number; ok: boolean; burst: boolean }

/** Level 4 · rate limiter algorithms against bots, bursts and the window-edge trick. */
export function RateLimitSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [algo, setAlgo] = useState<Algo>('fixed');
  const [limit, setLimit] = useState(5);
  const [rate, setRate] = useState(3);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const s = useRef({ t: 0, rand: mulberry32(4), reqs: [] as Req[], tokens: 5, queue: 0, lastAlgo: '' as string, edgeDone: '' as string, burstAt: -1, burstOk: 0, burstN: 0, pending: [] as { at: number; burst: boolean }[] });
  const st = s.current;

  const key = `${algo}-${limit}`;
  if (st.lastAlgo !== key) { st.lastAlgo = key; st.reqs = []; st.tokens = limit; st.queue = 0; st.pending = []; }

  const admit = (t: number): boolean => {
    const recent = st.reqs.filter((r) => r.ok);
    if (algo === 'token') { if (st.tokens >= 1) { st.tokens -= 1; return true; } return false; }
    if (algo === 'leaky') { if (st.queue < limit) { st.queue += 1; return true; } return false; }
    if (algo === 'fixed') { const w = Math.floor(t); return recent.filter((r) => Math.floor(r.t) === w).length < limit; }
    return recent.filter((r) => r.t > t - 1).length < limit;
  };
  const fire = (t: number, burst = false) => {
    const ok = admit(t);
    st.reqs.push({ t, ok, burst });
    if (burst) { st.burstN++; if (ok) st.burstOk++; }
  };

  useTicker((dt) => {
    st.t += dt;
    st.tokens = Math.min(limit, st.tokens + limit * dt);
    st.queue = Math.max(0, st.queue - limit * dt);
    let n = rate * dt; while (n > 0) { if (st.rand() < Math.min(1, n)) fire(st.t); n -= 1; }
    st.pending = st.pending.filter((p) => { if (p.at <= st.t) { fire(p.at, p.burst); return false; } return true; });
    st.reqs = st.reqs.filter((r) => r.t > st.t - 4);
    tick();
  }, 30);

  // the most requests that got in during any 1-second stretch
  const okTimes = st.reqs.filter((r) => r.ok).map((r) => r.t);
  let peak = 0;
  for (let i = 0; i < okTimes.length; i++) { let j = i; while (j < okTimes.length && okTimes[j]! < okTimes[i]! + 1) j++; peak = Math.max(peak, j - i); }
  const accepted = st.reqs.filter((r) => r.ok).length;
  const dropped = st.reqs.length - accepted;

  const edgeAttack = () => {
    // limit requests just before a window boundary, limit just after
    const next = Math.floor(st.t) + 1;
    for (let i = 0; i < limit; i++) st.pending.push({ at: next - 0.08 + i * 0.01, burst: false });
    for (let i = 0; i < limit; i++) st.pending.push({ at: next + 0.02 + i * 0.01, burst: false });
    st.edgeDone = algo;
  };
  const burst = () => { st.burstAt = st.t; st.burstOk = 0; st.burstN = 0; for (let i = 0; i < limit; i++) st.pending.push({ at: st.t + 0.05 + i * 0.02, burst: true }); };

  const burstFinished = st.burstN >= limit;
  const done = useLatched([
    algo === 'fixed' && st.edgeDone === 'fixed' && peak > limit,
    (algo === 'slog') && st.edgeDone === 'slog' && peak <= limit && st.t > 2,
    algo === 'token' && burstFinished && st.burstOk >= limit - 1,
  ]);

  const W = 100;
  const metrics: Metric[] = [
    { label: tr('যেকোনো ১ সে.-এ সর্বোচ্চ ঢুকেছে', 'Most allowed in any 1 s'), value: `${bn(peak)} (${tr('সীমা', 'limit')} ${bn(limit)})`, tone: peak > limit ? 'bad' : 'good' },
    { label: tr('ঢুকেছে / বাদ (শেষ ৪ সে.)', 'Allowed / rejected (last 4 s)'), value: `${bn(accepted)} / ${bn(dropped)}` },
    { label: tr('Burst-এ ঢুকেছে', 'Allowed in the burst'), value: st.burstN ? `${bn(st.burstOk)}/${bn(st.burstN)}` : '—' },
  ];

  return (
    <SimFrame
      title={tr('দারোয়ান বসান: rate limiter', 'Post a doorkeeper: rate limiter')}
      intro={tr('সীমা: প্রতি সেকেন্ডে কতগুলো request। Algorithm বদলে দেখুন bot-এর কৌশল কে আটকায়।', 'Limit: how many requests per second. Switch algorithms and see which one stops the bot\'s tricks.')}
      onFinish={onFinish}
      controls={<>
        <Choice label="Algorithm" value={algo} onChange={setAlgo} options={[{ id: 'token', label: 'Token bucket' }, { id: 'leaky', label: 'Leaking bucket' }, { id: 'fixed', label: 'Fixed window' }, { id: 'slog', label: 'Sliding log' }]} />
        <Slider label={tr('সীমা / সে.', 'Limit / s')} value={limit} min={3} max={10} onChange={setLimit} />
        <Slider label={tr('সাধারণ traffic / সে.', 'Normal traffic / s')} value={rate} min={0} max={10} onChange={setRate} />
        <ActionButton tone="warn" onClick={edgeAttack}>{tr('Window-এর প্রান্তে আক্রমণ', 'Attack at the window edge')}</ActionButton>
        <ActionButton tone="go" onClick={burst}>{tr(`Burst: একসাথে ${bn(limit)}টা`, `Burst: ${limit} at once`)}</ActionButton>
      </>}
      stage={
        <svg viewBox={`0 0 ${W} 60`} className="block h-full w-full" role="img" aria-label={tr('শেষ ৪ সেকেন্ডের request: সবুজ ঢুকেছে, লাল বাদ', 'Requests in the last 4 seconds: green allowed, red rejected')}>
          {[0, 1, 2, 3, 4].map((i) => {
            const t = Math.floor(st.t) - 3 + i;
            const x = ((t - (st.t - 4)) / 4) * W;
            return x >= 0 && x <= W ? <g key={t}><line x1={x} y1="6" x2={x} y2="54" stroke="#16252D" strokeOpacity={algo === 'fixed' ? 0.5 : 0.12} strokeDasharray="1.5 1.5" strokeWidth="0.4" /><text x={x + 0.8} y="9" fontSize="2.6" fill="#4A5A62">{algo === 'fixed' ? 'window' : ''}</text></g> : null;
          })}
          <text x="2" y="57" fontSize="2.8" fill="#4A5A62">{tr('৪ সে. আগে', '4 s ago')}</text>
          <text x={W - 2} y="57" fontSize="2.8" fill="#4A5A62" textAnchor="end">{tr('এখন', 'now')}</text>
          {st.reqs.map((r, i) => {
            const x = ((r.t - (st.t - 4)) / 4) * W;
            const y = r.ok ? 22 + (i % 6) * 3 : 40 + (i % 5) * 2.6;
            return <circle key={i} cx={x} cy={y} r={r.burst ? 1.5 : 1.2} fill={r.ok ? '#0B8A7A' : '#E0483E'} stroke="#16252D" strokeWidth="0.3" />;
          })}
          <text x="2" y="18" fontSize="3" fill="#0B6F63" fontWeight="700">{tr('ঢুকেছে', 'allowed')}</text>
          <text x="2" y="37" fontSize="3" fill="#9E2A22" fontWeight="700">{tr('429 বাদ', '429 rejected')}</text>
          {algo === 'token' && <g><rect x={W - 22} y="3" width="20" height="5" rx="1" fill="#FFFFFF" stroke="#16252D" strokeWidth="0.4" /><rect x={W - 22} y="3" width={(20 * st.tokens) / limit} height="5" rx="1" fill="#FFC02E" /><text x={W - 23} y="7" fontSize="2.6" textAnchor="end">token</text></g>}
          {algo === 'leaky' && <g><rect x={W - 22} y="3" width="20" height="5" rx="1" fill="#FFFFFF" stroke="#16252D" strokeWidth="0.4" /><rect x={W - 22} y="3" width={(20 * st.queue) / limit} height="5" rx="1" fill="#2F6FDE" /><text x={W - 23} y="7" fontSize="2.6" textAnchor="end">queue</text></g>}
        </svg>
      }
      metrics={metrics}
      missions={[
        { text: tr('Fixed window-এ প্রান্তের আক্রমণে ১ সেকেন্ডে সীমার বেশি ঢুকিয়ে দেখুন', 'With a fixed window, use the edge attack to get more than the limit through in 1 second'), done: done[0]!, hint: tr('Algorithm: Fixed window, সাধারণ traffic ০, তারপর "প্রান্তে আক্রমণ"।', 'Algorithm: Fixed window, normal traffic 0, then "Attack at the window edge".') },
        { text: tr('এমন algorithm বাছুন যা একই আক্রমণে সীমা পার হতে দেয় না', 'Pick an algorithm that keeps the same attack within the limit'), done: done[1]!, hint: tr('প্রতিটা request-এর সময় মনে রাখে কোনটা?', 'Which one remembers the time of every request?') },
        { text: tr('চুপচাপ সময়ের পর হঠাৎ burst এলে সবগুলো ঢুকতে দিন, গড় হার তবু বাঁধা', 'After a quiet spell, let a sudden burst all through, with the average still capped'), done: done[2]!, hint: tr('জমা থাকা token খরচ করা যায় যে algorithm-এ।', 'The algorithm where saved-up tokens can be spent.') },
      ]}
    />
  );
}
