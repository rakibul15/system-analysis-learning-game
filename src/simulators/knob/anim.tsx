import { useEffect, useRef, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { useTicker } from '../frame/SimFrame';

/**
 * Animated pictures for the declarative simulators. Each one is driven by the
 * spec's current numbers, so moving a knob changes what moves on screen.
 * With reduced motion the pictures still render, frozen.
 */

const INK = '#16252D', ROUTE = '#0B8A7A', CORAL = '#E0483E', PARCEL = '#FFC02E', SKY = '#2F6FDE';

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}

/** Seconds since mount, advancing at `hz` frames a second. */
export function useClock(hz = 30) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);
  useTicker((dt) => setT((x) => x + dt), hz, !reduced);
  return t;
}

/** Log-scale a real rate (could be billions a second) to a drawable 0–20 particles a second. */
export const vis = (rate: number) => (rate <= 0 ? 0 : Math.min(20, Math.max(0.6, Math.log10(rate + 1) * 2.6)));

/* ------------------------------------------------------------------ Flow */

export interface FlowNode { id: string; label: string; x: number; y: number; tone?: 'ok' | 'down' | 'hot' | 'cold' | 'plain'; sub?: string; w?: number }
export interface FlowLink {
  from: string; to: string;
  /** particles a second (already scaled for drawing) */
  rate: number;
  color?: string;
  /** share of particles that fail half way and fall */
  drop?: number;
  /** share of particles drawn in the second colour (duplicates, late, …) */
  mix?: number;
  mixColor?: string;
  /** seconds to cross the link */
  secs?: number;
}

interface Particle { id: number; link: number; t: number; drop: boolean; mix: boolean; fall: number }

/** Boxes joined by lines, with dots streaming along each line at its rate. */
export function Flow({ nodes, links, h = 56, label }: { nodes: FlowNode[]; links: FlowLink[]; h?: number; label: string }) {
  const reduced = useReducedMotion();
  const ps = useRef<Particle[]>([]);
  const acc = useRef<number[]>([]);
  const seq = useRef(0);
  const rnd = useRef(1);
  const r = () => { rnd.current = (rnd.current * 16807) % 2147483647; return rnd.current / 2147483647; };
  const [, tick] = useState(0);

  useTicker((dt) => {
    acc.current = links.map((l, i) => (acc.current[i] ?? r()) + l.rate * dt);
    links.forEach((l, i) => {
      while (acc.current[i]! >= 1) {
        acc.current[i]! -= 1;
        if (ps.current.length < 220) ps.current.push({ id: seq.current++, link: i, t: 0, drop: r() < (l.drop ?? 0), mix: r() < (l.mix ?? 0), fall: 0 });
      }
    });
    ps.current = ps.current.filter((p) => {
      const l = links[p.link];
      if (!l) return false;
      if (p.drop && p.t >= 0.5) { p.fall += dt * 30; return p.fall < 18; }
      p.t += dt / (l.secs ?? 1.1);
      return p.t < 1;
    });
    tick((n) => n + 1);
  }, 30, !reduced);

  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const fill = (t?: FlowNode['tone']) => (t === 'down' ? '#FDECEA' : t === 'hot' ? '#FFF4D6' : t === 'cold' ? '#E3EEFF' : t === 'plain' ? '#F0F2EC' : '#FFFFFF');
  return (
    <svg viewBox={`0 0 100 ${h}`} className="block w-full" role="img" aria-label={label}>
      {links.map((l, i) => {
        const a = at(l.from), b = at(l.to);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeOpacity={l.rate > 0 ? 0.28 : 0.1} strokeWidth="0.5" strokeDasharray={l.rate > 0 ? undefined : '1.2 1'} />;
      })}
      {ps.current.map((p) => {
        const l = links[p.link]!;
        const a = at(l.from), b = at(l.to);
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t + p.fall;
        const c = p.drop && p.t >= 0.5 ? CORAL : p.mix ? (l.mixColor ?? PARCEL) : (l.color ?? ROUTE);
        return <circle key={p.id} cx={x} cy={y} r="0.95" fill={c} stroke={INK} strokeWidth="0.2" opacity={p.fall ? Math.max(0, 1 - p.fall / 18) : 1} />;
      })}
      {nodes.map((n) => {
        const w = n.w ?? 17;
        return (
          <g key={n.id} className={n.tone === 'hot' ? 'sim-pulse' : undefined} style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
            <rect x={n.x - w / 2} y={n.y - 4.2} width={w} height="8.4" rx="1.8" fill={fill(n.tone)} stroke={n.tone === 'down' ? CORAL : INK} strokeWidth={n.tone === 'down' ? 0.8 : 0.5} />
            <text x={n.x} y={n.y + (n.sub ? -0.4 : 0.9)} textAnchor="middle" fontSize="2.5" fontWeight="700" fill={INK}>{n.tone === 'down' ? '✕ ' : ''}{n.label}</text>
            {n.sub && <text x={n.x} y={n.y + 2.6} textAnchor="middle" fontSize="2" fill="#4A5A62">{n.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------- L7 · ID stream */

export function IdStream({ ts, machine, seq, dup }: { ts: number; machine: number; seq: number; dup: boolean }) {
  const mbits = Math.min(4, Math.max(1, machine));
  const t = useClock(10);
  const n = Math.floor(t / 0.45);
  const ids = Array.from({ length: 5 }, (_, i) => n - i).filter((k) => k >= 0);
  const valid = seq >= 0;
  const bits = (k: number) => {
    const time = (k * 3) % 2 ** Math.min(ts, 20);
    return { time: time.toString(2).padStart(6, '0').slice(-6), m: (5).toString(2).padStart(4, '0').slice(-mbits), s: valid ? (k % 4).toString(2).padStart(3, '0') : '!!!' };
  };
  return (
    <ol className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-xs" aria-label="এইমাত্র বানানো ID">
      {ids.map((k, i) => {
        const b = bits(k);
        const isDup = dup && i === 1;
        return (
          <li key={k} className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1 ${i === 0 ? 'pop-in' : ''} ${isDup ? 'shake-x border-coral bg-coral-soft' : 'border-transparent bg-white'}`} style={{ opacity: 1 - i * 0.15 }}>
            <span className="rounded bg-[#FFE7A8] px-1">…{b.time}</span>
            <span className="rounded bg-[#BFEBDD] px-1">{b.m}</span>
            <span className={`rounded px-1 ${valid ? 'bg-[#C7D3F5]' : 'bg-coral text-white'}`}>{b.s}</span>
            <span className="ml-auto">{isDup ? 'duplicate!' : `#${bn(1845521098817536 + k * 4096, { grouping: false }).slice(-8)}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------- L13 · typing */

const WORD = 'dhanmondi 27';
export function Typing({ debounce, server }: { debounce: number; server: number }) {
  const t = useClock(30);
  const cycle = WORD.length * 0.15 + 1.6;
  const local = t % cycle;
  const typed = Math.min(WORD.length, Math.floor(local / 0.15) + 1);
  const fires = debounce < 150 ? WORD.split('').map((_, i) => i) : [8, 11];
  const trip = 0.25 + server / 250; // seconds a request is away
  const bubbles = fires.map((i) => {
    const sent = i * 0.15 + debounce / 1000;
    return { i, p: (local - sent) / trip };
  }).filter((b) => b.p > 0 && b.p < 1);
  const answered = fires.some((i) => local > i * 0.15 + debounce / 1000 + trip);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 font-mono text-lg">
        <span>{WORD.slice(0, typed)}</span><span className="sim-caret inline-block h-5 w-0.5 bg-ink" />
      </div>
      <svg viewBox="0 0 100 16" className="block w-full" role="img" aria-label={`${bn(fires.length)}টা request`}>
        <rect x="1" y="3" width="16" height="10" rx="2" fill="#fff" stroke={INK} strokeWidth="0.5" /><text x="9" y="9.6" fontSize="3" textAnchor="middle" fontWeight="700">App</text>
        <rect x="83" y="3" width="16" height="10" rx="2" fill={server > 10 ? '#FFF4D6' : '#E6F4F1'} stroke={INK} strokeWidth="0.5" /><text x="91" y="9.6" fontSize="3" textAnchor="middle" fontWeight="700">Trie</text>
        <line x1="17" y1="8" x2="83" y2="8" stroke={INK} strokeOpacity="0.25" strokeWidth="0.4" />
        {bubbles.map((b) => {
          const there = b.p < 0.5 ? b.p * 2 : 2 - b.p * 2;
          return <circle key={b.i} cx={18 + there * 64} cy="8" r="1.6" fill={b.p < 0.5 ? PARCEL : ROUTE} stroke={INK} strokeWidth="0.3" />;
        })}
      </svg>
      <ul className={`m-0 flex list-none flex-col gap-0.5 rounded-xl border-2 border-ink bg-white p-2 text-sm transition-opacity duration-200 ${answered ? 'opacity-100' : 'opacity-30'}`}>
        {['Dhanmondi 27, Road 16', 'Dhanmondi 27 Bus Stop', 'Dhanmondi 27 Star Kabab'].map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------- L14 · video */

export function Player({ segs }: { segs: { q: number; br: number; bw: number }[] }) {
  const reduced = useReducedMotion();
  const pos = useRef(0);
  const stall = useRef(0);
  const [, tick] = useState(0);
  useTicker((dt) => {
    if (!segs.length) return;
    const seg = segs[Math.min(segs.length - 1, Math.floor(pos.current))]!;
    const speed = Math.min(1, seg.bw / seg.br);
    // a slow link plays in bursts with spinner pauses between them
    stall.current = (stall.current + dt) % 1;
    if (speed >= 1 || stall.current < speed) pos.current += dt / 3;
    if (pos.current >= segs.length) pos.current = 0;
    tick((n) => n + 1);
  }, 30, !reduced);
  const cur = segs[Math.min(segs.length - 1, Math.floor(pos.current))];
  const buffering = !!cur && cur.br > cur.bw && stall.current >= cur.bw / cur.br;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative grid aspect-[16/7] place-items-center overflow-hidden rounded-xl border-[2.5px] border-ink" style={{ background: `linear-gradient(135deg, #1D2E37, ${cur ? (cur.q >= 720 ? '#0B5F55' : cur.q >= 480 ? '#33444C' : '#4A5A62') : '#33444C'})` }}>
        <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold">{cur ? `${bn(cur.q)}p` : '—'}</span>
        {buffering ? <span className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" aria-label="Buffering" /> : <span className="font-display text-3xl text-white" style={{ filter: cur && cur.q < 480 ? 'blur(1.5px)' : undefined }}>🛵</span>}
      </div>
      <div className="relative h-3 rounded-full border-2 border-ink bg-white">
        {segs.map((_, i) => <span key={i} className="absolute top-0 h-full border-r-2 border-ink/30" style={{ left: `${((i + 1) / segs.length) * 100}%` }} />)}
        <span className="absolute left-0 top-0 h-full rounded-full bg-coral" style={{ width: `${(pos.current / Math.max(1, segs.length)) * 100}%` }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------- L17 · rider map */

export function RiderMap({ fanout, interval }: { fanout: string; interval: number }) {
  const t = useClock(30);
  const riders = Array.from({ length: 26 }, (_, i) => {
    const a = i * 2.39996, r = 8 + ((i * 37) % 30);
    return { x: 50 + Math.cos(a + t * 0.08 * ((i % 3) + 1)) * r * 1.2, y: 30 + Math.sin(a + t * 0.06 * ((i % 4) + 1)) * r * 0.6 };
  });
  const period = Math.max(0.4, interval * 0.25);
  const lines: [number, number][] = [];
  riders.forEach((a, i) => {
    const phase = ((t + i * 0.37) % period) / period;
    if (phase > 0.35) return;
    riders.forEach((b, j) => {
      if (i === j) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (fanout === 'all' || (fanout === 'friends' && (i + j) % 5 === 0) || (fanout === 'near' && d < 12 && (i + j) % 2 === 0)) lines.push([i, j]);
    });
  });
  return (
    <svg viewBox="0 0 100 60" className="block w-full rounded-xl border-2 border-ink bg-[#EEF1E8]" role="img" aria-label={`এই মুহূর্তে ${bn(lines.length)}টা location message`}>
      {[20, 40, 60, 80].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="60" stroke="#fff" strokeWidth="1.5" />)}
      {[15, 30, 45].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#fff" strokeWidth="1.5" />)}
      {lines.slice(0, 400).map(([i, j], k) => <line key={k} x1={riders[i]!.x} y1={riders[i]!.y} x2={riders[j]!.x} y2={riders[j]!.y} stroke={fanout === 'all' ? CORAL : SKY} strokeOpacity={fanout === 'all' ? 0.18 : 0.6} strokeWidth="0.35" />)}
      {riders.map((r, i) => <circle key={i} cx={r.x} cy={r.y} r="1.5" fill={PARCEL} stroke={INK} strokeWidth="0.35" />)}
    </svg>
  );
}

/* ------------------------------------------------------- L18 · routing */

export function SearchGrow({ algo, km, live, rush }: { algo: string; km: number; live: boolean; rush: boolean }) {
  const t = useClock(30);
  const cols = 34, rows = 18, sx = 4, gy = 9;
  const p = Math.min(1, (t % 3.2) / 2.2);
  const span = 4 + (km / 30) * 25;
  const goalX = Math.min(cols - 2, sx + span);
  const cells: { x: number; y: number; on: boolean }[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const dx = x - sx, dy = y - gy;
    let reach: number;
    if (algo === 'dijkstra') reach = Math.hypot(dx, dy) / span;
    else if (algo === 'astar') reach = (Math.hypot(dx, dy) + Math.hypot(x - goalX, y - gy) - span) / span * 2.2 + Math.max(0, dx) / span * 0.5;
    else reach = Math.abs(dy) <= 1 && dx >= 0 && dx <= span ? dx / span : 9;
    cells.push({ x, y, on: reach <= p * (algo === 'dijkstra' ? 1.05 : 1) });
  }
  const done = p >= 1;
  const jam = rush && !live;
  return (
    <svg viewBox={`0 0 ${cols} ${rows}`} className="block w-full rounded-xl border-2 border-ink bg-white" role="img" aria-label="মোড় খোঁজার বিস্তার">
      {cells.map((c, i) => c.on ? <rect key={i} x={c.x + 0.08} y={c.y + 0.08} width="0.84" height="0.84" rx="0.15" fill={algo === 'tiles' ? '#BFEBDD' : '#FFE7A8'} /> : null)}
      {rush && <rect x={sx + span * 0.45} y={gy - 1} width={span * 0.2} height="2" fill={CORAL} opacity="0.35" />}
      {done && <line x1={sx} y1={gy} x2={goalX} y2={gy} stroke={jam ? CORAL : ROUTE} strokeWidth="0.45" strokeDasharray={jam ? '0.6 0.4' : undefined} />}
      <circle cx={sx + 0.5} cy={gy + 0.5} r="0.7" fill={ROUTE} stroke={INK} strokeWidth="0.15" />
      <circle cx={goalX + 0.5} cy={gy + 0.5} r="0.7" fill={CORAL} stroke={INK} strokeWidth="0.15" />
    </svg>
  );
}

/* ----------------------------------------------------- L20 · alert scan */

export function AlertScan({ v, threshold, fires }: { v: number[]; threshold: number; fires: number[] }) {
  const t = useClock(30);
  const reduced = useReducedMotion();
  const upto = reduced ? 60 : Math.min(60, ((t % 7) / 6) * 60);
  const shown = v.slice(0, Math.max(1, Math.floor(upto)));
  return (
    <svg viewBox="0 0 120 52" className="block w-full" role="img" aria-label="এক ঘণ্টার error rate, সীমা আর alert">
      <rect x="60" y="0" width="60" height="44" fill="#FFD9D4" opacity="0.5" />
      <text x="62" y="6" fontSize="3.5" fill="#9E2A22">আসল সমস্যা</text>
      <line x1="0" x2="120" y1={44 - threshold * 2.4} y2={44 - threshold * 2.4} stroke={CORAL} strokeDasharray="2 1" strokeWidth="0.6" />
      <polyline points={shown.map((x, i) => `${i * 2},${44 - x * 2.4}`).join(' ')} fill="none" stroke={INK} strokeWidth="0.8" />
      <line x1={upto * 2} x2={upto * 2} y1="0" y2="44" stroke={SKY} strokeWidth="0.4" />
      {fires.filter((i) => i <= upto).map((i) => (
        <g key={i} className="pop-in" style={{ transformOrigin: `${i * 2}px 48px` }}>
          <circle cx={i * 2} cy="48" r="2.6" fill={i < 30 ? PARCEL : CORAL} stroke={INK} strokeWidth="0.4" />
          <text x={i * 2} y="49.3" fontSize="3.4" textAnchor="middle" fontWeight="700" fill={i < 30 ? INK : '#fff'}>!</text>
        </g>
      ))}
    </svg>
  );
}

/* --------------------------------------------------- L21 · windows */

export function Windows({ waited, updates }: { waited: number; updates: boolean }) {
  const t = useClock(30);
  const speed = 6; // drawing units a second
  const offset = (t * speed) % 30;
  const events = Array.from({ length: 40 }, (_, i) => {
    const late = [0, 0, 0, 0, 3, 0, 0, 12, 0, 0, 0, 0, 0, 40, 0, 0, 3, 0, 0, 120][i % 20]!;
    return { at: i * 3 + 1.2, late };
  });
  return (
    <svg viewBox="0 0 100 34" className="block w-full rounded-xl border-2 border-ink bg-white" role="img" aria-label="Scan আর মিনিটের window">
      {[0, 1, 2, 3, 4].map((k) => {
        const x = k * 30 - offset;
        return <g key={k}><rect x={x} y="18" width="29" height="12" rx="1.5" fill="#F0F2EC" stroke={INK} strokeWidth="0.4" /><text x={x + 14.5} y="32.8" fontSize="2.4" textAnchor="middle" fill="#4A5A62">এক মিনিট</text></g>;
      })}
      <line x1="70" y1="2" x2="70" y2="31" stroke={SKY} strokeWidth="0.5" strokeDasharray="1 0.8" />
      <text x="71" y="5" fontSize="2.4" fill={SKY}>এখন</text>
      {events.map((e, i) => {
        const x = e.at * 3 - offset - 30;
        const arrive = x + Math.min(e.late, 60) * 0.25; // late scans land further right
        if (arrive < -2 || arrive > 102) return null;
        const missed = e.late > waited;
        const fill = missed ? (updates ? PARCEL : CORAL) : ROUTE;
        const y = x > 70 ? 6 + (i % 4) * 2.5 : 21 + (i % 4) * 2.2;
        return <circle key={i} cx={Math.min(arrive, 99)} cy={y} r="1" fill={fill} stroke={INK} strokeWidth="0.2" />;
      })}
    </svg>
  );
}

/* --------------------------------------------- L22 · rush for a slot */

export function Rush({ strategy, users, run }: { strategy: string; users: number; run: number }) {
  const [t0, setT0] = useState(0);
  const t = useClock(30);
  useEffect(() => { setT0(t); }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  const since = run ? t - t0 : 0;
  const n = Math.min(users, 24);
  return (
    <svg viewBox="0 0 100 40" className="block w-full rounded-xl border-2 border-ink bg-white" role="img" aria-label="Merchant-রা slot-এর দিকে">
      <rect x="78" y="12" width="18" height="16" rx="2" fill="#FFF4D6" stroke={INK} strokeWidth="0.5" />
      <text x="87" y="19" textAnchor="middle" fontSize="3" fontWeight="700">৫টার slot</text>
      <text x="87" y="24" textAnchor="middle" fontSize="2.5">১টা জায়গা</text>
      {Array.from({ length: n }, (_, i) => {
        const startY = 3 + (i / Math.max(1, n - 1)) * 34;
        let x = 6 + Math.sin(t * 3 + i) * 1.2, y = startY, fill = '#FFFFFF';
        if (run) {
          const order = strategy === 'lock' ? i * 0.12 : 0;
          const p = Math.max(0, Math.min(1, (since - order) / 0.9));
          x = 6 + p * 66; y = startY + (20 - startY) * p;
          const winner = i === 0;
          if (p >= 1) {
            if (strategy === 'none') fill = winner ? ROUTE : CORAL;
            else if (winner) fill = ROUTE;
            else { const back = Math.min(1, (since - order - 0.9) / 0.6); x = 72 - back * 30; y = 20 + (startY - 20) * back; fill = '#E3E6DF'; }
          }
          if (strategy === 'lock' && p < 1 && since > 0.9) fill = PARCEL;
        }
        return <circle key={i} cx={x} cy={y} r="1.6" fill={fill} stroke={INK} strokeWidth="0.35" />;
      })}
    </svg>
  );
}

/* ------------------------------------------------ L24 · photos age */

export function Conveyor({ coldAfter, ec }: { coldAfter: number; ec: boolean }) {
  const t = useClock(30);
  const coldX = coldAfter === 0 ? 200 : 6 + (coldAfter / 365) * 88;
  return (
    <svg viewBox="0 0 100 30" className="block w-full rounded-xl border-2 border-ink bg-white" role="img" aria-label="ছবির বয়স বাড়ছে: hot থেকে cold">
      {coldAfter > 0 && <rect x={coldX} y="0" width={100 - coldX} height="24" fill="#E3EEFF" />}
      <text x="3" y="28" fontSize="2.4" fill="#4A5A62">নতুন</text>
      <text x="97" y="28" fontSize="2.4" fill="#4A5A62" textAnchor="end">১ বছর</text>
      {coldAfter > 0 && <text x={Math.min(coldX + 1, 80)} y="4" fontSize="2.4" fill={SKY}>cold</text>}
      {Array.from({ length: 9 }, (_, i) => {
        const x = 4 + ((i * 11 + t * 6) % 92);
        const cold = x > coldX;
        return (
          <g key={i}>
            {(ec ? [0, 1, 2, 3] : [0, 1, 2]).map((k) => <rect key={k} x={x + (ec ? (k % 2) * 2.4 : k * 0.9)} y={8 + (ec ? Math.floor(k / 2) * 3.4 : k * 0.9)} width={ec ? 2.2 : 5} height={ec ? 3 : 5.5} rx="0.5" fill={cold ? '#C7D3F5' : '#FFE7A8'} stroke={INK} strokeWidth="0.3" />)}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------ L25 · leaderboard */

const RIDERS = ['রহিম', 'সুমি', 'জামাল', 'তানিয়া', 'আসিফ', 'নাদিয়া'];
export function Ranking({ slow }: { slow: boolean }) {
  const t = useClock(12);
  const pts = RIDERS.map((_, i) => 900 + Math.floor(t * (8 + ((i * 7) % 11)) + 40 * Math.sin(t * 0.7 + i)));
  const order = RIDERS.map((_, i) => i).sort((a, b) => pts[b]! - pts[a]!);
  const scan = (t % 2.5) / 2.5;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[156px]">
        {RIDERS.map((name, i) => {
          const rank = order.indexOf(i);
          return (
            <div key={name} className="absolute left-0 right-0 flex items-center gap-2 rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm transition-[top] duration-500" style={{ top: rank * 26 }}>
              <span className="w-6 font-mono font-bold">{bn(rank + 1)}</span><span className="flex-1">{name}</span><span className="font-mono">{bn(pts[i]!)}</span>
            </div>
          );
        })}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white" aria-label="Rank query চলছে">
        <div className="h-full bg-sky" style={{ width: `${slow ? scan * 100 : 100}%` }} />
      </div>
      <p className="m-0 text-xs text-muted">{slow ? 'নীল দাগ: নিজের rank জানতে পুরো table গোনা চলছে…' : 'Sorted set: rank এক ঝটকায়'}</p>
    </div>
  );
}

/* ------------------------------------------------------ L27 · wallet */

export function CoinRun({ approach, crashed }: { approach: string; crashed: boolean }) {
  const t = useClock(30);
  const p = (t % 2.6) / 2.2;
  let x = 18 + Math.min(1, p) * 64, opacity = 1, fill = PARCEL;
  if (crashed) {
    if (approach === 'naive') { x = 18 + Math.min(p, 0.5) * 64; opacity = p > 0.5 ? Math.max(0, 1 - (p - 0.5) * 3) : 1; fill = p > 0.5 ? CORAL : PARCEL; }
    else if (approach === '2pc') { x = 18 + Math.min(p, 0.5) * 64; }
    else { x = 18 + (p < 0.5 ? p : Math.max(0, 1 - p)) * 64; }
  }
  const locked = crashed && approach === '2pc';
  return (
    <svg viewBox="0 0 100 26" className="block w-full rounded-xl border-2 border-ink bg-white" role="img" aria-label="Merchant থেকে rider-এ ৳৫০০">
      {[[10, 'Merchant'], [90, 'Rider']].map(([cx, l]) => (
        <g key={l as string}>
          <rect x={(cx as number) - 9} y="7" width="18" height="12" rx="2" fill={locked ? '#F0F2EC' : '#fff'} stroke={INK} strokeWidth="0.5" />
          <text x={cx as number} y="14" fontSize="3" textAnchor="middle" fontWeight="700">{l}</text>
          {locked && <text x={cx as number} y="5.5" fontSize="3" textAnchor="middle">🔒</text>}
        </g>
      ))}
      {crashed && <text x="50" y="6" fontSize="3" textAnchor="middle" fill={CORAL} fontWeight="700">crash ⚡</text>}
      <circle cx={x} cy="13" r="2.6" fill={fill} stroke={INK} strokeWidth="0.4" opacity={opacity} />
      <text x={x} y="14.1" fontSize="2.6" textAnchor="middle" opacity={opacity}>৳</text>
    </svg>
  );
}

/* --------------------------------------------- L30 · interview clock */

export function InterviewClock({ phases }: { phases: { label: string; min: number; color: string }[] }) {
  const t = useClock(20);
  const total = Math.max(1, phases.reduce((a, p) => a + p.min, 0));
  const p = (t % 10) / 9;
  const at = Math.min(1, p) * total;
  let acc = 0, cur = phases[0]!;
  for (const ph of phases) { if (at >= acc && at < acc + ph.min) cur = ph; acc += ph.min; }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-4 rounded-full border-2 border-ink bg-white">
        <span className="absolute top-[-6px] h-6 w-1 rounded bg-coral" style={{ left: `${Math.min(1, p) * 100}%` }} />
      </div>
      <p className="m-0 text-sm">মিনিট <b className="font-mono">{bn(Math.floor(at))}</b>: এখন <b>{cur.label}</b>{total > 45 && at > 45 ? ', সময় শেষ, interviewer থামিয়ে দিলেন!' : ''}</p>
    </div>
  );
}
