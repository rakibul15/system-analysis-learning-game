import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow, useClock, vis } from '../knob/anim';

const DAU = 10_000_000;
const ORDERS = 2;
const ROW_KB = 1;
const PHOTO_SHARE = 0.1;
const PHOTO_KB = 500;
const YEARS = 5;

const qps = (DAU * ORDERS) / 86_400; // ≈ 231
const peak = qps * 2; // ≈ 463
const perDayKb = DAU * ORDERS * ROW_KB + DAU * ORDERS * PHOTO_SHARE * PHOTO_KB;
const storageTb = (perDayKb * 365 * YEARS) / 1e9; // ≈ 1,862 TB

const within = (guess: number, truth: number) => guess > 0 && Math.abs(guess - truth) / truth <= 0.25;

/** Level 3 · back-of-the-envelope: QPS, peak and five-year storage, ±25% passes. */
export function EstimationSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [g, setG] = useState({ qps: '', peak: '', storage: '' });
  const [checked, setChecked] = useState<null | { qps: boolean; peak: boolean; storage: boolean }>(null);
  const [showWork, setShowWork] = useState(false);
  const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));
  const check = () => setChecked({ qps: within(num(g.qps), qps), peak: within(num(g.peak), peak), storage: within(num(g.storage), storageTb) });
  const done = useLatched([!!checked?.qps, !!checked?.peak, !!checked?.storage]);

  const field = (key: keyof typeof g, label: string, unit: string) => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <span className="flex items-center gap-2">
        <input inputMode="decimal" value={g[key]} onChange={(e) => setG({ ...g, [key]: e.target.value })} className={`min-h-[44px] w-full rounded-xl border-2 px-3 font-mono text-lg ${checked ? (checked[key] ? 'border-route bg-route-soft' : 'border-coral bg-coral-soft') : 'border-ink'}`} />
        <span className="w-12 text-muted">{unit}</span>
      </span>
    </label>
  );
  const metrics: Metric[] = checked
    ? [
        { label: 'গড় QPS', value: checked.qps ? 'মিলেছে' : 'আবার ভাবুন', tone: checked.qps ? 'good' : 'bad' },
        { label: 'Peak QPS', value: checked.peak ? 'মিলেছে' : 'আবার ভাবুন', tone: checked.peak ? 'good' : 'bad' },
        { label: '৫ বছরের storage', value: checked.storage ? 'মিলেছে' : 'আবার ভাবুন', tone: checked.storage ? 'good' : 'bad' },
      ]
    : [{ label: 'সীমা', value: '±২৫%' }];

  return (
    <SimFrame
      title="খামের পিঠে হিসাব"
      intro="Calculator লাগবে না, মোটামুটি সংখ্যাই যথেষ্ট। সঠিক উত্তরের ২৫%-এর মধ্যে থাকলেই পাস।"
      onFinish={onFinish}
      controls={<>
        {field('qps', 'গড় order / সে.', 'QPS')}
        {field('peak', 'Peak order / সে.', 'QPS')}
        {field('storage', '৫ বছরে মোট storage', 'TB')}
        <button type="button" onClick={check} className="btn-press min-h-[48px] cursor-pointer rounded-xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D]">মিলিয়ে দেখুন</button>
        <Toggle label="হিসাবের ধাপ দেখান" on={showWork} onChange={setShowWork} />
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4 text-[15px]">
          <LiveOrders qps={qps} />
          <div className="rounded-xl border-2 border-ink bg-white p-3">
            <div className="text-xs font-bold text-muted">ParcelGo-র তথ্য</div>
            <ul className="m-0 mt-1 flex flex-col gap-1 pl-5">
              <li>প্রতিদিন সক্রিয় user: <b>{bn(DAU)}</b> (১ কোটি)</li>
              <li>প্রত্যেকে দিনে গড়ে <b>{bn(ORDERS)}</b>টা order</li>
              <li>প্রতিটা order-এর record: <b>{bn(ROW_KB)} KB</b></li>
              <li><b>{bn(PHOTO_SHARE * 100)}%</b> order-এ parcel-এর ছবি, প্রতিটা <b>{bn(PHOTO_KB)} KB</b></li>
              <li>Peak = গড়ের <b>২ গুণ</b>; data রাখতে হবে <b>{bn(YEARS)} বছর</b></li>
              <li>সুবিধার জন্য: ১ দিন ≈ ১০<sup>৫</sup> সে., ১ TB = ১০<sup>৯</sup> KB</li>
            </ul>
          </div>
          {showWork && (
            <ol className="pop-in m-0 flex flex-col gap-1 rounded-xl border-2 border-dashed border-ink bg-[#FFFBEA] p-3 pl-8 font-mono text-sm">
              <li>১ কোটি × ২ = ২ কোটি order/দিন</li>
              <li>২ কোটি ÷ ১ লাখ সে. ≈ ২০০ QPS (ঠিক হিসাবে ≈ {bn(Math.round(qps))})</li>
              <li>Peak ≈ ২ × ২০০ = ৪০০ QPS</li>
              <li>Record: ২ কোটি × ১ KB = ২০ GB/দিন</li>
              <li>ছবি: ২০ লাখ × ৫০০ KB = ১ TB/দিন</li>
              <li>≈ ১ TB × ৩৬৫ × ৫ ≈ {bn(Math.round(storageTb))} TB (≈ ২ PB)</li>
            </ol>
          )}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'গড় QPS বের করুন', done: done[0]!, hint: 'দিনের মোট order ÷ দিনের সেকেন্ড।' },
        { text: 'Peak QPS বের করুন', done: done[1]! },
        { text: '৫ বছরের storage (TB) বের করুন', done: done[2]!, hint: 'ছবিই আসল ভার; record প্রায় কিছুই না।' },
      ]}
    />
  );
}

/** Orders arriving live at the real average rate, so QPS is something you can watch. */
function LiveOrders({ qps: rate }: { qps: number }) {
  const t = useClock(10);
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-white p-2">
      <div className="min-w-0 flex-1">
        <Flow label="Customer থেকে order আসছে" h={16} nodes={[
          { id: 'u', label: 'Customer', x: 12, y: 8 },
          { id: 'a', label: 'ParcelGo', x: 86, y: 8, tone: 'hot' },
        ]} links={[{ from: 'u', to: 'a', rate: vis(rate) * 1.4, secs: 0.9 }]} />
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold text-muted">খোলার পর order</div>
        <div className="font-mono text-xl font-bold">{bn(Math.floor(t * rate))}</div>
      </div>
    </div>
  );
}
