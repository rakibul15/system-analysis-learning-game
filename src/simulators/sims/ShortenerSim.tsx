import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { toBase62 } from '../lib';
import { ActionButton, Choice, SimFrame, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

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
    { label: tr('Code-এর দৈর্ঘ্য', 'Code length'), value: code ? `${bn(code.length)} ${tr('অক্ষর', 'chars')}` : '—', tone: code?.length === 7 ? 'good' : 'neutral' },
    { label: tr('Server-এ এসেছে (১০ click)', 'Reached the server (10 clicks)'), value: run ? bn(run.server) : '—' },
    { label: tr('Analytics-এ গোনা', 'Counted in analytics'), value: run ? `${bn(run.counted)}/${bn(10)}` : '—' },
  ];

  return (
    <SimFrame
      title={tr('ছোট link বানান', 'Make a short link')}
      intro={tr('লম্বা tracking link থেকে ৭ অক্ষরের code, তারপর ঠিক করুন redirect কোনটা হবে।', 'Turn a long tracking link into a 7-character code, then decide which redirect to use.')}
      onFinish={onFinish}
      controls={<>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">{tr('লম্বা URL', 'Long URL')}
          <textarea value={url} onChange={(e) => setUrl(e.target.value)} rows={4} className="rounded-xl border-2 border-ink p-2 font-mono text-xs font-normal" />
        </label>
        <ActionButton tone="go" onClick={shorten}>{tr('ছোট করুন', 'Shorten')}</ActionButton>
        <Choice label="Redirect" value={redirect} onChange={(v) => { setRedirect(v); setBrowserCache(false); }} options={[{ id: '301', label: tr('301 স্থায়ী', '301 permanent') }, { id: '302', label: tr('302 সাময়িক', '302 temporary') }]} />
        <ActionButton onClick={clickTen}>{tr('একই browser থেকে ১০ click', '10 clicks from the same browser')}</ActionButton>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={redirect === '301' && browserCache ? tr('Browser সরাসরি merchant site-এ যাচ্ছে', 'The browser goes straight to the merchant site') : tr('প্রতিটা click আমাদের server ঘুরে যাচ্ছে', 'Every click passes through our server')} h={30} nodes={[
            { id: 'b', label: 'Browser', x: 10, y: 15, sub: browserCache ? tr('301 মনে আছে', 'remembers 301') : undefined },
            { id: 's', label: 'pgo.to', x: 50, y: 6, tone: browserCache ? 'plain' : 'ok', sub: tr('click গোনে', 'counts clicks') },
            { id: 'm', label: 'Tracking page', x: 88, y: 15, w: 20 },
          ]} links={browserCache
            ? [{ from: 'b', to: 'm', rate: 2.5, color: '#2F6FDE' }]
            : [{ from: 'b', to: 's', rate: code ? 2.5 : 0.6 }, { from: 's', to: 'm', rate: code ? 2.5 : 0.6 }]} />
          <div className="rounded-xl border-2 border-ink bg-white p-3 text-sm">
            <div className="text-xs font-bold text-muted">{tr('URL-এর দৈর্ঘ্য', 'URL length')}</div>
            <div className="font-mono">{bn(url.length)} {tr('অক্ষর', 'chars')} → {code ? `pgo.to/${code} (${bn(7 + code.length)} ${tr('অক্ষর', 'chars')})` : '…'}</div>
          </div>
          {code && (
            <div className="pop-in rounded-xl border-2 border-ink bg-white p-3">
              <div className="text-xs font-bold text-muted">ID {nextId - 1n + ''} → base 62{tr(', শেষ থেকে পড়ুন', ', read from the end')}</div>
              <ol className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0 font-mono text-xs">
                {steps.map((s, i) => <li key={i} className="rounded bg-[#F0F2EC] px-2 py-1">{s}</li>)}
              </ol>
              <div className="mt-2 font-mono text-3xl font-bold tracking-wider text-route-deep">pgo.to/{code}</div>
            </div>
          )}
          {run && (
            <div className="pop-in grid grid-cols-10 gap-1" aria-label={tr('১০টা click', '10 clicks')}>
              {Array.from({ length: 10 }, (_, i) => {
                const viaServer = i < run.server;
                return <span key={i} className={`grid aspect-square place-items-center rounded-md border-2 border-ink text-[10px] font-bold ${viaServer ? 'bg-parcel' : 'bg-route-soft'}`}>{viaServer ? 'srv' : '↪'}</span>;
              })}
            </div>
          )}
          {run && <p className="m-0 text-sm">{run.redirect === '301' ? tr('Browser 301 মনে রাখে: পরের click সরাসরি লম্বা URL-এ, আমাদের server জানেও না।', 'The browser remembers the 301: later clicks go straight to the long URL, and our server never knows.') : tr('302: প্রতিটা click আমাদের server ঘুরে যায়, তাই গোনা যায়।', '302: every click passes through our server, so it can be counted.')}</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('একটা ৭ অক্ষরের short code বানান', 'Make a 7-character short code'), done: done[0]! },
        { text: tr('Marketing team ১০টা click-ই গুনতে চায়: ঠিক redirect বেছে ১০ click করুন', 'Marketing wants all 10 clicks counted: pick the right redirect and click 10 times'), done: done[1]! },
        { text: tr('Server-এর চাপ কমান: ১০ click-এ server-এ ১-এর বেশি request যেন না আসে', 'Cut server load: no more than 1 request reaches the server in 10 clicks'), done: done[2]! },
      ]}
    />
  );
}
