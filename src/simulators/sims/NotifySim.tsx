import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { ActionButton, SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';

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
    { label: 'ঠিক একবার পৌঁছেছে', value: run ? `${bn(once)}/২০` : '—', tone: run ? (once === 20 ? 'good' : 'neutral') : 'neutral' },
    { label: 'হারিয়েছে', value: run ? bn(lost) : '—', tone: lost ? 'bad' : 'neutral' },
    { label: 'দুবার পৌঁছেছে', value: run ? bn(dup) : '—', tone: dup ? 'bad' : 'neutral' },
  ];
  const color: Record<Outcome, string> = { once: '#0B8A7A', twice: '#FFC02E', lost: '#E0483E' };
  const label: Record<Outcome, string> = { once: '✓', twice: '×২', lost: '✕' };

  return (
    <SimFrame
      title="SMS ঠিকঠাক পৌঁছান"
      intro="২০টা 'parcel আসছে' SMS। SMS provider মাঝে মাঝে ব্যর্থ হয়, আবার কখনো SMS পাঠিয়ে দেয় কিন্তু 'পাঠিয়েছি' উত্তরটা হারিয়ে যায়।"
      onFinish={onFinish}
      controls={<>
        <Toggle label="Provider অনির্ভরযোগ্য" on={flaky} onChange={setFlaky} />
        <Toggle label="ব্যর্থ হলে আবার চেষ্টা (৫ বার পর্যন্ত)" on={retry} onChange={setRetry} />
        <Toggle label="Dedupe (message id মনে রাখুন)" on={dedupe} onChange={setDedupe} />
        <ActionButton tone="go" onClick={send}>২০টা SMS পাঠান</ActionButton>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label="Queue থেকে worker, provider হয়ে ফোনে" h={24} nodes={[
            { id: 'q', label: 'Queue', x: 9, y: 12 }, { id: 'w', label: 'Worker', x: 36, y: 12 },
            { id: 'p', label: 'Provider', x: 63, y: 12, tone: flaky ? 'hot' : 'ok' }, { id: 'f', label: 'ফোন', x: 90, y: 12 },
          ]} links={[
            { from: 'q', to: 'w', rate: 4 },
            { from: 'w', to: 'p', rate: 4, mix: retry && flaky ? 0.3 : 0, mixColor: '#2F6FDE' },
            { from: 'p', to: 'f', rate: 4, drop: flaky && !retry ? 0.2 : 0, mix: flaky && retry && !dedupe ? 0.15 : 0 },
          ]} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span>নীল = আবার চেষ্টা, হলুদ = একই SMS দ্বিতীয়বার, লাল = হারাল</span>
            <span className="ml-auto flex gap-3">
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-route" />একবার</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-parcel" />দুবার</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded bg-coral" />হারিয়েছে</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" aria-label="২০টা SMS-এর ফল">
            {(run?.results ?? Array.from({ length: 20 }, () => null)).map((x, i) => (
              <div key={`${runs}-${i}`} className="pop-in grid aspect-square place-items-center rounded-xl border-2 border-ink text-sm font-bold" style={{ background: x ? color[x.outcome] : '#E3E6DF', color: x?.outcome === 'twice' || !x ? '#16252D' : '#FFFFFF', animationDelay: `${i * 25}ms` }}>
                <span>{x ? label[x.outcome] : bn(i + 1)}</span>
                {x && x.tries > 1 && <span className="text-[10px] leading-none">{bn(x.tries)} বার</span>}
              </div>
            ))}
          </div>
          {run && <p className="m-0 text-sm">{lost ? 'Retry না থাকলে ব্যর্থ SMS চিরতরে হারায়।' : dup ? 'Retry আছে কিন্তু উত্তর হারালে একই SMS আবার যায়: ক্রেতা দুবার পায়।' : 'প্রতিটা SMS ঠিক একবার: at-least-once পাঠানো + dedupe।'}</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'Retry ছাড়া পাঠিয়ে দেখুন কিছু SMS হারায়', done: done[0]! },
        { text: 'একটাও SMS যেন না হারায়', done: done[1]! },
        { text: '২০টা SMS-ই ঠিক একবার করে পৌঁছান', done: done[2]!, hint: 'দুবার যাওয়া SMS কে আটকাবে?' },
      ]}
    />
  );
}
