import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { questionInfo } from '@/content/bank';
import { chapterOf, conceptLabel, levelMeta } from '@/content/meta';
import { useChapters } from '@/content/useChapters';
import { firebase, useAuth } from '@/features/auth/auth';
import { aggregate, flagsFor, MIN_ANSWERS, type Flag, type QStat } from '@/features/stats/aggregate';
import { bn } from '@/shared/lib/bn';
import { lang, tr } from '@/shared/lib/i18n';
import { levelOfQid, optionKey, type AnswerEvent, type Report } from '@/shared/lib/outbox';
import { AppShell } from '@/shared/ui/AppShell';
import { PageLoading } from '@/shared/ui/Loading';

/*
 * For whoever maintains the questions: learners' "something is wrong" reports, and how
 * every question is answered. Only accounts listed in admins/{uid} can read these
 * (firestore.rules); everyone else sees a short note.
 */

type StoredReport = Report & { id: string; status: 'open' | 'done'; at?: { seconds: number } };
type Data = { reports: StoredReport[]; batches: { lang: string; items: AnswerEvent[] }[] };
type State = { kind: 'loading' } | { kind: 'denied'; why: string } | { kind: 'ready'; data: Data } | { kind: 'error'; message: string };

const FLAG: Record<Flag, [string, string]> = {
  easy: [tr('খুব সহজ', 'Too easy'), 'bg-route-soft text-route-deep'],
  hard: [tr('খুব কঠিন / উত্তর ভুল?', 'Too hard / wrong key?'), 'bg-coral-soft text-coral-deep'],
  'sure-wrong': [tr('নিশ্চিত হয়েও ভুল', 'Sure but wrong'), 'bg-coral-soft text-coral-deep'],
  'one-trap': [tr('একটা ফাঁদেই সবাই', 'One trap takes all'), 'bg-parcel-soft text-[#7A4D00]'],
  'dead-option': [tr('কেউ বাছে না এমন অপশন', 'An option nobody picks'), 'bg-locked text-locked-ink'],
};
const KIND: Record<Report['kind'], string> = {
  wrong: tr('উত্তর ভুল', 'Answer wrong'), unclear: tr('অস্পষ্ট', 'Unclear'), typo: tr('বানান', 'Typo'), other: tr('অন্য', 'Other'),
};

async function load(uid: string): Promise<State> {
  const f = await firebase();
  const { store, db } = f;
  const admin = await store.getDoc(store.doc(db, 'admins', uid));
  if (!admin.exists()) return { kind: 'denied', why: tr('এই account admin না। Firebase console-এ admins/{আপনার uid} document বানালে দেখা যাবে।', 'This account is not an admin. Create admins/{your uid} in the Firebase console to see this.') };
  const [r, q] = await Promise.all([
    store.getDocs(store.query(store.collection(db, 'reports'), store.orderBy('at', 'desc'), store.limit(300))),
    store.getDocs(store.query(store.collection(db, 'qlog'), store.orderBy('at', 'desc'), store.limit(2000))),
  ]);
  return {
    kind: 'ready',
    data: {
      reports: r.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredReport, 'id'>) })),
      batches: q.docs.map((d) => d.data() as { lang: string; items: AnswerEvent[] }),
    },
  };
}

export function AdminPage() {
  const user = useAuth((s) => s.user);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [tab, setTab] = useState<'reports' | 'questions'>('reports');

  useEffect(() => {
    if (!user) { setState({ kind: 'denied', why: tr('আগে admin account দিয়ে sign in করুন।', 'Sign in with an admin account first.') }); return; }
    let alive = true;
    load(user.uid).then((s) => alive && setState(s), (e: unknown) => alive && setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, [user]);

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1080px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <header>
          <p className="m-0 text-sm font-bold text-route-deep">Admin</p>
          <h1 className="m-0 font-display text-[30px] font-extrabold">{tr('প্রশ্নের খবর', 'Question health')}</h1>
          <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('Learner-দের পাঠানো সমস্যা, আর কোন প্রশ্নে কে কী উত্তর দিচ্ছে। শেষ ২,০০০ batch পর্যন্ত।', 'Problems learners reported, and how each question is answered. Up to the last 2,000 batches.')}</p>
        </header>
        {state.kind === 'loading' && <PageLoading />}
        {state.kind === 'denied' && <p className="m-0 rounded-2xl border-2 border-dashed border-[#9AA69F] p-5 font-semibold text-muted">{state.why}</p>}
        {state.kind === 'error' && <p className="m-0 rounded-2xl border-2 border-coral bg-coral-soft p-5 font-semibold" role="alert">{state.message}</p>}
        {state.kind === 'ready' && (
          <>
            <div role="tablist" className="flex gap-2">
              {([['reports', `${tr('সমস্যা', 'Reports')} · ${bn(state.data.reports.filter((r) => r.status !== 'done').length)}`], ['questions', tr('প্রশ্নের হিসাব', 'Answer statistics')]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink px-4 font-bold ${tab === k ? 'bg-ink text-white' : 'bg-white'}`}>{l}</button>
              ))}
            </div>
            {tab === 'reports'
              ? <Reports reports={state.data.reports} onDone={(id) => setState({ kind: 'ready', data: { ...state.data, reports: state.data.reports.map((r) => (r.id === id ? { ...r, status: 'done' } : r)) } })} />
              : <Questions batches={state.data.batches} />}
          </>
        )}
      </main>
    </AppShell>
  );
}

function Reports({ reports, onDone }: { reports: StoredReport[]; onDone: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = reports.filter((r) => all || r.status !== 'done');
  const markDone = async (id: string) => {
    const { store, db } = await firebase();
    await store.updateDoc(store.doc(db, 'reports', id), { status: 'done' });
    onDone(id);
  };
  return (
    <section className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-5 w-5" /> {tr('ঠিক করাগুলোও দেখান', 'Show resolved too')}</label>
      {shown.length === 0 && <p className="m-0 text-muted">{tr('কোনো খোলা সমস্যা নেই।', 'No open reports.')}</p>}
      {shown.map((r) => (
        <article key={r.id} className={`rounded-[18px] border-[2.5px] border-ink bg-white p-4 ${r.status === 'done' ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-coral-soft px-2.5 py-0.5 font-bold text-coral-deep">{KIND[r.kind] ?? r.kind}</span>
            <span className="font-mono">{r.qid}</span>
            {r.levelId > 0 && <Link to="/level/$levelId" params={{ levelId: String(r.levelId) }} className="font-semibold text-route-deep">Level {bn(r.levelId)} · {levelMeta[r.levelId]?.title}</Link>}
            <span className="text-muted">{r.lang}{r.at ? ` · ${new Date(r.at.seconds * 1000).toLocaleString()}` : ''}</span>
          </div>
          {r.note && <p className="m-0 mt-2 font-semibold">“{r.note}”</p>}
          <p className="m-0 mt-2">{r.prompt}</p>
          <ol className="m-0 mt-1 pl-5 text-sm">{r.options.map((o, i) => <li key={i} className={i === 0 ? 'font-semibold text-route-deep' : ''}>{o}{i === 0 ? ' ✓' : ''}</li>)}</ol>
          {r.status !== 'done' && <button type="button" onClick={() => void markDone(r.id)} className="btn-press mt-3 min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('ঠিক করা হলো', 'Mark resolved')}</button>}
        </article>
      ))}
    </section>
  );
}

type Sort = 'hard' | 'easy' | 'sure-wrong' | 'most';
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

function Questions({ batches }: { batches: { lang: string; items: AnswerEvent[] }[] }) {
  const [sort, setSort] = useState<Sort>('hard');
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  // option keys are made from the text in the language the learner played in: compare like with like
  const stats = useMemo(() => aggregate(batches, lang), [batches]);
  const chapters = useMemo(() => [...new Set(stats.flatMap((s) => chapterOf(levelOfQid(s.qid)) ?? []))], [stats]);
  const content = useChapters(chapters);
  if (content.state === 'loading') return <PageLoading />;

  const rows = stats.map((s) => {
    const info = content.state === 'ready' ? questionInfo(s.qid) : null;
    const keys = info && !info.generated ? { right: optionKey(info.options[0]!), wrong: info.options.slice(1).map(optionKey) } : undefined;
    return { s, info, keys, flags: flagsFor(s, keys) };
  });
  const key: Record<Sort, (s: QStat) => number> = {
    hard: (s) => s.right / s.n, easy: (s) => -s.right / s.n, 'sure-wrong': (s) => -s.sureWrong / s.n, most: (s) => -s.n,
  };
  const shown = rows.filter((r) => !flaggedOnly || r.flags.length).sort((a, b) => key[sort](a.s) - key[sort](b.s)).slice(0, 200);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-semibold">{tr('সাজান', 'Sort')}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-11 rounded-xl border-2 border-ink bg-white px-2 font-[inherit]">
            <option value="hard">{tr('কঠিন আগে', 'Hardest first')}</option>
            <option value="easy">{tr('সহজ আগে', 'Easiest first')}</option>
            <option value="sure-wrong">{tr('নিশ্চিত-ভুল বেশি আগে', 'Most sure-but-wrong')}</option>
            <option value="most">{tr('বেশি উত্তর আগে', 'Most answered')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="h-5 w-5" /> {tr('শুধু চিহ্নিতগুলো', 'Flagged only')}</label>
        <span className="text-sm text-muted">{tr(`${bn(stats.length)}টা প্রশ্ন; ${bn(MIN_ANSWERS)}টার কম উত্তর থাকলে বিচার হয় না`, `${stats.length} questions; under ${MIN_ANSWERS} answers are not judged`)}</span>
      </div>
      {shown.length === 0 && <p className="m-0 text-muted">{tr('দেখানোর মতো কিছু নেই।', 'Nothing to show.')}</p>}
      <div className="overflow-x-auto rounded-[18px] border-[2.5px] border-ink bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-[#F0F2EC]"><tr>{[tr('প্রশ্ন', 'Question'), tr('উত্তর', 'Answers'), tr('ঠিক', 'Right'), tr('নিশ্চিত-ভুল', 'Sure-wrong'), tr('চিহ্ন', 'Flags')].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map(({ s, info, keys, flags }) => (
              <tr key={s.qid} className="border-t border-[#D7DED1] align-top">
                <td className="max-w-[460px] px-3 py-2">
                  <button type="button" onClick={() => setOpen(open === s.qid ? null : s.qid)} aria-expanded={open === s.qid} className="cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-ink">
                    <span className="font-mono text-xs text-muted">{s.qid} · Level {bn(levelOfQid(s.qid))}{conceptLabel(s.qid) ? ` · ${conceptLabel(s.qid)}` : ''}</span>
                    <span className="block font-semibold">{info?.prompt ?? tr('(প্রশ্ন আর নেই)', '(question no longer exists)')}{info?.generated ? ` ${tr('(সংখ্যা বদলায়)', '(numbers vary)')}` : ''}</span>
                  </button>
                  {open === s.qid && info && keys && (
                    <ul className="m-0 mt-2 list-none p-0">
                      {info.options.map((o, i) => {
                        const n = s.picks[optionKey(o)] ?? 0;
                        return (
                          <li key={i} className="mt-1">
                            <div className="flex justify-between gap-3"><span className={i === 0 ? 'font-semibold text-route-deep' : ''}>{o}{i === 0 ? ' ✓' : ''}</span><span className="font-mono">{bn(n)}</span></div>
                            <div className="h-1.5 rounded-full bg-locked"><div className={`h-full rounded-full ${i === 0 ? 'bg-route' : 'bg-coral'}`} style={{ width: `${pct(n, s.n)}%` }} /></div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-2 font-mono">{bn(s.n)}</td>
                <td className="px-3 py-2 font-mono">{bn(pct(s.right, s.n))}%</td>
                <td className="px-3 py-2 font-mono">{bn(pct(s.sureWrong, s.n))}%</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{flags.map((f) => <span key={f} className={`rounded-full px-2 py-0.5 text-xs font-bold ${FLAG[f][1]}`}>{FLAG[f][0]}</span>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
