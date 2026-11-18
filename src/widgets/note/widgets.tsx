import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/simulators/knob/anim';
import type { WidgetId } from '@/content/xu/types';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { play } from '@/shared/lib/sound';
import { Figure, useInView } from './anim';

const btn = 'min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-3 text-sm font-bold';
const btnMain = 'btn-press min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink bg-parcel px-4 text-sm font-extrabold text-night shadow-[0_3px_0_var(--color-shadow)]';

export function Widget({ id, label }: { id: WidgetId; label: string }) {
  if (id === 'token-bucket') return <TokenBucket label={label} />;
  return <WindowEdge label={label} />;
}

/** Runs `fn(dt)` every animation frame while `on`. */
function useFrames(on: boolean, fn: (dt: number) => void) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    if (!on) return;
    let raf = 0, last = 0;
    const loop = (t: number) => {
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      f.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/* ------------------------------------------------------------- token bucket */

interface Shot { id: number; ok: boolean; t: number }

/**
 * A bucket of tokens: it refills at a steady rate up to its size, and every request takes one.
 * An empty bucket answers 429. A quiet spell fills the bucket, so a short burst gets through.
 */
export function TokenBucket({ label }: { label: string }) {
  const [size, setSize] = useState(4);
  const [rate, setRate] = useState(1);
  const [bot, setBot] = useState(false);
  const [ref, on] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const s = useRef({ tokens: 4, shots: [] as Shot[], seq: 0, botAcc: 0, ok: 0, no: 0 });
  const [, draw] = useState(0);

  const send = () => {
    const w = s.current;
    const ok = w.tokens >= 1;
    if (ok) { w.tokens -= 1; w.ok++; } else w.no++;
    w.shots.push({ id: w.seq++, ok, t: 0 });
    if (w.shots.length > 40) w.shots.shift();
    draw((n) => n + 1);
  };

  const busy = () => s.current.tokens < size || s.current.shots.length > 0 || bot;
  useFrames(on && busy(), (dt) => {
    const w = s.current;
    w.tokens = Math.min(size, w.tokens + rate * dt);
    if (bot) { w.botAcc += 5 * dt; while (w.botAcc >= 1) { w.botAcc -= 1; send(); } }
    for (const x of w.shots) x.t += dt / (reduced ? 0.2 : 1.2);
    w.shots = w.shots.filter((x) => x.t < 1);
    draw((n) => n + 1);
  });
  // a smaller bucket cannot hold what it had
  useEffect(() => { s.current.tokens = Math.min(s.current.tokens, size); draw((n) => n + 1); }, [size]);

  const w = s.current;
  const full = Math.floor(w.tokens + 1e-9);
  const part = w.tokens - full;
  return (
    <Figure label={label}>
      <div ref={ref} className="relative rounded-xl border-2 border-ink bg-surface" style={{ aspectRatio: '100 / 38' }}>
        <svg viewBox="0 0 100 38" className="absolute inset-0 h-full w-full" role="img" aria-label={tr(`Bucket-এ ${bn(full)}টা token, সর্বোচ্চ ${bn(size)}`, `${full} tokens in the bucket, at most ${size}`)}>
          <line x1="13" y1="21" x2="87" y2="21" stroke="#16252D" strokeOpacity=".25" strokeWidth=".6" strokeDasharray="1.5 1.2" />
          {/* client */}
          <rect x="2" y="15" width="16" height="12" rx="2" fill="#fff" stroke="#16252D" strokeWidth=".6" />
          <text x="10" y="22.6" textAnchor="middle" fontSize="3" fontWeight="700" fill="#16252D">Client</text>
          {/* bucket */}
          <path d="M38 6 L42 32 H58 L62 6" fill="#F7F8F3" stroke="#16252D" strokeWidth=".8" />
          {Array.from({ length: size }, (_, k) => {
            const cols = 3, r = 2.1;
            const cx = 44.5 + (k % cols) * 5.5, cy = 28.5 - Math.floor(k / cols) * 4.8;
            const f = k < full ? 1 : k === full ? part : 0;
            return <circle key={k} cx={cx} cy={cy} r={r} fill={f >= 1 ? '#FFC02E' : '#fff'} fillOpacity={f >= 1 ? 1 : 0.6} stroke="#16252D" strokeWidth=".4" strokeDasharray={f >= 1 ? undefined : '.8 .6'} />;
          })}
          <text x="50" y="4.2" textAnchor="middle" fontSize="2.8" fontWeight="700" fill="#16252D">{tr(`Token ${bn(full)}/${bn(size)}`, `Tokens ${full}/${size}`)}</text>
          {/* api */}
          <rect x="82" y="15" width="16" height="12" rx="2" fill="#E3F4F1" stroke="#16252D" strokeWidth=".6" />
          <text x="90" y="22.6" textAnchor="middle" fontSize="3" fontWeight="700" fill="#16252D">API</text>
          {/* requests */}
          {w.shots.map((x) => {
            const ok = x.ok;
            const p = x.t;
            const px = ok ? 18 + p * 64 : 18 + Math.min(p, 0.5) * 2 * 22;
            const py = ok ? 21 : 21 + Math.max(0, p - 0.5) * 30;
            return (
              <g key={x.id} opacity={ok ? 1 : 1 - Math.max(0, p - 0.5) * 2}>
                <circle cx={px} cy={py} r="1.6" fill={ok ? '#0B8A7A' : '#E0483E'} stroke="#16252D" strokeWidth=".3" />
                {!ok && p > 0.45 && <text x={px} y={py - 2.6} textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#B4322A">429</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnMain} onClick={() => { send(); play('tap'); }}>{tr('Request পাঠান', 'Send a request')}</button>
        <button type="button" className={btn} aria-pressed={bot} onClick={() => setBot((b) => !b)}>{bot ? tr('🤖 Bot থামান', '🤖 Stop the bot') : tr('🤖 Bot চালু (সেকেন্ডে ৫টা)', '🤖 Bot on (5 a second)')}</button>
        <span className="text-sm font-semibold" aria-live="polite">
          <span className="text-route-deep">{tr(`পাস ${bn(w.ok)}`, `Passed ${w.ok}`)}</span> · <span className="text-coral-deep">{tr(`আটকানো (429) ${bn(w.no)}`, `Blocked (429) ${w.no}`)}</span>
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col text-sm"><span className="flex justify-between"><b>{tr('Bucket-এর আকার', 'Bucket size')}</b><span className="font-mono">{bn(size)}</span></span>
          <input type="range" min={1} max={9} step={1} value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 accent-[var(--color-route)]" /></label>
        <label className="flex flex-col text-sm"><span className="flex justify-between"><b>{tr('ভরার হার', 'Refill rate')}</b><span className="font-mono">{tr(`সেকেন্ডে ${bn(rate)}টা`, `${rate} a second`)}</span></span>
          <input type="range" min={0.5} max={5} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-8 accent-[var(--color-route)]" /></label>
      </div>
      <p className="m-0 text-sm text-ink-soft">{tr('চেষ্টা করুন: চুপ করে bucket ভরতে দিন, তারপর দ্রুত কয়েকবার চাপুন: জমা token-এ burst পার হয়ে যায়। তারপর bot চালু করুন: সেকেন্ডে যতটা ভরে, তার বেশি পার হয় না।', 'Try it: let the bucket fill, then tap quickly a few times: the saved tokens let a burst through. Then turn the bot on: no more gets through than the refill rate.')}</p>
    </Figure>
  );
}

/* ---------------------------------------------------------- window edge */

/** Requests (seconds after 0:00): a burst just before the minute turns, another just after, then a few more. */
const TIMES = [50, 52, 54, 56, 58, 60.5, 62, 64, 66, 68, 75, 90, 105, 112, 116];
const LIMIT = 5;
const FROM = 40, TO = 120;

export function windowVerdicts(mode: 'fixed' | 'sliding', times = TIMES, limit = LIMIT): boolean[] {
  const passed: number[] = [];
  return times.map((t) => {
    const ok = mode === 'fixed'
      ? passed.filter((p) => Math.floor(p / 60) === Math.floor(t / 60)).length < limit
      : passed.filter((p) => p > t - 60).length < limit;
    if (ok) passed.push(t);
    return ok;
  });
}

/**
 * Limit 5 a minute. A fixed window counts per clock minute, so a burst at 0:58 and another at
 * 1:01 both pass: ten in a few seconds. A sliding window always looks back a full minute.
 */
export function WindowEdge({ label }: { label: string }) {
  const [mode, setMode] = useState<'fixed' | 'sliding'>('fixed');
  const [t, setT] = useState(TO);
  const [running, setRunning] = useState(false);
  const [ref, on] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  useFrames(on && running, (dt) => {
    setT((x) => {
      const n = x + dt * 10;
      if (n >= TO) { setRunning(false); return TO; }
      return n;
    });
  });
  const verdict = windowVerdicts(mode);
  const X = (s: number) => 4 + ((s - FROM) / (TO - FROM)) * 92;
  const happened = TIMES.map((s) => s <= t);
  const lastMinute = TIMES.filter((s, k) => happened[k] && verdict[k] && s > t - 60).length;
  const peak = Math.max(...TIMES.map((s) => TIMES.filter((p, k) => verdict[k] && p > s - 60 && p <= s).length));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const start = () => { setT(reduced ? TO : FROM); setRunning(!reduced); play('tap'); };
  return (
    <Figure label={label}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('কীভাবে গোনা হবে', 'How to count')}>
        {(['fixed', 'sliding'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`min-h-11 cursor-pointer rounded-xl border-2 border-ink px-3 text-sm font-bold ${mode === m ? 'bg-ink text-on-ink' : 'bg-surface'}`}>
            {m === 'fixed' ? tr('Fixed window (ঘড়ির মিনিট ধরে)', 'Fixed window (by clock minute)') : tr('Sliding window (শেষ ৬০ সেকেন্ড)', 'Sliding window (last 60 seconds)')}
          </button>
        ))}
      </div>
      <div ref={ref} className="relative rounded-xl border-2 border-ink bg-surface" style={{ aspectRatio: '100 / 30' }}>
        <svg viewBox="0 0 100 30" className="absolute inset-0 h-full w-full" role="img" aria-label={tr('সময়ের রেখায় request: সবুজ পাস, লাল আটকানো', 'Requests on a timeline: green passed, red blocked')}>
          {mode === 'fixed'
            ? [[FROM, 60], [60, TO]].map(([a, b], k) => <rect key={k} x={X(a!)} y="5" width={X(b!) - X(a!)} height="17" fill={k ? '#E3EEFF' : '#FFF4D6'} opacity=".8" />)
            : t > FROM && <rect x={X(Math.max(FROM, t - 60))} y="5" width={X(t) - X(Math.max(FROM, t - 60))} height="17" fill="#E3F4F1" stroke="#0B8A7A" strokeWidth=".4" />}
          {mode === 'fixed' && <line x1={X(60)} y1="3" x2={X(60)} y2="24" stroke="#16252D" strokeWidth=".5" strokeDasharray="1 .8" />}
          <line x1={X(FROM)} y1="22" x2={X(TO)} y2="22" stroke="#16252D" strokeWidth=".5" />
          {[40, 60, 80, 100, 120].map((s) => <text key={s} x={X(s)} y="27.5" textAnchor="middle" fontSize="2.6" fill="#4A5A62">{mmss(s)}</text>)}
          {TIMES.map((s, k) => happened[k] && (
            <g key={s}>
              <line x1={X(s)} y1="22" x2={X(s)} y2={verdict[k] ? 10 : 15} stroke={verdict[k] ? '#0B8A7A' : '#E0483E'} strokeWidth=".9" />
              <circle cx={X(s)} cy={verdict[k] ? 10 : 15} r="1.3" fill={verdict[k] ? '#0B8A7A' : '#E0483E'} stroke="#16252D" strokeWidth=".25" />
            </g>
          ))}
          {t < TO && <line x1={X(t)} y1="3" x2={X(t)} y2="24" stroke="#E0483E" strokeWidth=".6" />}
        </svg>
      </div>
      <p className="m-0 text-[15px]" aria-live="polite">
        {t < TO
          ? tr(`এখন ${mmss(t)} · শেষ ৬০ সেকেন্ডে পাস: `, `Now ${mmss(t)} · passed in the last 60 seconds: `)
          : tr('যেকোনো ৬০ সেকেন্ডে সবচেয়ে বেশি পাস: ', 'Most passed in any 60 seconds: ')}
        <b className={(t < TO ? lastMinute : peak) > LIMIT ? 'text-coral-deep' : 'text-route-deep'}>{bn(t < TO ? lastMinute : peak)}</b>
        {tr(` (সীমা ${bn(LIMIT)})`, ` (limit ${LIMIT})`)}
        {(t < TO ? lastMinute : peak) > LIMIT && <b className="text-coral-deep">{tr(' · সীমার দ্বিগুণ!', ' · twice the limit!')}</b>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnMain} onClick={start}>{running ? tr('চলছে…', 'Running…') : tr('▶ সময় চালাও', '▶ Run the clock')}</button>
      </div>
    </Figure>
  );
}
