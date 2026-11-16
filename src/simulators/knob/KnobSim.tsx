import { useState, type ReactNode } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, Choice, SimFrame, Slider, Toggle, useLatched, type Metric } from '../frame/SimFrame';

/**
 * A declarative simulator: knobs set a state, a pure model turns the state into numbers,
 * and missions are predicates over both. Used for the levels whose idea is a trade-off
 * between a few settings rather than something that moves.
 */
export type Val = number | boolean | string;
export type State = Record<string, Val>;

export type Control =
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step?: number; unit?: string }
  | { kind: 'toggle'; key: string; label: string }
  | { kind: 'choice'; key: string; label: string; options: { id: string; label: string }[] };

export interface Reading { id: string; label: string; value: number; unit?: string; good?: boolean; digits?: number }
export interface Outcome { readings: Reading[]; picture?: ReactNode; note?: string }

export interface KnobSpec<S extends State> {
  title: string;
  intro: string;
  init: S;
  controls: Control[];
  /** Buttons that change the state (an event such as "crash a broker"). */
  actions?: { label: string; tone?: 'light' | 'warn' | 'go'; run: (s: S) => Partial<S> }[];
  model: (s: S) => Outcome;
  missions: { text: string; hint?: string; ok: (s: S, r: Record<string, number>) => boolean }[];
}

export const fmt = (v: number, digits = 0) => bn(digits ? v.toFixed(digits) : Math.round(v), { grouping: !digits });

export function KnobSim<S extends State>({ spec, onFinish }: { spec: KnobSpec<S>; onFinish: (done: number) => void }) {
  const [s, setS] = useState<S>(spec.init);
  const out = spec.model(s);
  const r = Object.fromEntries(out.readings.map((x) => [x.id, x.value]));
  const done = useLatched(spec.missions.map((m) => m.ok(s, r)));
  const set = (patch: Partial<S>) => setS((old) => ({ ...old, ...patch }));

  const metrics: Metric[] = out.readings.map((x) => ({
    label: x.label,
    value: `${fmt(x.value, x.digits)}${x.unit ? ` ${x.unit}` : ''}`,
    tone: x.good === undefined ? 'neutral' : x.good ? 'good' : 'bad',
  }));

  return (
    <SimFrame
      title={spec.title}
      intro={spec.intro}
      onFinish={onFinish}
      controls={<>
        {spec.controls.map((c) => {
          if (c.kind === 'slider') return <Slider key={c.key} label={c.label} value={s[c.key] as number} min={c.min} max={c.max} step={c.step} onChange={(v) => set({ [c.key]: v } as Partial<S>)} format={(v) => `${fmt(v, c.step && c.step < 1 ? 1 : 0)}${c.unit ? ` ${c.unit}` : ''}`} />;
          if (c.kind === 'toggle') return <Toggle key={c.key} label={c.label} on={!!s[c.key]} onChange={(v) => set({ [c.key]: v } as Partial<S>)} />;
          return <Choice key={c.key} label={c.label} value={s[c.key] as string} options={c.options} onChange={(v) => set({ [c.key]: v } as Partial<S>)} />;
        })}
        {spec.actions && (
          <div className="flex flex-wrap gap-2">
            {spec.actions.map((a) => <ActionButton key={a.label} tone={a.tone} onClick={() => set(a.run(s))}>{a.label}</ActionButton>)}
          </div>
        )}
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          {out.picture}
          {out.note && <p className="pop-in m-0 rounded-xl border-2 border-ink bg-white px-3 py-2 text-[15px]" key={out.note}>{out.note}</p>}
        </div>
      }
      metrics={metrics}
      missions={spec.missions.map((m, i) => ({ text: m.text, hint: m.hint, done: done[i]! }))}
    />
  );
}

/* small picture helpers shared by the specs */

/** Horizontal bars, each with an optional target line. */
export function Bars({ rows }: { rows: { label: string; value: number; max: number; target?: number; bad?: boolean; text?: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label={rows.map((r) => `${r.label}: ${r.text ?? r.value}`).join(', ')}>
      {rows.map((r) => (
        <div key={r.label} className="text-sm">
          <div className="flex justify-between gap-2 font-semibold"><span>{r.label}</span><span className="font-mono">{r.text ?? fmt(r.value)}</span></div>
          <div className="relative mt-1 h-4 overflow-hidden rounded-md border-2 border-ink bg-white">
            <div className="h-full transition-[width] duration-300" style={{ width: `${Math.min(100, (r.value / r.max) * 100)}%`, background: r.bad ? '#E0483E' : '#0B8A7A' }} />
            {r.target !== undefined && <div className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${Math.min(100, (r.target / r.max) * 100)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A row of labelled boxes, for things like bit layouts or pipelines. */
export function Strip({ cells }: { cells: { label: string; flex: number; color: string; sub?: string }[] }) {
  return (
    <div className="flex w-full overflow-hidden rounded-xl border-[2.5px] border-ink">
      {cells.map((c, i) => (
        <div key={i} className="min-w-0 border-r-2 border-ink px-1.5 py-2 text-center text-xs font-bold last:border-r-0" style={{ flex: c.flex, background: c.color }}>
          <div className="truncate">{c.label}</div>
          {c.sub && <div className="truncate font-mono font-normal">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
