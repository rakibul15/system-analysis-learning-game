import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { DiagramNode, LessonStep } from '@/content/schema';
import { bn } from '@/shared/lib/bn';
import { CHECKPOINT_POINTS } from '@/shared/lib/scoring';
import { QuestionCard, type AnswerResult } from '@/shared/ui/QuestionCard';
import { NodeIcon } from './NodeIcon';

interface Props {
  nodes: DiagramNode[];
  steps: LessonStep[];
  onCheckpoint: (r: AnswerResult) => void;
  onFinish: () => void;
}

const SPEEDS = [0.75, 1, 1.5] as const;

/** Which nodes are on the stage at step i: cumulative add/hide; no adds anywhere = all. */
function visibleAt(nodes: DiagramNode[], steps: LessonStep[], i: number): Set<string> {
  if (!steps.some((s) => s.add)) return new Set(nodes.map((n) => n.id));
  const v = new Set<string>();
  for (let k = 0; k <= i; k++) {
    for (const id of steps[k]!.hide ?? []) v.delete(id);
    for (const id of steps[k]!.add ?? []) v.add(id);
  }
  return v;
}

/**
 * Step-by-step animated diagram. One change per step, two lines of text, and the
 * lesson stops at a checkpoint until it is answered.
 */
export function LessonPlayer({ nodes, steps, onCheckpoint, onFinish }: Props) {
  const [i, setI] = useState(0);
  const [reached, setReached] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  const step = steps[i]!;
  const blocked = !!step.ask && !answered.has(i);
  const last = i === steps.length - 1;
  const visible = useMemo(() => visibleAt(nodes, steps, i), [nodes, steps, i]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const askNumber = steps.slice(0, i + 1).filter((s) => s.ask).length;
  const askTotal = steps.filter((s) => s.ask).length;

  const go = (n: number) => {
    const k = Math.max(0, Math.min(steps.length - 1, n));
    setI(k);
    setReached((r) => Math.max(r, k));
  };

  // autoplay: move on after a pause long enough to read two lines
  useEffect(() => {
    if (!playing || blocked || last) return;
    const t = window.setTimeout(() => go(i + 1), 4200 / speed);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, blocked, last, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (blocked) return;
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, blocked]);

  const flows = (step.flow ?? []).filter(([a, b]) => visible.has(a) && visible.has(b));
  const hasFocus = (step.focus?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink bg-[#F7F8F3] shadow-block" style={{ aspectRatio: '16 / 9', minHeight: 280, containerType: 'inline-size' }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="dots" width="4" height="7.1" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.18" fill="#C9D0C3" /></pattern>
          </defs>
          <rect width="100" height="100" fill="url(#dots)" />
          {flows.map(([a, b], k) => {
            const A = byId.get(a)!, B = byId.get(b)!;
            return <line key={`${a}-${b}-${k}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#16252D" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>

        {flows.map(([a, b], k) =>
          [0, 1, 2].map((d) => {
            const A = byId.get(a)!, B = byId.get(b)!;
            const dur = 1.8 / speed;
            return (
              <span
                key={`${i}-${a}-${b}-${k}-${d}`}
                className="flow-dot"
                style={{ '--x1': `${A.x}%`, '--y1': `${A.y}%`, '--x2': `${B.x}%`, '--y2': `${B.y}%`, '--dur': `${dur}s`, animationDelay: `${(-d * dur) / 3}s` } as CSSProperties}
              />
            );
          }),
        )}

        {nodes.filter((n) => visible.has(n.id)).map((n) => {
          const down = step.down?.includes(n.id);
          const ok = step.ok?.includes(n.id);
          const focus = step.focus?.includes(n.id);
          const dim = hasFocus && !focus;
          const badge = step.badges?.[n.id];
          const bg = down ? '#FDECEA' : ok ? '#E6F4F1' : focus ? '#FFF4D6' : '#FFFFFF';
          const border = down ? '#E0483E' : ok ? '#0B8A7A' : '#16252D';
          return (
            <div
              key={n.id}
              className="node-in absolute flex flex-col items-center"
              style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)', opacity: dim ? 0.35 : 1, transition: 'opacity .4s', zIndex: 2 }}
            >
              {badge && (
                <span key={badge} className="pop-in absolute bottom-full mb-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-0.5 font-bold text-white" style={{ fontSize: 'max(10px,1.25cqw)' }}>
                  {badge}
                </span>
              )}
              <div
                className={`flex items-center gap-[0.4em] rounded-xl font-semibold ${down ? 'shake-x' : ''}`}
                style={{
                  padding: '0.45em 0.8em', background: bg, border: `max(2px,0.25cqw) solid ${border}`,
                  boxShadow: `0 max(3px,0.4cqw) 0 ${border}`, fontSize: 'max(12px,1.9cqw)', whiteSpace: 'nowrap',
                  transition: 'background .3s, border-color .3s, transform .3s', transform: focus ? 'scale(1.08)' : undefined,
                }}
              >
                <NodeIcon kind={n.kind} color={down ? '#C7372D' : '#16252D'} />
                <span style={{ textDecoration: down ? 'line-through' : undefined }}>{n.label}</span>
                {down && <span className="font-bold text-coral-deep">✕</span>}
              </div>
            </div>
          );
        })}

        <div className="absolute left-[2%] top-[3%] rounded-full bg-ink px-3 py-1 font-mono font-bold text-white" style={{ fontSize: 'max(11px,1.2cqw)' }}>
          ধাপ {bn(i + 1)}/{bn(steps.length)}
        </div>
      </div>

      <p aria-live="polite" key={i} className="pop-in m-0 rounded-2xl border-[2.5px] border-ink bg-white px-5 py-4 text-[18px] leading-relaxed">
        {step.text}
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" aria-label="আগের ধাপ" disabled={i === 0} onClick={() => go(i - 1)} className="grid h-12 w-12 cursor-pointer place-items-center rounded-[14px] border-2 border-ink bg-white disabled:cursor-not-allowed disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M12 3L6 9l6 6" fill="none" stroke="#16252D" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
        <button type="button" aria-label={playing ? 'থামান' : 'চালান'} onClick={() => setPlaying((p) => !p)} className="btn-press grid h-14 w-14 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-parcel shadow-[0_3px_0_#16252D]">
          {playing
            ? <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3v12M13 3v12" stroke="#16252D" strokeWidth="3.5" strokeLinecap="round" /></svg>
            : <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3l10 6-10 6z" fill="#16252D" /></svg>}
        </button>
        <button type="button" aria-label="পরের ধাপ" disabled={blocked || last} onClick={() => go(i + 1)} className="grid h-12 w-12 cursor-pointer place-items-center rounded-[14px] border-2 border-ink bg-white disabled:cursor-not-allowed disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M6 3l6 6-6 6" fill="none" stroke="#16252D" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
        <ol aria-label="ধাপগুলো" className="m-0 flex min-w-0 flex-[1_1_200px] list-none items-center gap-1.5 p-0">
          {steps.map((s, k) => (
            <li key={k} className="flex-1">
              <button
                type="button"
                aria-label={`ধাপ ${bn(k + 1)}${s.ask ? ' (প্রশ্ন)' : ''}`}
                aria-current={k === i ? 'step' : undefined}
                disabled={k > reached || blocked}
                onClick={() => go(k)}
                className="block h-3 w-full cursor-pointer rounded-full border-0 p-0 disabled:cursor-not-allowed"
                style={{ background: k === i ? '#FFC02E' : k <= reached ? '#0B8A7A' : '#D7DED1', outline: k === i ? '2px solid #16252D' : undefined, height: s.ask ? 14 : 10 }}
              />
            </li>
          ))}
        </ol>
        <div className="flex overflow-hidden rounded-xl border-2 border-ink" role="group" aria-label="গতি">
          {SPEEDS.map((sp) => (
            <button key={sp} type="button" aria-pressed={speed === sp} onClick={() => setSpeed(sp)} className={`min-h-11 cursor-pointer border-0 px-2.5 font-mono text-sm font-bold ${speed === sp ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
              {bn(sp, { grouping: false })}×
            </button>
          ))}
        </div>
      </div>

      {blocked && step.ask && (
        <QuestionCard
          q={step.ask}
          label={`থামুন! Checkpoint ${bn(askNumber)}/${bn(askTotal)}`}
          points={CHECKPOINT_POINTS}
          continueLabel="Animation-এ দেখি"
          onDone={(r) => {
            onCheckpoint(r);
            setAnswered((s) => new Set(s).add(i));
            go(i + 1);
            setPlaying(true);
          }}
        />
      )}

      {last && (
        <button type="button" onClick={onFinish} className="btn-press min-h-[56px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-[22px] font-extrabold text-ink shadow-[0_5px_0_#16252D]">
          সারাংশ দেখুন →
        </button>
      )}
    </div>
  );
}
