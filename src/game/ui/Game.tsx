import { useEffect, useRef, useState, type ReactNode } from 'react';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { play } from '@/shared/lib/sound';
import { LIMITS } from '../engine';
import type { Cause, Scenario, ToolId } from '../types';
import { BOTS, CUSTOMERS, GATE, serverAt } from './draw';
import { useGame, type Snap } from './useGame';

const TOOL: Record<ToolId, { name: string; icon: string; note: (sc: Scenario) => string }> = {
  server: { name: 'Server', icon: '🖥️', note: (sc) => tr(`সেকেন্ডে ${bn(sc.server.capacity)}টা request শেষ করে`, `Finishes ${sc.server.capacity} requests a second`) },
  lb: { name: 'Load balancer', icon: '🔀', note: () => tr('Request সব server-এ ভাগ করে দেয়', 'Shares requests out over every server') },
  health: { name: 'Health check', icon: '❤️', note: () => tr('বন্ধ server খুঁজে তালিকা থেকে বাদ দেয়', 'Finds a dead server and drops it from the list') },
  limiter: { name: 'Rate limiter', icon: '🚦', note: () => tr('প্রতিটা client-কে সেকেন্ডে নির্দিষ্ট কয়েকটা request দেয়', 'Lets each client send only so many requests a second') },
};
const BLOCKED: Record<'built' | 'full' | 'needs-lb' | 'coins', string> = {
  built: tr('আছে ✓', 'Built ✓'), full: tr('জায়গা নেই', 'No room'), 'needs-lb': tr('আগে load balancer', 'Load balancer first'), coins: tr('টাকা কম', 'Not enough'),
};
const CAUSE_LINE = (c: Cause, server: number | null) => ({
  overload: tr(`Server ${bn((server ?? 0) + 1)}-এ ভিড় উপচে পড়ছে: request হারিয়ে যাচ্ছে`, `Server ${(server ?? 0) + 1} is overflowing: requests are being lost`),
  'dead-server': tr(`বন্ধ Server ${bn((server ?? 0) + 1)}-এ তখনো request যাচ্ছিল`, `Requests were still going to dead server ${(server ?? 0) + 1}`),
  blocked: tr('Limit-এ আসল customer-রা আটকে যাচ্ছিল', 'The limit was stopping real customers'),
  slow: tr('Queue লম্বা: customer-রা অপেক্ষা করতে করতে বিরক্ত', 'The queues grew long: customers got fed up waiting'),
})[c];

const money = (n: number) => `৳${bn(n, { grouping: false })}`;

/** One game of "ParcelGo বাঁচাও" from the first wave to the last. */
export function Game({ sc, exit }: { sc: Scenario; exit: ReactNode }) {
  const g = useGame(sc);
  const s = g.snap;
  const wave = sc.waves[s.wave]!;
  const [said, setSaid] = useState('');

  // sounds and a line for screen readers when the game changes state
  const prev = useRef(s.phase);
  useEffect(() => {
    if (prev.current === s.phase) return;
    prev.current = s.phase;
    if (s.phase === 'cleared') { play('mission'); setSaid(tr(`ঢেউ ${bn(s.wave + 1)} পার।`, `Wave ${s.wave + 1} done.`)); }
    if (s.phase === 'won') { play('level'); setSaid(tr('ParcelGo টিকে গেল!', 'ParcelGo held!')); }
    if (s.phase === 'broken' && s.cause) { play('wrong'); setSaid(tr('System ভেঙে পড়ল। ', 'The system broke. ') + CAUSE_LINE(s.cause.cause, s.cause.server)); }
    if (s.phase === 'build') setSaid(tr(`ঢেউ ${bn(s.wave + 1)}: ${wave.label}। ${wave.forecast}`, `Wave ${s.wave + 1}: ${wave.label}. ${wave.forecast}`));
  }, [s.phase, s.wave, s.cause, wave.label, wave.forecast]);

  return (
    <div className="keep-light light-board flex flex-col gap-3" data-testid="game">
      <p className="sr-only" role="status">{said}</p>
      <Hud s={s} sc={sc} />
      <Board s={s} sc={sc} canvas={g.canvas} onBuyServer={() => { if (g.buy('server')) play('tap'); }} />
      {s.phase === 'build' && (
        <Panel tone="plain">
          <p className="m-0 text-sm font-bold text-route-deep">{tr(`ঢেউ ${bn(s.wave + 1)}/${bn(sc.waves.length)} আসছে`, `Wave ${s.wave + 1} of ${sc.waves.length} is coming`)}</p>
          <h2 className="m-0 font-display text-2xl font-extrabold">{wave.label}</h2>
          <p className="m-0 mt-1 text-[16px] text-ink-soft">{wave.forecast}</p>
          <p className="m-0 mt-1 text-sm text-muted">{tr('নিচ থেকে যা লাগে কিনুন, তারপর চালান। চলার মাঝেও কেনা যায়।', 'Buy what you need below, then start. You can buy during the wave too.')}</p>
          <button type="button" onClick={g.start} className="btn-press mt-3 min-h-[52px] w-full cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-xl font-extrabold text-night shadow-[0_5px_0_var(--color-shadow)] sm:w-auto sm:px-10">
            ▶ {tr('চালাও', 'Start')}
          </button>
        </Panel>
      )}
      {s.phase === 'run' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{tr(`সামলানো ${bn(s.stats.served)} · দেরি ${bn(s.stats.slow)} · হারানো ${bn(s.stats.dropped + s.stats.failed + s.stats.blockedReal)}`, `Answered ${s.stats.served} · slow ${s.stats.slow} · lost ${s.stats.dropped + s.stats.failed + s.stats.blockedReal}`)}</span>
          {s.stats.blockedBot > 0 && <span className="rounded-md bg-route-soft px-2 py-0.5 font-semibold text-route-deep">{tr(`Bot থামানো ${bn(s.stats.blockedBot)}`, `Bots stopped ${s.stats.blockedBot}`)}</span>}
          <span className="ml-auto flex gap-1" role="group" aria-label={tr('গতি', 'Speed')}>
            {([1, 2] as const).map((v) => (
              <button key={v} type="button" aria-pressed={g.speed === v} onClick={() => g.setSpeed(v)}
                className={`min-h-9 cursor-pointer rounded-lg border-2 border-ink px-3 font-bold ${g.speed === v ? 'bg-ink text-on-ink' : 'bg-surface'}`}>{bn(v)}×</button>
            ))}
          </span>
        </div>
      )}
      {s.phase === 'cleared' && (
        <Panel tone="good">
          <h2 className="m-0 font-display text-2xl font-extrabold">{tr(`ঢেউ ${bn(s.wave + 1)} পার! 🎉`, `Wave ${s.wave + 1} done! 🎉`)}</h2>
          <p className="m-0 mt-1 text-ink-soft">{tr(`Customer-রা ${bn(Math.round(s.happy))}% খুশি। পুরস্কার ${money(wave.reward)}।`, `Customers are ${Math.round(s.happy)}% happy. Reward ${money(wave.reward)}.`)}</p>
          <button type="button" onClick={g.next} className="btn-press mt-3 min-h-[52px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-8 font-display text-xl font-extrabold text-night shadow-[0_5px_0_var(--color-shadow)]">
            {tr('পরের ঢেউ →', 'Next wave →')}
          </button>
        </Panel>
      )}
      {s.phase === 'broken' && s.cause && <Broken key={`${s.wave}-${s.cause.cause}-${s.stats.served}`} sc={sc} cause={s.cause} onRetry={g.retry} onRestart={g.restart} />}
      {s.phase === 'won' && (
        <Panel tone="good">
          <p className="m-0 text-4xl tracking-widest" aria-label={tr(`${bn(s.stars)}টা তারা`, `${s.stars} stars`)}>{'★'.repeat(s.stars)}<span className="text-locked-ink">{'★'.repeat(3 - s.stars)}</span></p>
          <h2 className="m-0 mt-1 font-display text-2xl font-extrabold">{tr('ParcelGo টিকে গেল!', 'ParcelGo held!')}</h2>
          <p className="m-0 mt-1 text-ink-soft">{tr(`প্রতিটা ঢেউয়ের শেষে customer খুশি: ${s.endHappy.map((h) => `${bn(Math.round(h))}%`).join(', ')}।`, `Customers' happiness at the end of each wave: ${s.endHappy.map((h) => `${Math.round(h)}%`).join(', ')}.`)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={g.restart} className="btn-press min-h-12 cursor-pointer rounded-2xl border-[3px] border-ink bg-surface px-6 font-bold shadow-[0_4px_0_var(--color-shadow)]">{tr('আবার খেলুন', 'Play again')}</button>
            {exit}
          </div>
        </Panel>
      )}
      {(s.phase === 'build' || s.phase === 'run') && <Toolbar sc={sc} s={s} g={g} />}
    </div>
  );
}

function Panel({ tone, children }: { tone: 'plain' | 'good' | 'bad'; children: ReactNode }) {
  const bg = tone === 'good' ? 'bg-route-soft' : tone === 'bad' ? 'bg-coral-soft' : 'bg-surface';
  return <section className={`pop-in rounded-[22px] border-[3px] border-ink p-4 shadow-[0_5px_0_var(--color-shadow)] sm:p-5 ${bg}`}>{children}</section>;
}

/** The wave, the customers' happiness and the coins. */
function Hud({ s, sc }: { s: Snap; sc: Scenario }) {
  const wave = sc.waves[s.wave]!;
  const h = Math.round(s.happy);
  const face = h >= 70 ? '😀' : h >= 35 ? '😐' : '😟';
  const color = h >= 70 ? 'bg-route' : h >= 35 ? 'bg-parcel' : 'bg-coral';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="flex-none rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-bold">{tr(`ঢেউ ${bn(s.wave + 1)}/${bn(sc.waves.length)}`, `Wave ${s.wave + 1}/${sc.waves.length}`)}</span>
        <div className="flex min-w-0 flex-1 items-center gap-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={h} aria-label={tr('Customer কতটা খুশি', 'How happy customers are')}>
          <span aria-hidden="true" className="text-xl">{face}</span>
          <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-ink bg-surface">
            <div className={`h-full origin-left ${color}`} style={{ transform: `scaleX(${h / 100})` }} />
          </div>
          <span className="w-10 flex-none text-right font-mono text-sm font-bold">{bn(h)}%</span>
        </div>
        <span className="flex-none rounded-full border-2 border-ink bg-parcel-soft px-3 py-1 font-mono text-sm font-bold" aria-label={tr(`হাতে ${bn(s.coins)} টাকা`, `${s.coins} coins`)}>{money(s.coins)}</span>
      </div>
      {s.phase === 'run' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-locked" aria-hidden="true">
          <div className="h-full origin-left bg-ink" style={{ transform: `scaleX(${Math.min(1, s.t / wave.duration)})` }} />
        </div>
      )}
    </div>
  );
}

/** The board: customers and bots on the left, the gateway in the middle, servers on the right; requests move on the canvas behind. */
function Board({ s, sc, canvas, onBuyServer }: { s: Snap; sc: Scenario; canvas: React.RefObject<HTMLCanvasElement | null>; onBuyServer: () => void }) {
  const wave = sc.waves[s.wave]!;
  const slots = sc.maxServers;
  const at = (p: { x: number; y: number }) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` });
  const culprit = s.phase === 'broken' ? s.cause : null;
  const serverPrice = sc.costs.server;
  const canBuyServer = (s.phase === 'build' || s.phase === 'run') && serverPrice != null && s.servers.length < slots && s.coins >= serverPrice;
  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border-[3px] border-ink bg-ground" style={{ aspectRatio: '16 / 11', minHeight: 260 }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <Node style={at(CUSTOMERS)} className="bg-surface">
        <span className="text-lg" aria-hidden="true">👥</span>
        <span className="text-xs font-bold">Customer</span>
        <span className="font-mono text-[11px] text-muted">{bn(wave.real)}/{tr('সে', 's')}</span>
      </Node>
      {wave.bots && (
        <Node style={at(BOTS)} className="border-coral bg-coral-soft">
          <span className="text-xs font-bold">🤖 Bot × {bn(wave.bots.count)}</span>
          <span className="font-mono text-[11px] text-coral-deep">{tr(`প্রতিটা ${bn(wave.bots.rate)}/সে`, `${wave.bots.rate}/s each`)}</span>
        </Node>
      )}
      <Node style={at(GATE)} className={`bg-surface ${culprit?.cause === 'blocked' ? 'ring-4 ring-coral' : ''}`}>
        <span className="text-xs font-bold">{s.lb ? '🔀 Load balancer' : 'Gateway'}</span>
        {!s.lb && <span className="text-[11px] text-muted">{tr('সব যায় Server ১-এ', 'All to server 1')}</span>}
        {(s.health || s.limiter) && (
          <span className="mt-0.5 flex flex-wrap justify-center gap-1">
            {s.health && <span className="rounded bg-route-soft px-1 text-[10.5px] font-semibold text-route-deep">❤️ Health check</span>}
            {s.limiter && <span className="rounded bg-parcel-soft px-1 text-[10.5px] font-semibold text-parcel-deep">🚦 {tr(`সীমা ${bn(s.limit)}/সে`, `limit ${s.limit}/s`)}</span>}
          </span>
        )}
      </Node>
      {Array.from({ length: slots }, (_, i) => {
        const sv = s.servers[i];
        const style = at(serverAt(i, slots));
        if (!sv) {
          const next = i === s.servers.length;
          return next && canBuyServer ? (
            <button key={i} type="button" onClick={onBuyServer} style={style}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl border-2 border-dashed border-ink bg-surface/80 px-2 py-1 text-xs font-bold">
              + Server {money(serverPrice!)}
            </button>
          ) : <span key={i} style={style} aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-line-strong px-2 py-1 text-[11px] text-line-strong">{tr('খালি', 'empty')}</span>;
        }
        const ring = culprit?.server === i && (culprit.cause === 'overload' || culprit.cause === 'dead-server') ? 'ring-4 ring-coral' : '';
        const unreachable = !s.lb && i > 0;
        return (
          <Node key={i} style={style} className={`${sv.up ? 'bg-surface' : 'border-coral bg-coral-soft'} ${unreachable ? 'opacity-60' : ''} ${ring}`} wide>
            <span className="text-xs font-bold">🖥️ Server {bn(i + 1)}</span>
            {sv.up ? (
              <span className="mt-0.5 block h-2 w-full overflow-hidden rounded-full bg-locked" aria-label={tr(`Queue ${bn(Math.round(sv.load * 100))}% ভরা`, `Queue ${Math.round(sv.load * 100)}% full`)}>
                <span className={`block h-full origin-left ${sv.load > 0.8 ? 'bg-coral' : sv.load > 0.5 ? 'bg-parcel' : 'bg-route'}`} style={{ transform: `scaleX(${Math.max(0.02, sv.load)})` }} />
              </span>
            ) : (
              <span className="text-[11px] font-bold text-coral-deep">{sv.known ? tr('বন্ধ · তালিকার বাইরে', 'down · dropped') : tr('বন্ধ!', 'down!')}</span>
            )}
            {unreachable && <span className="text-[10.5px] text-muted">{tr('কেউ পাঠায় না', 'nothing sent here')}</span>}
          </Node>
        );
      })}
    </div>
  );
}

function Node({ children, style, className = '', wide = false }: { children: ReactNode; style: React.CSSProperties; className?: string; wide?: boolean }) {
  return (
    <div style={style} className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl border-2 border-ink px-2 py-1 text-center leading-tight shadow-[0_2px_0_var(--color-shadow)] ${wide ? 'w-[24%] min-w-[84px]' : 'max-w-[34%]'} ${className}`}>
      {children}
    </div>
  );
}

/** What can be bought, and the rate limit once there is a limiter. */
function Toolbar({ sc, s, g }: { sc: Scenario; s: Snap; g: ReturnType<typeof useGame> }) {
  const tools = (Object.keys(sc.costs) as ToolId[]);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tools.map((t) => {
          const p = g.price(t)!;
          return (
            <button key={t} type="button" disabled={p.blocked != null} onClick={() => { if (g.buy(t)) play('tap'); }}
              className="btn-press flex min-h-[72px] cursor-pointer flex-col items-start justify-center rounded-2xl border-[2.5px] border-ink bg-surface px-3 py-2 text-left font-[inherit] shadow-[0_3px_0_var(--color-shadow)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none">
              <span className="flex w-full items-center justify-between gap-1">
                <span className="font-bold">{TOOL[t].icon} {TOOL[t].name}</span>
                <span className="font-mono text-sm font-bold">{p.blocked ? '' : money(p.cost)}</span>
              </span>
              <span className="text-xs text-muted">{p.blocked ? BLOCKED[p.blocked] : TOOL[t].note(sc)}</span>
            </button>
          );
        })}
      </div>
      {s.limiter && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-ink bg-surface px-3 py-2">
          <span className="text-sm font-bold">🚦 {tr('সীমা: প্রতি client, সেকেন্ডে', 'Limit: per client, per second')}</span>
          <span className="flex gap-1" role="radiogroup" aria-label={tr('Rate limit', 'Rate limit')}>
            {LIMITS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={s.limit === r} onClick={() => g.setLimit(r)}
                className={`min-h-10 min-w-10 cursor-pointer rounded-lg border-2 border-ink px-2 font-mono font-bold ${s.limit === r ? 'bg-ink text-on-ink' : 'bg-surface'}`}>{bn(r)}</button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

/** The system broke: what happened, then the "why" question, then a retry. */
function Broken({ sc, cause, onRetry, onRestart }: { sc: Scenario; cause: { cause: Cause; server: number | null }; onRetry: () => void; onRestart: () => void }) {
  const why = sc.why[cause.cause];
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null || !why;
  return (
    <Panel tone="bad">
      <h2 className="m-0 font-display text-2xl font-extrabold">{tr('System ভেঙে পড়ল', 'The system broke')}</h2>
      <p className="m-0 mt-1 font-semibold text-coral-deep">{CAUSE_LINE(cause.cause, cause.server)}</p>
      {why && (
        <div className="mt-3">
          <p className="m-0 font-bold">{tr('কেন?', 'Why?')} {why.q}</p>
          <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label={why.q}>
            {why.options.map((o, i) => {
              const state = picked === null ? '' : i === why.answer ? 'border-route bg-route-soft' : i === picked ? 'border-coral bg-surface' : 'opacity-60';
              return (
                <button key={o} type="button" role="radio" aria-checked={picked === i} disabled={picked !== null} onClick={() => { setPicked(i); play(i === why.answer ? 'right' : 'wrong'); }}
                  className={`min-h-12 cursor-pointer rounded-xl border-[2.5px] border-ink bg-surface px-3 py-2 text-left font-[inherit] disabled:cursor-default ${state}`}>
                  {o}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className="pop-in m-0 mt-2 rounded-xl bg-surface px-3 py-2 text-[15px]">
              <strong>{picked === why.answer ? tr('ঠিক! ', 'Right! ') : tr('আসলে: ', 'In fact: ')}</strong>{why.explain}
            </p>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!answered} onClick={onRetry} className="btn-press min-h-12 cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold text-night shadow-[0_4px_0_var(--color-shadow)] disabled:cursor-not-allowed disabled:opacity-50">
          {tr('ঠিক করে আবার এই ঢেউ', 'Fix it and try this wave again')}
        </button>
        <button type="button" disabled={!answered} onClick={onRestart} className="min-h-12 cursor-pointer rounded-2xl border-[2.5px] border-ink bg-surface px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-50">{tr('শুরু থেকে', 'From the start')}</button>
      </div>
      {!answered && <p className="m-0 mt-1 text-xs text-muted">{tr('আগে "কেন" প্রশ্নের উত্তর দিন।', 'Answer the "why" first.')}</p>}
    </Panel>
  );
}
