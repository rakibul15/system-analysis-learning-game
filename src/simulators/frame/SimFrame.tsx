import { useEffect, useRef, useState, type ReactNode } from 'react';
import { bn } from '@/shared/lib/bn';

export interface Mission { text: string; done: boolean; hint?: string }
export interface Metric { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }

/** Latches each condition the first time it becomes true (a mission stays done). */
export function useLatched(conds: boolean[]): boolean[] {
  const ref = useRef<boolean[]>(conds.map(() => false));
  ref.current = ref.current.map((v, i) => v || !!conds[i]);
  return ref.current;
}

/** Calls fn(dt) about `hz` times a second while mounted and `running`. */
export function useTicker(fn: (dt: number) => void, hz = 30, running = true) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      f.current(Math.min(0.2, (now - last) / 1000));
      last = now;
    }, 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz, running]);
}

interface Props {
  title: string;
  intro: string;
  controls: ReactNode;
  stage: ReactNode;
  metrics: Metric[];
  missions: Mission[];
  onFinish: (missionsDone: number) => void;
}

/**
 * The shared simulator layout from the plan: controls on the left, the moving
 * picture in the middle, numbers on the right, missions underneath.
 */
export function SimFrame({ title, intro, controls, stage, metrics, missions, onFinish }: Props) {
  const done = missions.filter((m) => m.done).length;
  const [celebrated, setCelebrated] = useState(0);
  useEffect(() => { if (done > celebrated) setCelebrated(done); }, [done, celebrated]);
  const all = done === missions.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="pop-in">
        <p className="m-0 text-sm font-bold text-route-deep">ধাপ ৪ · Simulator</p>
        <h2 className="m-0 font-display text-[28px] font-extrabold leading-tight">{title}</h2>
        <p className="m-0 mt-1 text-ink-soft">{intro}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_200px]">
        <section aria-label="Control" className="flex flex-col gap-4 rounded-[20px] border-[3px] border-ink bg-white p-4 shadow-[0_5px_0_#16252D]">
          {controls}
        </section>
        <section aria-label="Simulation" className="relative min-h-[300px] overflow-hidden rounded-[20px] border-[3px] border-ink bg-[#F7F8F3] shadow-[0_5px_0_#16252D]" style={{ containerType: 'inline-size' }}>
          {stage}
        </section>
        <section aria-label="সংখ্যা" aria-live="polite" className="grid grid-cols-2 gap-2 self-start lg:grid-cols-1">
          {metrics.map((m) => (
            <div key={m.label} className={`rounded-2xl border-[2.5px] border-ink p-3 ${m.tone === 'good' ? 'bg-route-soft' : m.tone === 'bad' ? 'bg-coral-soft' : 'bg-white'}`}>
              <div className="text-xs font-semibold text-muted">{m.label}</div>
              <div className="font-mono text-xl font-bold">{m.value}</div>
            </div>
          ))}
        </section>
      </div>

      <section aria-label="Mission" className="rounded-[20px] border-[3px] border-ink bg-white p-4 shadow-[0_5px_0_#16252D]">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="m-0 font-display text-lg font-bold">Mission</h3>
          <span className="font-mono text-sm font-bold">{bn(done)}/{bn(missions.length)}</span>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {missions.map((m, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${m.done ? 'border-route bg-route-soft' : 'border-[#C9D0C3] bg-white'}`}>
              <span className={`grid h-7 w-7 flex-none place-items-center rounded-full border-2 border-ink text-sm font-bold ${m.done ? 'pop-in bg-route text-white' : 'bg-white'}`}>{m.done ? '✓' : bn(i + 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{m.text}</span>
                {!m.done && m.hint && <span className="block text-sm text-muted">{m.hint}</span>}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => onFinish(done)}
          className={`btn-press mt-4 min-h-[54px] w-full cursor-pointer rounded-2xl border-[3px] border-ink font-display text-xl font-extrabold shadow-[0_5px_0_#16252D] ${all ? 'bg-parcel' : 'bg-white'}`}
        >
          {all ? 'সব mission শেষ! Boss-এর দিকে →' : `এখানেই থামুন (${bn(done)}/${bn(missions.length)}) · Boss-এর দিকে`}
        </button>
      </section>
    </div>
  );
}

/* small shared controls */

export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => bn(v, { grouping: false }) }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1.5 font-semibold">
      <span className="flex justify-between gap-2 text-sm"><span>{label}</span><span className="font-mono">{format(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-6 w-full cursor-pointer accent-[#0B8A7A]" />
    </label>
  );
}

export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
            className={`min-h-10 cursor-pointer rounded-xl border-2 border-ink px-2.5 text-sm font-semibold ${value === o.id ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white px-3 text-left text-sm font-semibold">
      <span>{label}</span>
      <span className={`relative h-6 w-11 flex-none rounded-full border-2 border-ink transition-colors ${on ? 'bg-route' : 'bg-locked'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function ActionButton({ children, onClick, tone = 'light' }: { children: ReactNode; onClick: () => void; tone?: 'light' | 'warn' | 'go' }) {
  const bg = tone === 'warn' ? 'bg-coral text-white' : tone === 'go' ? 'bg-parcel text-ink' : 'bg-white text-ink';
  return (
    <button type="button" onClick={onClick} className={`btn-press min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink px-3 font-bold shadow-[0_3px_0_#16252D] ${bg}`}>{children}</button>
  );
}

export const pct = (x: number) => `${bn(Math.round(x * 100), { grouping: false })}%`;
