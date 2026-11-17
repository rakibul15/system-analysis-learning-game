import { useMemo, useState } from 'react';
import { dbScenarios, grade, rightAnswer, type Answers, type ColTag, type DbFinding, type DbScenario, type Table } from '@/features/dbdesign/scenarios';
import { useProgress } from '@/entities/progress/store';
import { BookRefs } from '@/features/books/BookRefs';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { tr } from '@/shared/lib/i18n';

const shuffle = <T,>(xs: readonly T[]) => xs.map((x) => ({ x, k: Math.random() })).sort((a, b) => a.k - b.k).map((p) => p.x);

const TAG: Record<ColTag, { label: string; title: string; cls: string }> = {
  PK: { label: 'PK', title: tr('Primary key', 'Primary key'), cls: 'bg-ink text-white' },
  FK: { label: 'FK', title: tr('অন্য table-এর দিকে', 'Foreign key'), cls: 'bg-[#DCE3F8] text-[#22336B]' },
  UQ: { label: 'UNIQUE', title: tr('দুবার একই মান চলবে না', 'No duplicate values'), cls: 'bg-coral-soft text-coral-deep' },
  IX: { label: 'INDEX', title: tr('দ্রুত খোঁজার index', 'An index for fast lookups'), cls: 'bg-parcel-soft text-[#7A4D00]' },
  PART: { label: 'PARTITION', title: tr('কোন partition-এ যাবে', 'Decides the partition'), cls: 'bg-[#EDE6F8] text-[#4B2F7A]' },
  SORT: { label: 'SORT', title: tr('Partition-এর ভেতরে ক্রম', 'Order within a partition'), cls: 'bg-route-soft text-route-deep' },
  TTL: { label: 'TTL', title: tr('নির্দিষ্ট সময় পরে মুছে যায়', 'Expires after a set time'), cls: 'bg-[#E8E8E0] text-ink' },
};

/** Pick a data problem, place fields, make the key decisions, then see where the design breaks. */
export function DbDesignLab() {
  const best = useProgress((s) => s.builds);
  const [open, setOpen] = useState<DbScenario | null>(null);
  if (open) return <Session key={open.id} sc={open} onBack={() => setOpen(null)} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border-[3px] border-ink bg-white p-5">
        <h2 className="m-0 font-display text-xl font-bold">{tr('Database নিজে design করুন', 'Design the database yourself')}</h2>
        <p className="m-0 mt-1 max-w-[70ch] text-ink-soft">{tr('প্রতিটা field কোন table-এ যাবে ঠিক করুন, তারপর key, index, constraint, type আর store বাছুন। যাচাই করলে দেখবেন কোথায় ভুল, production-এ ঠিক কী ভাঙত, কেন, আর কী করতে হবে।', 'Decide which table each field belongs to, then choose keys, indexes, constraints, types and the store. Checking shows where it is wrong, exactly what would break in production, why, and what to do.')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {dbScenarios.map((s) => {
          const b = best[`db:${s.id}`];
          const total = s.fields.length + s.decisions.length;
          return (
            <button key={s.id} type="button" onClick={() => setOpen(s)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
              <span className="text-xs font-bold text-route-deep">{tr(`DB design · Level ${bn(s.level)}-এর বিষয়`, `DB design · topic of level ${s.level}`)}</span>
              <span className="font-display text-lg font-bold">{s.title}</span>
              <span className="text-sm text-ink-soft">{s.brief}</span>
              {b !== undefined && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(b * total))}/{bn(total)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Session({ sc, onBack }: { sc: DbScenario; onBack: () => void }) {
  const record = useProgress((s) => s.recordBuild);
  const [round, setRound] = useState(0);
  const fields = useMemo(() => shuffle(sc.fields), [sc, round]);
  const decisions = useMemo(() => shuffle(sc.decisions).map((d) => ({ ...d, options: shuffle(d.options) })), [sc, round]);
  const [a, setA] = useState<Answers>({ fields: {}, decisions: {} });
  const [result, setResult] = useState<ReturnType<typeof grade> | null>(null);
  const [showModel, setShowModel] = useState(false);
  const answered = Object.keys(a.fields).length + Object.keys(a.decisions).length;
  const total = sc.fields.length + sc.decisions.length;
  const wrongIds = new Set(result?.findings.map((f) => `${f.kind}:${f.id}`));

  const setField = (id: string, t: string) => { setA((x) => ({ ...x, fields: { ...x.fields, [id]: t } })); setResult(null); };
  const setDecision = (id: string, o: string) => { setA((x) => ({ ...x, decisions: { ...x.decisions, [id]: o } })); setResult(null); };
  const check = () => {
    const r = grade(sc, a);
    setResult(r);
    record(`db:${sc.id}`, r.right / r.total);
    play(r.verdict === 'right' ? 'level' : r.verdict === 'close' ? 'mission' : 'wrong');
  };
  const fix = (f: DbFinding) => {
    const next: Answers = f.kind === 'field'
      ? { ...a, fields: { ...a.fields, [f.id]: rightAnswer(sc, 'field', f.id) } }
      : { ...a, decisions: { ...a.decisions, [f.id]: rightAnswer(sc, 'decision', f.id) } };
    setA(next);
    setResult(grade(sc, next));
    play('tap');
  };
  const again = () => { setA({ fields: {}, decisions: {} }); setResult(null); setShowModel(false); setRound((n) => n + 1); };
  const state = (key: string) => (!result ? 'idle' : wrongIds.has(key) ? 'bad' : 'good');
  const ring = (st: string) => (st === 'bad' ? 'border-coral bg-coral-soft' : st === 'good' ? 'border-route bg-route-soft' : 'border-ink bg-white');

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">{tr('← সব DB design', '← All DB designs')}</button>
      <div>
        <p className="m-0 text-xs font-bold text-route-deep">{tr(`DB design · Level ${bn(sc.level)}`, `DB design · Level ${sc.level}`)}</p>
        <h2 className="m-0 font-display text-[26px] font-extrabold">{sc.title}</h2>
        <p className="m-0 mt-1 max-w-[70ch]">{sc.brief}</p>
      </div>
      <section aria-label={tr('কী কী করতে হবে', 'What it must do')} className="rounded-[18px] border-[2.5px] border-ink bg-[#F7F8F3] p-4">
        <h3 className="m-0 text-sm font-bold">{tr('System-কে যা যা করতে হবে', 'What the system must do')}</h3>
        <ul className="m-0 mt-1.5 flex flex-col gap-1 pl-5 text-[15px]">{sc.patterns.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>

      <section aria-label={tr('Field কোথায়', 'Where fields go')} className="flex flex-col gap-2 rounded-[20px] border-[3px] border-ink bg-white p-4">
        <h3 className="m-0 font-display text-lg font-bold">{tr('১. প্রতিটা field কোন table-এ?', '1. Which table does each field go in?')}</h3>
        {fields.map((f) => {
          const st = state(`field:${f.id}`);
          return (
            <div key={f.id} className={`flex flex-col gap-2 rounded-xl border-2 p-3 sm:flex-row sm:items-center ${ring(st)}`}>
              <div className="min-w-0 sm:w-[38%]">
                <p className="m-0 font-mono text-[15px] font-bold">{f.name} {st === 'bad' ? '✕' : st === 'good' ? '✓' : ''}</p>
                <p className="m-0 text-sm text-ink-soft">{f.desc}</p>
              </div>
              <div role="radiogroup" aria-label={f.name} className="flex flex-wrap gap-1.5">
                {sc.tables.map((t) => {
                  const on = a.fields[f.id] === t.id;
                  return <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setField(f.id, t.id)} className={`min-h-10 cursor-pointer rounded-lg border-2 border-ink px-2.5 font-mono text-sm font-semibold ${on ? 'bg-ink text-white' : 'bg-white'}`}>{t.label}</button>;
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section aria-label={tr('সিদ্ধান্ত', 'Decisions')} className="flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-white p-4">
        <h3 className="m-0 font-display text-lg font-bold">{tr('২. মূল সিদ্ধান্তগুলো', '2. The key decisions')}</h3>
        {decisions.map((d) => {
          const st = state(`decision:${d.id}`);
          return (
            <fieldset key={d.id} className={`m-0 flex flex-col gap-1.5 rounded-xl border-2 p-3 ${ring(st)}`}>
              <legend className="px-1 font-bold">{d.ask} {st === 'bad' ? '✕' : st === 'good' ? '✓' : ''}</legend>
              <div role="radiogroup" aria-label={d.ask} className="grid gap-1.5 sm:grid-cols-2">
                {d.options.map((o) => {
                  const on = a.decisions[d.id] === o.id;
                  const reveal = result && wrongIds.has(`decision:${d.id}`) && o.ok;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => setDecision(d.id, o.id)}
                      className={`min-h-11 cursor-pointer rounded-lg border-2 px-3 py-2 text-left font-[inherit] text-[15px] ${on ? 'border-ink bg-ink text-white' : reveal ? 'border-dashed border-route bg-white' : 'border-ink bg-white'}`}>
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!answered} onClick={check} className="btn-press min-h-[52px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold shadow-[0_4px_0_#16252D] disabled:cursor-not-allowed disabled:opacity-50">{tr('Design যাচাই করুন', 'Check my design')}</button>
        <span className="text-sm text-muted">{tr(`${bn(answered)}/${bn(total)} বাছা হয়েছে`, `${answered}/${total} answered`)}</span>
        {result && <button type="button" onClick={again} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('নতুন করে আবার', 'Start over')}</button>}
      </div>

      {result && (
        <section aria-label={tr('উত্তর', 'Answer')} aria-live="polite" className="pop-in flex flex-col gap-3 rounded-[22px] border-[3px] border-ink bg-white p-5">
          <div className={`rounded-xl px-4 py-3 font-display text-xl font-extrabold ${result.verdict === 'right' ? 'bg-route text-white' : result.verdict === 'close' ? 'bg-parcel' : 'bg-coral text-white'}`}>
            {result.verdict === 'right' ? tr('ঠিক! পুরো design production-এর জন্য তৈরি।', 'Right! The whole design is ready for production.')
              : result.verdict === 'close' ? tr(`প্রায় ঠিক: ${bn(result.findings.length)}টা জিনিস বাকি`, `Almost: ${result.findings.length} thing${result.findings.length > 1 ? 's' : ''} left`)
              : tr(`এখনো ভুল: ${bn(result.findings.length)}টা জায়গায় সমস্যা`, `Not yet: ${result.findings.length} problems`)}
            <span className="ml-2 font-mono text-base">{bn(result.right)}/{bn(result.total)}</span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {result.findings.map((f) => (
              <li key={`${f.kind}:${f.id}`} className="rounded-xl border-2 border-coral bg-coral-soft p-3">
                <p className="m-0 font-bold">✕ {f.kind === 'field' ? <span className="font-mono">{f.title}</span> : f.title}</p>
                <div className="mt-1.5 grid gap-1 text-[15px]">
                  <p className="m-0"><b>{tr('কোথায় ভুল, কী ভাঙবে:', 'What is wrong and what breaks:')}</b> {f.where}</p>
                  <p className="m-0"><b>{tr('কেন:', 'Why:')}</b> {f.why}</p>
                  <p className="m-0"><b>{tr('কী করবেন:', 'What to do:')}</b> {f.fix}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-start gap-2">
                  <button type="button" onClick={() => fix(f)} className="btn-press min-h-10 cursor-pointer rounded-lg border-2 border-ink bg-white px-3 text-sm font-bold shadow-[0_2px_0_#16252D]">{tr('আমার হয়ে ঠিক করুন', 'Fix it for me')}</button>
                  {f.ref && <BookRefs refs={[f.ref]} title="" className="min-w-[240px] flex-1" />}
                </div>
              </li>
            ))}
          </ol>
          {result.verdict === 'right' && (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {sc.decisions.map((d) => <li key={d.id} className="rounded-lg bg-route-soft px-3 py-2"><b>✓ {d.options.find((o) => o.ok)!.text}</b><br /><span className="text-ink-soft">{d.why}</span></li>)}
            </ul>
          )}
          <div className="rounded-xl border-2 border-dashed border-ink p-3">
            {showModel ? (
              <>
                <p className="m-0 font-bold">{tr('একটা model schema', 'A model schema')}</p>
                <p className="m-0 mt-1 text-sm text-ink-soft">{sc.modelNote}</p>
                <ModelSchema tables={sc.model} />
              </>
            ) : <button type="button" onClick={() => setShowModel(true)} className="min-h-10 cursor-pointer rounded-lg border-2 border-ink bg-white px-3 font-semibold">{tr('Model schema দেখুন', 'Show a model schema')}</button>}
          </div>
          <BookRefs refs={sc.refs} level={sc.level} />
        </section>
      )}
    </div>
  );
}

/** Table cards with columns, types and key tags. */
function ModelSchema({ tables }: { tables: Table[] }) {
  const used = new Set(tables.flatMap((t) => (t.columns ?? []).flatMap((c) => c.tags ?? [])));
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-2">
        {tables.map((t) => (
          <div key={t.id} className="min-w-0 overflow-hidden rounded-xl border-2 border-ink bg-white">
            <p className="m-0 bg-ink px-3 py-1.5 font-mono text-sm font-bold text-white">{t.label}</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {(t.columns ?? []).map((c) => (
                <li key={c.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[#E3E6DF] px-3 py-1.5 text-sm first:border-t-0">
                  <span className="font-mono font-bold">{c.name}</span>
                  <span className="font-mono text-xs text-muted">{c.type}</span>
                  {c.tags?.map((g) => <span key={g} title={TAG[g].title} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${TAG[g].cls}`}>{TAG[g].label}</span>)}
                  {c.note && <span className="w-full text-xs text-ink-soft">{c.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
        {[...used].map((g) => <span key={g}><span className={`mr-1 rounded px-1 font-bold ${TAG[g].cls}`}>{TAG[g].label}</span>{TAG[g].title}</span>)}
      </p>
    </div>
  );
}
