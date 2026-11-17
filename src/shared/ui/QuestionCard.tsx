import { isEn, tr } from '@/shared/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { play } from '@/shared/lib/sound';
import type { Question } from '@/content/schema';
import { bn } from '@/shared/lib/bn';
import { confidenceFactor, shuffledOrder } from '@/shared/lib/scoring';

export interface AnswerResult { qid: string; correct: boolean; sure: boolean; earned: number }

interface Props {
  q: Question;
  /** Small label above the prompt, e.g. "Boss ২/৫". */
  label?: string;
  /** Full points for a sure + right answer. 0 / undefined: not scored. */
  points?: number;
  /** Hint: shown on request; the parent decides what it costs. */
  onHint?: () => void;
  hintUsed?: boolean;
  onDone: (r: AnswerResult) => void;
  continueLabel?: string;
  tone?: 'light' | 'boss';
}

const fmt = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + bn(Math.abs(Math.round(n * 10) / 10), { grouping: false });

/**
 * One multiple-choice question with confidence marking.
 * Options are shuffled per question id (the content keeps the right one first).
 */
export function QuestionCard({ q, label, points = 0, onHint, hintUsed, onDone, continueLabel = tr('পরের ধাপ', 'Next step'), tone = 'light' }: Props) {
  // a fresh order every time the question is shown, so positions cannot be memorised
  const [nonce] = useState(() => Math.random().toString(36).slice(2));
  const order = useMemo(() => shuffledOrder(`${q.id}:${nonce}`, q.options.length), [q.id, q.options.length, nonce]);
  const [picked, setPicked] = useState<number | null>(null);
  const [sure, setSure] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setPicked(null); setSure(null); setDone(false); setShowHint(false);
  }, [q.id]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = Number(e.key);
      if (k >= 1 && k <= order.length) setPicked(order[k - 1]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, done]);

  const correct = picked === 0;
  useEffect(() => { if (done) play(correct ? 'right' : 'wrong'); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  const earned = points * confidenceFactor(correct, !!sure);
  const ready = picked !== null && sure !== null;
  const boss = tone === 'boss';
  const letters = isEn ? ['A', 'B', 'C', 'D'] : ['ক', 'খ', 'গ', 'ঘ'];

  return (
    <div className={`pop-in rounded-[22px] border-[3px] p-5 sm:p-6 ${boss ? 'border-ink bg-[#1D2E37] text-white shadow-[0_6px_0_#E0483E]' : 'border-ink bg-white shadow-block'}`}>
      <div className="mb-2 flex items-center justify-between gap-3 text-[13px] font-bold">
        <span className={boss ? 'text-parcel' : 'text-route-deep'}>{label}</span>
        {points > 0 && <span className={boss ? 'text-[#C9D6DC]' : 'text-muted'}>{tr('মান', 'Worth')} {bn(Math.round(points * 10) / 10, { grouping: false })} {tr('নম্বর', 'points')}</span>}
      </div>
      <h3 className="m-0 mb-4 font-display text-[22px] font-bold leading-snug" style={{ textWrap: 'balance' }}>{q.prompt}</h3>

      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={tr('উত্তর', 'Answers')}>
        {order.map((oi, pos) => {
          const isPicked = picked === oi;
          const showRight = done && oi === 0;
          const showWrong = done && isPicked && oi !== 0;
          let cls = boss ? 'border-[#3A4F5A] bg-[#24363F] text-white' : 'border-ink bg-white text-ink';
          if (isPicked && !done) cls = boss ? 'border-parcel bg-[#3A3420] text-white' : 'border-ink bg-parcel-soft text-ink shadow-[0_3px_0_#16252D]';
          if (showRight) cls = 'border-route bg-route-soft text-ink';
          if (showWrong) cls = 'border-coral bg-coral-soft text-ink';
          return (
            <button
              key={oi}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={done}
              onClick={() => setPicked(oi)}
              className={`flex min-h-[52px] w-full items-start gap-3 rounded-[14px] border-2 px-3.5 py-3 text-left font-[inherit] text-[16px] transition-colors enabled:cursor-pointer ${cls}`}
            >
              <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg border-2 text-sm font-bold ${boss && !showRight && !showWrong ? 'border-[#5B7280]' : 'border-ink'}`}>{letters[pos]}</span>
              <span className="min-w-0 flex-1">{q.options[oi]}</span>
              {showRight && <span className="font-bold text-route-deep">✓</span>}
              {showWrong && <span className="font-bold text-coral-deep">✕</span>}
            </button>
          );
        })}
      </div>

      {!done && (
        <>
          <p className="mb-2 mt-5 font-semibold">{tr('কতটা নিশ্চিত?', 'How sure are you?')}</p>
          <div className="flex gap-2.5">
            {[{ v: true, l: tr('নিশ্চিত', 'Sure') }, { v: false, l: tr('আন্দাজ', 'Guess') }].map((c) => (
              <button
                key={c.l}
                type="button"
                aria-pressed={sure === c.v}
                onClick={() => setSure(c.v)}
                className={`min-h-[46px] flex-1 cursor-pointer rounded-xl border-2 font-[inherit] font-semibold ${sure === c.v ? (boss ? 'border-parcel bg-parcel text-ink' : 'border-ink bg-ink text-white') : boss ? 'border-[#3A4F5A] bg-transparent text-white' : 'border-ink bg-white text-ink'}`}
              >
                {c.l}
              </button>
            ))}
          </div>
          {points > 0 && <p className={`mb-0 mt-2 text-[13px] ${boss ? 'text-[#C9D6DC]' : 'text-muted'}`}>{tr('নিশ্চিত ও ঠিক: পুরো · আন্দাজে ঠিক: ৬০% · নিশ্চিত ও ভুল: −২৫%', 'Sure and right: full · right on a guess: 60% · sure and wrong: −25%')}</p>}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={!ready}
              onClick={() => setDone(true)}
              className={`min-h-[52px] flex-1 rounded-[14px] border-[3px] font-display text-[19px] font-extrabold ${ready ? 'btn-press cursor-pointer border-ink bg-parcel text-ink shadow-[0_4px_0_#16252D]' : 'cursor-not-allowed border-[#9AA69F] bg-[#EEF1EA] text-locked-ink'}`}
            >
              {tr('উত্তর দিন', 'Answer')}
            </button>
            {q.hint && onHint && (
              <button
                type="button"
                onClick={() => { setShowHint(true); if (!hintUsed) onHint(); }}
                className={`min-h-[52px] cursor-pointer rounded-[14px] border-2 px-4 font-[inherit] font-semibold ${boss ? 'border-[#5B7280] bg-transparent text-white' : 'border-ink bg-white'}`}
              >
                Hint
              </button>
            )}
          </div>
          {showHint && q.hint && <p className={`mb-0 mt-3 rounded-xl px-3 py-2 text-sm ${boss ? 'bg-[#24363F] text-parcel' : 'bg-parcel-soft'}`}>Hint: {q.hint}{hintUsed ? '' : ''}</p>}
        </>
      )}

      {done && (
        <div className={`pop-in mt-4 rounded-[14px] border-2 p-4 ${correct ? 'border-route bg-route-soft text-ink' : 'border-coral bg-coral-soft text-ink'}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <strong className="font-display text-xl">{correct ? (sure ? tr('ঠিক!', 'Right!') : tr('ঠিক, তবে আন্দাজে', 'Right, but a guess')) : sure ? tr('নিশ্চিত ছিলেন, কিন্তু ভুল', 'You were sure, but wrong') : tr('এবার হয়নি', 'Not this time')}</strong>
            {points > 0 && <span className="font-mono text-lg font-bold">{fmt(earned)}</span>}
          </div>
          {!correct && <p className="m-0 mb-1 font-semibold">{tr('সঠিক:', 'Correct:')} {q.options[0]}</p>}
          {q.explain && <p className="m-0">{q.explain}</p>}
          {!correct && sure && <p className="mb-0 mt-2 text-sm font-semibold">{tr('এই প্রশ্ন review-তে আগে আসবে।', 'This question will come up sooner in review.')}</p>}
          <button
            type="button"
            autoFocus
            onClick={() => onDone({ qid: q.id, correct, sure: !!sure, earned })}
            className="btn-press mt-3 min-h-[48px] w-full cursor-pointer rounded-[14px] border-[3px] border-ink bg-white font-display text-lg font-extrabold text-ink shadow-[0_4px_0_#16252D]"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}
