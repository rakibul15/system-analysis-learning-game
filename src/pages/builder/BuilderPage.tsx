import { useMemo, useState } from 'react';
import { challenges, PARTS, scoreOf, type Challenge, type Graph, type PartKind } from '@/features/builder/model';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { AppShell } from '@/shared/ui/AppShell';
import { tr } from '@/shared/lib/i18n';

const COLOR: Record<PartKind, string> = {
  client: '#FFFFFF', cdn: '#C8E6FF', limiter: '#FFD9D4', lb: '#FFE7A8', api: '#BFEBDD', ws: '#BFEBDD',
  cache: '#FFD9A0', queue: '#E3D7F5', worker: '#D7EEC4', db: '#C7D3F5', replica: '#DCE3F8', store: '#E8E8E0', provider: '#F2E1EC',
};

/** Architecture builder: place parts, wire them, and check the design against the brief. */
export function BuilderPage() {
  const best = useProgress((s) => s.builds);
  const [open, setOpen] = useState<Challenge | null>(null);
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1100px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {open ? <Board key={open.id} c={open} onBack={() => setOpen(null)} /> : (
          <>
            <div>
              <p className="m-0 text-sm font-bold text-route-deep">Architecture builder</p>
              <h1 className="m-0 font-display text-[32px] font-extrabold">{tr('নিজে আঁকুন', 'Draw it yourself')}</h1>
              <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('অংশ বসান, তীর টানুন, তারপর যাচাই করুন। প্রতিটা নিয়ম পূরণ হলে নম্বর।', 'Place parts, draw arrows, then check. Every rule you meet scores.')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {challenges.map((c) => (
                <button key={c.id} type="button" onClick={() => setOpen(c)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
                  <span className="text-xs font-bold text-route-deep">{tr(`Level ${bn(c.level)}-এর বিষয়`, `Topic of level ${c.level}`)}</span>
                  <span className="font-display text-lg font-bold">{c.title}</span>
                  <span className="text-sm text-ink-soft">{c.brief}</span>
                  {best[c.id] !== undefined && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(best[c.id]! * 100))}%</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}

function Board({ c, onBack }: { c: Challenge; onBack: () => void }) {
  const record = useProgress((s) => s.recordBuild);
  const [g, setG] = useState<Graph>({ nodes: [{ id: 'n0', kind: 'client' }], edges: [] });
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const [seq, setSeq] = useState(1);

  const pos = useMemo(() => {
    const byTier = new Map<number, string[]>();
    for (const n of g.nodes) { const t = PARTS[n.kind].tier; byTier.set(t, [...(byTier.get(t) ?? []), n.id]); }
    const out: Record<string, { x: number; y: number }> = {};
    for (const [t, ids] of byTier) ids.forEach((id, i) => { out[id] = { x: 8 + t * 14, y: ((i + 1) / (ids.length + 1)) * 60 }; });
    return out;
  }, [g.nodes]);

  const add = (kind: PartKind) => { setG((x) => ({ ...x, nodes: [...x.nodes, { id: `n${seq}`, kind }] })); setSeq(seq + 1); setChecked(null); play('tap'); };
  const clickNode = (id: string) => {
    if (!sel) { setSel(id); return; }
    if (sel === id) { setSel(null); return; }
    setG((x) => {
      const has = x.edges.some(([a, b]) => a === sel && b === id);
      return { ...x, edges: has ? x.edges.filter(([a, b]) => !(a === sel && b === id)) : [...x.edges, [sel, id]] };
    });
    setSel(null); setChecked(null); play('tap');
  };
  const remove = () => {
    if (!sel || g.nodes.find((n) => n.id === sel)?.kind === 'client') return;
    setG((x) => ({ nodes: x.nodes.filter((n) => n.id !== sel), edges: x.edges.filter(([a, b]) => a !== sel && b !== sel) }));
    setSel(null); setChecked(null);
  };
  const check = () => {
    const r = c.rules.map((rule) => rule.ok(g));
    setChecked(r);
    const s = scoreOf(c, g);
    record(c.id, s);
    play(s === 1 ? 'level' : s >= 0.5 ? 'mission' : 'wrong');
  };

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">{tr('← সব challenge', '← All challenges')}</button>
      <div>
        <p className="m-0 text-xs font-bold text-route-deep">Architecture builder · Level {bn(c.level)}</p>
        <h1 className="m-0 font-display text-[28px] font-extrabold">{c.title}</h1>
        <p className="m-0 mt-1 max-w-[70ch]">{c.brief}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[200px_1fr_260px]">
        <section aria-label={tr('অংশ', 'Parts')} className="flex flex-wrap content-start gap-2 rounded-[20px] border-[3px] border-ink bg-white p-3 lg:flex-col">
          <span className="w-full text-xs font-bold text-muted">{tr('যোগ করুন', 'Add')}</span>
          {c.palette.filter((k) => k !== 'client').map((k) => (
            <button key={k} type="button" onClick={() => add(k)} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink px-3 text-left text-sm font-semibold" style={{ background: COLOR[k] }}>+ {PARTS[k].label}</button>
          ))}
          <button type="button" disabled={!sel || g.nodes.find((n) => n.id === sel)?.kind === 'client'} onClick={remove} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-coral px-3 text-sm font-bold text-white disabled:opacity-40">{tr('বাছাই করা অংশ মুছুন', 'Delete the selected part')}</button>
        </section>
        <section aria-label="Canvas" className="relative min-w-0 overflow-x-auto rounded-[20px] border-[3px] border-ink bg-[#F7F8F3]">
          <p className="m-0 px-3 pt-2 text-xs text-muted">{sel ? tr('এবার যেখানে তীর যাবে সেটায় click করুন (আবার click করলে তীর মুছে যায়)', 'Now click where the arrow should go (clicking again removes it)') : tr('তীর টানতে: আগে উৎস, তারপর গন্তব্যে click', 'To draw an arrow: click the source, then the target')}</p>
          <svg viewBox="0 0 100 62" className="block min-w-[560px] w-full" role="img" aria-label={tr(`${bn(g.nodes.length)}টা অংশ, ${bn(g.edges.length)}টা তীর`, `${g.nodes.length} parts, ${g.edges.length} arrows`)}>
            <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#16252D" /></marker></defs>
            {g.edges.map(([a, b]) => {
              const p = pos[a], q = pos[b];
              if (!p || !q) return null;
              const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
              return <line key={`${a}-${b}`} x1={p.x + (dx / len) * 6} y1={p.y + (dy / len) * 3} x2={q.x - (dx / len) * 6.5} y2={q.y - (dy / len) * 3.4} stroke="#16252D" strokeWidth="0.45" markerEnd="url(#arr)" />;
            })}
            {g.nodes.map((n) => {
              const p = pos[n.id]!;
              const on = sel === n.id;
              return (
                <g key={n.id} onClick={() => clickNode(n.id)} className="cursor-pointer" role="button" aria-label={PARTS[n.kind].label} aria-pressed={on}>
                  <rect x={p.x - 6.5} y={p.y - 3} width="13" height="6" rx="1.4" fill={COLOR[n.kind]} stroke={on ? '#E0483E' : '#16252D'} strokeWidth={on ? 0.9 : 0.45} />
                  <text x={p.x} y={p.y + 0.9} textAnchor="middle" fontSize="1.85" fontWeight="700" fill="#16252D">{PARTS[n.kind].label}</text>
                </g>
              );
            })}
          </svg>
        </section>
        <section aria-label={tr('নিয়ম', 'Rules')} className="flex flex-col gap-2 self-start rounded-[20px] border-[3px] border-ink bg-white p-4">
          <h2 className="m-0 font-display text-lg font-bold">{tr('যা লাগবে', 'Requirements')}</h2>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {c.rules.map((r, i) => (
              <li key={r.text} className={`flex gap-2 rounded-lg px-2 py-1.5 ${checked ? (checked[i] ? 'bg-route-soft' : 'bg-coral-soft') : 'bg-[#F0F2EC]'}`}>
                <span className="font-bold">{checked ? (checked[i] ? '✓' : '✕') : bn(i + 1)}</span><span>{r.text}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={check} className="btn-press mt-1 min-h-[50px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D]">{tr('যাচাই করুন', 'Check')}</button>
          {checked && <p className="m-0 text-center font-mono text-xl font-bold">{bn(checked.filter(Boolean).length)}/{bn(checked.length)}</p>}
        </section>
      </div>
    </div>
  );
}
