import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { chapterOneStops, levels, type MapStop } from '@/content/levels';
import { totalXp, useProgress, type LevelResult } from '@/entities/progress/store';
import { bn, easeBack } from '@/shared/lib/bn';

const INK = '#16252D';
const ROAD = 'M-60 790 Q 100 742 224 702 T 544 522 T 896 576 T 1184 342 T 1472 198 L 1660 120';
const RIVER = 'M1290 -20 C 1250 140 1430 260 1390 420 S 1310 700 1430 920 L 1570 920 C 1470 700 1550 560 1530 420 S 1410 160 1450 -20 Z';

type StopState = 'done' | 'open' | 'soon' | 'locked';

function stateOf(stop: MapStop, progress: Record<number, LevelResult>): StopState {
  if (stop.requires && !progress[stop.requires]?.completed) return 'locked';
  if (!levels[stop.id]) return 'soon';
  return progress[stop.id]?.completed ? 'done' : 'open';
}

export function MapPage() {
  const progress = useProgress((s) => s.levels);
  const stops = chapterOneStops.map((s) => ({ ...s, state: stateOf(s, progress), result: progress[s.id] }));
  const firstOpen = stops.findIndex((s) => s.state === 'open');
  const lastDone = stops.map((s) => s.state).lastIndexOf('done');
  const [sel, setSel] = useState(firstOpen >= 0 ? firstOpen : Math.max(0, lastDone));
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const road = useRef<SVGPathElement>(null);
  const anim = useRef({ clock: 0, lens: null as number[] | null, total: 0, vanL: 0, dir: 1, moving: 0, cardAt: 0, lockAt: -9, pickAt: -9 });

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      const a = anim.current;
      a.clock += dt;
      const r = road.current;
      if (r && !a.lens) {
        a.total = r.getTotalLength();
        a.lens = chapterOneStops.map((s) => {
          let best = { d: Infinity, l: 0 };
          for (let i = 0; i <= 600; i++) {
            const l = (a.total * i) / 600;
            const p = r.getPointAtLength(l);
            const d = (p.x - s.x) ** 2 + (p.y - s.y) ** 2;
            if (d < best.d) best = { d, l };
          }
          return best.l;
        });
        a.vanL = a.lens[sel]!;
      }
      if (a.lens) {
        const target = a.lens[selRef.current]!;
        const d = target - a.vanL;
        if (Math.abs(d) > 1) {
          const v = Math.max(140, Math.min(900, Math.abs(d) * 2.6)) * dt;
          a.dir = d > 0 ? 1 : -1;
          a.moving = 1;
          a.vanL += Math.abs(d) < v ? d : a.dir * v;
        } else {
          a.moving *= Math.exp(-dt * 8);
          a.dir = 1;
        }
      }
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selRef = useRef(sel);
  selRef.current = sel;

  const a = anim.current;
  let van = { x: stops[sel]!.x / 16, y: stops[sel]!.y / 9, ang: 0 };
  if (road.current && a.lens) {
    const p = road.current.getPointAtLength(a.vanL);
    const q = road.current.getPointAtLength(Math.min(a.total, a.vanL + 6));
    van = { x: p.x / 16, y: p.y / 9, ang: Math.max(-30, Math.min(30, (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI)) };
  }
  const bob = Math.abs(Math.sin(a.clock * (a.moving > 0.3 ? 16 : 3))) * (a.moving > 0.3 ? 0.5 : 0.25);
  const S = stops[sel]!;
  const cardPop = easeBack((a.clock - a.cardAt) / 0.35);
  const lockAge = a.clock - a.lockAt;
  const done = stops.filter((s) => s.state === 'done').length;

  const pick = (i: number) => {
    if (stops[i]!.state === 'locked') a.lockAt = a.clock;
    if (i !== sel) {
      setSel(i);
      a.cardAt = a.clock;
    }
    a.pickAt = a.clock;
  };

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-b-[3px] border-ink bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="#FFC02E" stroke={INK} strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke={INK} strokeWidth="2.5" /></svg>
          <span className="font-display text-[26px] font-extrabold">ParcelGo</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-bold">
          <span className="rounded-xl border-[2.5px] border-ink px-3 py-1.5 font-mono">{bn(totalXp(progress))} XP</span>
          <span className="rounded-xl border-[2.5px] border-ink bg-route-soft px-3 py-1.5">অধ্যায় ১: {bn(done)}/{bn(stops.length)}</span>
        </div>
      </header>

      <main className="mx-auto box-border flex max-w-[1280px] flex-col gap-4.5 px-4 pb-9 pt-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink bg-grass shadow-[0_8px_0_#16252D]" style={{ aspectRatio: '16 / 9', minHeight: 300, containerType: 'inline-size' }}>
          <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
            <rect width="1600" height="900" fill="#DCEBCB" />
            <ellipse cx="330" cy="250" rx="260" ry="130" fill="#C9E2B8" />
            <ellipse cx="1000" cy="800" rx="330" ry="110" fill="#C9E2B8" />
            <g transform="rotate(-8 300 820)"><rect x="140" y="770" width="330" height="130" fill="#D3E5BE" stroke={INK} strokeWidth="4" /><path d="M140 800h330M140 830h330M140 860h330" stroke="#A9C790" strokeWidth="5" /></g>
            <path d={RIVER} fill="#BFE0F5" stroke={INK} strokeWidth="5" />
            <g className="amb-water" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="30 90"><path d="M1370 0 C 1330 150 1500 260 1460 420 S 1390 700 1500 900" /></g>
            <path d={ROAD} fill="none" stroke={INK} strokeWidth="88" strokeLinecap="round" />
            <path ref={road} d={ROAD} fill="none" stroke="#FBFAF5" strokeWidth="74" strokeLinecap="round" />
            <defs><clipPath id="riverClip"><path d={RIVER} /></clipPath></defs>
            <g clipPath="url(#riverClip)">
              <path d={ROAD} fill="none" stroke={INK} strokeWidth="96" />
              <path d={ROAD} fill="none" stroke="#A9744F" strokeWidth="80" />
              <path d={ROAD} fill="none" stroke={INK} strokeWidth="80" strokeDasharray="4 22" opacity="0.4" />
            </g>
            <path className="amb-ants" d="M-60 790 Q 100 742 224 702 T 544 522 T 896 576" fill="none" stroke="#0B8A7A" strokeWidth="9" strokeDasharray="24 20" strokeLinecap="round" />
            <path d="M896 576 T 1184 342 T 1472 198 L 1660 120" fill="none" stroke="#C9D0C3" strokeWidth="7" strokeDasharray="20 24" strokeLinecap="round" />
            <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
              <rect x="96" y="548" width="112" height="86" fill="#FFFFFF" /><path d="M82 552 L152 496 L222 552 Z" fill="#E0483E" /><rect x="136" y="584" width="32" height="50" fill="#FFC02E" />
              <rect x="420" y="372" width="96" height="76" fill="#FFFFFF" /><path d="M408 376 L468 328 L528 376 Z" fill="#E0483E" />
              <rect x="560" y="352" width="170" height="100" fill="#DCE7F8" /><path d="M548 356 L645 306 L742 356 Z" fill="#2F6FDE" />
              <rect x="606" y="388" width="78" height="64" fill="#FFFFFF" /><path d="M606 406h78M606 422h78M606 438h78" strokeWidth="3" />
              <rect x="700" y="290" width="18" height="46" fill="#8A5A3C" />
              <rect x="850" y="408" width="104" height="100" rx="10" fill="#0B8A7A" /><rect x="866" y="424" width="72" height="36" rx="5" fill="#E6F6F3" /><path d="M838 410 h128" strokeWidth="10" strokeLinecap="round" />
              <rect x="974" y="418" width="22" height="60" rx="7" fill={INK} />
            </g>
            <circle cx="985" cy="432" r="6" fill="#E0483E" /><circle cx="985" cy="448" r="6" fill="#FFC02E" /><circle className="amb-blink" cx="985" cy="464" r="6" fill="#3FD38A" />
            <g fill="#FFFFFF" stroke={INK} strokeWidth="3">
              <circle className="amb-smoke" cx="709" cy="282" r="14" /><circle className="amb-smoke amb-smoke-b" cx="709" cy="282" r="14" /><circle className="amb-smoke amb-smoke-c" cx="709" cy="282" r="14" />
            </g>
            <g stroke="#7C8A84" strokeWidth="5" strokeLinejoin="round" opacity="0.85"><rect x="1110" y="176" width="130" height="96" fill="#EEF1EA" /><path d="M1124 200h102M1124 224h102M1124 248h102" strokeWidth="4" /></g>
            <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
              <path d="M622 300 L640 196 L658 300 Z" fill="#FFFFFF" />
              <g className="amb-spin-fast" style={{ transformOrigin: '640px 196px' }}><path d="M640 196 L640 120 L662 132 Z M640 196 L716 196 L704 218 Z M640 196 L640 272 L618 260 Z M640 196 L564 196 L576 174 Z" fill="#FFC02E" /></g>
              <circle cx="640" cy="196" r="8" fill={INK} />
            </g>
            <g stroke={INK} strokeWidth="4">
              <g className="amb-sway"><rect x="238" y="250" width="10" height="42" fill="#8A5A3C" /><circle cx="243" cy="232" r="34" fill="#7FB37A" /></g>
              <g className="amb-sway amb-sway-b"><rect x="338" y="210" width="10" height="42" fill="#8A5A3C" /><circle cx="343" cy="194" r="28" fill="#6AA366" /></g>
              <g className="amb-sway"><rect x="938" y="770" width="10" height="42" fill="#8A5A3C" /><circle cx="943" cy="752" r="34" fill="#6AA366" /></g>
            </g>
            <rect x="1470" y="0" width="130" height="900" fill="#F2F5EF" opacity="0.55" />
          </svg>

          {stops.map((s, i) => {
            const selected = i === sel;
            const x = s.x / 16;
            const y = s.y / 9;
            const bounce = s.state === 'open' ? Math.abs(Math.sin(a.clock * 3.2)) * 1.4 : 0;
            const shake = s.state === 'locked' && lockAge < 0.5 && selected ? Math.sin(lockAge * 60) * (0.5 - lockAge) * 2.4 : 0;
            const pop = selected ? 0.92 + 0.26 * easeBack((a.clock - a.pickAt) / 0.3) : 1;
            const faded = s.state === 'locked' || s.state === 'soon';
            const bg = s.state === 'done' ? '#0B8A7A' : s.state === 'open' ? '#FFC02E' : '#E3E6DF';
            const label = { done: 'শেষ', open: 'খেলা যায়', soon: 'শীঘ্রই আসছে', locked: 'তালাবদ্ধ' }[s.state];
            return (
              <div key={s.id}>
                {s.result && s.result.stars > 0 && (
                  <span aria-hidden="true" className="pointer-events-none absolute flex" style={{ left: `${x}%`, top: `${y - 8.5}%`, transform: 'translate(-50%,-50%)', gap: '0.2cqw' }}>
                    {[0, 1, 2].map((k) => (
                      <svg key={k} viewBox="0 0 20 20" style={{ width: '2.1cqw', height: '2.1cqw', transform: `scale(${(1 + 0.12 * Math.sin(a.clock * 4 + k * 1.3)).toFixed(2)})` }}>
                        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill={k < s.result!.stars ? '#FFC02E' : '#FFFFFF'} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
                      </svg>
                    ))}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-label={`Level ${s.num}, ${s.name}, ${label}`}
                  aria-pressed={selected}
                  className="absolute box-border cursor-pointer rounded-full p-0 font-display font-extrabold leading-none"
                  style={{
                    left: `${x + shake}%`, top: `${y - bounce}%`, width: '6.4%', aspectRatio: '1',
                    transform: `translate(-50%,-50%) scale(${pop.toFixed(3)})`,
                    border: `max(2.5px,0.34cqw) ${s.state === 'soon' ? 'dashed' : 'solid'} ${faded ? '#7C8A84' : INK}`,
                    background: bg, color: s.state === 'done' ? '#FFFFFF' : faded ? '#5D6B66' : INK, fontSize: 'max(15px,2.6cqw)',
                    boxShadow: `0 max(3px,0.5cqw) 0 ${faded ? '#7C8A84' : INK}${selected ? `,0 0 0 max(4px,0.6cqw) #FFFFFF,0 0 0 max(6px,0.85cqw) ${INK}` : ''}`,
                  }}
                >
                  {s.num}
                </button>
                <span
                  className="pointer-events-none absolute whitespace-nowrap rounded-full font-display font-bold"
                  style={{ left: `${x}%`, top: `${y + 8}%`, transform: 'translate(-50%,-50%)', padding: '0.05em 0.7em', background: selected ? INK : 'rgba(255,255,255,.92)', color: selected ? '#FFFFFF' : INK, fontSize: 'max(11px,1.45cqw)' }}
                >
                  {s.name}
                </span>
              </div>
            );
          })}

          <div aria-hidden="true" className="pointer-events-none absolute z-[4]" style={{ left: `${van.x}%`, top: `${van.y - 6.5 - bob}%`, width: '7.6%', transform: `translate(-50%,-50%) scaleX(${a.dir}) rotate(${(a.moving > 0.3 ? van.ang : 0).toFixed(1)}deg)`, filter: 'drop-shadow(0 max(3px,0.4cqw) 0 rgba(22,37,45,.3))' }}>
            <svg viewBox="0 0 120 70" className="block h-auto w-full"><rect x="4" y="10" width="72" height="42" rx="6" fill="#FFC02E" stroke={INK} strokeWidth="5" /><path d="M76 22h22l16 16v14H76z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M84 28h12l8 9H84z" fill="#BFE0F5" stroke={INK} strokeWidth="3" /><circle cx="28" cy="54" r="11" fill={INK} /><circle cx="92" cy="54" r="11" fill={INK} /><circle cx="28" cy="54" r="4" fill="#FFFFFF" /><circle cx="92" cy="54" r="4" fill="#FFFFFF" /><path d="M18 24h44M18 34h30" stroke={INK} strokeWidth="4" strokeLinecap="round" /></svg>
          </div>

          <div className="absolute left-[2%] top-[3%] rounded-[14px] bg-white" style={{ padding: '0.35em 1em', border: `max(2px,0.25cqw) solid ${INK}`, boxShadow: `0 max(3px,0.4cqw) 0 ${INK}`, fontSize: 'max(12px,1.5cqw)' }}>
            <div className="text-[0.8em] font-bold text-route-deep">অধ্যায় ১ · {bn(done)}/{bn(stops.length)} শেষ</div>
            <h1 className="m-0 font-display text-[1.5em] font-extrabold leading-[1.15]">শূন্য থেকে লাখো customer</h1>
          </div>
          <div className="absolute right-[1.2%] top-[4%] rounded-xl bg-ink text-center font-bold leading-[1.3] text-white" style={{ padding: '0.3em 0.8em', fontSize: 'max(11px,1.25cqw)' }}>
            অধ্যায় ২<br />Level ৪-এর পর
          </div>
          <div role="status" className="pointer-events-none absolute bottom-[5%] left-1/2 whitespace-nowrap rounded-full bg-ink font-bold text-white" style={{ padding: '0.4em 1.1em', fontSize: 'max(12px,1.5cqw)', opacity: lockAge < 2.2 ? Math.min(1, (2.2 - lockAge) * 4) : 0, transform: `translate(-50%, ${((1 - easeBack(lockAge / 0.3)) * 30).toFixed(1)}px)` }}>
            {lockAge < 2.2 ? 'আগে Level ৩ শেষ করুন, তারপর এই রাস্তা খুলবে' : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-4.5">
          <section aria-live="polite" className="box-border min-w-0 flex-[999_1_460px] rounded-[20px] border-[3px] border-ink bg-white px-5.5 py-5 shadow-[0_6px_0_#16252D]" style={{ transformOrigin: '20% 0', transform: `scale(${(0.94 + 0.06 * cardPop).toFixed(3)}) translateY(${((1 - cardPop) * 10).toFixed(1)}px)` }}>
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="grid h-14 w-14 flex-none place-items-center rounded-full border-[3px] border-ink font-display text-[28px] font-extrabold leading-none" style={{ background: S.state === 'done' ? '#0B8A7A' : S.state === 'open' ? '#FFC02E' : '#E3E6DF', color: S.state === 'done' ? '#FFFFFF' : INK }}>{S.num}</span>
              <div className="min-w-0 flex-[1_1_200px]">
                <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.2]">{S.name}</h2>
                <span className="mt-0.5 inline-block rounded-lg bg-route-soft px-2.5 py-0.5 text-[13px] font-bold text-route-deep">{S.concept}</span>
              </div>
              {S.result && S.result.plays > 0 && (
                <div className="text-right"><div className="text-xs font-semibold text-muted">সেরা নম্বর</div><div className="font-mono text-[26px] font-bold">{bn(S.result.bestScore)}</div></div>
              )}
            </div>
            <p className="mb-4 mt-3 text-base">{S.desc}</p>
            {(S.state === 'open' || S.state === 'done') && (
              <Link to="/level/$levelId" params={{ levelId: String(S.id) }} className="btn-press inline-flex min-h-[52px] items-center justify-center rounded-2xl border-[3px] border-ink bg-parcel px-8 font-display text-[21px] font-extrabold text-ink no-underline shadow-[0_5px_0_#16252D]">
                {S.state === 'done' ? 'আবার খেলে নম্বর বাড়ান' : `খেলুন · ~${bn(levels[S.id]!.estMinutes)} মিনিট`}
              </Link>
            )}
            {S.state === 'soon' && <p className="m-0 rounded-[14px] border-[2.5px] border-dashed border-[#9AA69F] px-4 py-3 font-semibold text-muted">এই level এখনো বানানো হয়নি। Pilot-এ শুধু Level ৩ খেলা যায়।</p>}
            {S.state === 'locked' && <p className="m-0 rounded-[14px] border-[2.5px] border-dashed border-[#9AA69F] px-4 py-3 font-semibold text-muted">তালাবদ্ধ · Level ৩ শেষ করলে খুলবে</p>}
          </section>
          <aside className="box-border min-w-0 flex-[1_1_300px] rounded-[18px] border-[2.5px] border-ink bg-white px-4.5 py-4">
            <h2 className="m-0 mb-2 font-display text-lg font-bold">Pilot সংস্করণ</h2>
            <p className="m-0 text-sm text-ink-soft">এখন শুধু Level ৩ পুরো তৈরি। Review, boss আর বাকি level পরের ধাপে আসবে। আপনার নম্বর এই browser-এ জমা থাকে।</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
