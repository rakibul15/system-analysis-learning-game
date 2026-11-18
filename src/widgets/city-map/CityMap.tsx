import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Chapter } from '@/content/schema';
import type { LevelMeta } from '@/content/meta';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { tr } from '@/shared/lib/i18n';
import { makeRoad } from './road';

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

interface Props {
  chapter: Chapter;
  stops: MapStopView[];
  selected: number;
  onSelect: (index: number) => void;
}

/** The system "reduce motion" setting; read when something is about to move, so a change applies at once. */
const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long the "still locked" note stays up (ms); its CSS animation (map-toast) lasts as long. */
const LOCK_NOTE_MS = 2200;
/** The scenery rests this long after the learner last touched or scrolled (ms). */
export const SCENERY_REST_MS = 8000;

/**
 * One chapter as a living little city: road, buildings per level, the van that drives to the selected stop.
 *
 * Nothing here re-renders per frame. The idle motion (the next stop's bob, swaying trees, water, the van's
 * idle bob) is CSS, paused while the map is off screen. Only the van's drive along the road runs in
 * JavaScript, and only while it drives: it writes the van's position straight to the DOM and stops
 * when the van arrives.
 */
export function CityMap({ chapter, stops, selected, onSelect }: Props) {
  const pts = useMemo(() => layout(stops.length), [stops.length]);
  // the road runs in from the left, through every stop, and out to the right
  const geo = useMemo(() => makeRoad([{ x: -80, y: pts[0]!.y + 40 }, ...pts, { x: 1700, y: pts[pts.length - 1]!.y - 60 }]), [pts]);
  const road = geo.d;
  const scenery = useMemo(() => {
    const r = mulberry32(chapter.id * 97);
    return Array.from({ length: 14 }, () => {
      const top = r() < 0.5;
      return { x: 60 + r() * 1480, y: top ? 70 + r() * 150 : 790 + r() * 80, s: 0.7 + r() * 0.6, b: r() < 0.5 };
    });
  }, [chapter.id]);
  const rootEl = useRef<HTMLDivElement>(null);
  const vanEl = useRef<HTMLDivElement>(null);
  const drive = useRef({ vanL: 0, dir: 1, raf: 0, last: 0 });
  const [lockNote, setLockNote] = useState(0);
  // only the next stop to play bobs: one moving thing draws the eye, several only add noise
  const nextOpen = stops.findIndex((s) => s.state === 'open');
  // the van's first paint only: after that placeVan owns its position, and these props never change,
  // so a re-render (a new selection) cannot snap it to the stop before it has driven there
  const [start] = useState(() => pts[selected]!);

  /** Puts the van at its current length along the road, facing its direction (tilted to the road only while driving). */
  const placeVan = (moving: boolean) => {
    const v = vanEl.current, d = drive.current;
    if (!v) return;
    const p = geo.pointAt(d.vanL);
    const q = geo.pointAt(d.vanL + 6);
    const ang = moving ? Math.max(-30, Math.min(30, (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI)) : 0;
    v.style.left = `${p.x / 16}%`;
    v.style.top = `${p.y / 9 - 6.5}%`;
    v.style.transform = `translate(-50%,-50%) scaleX(${d.dir}) rotate(${ang.toFixed(1)}deg)`;
    v.toggleAttribute('data-driving', moving);
  };
  /** Length along the road of stop i (the road's first point is off the map, so stop i is point i + 1). */
  const stopAt = (i: number) => geo.at[i + 1];

  // the van parked at the selected stop (once per layout)
  useLayoutEffect(() => {
    const d = drive.current;
    d.vanL = stopAt(selected) ?? 0;
    d.dir = 1;
    placeVan(false);
    return () => cancelAnimationFrame(d.raf);
  }, [geo]); // eslint-disable-line react-hooks/exhaustive-deps

  // drive to a newly selected stop
  useEffect(() => {
    const d = drive.current;
    const target = stopAt(selected);
    if (target === undefined) return;
    cancelAnimationFrame(d.raf);
    if (reduceMotion()) { d.vanL = target; d.dir = 1; placeVan(false); return; }
    d.last = 0;
    const step = (ts: number) => {
      const dt = d.last ? Math.min(0.05, (ts - d.last) / 1000) : 0;
      d.last = ts;
      const left = target - d.vanL;
      if (Math.abs(left) <= 1) { d.vanL = target; d.dir = 1; placeVan(false); return; }
      const v = Math.max(160, Math.min(1000, Math.abs(left) * 2.6)) * dt;
      d.dir = left > 0 ? 1 : -1;
      d.vanL += Math.abs(left) < v ? left : d.dir * v;
      placeVan(true);
      d.raf = requestAnimationFrame(step);
    };
    d.raf = requestAnimationFrame(step);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // idle CSS motion pauses while the map is off screen
  useEffect(() => {
    const el = rootEl.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute('data-offscreen', !e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the scenery (water, trees, the parked van's bob) comes alive when the learner touches or scrolls,
  // and comes to rest after a while; the next stop keeps bobbing, since it invites the next tap
  useEffect(() => {
    const el = rootEl.current;
    if (!el) return;
    let t = 0;
    const wake = () => {
      el.removeAttribute('data-resting');
      window.clearTimeout(t);
      t = window.setTimeout(() => el.setAttribute('data-resting', ''), SCENERY_REST_MS);
    };
    wake();
    const opts = { passive: true } as const;
    const events = ['pointerdown', 'pointermove', 'keydown', 'focusin'] as const;
    for (const ev of events) el.addEventListener(ev, wake, opts);
    window.addEventListener('scroll', wake, opts);
    return () => {
      window.clearTimeout(t);
      for (const ev of events) el.removeEventListener(ev, wake);
      window.removeEventListener('scroll', wake);
    };
  }, []);

  useEffect(() => {
    if (!lockNote) return;
    const t = setTimeout(() => setLockNote(0), LOCK_NOTE_MS);
    return () => clearTimeout(t);
  }, [lockNote]);

  const tapLocked = (el: HTMLElement) => {
    setLockNote(Date.now());
    if (reduceMotion() || typeof el.animate !== 'function') return;
    el.animate([{ translate: '0 0' }, { translate: '-8px 0' }, { translate: '7px 0' }, { translate: '-5px 0' }, { translate: '3px 0' }, { translate: '0 0' }], { duration: 450, easing: 'ease-out' });
  };

  return (
    <div ref={rootEl} className="city-map keep-light relative overflow-hidden rounded-3xl border-[3px] border-ink shadow-[0_8px_0_#16252D]" style={{ aspectRatio: '16 / 9', minHeight: 300, containerType: 'inline-size', background: chapter.ground }}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <rect width="1600" height="900" fill={chapter.ground} />
        <ellipse cx="380" cy="230" rx="300" ry="120" fill="#FFFFFF" opacity="0.28" />
        <ellipse cx="1100" cy="820" rx="380" ry="110" fill="#FFFFFF" opacity="0.28" />
        <path d="M1480 -20 C 1440 160 1590 300 1540 470 S 1470 760 1560 920 L 1640 920 L 1640 -20 Z" fill="#BFE0F5" stroke={INK} strokeWidth="5" />
        <g className="amb-water" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="30 90"><path d="M1530 0 C 1500 160 1630 300 1590 470 S 1520 760 1600 900" /></g>
        <path d={road} fill="none" stroke={INK} strokeWidth="88" strokeLinecap="round" />
        <path d={road} fill="none" stroke="#FBFAF5" strokeWidth="74" strokeLinecap="round" />
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
            {/* the next open stop bobs up and down to invite a tap (CSS: map-stop-bob), unless the device asks for less motion */}
            <button
              type="button"
              onClick={(e) => { if (s.state === 'locked') tapLocked(e.currentTarget); onSelect(i); }}
              aria-label={`Level ${bn(s.level.id)}, ${s.level.title}, ${label}`}
              aria-pressed={isSel}
              className={`map-stop absolute box-border cursor-pointer rounded-full p-0 font-display font-extrabold leading-none ${i === nextOpen ? 'map-stop-bob' : ''}`}
              style={{
                left: `${x}%`, top: `${y}%`, width: '6.2%', aspectRatio: '1', zIndex: 3,
                transform: 'translate(-50%,-50%)', scale: isSel ? '1.18' : '1',
                viewTransitionName: isSel ? `level-badge-${s.level.id}` : undefined,
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

      {/* position and direction are written by placeVan; the first paint parks it at the selected stop */}
      <div ref={vanEl} aria-hidden="true" className="pointer-events-none absolute z-[4]" style={{ left: `${start.x / 16}%`, top: `${start.y / 9 - 6.5}%`, width: '7%', transform: 'translate(-50%,-50%)', filter: 'drop-shadow(0 max(3px,0.4cqw) 0 rgba(22,37,45,.3))' }}>
        <div className="map-van-bob">
          <svg viewBox="0 0 120 70" className="block h-auto w-full"><rect x="4" y="10" width="72" height="42" rx="6" fill="#FFC02E" stroke={INK} strokeWidth="5" /><path d="M76 22h22l16 16v14H76z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M84 28h12l8 9H84z" fill="#BFE0F5" stroke={INK} strokeWidth="3" /><circle cx="28" cy="54" r="11" fill={INK} /><circle cx="92" cy="54" r="11" fill={INK} /><circle cx="28" cy="54" r="4" fill="#FFFFFF" /><circle cx="92" cy="54" r="4" fill="#FFFFFF" /><path d="M18 24h44M18 34h30" stroke={INK} strokeWidth="4" strokeLinecap="round" /></svg>
        </div>
      </div>

      <div className="absolute left-[2%] top-[3%] rounded-[14px] bg-white" style={{ padding: '0.35em 1em', border: `max(2px,0.25cqw) solid ${INK}`, boxShadow: `0 max(3px,0.4cqw) 0 ${INK}`, fontSize: 'max(12px,1.45cqw)' }}>
        <div className="text-[0.8em] font-bold" style={{ color: chapter.accent }}>{tr('অধ্যায়', 'Chapter')} {bn(chapter.id)} · {bn(stops.filter((s) => s.state === 'done').length)}/{bn(stops.length)} {tr('পাস', 'passed')}</div>
        <h1 className="m-0 font-display text-[1.45em] font-extrabold leading-[1.15]">{chapter.title}</h1>
      </div>
      <div role="status" className="pointer-events-none absolute bottom-[4%] left-1/2 whitespace-nowrap" style={{ transform: 'translateX(-50%)', fontSize: 'max(12px,1.45cqw)' }}>
        {lockNote > 0 && <span key={lockNote} className="map-toast block rounded-full bg-ink font-bold text-white" style={{ padding: '0.4em 1.1em' }}>{tr('এই level এখনো তালাবদ্ধ', 'This level is still locked')}</span>}
      </div>
    </div>
  );
}
