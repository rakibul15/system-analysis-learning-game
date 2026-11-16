import { useMemo, useReducer, useRef, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { sampleCdf, zipf } from '../lib';
import { Choice, pct, SimFrame, Slider, Toggle, useLatched, useTicker, type Metric } from '../frame/SimFrame';
import { tr } from '@/shared/lib/i18n';

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
    { label: tr('Hit rate (শেষ ৬ সে.)', 'Hit rate (last 6 s)'), value: pct(hitRate), tone: hitRate >= 0.8 ? 'good' : 'neutral' },
    { label: tr('DB-তে read / সে.', 'DB reads / s'), value: bn(Math.round(dbPerS), { grouping: false }), tone: dbPerS <= 6 ? 'good' : 'bad' },
    { label: tr('পুরনো (stale) read', 'Stale reads'), value: pct(staleRate), tone: staleRate > 0.02 ? 'bad' : 'good' },
    { label: tr('Cache-এ আছে', 'In cache'), value: `${bn(st.cache.size)}/${bn(size)}` },
  ];

  return (
    <SimFrame
      title={tr('দ্রুত তাক: cache চালান', 'The quick shelf: run the cache')}
      intro={tr(`প্রতি সেকেন্ডে ${bn(READS_PER_S)}টা read আসে, কিছু product অনেক বেশি জনপ্রিয়। TTL, তাকের আকার আর কোনটা ফেলবেন ঠিক করে DB-র চাপ কমান।`, `${READS_PER_S} reads arrive every second, and some products are far more popular. Set the TTL, the shelf size and what to evict to take load off the DB.`)}
      onFinish={onFinish}
      controls={<>
        <Slider label="TTL" value={ttl} min={1} max={60} onChange={setTtl} format={(v) => `${bn(v)} ${tr('সে.', 's')}`} />
        <Slider label={tr('Cache-এর আকার (item)', 'Cache size (items)')} value={size} min={5} max={50} onChange={setSize} />
        <Choice label={tr('জায়গা শেষ হলে ফেলব', 'When full, evict')} value={policy} onChange={setPolicy} options={[{ id: 'lru', label: 'LRU' }, { id: 'fifo', label: 'FIFO' }, { id: 'random', label: 'Random' }]} />
        <Slider label={tr('Price বদল (write / সে.)', 'Price changes (writes / s)')} value={writes} min={0} max={10} onChange={setWrites} />
        <Toggle label={tr('Write হলে cache থেকে মুছুন', 'Invalidate the cache on write')} on={invalidate} onChange={setInvalidate} />
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-route" />{tr('cache-এ', 'in cache')}</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-[#3FD38A]" />hit</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-parcel" />miss → DB</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-coral" />{tr('পুরনো দাম', 'stale price')}</span>
            <span className="ml-auto text-muted">{tr('বাঁ থেকে ডানে: বেশি জনপ্রিয় → কম', 'Left to right: most popular → least')}</span>
          </div>
          <div className="grid flex-1 grid-cols-10 gap-1.5" role="img" aria-label={tr(`${bn(KEYS)}টা product, ${bn(st.cache.size)}টা cache-এ`, `${KEYS} products, ${st.cache.size} in cache`)}>
            {Array.from({ length: KEYS }, (_, k) => {
              const f = st.flash.get(k);
              const fresh = f && st.t - f.t < 0.35;
              const inCache = st.cache.has(k);
              const bg = fresh ? (f!.kind === 'hit' ? '#3FD38A' : f!.kind === 'stale' ? '#E0483E' : '#FFC02E') : inCache ? '#0B8A7A' : '#E3E6DF';
              return <span key={k} className="aspect-square rounded-md border-2 border-ink transition-colors duration-150" style={{ background: bg, transform: fresh ? 'scale(1.12)' : undefined }} />;
            })}
          </div>
          {!settled && <p className="m-0 text-sm text-muted">{tr('মাপা হচ্ছে…', 'Measuring…')} ({bn(st.buckets.length)}/{bn(5)} {tr('সে.', 's')})</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('Hit rate ৮০% বা তার বেশি করুন', 'Get the hit rate to 80% or more'), done: done[0]!, hint: tr('জনপ্রিয় item যেন তাক থেকে না পড়ে: আকার আর TTL বাড়ান, LRU চেষ্টা করুন।', 'Keep popular items on the shelf: grow the size and TTL, try LRU.') },
        { text: tr('DB-তে read সেকেন্ডে ৬ বা তার কম আনুন', 'Bring DB reads down to 6 a second or fewer'), done: done[1]!, hint: tr('৪০টা read-এর ৮৫% hit হলে DB পায় ৬টা।', 'If 85% of 40 reads hit, the DB gets 6.') },
        { text: tr('দাম সেকেন্ডে ৫ বার বদলাচ্ছে: stale ২%-এর নিচে, hit rate ৬০%+', 'Prices change 5 times a second: stale under 2%, hit rate 60%+'), done: done[2]!, hint: tr('TTL ছোট করলে hit কমে। Write-এর সময় মুছে দিলে?', 'A shorter TTL lowers hits. What about deleting on write?') },
      ]}
    />
  );
}
