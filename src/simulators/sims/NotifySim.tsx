import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { ActionButton, SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

type Outcome = 'once' | 'twice' | 'lost';
interface Run { flaky: boolean; retry: boolean; dedupe: boolean; results: { outcome: Outcome; tries: number }[] }

/**
 * Level 10 · 20 delivery SMS through a provider that sometimes fails and sometimes
 * delivers but loses the acknowledgement. Retry fixes losses, dedupe fixes doubles.
 */
export function NotifySim({ onFinish }: { onFinish: (done: number) => void }) {
  const [flaky, setFlaky] = useState(true);
  const [retry, setRetry] = useState(false);
  const [dedupe, setDedupe] = useState(false);
  const [runs, setRuns] = useState(0);
  const [run, setRun] = useState<Run | null>(null);

  const send = () => {
    const rand = mulberry32(100 + runs);
    const results = Array.from({ length: 20 }, () => {
      let delivered = 0, tries = 0;
      for (;;) {
        tries++;
        const r = rand();
        const fail = flaky && r < 0.2;
        const ackLost = flaky && !fail && r < 0.35;
        if (!fail && !(dedupe && delivered > 0)) delivered++;
        if (!fail && !ackLost) break; // provider said OK
        if (!retry || tries >= 5) break;
      }
      return { outcome: (delivered === 0 ? 'lost' : delivered === 1 ? 'once' : 'twice') as Outcome, tries };
    });
    setRuns((n) => n + 1);
    setRun({ flaky, retry, dedupe, results });
  };

  const lost = run?.results.filter((x) => x.outcome === 'lost').length ?? 0;
  const dup = run?.results.filter((x) => x.outcome === 'twice').length ?? 0;
  const once = run?.results.filter((x) => x.outcome === 'once').length ?? 0;
  const done = useLatched([
    !!run && run.flaky && !run.retry && lost > 0,
    !!run && run.flaky && run.retry && lost === 0,
    !!run && run.flaky && once === 20,
  ]);
  const metrics: Metric[] = [
    { label: tr('ঠিক একবার পৌঁছেছে', 'Delivered exactly once'), value: run ? `${bn(once)}/${bn(20)}` : '—', tone: run ? (once === 20 ? 'good' : 'neutral') : 'neutral' },
    { label: tr('হারিয়েছে', 'Lost'), value: run ? bn(lost) : '—', tone: lost ? 'bad' : 'neutral' },
    { label: tr('দুবার পৌঁছেছে', 'Delivered twice'), value: run ? bn(dup) : '—', tone: dup ? 'bad' : 'neutral' },
  ];
  const color: Record<Outcome, string> = { once: '#0B8A7A', twice: '#FFC02E', lost: '#E0483E' };
  const label: Record<Outcome, string> = { once: '✓', twice: `×${bn(2)}`, lost: '✕' };

  return (
    <SimFrame
      title={tr('SMS ঠিকঠাক পৌঁছান', 'Deliver the SMS properly')}
      intro={tr("২০টা 'parcel আসছে' SMS। SMS provider মাঝে মাঝে ব্যর্থ হয়, আবার কখনো SMS পাঠিয়ে দেয় কিন্তু 'পাঠিয়েছি' উত্তরটা হারিয়ে যায়।", "20 'parcel on its way' SMS. The provider sometimes fails, and sometimes sends the SMS but loses the 'sent' reply.")}
      onFinish={onFinish}
      controls={<>
        <Toggle label={tr('Provider অনির্ভরযোগ্য', 'Unreliable provider')} on={flaky} onChange={setFlaky} />
        <Toggle label={tr('ব্যর্থ হলে আবার চেষ্টা (৫ বার পর্যন্ত)', 'Retry on failure (up to 5 times)')} on={retry} onChange={setRetry} />
        <Toggle label={tr('Dedupe (message id মনে রাখুন)', 'Dedupe (remember message IDs)')} on={dedupe} onChange={setDedupe} />
        <ActionButton tone="go" onClick={send}>{tr('২০টা SMS পাঠান', 'Send 20 SMS')}</ActionButton>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={tr('Queue থেকে worker, provider হয়ে ফোনে', 'From the queue to a worker, through the provider to the phone')} h={24} nodes={[
            { id: 'q', label: 'Queue', x: 9, y: 12 }, { id: 'w', label: 'Worker', x: 36, y: 12 },
            { id: 'p', label: 'Provider', x: 63, y: 12, tone: flaky ? 'hot' : 'ok' }, { id: 'f', label: tr('ফোন', 'Phone'), x: 90, y: 12 },
          ]} links={[
            { from: 'q', to: 'w', rate: 4 },
            { from: 'w', to: 'p', rate: 4, mix: retry && flaky ? 0.3 : 0, mixColor: '#2F6FDE' },
            { from: 'p', to: 'f', rate: 4, drop: flaky && !retry ? 0.2 : 0, mix: flaky && retry && !dedupe ? 0.15 : 0 },
          ]} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span>{tr('নীল = আবার চেষ্টা, হলুদ = একই SMS দ্বিতীয়বার, লাল = হারাল', 'Blue = retry, yellow = the same SMS a second time, red = lost')}</span>
            <span className="ml-auto flex gap-3">
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-route" />{tr('একবার', 'once')}</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-parcel" />{tr('দুবার', 'twice')}</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-coral" />{tr('হারিয়েছে', 'lost')}</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" aria-label={tr('২০টা SMS-এর ফল', 'Results for 20 SMS')}>
            {(run?.results ?? Array.from({ length: 20 }, () => null)).map((x, i) => (
              <div key={`${runs}-${i}`} className="pop-in grid aspect-square place-items-center rounded-xl border-2 border-ink text-sm font-bold" style={{ background: x ? color[x.outcome] : '#E3E6DF', color: x?.outcome === 'twice' || !x ? '#16252D' : '#FFFFFF', animationDelay: `${i * 25}ms` }}>
                <span>{x ? label[x.outcome] : bn(i + 1)}</span>
                {x && x.tries > 1 && <span className="text-[10px] leading-none">{bn(x.tries)} {tr('বার', 'tries')}</span>}
              </div>
            ))}
          </div>
          {run && <p className="m-0 text-sm">{lost ? tr('Retry না থাকলে ব্যর্থ SMS চিরতরে হারায়।', 'Without retries, a failed SMS is lost for good.') : dup ? tr('Retry আছে কিন্তু উত্তর হারালে একই SMS আবার যায়: ক্রেতা দুবার পায়।', 'Retries are on, but when the reply is lost the same SMS goes again: the customer gets it twice.') : tr('প্রতিটা SMS ঠিক একবার: at-least-once পাঠানো + dedupe।', 'Every SMS exactly once: at-least-once delivery + dedupe.')}</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('Retry ছাড়া পাঠিয়ে দেখুন কিছু SMS হারায়', 'Send without retries and see some SMS get lost'), done: done[0]! },
        { text: tr('একটাও SMS যেন না হারায়', 'Lose not a single SMS'), done: done[1]! },
        { text: tr('২০টা SMS-ই ঠিক একবার করে পৌঁছান', 'Deliver all 20 SMS exactly once each'), done: done[2]!, hint: tr('দুবার যাওয়া SMS কে আটকাবে?', 'Who stops an SMS going twice?') },
      ]}
    />
  );
}
