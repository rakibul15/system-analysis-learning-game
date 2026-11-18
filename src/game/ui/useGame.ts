import { useCallback, useEffect, useRef, useState } from 'react';
import { act, createWorld, DETECT, loadOf, nextWave, retryWave, starsOf, startWave, step, STEP, type Phase, type World } from '../engine';
import type { Cause, Scenario, ToolId } from '../types';
import { drawBoard } from './draw';

/** What the screen shows of the world, refreshed a few times a second while a wave runs. */
export interface Snap {
  phase: Phase;
  wave: number;
  t: number;
  coins: number;
  happy: number;
  servers: { up: boolean; known: boolean; load: number; served: number }[];
  lb: boolean;
  health: boolean;
  limiter: boolean;
  limit: number;
  cause: { cause: Cause; server: number | null } | null;
  stars: 0 | 1 | 2 | 3;
  endHappy: number[];
  stats: World['stats'];
}

const snapOf = (w: World): Snap => ({
  phase: w.phase, wave: w.wave, t: w.t, coins: w.coins, happy: w.happy,
  servers: w.servers.map((s, i) => ({ up: s.up, known: !(w.health && !s.up && s.downAt != null && w.t - s.downAt >= DETECT), load: loadOf(w, i), served: s.served })),
  lb: w.lb, health: w.health, limiter: w.limiter, limit: w.limit, cause: w.cause, stars: starsOf(w), endHappy: [...w.endHappy], stats: { ...w.stats },
});

/** End-to-end builds only: a test can speed the game up (localStorage['e2e-game-speed']). */
const testSpeed = () => {
  if (import.meta.env.VITE_E2E !== '1') return 1;
  try { return Number(localStorage.getItem('e2e-game-speed')) || 1; } catch { return 1; }
};

/**
 * Owns one game: the world (outside React, so a frame never re-renders anything), the loop that runs
 * it only while a wave is on, the canvas it draws, and a snapshot for the rest of the screen.
 */
export function useGame(sc: Scenario, seed = 1) {
  const world = useRef<World>(createWorld(sc, seed));
  const canvas = useRef<HTMLCanvasElement>(null);
  const [snap, setSnap] = useState<Snap>(() => snapOf(world.current));
  const [speed, setSpeed] = useState<1 | 2>(1);
  const refresh = useCallback(() => setSnap(snapOf(world.current)), []);

  useEffect(() => {
    const w = world.current;
    drawBoard(canvas.current, w);
    if (snap.phase !== 'run') return;
    let raf = 0, last = 0, acc = 0, shown = 0;
    const fast = testSpeed();
    const tick = (ts: number) => {
      // a long gap (a hidden tab) does not fast-forward the game
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      acc += dt * speed * fast;
      for (let n = 0; acc >= STEP && n < 90 && w.phase === 'run'; n++) { step(w); acc -= STEP; }
      drawBoard(canvas.current, w);
      if (w.phase !== 'run' || ts - shown > 120) { shown = ts; refresh(); }
      if (w.phase === 'run') raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [snap.phase, speed, refresh]);

  // the board's size can change (a phone turned sideways): draw it again
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawBoard(c, world.current));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const run = (f: (w: World) => unknown) => () => { f(world.current); refresh(); };
  return {
    snap, canvas, speed, setSpeed,
    buy: (tool: ToolId) => { const ok = act(world.current, { kind: 'buy', tool }); refresh(); return ok; },
    setLimit: (rate: number) => { act(world.current, { kind: 'limit', rate }); refresh(); },
    start: run(startWave),
    next: run(nextWave),
    retry: run(retryWave),
    restart: () => { world.current = createWorld(sc, seed); refresh(); },
    price: (tool: ToolId) => {
      const w = world.current;
      const cost = w.sc.costs[tool];
      if (cost == null) return null;
      return { cost, ...(priceReason(w, tool)) };
    },
  };
}

/** Why a tool cannot be bought now, if it cannot. */
function priceReason(w: World, tool: ToolId): { blocked: 'built' | 'full' | 'needs-lb' | 'coins' | null } {
  if (tool === 'lb' && w.lb) return { blocked: 'built' };
  if (tool === 'health' && w.health) return { blocked: 'built' };
  if (tool === 'limiter' && w.limiter) return { blocked: 'built' };
  if (tool === 'health' && !w.lb) return { blocked: 'needs-lb' };
  if (tool === 'server' && w.servers.length >= w.sc.maxServers) return { blocked: 'full' };
  if ((w.sc.costs[tool] ?? 0) > w.coins) return { blocked: 'coins' };
  return { blocked: null };
}
