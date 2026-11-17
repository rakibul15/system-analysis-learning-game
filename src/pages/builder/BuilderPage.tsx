import { useMemo, useState } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { runAll, singlePoints, type FlowStatus } from '@/features/builder/chaos';
import { capacityReport, slaByChallenge, SPEC } from '@/features/builder/capacity';
import { dueRebuilds } from '@/features/rebuild/rebuild';
import { MigrationLab } from '@/widgets/migrate/MigrationLab';
import { BookRefs } from '@/features/books/BookRefs';
import { costRefs, levelRefs } from '@/features/books/catalog';
import { useClock } from '@/simulators/knob/anim';
import { challenges, PARTS, referenceGraph, scoreOf, type Challenge, type Graph, type PartKind } from '@/features/builder/model';
import { applyFix, diagnose, type Finding } from '@/features/builder/rules';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { AppShell } from '@/shared/ui/AppShell';
import { tr } from '@/shared/lib/i18n';

const builderSearch = () => getRouteApi('/builder').useSearch();

const COLOR: Record<PartKind, string> = {
  client: '#FFFFFF', cdn: '#C8E6FF', limiter: '#FFD9D4', lb: '#FFE7A8', api: '#BFEBDD', ws: '#BFEBDD',
  cache: '#FFD9A0', queue: '#E3D7F5', worker: '#D7EEC4', db: '#C7D3F5', replica: '#DCE3F8', store: '#E8E8E0', provider: '#F2E1EC',
};

const FLOW_COLOR = ['#2F6FDE', '#E0483E', '#0B8A7A', '#B8730A'];
const STATUS: Record<FlowStatus, { text: string; cls: string }> = {
  ok: { text: tr('চলছে', 'Working'), cls: 'bg-route-soft text-route-deep' },
  slow: { text: tr('চলছে, তবে ধীরে', 'Working, but slowly'), cls: 'bg-parcel-soft text-[#7A4D00]' },
  queued: { text: tr('Queue-তে জমা, পরে যাবে', 'Held in the queue, will go later'), cls: 'bg-[#EDE6F8] text-[#4B2F7A]' },
  down: { text: tr('বন্ধ', 'Down'), cls: 'bg-coral-soft text-coral-deep' },
};

/** Architecture builder: place parts, wire them, check the design, then break it on purpose. */
export function BuilderPage() {
  const best = useProgress((s) => s.builds);
  const p = useProgress();
  const { memory } = builderSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState<{ c: Challenge; memory: boolean } | null>(() => {
    const c = memory ? challenges.find((x) => x.id === memory) : undefined;
    return c ? { c, memory: true } : null;
  });
  const due = dueRebuilds(p);
  const [section, setSection] = useState<'design' | 'migrate'>('design');
  const close = () => { setOpen(null); if (memory) void navigate({ to: '/builder', search: {} }); };
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1100px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {open ? <Board key={`${open.c.id}-${open.memory}`} c={open.c} memory={open.memory} onBack={close} /> : (
          <>
            <div>
              <p className="m-0 text-sm font-bold text-route-deep">Architecture builder</p>
              <h1 className="m-0 font-display text-[32px] font-extrabold">{tr('নিজে আঁকুন', 'Draw it yourself')}</h1>
              <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('অংশ বসান, তীর টানুন, যাচাই করুন। তারপর "ভাঙুন" mode-এ যেকোনো অংশ বন্ধ করে দেখুন কোন request আটকায়।', 'Place parts, draw arrows, check. Then switch to "Break it" and switch off any part to see which requests stop.')}</p>
            </div>
            <div role="tablist" aria-label={tr('ধরন', 'Kind')} className="flex flex-wrap gap-2">
              {([['design', tr('Design challenge', 'Design challenges')], ['migrate', tr('Migration', 'Migrations')]] as const).map(([k, l]) => (
                <button key={k} role="tab" type="button" aria-selected={section === k} onClick={() => setSection(k)} className={`min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink px-4 font-bold ${section === k ? 'bg-ink text-white' : 'bg-white'}`}>{l}</button>
              ))}
            </div>
            {section === 'migrate' ? <MigrationLab /> : <>
            {due.length > 0 && (
              <section className="rounded-[20px] border-[3px] border-ink bg-[#EDE6F8] p-4">
                <h2 className="m-0 font-display text-lg font-bold">{tr('আজ না দেখে আবার আঁকুন', 'Redraw from memory today')}</h2>
                <p className="m-0 mt-1 text-sm text-ink-soft">{tr('নিয়ম লুকানো থাকবে, শুধু সমস্যাটা। পুরো ঠিক হলে পরের বার আরও দেরিতে আসবে।', 'The rules stay hidden, only the problem shows. Get it fully right and it comes back later next time.')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {due.map((r) => <button key={r.challenge.id} type="button" onClick={() => setOpen({ c: r.challenge, memory: true })} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold shadow-[0_3px_0_#16252D]">{r.challenge.title}</button>)}
                </div>
              </section>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {challenges.map((c) => (
                <button key={c.id} type="button" onClick={() => setOpen({ c, memory: false })} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
                  <span className="text-xs font-bold text-route-deep">{tr(`Level ${bn(c.level)}-এর বিষয়`, `Topic of level ${c.level}`)}</span>
                  <span className="font-display text-lg font-bold">{c.title}</span>
                  <span className="text-sm text-ink-soft">{c.brief}</span>
                  {best[c.id] !== undefined && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(best[c.id]! * 100))}%</span>}
                </button>
              ))}
            </div>
            </>}
          </>
        )}
      </main>
    </AppShell>
  );
}

function Board({ c, memory, onBack }: { c: Challenge; memory: boolean; onBack: () => void }) {
  const record = useProgress((s) => s.recordBuild);
  const recordRebuild = useProgress((s) => s.recordRebuild);
  const [g, setG] = useState<Graph>({ nodes: [{ id: 'n0', kind: 'client' }], edges: [] });
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const [seq, setSeq] = useState(1);
  const [mode, setMode] = useState<'build' | 'chaos' | 'cost'>('build');
  const [down, setDown] = useState<Set<string>>(new Set());
  const [scan, setScan] = useState<{ id: string; breaks: string[] }[] | null>(null);
  const t = useClock(30);

  const pos = useMemo(() => layout(g), [g]);
  // after checking: what each failed rule found, and the parts to outline on the canvas
  const findings = useMemo(() => (checked ? c.rules.map((r, i) => (checked[i] ? [] : r.specs.map((s) => diagnose(g, s)).filter((f): f is Finding => !!f))) : null), [checked, c.rules, g]);
  const marked = useMemo(() => {
    const nodes = new Set<string>(), edges = new Set<string>();
    for (const fs of findings ?? []) for (const f of fs) { f.mark.nodes.forEach((n) => nodes.add(n)); f.mark.edges.forEach(([a, b]) => edges.add(`${a}>${b}`)); }
    return { nodes, edges };
  }, [findings]);
  const [showModel, setShowModel] = useState(false);
  const fix = (f: Finding) => {
    if (!f.apply) return;
    let n = seq;
    const next = applyFix(g, f.apply, () => `n${n++}`);
    setSeq(n); setG(next); play('tap');
    // re-check straight away so the answer stays in view
    const r = c.rules.map((rule) => rule.ok(next));
    setChecked(r); setScan(null);
  };
  const results = useMemo(() => (mode === 'chaos' ? runAll(g, c.id, down) : []), [mode, g, c.id, down]);
  const sla = slaByChallenge[c.id];
  const report = useMemo(() => (mode === 'cost' && sla ? capacityReport(g, c.id, sla) : null), [mode, g, c.id, sla]);
  const label = (id: string) => { const n = g.nodes.find((x) => x.id === id); return n ? PARTS[n.kind].label : id; };

  const changed = () => { setChecked(null); setScan(null); };
  const add = (kind: PartKind) => { setG((x) => ({ ...x, nodes: [...x.nodes, { id: `n${seq}`, kind }] })); setSeq(seq + 1); changed(); play('tap'); };
  const clickNode = (id: string) => {
    if (mode === 'chaos') {
      if (g.nodes.find((n) => n.id === id)?.kind === 'client') return;
      setDown((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      play('tap');
      return;
    }
    if (!sel) { setSel(id); return; }
    if (sel === id) { setSel(null); return; }
    setG((x) => {
      const has = x.edges.some(([a, b]) => a === sel && b === id);
      return { ...x, edges: has ? x.edges.filter(([a, b]) => !(a === sel && b === id)) : [...x.edges, [sel, id]] };
    });
    setSel(null); changed(); play('tap');
  };
  const remove = () => {
    if (!sel || g.nodes.find((n) => n.id === sel)?.kind === 'client') return;
    setG((x) => ({ nodes: x.nodes.filter((n) => n.id !== sel), edges: x.edges.filter(([a, b]) => a !== sel && b !== sel) }));
    setSel(null); changed();
  };
  const check = () => {
    const r = c.rules.map((rule) => rule.ok(g));
    setChecked(r);
    const s = scoreOf(c, g);
    if (memory) recordRebuild(c.id, s); else record(c.id, s);
    play(s === 1 ? 'level' : s >= 0.5 ? 'mission' : 'wrong');
  };
  const switchMode = (m: 'build' | 'chaos' | 'cost') => { setMode(m); setSel(null); setDown(new Set()); setScan(null); };

  /** A dot travelling along a path of node centres, looping. */
  const dot = (path: string[], phase: number, color: string, stopEarly: boolean) => {
    const pts = path.map((id) => pos[id]).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return null;
    const segs = pts.length - 1;
    const u = ((t * 0.45 + phase) % 1) * segs;
    const i = Math.min(segs - 1, Math.floor(u));
    const f = u - i;
    const a = pts[i]!, b = pts[i + 1]!;
    const fade = stopEarly && i === segs - 1 ? Math.max(0, 1 - f * 1.4) : 1;
    return <circle cx={a.x + (b.x - a.x) * f} cy={a.y + (b.y - a.y) * f} r="1.1" fill={color} stroke="#16252D" strokeWidth="0.25" opacity={fade} />;
  };

  const shownRules = memory && !checked;
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">{tr('← সব challenge', '← All challenges')}</button>
      <div>
        <p className="m-0 text-xs font-bold text-route-deep">Architecture builder · Level {bn(c.level)}{memory ? tr(' · না দেখে আঁকা', ' · from memory') : ''}</p>
        <h1 className="m-0 font-display text-[28px] font-extrabold">{c.title}</h1>
        <p className="m-0 mt-1 max-w-[70ch]">{c.brief}</p>
        <details className="mt-2 max-w-[560px]"><summary className="cursor-pointer text-sm font-bold text-route-deep">📖 {tr('বইয়ে পড়ুন', 'Read it in the book')}</summary><BookRefs refs={mode === 'cost' ? [...costRefs, ...(levelRefs[c.level] ?? [])] : levelRefs[c.level]} title="" className="mt-1" /></details>
      </div>
      <div role="tablist" aria-label={tr('Mode', 'Mode')} className="flex flex-wrap gap-2">
        {([['build', tr('আঁকুন', 'Build')], ['chaos', tr('ভাঙুন ও চালান', 'Break it and run')], ['cost', tr('খরচ ও capacity', 'Cost and capacity')]] as const).map(([m, l]) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => switchMode(m)}
            className={`min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink px-4 font-bold ${mode === m ? 'bg-ink text-white' : 'bg-white'}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_270px]">
        {mode !== 'chaos' ? (
          <section aria-label={tr('অংশ', 'Parts')} className="flex flex-wrap content-start gap-2 rounded-[20px] border-[3px] border-ink bg-white p-3 lg:flex-col">
            <span className="w-full text-xs font-bold text-muted">{tr('যোগ করুন', 'Add')}</span>
            {c.palette.filter((k) => k !== 'client').map((k) => (
              <button key={k} type="button" onClick={() => add(k)} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink px-3 text-left text-sm font-semibold" style={{ background: COLOR[k] }}>+ {PARTS[k].label}{mode === 'cost' && <span className="ml-1 font-mono text-xs">${SPEC[k].cost}</span>}</button>
            ))}
            <button type="button" disabled={!sel || g.nodes.find((n) => n.id === sel)?.kind === 'client'} onClick={remove} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-coral px-3 text-sm font-bold text-white disabled:opacity-40">{tr('বাছাই করা অংশ মুছুন', 'Delete the selected part')}</button>
          </section>
        ) : (
          <section aria-label={tr('ভাঙার নিয়ন্ত্রণ', 'Failure controls')} className="flex flex-col gap-2 rounded-[20px] border-[3px] border-ink bg-white p-3 text-sm">
            <p className="m-0 font-semibold">{tr('Canvas-এ যেকোনো অংশে click করে বন্ধ করুন। আবার click করলে চালু।', 'Click any part on the canvas to switch it off. Click again to bring it back.')}</p>
            <button type="button" onClick={() => { setDown(new Set()); }} disabled={!down.size} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-3 font-semibold disabled:opacity-40">{tr('সব আবার চালু', 'Restore everything')}</button>
            <button type="button" onClick={() => { setScan(singlePoints(g, c.id)); play('tap'); }} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-parcel px-3 font-bold shadow-[0_3px_0_#16252D]">{tr('একে একে সব ভেঙে দেখুন', 'Break each part in turn')}</button>
            {scan && (
              <div className="pop-in rounded-xl border-2 border-ink p-2" role="status">
                {scan.length === 0
                  ? <p className="m-0 font-bold text-route-deep">{tr('কোনো একটা অংশ ভাঙলেই জরুরি কাজ বন্ধ হয় না। Single point of failure নেই!', 'No single part stops the critical work. No single point of failure!')}</p>
                  : <>
                      <p className="m-0 font-bold text-coral-deep">{tr(`${bn(scan.length)}টা single point of failure:`, `${scan.length} single points of failure:`)}</p>
                      <ul className="m-0 mt-1 list-disc pl-5">{scan.map((s) => <li key={s.id}><b>{label(s.id)}</b> → {s.breaks.join(', ')} {tr('বন্ধ', 'stops')}</li>)}</ul>
                      <p className="m-0 mt-1 text-xs text-muted">{tr('ঠিক করতে: ওই অংশ জোড়ায় রাখুন, বা queue দিয়ে কাজ জমিয়ে রাখুন।', 'To fix: run that part in pairs, or hold the work in a queue.')}</p>
                    </>}
              </div>
            )}
          </section>
        )}
        <section aria-label="Canvas" className="relative min-w-0 overflow-x-auto rounded-[20px] border-[3px] border-ink bg-[#F7F8F3]">
          <p className="m-0 px-3 pt-2 text-xs text-muted">
            {mode === 'chaos' ? tr('রঙিন বিন্দু = request; লাল ✕ = বন্ধ অংশ', 'Coloured dots are requests; a red ✕ is a part that is down')
              : sel ? tr('এবার যেখানে তীর যাবে সেটায় click করুন (আবার click করলে তীর মুছে যায়)', 'Now click where the arrow should go (clicking again removes it)') : tr('তীর টানতে: আগে উৎস, তারপর গন্তব্যে click', 'To draw an arrow: click the source, then the target')}
          </p>
          <svg viewBox="0 0 100 62" className="block w-full min-w-[480px]" role="img" aria-label={tr(`${bn(g.nodes.length)}টা অংশ, ${bn(g.edges.length)}টা তীর`, `${g.nodes.length} parts, ${g.edges.length} arrows`)}>
            <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#16252D" /></marker></defs>
            {g.edges.map(([a, b]) => {
              const p = pos[a], q = pos[b];
              if (!p || !q) return null;
              const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
              const dead = down.has(a) || down.has(b);
              const bad = mode === 'build' && marked.edges.has(`${a}>${b}`);
              return <line key={`${a}-${b}`} x1={p.x + (dx / len) * 6} y1={p.y + (dy / len) * 3} x2={q.x - (dx / len) * 6.5} y2={q.y - (dy / len) * 3.4} stroke={bad ? '#E0483E' : dead ? '#AAB3A8' : '#16252D'} strokeDasharray={dead ? '1 1' : undefined} strokeWidth={bad ? 0.9 : 0.45} markerEnd="url(#arr)" />;
            })}
            {g.nodes.map((n) => {
              const p = pos[n.id]!;
              const on = sel === n.id;
              const off = down.has(n.id);
              return (
                <g key={n.id} onClick={() => clickNode(n.id)} className="cursor-pointer" role="button" aria-label={`${PARTS[n.kind].label}${off ? tr(' (বন্ধ)', ' (down)') : ''}`} aria-pressed={mode === 'chaos' ? off : on}>
                  <rect x={p.x - 6.5} y={p.y - 3} width="13" height="6" rx="1.4" fill={off ? '#E3E6DF' : COLOR[n.kind]} stroke={on || (mode === 'build' && marked.nodes.has(n.id)) ? '#E0483E' : '#16252D'} strokeWidth={on ? 0.9 : mode === 'build' && marked.nodes.has(n.id) ? 0.8 : 0.45} strokeDasharray={mode === 'build' && marked.nodes.has(n.id) && !on ? '1.2 0.6' : undefined} />
                  <text x={p.x} y={p.y + 0.9} textAnchor="middle" fontSize="1.85" fontWeight="700" fill={off ? '#5D6B66' : '#16252D'}>{PARTS[n.kind].label}</text>
                  {off && <path d={`M${p.x - 2} ${p.y - 2}l4 4M${p.x + 2} ${p.y - 2}l-4 4`} stroke="#E0483E" strokeWidth="0.8" strokeLinecap="round" />}
                  {report && (() => { const tier = report.tiers.find((x) => x.kind === n.kind); if (!tier) return null; const u = Math.round(tier.util * 100); return <text x={p.x} y={p.y + 5.2} textAnchor="middle" fontSize="1.7" fontWeight="800" fill={tier.util >= 1 ? '#9E2A22' : tier.util >= 0.8 ? '#7A4D00' : '#0B5F55'}>{bn(Math.min(u, 999))}%</text>; })()}
                </g>
              );
            })}
            {mode === 'chaos' && results.map((r, i) => [0, 0.33, 0.66].map((ph) => <g key={`${r.flow.id}-${ph}`}>{dot(r.path, ph + i * 0.17, FLOW_COLOR[i % FLOW_COLOR.length]!, r.status === 'down')}</g>))}
          </svg>
        </section>
        {mode === 'build' ? (
          <section aria-label={tr('নিয়ম', 'Rules')} className="flex flex-col gap-2 self-start rounded-[20px] border-[3px] border-ink bg-white p-4">
            <h2 className="m-0 font-display text-lg font-bold">{tr('যা লাগবে', 'Requirements')}</h2>
            {shownRules ? (
              <p className="m-0 rounded-lg bg-[#EDE6F8] px-3 py-2 text-sm">{tr(`${bn(c.rules.length)}টা নিয়ম লুকানো। সমস্যাটা পড়ে মনে করে আঁকুন, তারপর যাচাই।`, `${c.rules.length} rules are hidden. Read the problem, draw from memory, then check.`)}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {c.rules.map((r, i) => (
                  <li key={r.text} className={`flex gap-2 rounded-lg px-2 py-1.5 ${checked ? (checked[i] ? 'bg-route-soft' : 'bg-coral-soft') : 'bg-[#F0F2EC]'}`}>
                    <span className="font-bold">{checked ? (checked[i] ? '✓' : '✕') : bn(i + 1)}</span><span>{r.text}</span>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" onClick={check} className="btn-press mt-1 min-h-[50px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D]">{tr('যাচাই করুন', 'Check')}</button>
            {checked && <p className="m-0 text-center font-mono text-xl font-bold">{bn(checked.filter(Boolean).length)}/{bn(checked.length)}</p>}
            {checked && memory && <p className="m-0 text-center text-sm">{checked.every(Boolean) ? tr('মনে থেকে পুরো ঠিক! পরের বার আরও দেরিতে আসবে।', 'Fully right from memory! It will come back later next time.') : tr('কিছু বাদ গেছে। কাল আবার আসবে।', 'Something was missed. It comes back tomorrow.')}</p>}
          </section>
        ) : mode === 'cost' ? (
          <CostPanel report={report} sla={sla} />
        ) : (
          <section aria-label={tr('Request-এর অবস্থা', 'Request status')} className="flex flex-col gap-2 self-start rounded-[20px] border-[3px] border-ink bg-white p-4" aria-live="polite">
            <h2 className="m-0 font-display text-lg font-bold">{tr('Request-গুলো', 'Requests')}</h2>
            {results.map((r, i) => (
              <div key={r.flow.id} className="flex flex-col gap-1 rounded-xl border-2 border-ink p-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-3 flex-none rounded-full border border-ink" style={{ background: FLOW_COLOR[i % FLOW_COLOR.length] }} />
                  <span className="min-w-0 flex-1 font-bold">{r.flow.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].text}</span>
                </div>
                <p className="m-0 text-xs text-muted">
                  {r.status === 'down' && r.brokenAt ? tr(`${label(r.brokenAt)}-এ এসে আটকে গেল`, `Stopped at ${label(r.brokenAt)}`)
                    : r.status === 'down' ? tr('Design-এ এই request-এর পথই নেই', 'The design has no path for this request')
                    : r.path.map(label).join(' → ')}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
      {mode === 'build' && checked && findings && (
        <Answer c={c} checked={checked} findings={findings} onFix={fix} showModel={showModel} setShowModel={setShowModel} />
      )}
    </div>
  );
}

/** Tier-by-tier positions for a graph on the 100 × 62 canvas. */
function layout(g: Graph) {
  const byTier = new Map<number, string[]>();
  for (const n of g.nodes) { const tier = PARTS[n.kind].tier; byTier.set(tier, [...(byTier.get(tier) ?? []), n.id]); }
  const out: Record<string, { x: number; y: number }> = {};
  for (const [tier, ids] of byTier) ids.forEach((id, i) => { out[id] = { x: 8 + tier * 14, y: ((i + 1) / (ids.length + 1)) * 60 }; });
  return out;
}

/** A read-only drawing of a graph, for the model answer. */
function MiniGraph({ g, label }: { g: Graph; label: string }) {
  const pos = layout(g);
  return (
    <svg viewBox="0 0 100 62" className="block w-full min-w-[480px]" role="img" aria-label={label}>
      <defs><marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0B5F55" /></marker></defs>
      {g.edges.map(([a, b]) => { const p = pos[a]!, q = pos[b]!; const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1; return <line key={`${a}-${b}`} x1={p.x + (dx / len) * 6} y1={p.y + (dy / len) * 3} x2={q.x - (dx / len) * 6.5} y2={q.y - (dy / len) * 3.4} stroke="#0B5F55" strokeWidth="0.4" markerEnd="url(#arr2)" />; })}
      {g.nodes.map((n) => { const p = pos[n.id]!; return <g key={n.id}><rect x={p.x - 6.5} y={p.y - 3} width="13" height="6" rx="1.4" fill={COLOR[n.kind]} stroke="#0B5F55" strokeWidth="0.45" /><text x={p.x} y={p.y + 0.9} textAnchor="middle" fontSize="1.85" fontWeight="700" fill="#16252D">{PARTS[n.kind].label}</text></g>; })}
    </svg>
  );
}

/** After checking: a verdict, then for each failed rule where it breaks, why it matters, and the fix; then a model design. */
function Answer({ c, checked, findings, onFix, showModel, setShowModel }: { c: Challenge; checked: boolean[]; findings: Finding[][]; onFix: (f: Finding) => void; showModel: boolean; setShowModel: (v: boolean) => void }) {
  const passed = checked.filter(Boolean).length;
  const verdict = passed === checked.length ? 'right' : passed >= checked.length - 1 ? 'close' : 'wrong';
  return (
    <section aria-label={tr('উত্তর', 'Answer')} aria-live="polite" className="pop-in flex flex-col gap-3 rounded-[22px] border-[3px] border-ink bg-white p-5">
      <div className={`rounded-xl px-4 py-3 font-display text-xl font-extrabold ${verdict === 'right' ? 'bg-route text-white' : verdict === 'close' ? 'bg-parcel' : 'bg-coral text-white'}`}>
        {verdict === 'right' ? tr('ঠিক! সব নিয়ম পূরণ হয়েছে।', 'Right! Every rule is met.') : verdict === 'close' ? tr(`প্রায় ঠিক: ${bn(checked.length - passed)}টা জিনিস বাকি`, `Almost: ${checked.length - passed} thing left`) : tr(`এখনো ভুল: ${bn(checked.length - passed)}টা নিয়ম ভাঙছে`, `Not yet: ${checked.length - passed} rules broken`)}
      </div>
      {verdict !== 'right' && <p className="m-0 text-sm text-ink-soft">{tr('Canvas-এ লাল দাগ দেওয়া অংশ আর তীরগুলোই সমস্যা।', 'The parts and arrows outlined in red on the canvas are the problem.')}</p>}
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {c.rules.map((r, i) => checked[i] ? null : (
          <li key={r.text} className="rounded-xl border-2 border-coral bg-coral-soft p-3">
            <p className="m-0 font-bold">✕ {r.text}</p>
            {findings[i]!.map((f, j) => (
              <div key={j} className="mt-2 grid gap-1 text-[15px]">
                <p className="m-0"><b>{tr('কোথায়:', 'Where:')}</b> {f.where}</p>
                <p className="m-0"><b>{tr('কী করবেন:', 'What to do:')}</b> {f.fix}</p>
                {f.apply && <button type="button" onClick={() => onFix(f)} className="btn-press mt-1 min-h-10 w-fit cursor-pointer rounded-lg border-2 border-ink bg-white px-3 text-sm font-bold shadow-[0_2px_0_#16252D]">{tr('আমার হয়ে ঠিক করুন', 'Fix it for me')}</button>}
              </div>
            ))}
            <p className="m-0 mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm"><b>{tr('কেন জরুরি:', 'Why it matters:')}</b> {r.why}</p>
          </li>
        ))}
      </ol>
      {verdict === 'right' && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {c.rules.map((r) => <li key={r.text} className="rounded-lg bg-route-soft px-3 py-2"><b>✓ {r.text}</b><br /><span className="text-ink-soft">{r.why}</span></li>)}
        </ul>
      )}
      <div className="rounded-xl border-2 border-dashed border-ink p-3">
        {showModel ? (
          <>
            <p className="m-0 font-bold">{tr('একটা সঠিক design', 'One correct design')}</p>
            <p className="m-0 mt-1 text-sm text-ink-soft">{c.reference.note} {tr('নিয়ম পূরণ করলে অন্য design-ও সমান সঠিক।', 'Any other design that meets every rule is just as right.')}</p>
            <div className="mt-2 overflow-x-auto rounded-lg bg-[#F7F8F3]"><MiniGraph g={referenceGraph(c)} label={tr('Model design', 'Model design')} /></div>
          </>
        ) : <button type="button" onClick={() => setShowModel(true)} className="min-h-10 cursor-pointer rounded-lg border-2 border-ink bg-white px-3 font-semibold">{tr('Model design দেখুন', 'Show a model design')}</button>}
      </div>
    </section>
  );
}

const KIND_LABEL = (k: PartKind) => PARTS[k].label;

/** Monthly cost, per-tier load and the service-level targets for the current design. */
function CostPanel({ report, sla }: { report: ReturnType<typeof capacityReport> | null; sla: (typeof slaByChallenge)[string] | undefined }) {
  if (!report || !sla) return <section className="rounded-[20px] border-[3px] border-ink bg-white p-4">{tr('এই challenge-এর জন্য খরচের হিসাব নেই।', 'No cost model for this challenge.')}</section>;
  const rows: { ok: boolean; label: string; value: string }[] = [
    { ok: report.checks.capacity, label: tr('কোনো অংশ ১০০% পার হয়নি', 'No part above 100%'), value: report.bottleneck ? `${KIND_LABEL(report.bottleneck.kind)} ${bn(Math.round(report.bottleneck.util * 100))}%` : '—' },
    { ok: report.checks.p99, label: `p99 ≤ ${bn(sla.p99)} ms`, value: report.p99 >= 5000 ? tr('timeout', 'timeouts') : `${bn(report.p99)} ms` },
    { ok: report.checks.avail, label: tr(`চালু ≥ ${bn(sla.avail, { grouping: false })}%`, `Uptime ≥ ${sla.avail}%`), value: `${bn(report.avail.toFixed(2), { grouping: false })}%` },
    { ok: report.checks.cost, label: tr(`বাজেট $${bn(sla.budget)}/মাস`, `Budget $${sla.budget}/month`), value: `$${bn(report.cost)}` },
  ];
  return (
    <section aria-label={tr('খরচ ও capacity', 'Cost and capacity')} aria-live="polite" className="flex flex-col gap-2 self-start rounded-[20px] border-[3px] border-ink bg-white p-4">
      <h2 className="m-0 font-display text-lg font-bold">{tr('লক্ষ্য', 'Targets')}</h2>
      <p className="m-0 text-xs text-muted">{tr(`সেকেন্ডে ${bn(sla.rps)} request, ${bn(Math.round(sla.readShare * 100))}% পড়া`, `${sla.rps} requests a second, ${Math.round(sla.readShare * 100)}% reads`)}</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
        {rows.map((r) => (
          <li key={r.label} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${r.ok ? 'bg-route-soft' : 'bg-coral-soft'}`}>
            <span><b>{r.ok ? '✓' : '✕'}</b> {r.label}</span><span className="font-mono font-bold">{r.value}</span>
          </li>
        ))}
      </ul>
      {report.met
        ? <p className="m-0 rounded-lg bg-route px-3 py-2 text-center font-bold text-white">{tr('সব লক্ষ্য পূরণ, বাজেটের মধ্যে!', 'Every target met, within budget!')}</p>
        : <p className="m-0 text-xs text-ink-soft">{!report.checks.capacity ? tr('যে অংশ ১০০%-এর বেশি, সেখানে আরেকটা যোগ করুন।', 'Add another of the part that is over 100%.') : !report.checks.avail ? tr('কোনো একটা অংশ একা: সেটা ভাঙলে সব বন্ধ। জোড়ায় রাখুন।', 'Some part stands alone: if it breaks, everything stops. Pair it.') : !report.checks.p99 ? tr('অংশগুলো খুব ব্যস্ত বা cache নেই: ৭০%-এর নিচে রাখুন, পড়া cache থেকে দিন।', 'Parts are too busy or there is no cache: keep them under 70%, serve reads from a cache.') : tr('বেশি খরচ: কোথায় অংশ দরকারের চেয়ে বেশি?', 'Over budget: where do you have more than you need?')}</p>}
      <h3 className="m-0 mt-1 text-sm font-bold">{tr('প্রতিটা স্তরের চাপ', 'Load per tier')}</h3>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
        {report.tiers.map((t) => (
          <li key={t.kind}>
            <div className="flex justify-between"><span>{KIND_LABEL(t.kind)} × {bn(t.count)}</span><span className="font-mono">{bn(Math.round(t.util * 100))}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E3E6DF]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, t.util * 100)}%`, background: t.util >= 1 ? '#E0483E' : t.util >= 0.7 ? '#FFC02E' : '#0B8A7A' }} /></div>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[11px] text-muted">{tr('দাম আর capacity গোল সংখ্যা, শুধু যুক্তির জন্য।', 'Prices and capacities are round numbers, for reasoning only.')}</p>
    </section>
  );
}
