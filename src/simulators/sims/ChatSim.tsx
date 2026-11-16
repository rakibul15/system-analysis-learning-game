import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, Choice, SimFrame, Slider, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

type Protocol = 'poll' | 'long' | 'ws';
const PROTO: Record<Protocol, { reqPerMin: number; latency: number; label: string }> = {
  poll: { reqPerMin: 30, latency: 1000, label: tr('প্রতি ২ সে.-এ জিজ্ঞেস', 'asks every 2 s') },
  long: { reqPerMin: 2, latency: 80, label: tr('উত্তর না আসা পর্যন্ত ধরে রাখে', 'holds until there is an answer') },
  ws: { reqPerMin: 0.2, latency: 30, label: tr('একটা খোলা সংযোগ', 'one open connection') },
};
const BLIP = 5;

interface Line { who: 'rider' | 'system'; text: string; tone?: 'good' | 'bad'; delivered?: boolean }

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
    const text = tr(`ভাই, গেটে আছি (${bn(log.length + 1)})`, `I'm at the gate (${log.length + 1})`);
    if (riderOnline) add({ who: 'rider', text: tr(`পৌঁছেছে ${bn(p.latency)} ms-এ: “${text}”`, `Delivered in ${p.latency} ms: “${text}”`), tone: p.latency <= 100 ? 'good' : undefined, delivered: true });
    else if (store) { setPending((x) => [...x, text]); add({ who: 'system', text: tr('Rider offline: message database-এ জমা রইল', 'Rider offline: message stored in the database') }); }
    else add({ who: 'system', text: tr('Rider offline: message হারিয়ে গেল!', 'Rider offline: message lost!'), tone: 'bad' });
  };
  const toggleRider = () => {
    const next = !riderOnline;
    setRiderOnline(next);
    if (next && pending.length) {
      add({ who: 'rider', text: tr(`ফিরে এসে ${bn(pending.length)}টা জমা message পেল`, `Back online and received ${pending.length} stored messages`), tone: 'good' });
      setPending([]);
      setEvents((e) => ({ ...e, offlineKept: true }));
    } else add({ who: 'system', text: next ? tr('Rider আবার online', 'Rider back online') : tr('Rider-এর ফোন বন্ধ', 'Rider\'s phone off') });
  };
  const blip = () => {
    const ok = timeout > BLIP;
    add({ who: 'system', text: ok ? tr(`${bn(BLIP)} সে.-এর network ঝাঁকুনি: heartbeat timeout ${bn(timeout)} সে., status 'online'-ই রইল`, `A ${BLIP} s network blip: heartbeat timeout is ${timeout} s, status stayed 'online'`) : tr(`${bn(BLIP)} সে.-এর ঝাঁকুনিতেই rider 'offline' দেখাল, তারপর আবার 'online': ঝিকিমিকি!`, `A ${BLIP} s blip showed the rider 'offline', then 'online' again: flicker!`), tone: ok ? 'good' : 'bad' });
    if (ok && timeout <= 30) setEvents((e) => ({ ...e, blipOk: true }));
  };

  const done = useLatched([
    log.some((l) => l.tone === 'good' && l.delivered) && proto !== 'poll' && p.reqPerMin <= 2,
    events.offlineKept,
    events.blipOk,
  ]);
  const metrics: Metric[] = [
    { label: tr('Idle অবস্থায় request / মিনিট', 'Idle requests / minute'), value: bn(p.reqPerMin, { grouping: false }), tone: p.reqPerMin > 2 ? 'bad' : 'good' },
    { label: tr('Message পৌঁছাতে', 'Message delivery'), value: `${bn(p.latency)} ms`, tone: p.latency > 100 ? 'bad' : 'good' },
    { label: tr('Offline ধরা পড়বে', 'Offline detected'), value: tr(`${bn(timeout)} সে. পরে`, `after ${timeout} s`), tone: timeout > 30 ? 'bad' : 'neutral' },
  ];

  return (
    <SimFrame
      title={tr('Rider-এর সাথে chat', 'Chat with the rider')}
      intro={tr('ক্রেতা আর rider-এর chat। দ্রুত পৌঁছানো, ফোন বন্ধ থাকলেও না হারানো, আর online/offline যেন বারবার না ঝিকমিক করে।', 'Chat between customer and rider. Fast delivery, nothing lost while a phone is off, and online/offline that does not flicker.')}
      onFinish={onFinish}
      controls={<>
        <Choice label={tr('সংযোগ', 'Connection')} value={proto} onChange={setProto} options={[{ id: 'poll', label: 'Polling' }, { id: 'long', label: 'Long polling' }, { id: 'ws', label: 'WebSocket' }]} />
        <Toggle label={tr('Offline message database-এ রাখুন', 'Keep offline messages in the database')} on={store} onChange={setStore} />
        <Slider label="Heartbeat timeout" value={timeout} min={1} max={60} onChange={setTimeoutS} format={(v) => `${bn(v)} ${tr('সে.', 's')}`} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={send}>{tr('Message পাঠান', 'Send a message')}</ActionButton>
          <ActionButton onClick={toggleRider}>{riderOnline ? tr('Rider-এর ফোন বন্ধ', 'Rider\'s phone off') : tr('Rider-এর ফোন চালু', 'Rider\'s phone on')}</ActionButton>
          <ActionButton tone="warn" onClick={blip}>{tr('Network ঝাঁকুনি', 'Network blip')}</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={tr(`${p.label}: idle অবস্থায় মিনিটে ${p.reqPerMin}টা request`, `${p.label}: ${p.reqPerMin} requests a minute while idle`)} h={22} nodes={[
            { id: 'c', label: tr('ক্রেতা', 'Customer'), x: 10, y: 11 },
            { id: 's', label: proto === 'ws' ? 'WebSocket server' : 'Chat server', x: 50, y: 11, w: 22, tone: proto === 'poll' ? 'hot' : 'ok' },
            { id: 'r', label: 'Rider', x: 90, y: 11, tone: riderOnline ? 'ok' : 'down' },
          ]} links={[
            { from: 'c', to: 's', rate: proto === 'poll' ? 8 : proto === 'long' ? 1 : 0.3, color: '#AAB3A8' },
            { from: 's', to: 'r', rate: riderOnline ? (proto === 'ws' ? 1.5 : 0.8) : 0, secs: p.latency / 400 + 0.4 },
          ]} />
          <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm">
            <span className="font-bold">{tr('ক্রেতা', 'Customer')}</span>
            <span className="text-xs text-muted">{p.label}</span>
            <span className="flex items-center gap-1.5 font-bold">Rider <i className={`inline-block h-3 w-3 rounded-full border-2 border-ink ${riderOnline ? 'bg-route' : 'bg-locked'}`} /></span>
          </div>
          {pending.length > 0 && <p className="m-0 rounded-lg bg-parcel-soft px-3 py-1.5 text-sm">{tr('জমা:', 'Stored:')} {bn(pending.length)} {tr('টা message', 'messages')}</p>}
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {log.map((l, i) => (
              <li key={log.length - i} className={`pop-in rounded-lg px-3 py-1.5 ${l.tone === 'good' ? 'bg-route-soft' : l.tone === 'bad' ? 'bg-coral-soft' : 'bg-white'} ${l.who === 'rider' ? 'self-end' : 'self-start'}`}>{l.text}</li>
            ))}
            {!log.length && <li className="text-muted">{tr('একটা message পাঠান।', 'Send a message.')}</li>}
          </ol>
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('Message ১০০ ms-এর মধ্যে পৌঁছান, idle-এ মিনিটে ২টার বেশি request ছাড়া', 'Deliver within 100 ms, with no more than 2 idle requests a minute'), done: done[0]! },
        { text: tr('Rider-এর ফোন বন্ধ থাকতে message পাঠান, ফোন চালু হলে যেন পায়', 'Send while the rider\'s phone is off; they get it when it comes back on'), done: done[1]! },
        { text: tr(`${bn(BLIP)} সে.-এর network ঝাঁকুনিতে status যেন না ঝিকমিক করে (তবু ৩০ সে.-এর মধ্যে আসল offline ধরা পড়ুক)`, `No status flicker on a ${BLIP} s network blip (but a real offline is still caught within 30 s)`), done: done[2]!, hint: tr('Timeout ঝাঁকুনির চেয়ে লম্বা, কিন্তু খুব লম্বা নয়।', 'A timeout longer than the blip, but not too long.') },
      ]}
    />
  );
}
