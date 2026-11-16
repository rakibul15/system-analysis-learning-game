import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { toBase62 } from '../lib';
import { ActionButton, Choice, SimFrame, useLatched, type Metric } from '../frame/SimFrame';

type Redirect = '301' | '302';

/** Level 8 · ID → base 62 → short code, then 301 vs 302 under ten clicks. */
export function ShortenerSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [url, setUrl] = useState('https://parcelgo.example/track?order=BD-2026-11-16-778812&phone=01XXXXXXXXX&lang=bn');
  const [nextId, setNextId] = useState(2009215674938n);
  const [code, setCode] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [redirect, setRedirect] = useState<Redirect>('302');
  const [run, setRun] = useState<{ redirect: Redirect; server: number; counted: number } | null>(null);
  const [browserCache, setBrowserCache] = useState(false);

  const shorten = () => {
    const id = nextId;
    const trail: string[] = [];
    let n = id;
    while (n > 0n) { trail.push(`${n.toString()} % 62 = ${(n % 62n).toString()}`); n /= 62n; }
    setSteps(trail);
    setCode(toBase62(id));
    setNextId(id + 1n);
    setBrowserCache(false);
  };
  const clickTen = () => {
    let server = 0, counted = 0, cached = browserCache;
    for (let i = 0; i < 10; i++) {
      if (cached) continue; // browser goes straight to the long URL
      server++; counted++;
      if (redirect === '301') cached = true;
    }
    setBrowserCache(cached);
    setRun({ redirect, server, counted });
  };

  const done = useLatched([
    !!code && code.length === 7,
    !!run && run.redirect === '302' && run.counted === 10,
    !!run && run.redirect === '301' && run.server <= 1,
  ]);
  const metrics: Metric[] = [
    { label: 'Code-এর দৈর্ঘ্য', value: code ? `${bn(code.length)} অক্ষর` : '—', tone: code?.length === 7 ? 'good' : 'neutral' },
    { label: 'Server-এ এসেছে (১০ click)', value: run ? bn(run.server) : '—' },
    { label: 'Analytics-এ গোনা', value: run ? `${bn(run.counted)}/১০` : '—' },
  ];

  return (
    <SimFrame
      title="ছোট link বানান"
      intro="লম্বা tracking link থেকে ৭ অক্ষরের code, তারপর ঠিক করুন redirect কোনটা হবে।"
      onFinish={onFinish}
      controls={<>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">লম্বা URL
          <textarea value={url} onChange={(e) => setUrl(e.target.value)} rows={4} className="rounded-xl border-2 border-ink p-2 font-mono text-xs font-normal" />
        </label>
        <ActionButton tone="go" onClick={shorten}>ছোট করুন</ActionButton>
        <Choice label="Redirect" value={redirect} onChange={(v) => { setRedirect(v); setBrowserCache(false); }} options={[{ id: '301', label: '301 স্থায়ী' }, { id: '302', label: '302 সাময়িক' }]} />
        <ActionButton onClick={clickTen}>একই browser থেকে ১০ click</ActionButton>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="rounded-xl border-2 border-ink bg-white p-3 text-sm">
            <div className="text-xs font-bold text-muted">URL-এর দৈর্ঘ্য</div>
            <div className="font-mono">{bn(url.length)} অক্ষর → {code ? `pgo.to/${code} (${bn(7 + code.length)} অক্ষর)` : '…'}</div>
          </div>
          {code && (
            <div className="pop-in rounded-xl border-2 border-ink bg-white p-3">
              <div className="text-xs font-bold text-muted">ID {nextId - 1n + ''} → base 62, শেষ থেকে পড়ুন</div>
              <ol className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0 font-mono text-xs">
                {steps.map((s, i) => <li key={i} className="rounded bg-[#F0F2EC] px-2 py-1">{s}</li>)}
              </ol>
              <div className="mt-2 font-mono text-3xl font-bold tracking-wider text-route-deep">pgo.to/{code}</div>
            </div>
          )}
          {run && (
            <div className="pop-in grid grid-cols-10 gap-1" aria-label="১০টা click">
              {Array.from({ length: 10 }, (_, i) => {
                const viaServer = i < run.server;
                return <span key={i} className={`grid aspect-square place-items-center rounded-md border-2 border-ink text-[10px] font-bold ${viaServer ? 'bg-parcel' : 'bg-route-soft'}`}>{viaServer ? 'srv' : '↪'}</span>;
              })}
            </div>
          )}
          {run && <p className="m-0 text-sm">{run.redirect === '301' ? 'Browser 301 মনে রাখে: পরের click সরাসরি লম্বা URL-এ, আমাদের server জানেও না।' : '302: প্রতিটা click আমাদের server ঘুরে যায়, তাই গোনা যায়।'}</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'একটা ৭ অক্ষরের short code বানান', done: done[0]! },
        { text: 'Marketing team ১০টা click-ই গুনতে চায়: ঠিক redirect বেছে ১০ click করুন', done: done[1]! },
        { text: 'Server-এর চাপ কমান: ১০ click-এ server-এ ১-এর বেশি request যেন না আসে', done: done[2]! },
      ]}
    />
  );
}
