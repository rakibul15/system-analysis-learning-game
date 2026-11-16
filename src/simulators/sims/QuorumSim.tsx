import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { strongQuorum } from '../lib';
import { ActionButton, SimFrame, Slider, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

const NODES = ['A', 'B', 'C'] as const;
type Node = (typeof NODES)[number];

/**
 * Level 6 · N = 3 replicas, choose W and R. A write lands on W nodes now; the rest
 * catch up only when you press "replicate". Reads take the worst R nodes on purpose,
 * so a read is right only when the quorum guarantees it.
 */
export function QuorumSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [w, setW] = useState(1);
  const [r, setR] = useState(1);
  const [cDown, setCDown] = useState(false);
  const [ver, setVer] = useState<Record<Node, number>>({ A: 1, B: 1, C: 1 });
  const [latest, setLatest] = useState(1);
  const [log, setLog] = useState<{ kind: 'write' | 'read'; ok: boolean; text: string; fresh?: boolean; w: number; r: number; cDown: boolean }[]>([]);

  const alive = NODES.filter((n) => !(n === 'C' && cDown));
  const write = () => {
    if (alive.length < w) { setLog((l) => [{ kind: 'write' as const, ok: false, text: tr(`Write ব্যর্থ: ${bn(w)}টা ack দরকার, চালু আছে ${bn(alive.length)}টা`, `Write failed: needs ${w} acks, only ${alive.length} nodes up`), w, r, cDown }, ...l].slice(0, 6)); return; }
    const v = latest + 1;
    const targets = alive.slice(0, w);
    setVer((old) => { const n = { ...old }; for (const t of targets) n[t] = v; return n; });
    setLatest(v);
    setLog((l) => [{ kind: 'write' as const, ok: true, text: tr(`v${bn(v)} লেখা হল ${targets.join(', ')}-এ (W = ${bn(w)})`, `v${v} written to ${targets.join(', ')} (W = ${w})`), w, r, cDown }, ...l].slice(0, 6));
  };
  const read = () => {
    if (alive.length < r) { setLog((l) => [{ kind: 'read' as const, ok: false, text: tr(`Read ব্যর্থ: ${bn(r)}টা উত্তর দরকার`, `Read failed: needs ${r} answers`), w, r, cDown }, ...l].slice(0, 6)); return; }
    const worst = [...alive].sort((a, b) => ver[a] - ver[b]).slice(0, r);
    const got = Math.max(...worst.map((n) => ver[n]));
    const fresh = got === latest;
    setLog((l) => [{ kind: 'read' as const, ok: true, fresh, text: tr(`Read ${worst.join(', ')} থেকে: পেলাম v${bn(got)} ${fresh ? '(সর্বশেষ)' : `(পুরনো! সর্বশেষ v${bn(latest)})`}`, `Read from ${worst.join(', ')}: got v${got} ${fresh ? '(latest)' : `(stale! latest is v${latest})`}`), w, r, cDown }, ...l].slice(0, 6));
  };
  const replicate = () => setVer((old) => { const n = { ...old }; for (const a of alive) n[a] = latest; return n; });

  const lastRead = log.find((e) => e.kind === 'read' && e.ok);
  const wroteSinceStart = log.some((e) => e.kind === 'write' && e.ok);
  const done = useLatched([
    !!lastRead && lastRead.fresh === false,
    !!lastRead && lastRead.fresh === true && wroteSinceStart && strongQuorum(3, lastRead.w, lastRead.r),
    !!lastRead && lastRead.fresh === true && lastRead.cDown && log.some((e) => e.kind === 'write' && e.ok && e.cDown) && strongQuorum(3, lastRead.w, lastRead.r),
  ]);
  const strong = strongQuorum(3, w, r);
  const metrics: Metric[] = [
    { label: tr('W + R বনাম N', 'W + R vs N'), value: `${bn(w + r)} ${strong ? '>' : '≤'} ${bn(3)}`, tone: strong ? 'good' : 'bad' },
    { label: tr('নিশ্চয়তা', 'Guarantee'), value: strong ? 'Strong' : 'Eventual' },
    { label: tr('সর্বশেষ version', 'Latest version'), value: `v${bn(latest)}` },
  ];

  return (
    <SimFrame
      title={tr('পুরনো data-র রহস্য', 'The stale data mystery')}
      intro={tr('তিনটা node-এ copy (N = ৩)। W আর R বদলে দেখুন কখন read পুরনো মান দেয়। Read ইচ্ছা করে সবচেয়ে পিছিয়ে থাকা node বাছে, যাতে শুধু নিয়মই আপনাকে বাঁচায়।', 'Copies on three nodes (N = 3). Change W and R and see when a read returns an old value. Reads deliberately pick the most lagging nodes, so only the rule can save you.')}
      onFinish={onFinish}
      controls={<>
        <Slider label={tr('W (write-এ কয়টা ack)', 'W (acks per write)')} value={w} min={1} max={3} onChange={setW} />
        <Slider label={tr('R (read-এ কয়টা উত্তর)', 'R (answers per read)')} value={r} min={1} max={3} onChange={setR} />
        <Toggle label={tr('Node C বন্ধ', 'Node C down')} on={cDown} onChange={setCDown} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={write}>Write</ActionButton>
          <ActionButton onClick={read}>Read</ActionButton>
          <ActionButton onClick={replicate}>Replicate</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={tr(`Write যায় ${bn(w)}টা node-এ সাথে সাথে, read আসে ${bn(r)}টা থেকে`, `Writes reach ${w} nodes at once; reads come from ${r}`)} h={30} nodes={[
            { id: 'c', label: 'App', x: 10, y: 15 },
            ...NODES.map((n, i) => ({ id: n, label: `Node ${n}`, x: 86, y: 4.8 + i * 10.2, tone: (n === 'C' && cDown ? 'down' : ver[n] < latest ? 'hot' : 'ok') as 'down' | 'hot' | 'ok' })),
          ]} links={NODES.flatMap((n, i) => {
            const down = n === 'C' && cDown;
            const synced = alive.indexOf(n) > -1 && alive.indexOf(n) < w;
            return [
              { from: 'c', to: n, rate: down ? 0 : synced ? 3 : 0.8, color: synced ? '#0B8A7A' : '#B8730A', secs: synced ? 0.8 : 2.4 },
              ...(i < r && !down ? [{ from: n, to: 'c', rate: 1.2, color: '#2F6FDE' }] : []),
            ];
          })} />
          <div className="grid grid-cols-3 gap-3">
            {NODES.map((n) => {
              const down = n === 'C' && cDown;
              const stale = !down && ver[n] < latest;
              return (
                <div key={n} className={`rounded-2xl border-[3px] p-3 text-center ${down ? 'border-coral bg-coral-soft' : stale ? 'border-parcel bg-parcel-soft' : 'border-route bg-route-soft'}`}>
                  <div className="font-display text-lg font-bold">Node {n}</div>
                  <div className="font-mono text-3xl font-bold">{down ? '✕' : `v${bn(ver[n])}`}</div>
                  <div className="text-xs font-semibold">{down ? tr('বন্ধ', 'down') : stale ? tr('পিছিয়ে', 'behind') : tr('সর্বশেষ', 'latest')}</div>
                </div>
              );
            })}
          </div>
          <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {log.map((e, i) => (
              <li key={log.length - i} className={`pop-in rounded-lg px-3 py-1.5 ${!e.ok ? 'bg-coral-soft' : e.kind === 'read' ? (e.fresh ? 'bg-route-soft' : 'bg-parcel-soft') : 'bg-white'}`}>{e.text}</li>
            ))}
            {!log.length && <li className="text-muted">{tr('Write চাপুন, তারপর Read।', 'Press Write, then Read.')}</li>}
          </ol>
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('এমন W আর R দিন যাতে write-এর পরের read পুরনো মান দেয়', 'Choose W and R so a read after a write returns an old value'), done: done[0]!, hint: tr('W = ১, R = ১: write গেল A-তে, read এল C থেকে।', 'W = 1, R = 1: the write went to A, the read came from C.') },
        { text: tr('W + R > N রেখে write করুন, তারপর read-এ সর্বশেষ মান পান', 'Write with W + R > N, then read the latest value'), done: done[1]! },
        { text: tr('Node C বন্ধ রেখেও write সফল করুন, আর read-এ সর্বশেষ মান পান', 'With node C down, write successfully and read the latest value'), done: done[2]!, hint: tr('দুটো node চালু: W আর R কত হলে দুটোই চলে আর মেলে?', 'Two nodes up: what W and R both work and overlap?') },
      ]}
    />
  );
}
