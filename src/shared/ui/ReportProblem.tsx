import { useId, useState } from 'react';
import type { Question } from '@/content/schema';
import { tr } from '@/shared/lib/i18n';
import { addReport, type ReportKind } from '@/shared/lib/outbox';

const KINDS: [ReportKind, string][] = [
  ['wrong', tr('উত্তর ভুল মনে হচ্ছে', 'The answer looks wrong')],
  ['unclear', tr('প্রশ্ন বোঝা যায় না', 'The question is unclear')],
  ['typo', tr('বানান বা লেখায় ভুল', 'Typo or wording')],
  ['other', tr('অন্য কিছু', 'Something else')],
];

/** "Something is wrong with this question": a reason, an optional note, sent with the question as shown. */
export function ReportProblem({ q, dark = false }: { q: Question; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const id = useId();
  const muted = dark ? 'text-on-night-soft' : 'text-muted';

  if (sent) return <p className={`m-0 mt-3 text-sm font-semibold ${dark ? 'text-parcel' : 'text-route-deep'}`} role="status">{tr('ধন্যবাদ! প্রশ্নটা দেখে ঠিক করা হবে।', 'Thank you! We will look at this question.')}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`mt-3 min-h-10 cursor-pointer rounded-lg border-0 bg-transparent px-1 text-sm font-semibold underline underline-offset-2 ${muted}`}>
        ⚑ {tr('এই প্রশ্নে সমস্যা আছে', 'Something is wrong with this question')}
      </button>
    );
  }
  return (
    <form
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!kind) return;
        addReport({ qid: q.id, kind, note: note.trim(), prompt: q.prompt, options: q.options });
        setSent(true);
      }}
      className={`mt-4 flex flex-col gap-2.5 rounded-[14px] border-2 p-3.5 ${dark ? 'border-night-line-2 bg-night-well' : 'border-ink bg-surface-sunk'}`}
    >
      <p id={`${id}-t`} className="m-0 font-bold">{tr('কী সমস্যা?', 'What is wrong?')}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('কী সমস্যা?', 'What is wrong?')}>
        {KINDS.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`min-h-10 cursor-pointer rounded-full border-2 px-3 text-sm font-semibold ${kind === k ? 'border-ink bg-ink text-white' : dark ? 'border-night-line-2 bg-transparent text-white' : 'border-ink bg-surface text-ink'}`}>{l}</button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {tr('আরেকটু বলবেন? (ঐচ্ছিক)', 'Tell us more (optional)')}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3}
          className={`rounded-xl border-2 p-2.5 font-[inherit] text-base font-normal ${dark ? 'border-night-line-2 bg-night-raised text-white' : 'border-ink bg-surface text-ink'}`} />
      </label>
      <p className={`m-0 text-xs ${muted}`}>{tr('প্রশ্ন, অপশনগুলো আর আপনার লেখা আপনার account থেকে যাবে। Admin দেখতে পাবেন কে পাঠিয়েছে, দরকার হলে email-এ যোগাযোগ করবেন।', 'The question, its options and your note are sent from your account. The admin can see who sent it and may email you about it.')}</p>
      <div className="flex gap-2">
        <button type="submit" disabled={!kind} className="btn-press min-h-11 flex-1 cursor-pointer rounded-xl border-2 border-ink bg-parcel px-4 font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50">{tr('পাঠান', 'Send')}</button>
        <button type="button" onClick={() => setOpen(false)} className={`min-h-11 cursor-pointer rounded-xl border-2 px-4 font-semibold ${dark ? 'border-night-line-2 bg-transparent text-white' : 'border-ink bg-surface text-ink'}`}>{tr('বাদ দিন', 'Cancel')}</button>
      </div>
    </form>
  );
}
