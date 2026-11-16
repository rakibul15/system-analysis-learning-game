import { useMemo, useReducer, useRef, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { sampleCdf, zipf } from '../lib';
import { Choice, pct, SimFrame, Slider, Toggle, useLatched, useTicker, type Metric } from '../frame/SimFrame';

const KEYS = 60;
const READS_PER_S = 40;
type Policy = 'lru' | 'fifo' | 'random';
interface Entry { version: number; at: number; used: number; added: number }

/** Level 2 · cache-aside with TTL, eviction and writes. */
export function CacheSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [ttl, setTtl] = useState(10);
  const [size, setSize] = useState(10);
  const [policy, setPolicy] = useState<Policy>('fifo');
  const [writes, setWrites] = useState(0);
  const [invalidate, setInvalidate] = useState(false);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const cdf = useMemo(() => zipf(KEYS), []);
  const s = useRef({
    t: 0, rand: mulberry32(9), cache: new Map<number, Entry>(), db: new Array<number>(KEYS).fill(0),
    buckets: [] as { hit: number; miss: number; stale: number }[], cur: { hit: 0, miss: 0, stale: 0 }, bucketT: 0,
    flash: new Map<number, { kind: 'hit' | 'miss' | 'stale'; t: number }>(), settledAt: 0, cfgKey: '',
  });

  const cfgKey = `${ttl}-${size}-${policy}-${writes}-${invalidate}`;
  if (s.current.cfgKey !== cfgKey) { s.current.cfgKey = cfgKey; s.current.settledAt = s.current.t; s.current.buckets = []; }

  useTicker((dt) => {
    const st = s.current;
    st.t += dt;
    const r = st.rand;
    // writes: the database changes; with invalidation the cache copy is dropped
    let wn = writes * dt; while (wn > 0) { if (r() < wn) { const k = Math.floor(r() * KEYS); st.db[k]!++; if (invalidate) st.cache.delete(k); } wn -= 1; }
    let rn = READS_PER_S * dt;
    while (rn > 0) {
      if (r() < Math.min(1, rn)) {
        const k = sampleCdf(cdf, r());
        const e = st.cache.get(k);
        if (e && st.t - e.at < ttl) {
          e.used = st.t;
          if (e.version < st.db[k]!) { st.cur.stale++; st.flash.set(k, { kind: 'stale', t: st.t }); }
          st.cur.hit++;
          if (e.version >= st.db[k]!) st.flash.set(k, { kind: 'hit', t: st.t });
        } else {
          st.cur.miss++;
          st.flash.set(k, { kind: 'miss', t: st.t });
          st.cache.delete(k);
          if (st.cache.size >= size) {
            const all = [...st.cache.entries()];
            const victim = policy === 'random' ? all[Math.floor(r() * all.length)]! : all.sort((a, b) => (policy === 'lru' ? a[1].used - b[1].used : a[1].added - b[1].added))[0]!;
            st.cache.delete(victim[0]);
          }
          st.cache.set(k, { version: st.db[k]!, at: st.t, used: st.t, added: st.t });
        }
      }
      rn -= 1;
    }
    st.bucketT += dt;
    if (st.bucketT >= 1) { st.bucketT = 0; st.buckets = [...st.buckets, st.cur].slice(-6); st.cur = { hit: 0, miss: 0, stale: 0 }; }
    tick();
  }, 20);

  const st = s.current;
  const sum = st.buckets.reduce((a, b) => ({ hit: a.hit + b.hit, miss: a.miss + b.miss, stale: a.stale + b.stale }), { hit: 0, miss: 0, stale: 0 });
  const total = sum.hit + sum.miss;
  const settled = st.buckets.length >= 5;
  const hitRate = total ? sum.hit / total : 0;
  const dbPerS = st.buckets.length ? sum.miss / st.buckets.length : 0;
  const staleRate = total ? sum.stale / total : 0;

  const done = useLatched([
    settled && hitRate >= 0.8,
    settled && dbPerS <= 6,
    settled && writes >= 5 && staleRate <= 0.02 && hitRate >= 0.6,
  ]);
  const metrics: Metric[] = [
    { label: 'Hit rate (শেষ ৬ সে.)', value: pct(hitRate), tone: hitRate >= 0.8 ? 'good' : 'neutral' },
    { label: 'DB-তে read / সে.', value: bn(Math.round(dbPerS), { grouping: false }), tone: dbPerS <= 6 ? 'good' : 'bad' },
    { label: 'পুরনো (stale) read', value: pct(staleRate), tone: staleRate > 0.02 ? 'bad' : 'good' },
    { label: 'Cache-এ আছে', value: `${bn(st.cache.size)}/${bn(size)}` },
  ];

  return (
    <SimFrame
      title="দ্রুত তাক: cache চালান"
      intro={`প্রতি সেকেন্ডে ${bn(READS_PER_S)}টা read আসে, কিছু product অনেক বেশি জনপ্রিয়। TTL, তাকের আকার আর কোনটা ফেলবেন ঠিক করে DB-র চাপ কমান।`}
      onFinish={onFinish}
      controls={<>
        <Slider label="TTL" value={ttl} min={1} max={60} onChange={setTtl} format={(v) => `${bn(v)} সে.`} />
        <Slider label="Cache-এর আকার (item)" value={size} min={5} max={50} onChange={setSize} />
        <Choice label="জায়গা শেষ হলে ফেলব" value={policy} onChange={setPolicy} options={[{ id: 'lru', label: 'LRU' }, { id: 'fifo', label: 'FIFO' }, { id: 'random', label: 'Random' }]} />
        <Slider label="Price বদল (write / সে.)" value={writes} min={0} max={10} onChange={setWrites} />
        <Toggle label="Write হলে cache থেকে মুছুন" on={invalidate} onChange={setInvalidate} />
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-route" />cache-এ</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-[#3FD38A]" />hit</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-parcel" />miss → DB</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-coral" />পুরনো দাম</span>
            <span className="ml-auto text-muted">বাঁ থেকে ডানে: বেশি জনপ্রিয় → কম</span>
          </div>
          <div className="grid flex-1 grid-cols-10 gap-1.5" role="img" aria-label={`${bn(KEYS)}টা product, ${bn(st.cache.size)}টা cache-এ`}>
            {Array.from({ length: KEYS }, (_, k) => {
              const f = st.flash.get(k);
              const fresh = f && st.t - f.t < 0.35;
              const inCache = st.cache.has(k);
              const bg = fresh ? (f!.kind === 'hit' ? '#3FD38A' : f!.kind === 'stale' ? '#E0483E' : '#FFC02E') : inCache ? '#0B8A7A' : '#E3E6DF';
              return <span key={k} className="aspect-square rounded-md border-2 border-ink transition-colors duration-150" style={{ background: bg, transform: fresh ? 'scale(1.12)' : undefined }} />;
            })}
          </div>
          {!settled && <p className="m-0 text-sm text-muted">মাপা হচ্ছে… ({bn(st.buckets.length)}/৫ সে.)</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'Hit rate ৮০% বা তার বেশি করুন', done: done[0]!, hint: 'জনপ্রিয় item যেন তাক থেকে না পড়ে: আকার আর TTL বাড়ান, LRU চেষ্টা করুন।' },
        { text: 'DB-তে read সেকেন্ডে ৬ বা তার কম আনুন', done: done[1]!, hint: '৪০টা read-এর ৮৫% hit হলে DB পায় ৬টা।' },
        { text: 'দাম সেকেন্ডে ৫ বার বদলাচ্ছে: stale ২%-এর নিচে, hit rate ৬০%+', done: done[2]!, hint: 'TTL ছোট করলে hit কমে। Write-এর সময় মুছে দিলে?' },
      ]}
    />
  );
}
