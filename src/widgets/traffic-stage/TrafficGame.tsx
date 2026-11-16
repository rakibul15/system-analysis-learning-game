import { useEffect, useRef, useState } from 'react';
import type { TrafficPlay } from '@/content/schema';
import { starsFor, type SimEvent } from '@/simulators/traffic';
import { bn, easeBack } from '@/shared/lib/bn';
import { TrafficStage } from '@/widgets/traffic-stage/TrafficStage';
import { useTrafficRound, type Banner } from '@/widgets/traffic-stage/useTrafficRound';

type Phase = 'intro' | 'count' | 'manual' | 'manualEnd' | 'auto' | 'autoEnd';

/** The traffic round: intro → manual → auto. Calls onComplete with the manual round's stars. */
export function TrafficGame({ play: level, onComplete }: { play: TrafficPlay; onComplete: (stars: 0 | 1 | 2 | 3, score: number) => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [stars, setStars] = useState<0 | 1 | 2 | 3>(0);
  const countFrom = useRef(0);
  const [manual, setManual] = useState<{ stars: 0 | 1 | 2 | 3; score: number }>({ stars: 0, score: 0 });

  const roundName = phase === 'intro' || phase === 'count' ? 'demo' : phase === 'manual' || phase === 'manualEnd' ? 'manual' : 'auto';
  const rules = level.rounds[roundName];
  const isManual = roundName === 'manual';

  const bannerFor = (e: SimEvent): Banner | null => {
    if (roundName === 'demo') return null;
    const name = (i: number) => `Hub ${bn(i + 1)}`;
    if (e.type === 'hubWarning') return { text: `${name(e.hub)} কাঁপছে… কিছু একটা গোলমাল`, tone: 'bad', age: 0 };
    if (e.type === 'hubDown') return isManual
      ? { text: `${name(e.hub)} বন্ধ! অন্য hub-এ পাঠান`, tone: 'bad', age: 0 }
      : { text: `Health check ব্যর্থ: ${name(e.hub)} তালিকা থেকে বাদ`, tone: 'bad', age: 0 };
    if (e.type === 'hubUp') return isManual
      ? { text: `${name(e.hub)} ফিরেছে! আবার ভাগ করুন`, tone: 'good', age: 0 }
      : { text: `Health check পাস: ${name(e.hub)} আবার তালিকায়`, tone: 'good', age: 0 };
    return null;
  };

  const round = useTrafficRound(rules, `${roundName}-${attempt}`, {
    bannerFor,
    onEvent: (e, sim) => {
      if (e.type !== 'ended') return;
      const s = starsFor(sim);
      setEndedAt(performance.now());
      if (roundName === 'manual') {
        setStars(s);
        setManual({ stars: s, score: sim.score });
        setPhase('manualEnd');
        if (s >= 2) round.celebrate();
      } else if (roundName === 'auto') {
        setStars(s);
        setPhase('autoEnd');
        round.celebrate();
      }
    },
  });
  const { sim, fx } = round;

  // count-down 3, 2, 1 over the demo, then the manual round starts
  const countLeft = phase === 'count' ? 3 - (performance.now() - countFrom.current) / 1000 : 0;
  useEffect(() => {
    if (phase === 'count' && countLeft <= 0) {
      setPhase('manual');
      setAttempt((a) => a + 1);
    }
  }, [phase, countLeft]);

  // keyboard: 1, 2… pick a hub; arrows flip the lever
  useEffect(() => {
    if (phase !== 'manual') return;
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key);
      if (k >= 1 && k <= sim.hubs.length) round.pickHub(k - 1);
      if (e.key === 'ArrowUp') round.pickHub(Math.max(0, sim.switchTo - 1));
      if (e.key === 'ArrowDown') round.pickHub(Math.min(sim.hubs.length - 1, sim.switchTo + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, round, sim]);

  const startManual = () => {
    countFrom.current = performance.now();
    setPhase('count');
  };
  const startAuto = () => {
    setPhase('auto');
    setAttempt((a) => a + 1);
  };

  const anyDown = sim.hubs.some((h) => h.down);
  const recovered = sim.rules.outages.some((o) => sim.t >= o.upAt);
  const c = level.captions;
  const caption =
    phase === 'intro' || phase === 'count' ? c.idle
    : phase === 'manual' ? (anyDown ? c.manualHubDown : recovered ? c.manualHubBack : c.manual)
    : phase === 'auto' ? (anyDown ? c.autoHubDown : recovered ? c.autoHubBack : c.autoStart)
    : phase === 'manualEnd' ? c.afterManual
    : c.afterAuto;

  const endAge = (performance.now() - endedAt) / 1000;
  const endTitle =
    phase === 'autoEnd' ? 'Auto controller একই ভিড় সামলাল'
    : sim.status === 'failed' ? 'Customer-রা রেগে গেছে'
    : (['ভিড় জিতে গেল', 'ভিড় জিতে গেল', 'ভালো সামলেছেন!', 'নিখুঁত dispatch!'] as const)[stars];

  return (
    <div className="flex flex-col gap-4">
        <TrafficStage sim={sim} fx={fx} interactive={phase === 'manual'} onPickHub={round.pickHub} showTimer={phase === 'manual' || phase === 'auto'}>
          {phase === 'intro' && (
            <Overlay>
              <Card>
                <p className="m-0 font-bold text-route-deep">{level.intro.kicker}</p>
                <h2 className="mb-[0.3em] mt-[0.1em] font-display text-[2.3em] font-extrabold leading-[1.1]">{level.intro.heading}</h2>
                <p className="mb-[0.9em] mt-0">{level.intro.body}</p>
                <ul className="m-0 mb-[1.1em] flex list-none flex-col gap-[0.35em] p-0 text-left">
                  {level.intro.rules.map((r) => (
                    <li key={r} className="rounded-[10px] bg-[#F0F2EC] px-[0.8em] py-[0.4em]">{r}</li>
                  ))}
                </ul>
                <BigButton onClick={startManual}>খেলা শুরু</BigButton>
                <p className="mb-0 mt-3 text-[0.85em] text-muted">Keyboard: ১ / ২ চাপলেও hub বাছা যায়</p>
              </Card>
            </Overlay>
          )}

          {phase === 'count' && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[rgba(22,37,45,.35)]">
              <div
                className="font-display font-extrabold leading-none text-parcel"
                style={{
                  fontSize: 'max(60px,16cqw)',
                  textShadow: '4px 0 0 #16252D,-4px 0 0 #16252D,0 4px 0 #16252D,0 -4px 0 #16252D,3px 3px 0 #16252D,-3px 3px 0 #16252D,3px -3px 0 #16252D,-3px -3px 0 #16252D,0 10px 0 #16252D',
                  transform: `scale(${(0.7 + (Math.max(0, countLeft) % 1) * 0.6).toFixed(2)})`,
                }}
              >
                {bn(Math.max(1, Math.ceil(countLeft)))}
              </div>
            </div>
          )}

          {(phase === 'manualEnd' || phase === 'autoEnd') && (
            <Overlay>
              <Card style={{ transform: `scale(${easeBack(endAge / 0.4).toFixed(3)})` }}>
                <div className="mb-[0.3em] flex justify-center gap-[0.5em]">
                  {[0, 1, 2].map((i) => (
                    <svg key={i} viewBox="0 0 20 20" aria-hidden="true" style={{ width: '3.2em', height: '3.2em', transform: `scale(${easeBack((endAge - 0.3 - i * 0.22) / 0.35).toFixed(3)}) rotate(${(i - 1) * 10}deg)` }}>
                      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill={i < stars ? '#FFC02E' : '#E3E8DE'} stroke="#16252D" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  ))}
                </div>
                <h2 className="mb-[0.3em] mt-0 font-display text-[2em] font-extrabold leading-[1.15]" style={{ textWrap: 'balance' }}>{endTitle}</h2>
                <p className="sr-only">{bn(stars)}টা তারা</p>
                <div className="mb-[0.7em] flex flex-wrap justify-center gap-[0.6em] font-bold">
                  <span className="rounded-[10px] bg-route-soft px-[0.8em] py-[0.25em] text-route-deep">পৌঁছেছে {bn(sim.delivered)}</span>
                  <span className="rounded-[10px] bg-coral-soft px-[0.8em] py-[0.25em] text-coral-deep">হারিয়েছে {bn(sim.lost)}</span>
                  <span className="rounded-[10px] bg-parcel-soft px-[0.8em] py-[0.25em]">নম্বর {bn(sim.score)}</span>
                </div>
                <p className="mb-[1em] mt-0" style={{ textWrap: 'pretty' }}>{phase === 'autoEnd' ? c.afterAuto : c.afterManual}</p>
                <div className="flex flex-wrap justify-center gap-[0.7em]">
                  {phase === 'manualEnd' && <BigButton onClick={startAuto}>Auto controller লাগান</BigButton>}
                  {phase === 'autoEnd' && <BigButton onClick={() => onComplete(manual.stars, manual.score)}>Boss challenge-এ চলুন →</BigButton>}
                  <button type="button" onClick={startManual} className="btn-press min-h-[50px] cursor-pointer rounded-2xl border-[3px] border-ink bg-white px-[1.2em] font-bold shadow-press">
                    আবার হাতে খেলুন
                  </button>
                </div>
              </Card>
            </Overlay>
          )}
        </TrafficStage>

        <div className="flex flex-wrap items-stretch gap-3.5">
          <p aria-live="polite" className="m-0 min-w-0 flex-[999_1_420px] rounded-2xl border-[2.5px] border-ink bg-white px-4.5 py-3.5 text-[17px] leading-normal">
            {caption}
          </p>
          <ul aria-label="এই খেলায় যা শিখছেন" className="m-0 flex min-w-0 flex-[1_1_320px] list-none flex-wrap items-center gap-2 p-0">
            {level.concepts.map((k) => {
              const lit = phase === 'autoEnd' || (phase === 'auto' && sim.t >= k.litAt);
              return (
                <li
                  key={k.id}
                  className={`rounded-full px-3.5 py-2 text-sm font-bold transition-all duration-300 ${lit ? 'border-[2.5px] border-ink bg-route text-white shadow-[0_3px_0_#16252D]' : 'border-[2.5px] border-dashed border-[#9AA69F] bg-[#EEF1EA] text-locked-ink'}`}
                >
                  {k.label}
                </li>
              );
            })}
          </ul>
        </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 z-10 grid place-items-center bg-[rgba(22,37,45,.5)]">{children}</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="box-border w-[min(90%,600px)] rounded-[22px] border-[3px] border-ink bg-white px-[1.6em] py-[1.3em] text-center shadow-[0_8px_0_#16252D]" style={{ fontSize: 'max(12px,1.35cqw)', ...style }}>
      {children}
    </div>
  );
}

function BigButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="btn-press min-h-[52px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-[1.6em] font-display text-[1.4em] font-extrabold text-ink shadow-[0_5px_0_#16252D]">
      {children}
    </button>
  );
}
