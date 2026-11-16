import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow, useClock, vis } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

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
        { label: tr('গড় QPS', 'Average QPS'), value: checked.qps ? tr('মিলেছে', 'Matches') : tr('আবার ভাবুন', 'Think again'), tone: checked.qps ? 'good' : 'bad' },
        { label: 'Peak QPS', value: checked.peak ? tr('মিলেছে', 'Matches') : tr('আবার ভাবুন', 'Think again'), tone: checked.peak ? 'good' : 'bad' },
        { label: tr('৫ বছরের storage', '5-year storage'), value: checked.storage ? tr('মিলেছে', 'Matches') : tr('আবার ভাবুন', 'Think again'), tone: checked.storage ? 'good' : 'bad' },
      ]
    : [{ label: tr('সীমা', 'Margin'), value: `±${bn(25)}%` }];

  return (
    <SimFrame
      title={tr('খামের পিঠে হিসাব', 'Back of the envelope')}
      intro={tr('Calculator লাগবে না, মোটামুটি সংখ্যাই যথেষ্ট। সঠিক উত্তরের ২৫%-এর মধ্যে থাকলেই পাস।', 'No calculator needed; rough numbers are enough. Within 25% of the right answer passes.')}
      onFinish={onFinish}
      controls={<>
        {field('qps', tr('গড় order / সে.', 'Average orders / s'), 'QPS')}
        {field('peak', tr('Peak order / সে.', 'Peak orders / s'), 'QPS')}
        {field('storage', tr('৫ বছরে মোট storage', 'Total storage over 5 years'), 'TB')}
        <button type="button" onClick={check} className="btn-press min-h-[48px] cursor-pointer rounded-xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D]">{tr('মিলিয়ে দেখুন', 'Check')}</button>
        <Toggle label={tr('হিসাবের ধাপ দেখান', 'Show the working')} on={showWork} onChange={setShowWork} />
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4 text-[15px]">
          <LiveOrders qps={qps} />
          <div className="rounded-xl border-2 border-ink bg-white p-3">
            <div className="text-xs font-bold text-muted">{tr('ParcelGo-র তথ্য', 'ParcelGo facts')}</div>
            <ul className="m-0 mt-1 flex flex-col gap-1 pl-5">
              <li>{tr('প্রতিদিন সক্রিয় user:', 'Daily active users:')} <b>{bn(DAU)}</b> {tr('(১ কোটি)', '(10 million)')}</li>
              <li>{tr('প্রত্যেকে দিনে গড়ে', 'Each places')} <b>{bn(ORDERS)}</b> {tr('টা order', 'orders a day on average')}</li>
              <li>{tr('প্রতিটা order-এর record:', 'Each order record:')} <b>{bn(ROW_KB)} KB</b></li>
              <li><b>{bn(PHOTO_SHARE * 100)}%</b> {tr('order-এ parcel-এর ছবি, প্রতিটা', 'of orders have a parcel photo of')} <b>{bn(PHOTO_KB)} KB</b></li>
              <li>{tr('Peak = গড়ের', 'Peak =')} <b>{tr('২ গুণ', '2× the average')}</b>{tr('; data রাখতে হবে', '; keep data for')} <b>{bn(YEARS)} {tr('বছর', 'years')}</b></li>
              <li>{tr('সুবিধার জন্য: ১ দিন ≈ ১০', 'Handy: 1 day ≈ 10')}<sup>{bn(5)}</sup> {tr('সে., ১ TB = ১০', 's, 1 TB = 10')}<sup>{bn(9)}</sup> KB</li>
            </ul>
          </div>
          {showWork && (
            <ol className="pop-in m-0 flex flex-col gap-1 rounded-xl border-2 border-dashed border-ink bg-[#FFFBEA] p-3 pl-8 font-mono text-sm">
              <li>{tr('১ কোটি × ২ = ২ কোটি order/দিন', '10 million × 2 = 20 million orders/day')}</li>
              <li>{tr('২ কোটি ÷ ১ লাখ সে. ≈ ২০০ QPS (ঠিক হিসাবে ≈', '20 million ÷ 100,000 s ≈ 200 QPS (exactly ≈')} {bn(Math.round(qps))})</li>
              <li>{tr('Peak ≈ ২ × ২০০ = ৪০০ QPS', 'Peak ≈ 2 × 200 = 400 QPS')}</li>
              <li>{tr('Record: ২ কোটি × ১ KB = ২০ GB/দিন', 'Records: 20 million × 1 KB = 20 GB/day')}</li>
              <li>{tr('ছবি: ২০ লাখ × ৫০০ KB = ১ TB/দিন', 'Photos: 2 million × 500 KB = 1 TB/day')}</li>
              <li>{tr('≈ ১ TB × ৩৬৫ × ৫ ≈', '≈ 1 TB × 365 × 5 ≈')} {bn(Math.round(storageTb))} TB {tr('(≈ ২ PB)', '(≈ 2 PB)')}</li>
            </ol>
          )}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('গড় QPS বের করুন', 'Work out the average QPS'), done: done[0]!, hint: tr('দিনের মোট order ÷ দিনের সেকেন্ড।', 'Orders per day ÷ seconds per day.') },
        { text: tr('Peak QPS বের করুন', 'Work out the peak QPS'), done: done[1]! },
        { text: tr('৫ বছরের storage (TB) বের করুন', 'Work out 5 years of storage (TB)'), done: done[2]!, hint: tr('ছবিই আসল ভার; record প্রায় কিছুই না।', 'Photos are the real weight; records are almost nothing.') },
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
        <Flow label={tr('Customer থেকে order আসছে', 'Orders arriving from customers')} h={16} nodes={[
          { id: 'u', label: 'Customer', x: 12, y: 8 },
          { id: 'a', label: 'ParcelGo', x: 86, y: 8, tone: 'hot' },
        ]} links={[{ from: 'u', to: 'a', rate: vis(rate) * 1.4, secs: 0.9 }]} />
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold text-muted">{tr('খোলার পর order', 'Orders since opening')}</div>
        <div className="font-mono text-xl font-bold">{bn(Math.floor(t * rate))}</div>
      </div>
    </div>
  );
}
