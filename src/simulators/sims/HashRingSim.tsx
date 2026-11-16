import { useMemo, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { assign, buildRing, imbalance, movedFraction, ringOwner, unitHash } from '../lib';
import { ActionButton, Choice, pct, SimFrame, Slider, useLatched, type Metric } from '../frame/SimFrame';
import { useClock } from '../knob/anim';

const KEYS = Array.from({ length: 400 }, (_, i) => unitHash(`parcel-${i}`));
const COLORS = ['#0B8A7A', '#2F6FDE', '#E0483E', '#B8730A', '#6B4D9E', '#16252D', '#3FB37A', '#D0245A'];
type Mode = 'ring' | 'modulo';

/** Level 5 · modulo vs consistent hashing, with virtual nodes. */
export function HashRingSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [mode, setMode] = useState<Mode>('modulo');
  const [vnodes, setVnodes] = useState(1);
  const [servers, setServers] = useState(['S0', 'S1', 'S2', 'S3']);
  const [last, setLast] = useState<{ moved: number; mode: Mode; change: 'add' | 'remove' } | null>(null);
  const [prevOwners, setPrevOwners] = useState<string[] | null>(null);

  const owners = useMemo(() => assign(KEYS, servers, mode, vnodes), [servers, mode, vnodes]);
  const ring = useMemo(() => (mode === 'ring' ? buildRing(servers, Math.min(vnodes, 60)) : []), [servers, mode, vnodes]);
  const imb = imbalance(owners, servers);
  const t = useClock(30);

  const change = (next: string[], kind: 'add' | 'remove') => {
    const after = assign(KEYS, next, mode, vnodes);
    setLast({ moved: movedFraction(owners, after), mode, change: kind });
    setPrevOwners(owners);
    setServers(next);
  };
  const add = () => { if (servers.length < 8) change([...servers, `S${Math.max(...servers.map((x) => Number(x.slice(1)))) + 1}`], 'add'); };
  const remove = () => { if (servers.length > 2) change(servers.slice(0, -1), 'remove'); };
  const colorOf = (s: string) => COLORS[Number(s.slice(1)) % COLORS.length]!;

  const done = useLatched([
    !!last && last.mode === 'modulo' && last.moved >= 0.5,
    !!last && last.mode === 'ring' && last.change === 'add' && last.moved <= 0.25,
    mode === 'ring' && servers.length >= 4 && imb <= 0.1,
  ]);
  const metrics: Metric[] = [
    { label: 'শেষ বদলে key সরেছে', value: last ? pct(last.moved) : '—', tone: last ? (last.moved > 0.4 ? 'bad' : 'good') : 'neutral' },
    { label: 'ভাগের অসমতা', value: pct(imb), tone: imb <= 0.1 ? 'good' : imb > 0.3 ? 'bad' : 'neutral' },
    { label: 'Server', value: bn(servers.length) },
  ];

  const R = 38, cx = 50, cy = 50;
  const pt = (u: number, r = R) => ({ x: cx + r * Math.sin(u * 2 * Math.PI), y: cy - r * Math.cos(u * 2 * Math.PI) });
  const counts = servers.map((s) => owners.filter((o) => o === s).length);
  const maxCount = Math.max(...counts, 1);

  return (
    <SimFrame
      title="Cache-এর আংটি"
      intro={`${bn(KEYS.length)}টা key, কয়েকটা cache server। Server যোগ-বাদ করে দেখুন কত key জায়গা বদলায়।`}
      onFinish={onFinish}
      controls={<>
        <Choice label="Hashing" value={mode} onChange={(m) => { setMode(m); setLast(null); setPrevOwners(null); }} options={[{ id: 'modulo', label: 'hash % n' }, { id: 'ring', label: 'Ring' }]} />
        <Slider label="Virtual node / server" value={vnodes} min={1} max={200} onChange={setVnodes} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={add}>+ Server</ActionButton>
          <ActionButton tone="warn" onClick={remove}>− Server</ActionButton>
        </div>
      </>}
      stage={
        <div className="grid h-full gap-2 p-3 sm:grid-cols-[1fr_150px]">
          <svg viewBox="0 0 100 100" className="mx-auto block h-full max-h-[360px] w-full" role="img" aria-label={mode === 'ring' ? 'Hash ring' : 'Modulo ভাগ'}>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#16252D" strokeWidth="1.2" />
            {KEYS.map((k, i) => {
              const moved = prevOwners && prevOwners[i] !== owners[i];
              const p = pt(k, R - 4 - (i % 3) * 2);
              return <circle key={i} cx={p.x} cy={p.y} r={moved ? 1.1 : 0.7} fill={moved ? '#E0483E' : colorOf(owners[i]!)} opacity={moved ? 1 : 0.75} />;
            })}
            {mode === 'ring' && ring.map((r, i) => { const a = pt(r.at, R + 1), b = pt(r.at, R + 4.5); return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorOf(r.server)} strokeWidth={vnodes > 30 ? 0.6 : 1.4} />; })}
            {(() => {
              const u = (t * 0.12) % 1;
              const owner = mode === 'ring' ? ringOwner(ring, u) : servers[Math.floor(u * 997) % servers.length]!;
              const tip = pt(u, R - 1);
              const at = mode === 'ring' ? ring.find((r) => r.at >= u) ?? ring[0] : undefined;
              const dest = at ? pt(at.at, R + 2.5) : undefined;
              return <g>
                <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={colorOf(owner)} strokeWidth="0.7" strokeLinecap="round" />
                <circle cx={tip.x} cy={tip.y} r="1.6" fill="#FFC02E" stroke="#16252D" strokeWidth="0.35" />
                {dest && <circle cx={dest.x} cy={dest.y} r="2.2" fill="none" stroke={colorOf(owner)} strokeWidth="0.7" className="sim-pulse" style={{ transformOrigin: `${dest.x}px ${dest.y}px` }} />}
                <text x={cx} y={cy + 6} textAnchor="middle" fontSize="3" fill={colorOf(owner)} fontWeight="700">→ {owner}</text>
              </g>;
            })()}
            {mode === 'ring' && vnodes === 1 && ring.map((r) => { const p = pt(r.at, R + 9); return <text key={r.server} x={p.x} y={p.y + 1.2} fontSize="3.4" fontWeight="700" textAnchor="middle" fill={colorOf(r.server)}>{r.server}</text>; })}
            <text x={cx} y={cy + 1.5} textAnchor="middle" fontSize="4" fontWeight="700" fill="#16252D">{mode === 'ring' ? 'hash ring' : 'hash % ' + bn(servers.length)}</text>
          </svg>
          <div className="flex flex-col justify-center gap-1.5 text-xs font-semibold">
            {servers.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="w-7" style={{ color: colorOf(s) }}>{s}</span>
                <span className="h-3 flex-1 overflow-hidden rounded bg-locked"><span className="block h-full rounded" style={{ width: `${(counts[i]! / maxCount) * 100}%`, background: colorOf(s) }} /></span>
                <span className="w-7 text-right font-mono">{bn(counts[i]!)}</span>
              </div>
            ))}
            <p className="m-0 mt-2 text-muted">লাল বিন্দু = শেষ বদলে সরে যাওয়া key</p>
          </div>
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'hash % n দিয়ে একটা server যোগ বা বাদ দিন, দেখুন অর্ধেকের বেশি key সরে', done: done[0]!, hint: 'Mode: hash % n, তারপর + Server।' },
        { text: 'Ring-এ একটা server যোগ করুন, আর ২৫%-এর কম key সরান', done: done[1]!, hint: 'Ring-এ নতুন server শুধু নিজের ভাগটা নেয়।' },
        { text: 'Ring-এ ৪+ server রেখে ভাগের অসমতা ১০%-এর নিচে আনুন', done: done[2]!, hint: 'প্রতিটা server আংটিতে অনেক জায়গায় বসলে?' },
      ]}
    />
  );
}
