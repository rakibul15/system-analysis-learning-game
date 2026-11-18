import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { questionInfo } from '@/content/bank';
import { chapterOf, conceptLabel, levelMeta } from '@/content/meta';
import { useChapters } from '@/content/useChapters';
import { useAuth } from '@/features/auth/auth';
import { isAdmin, loadAdminData, setQuestionOff, STATUSES, updateReports, usingFixture, type AdminData, type Disabled, type ReportStatus, type StoredReport } from '@/features/stats/admin';
import { aggregate, flagsFor, MIN_ANSWERS, type Flag, type QStat } from '@/features/stats/aggregate';
import { issueUrl } from '@/features/stats/issue';
import { bn } from '@/shared/lib/bn';
import { lang, tr } from '@/shared/lib/i18n';
import { levelOfQid, optionKey, type ReportKind } from '@/shared/lib/outbox';
import { AppShell } from '@/shared/ui/AppShell';
import { PageLoading } from '@/shared/ui/Loading';

/*
 * For whoever maintains the questions. The loop: a learner reports a problem or the numbers
 * flag a question → triage it here → turn it off at once if it is broken → open a GitHub
 * issue → fix it in the content with a PR → turn it back on. Only accounts listed in
 * admins/{uid} can read or change any of this (firestore.rules).
 */

type State = { kind: 'loading' } | { kind: 'denied'; why: string } | { kind: 'ready'; data: AdminData } | { kind: 'error'; message: string };

const FLAG: Record<Flag, [string, string]> = {
  easy: [tr('খুব সহজ', 'Too easy'), 'bg-route-soft text-route-deep'],
  hard: [tr('খুব কঠিন / উত্তর ভুল?', 'Too hard / wrong key?'), 'bg-coral-soft text-coral-deep'],
  'sure-wrong': [tr('নিশ্চিত হয়েও ভুল', 'Sure but wrong'), 'bg-coral-soft text-coral-deep'],
  'one-trap': [tr('একটা ফাঁদেই সবাই', 'One trap takes all'), 'bg-parcel-soft text-[#7A4D00]'],
  'dead-option': [tr('কেউ বাছে না এমন অপশন', 'An option nobody picks'), 'bg-locked text-locked-ink'],
};
const KIND: Record<ReportKind, string> = {
  wrong: tr('উত্তর ভুল', 'Answer wrong'), unclear: tr('অস্পষ্ট', 'Unclear'), typo: tr('বানান', 'Typo'), other: tr('অন্য', 'Other'),
};
const STATUS: Record<ReportStatus, [string, string]> = {
  open: [tr('খোলা', 'Open'), 'bg-coral-soft text-coral-deep'],
  working: [tr('দেখছি', 'Working on it'), 'bg-parcel-soft text-[#7A4D00]'],
  fixed: [tr('ঠিক হয়েছে', 'Fixed'), 'bg-route-soft text-route-deep'],
  wontfix: [tr('বাদ', "Won't fix"), 'bg-locked text-locked-ink'],
};
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const levelLabel = (qid: string) => { const id = levelOfQid(qid); return id ? `Level ${bn(id)}${levelMeta[id] ? ` · ${levelMeta[id]!.title}` : ''}` : qid; };
const btn = 'btn-press inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-ink px-3.5 font-semibold no-underline';

export function AdminPage() {
  const user = useAuth((s) => s.user);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [tab, setTab] = useState<'reports' | 'questions'>('reports');

  useEffect(() => {
    if (!user && !usingFixture()) { setState({ kind: 'denied', why: tr('আগে admin account দিয়ে sign in করুন।', 'Sign in with an admin account first.') }); return; }
    let alive = true;
    (async () => {
      if (!(await isAdmin(user?.uid ?? ''))) return { kind: 'denied', why: tr('এই account admin না। Firebase console-এ admins/{আপনার uid} document বানালে দেখা যাবে।', 'This account is not an admin. Create admins/{your uid} in the Firebase console to see this.') } as State;
      return { kind: 'ready', data: await loadAdminData() } as State;
    })().then((s) => alive && setState(s), (e: unknown) => alive && setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, [user]);

  const set = (f: (d: AdminData) => AdminData) => setState((s) => (s.kind === 'ready' ? { kind: 'ready', data: f(s.data) } : s));
  const toggleOff = async (qid: string, off: boolean, reason: string) => {
    const disabled = await setQuestionOff(qid, off, reason);
    set((d) => ({ ...d, disabled }));
  };

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1080px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <header>
          <p className="m-0 text-sm font-bold text-route-deep">Admin</p>
          <h1 className="m-0 font-display text-[30px] font-extrabold">{tr('প্রশ্নের খবর', 'Question health')}</h1>
          <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('Report আর হিসাব দেখে প্রশ্ন ঠিক করার জায়গা। ভাঙা প্রশ্ন সাথে সাথে বন্ধ করুন, GitHub issue খুলুন, PR-এ ঠিক করুন, তারপর আবার চালু করুন।', 'Where questions get fixed. Turn a broken question off at once, open a GitHub issue, fix it in a PR, then turn it back on.')}</p>
        </header>
        {state.kind === 'loading' && <PageLoading />}
        {state.kind === 'denied' && <p className="m-0 rounded-2xl border-2 border-dashed border-[#9AA69F] p-5 font-semibold text-muted">{state.why}</p>}
        {state.kind === 'error' && <p className="m-0 rounded-2xl border-2 border-coral bg-coral-soft p-5 font-semibold" role="alert">{state.message}</p>}
        {state.kind === 'ready' && (
          <>
            <div role="tablist" className="flex flex-wrap gap-2">
              {([
                ['reports', `${tr('সমস্যা', 'Reports')} · ${bn(new Set(state.data.reports.filter((r) => r.status === 'open').map((r) => r.qid)).size)}`],
                ['questions', `${tr('প্রশ্নের হিসাব', 'Answer statistics')}${Object.keys(state.data.disabled).length ? ` · ${bn(Object.keys(state.data.disabled).length)} ${tr('বন্ধ', 'off')}` : ''}`],
              ] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink px-4 font-bold ${tab === k ? 'bg-ink text-white' : 'bg-white'}`}>{l}</button>
              ))}
            </div>
            {tab === 'reports'
              ? <Reports data={state.data} toggleOff={toggleOff}
                  onUpdated={(ids, status, adminNote) => set((d) => ({ ...d, reports: d.reports.map((r) => (ids.includes(r.id) ? { ...r, status, adminNote } : r)) }))} />
              : <Questions data={state.data} toggleOff={toggleOff} />}
          </>
        )}
      </main>
    </AppShell>
  );
}

type ToggleOff = (qid: string, off: boolean, reason: string) => Promise<void>;

/** Turn a question off (with a reason) or back on. */
function OffSwitch({ qid, off, toggleOff }: { qid: string; off: Disabled | undefined; toggleOff: ToggleOff }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (next: boolean) => { setBusy(true); try { await toggleOff(qid, next, reason); setAsking(false); } finally { setBusy(false); } };
  if (off) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">{tr('বন্ধ', 'Off')}{off.reason ? ` · ${off.reason}` : ''}</span>
        <button type="button" disabled={busy} onClick={() => void run(false)} className={`${btn} bg-white`}>{tr('আবার চালু করুন', 'Turn back on')}</button>
      </span>
    );
  }
  if (!asking) return <button type="button" onClick={() => setAsking(true)} className={`${btn} bg-white`}>⏻ {tr('প্রশ্নটা বন্ধ করুন', 'Turn this question off')}</button>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`off-${qid}`}>{tr('কেন বন্ধ', 'Why')}</label>
      <input id={`off-${qid}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={tr('কেন বন্ধ (নিজের জন্য)', 'Why (for yourself)')} className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-ink px-3 font-[inherit]" />
      <button type="button" disabled={busy} onClick={() => void run(true)} className={`${btn} bg-coral text-white`}>{tr('বন্ধ করুন', 'Turn off')}</button>
      <button type="button" onClick={() => setAsking(false)} className={`${btn} bg-white`}>{tr('থাক', 'Cancel')}</button>
    </span>
  );
}

function Reports({ data, onUpdated, toggleOff }: { data: AdminData; onUpdated: (ids: string[], s: ReportStatus, note: string) => void; toggleOff: ToggleOff }) {
  const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const [kind, setKind] = useState<ReportKind | 'all'>('all');
  const [level, setLevel] = useState<number | 0>(0);

  // one card per question, holding all of its reports; a question shows if any report matches
  const groups = useMemo(() => {
    const by = new Map<string, StoredReport[]>();
    for (const r of data.reports) by.set(r.qid, [...(by.get(r.qid) ?? []), r]);
    return [...by.entries()]
      .filter(([qid, rs]) => (!level || levelOfQid(qid) === level) && rs.some((r) => (status === 'all' || r.status === status) && (kind === 'all' || r.kind === kind)))
      .sort((a, b) => b[1].length - a[1].length);
  }, [data.reports, status, kind, level]);
  const levels = useMemo(() => [...new Set(data.reports.map((r) => levelOfQid(r.qid)))].filter(Boolean).sort((a, b) => a - b), [data.reports]);
  const stats = useMemo(() => new Map(aggregate(data.batches, lang).map((s) => [s.qid, s])), [data.batches]);

  const select = 'min-h-11 rounded-xl border-2 border-ink bg-white px-2 font-[inherit]';
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-semibold">{tr('অবস্থা', 'Status')}
          <select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | 'all')} className={select}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS[s][0]}</option>)}
            <option value="all">{tr('সব', 'All')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold">{tr('ধরন', 'Kind')}
          <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind | 'all')} className={select}>
            <option value="all">{tr('সব', 'All')}</option>
            {(Object.keys(KIND) as ReportKind[]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold">Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={select}>
            <option value={0}>{tr('সব', 'All')}</option>
            {levels.map((l) => <option key={l} value={l}>{bn(l)}</option>)}
          </select>
        </label>
      </div>
      {groups.length === 0 && <p className="m-0 text-muted">{tr('এই filter-এ কোনো report নেই।', 'No reports match.')}</p>}
      {groups.map(([qid, rs]) => <ReportGroup key={qid} qid={qid} reports={rs} stat={stats.get(qid)} off={data.disabled[qid]} onUpdated={onUpdated} toggleOff={toggleOff} />)}
    </section>
  );
}

function ReportGroup({ qid, reports, stat, off, onUpdated, toggleOff }: { qid: string; reports: StoredReport[]; stat?: QStat; off?: Disabled; onUpdated: (ids: string[], s: ReportStatus, note: string) => void; toggleOff: ToggleOff }) {
  const first = reports[0]!;
  const current: ReportStatus = reports.some((r) => r.status === 'open') ? 'open' : reports.some((r) => r.status === 'working') ? 'working' : first.status;
  const [note, setNote] = useState(first.adminNote ?? '');
  const [saving, setSaving] = useState<ReportStatus | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const save = async (next: ReportStatus) => {
    setSaving(next); setFailed(null);
    try { await updateReports(reports.map((r) => r.id), next, note.trim()); onUpdated(reports.map((r) => r.id), next, note.trim()); }
    catch (e) { setFailed(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(null); }
  };
  const url = issueUrl({
    qid, level: levelLabel(qid), concept: conceptLabel(qid), prompt: first.prompt, options: first.options, stat,
    picks: stat ? (o) => stat.picks[optionKey(o)] ?? 0 : undefined,
    reports: reports.map((r) => ({ kind: r.kind, note: r.note, lang: r.lang })),
  });

  return (
    <article className="rounded-[18px] border-[2.5px] border-ink bg-white p-4" aria-label={`${qid}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 font-bold ${STATUS[current][1]}`}>{STATUS[current][0]}</span>
        <span className="font-mono">{qid}</span>
        {levelOfQid(qid) > 0 && <Link to="/level/$levelId" params={{ levelId: String(levelOfQid(qid)) }} className="font-semibold text-route-deep">{levelLabel(qid)}</Link>}
        {conceptLabel(qid) && <span className="text-muted">· {conceptLabel(qid)}</span>}
        <span className="ml-auto font-semibold">{tr(`${bn(reports.length)}টা report`, `${reports.length} report${reports.length > 1 ? 's' : ''}`)}</span>
      </div>
      <p className="m-0 mt-2 font-semibold">{first.prompt}</p>
      <ol className="m-0 mt-1 pl-5 text-sm">{first.options.map((o, i) => <li key={i} className={i === 0 ? 'font-semibold text-route-deep' : ''}>{o}{i === 0 ? ' ✓' : ''}{stat?.n ? <span className="font-mono text-muted"> · {bn(pct(stat.picks[optionKey(o)] ?? 0, stat.n))}%</span> : null}</li>)}</ol>
      {stat && <p className="m-0 mt-1 text-sm text-muted">{tr(`${bn(stat.n)}টা উত্তর · ঠিক ${bn(pct(stat.right, stat.n))}% · নিশ্চিত-ভুল ${bn(pct(stat.sureWrong, stat.n))}%`, `${stat.n} answers · right ${pct(stat.right, stat.n)}% · sure but wrong ${pct(stat.sureWrong, stat.n)}%`)}</p>}
      <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl bg-[#F7F8F3] px-3 py-2 text-sm">
            <span className="font-bold">{KIND[r.kind] ?? r.kind}</span>
            <span className="text-muted"> · {r.lang}{r.at ? ` · ${new Date(r.at.seconds * 1000).toLocaleDateString()}` : ''}{r.status !== current ? ` · ${STATUS[r.status][0]}` : ''}</span>
            {r.note && <span className="block">“{r.note}”</span>}
          </li>
        ))}
      </ul>
      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">{tr('নিজের note (learner দেখে না)', 'Your note (learners never see it)')}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} className="rounded-xl border-2 border-ink p-2.5 font-[inherit] text-base font-normal" />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {STATUSES.filter((s) => s !== current).map((s) => (
          <button key={s} type="button" disabled={!!saving} onClick={() => void save(s)} className={`${btn} ${s === 'fixed' ? 'bg-route text-white' : 'bg-white'}`}>{saving === s ? '…' : `→ ${STATUS[s][0]}`}</button>
        ))}
        {note.trim() !== (first.adminNote ?? '') && <button type="button" disabled={!!saving} onClick={() => void save(current)} className={`${btn} bg-white`}>{tr('Note রাখুন', 'Save note')}</button>}
        <a href={url} target="_blank" rel="noreferrer" className={`${btn} bg-parcel text-ink`}>{tr('GitHub issue খুলুন ↗', 'Open a GitHub issue ↗')}</a>
        <OffSwitch qid={qid} off={off} toggleOff={toggleOff} />
      </div>
      {failed && <p className="m-0 mt-2 text-sm text-coral-deep" role="alert">{tr('Save হয়নি:', 'Not saved:')} {failed}</p>}
    </article>
  );
}

type Sort = 'hard' | 'easy' | 'sure-wrong' | 'most';

function Questions({ data, toggleOff }: { data: AdminData; toggleOff: ToggleOff }) {
  const [sort, setSort] = useState<Sort>('hard');
  const [show, setShow] = useState<'flagged' | 'off' | 'all'>('flagged');
  const [open, setOpen] = useState<string | null>(null);
  const qids = useMemo(() => [...new Set(data.batches.flatMap((b) => b.items.map((a) => a.q)))], [data.batches]);
  const content = useChapters([...new Set([...qids, ...Object.keys(data.disabled)].flatMap((q) => chapterOf(levelOfQid(q)) ?? []))]);
  const ready = content.state === 'ready';
  // option and version keys come from the text in the language played: compare like with like
  const stats = useMemo(() => {
    const version = (qid: string) => { const i = ready ? questionInfo(qid) : null; return i && !i.generated ? optionKey(i.prompt) : undefined; };
    const got = aggregate(data.batches, lang, version);
    const seen = new Set(got.map((s) => s.qid));
    // turned-off questions with no answers yet still get a row, so they can be turned back on
    for (const qid of Object.keys(data.disabled)) if (!seen.has(qid)) got.push({ qid, n: 0, right: 0, sure: 0, sureWrong: 0, picks: {}, where: {}, older: 0 });
    return got;
  }, [data.batches, data.disabled, ready]);
  if (content.state === 'loading') return <PageLoading />;

  const rows = stats.map((s) => {
    const info = ready ? questionInfo(s.qid) : null;
    const keys = info && !info.generated ? { right: optionKey(info.options[0]!), wrong: info.options.slice(1).map(optionKey) } : undefined;
    return { s, info, keys, flags: flagsFor(s, keys), off: data.disabled[s.qid] };
  });
  const rate = (s: QStat) => (s.n ? s.right / s.n : 1);
  const key: Record<Sort, (s: QStat) => number> = {
    hard: rate, easy: (s) => -rate(s), 'sure-wrong': (s) => (s.n ? -s.sureWrong / s.n : 0), most: (s) => -s.n,
  };
  const shown = rows
    .filter((r) => (show === 'all' ? true : show === 'off' ? !!r.off : r.flags.length > 0 || !!r.off))
    .sort((a, b) => key[sort](a.s) - key[sort](b.s)).slice(0, 200);

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
        <label className="flex items-center gap-2 font-semibold">{tr('দেখান', 'Show')}
          <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="min-h-11 rounded-xl border-2 border-ink bg-white px-2 font-[inherit]">
            <option value="flagged">{tr('চিহ্নিত আর বন্ধ', 'Flagged and off')}</option>
            <option value="off">{tr('শুধু বন্ধ', 'Turned off only')}</option>
            <option value="all">{tr('সব', 'All')}</option>
          </select>
        </label>
        <span className="text-sm text-muted">{tr(`${bn(stats.length)}টা প্রশ্ন; ${bn(MIN_ANSWERS)}টার কম উত্তর থাকলে বিচার হয় না; প্রশ্নের লেখা বদলালে আগের উত্তর আলাদা গোনা হয়`, `${stats.length} questions; under ${MIN_ANSWERS} answers are not judged; answers to an earlier wording are counted apart`)}</span>
      </div>
      {shown.length === 0 && <p className="m-0 text-muted">{tr('দেখানোর মতো কিছু নেই।', 'Nothing to show.')}</p>}
      <div className="overflow-x-auto rounded-[18px] border-[2.5px] border-ink bg-white">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[#F0F2EC]"><tr>{[tr('প্রশ্ন', 'Question'), tr('উত্তর', 'Answers'), tr('ঠিক', 'Right'), tr('নিশ্চিত-ভুল', 'Sure-wrong'), tr('চিহ্ন', 'Flags')].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map(({ s, info, keys, flags, off }) => (
              <tr key={s.qid} className="border-t border-[#D7DED1] align-top">
                <td className="max-w-[480px] px-3 py-2">
                  <button type="button" onClick={() => setOpen(open === s.qid ? null : s.qid)} aria-expanded={open === s.qid} className="cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-ink">
                    <span className="font-mono text-xs text-muted">{s.qid} · {levelLabel(s.qid)}{conceptLabel(s.qid) ? ` · ${conceptLabel(s.qid)}` : ''}</span>
                    <span className="block font-semibold">{info?.prompt ?? tr('(প্রশ্ন আর নেই)', '(question no longer exists)')}{info?.generated ? ` ${tr('(সংখ্যা বদলায়)', '(numbers vary)')}` : ''}</span>
                  </button>
                  {open === s.qid && (
                    <div className="mt-2 flex flex-col gap-2">
                      {info && keys && (
                        <ul className="m-0 list-none p-0">
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
                      {s.older > 0 && <p className="m-0 text-xs text-muted">{tr(`আগের লেখার ${bn(s.older)}টা উত্তর এই হিসাবে নেই।`, `${s.older} answers to an earlier wording are left out.`)}</p>}
                      <div className="flex flex-wrap gap-2">
                        <a className={`${btn} bg-parcel text-ink`} target="_blank" rel="noreferrer" href={issueUrl({
                          qid: s.qid, level: levelLabel(s.qid), concept: conceptLabel(s.qid), prompt: info?.prompt, options: info?.generated ? undefined : info?.options,
                          stat: s, picks: (o) => s.picks[optionKey(o)] ?? 0, flags: flags.map((f) => FLAG[f][0]),
                        })}>{tr('GitHub issue খুলুন ↗', 'Open a GitHub issue ↗')}</a>
                        <OffSwitch qid={s.qid} off={off} toggleOff={toggleOff} />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono">{bn(s.n)}</td>
                <td className="px-3 py-2 font-mono">{s.n ? `${bn(pct(s.right, s.n))}%` : '–'}</td>
                <td className="px-3 py-2 font-mono">{s.n ? `${bn(pct(s.sureWrong, s.n))}%` : '–'}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">
                  {off && <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">{tr('বন্ধ', 'Off')}</span>}
                  {flags.map((f) => <span key={f} className={`rounded-full px-2 py-0.5 text-xs font-bold ${FLAG[f][1]}`}>{FLAG[f][0]}</span>)}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
