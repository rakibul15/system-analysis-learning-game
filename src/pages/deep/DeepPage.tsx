import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { timelinesById, type Ev, type Predict, type Timeline, type Tone } from '@/features/deep/timelines';
import { BookRefs } from '@/features/books/BookRefs';
import { notesMetaById as notesById } from '@/content/meta';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';

const TONE: Record<Tone, string> = {
  ok: 'border-route bg-route-soft text-route-deep',
  bad: 'border-coral bg-coral-soft text-coral-deep',
  warn: 'border-amber bg-parcel-soft text-parcel-deep',
  plain: 'border-ink bg-surface text-ink',
};

/** "গভীরে": walk a timeline step by step, predicting what happens before it is shown. */
export function DeepPage({ id }: { id: string }) {
  const t = timelinesById[id];
  if (!t) return <AppShell><main className="p-8 text-center font-bold">{tr('এই timeline নেই।', 'No such timeline.')}</main></AppShell>;
  return <AppShell><Player key={t.id} t={t} /></AppShell>;
}

function Player({ t }: { t: Timeline }) {
  const record = useProgress((s) => s.recordBuild);
  /** How many steps are fully shown (0 = nothing yet). */
  const [shown, setShown] = useState(0);
  const [guess, setGuess] = useState<Record<number, number>>({});
  const order = useMemo(() => t.steps.map((s) => (s.predict ? s.predict.options.map((_, i) => i).sort(() => Math.random() - 0.5) : [])), [t]);
  const pending = shown < t.steps.length && t.steps[shown]!.predict && guess[shown] === undefined ? shown : -1;
  const done = shown >= t.steps.length;
  const predicts = t.steps.flatMap((s, i) => (s.predict ? [i] : []));
  const right = predicts.filter((i) => guess[i] === 0).length;

  const next = () => { if (pending < 0 && !done) { setShown((n) => n + 1); play('tap'); } };
  const back = () => setShown((n) => Math.max(0, n - 1));
  const answer = (i: number, opt: number) => {
    setGuess((g) => ({ ...g, [i]: opt }));
    setShown(i + 1);
    play(opt === 0 ? 'right' : 'wrong');
  };
  useEffect(() => { if (done) record(`deep:${t.id}`, predicts.length ? right / predicts.length : 1); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cur = Math.min(shown, t.steps.length) - 1;
  const note = t.note ? notesById[t.note] : undefined;
  return (
    <main className="mx-auto box-border flex max-w-[860px] flex-col gap-4 px-4 pb-14 pt-6 sm:px-8">
      <Link to="/study" className="self-start font-semibold text-route-deep">{tr('← পড়া', '← Study')}</Link>
      <header className="rounded-[22px] border-[3px] border-ink bg-surface p-5 shadow-[0_5px_0_var(--color-shadow)]">
        <p className="m-0 text-sm font-bold text-violet-deep">{tr('গভীরে · ধাপে ধাপে', 'Deeper · step by step')}</p>
        <h1 className="m-0 mt-1 font-display text-[28px] font-extrabold leading-tight">{t.title}</h1>
        <p className="m-0 mt-1 text-ink-soft">{t.gist}</p>
        <p className="m-0 mt-2 text-sm text-muted">{tr('প্রতিটা কলাম একজন অংশগ্রহণকারী; সময় নিচের দিকে চলে। কিছু ধাপে আগে অনুমান করুন, তারপর দেখুন।', 'Each column is a participant and time runs downwards. At some steps you predict first, then see.')}</p>
      </header>

      <section aria-label={tr('Timeline', 'Timeline')} className="overflow-x-auto rounded-[20px] border-[3px] border-ink bg-surface p-3">
        <div className="min-w-[340px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${t.lanes.length}, minmax(0, 1fr))` }}>
            {t.lanes.map((l) => <div key={l.id} className="rounded-lg bg-ink px-1 py-1.5 text-center text-xs font-bold text-white sm:text-sm">{l.label}</div>)}
          </div>
          <div className="relative mt-1">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${t.lanes.length}, minmax(0, 1fr))` }}>
              {t.lanes.map((l) => <div key={l.id} className="mx-auto w-0 border-l-2 border-dashed border-line-soft" />)}
            </div>
            {shown === 0 && <p className="relative m-0 py-8 text-center text-sm text-muted">{tr('▶ চাপুন, প্রথম ধাপ শুরু', 'Press ▶ to start')}</p>}
            {t.steps.slice(0, shown).map((s, i) => (
              <div key={i} className={`relative border-t border-dotted border-locked py-1 ${i === cur ? '' : 'opacity-55'}`}>
                <span className="absolute left-0 top-1 z-[1] rounded bg-surface px-1 font-mono text-[10px] text-muted">{bn(i + 1)}</span>
                {s.ev.map((e, j) => <EvRow key={j} e={e} lanes={t.lanes.map((l) => l.id)} fresh={i === cur} />)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-live="polite" className="flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-surface-sunk p-4">
        {pending >= 0 ? (
          <PredictCard step={pending + 1} total={t.steps.length} text={t.steps[pending]!.text} p={t.steps[pending]!.predict!} order={order[pending]!} onPick={(o) => answer(pending, o)} />
        ) : cur >= 0 ? (
          <div>
            <p className="m-0 text-xs font-bold text-route-deep">{tr(`ধাপ ${bn(cur + 1)}/${bn(t.steps.length)}`, `Step ${cur + 1}/${t.steps.length}`)}</p>
            <p className="m-0 mt-1 text-[17px]">{t.steps[cur]!.text}</p>
            {t.steps[cur]!.predict && guess[cur] !== undefined && (
              <p className={`m-0 mt-2 rounded-lg px-3 py-2 text-[15px] ${guess[cur] === 0 ? 'bg-route-soft' : 'bg-coral-soft'}`}>
                <b>{guess[cur] === 0 ? tr('ঠিক অনুমান! ', 'Right guess! ') : tr(`উত্তর: ${t.steps[cur]!.predict!.options[0]}। `, `Answer: ${t.steps[cur]!.predict!.options[0]}. `)}</b>{t.steps[cur]!.predict!.explain}
              </p>
            )}
          </div>
        ) : <p className="m-0 text-ink-soft">{tr('শুরু করতে ▶ চাপুন।', 'Press ▶ to begin.')}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={back} disabled={shown === 0} aria-label={tr('আগের ধাপ', 'Previous step')} className="min-h-11 min-w-11 cursor-pointer rounded-xl border-2 border-ink bg-surface text-lg font-bold disabled:opacity-35">◀</button>
          <button type="button" onClick={next} disabled={pending >= 0 || done} aria-label={tr('পরের ধাপ', 'Next step')} className="btn-press min-h-11 flex-1 cursor-pointer rounded-xl border-[2.5px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_3px_0_var(--color-shadow)] disabled:cursor-default disabled:opacity-40">▶ {shown === 0 ? tr('শুরু', 'Start') : tr('পরের ধাপ', 'Next step')}</button>
          <span className="font-mono text-sm text-muted">{bn(Math.min(shown, t.steps.length))}/{bn(t.steps.length)}</span>
        </div>
      </section>

      {done && (
        <section className="pop-in flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-surface p-5">
          <p className="m-0 font-display text-xl font-extrabold">{tr(`শেষ! অনুমান ঠিক: ${bn(right)}/${bn(predicts.length)}`, `Done! Predictions right: ${right}/${predicts.length}`)}</p>
          <p className="m-0 rounded-xl bg-route-soft px-3 py-2 font-semibold">💡 {t.takeaway}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setShown(0); setGuess({}); }} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-semibold">{tr('আবার দেখুন', 'Watch again')}</button>
            {note && <Link to="/notes/$noteId" params={{ noteId: note.id }} className="flex min-h-11 items-center rounded-xl border-2 border-ink bg-route-soft px-4 font-semibold text-ink no-underline">📝 {note.title} →</Link>}
          </div>
          <BookRefs refs={[t.ref]} />
        </section>
      )}
    </main>
  );
}

function PredictCard({ step, total, text, p, order, onPick }: { step: number; total: number; text: string; p: Predict; order: number[]; onPick: (o: number) => void }) {
  return (
    <div>
      <p className="m-0 text-xs font-bold text-violet-deep">{tr(`ধাপ ${bn(step)}/${bn(total)} · আগে অনুমান করুন`, `Step ${step}/${total} · predict first`)}</p>
      <p className="m-0 mt-1 text-[17px]">{text}</p>
      <p className="m-0 mt-2 font-bold">🤔 {p.q}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {order.map((o) => <button key={o} type="button" onClick={() => onPick(o)} className="btn-press min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-surface px-3 py-2 text-left font-[inherit] text-[15px] font-semibold shadow-[0_2px_0_var(--color-shadow)]">{p.options[o]}</button>)}
      </div>
    </div>
  );
}

/** One event as a row: an arrow between two lanes, or a state tag in one lane. */
function EvRow({ e, lanes, fresh }: { e: Ev; lanes: string[]; fresh: boolean }) {
  const n = lanes.length;
  const col = (id: string) => lanes.indexOf(id);
  if (e.kind === 'state') {
    const c = col(e.lane);
    return (
      <div className="relative my-1 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        <span className={`${fresh ? 'pop-in' : ''} relative mx-0.5 rounded-lg border-2 px-1.5 py-1 text-center text-[11px] font-bold leading-snug sm:text-xs ${TONE[e.tone]}`} style={{ gridColumn: `${c + 1} / span 1` }}>{e.text}</span>
      </div>
    );
  }
  const a = col(e.from), b = col(e.to);
  const left = ((Math.min(a, b) + 0.5) / n) * 100, width = (Math.abs(b - a) / n) * 100;
  const color = e.style === 'lost' ? 'var(--color-coral)' : e.style === 'late' ? 'var(--color-amber)' : 'var(--color-route-deep)';
  const rightward = b > a;
  return (
    <div className="relative my-0.5 h-12">
      <span title={e.label} className="absolute top-0 line-clamp-2 px-1 text-center text-[11px] font-semibold leading-tight sm:text-xs" style={{ left: `${left}%`, width: `${width}%`, color }}>{e.label}</span>
      <span className={`${fresh ? 'deep-draw' : ''} absolute top-[36px] h-0 border-t-2`} style={{ left: `${left}%`, width: `${e.style === 'lost' ? width / 2 : width}%`, borderColor: color, borderTopStyle: e.style ? 'dashed' : 'solid', transformOrigin: rightward ? 'left' : 'right', ...(rightward ? {} : { left: `${e.style === 'lost' ? left + width / 2 : left}%` }) }} />
      {e.style === 'lost'
        ? <span className="absolute top-[27px] -translate-x-1/2 font-bold text-coral" style={{ left: `${left + width / 2}%` }}>✕</span>
        : <span className="absolute top-[30px] h-0 w-0 border-y-[6px] border-y-transparent" style={rightward ? { left: `calc(${left + width}% - 9px)`, borderLeft: `9px solid ${color}` } : { left: `${left}%`, borderRight: `9px solid ${color}` }} />}
    </div>
  );
}
