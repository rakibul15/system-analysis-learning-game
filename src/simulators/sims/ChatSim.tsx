import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, Choice, SimFrame, Slider, Toggle, useLatched, type Metric } from '../frame/SimFrame';

type Protocol = 'poll' | 'long' | 'ws';
const PROTO: Record<Protocol, { reqPerMin: number; latency: number; label: string }> = {
  poll: { reqPerMin: 30, latency: 1000, label: 'প্রতি ২ সে.-এ জিজ্ঞেস' },
  long: { reqPerMin: 2, latency: 80, label: 'উত্তর না আসা পর্যন্ত ধরে রাখে' },
  ws: { reqPerMin: 0.2, latency: 30, label: 'একটা খোলা সংযোগ' },
};
const BLIP = 5;

interface Line { who: 'rider' | 'system'; text: string; tone?: 'good' | 'bad' }

/** Level 12 · customer ↔ rider chat: protocol, offline storage, heartbeat presence. */
export function ChatSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [proto, setProto] = useState<Protocol>('poll');
  const [store, setStore] = useState(false);
  const [timeout, setTimeoutS] = useState(3);
  const [riderOnline, setRiderOnline] = useState(true);
  const [pending, setPending] = useState<string[]>([]);
  const [log, setLog] = useState<Line[]>([]);
  const [events, setEvents] = useState({ offlineKept: false, blipOk: false });
  const p = PROTO[proto];
  const add = (l: Line) => setLog((x) => [l, ...x].slice(0, 7));

  const send = () => {
    const text = `ভাই, গেটে আছি (${bn(log.length + 1)})`;
    if (riderOnline) add({ who: 'rider', text: `পৌঁছেছে ${bn(p.latency)} ms-এ: “${text}”`, tone: p.latency <= 100 ? 'good' : undefined });
    else if (store) { setPending((x) => [...x, text]); add({ who: 'system', text: 'Rider offline: message database-এ জমা রইল' }); }
    else add({ who: 'system', text: 'Rider offline: message হারিয়ে গেল!', tone: 'bad' });
  };
  const toggleRider = () => {
    const next = !riderOnline;
    setRiderOnline(next);
    if (next && pending.length) {
      add({ who: 'rider', text: `ফিরে এসে ${bn(pending.length)}টা জমা message পেল`, tone: 'good' });
      setPending([]);
      setEvents((e) => ({ ...e, offlineKept: true }));
    } else add({ who: 'system', text: next ? 'Rider আবার online' : 'Rider-এর ফোন বন্ধ' });
  };
  const blip = () => {
    const ok = timeout > BLIP;
    add({ who: 'system', text: ok ? `${bn(BLIP)} সে.-এর network ঝাঁকুনি: heartbeat timeout ${bn(timeout)} সে., status 'online'-ই রইল` : `${bn(BLIP)} সে.-এর ঝাঁকুনিতেই rider 'offline' দেখাল, তারপর আবার 'online': ঝিকিমিকি!`, tone: ok ? 'good' : 'bad' });
    if (ok && timeout <= 30) setEvents((e) => ({ ...e, blipOk: true }));
  };

  const done = useLatched([
    log.some((l) => l.tone === 'good' && l.text.startsWith('পৌঁছেছে')) && proto !== 'poll' && p.reqPerMin <= 2,
    events.offlineKept,
    events.blipOk,
  ]);
  const metrics: Metric[] = [
    { label: 'Idle অবস্থায় request / মিনিট', value: bn(p.reqPerMin, { grouping: false }), tone: p.reqPerMin > 2 ? 'bad' : 'good' },
    { label: 'Message পৌঁছাতে', value: `${bn(p.latency)} ms`, tone: p.latency > 100 ? 'bad' : 'good' },
    { label: 'Offline ধরা পড়বে', value: `${bn(timeout)} সে. পরে`, tone: timeout > 30 ? 'bad' : 'neutral' },
  ];

  return (
    <SimFrame
      title="Rider-এর সাথে chat"
      intro="ক্রেতা আর rider-এর chat। দ্রুত পৌঁছানো, ফোন বন্ধ থাকলেও না হারানো, আর online/offline যেন বারবার না ঝিকমিক করে।"
      onFinish={onFinish}
      controls={<>
        <Choice label="সংযোগ" value={proto} onChange={setProto} options={[{ id: 'poll', label: 'Polling' }, { id: 'long', label: 'Long polling' }, { id: 'ws', label: 'WebSocket' }]} />
        <Toggle label="Offline message database-এ রাখুন" on={store} onChange={setStore} />
        <Slider label="Heartbeat timeout" value={timeout} min={1} max={60} onChange={setTimeoutS} format={(v) => `${bn(v)} সে.`} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={send}>Message পাঠান</ActionButton>
          <ActionButton onClick={toggleRider}>{riderOnline ? 'Rider-এর ফোন বন্ধ' : 'Rider-এর ফোন চালু'}</ActionButton>
          <ActionButton tone="warn" onClick={blip}>Network ঝাঁকুনি</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm">
            <span className="font-bold">ক্রেতা</span>
            <span className="text-xs text-muted">{p.label}</span>
            <span className="flex items-center gap-1.5 font-bold">Rider <i className={`inline-block h-3 w-3 rounded-full border-2 border-ink ${riderOnline ? 'bg-route' : 'bg-locked'}`} /></span>
          </div>
          {pending.length > 0 && <p className="m-0 rounded-lg bg-parcel-soft px-3 py-1.5 text-sm">জমা: {bn(pending.length)}টা message</p>}
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {log.map((l, i) => (
              <li key={log.length - i} className={`pop-in rounded-lg px-3 py-1.5 ${l.tone === 'good' ? 'bg-route-soft' : l.tone === 'bad' ? 'bg-coral-soft' : 'bg-white'} ${l.who === 'rider' ? 'self-end' : 'self-start'}`}>{l.text}</li>
            ))}
            {!log.length && <li className="text-muted">একটা message পাঠান।</li>}
          </ol>
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'Message ১০০ ms-এর মধ্যে পৌঁছান, idle-এ মিনিটে ২টার বেশি request ছাড়া', done: done[0]! },
        { text: 'Rider-এর ফোন বন্ধ থাকতে message পাঠান, ফোন চালু হলে যেন পায়', done: done[1]! },
        { text: `${bn(BLIP)} সে.-এর network ঝাঁকুনিতে status যেন না ঝিকমিক করে (তবু ৩০ সে.-এর মধ্যে আসল offline ধরা পড়ুক)`, done: done[2]!, hint: 'Timeout ঝাঁকুনির চেয়ে লম্বা, কিন্তু খুব লম্বা নয়।' },
      ]}
    />
  );
}
