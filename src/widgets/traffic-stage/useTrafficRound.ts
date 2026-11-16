import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createSim, setSwitch, step, type SimEvent, type SimState, type TrafficRules } from '@/simulators/traffic';

export interface Floater { id: number; x: number; y: number; text: string; tone: 'good' | 'combo' | 'bad' | 'info'; age: number }
export interface Confetti { id: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string }
export interface Banner { text: string; tone: 'bad' | 'good'; age: number }

export interface RoundFx {
  floaters: Floater[];
  confetti: Confetti[];
  banner: Banner | null;
  /** 0–1, decays: screen shake strength. */
  shake: number;
  /** 0–1, decays: combo chip pulse. */
  comboPulse: number;
  /** Per hub 0–1, decays: squash when a parcel lands. */
  hubBump: number[];
  /** Score shown, eased toward the real score. */
  shownScore: number;
  clock: number;
}

export const hubY = (i: number, n: number) => (n === 1 ? 50 : 24 + (52 * i) / (n - 1));

const CONFETTI = ['#FFC02E', '#0B8A7A', '#E0483E', '#2F6FDE', '#FFFFFF'];

export interface RoundCallbacks {
  onEvent?: (e: SimEvent, sim: SimState) => void;
  bannerFor?: (e: SimEvent) => Banner | null;
}

/**
 * Runs one round of the traffic engine on requestAnimationFrame and keeps the
 * short-lived effects (floating points, shake, banners, confetti) beside it.
 */
export function useTrafficRound(rules: TrafficRules, roundKey: string, callbacks: RoundCallbacks = {}) {
  const simRef = useRef<SimState>(createSim(rules));
  const fxRef = useRef<RoundFx>(freshFx(rules.hubs.length));
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const nextFxId = useRef(1);

  useEffect(() => {
    simRef.current = createSim(rules, Date.now() % 100000);
    fxRef.current = freshFx(rules.hubs.length);
    let last = 0;
    let raf = 0;
    const loop = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      advance(dt);
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // a new round starts whenever the key changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  function advance(dt: number) {
    const sim = simRef.current;
    const fx = fxRef.current;
    const n = sim.hubs.length;
    fx.clock += dt;
    fx.shake *= Math.exp(-dt * 7);
    fx.comboPulse *= Math.exp(-dt * 6);
    fx.hubBump = fx.hubBump.map((b) => b * Math.exp(-dt * 7));
    fx.shownScore += (sim.score - fx.shownScore) * Math.min(1, dt * 10);
    fx.floaters = fx.floaters.filter((f) => (f.age += dt) < 1);
    fx.confetti = fx.confetti.filter((c) => {
      c.vy += 150 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      return c.y < 112;
    });
    if (fx.banner) {
      fx.banner.age += dt;
      if (fx.banner.age > 2.6) fx.banner = null;
    }
    for (const e of step(sim, dt)) {
      const y = 'hub' in e ? hubY(e.hub, n) : 50;
      if (e.type === 'delivered') {
        fx.hubBump[e.hub] = 1;
        fx.comboPulse = 1;
        float(73, y, '+' + toBn(e.points), e.multiplier > 1 ? 'combo' : 'good');
      } else if (e.type === 'dropped') {
        fx.shake = 1;
        float(73, y, e.reason === 'down' ? 'হারিয়ে গেল!' : 'উপচে পড়ল!', 'bad');
      } else if (e.type === 'rerouted') {
        float(70, hubY(e.from, n), 'retry →', 'info');
      } else if (e.type === 'hubDown') {
        fx.shake = 1;
      }
      const banner = cbRef.current.bannerFor?.(e);
      if (banner) fx.banner = banner;
      cbRef.current.onEvent?.(e, sim);
    }
  }

  function float(x: number, y: number, text: string, tone: Floater['tone']) {
    fxRef.current.floaters.push({ id: nextFxId.current++, x, y, text, tone, age: 0 });
  }

  const celebrate = useCallback(() => {
    for (let i = 0; i < 44; i++) {
      fxRef.current.confetti.push({
        id: nextFxId.current++, x: 50, y: 34,
        vx: (Math.random() - 0.5) * 110, vy: -30 - Math.random() * 70,
        rot: Math.random() * 360, vr: (Math.random() - 0.5) * 900,
        color: CONFETTI[i % CONFETTI.length]!,
      });
    }
  }, []);

  const pickHub = useCallback((hub: number) => setSwitch(simRef.current, hub), []);

  return { sim: simRef.current, fx: fxRef.current, pickHub, celebrate };
}

function freshFx(hubs: number): RoundFx {
  return { floaters: [], confetti: [], banner: null, shake: 0, comboPulse: 0, hubBump: Array(hubs).fill(0), shownScore: 0, clock: 0 };
}

const toBn = (n: number) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!);
