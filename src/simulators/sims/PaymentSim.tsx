import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

interface Entry { account: string; amount: number; pay: number }
interface Attempt { pay: number; text: string; tone: 'good' | 'bad' | 'neutral' }

/** Level 26 · payment retries, idempotency keys and a double-entry ledger. */
export function PaymentSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [drop, setDrop] = useState(true);
  const [idem, setIdem] = useState(false);
  const [double, setDouble] = useState(false);
  const [charges, setCharges] = useState<{ pay: number; key: string }[]>([]);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [log, setLog] = useState<Attempt[]>([]);
  const [pays, setPays] = useState(0);
  const [hist, setHist] = useState({ doubleSeen: false, safeRetry: false });

  const pay = () => {
    const id = pays + 1;
    const key = idem ? `ord-${id}` : `try-${id}-`;
    let newCharges = [...charges];
    let newLedger = [...ledger];
    const lines: Attempt[] = [];
    const tries = drop ? 2 : 1;
    let chargedThis = 0;
    for (let t = 0; t < tries; t++) {
      const k = idem ? key : `${key}${t}`;
      if (newCharges.some((c) => c.key === k)) { lines.push({ pay: id, text: tr(`চেষ্টা ${bn(t + 1)}: একই key ${k}, আগের ফলই ফেরত, নতুন charge নয়`, `Try ${t + 1}: same key ${k}, earlier result returned, no new charge`), tone: 'good' }); continue; }
      newCharges = [...newCharges, { pay: id, key: k }];
      chargedThis++;
      newLedger = [...newLedger, { account: tr('ক্রেতা', 'Customer'), amount: -500, pay: id }, ...(double ? [{ account: 'ParcelGo', amount: 500, pay: id }] : [])];
      lines.push({ pay: id, text: drop && t === 0 ? tr(`চেষ্টা ১: ৳৫০০ কাটা হল, কিন্তু উত্তর পথে হারাল → app আবার চেষ্টা করে`, `Try 1: ৳500 charged, but the reply was lost → the app retries`) : tr(`চেষ্টা ${bn(t + 1)}: ৳৫০০ কাটা হল`, `Try ${t + 1}: ৳500 charged`), tone: t > 0 ? 'bad' : 'neutral' });
    }
    setCharges(newCharges);
    setLedger(newLedger);
    setPays(id);
    setLog((l) => [...lines.reverse(), ...l].slice(0, 8));
    setHist((h) => ({ doubleSeen: h.doubleSeen || chargedThis > 1, safeRetry: h.safeRetry || (drop && chargedThis === 1) }));
  };
  const reset = () => { setCharges([]); setLedger([]); setLog([]); setPays(0); };

  const overcharged = charges.length - pays;
  const sum = ledger.reduce((a, e) => a + e.amount, 0);
  const balanced = ledger.length > 0 && sum === 0;
  const done = useLatched([
    hist.doubleSeen,
    hist.safeRetry,
    pays >= 3 && balanced && overcharged === 0,
  ]);
  const metrics: Metric[] = [
    { label: tr('অর্ডার / charge', 'Orders / charges'), value: `${bn(pays)} / ${bn(charges.length)}`, tone: overcharged > 0 ? 'bad' : pays ? 'good' : 'neutral' },
    { label: tr('বাড়তি কাটা', 'Overcharged'), value: `৳${bn(overcharged * 500)}`, tone: overcharged > 0 ? 'bad' : 'good' },
    { label: tr('Ledger-এর যোগফল', 'Ledger sum'), value: ledger.length ? `৳${bn(sum)}` : '—', tone: ledger.length ? (balanced ? 'good' : 'bad') : 'neutral' },
  ];

  return (
    <SimFrame
      title={tr('টাকা যেন দুবার না কাটে', 'Never charge twice')}
      intro={tr('ক্রেতা ৳৫০০-র delivery fee দেয়। Network মাঝে মাঝে উত্তর হারায়, app তখন আবার চেষ্টা করে।', 'A customer pays a ৳500 delivery fee. The network sometimes loses the reply, and then the app retries.')}
      onFinish={onFinish}
      controls={<>
        <Toggle label={tr('Network উত্তর হারায়', 'Network loses replies')} on={drop} onChange={setDrop} />
        <Toggle label={tr('Idempotency key পাঠান', 'Send an idempotency key')} on={idem} onChange={setIdem} />
        <Toggle label="Double-entry ledger" on={double} onChange={setDouble} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={pay}>{tr('৳৫০০ pay করুন', 'Pay ৳500')}</ActionButton>
          <ActionButton onClick={reset}>{tr('খাতা নতুন করুন', 'Reset the ledger')}</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
        <Flow label={tr('App থেকে payment service হয়ে PSP', 'From the app through the payment service to the PSP')} h={26} nodes={[
          { id: 'a', label: 'App', x: 10, y: 13 },
          { id: 'p', label: 'Payment svc', x: 50, y: 13, w: 20, sub: idem ? tr('key দেখে', 'checks keys') : undefined },
          { id: 'b', label: 'PSP', x: 90, y: 13, tone: overcharged > 0 ? 'hot' : 'ok' },
        ]} links={[
          { from: 'a', to: 'p', rate: 2, mix: drop ? 0.4 : 0, mixColor: '#2F6FDE' },
          { from: 'p', to: 'b', rate: 2, mix: drop && !idem ? 0.4 : 0, mixColor: '#E0483E' },
          { from: 'p', to: 'a', rate: 2, drop: drop ? 0.4 : 0, color: '#2F6FDE' },
        ]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            <li className="text-xs font-bold text-muted">{tr('Payment-এর ঘটনা', 'Payment events')}</li>
            {log.map((l, i) => <li key={`${log.length}-${i}`} className={`pop-in rounded-lg px-3 py-1.5 ${l.tone === 'good' ? 'bg-route-soft' : l.tone === 'bad' ? 'bg-coral-soft' : 'bg-white'}`}><b>#{bn(l.pay)}</b> {l.text}</li>)}
            {!log.length && <li className="text-muted">{tr('Pay চাপুন।', 'Press pay.')}</li>}
          </ol>
          <div className="min-w-0">
            <div className="text-xs font-bold text-muted">Ledger</div>
            <div className="overflow-x-auto">
              <table className="mt-1 w-full border-collapse font-mono text-xs">
                <thead><tr className="text-left"><th className="border-b-2 border-ink py-1">#</th><th className="border-b-2 border-ink">Account</th><th className="border-b-2 border-ink text-right">৳</th></tr></thead>
                <tbody>
                  {ledger.slice(-10).map((e, i) => <tr key={i}><td className="py-0.5">{bn(e.pay)}</td><td>{e.account}</td><td className={`text-right ${e.amount < 0 ? 'text-coral-deep' : 'text-route-deep'}`}>{bn(e.amount)}</td></tr>)}
                </tbody>
                {ledger.length > 0 && <tfoot><tr><td colSpan={2} className="border-t-2 border-ink pt-1 font-bold">{tr('যোগফল', 'Sum')}</td><td className={`border-t-2 border-ink text-right font-bold ${balanced ? 'text-route-deep' : 'text-coral-deep'}`}>{bn(sum)}</td></tr></tfoot>}
              </table>
            </div>
          </div>
        </div>
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('উত্তর হারালে retry-তে টাকা দুবার কাটতে দেখুন', 'When the reply is lost, see a retry charge twice'), done: done[0]! },
        { text: tr('উত্তর হারালেও retry-তে টাকা একবারই কাটুক', 'Even when the reply is lost, the retry charges only once'), done: done[1]! },
        { text: tr('৩+ payment, বাড়তি কাটা নেই, আর ledger-এর যোগফল ০', '3+ payments, no overcharges, and the ledger sums to 0'), done: done[2]!, hint: tr('প্রতিটা লেনদেন দুই জায়গায় লেখা হলে যোগফল মেলে। দরকার হলে খাতা নতুন করুন।', 'Write every transaction in two places and the sum balances. Reset the ledger if needed.') },
      ]}
    />
  );
}
