import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Flow, useReducedMotion, type FlowLink, type FlowNode } from '@/simulators/knob/anim';
import type { CalcInput, CalcOut, SeqStep, Stage } from '@/content/xu/types';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { play } from '@/shared/lib/sound';

/*
 * The moving pictures of our study notes. Anything that ticks runs only while it is on screen,
 * so a long note full of pictures costs a phone nothing for the ones scrolled away.
 */

/** True while the element is on screen (or near it). */
export function useInView<T extends Element>(margin = '120px') {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(!!e?.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, on] as const;
}

/** A picture that animates on its own (Flow): drawn only while on screen, its space kept meanwhile. */
export function LiveFlow({ nodes, links, h = 56, label, fresh }: { nodes: FlowNode[]; links: FlowLink[]; h?: number; label: string; fresh?: string[] }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return <div ref={ref} style={{ aspectRatio: `100 / ${h}` }}>{on && <Flow nodes={nodes} links={links} h={h} label={label} fresh={fresh} />}</div>;
}

/** The frame every picture sits in: light even in dark mode, with its caption. */
export function Figure({ label, children, tone = 'sunk' }: { label: string; children: ReactNode; tone?: 'sunk' | 'surface' }) {
  return (
    <figure className={`keep-light light-board m-0 flex flex-col gap-2 rounded-[18px] border-[2.5px] border-ink p-3 text-ink ${tone === 'sunk' ? 'bg-surface-sunk' : 'bg-surface'}`}>
      <figcaption className="text-sm font-bold">{label}</figcaption>
      {children}
    </figure>
  );
}

const btn = 'min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-3 text-sm font-bold disabled:cursor-default disabled:opacity-40';
const btnMain = 'btn-press min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink bg-parcel px-4 text-sm font-extrabold text-night shadow-[0_3px_0_var(--color-shadow)]';

/* ------------------------------------------------------------------ Stages */

/** A design that grows: one stage at a time, the boxes new to it outlined. */
export function Stages({ label, stages }: { label: string; stages: Stage[] }) {
  const [i, setI] = useState(0);
  const s = stages[i]!;
  const before = new Set(i > 0 ? stages[i - 1]!.nodes.map((n) => n.id) : []);
  const fresh = i > 0 ? s.nodes.filter((n) => !before.has(n.id)).map((n) => n.id) : [];
  const go = (k: number) => { setI(Math.max(0, Math.min(stages.length - 1, k))); play('tap'); };
  return (
    <Figure label={label}>
      <div role="tablist" aria-label={tr('ধাপ', 'Stages')} className="flex flex-wrap gap-1">
        {stages.map((x, k) => (
          <button key={x.title} type="button" role="tab" aria-selected={k === i} title={x.title} onClick={() => go(k)}
            className={`grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink px-1.5 text-sm font-bold ${k === i ? 'bg-ink text-on-ink' : k < i ? 'bg-route-soft' : 'bg-surface'}`}>{bn(k + 1)}</button>
        ))}
      </div>
      <div className="rounded-xl border-2 border-ink bg-surface p-1">
        <LiveFlow key={i} nodes={s.nodes} links={s.links} h={s.h ?? 34} label={`${s.title}: ${s.fix}`} fresh={fresh} />
      </div>
      <div className="flex flex-col gap-1.5" aria-live="polite">
        <p className="m-0 font-display text-lg font-extrabold">{tr(`ধাপ ${bn(i + 1)}/${bn(stages.length)}`, `Stage ${i + 1}/${stages.length}`)} · {s.title}</p>
        <p className="m-0 text-[15px]"><b className="text-coral-deep">{tr('যা ভাঙল:', 'What broke:')}</b> {s.problem}</p>
        <p className="m-0 text-[15px]"><b className="text-route-deep">{tr('যা যোগ হলো:', 'What we added:')}</b> {s.fix}</p>
        <p className="m-0 text-[15px]"><b className="text-parcel-deep">{tr('নতুন ঝামেলা:', 'The new trouble:')}</b> {s.cost}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={i === 0} onClick={() => go(i - 1)}>← {tr('আগের', 'Back')}</button>
        {i < stages.length - 1
          ? <button type="button" className={btnMain} onClick={() => go(i + 1)}>{tr('পরের ধাপ →', 'Next stage →')}</button>
          : <button type="button" className={btn} onClick={() => go(0)}>↺ {tr('শুরু থেকে', 'From the start')}</button>}
      </div>
    </Figure>
  );
}

/* --------------------------------------------------------------------- Seq */

/** Who sends what to whom, one message at a time; the message travels between the two boxes. */
export function Seq({ label, actors, steps }: { label: string; actors: string[]; steps: SeqStep[] }) {
  const [at, setAt] = useState(-1);
  const [auto, setAuto] = useState(false);
  const [ref, on] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!auto || !on) return;
    if (at >= steps.length - 1) { setAuto(false); return; }
    const id = window.setTimeout(() => setAt((a) => a + 1), at < 0 ? 150 : 1900);
    return () => window.clearTimeout(id);
  }, [auto, on, at, steps.length]);
  const cur = at >= 0 ? steps[at] : undefined;
  const x = (i: number) => `${((i + 0.5) / actors.length) * 100}%`;
  const color = (t?: SeqStep['tone']) => (t === 'bad' ? 'bg-coral' : t === 'ok' ? 'bg-route' : 'bg-parcel');
  const done = at >= steps.length - 1;
  return (
    <Figure label={label}>
      <div ref={ref} className="rounded-xl border-2 border-ink bg-surface px-1 pb-1 pt-2">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${actors.length}, minmax(0, 1fr))` }}>
          {actors.map((a, i) => {
            const lit = cur && (cur.from === i || cur.to === i);
            return (
              <span key={a} className={`mx-auto flex min-h-11 w-full max-w-[110px] items-center justify-center rounded-lg border-2 px-1 text-center text-[12px] font-bold leading-tight ${lit ? 'border-ink bg-parcel-soft' : 'border-line-strong bg-surface text-ink-soft'}`}>{a}</span>
            );
          })}
        </div>
        {/* the message travels on its own track under the boxes, so it never covers a name */}
        <div className="relative mt-1 h-5" aria-hidden="true">
          <div className="absolute inset-x-[4%] top-1/2 border-t-2 border-dashed border-line-strong" />
          {cur && <span key={at} className={`seq-dot ${cur.from === cur.to ? 'seq-self' : ''} ${color(cur.tone)}`} style={{ ['--a' as string]: x(cur.from), ['--b' as string]: x(cur.to), ...(reduced ? { left: x(cur.to) } : {}) }} />}
        </div>
      </div>
      {at < 0 && <p className="m-0 text-sm text-ink-soft">{tr(`${bn(steps.length)}টা ধাপ। ▶ চাপলে একটা একটা করে দেখাবে।`, `${steps.length} steps. Press ▶ to see them one by one.`)}</p>}
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-live="polite">
        {steps.slice(0, at + 1).map((s, k) => (
          <li key={k} className={`rounded-xl border-2 px-3 ${k === at ? `pop-in py-2 ${s.tone === 'bad' ? 'border-coral bg-coral-soft' : s.tone === 'ok' ? 'border-route bg-route-soft' : 'border-ink bg-parcel-soft'}` : 'border-line bg-surface py-1'}`}>
            <p className={`m-0 ${k === at ? 'text-[15px]' : 'text-sm text-ink-soft'}`}>
              <span className="mr-1.5 font-mono text-xs font-bold text-muted">{bn(k + 1)}</span>
              <b>{actors[s.from]}</b>{s.from !== s.to && <> → <b>{actors[s.to]}</b></>}: {s.msg}
            </p>
            {s.note && k === at && <p className="m-0 mt-0.5 text-sm text-ink-soft">{s.note}</p>}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!done && <button type="button" className={btnMain} onClick={() => { setAuto((v) => !v); play('tap'); }}>{auto ? tr('⏸ থামাও', '⏸ Pause') : at < 0 ? tr('▶ চালাও', '▶ Play') : tr('▶ চালিয়ে যাও', '▶ Go on')}</button>}
        <button type="button" className={btn} disabled={at < 0} onClick={() => { setAuto(false); setAt((a) => a - 1); }}>← {tr('আগের', 'Back')}</button>
        <button type="button" className={btn} disabled={done} onClick={() => { setAuto(false); setAt((a) => a + 1); }}>{tr('পরের', 'Next')} →</button>
        {at >= 0 && <button type="button" className={btn} onClick={() => { setAuto(false); setAt(-1); }}>↺</button>}
      </div>
    </Figure>
  );
}

/* -------------------------------------------------------------------- Calc */

/** Sliders in, numbers out. */
export function Calc({ label, inputs, out }: { label: string; inputs: CalcInput[]; out: (v: Record<string, number>) => CalcOut[] }) {
  const [v, setV] = useState<Record<string, number>>(() => Object.fromEntries(inputs.map((i) => [i.id, i.value])));
  const rows = out(v);
  return (
    <Figure label={label} tone="surface">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {inputs.map((i) => (
          <label key={i.id} className="flex flex-col gap-0.5 text-sm">
            <span className="flex items-baseline justify-between gap-2"><span className="font-semibold">{i.label}</span><b className="font-mono text-[15px]">{i.show ? i.show(v[i.id]!) : `${bn(v[i.id]!)}${i.unit ? ` ${i.unit}` : ''}`}</b></span>
            <input type="range" min={i.min} max={i.max} step={i.step} value={v[i.id]} onChange={(e) => setV((s) => ({ ...s, [i.id]: Number(e.target.value) }))} className="h-8 w-full accent-[var(--color-route)]" />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-xl border-2 border-ink bg-surface-sunk p-3" aria-live="polite">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3"><span className="text-sm font-semibold">{r.label}</span><b className={`font-mono text-lg ${r.tone === 'bad' ? 'text-coral-deep' : r.tone === 'ok' ? 'text-route-deep' : ''}`}>{r.value}</b></span>
            {r.bar !== undefined && <span className="block h-2 overflow-hidden rounded-full bg-track"><span className={`bar-grow block h-full rounded-full ${r.tone === 'bad' ? 'bg-coral' : 'bg-route'}`} style={{ width: `${Math.max(2, Math.min(100, r.bar * 100))}%` }} /></span>}
            {r.how && <span className="font-mono text-xs text-muted">{r.how}</span>}
          </div>
        ))}
      </div>
    </Figure>
  );
}

/* -------------------------------------------------------------------- Bars */

/** Bars that grow in when they come on screen: log for things a million times apart, stack for parts of one whole. */
export function Bars({ label, scale, items, note }: { label: string; scale: 'log' | 'linear' | 'stack'; items: { label: string; value: number; show: string; tone?: 'ok' | 'bad' | 'warn' | 'violet' }[]; note?: string }) {
  const [ref, on] = useInView<HTMLDivElement>('0px');
  const [seen, setSeen] = useState(false);
  useEffect(() => { if (on) setSeen(true); }, [on]);
  const fill = (t?: string) => (t === 'bad' ? 'bg-coral' : t === 'warn' ? 'bg-parcel' : t === 'ok' ? 'bg-route' : t === 'violet' ? 'bg-violet-soft' : 'bg-sky');
  if (scale === 'stack') {
    const total = items.reduce((a, b) => a + b.value, 0);
    return (
      <Figure label={label}>
        <div ref={ref} className="flex h-12 overflow-hidden rounded-xl border-2 border-ink bg-surface">
          {items.map((it, k) => (
            <div key={it.label} className={`bar-grow flex items-center justify-center overflow-hidden whitespace-nowrap border-ink text-center text-xs font-bold ${fill(it.tone)} ${it.tone === 'warn' || it.tone === 'violet' ? 'text-ink' : 'text-white'} ${k ? 'border-l-2' : ''}`} style={{ width: seen ? `${(it.value / total) * 100}%` : '0%' }}>{it.show}</div>
          ))}
        </div>
        <ol className="m-0 grid list-none gap-1 p-0 text-sm sm:grid-cols-2">
          {items.map((it) => <li key={it.label} className="flex items-center gap-2"><span className={`h-3 w-3 flex-none rounded-sm border border-ink ${fill(it.tone)}`} aria-hidden="true" /><span><b>{it.show}</b> · {it.label}</span></li>)}
        </ol>
        {note && <p className="m-0 text-sm text-ink-soft">{note}</p>}
      </Figure>
    );
  }
  const vals = items.map((i) => i.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const frac = (v: number) => (scale === 'log' ? 0.06 + 0.94 * ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1)) : v / hi);
  return (
    <Figure label={label}>
      <div ref={ref} className="flex flex-col gap-1.5">
        {items.map((it, k) => (
          <div key={it.label} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-2 text-sm max-sm:grid-cols-1 max-sm:gap-0.5">
            <span className="font-semibold leading-tight">{it.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-track"><span className={`bar-grow block h-full rounded-full border-ink ${fill(it.tone)}`} style={{ width: seen ? `${frac(it.value) * 100}%` : '0%', transitionDelay: `${k * 90}ms` }} /></span>
              <b className="w-20 flex-none text-right font-mono text-xs">{it.show}</b>
            </span>
          </div>
        ))}
      </div>
      {note && <p className="m-0 text-sm text-ink-soft">{note}</p>}
    </Figure>
  );
}

/* ------------------------------------------------------------------ Dialog */

/** An interview, one line at a time. */
export function Dialog({ label, lines }: { label: string; lines: { who: 'q' | 'a' | 'tip'; text: string }[] }) {
  const [n, setN] = useState(1);
  const end = n >= lines.length;
  return (
    <Figure label={label} tone="surface">
      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
        {lines.slice(0, n).map((l, k) => (
          <li key={k} className={`pop-in flex ${l.who === 'a' ? 'justify-end' : l.who === 'tip' ? 'justify-center' : 'justify-start'}`}>
            <p className={`m-0 max-w-[85%] rounded-2xl border-2 px-3 py-2 text-[15px] ${l.who === 'q' ? 'rounded-bl-sm border-ink bg-surface' : l.who === 'a' ? 'rounded-br-sm border-ink bg-parcel-soft' : 'border-dashed border-violet-deep bg-violet-soft text-sm'}`}>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">{l.who === 'q' ? 'Interviewer' : l.who === 'a' ? tr('আপনি', 'You') : tr('💡 খেয়াল করুন', '💡 Notice')}</span>
              {l.text}
            </p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!end && <button type="button" className={btnMain} onClick={() => setN((x) => x + 1)}>{tr('পরের লাইন →', 'Next line →')}</button>}
        {!end && <button type="button" className={btn} onClick={() => setN(lines.length)}>{tr('সব দেখুন', 'Show all')}</button>}
        {end && <button type="button" className={btn} onClick={() => setN(1)}>↺ {tr('আবার', 'Again')}</button>}
        <span className="self-center font-mono text-xs text-muted">{bn(n)}/{bn(lines.length)}</span>
      </div>
    </Figure>
  );
}
