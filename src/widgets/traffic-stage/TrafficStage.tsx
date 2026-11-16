import type { CSSProperties, ReactNode } from 'react';
import type { Parcel, SimState } from '@/simulators/traffic';
import { multiplierFor } from '@/simulators/traffic';
import { bn, easeBack } from '@/shared/lib/bn';
import { hubY, type RoundFx } from './useTrafficRound';

const INK = '#16252D';
const HUB_LOOK = [
  { wall: '#DCE7F8', roof: '#2F6FDE' },
  { wall: '#FFE9C7', roof: '#E0483E' },
  { wall: '#E6F4F1', roof: '#0B8A7A' },
];

/** Where a parcel is, in % of the stage: the shared road, then a curve to its hub. */
function parcelPos(p: Parcel, hubs: number) {
  if (p.leg === 'approach') return { x: -4 + p.u * 46, y: 50 };
  const ty = hubY(p.target, hubs);
  const t = p.u;
  const m = 1 - t;
  return {
    x: m * m * m * 42 + 3 * m * m * t * 58 + 3 * m * t * t * 60 + t * t * t * 76,
    y: m * m * m * 50 + 3 * m * m * t * 50 + 3 * m * t * t * ty + t * t * t * ty,
  };
}

interface Props {
  sim: SimState;
  fx: RoundFx;
  /** The player may tap hubs and the lever. */
  interactive: boolean;
  onPickHub: (hub: number) => void;
  /** HUD extras: timer shown only while a timed round runs. */
  showTimer: boolean;
  children?: ReactNode;
}

export function TrafficStage({ sim, fx, interactive, onPickHub, showTimer, children }: Props) {
  const n = sim.hubs.length;
  const roads = Array.from({ length: n }, (_, i) => {
    const y = hubY(i, n) * 9;
    return `M672 450 C 928 450 960 ${y} 1216 ${y}`;
  }).join(' ');
  const roadPath = `M-60 450 H 672 ${roads}`;
  const left = sim.rules.durationSeconds ? Math.max(0, 1 - sim.t / sim.rules.durationSeconds) : 1;
  const mult = multiplierFor(sim);
  const shakeX = Math.sin(fx.clock * 70) * fx.shake * 9;
  const shakeY = Math.cos(fx.clock * 55) * fx.shake * 6;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-[3px] border-ink bg-[#D4EEF7] shadow-block"
      style={{ aspectRatio: '16 / 9', minHeight: 300, containerType: 'inline-size' }}
    >
      <div className="absolute inset-0" style={{ transform: `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)` }}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <rect width="1600" height="900" fill="#D4EEF7" />
          <g transform="translate(-440 -10)">
            <g className="amb-spin" stroke="#FFC02E" strokeWidth="10" strokeLinecap="round">
              <path d="M1340 20v28M1340 176v28M1248 112h28M1404 112h28M1275 47l20 20M1385 157l20 20M1275 177l20-20M1385 67l20-20" />
            </g>
            <circle cx="1340" cy="112" r="50" fill="#FFC02E" stroke={INK} strokeWidth="5" />
          </g>
          <g fill="#FFFFFF" stroke={INK} strokeWidth="4">
            <g className="amb-drift"><path d="M0 150a34 34 0 0 1 60-24 44 44 0 0 1 84 8 30 30 0 0 1 6 60H10a26 26 0 0 1-10-44z" /></g>
            <g className="amb-drift-slow"><path d="M0 80a24 24 0 0 1 44-16 32 32 0 0 1 60 6 22 22 0 0 1 4 42H8a18 18 0 0 1-8-32z" /></g>
          </g>
          <ellipse cx="420" cy="330" rx="520" ry="90" fill="#C3E0B4" />
          <ellipse cx="1250" cy="340" rx="560" ry="80" fill="#C3E0B4" />
          <path d="M0 320 Q 400 280 800 312 T 1600 304 V 900 H 0 Z" fill="#DCEBCB" />
          <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
            <rect x="40" y="318" width="74" height="72" fill="#FFFFFF" /><path d="M30 320 L77 282 L124 320 Z" fill="#E0483E" />
            <rect x="136" y="300" width="80" height="90" fill="#FFF4D6" /><path d="M126 302 L176 262 L226 302 Z" fill="#2F6FDE" />
            <rect x="238" y="330" width="66" height="60" fill="#FFFFFF" /><path d="M228 332 L271 298 L314 332 Z" fill="#FFC02E" />
            <rect x="160" y="340" width="26" height="50" fill="#0B8A7A" />
          </g>
          <path d={roadPath} fill="none" stroke={INK} strokeWidth="104" strokeLinecap="round" />
          <path d={roadPath} fill="none" stroke="#FBFAF5" strokeWidth="90" strokeLinecap="round" />
          <path d={roadPath} fill="none" stroke="#F3D9A0" strokeWidth="6" strokeDasharray="26 22" />
          <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
            <rect x="596" y="262" width="128" height="122" rx="12" fill="#0B8A7A" />
            <rect x="614" y="282" width="92" height="44" rx="6" fill="#E6F6F3" />
            <path d="M582 264 h156" strokeWidth="12" strokeLinecap="round" />
            <circle cx="660" cy="304" r="13" fill="#FFC02E" />
            <path d="M642 326 q18 -24 36 0" fill={INK} />
            <rect x="748" y="270" width="24" height="70" rx="8" fill={INK} />
          </g>
          <circle cx="760" cy="286" r="7" fill="#E0483E" />
          <circle cx="760" cy="305" r="7" fill="#FFC02E" />
          <circle className="amb-blink" cx="760" cy="324" r="7" fill="#3FD38A" />
          <g stroke={INK} strokeWidth="4">
            <g className="amb-sway"><rect x="118" y="610" width="10" height="46" fill="#8A5A3C" /><circle cx="123" cy="590" r="38" fill="#7FB37A" /></g>
            <g className="amb-sway amb-sway-b"><rect x="318" y="700" width="10" height="46" fill="#8A5A3C" /><circle cx="323" cy="680" r="34" fill="#6AA366" /></g>
            <g className="amb-sway"><rect x="498" y="600" width="10" height="40" fill="#8A5A3C" /><circle cx="503" cy="584" r="28" fill="#7FB37A" /></g>
          </g>
        </svg>

        {sim.parcels.map((p) => {
          const q = parcelPos(p, n);
          const w = Math.sin(fx.clock * 9 + p.wobble);
          let scale = 1;
          if (p.leg === 'approach' && p.u < 0.1) scale = p.u / 0.1;
          if (p.leg === 'branch' && p.u > 0.88) scale = Math.max(0, (1 - p.u) / 0.12);
          return (
            <div
              key={p.id}
              className="pointer-events-none absolute z-[2] box-border rounded-[16%] bg-parcel"
              style={{
                left: `${q.x}%`, top: `${q.y - Math.abs(w) * 1.8}%`, width: '4.3%', aspectRatio: '1',
                transform: `translate(-50%,-50%) rotate(${(w * 7).toFixed(1)}deg) scale(${scale.toFixed(2)})`,
                border: `max(2px,0.24cqw) solid ${INK}`, boxShadow: '0 max(2px,0.35cqw) 0 rgba(22,37,45,.3)',
              }}
            >
              <div className="absolute inset-x-0 top-[30%]" style={{ borderTop: `max(1.5px,0.18cqw) solid ${INK}` }} />
              <div className="absolute left-[44%] top-0 h-[30%]" style={{ borderLeft: `max(1.5px,0.18cqw) solid ${INK}` }} />
            </div>
          );
        })}

        <button
          type="button"
          aria-label="Lever ঘোরান"
          disabled={!interactive}
          onClick={() => onPickHub((sim.switchTo + 1) % n)}
          className="absolute z-[3] rounded-full bg-ink p-0 enabled:cursor-pointer"
          style={{ left: '42%', top: '50%', width: '8.4%', aspectRatio: '1', transform: 'translate(-50%,-50%)', border: `max(2px,0.3cqw) solid ${INK}`, boxShadow: '0 max(3px,0.5cqw) 0 rgba(22,37,45,.4)' }}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full" style={{ transition: 'transform .28s cubic-bezier(.34,1.56,.64,1)', transform: `rotate(${hubY(sim.switchTo, n) < 50 ? -36 : hubY(sim.switchTo, n) > 50 ? 36 : 0}deg)` }}>
            <path d="M18 50h46M48 30l22 20-22 20" fill="none" stroke="#FFC02E" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {sim.hubs.map((h, i) => {
          const look = HUB_LOOK[i % HUB_LOOK.length]!;
          const cap = sim.rules.hubs[i]!.capacity;
          const bump = fx.hubBump[i] ?? 0;
          const rot = h.warning ? Math.sin(fx.clock * 38) * 1.8 : 0;
          const selected = sim.switchTo === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onPickHub(i)}
              aria-label={`Hub ${bn(i + 1)}-এ পাঠান, জমা ${bn(h.queue)}${h.down ? ', বন্ধ' : ''}`}
              className="absolute z-[3] block border-0 bg-transparent p-0 text-ink enabled:cursor-pointer"
              style={{ left: '75.5%', top: `${hubY(i, n)}%`, width: '21.5%', transformOrigin: '50% 90%', transform: `translate(0,-50%) rotate(${rot.toFixed(2)}deg) scale(${(1 + 0.1 * bump).toFixed(3)},${(1 - 0.09 * bump).toFixed(3)})` }}
            >
              <svg viewBox="0 0 240 132" aria-hidden="true" className="block h-auto w-full" style={{ filter: h.down ? 'grayscale(1) brightness(.9)' : undefined }}>
                <rect x="22" y="52" width="204" height="76" fill={look.wall} stroke={INK} strokeWidth="5" />
                <path d="M8 56 L124 6 L240 56 Z" fill={look.roof} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
                <rect x="22" y="76" width="50" height="52" fill={INK} />
                <path d="M30 88h34M30 100h34M30 112h34" stroke="#FBFAF5" strokeWidth="4" />
                <rect x="98" y="72" width="44" height="34" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
                <rect x="162" y="72" width="44" height="34" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
                <circle cx="124" cy="36" r="9" fill={h.down ? '#E0483E' : '#3FD38A'} stroke={INK} strokeWidth="4" />
              </svg>
              <span className="mt-[3%] flex items-center gap-[4%]">
                <span
                  className="flex-none whitespace-nowrap rounded-full font-display font-extrabold"
                  style={{ padding: '0.05em 0.6em', border: `max(2px,0.22cqw) solid ${INK}`, fontSize: 'max(11px,1.45cqw)', background: selected ? '#FFC02E' : '#FFFFFF', boxShadow: selected ? `0 max(2px,0.3cqw) 0 ${INK}` : undefined }}
                >
                  Hub {bn(i + 1)}
                </span>
                <span className="flex flex-1 gap-[4%]">
                  {Array.from({ length: cap }, (_, k) => (
                    <span
                      key={k}
                      className="box-border flex-1 rounded-[22%]"
                      style={{ aspectRatio: '1', border: `max(1.5px,0.18cqw) solid ${INK}`, background: k < h.queue ? (h.queue >= cap ? '#E0483E' : h.queue >= cap - 2 ? '#FFC02E' : '#0B8A7A') : '#FFFFFF' }}
                    />
                  ))}
                </span>
              </span>
              {h.down && (
                <span
                  className="absolute left-[30%] top-[30%] rounded-[0.4em] bg-coral font-display font-extrabold text-white"
                  style={{ padding: '0.1em 0.7em', border: `max(2px,0.25cqw) solid ${INK}`, fontSize: 'max(13px,2cqw)', transform: 'rotate(-8deg)' }}
                >
                  বন্ধ
                </span>
              )}
            </button>
          );
        })}

        {fx.floaters.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none absolute z-[5] whitespace-nowrap font-display font-extrabold"
            style={{
              left: `${f.x}%`, top: `${(f.y - 6 - f.age * 9).toFixed(2)}%`,
              transform: `translate(-50%,-50%) scale(${(1 + 0.5 * Math.max(0, 1 - f.age * 5)).toFixed(2)})`,
              opacity: Math.min(1, (1 - f.age) * 2.2), fontSize: 'max(13px,2.1cqw)',
              color: { good: '#0B6F63', combo: '#B8730A', bad: '#C7372D', info: '#2F6FDE' }[f.tone],
              textShadow: '0 2px 0 #fff,2px 0 0 #fff,-2px 0 0 #fff,0 -2px 0 #fff',
            }}
          >
            {f.text}
          </div>
        ))}
        {fx.confetti.map((c) => (
          <div
            key={c.id}
            className="pointer-events-none absolute z-[11]"
            style={{ left: `${c.x}%`, top: `${c.y}%`, width: '1.2cqw', height: '0.7cqw', background: c.color, border: `1px solid ${INK}`, transform: `rotate(${c.rot.toFixed(0)}deg)` }}
          />
        ))}
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-[2%] top-[2.5%] z-[6] flex items-center gap-[1.4%] font-bold" style={{ fontSize: 'max(12px,1.5cqw)' }}>
        <Pill>
          <svg viewBox="0 0 20 20" aria-hidden="true" style={{ width: '1.2em', height: '1.2em' }}><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill="#FFC02E" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /></svg>
          <span className="font-mono">{bn(fx.shownScore)}</span>
        </Pill>
        <div
          className="rounded-full bg-ink text-parcel"
          style={{ padding: '0.3em 0.9em', border: `max(2px,0.22cqw) solid ${INK}`, transformOrigin: '0 50%', transform: `scale(${sim.combo >= 3 ? (1 + fx.comboPulse * 0.25).toFixed(2) : 0})` }}
        >
          টানা {bn(sim.combo)} · ×{bn(mult)}
        </div>
        <div className="box-border flex-1 overflow-hidden rounded-full bg-white" style={{ height: '0.9em', border: `max(2px,0.22cqw) solid ${INK}`, opacity: showTimer ? 1 : 0 }}>
          <div className="h-full" style={{ width: `${(left * 100).toFixed(1)}%`, background: left < 0.25 ? '#E0483E' : '#0B8A7A' }} />
        </div>
        <Pill label={`Customer খুশি ${bn(sim.happiness)}%`}>
          <svg viewBox="0 0 20 20" aria-hidden="true" style={{ width: '1.2em', height: '1.2em' }}><path d="M10 17S2.5 12.4 2.5 7.2A4 4 0 0 1 10 5.3a4 4 0 0 1 7.5 1.9C17.5 12.4 10 17 10 17z" fill="#E0483E" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /></svg>
          <span className="block overflow-hidden rounded-full bg-locked" style={{ width: '6em', height: '0.7em' }}>
            <span className="block h-full" style={{ width: `${sim.happiness}%`, background: sim.happiness < 40 ? '#E0483E' : '#3FB37A', transition: 'width .25s' }} />
          </span>
        </Pill>
      </div>

      {fx.banner && <BannerView text={fx.banner.text} tone={fx.banner.tone} age={fx.banner.age} />}
      {children}
    </div>
  );
}

function Pill({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role={label ? 'img' : undefined} aria-label={label} className="flex items-center rounded-full bg-white" style={{ gap: '0.4em', padding: '0.3em 0.9em', border: `max(2px,0.22cqw) solid ${INK}`, boxShadow: `0 max(2px,0.3cqw) 0 ${INK}` }}>
      {children}
    </div>
  );
}

function BannerView({ text, tone, age }: { text: string; tone: 'bad' | 'good'; age: number }) {
  const pop = easeBack(age / 0.35);
  const style: CSSProperties = {
    left: '50%', top: '13%', padding: '0.35em 1.1em', border: `max(2px,0.25cqw) solid ${INK}`,
    boxShadow: `0 max(3px,0.4cqw) 0 ${INK}`, fontSize: 'max(13px,1.9cqw)',
    background: tone === 'bad' ? '#E0483E' : '#3FD38A', color: tone === 'bad' ? '#FFFFFF' : INK,
    opacity: Math.min(1, (2.6 - age) * 4),
    transform: `translate(-50%, ${((1 - pop) * -40).toFixed(1)}px) scale(${(0.6 + 0.4 * pop).toFixed(2)})`,
  };
  return (
    <div role="status" className="pointer-events-none absolute z-[7] whitespace-nowrap rounded-[14px] font-display font-extrabold" style={style}>
      {text}
    </div>
  );
}
