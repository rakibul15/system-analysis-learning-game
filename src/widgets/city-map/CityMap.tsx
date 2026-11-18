import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { Chapter } from '@/content/schema';
import type { LevelMeta } from '@/content/meta';
import { bn, easeBack } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { tr } from '@/shared/lib/i18n';

const INK = '#16252D';

export interface MapStopView {
  level: LevelMeta;
  state: 'done' | 'open' | 'locked';
  stars: number;
}

/** Stops along a winding road across a 1600×900 world. */
function layout(n: number) {
  const left = 200, right = 1340;
  return Array.from({ length: n }, (_, i) => {
    const x = n === 1 ? 800 : left + ((right - left) * i) / (n - 1);
    const y = n === 1 ? 560 : i % 2 === 0 ? 680 : 410;
    return { x, y };
  });
}

/** Smooth path through points (Catmull–Rom → cubic Bézier). */
function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}

interface Props {
  chapter: Chapter;
  stops: MapStopView[];
  selected: number;
  onSelect: (index: number) => void;
}

/** One chapter as a living little city: road, buildings per level, the van that drives to the selected stop. */
export function CityMap({ chapter, stops, selected, onSelect }: Props) {
  const pts = useMemo(() => layout(stops.length), [stops.length]);
  const road = useMemo(() => smoothPath([{ x: -80, y: pts[0]!.y + 40 }, ...pts, { x: 1700, y: pts[pts.length - 1]!.y - 60 }]), [pts]);
  const scenery = useMemo(() => {
    const r = mulberry32(chapter.id * 97);
    return Array.from({ length: 14 }, () => {
      const top = r() < 0.5;
      return { x: 60 + r() * 1480, y: top ? 70 + r() * 150 : 790 + r() * 80, s: 0.7 + r() * 0.6, b: r() < 0.5 };
    });
  }, [chapter.id]);
  const roadEl = useRef<SVGPathElement>(null);
  const anim = useRef({ clock: 0, lens: null as number[] | null, key: '', total: 0, vanL: 0, dir: 1, moving: 0, pickAt: -9, lockAt: -9 });
  const sel = useRef(selected);
  sel.current = selected;
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let raf = 0, last = 0;
    const loop = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      const a = anim.current;
      a.clock += dt;
      const r = roadEl.current;
      const key = `${chapter.id}-${stops.length}`;
      if (r && a.key !== key) {
        a.key = key;
        a.total = r.getTotalLength();
        a.lens = pts.map((s) => {
          let best = { d: Infinity, l: 0 };
          for (let i = 0; i <= 500; i++) {
            const l = (a.total * i) / 500;
            const p = r.getPointAtLength(l);
            const d = (p.x - s.x) ** 2 + (p.y - s.y) ** 2;
            if (d < best.d) best = { d, l };
          }
          return best.l;
        });
        a.vanL = a.lens[sel.current] ?? 0;
      }
      if (a.lens) {
        const d = (a.lens[sel.current] ?? 0) - a.vanL;
        if (Math.abs(d) > 1) {
          const v = Math.max(160, Math.min(1000, Math.abs(d) * 2.6)) * dt;
          a.dir = d > 0 ? 1 : -1; a.moving = 1;
          a.vanL += Math.abs(d) < v ? d : a.dir * v;
        } else { a.moving *= Math.exp(-dt * 8); a.dir = 1; }
      }
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [chapter.id, stops.length, pts]);

  useEffect(() => { anim.current.pickAt = anim.current.clock; }, [selected]);

  const a = anim.current;
  let van = { x: pts[selected]!.x / 16, y: pts[selected]!.y / 9, ang: 0 };
  if (roadEl.current && a.lens) {
    const p = roadEl.current.getPointAtLength(a.vanL);
    const q = roadEl.current.getPointAtLength(Math.min(a.total, a.vanL + 6));
    van = { x: p.x / 16, y: p.y / 9, ang: Math.max(-30, Math.min(30, (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI)) };
  }
  const bob = Math.abs(Math.sin(a.clock * (a.moving > 0.3 ? 16 : 3))) * (a.moving > 0.3 ? 0.5 : 0.25);
  const lockAge = a.clock - a.lockAt;

  return (
    <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink shadow-[0_8px_0_#16252D]" style={{ aspectRatio: '16 / 9', minHeight: 300, containerType: 'inline-size', background: chapter.ground }}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <rect width="1600" height="900" fill={chapter.ground} />
        <ellipse cx="380" cy="230" rx="300" ry="120" fill="#FFFFFF" opacity="0.28" />
        <ellipse cx="1100" cy="820" rx="380" ry="110" fill="#FFFFFF" opacity="0.28" />
        <path d="M1480 -20 C 1440 160 1590 300 1540 470 S 1470 760 1560 920 L 1640 920 L 1640 -20 Z" fill="#BFE0F5" stroke={INK} strokeWidth="5" />
        <g className="amb-water" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="30 90"><path d="M1530 0 C 1500 160 1630 300 1590 470 S 1520 760 1600 900" /></g>
        <path d={road} fill="none" stroke={INK} strokeWidth="88" strokeLinecap="round" />
        <path ref={roadEl} d={road} fill="none" stroke="#FBFAF5" strokeWidth="74" strokeLinecap="round" />
        <path d={road} fill="none" stroke="#C9D0C3" strokeWidth="7" strokeDasharray="20 24" strokeLinecap="round" />
        {pts.map((p, i) => {
          const s = stops[i]!;
          const by = p.y - 150;
          const faded = s.state === 'locked';
          return (
            <g key={s.level.id} stroke={faded ? '#7C8A84' : INK} strokeWidth="5" strokeLinejoin="round" opacity={faded ? 0.7 : 1}>
              <rect x={p.x - 55} y={by} width="110" height="78" fill={faded ? '#EEF1EA' : '#FFFFFF'} />
              <path d={`M${p.x - 68} ${by + 4} L${p.x} ${by - 46} L${p.x + 68} ${by + 4} Z`} fill={faded ? '#C9D0C3' : chapter.accent} />
              <rect x={p.x - 16} y={by + 34} width="32" height="44" fill={faded ? '#E3E6DF' : '#FFC02E'} />
              <rect x={p.x - 44} y={by + 18} width="20" height="18" fill="#BFE0F5" strokeWidth="3" />
              <rect x={p.x + 24} y={by + 18} width="20" height="18" fill="#BFE0F5" strokeWidth="3" />
            </g>
          );
        })}
        <g stroke={INK} strokeWidth="4">
          {scenery.map((t, i) => (
            <g key={i} className={`amb-sway ${t.b ? 'amb-sway-b' : ''}`} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
              <rect x="-5" y="0" width="10" height="40" fill="#8A5A3C" /><circle cx="0" cy="-12" r="28" fill={t.b ? '#6AA366' : '#7FB37A'} />
            </g>
          ))}
        </g>
        <rect x="1520" y="0" width="80" height="900" fill={chapter.ground} opacity="0.4" />
      </svg>

      {stops.map((s, i) => {
        const p = pts[i]!;
        const isSel = i === selected;
        const x = p.x / 16, y = p.y / 9;
        const bounce = s.state === 'open' ? Math.abs(Math.sin(a.clock * 3.2 + i)) * 1.3 : 0;
        const shake = s.state === 'locked' && isSel && lockAge < 0.5 ? Math.sin(lockAge * 60) * (0.5 - lockAge) * 2.4 : 0;
        const pop = isSel ? 0.92 + 0.26 * easeBack((a.clock - a.pickAt) / 0.3) : 1;
        const faded = s.state === 'locked';
        const bg = s.state === 'done' ? chapter.accent : s.state === 'open' ? '#FFC02E' : '#E3E6DF';
        const label = { done: tr('পাস', 'passed'), open: tr('খেলা যায়', 'open'), locked: tr('তালাবদ্ধ', 'locked') }[s.state];
        return (
          <div key={s.level.id}>
            {s.stars > 0 && (
              <span aria-hidden="true" className="pointer-events-none absolute flex" style={{ left: `${x}%`, top: `${y - 8.6}%`, transform: 'translate(-50%,-50%)', gap: '0.2cqw' }}>
                {[0, 1, 2].map((k) => (
                  <svg key={k} viewBox="0 0 20 20" style={{ width: '1.9cqw', height: '1.9cqw' }}>
                    <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill={k < s.stars ? '#FFC02E' : '#FFFFFF'} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                ))}
              </span>
            )}
            <button
              type="button"
              onClick={() => { if (s.state === 'locked') a.lockAt = a.clock; onSelect(i); }}
              aria-label={`Level ${bn(s.level.id)}, ${s.level.title}, ${label}`}
              aria-pressed={isSel}
              className="absolute box-border cursor-pointer rounded-full p-0 font-display font-extrabold leading-none"
              style={{
                left: `${x + shake}%`, top: `${y - bounce}%`, width: '6.2%', aspectRatio: '1', zIndex: 3,
                transform: `translate(-50%,-50%) scale(${pop.toFixed(3)})`,
                border: `max(2.5px,0.34cqw) solid ${faded ? '#7C8A84' : INK}`, background: bg,
                color: s.state === 'done' ? '#FFFFFF' : faded ? '#5D6B66' : INK, fontSize: 'max(14px,2.4cqw)',
                boxShadow: `0 max(3px,0.5cqw) 0 ${faded ? '#7C8A84' : INK}${isSel ? `,0 0 0 max(4px,0.6cqw) #FFFFFF,0 0 0 max(6px,0.85cqw) ${INK}` : ''}`,
              }}
            >
              {bn(s.level.id)}
            </button>
            <span className="pointer-events-none absolute whitespace-nowrap rounded-full font-display font-bold" style={{ left: `${x}%`, top: `${y + 7.6}%`, transform: 'translate(-50%,-50%)', padding: '0.05em 0.7em', background: isSel ? INK : 'rgba(255,255,255,.92)', color: isSel ? '#FFFFFF' : INK, fontSize: 'max(10px,1.3cqw)', zIndex: 2 }}>
              {s.level.title}
            </span>
          </div>
        );
      })}

      <div aria-hidden="true" className="pointer-events-none absolute z-[4]" style={{ left: `${van.x}%`, top: `${van.y - 6.5 - bob}%`, width: '7%', transform: `translate(-50%,-50%) scaleX(${a.dir}) rotate(${(a.moving > 0.3 ? van.ang : 0).toFixed(1)}deg)`, filter: 'drop-shadow(0 max(3px,0.4cqw) 0 rgba(22,37,45,.3))' }}>
        <svg viewBox="0 0 120 70" className="block h-auto w-full"><rect x="4" y="10" width="72" height="42" rx="6" fill="#FFC02E" stroke={INK} strokeWidth="5" /><path d="M76 22h22l16 16v14H76z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M84 28h12l8 9H84z" fill="#BFE0F5" stroke={INK} strokeWidth="3" /><circle cx="28" cy="54" r="11" fill={INK} /><circle cx="92" cy="54" r="11" fill={INK} /><circle cx="28" cy="54" r="4" fill="#FFFFFF" /><circle cx="92" cy="54" r="4" fill="#FFFFFF" /><path d="M18 24h44M18 34h30" stroke={INK} strokeWidth="4" strokeLinecap="round" /></svg>
      </div>

      <div className="absolute left-[2%] top-[3%] rounded-[14px] bg-white" style={{ padding: '0.35em 1em', border: `max(2px,0.25cqw) solid ${INK}`, boxShadow: `0 max(3px,0.4cqw) 0 ${INK}`, fontSize: 'max(12px,1.45cqw)' }}>
        <div className="text-[0.8em] font-bold" style={{ color: chapter.accent }}>{tr('অধ্যায়', 'Chapter')} {bn(chapter.id)} · {bn(stops.filter((s) => s.state === 'done').length)}/{bn(stops.length)} {tr('পাস', 'passed')}</div>
        <h1 className="m-0 font-display text-[1.45em] font-extrabold leading-[1.15]">{chapter.title}</h1>
      </div>
      <div role="status" className="pointer-events-none absolute bottom-[4%] left-1/2 whitespace-nowrap rounded-full bg-ink font-bold text-white" style={{ padding: '0.4em 1.1em', fontSize: 'max(12px,1.45cqw)', opacity: lockAge < 2.2 ? Math.min(1, (2.2 - lockAge) * 4) : 0, transform: `translate(-50%, ${((1 - easeBack(lockAge / 0.3)) * 30).toFixed(1)}px)` }}>
        {lockAge < 2.2 ? tr('এই level এখনো তালাবদ্ধ', 'This level is still locked') : ''}
      </div>
    </div>
  );
}
