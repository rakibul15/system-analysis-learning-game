import { mulberry32 } from '@/simulators/traffic';
import type { Action, Cause, Scenario, ToolId } from './types';

/*
 * The simulation. Plain TypeScript with no React or DOM, run in fixed steps from a seed, so the same
 * design and the same actions give the same result on any device and in tests.
 *
 * A request is born at a customer (or a bot), travels to the gateway, may be stopped there by the rate
 * limiter, is sent to a server (all to the first one without a load balancer; round robin with one,
 * skipping servers a health check has found dead), waits in that server's queue, and is answered.
 * Each answer moves the customers' happiness: quick answers raise it a little, slow ones lower it,
 * and a lost request (dropped, sent to a dead server, blocked) lowers it a lot. At zero the system
 * breaks and the game stops to ask why.
 */

/** Seconds per simulation step. */
export const STEP = 1 / 30;
/** Seconds a request takes from one point of the board to the next. */
export const TRAVEL = 0.45;
/** Seconds a health check needs to notice that a server is down. */
export const DETECT = 1.5;
/** The rate limits on offer, requests per second per client. */
export const LIMITS = [1, 2, 4, 8, 16] as const;

const GAIN = 0.06, SLOW = 0.6, LOSS = 1.2;

export type Phase = 'build' | 'run' | 'broken' | 'cleared' | 'won';
export type Loss = 'drop' | 'fail' | 'block';

export interface Req { id: number; bot: boolean; client: number; born: number; leg: 'in' | 'out'; t0: number; server: number }
export interface Server { up: boolean; downAt: number | null; queue: { born: number; bot: boolean }[]; carry: number; served: number }
/** A lost request, for the board to show where (the gateway or a server's index). */
export interface Flash { kind: Loss; at: 'gate' | number; t: number; bot: boolean }

interface Build { coins: number; servers: number; lb: boolean; health: boolean; limiter: boolean; limit: number }

export interface World {
  sc: Scenario;
  seed: number;
  rand: () => number;
  /** Index of the current wave. */
  wave: number;
  /** Seconds into the current wave. */
  t: number;
  phase: Phase;
  coins: number;
  /** Customers' happiness, 0–100; each wave starts at 100. */
  happy: number;
  /** Happiness at the end of each wave got through. */
  endHappy: number[];
  servers: Server[];
  lb: boolean;
  health: boolean;
  limiter: boolean;
  limit: number;
  flying: Req[];
  nextId: number;
  rr: number;
  buckets: Map<number, { tokens: number; at: number }>;
  botCarry: number[];
  flashes: Flash[];
  /** Recent losses by cause (decaying), and the server that lost most, to say why it broke. */
  recent: Record<Cause, number>;
  recentServer: number[];
  stats: { served: number; slow: number; dropped: number; failed: number; blockedReal: number; blockedBot: number; botsServed: number };
  cause: { cause: Cause; server: number | null } | null;
  /** The design and coins when the current wave's build began: "try this wave again" goes back here. */
  checkpoint: Build;
  log: { wave: number; t: number; action: Action }[];
}

const emptyStats = (): World['stats'] => ({ served: 0, slow: 0, dropped: 0, failed: 0, blockedReal: 0, blockedBot: 0, botsServed: 0 });
const newServer = (): Server => ({ up: true, downAt: null, queue: [], carry: 0, served: 0 });
const waveRand = (seed: number, wave: number) => mulberry32((seed * 31 + wave * 7919) >>> 0);

export function createWorld(sc: Scenario, seed = 1): World {
  const s = sc.start;
  const w: World = {
    sc, seed, rand: waveRand(seed, 0), wave: 0, t: 0, phase: 'build', coins: sc.budget, happy: 100, endHappy: [],
    servers: Array.from({ length: s.servers }, newServer), lb: s.lb, health: s.health, limiter: s.limiter, limit: 4,
    flying: [], nextId: 1, rr: 0, buckets: new Map(), botCarry: [], flashes: [],
    recent: { overload: 0, 'dead-server': 0, blocked: 0, slow: 0 }, recentServer: [], stats: emptyStats(), cause: null,
    checkpoint: { coins: sc.budget, servers: s.servers, lb: s.lb, health: s.health, limiter: s.limiter, limit: 4 }, log: [],
  };
  return w;
}

/** What a tool costs, or null when it cannot be bought now (not on offer, already built, no room). */
export function priceOf(w: World, tool: ToolId): number | null {
  const cost = w.sc.costs[tool];
  if (cost == null) return null;
  if (tool === 'server' && w.servers.length >= w.sc.maxServers) return null;
  if (tool === 'lb' && w.lb) return null;
  if (tool === 'health' && (w.health || !w.lb)) return null; // a health check is part of a load balancer
  if (tool === 'limiter' && w.limiter) return null;
  return cost;
}

/** Does what the learner asked, if it can be done now. Returns whether it happened. */
export function act(w: World, a: Action): boolean {
  if (w.phase !== 'build' && w.phase !== 'run') return false;
  if (a.kind === 'limit') {
    if (!w.limiter || !LIMITS.includes(a.rate as (typeof LIMITS)[number])) return false;
    w.limit = a.rate;
  } else {
    const price = priceOf(w, a.tool);
    if (price == null || price > w.coins) return false;
    w.coins -= price;
    if (a.tool === 'server') w.servers.push(newServer());
    if (a.tool === 'lb') w.lb = true;
    if (a.tool === 'health') w.health = true;
    if (a.tool === 'limiter') w.limiter = true;
  }
  w.log.push({ wave: w.wave, t: w.phase === 'build' ? 0 : w.t, action: a });
  return true;
}

/** Starts the wave the learner has been preparing for. */
export function startWave(w: World) {
  if (w.phase !== 'build') return;
  w.phase = 'run';
}

/** After a wave got through: on to the next one's build. */
export function nextWave(w: World) {
  if (w.phase !== 'cleared') return;
  beginWave(w, w.wave + 1);
}

/** After a break: the same wave again, from the design and coins it started with. */
export function retryWave(w: World) {
  if (w.phase !== 'broken') return;
  const c = w.checkpoint;
  w.coins = c.coins;
  w.servers = Array.from({ length: c.servers }, newServer);
  w.lb = c.lb; w.health = c.health; w.limiter = c.limiter; w.limit = c.limit;
  w.log = w.log.filter((l) => l.wave < w.wave);
  beginWave(w, w.wave);
}

function beginWave(w: World, wave: number) {
  w.wave = wave; w.t = 0; w.phase = 'build'; w.happy = 100; w.cause = null;
  w.rand = waveRand(w.seed, wave);
  w.flying = []; w.flashes = []; w.buckets = new Map(); w.botCarry = []; w.rr = 0;
  w.recent = { overload: 0, 'dead-server': 0, blocked: 0, slow: 0 }; w.recentServer = [];
  for (const s of w.servers) { s.up = true; s.downAt = null; s.queue = []; s.carry = 0; }
  w.checkpoint = { coins: w.coins, servers: w.servers.length, lb: w.lb, health: w.health, limiter: w.limiter, limit: w.limit };
}

function lose(w: World, bot: boolean, kind: Loss, at: 'gate' | number) {
  w.flashes.push({ kind, at, t: w.t, bot });
  if (kind === 'block') { if (bot) w.stats.blockedBot++; else w.stats.blockedReal++; }
  if (kind === 'drop') w.stats.dropped++;
  if (kind === 'fail') w.stats.failed++;
  const cause: Cause = kind === 'block' ? 'blocked' : kind === 'fail' ? 'dead-server' : 'overload';
  // a bot's lost request costs no patience, but a server drowning in bots is still overload
  if (bot) { if (kind !== 'block') w.recent[cause] += 0.25; return; }
  w.happy = Math.max(0, w.happy - LOSS);
  w.recent[cause] += 1;
  if (typeof at === 'number') w.recentServer[at] = (w.recentServer[at] ?? 0) + 1;
}

/** May this client send another request now? (a token bucket per client) */
function allowed(w: World, client: number): boolean {
  const burst = Math.max(2, w.limit);
  const b = w.buckets.get(client) ?? { tokens: burst, at: w.t };
  b.tokens = Math.min(burst, b.tokens + (w.t - b.at) * w.limit);
  b.at = w.t;
  w.buckets.set(client, b);
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

/** Where the gateway sends a request: a server index, or -1 when there is none to send to. */
function route(w: World): number {
  if (!w.lb) return w.servers.length ? 0 : -1;
  const known = w.servers.map((_, i) => i).filter((i) => {
    const s = w.servers[i]!;
    return !(w.health && !s.up && s.downAt != null && w.t - s.downAt >= DETECT);
  });
  if (!known.length) return -1;
  w.rr = (w.rr + 1) % known.length;
  return known[w.rr]!;
}

/** One step of the simulation. */
export function step(w: World, dt = STEP) {
  if (w.phase !== 'run') return;
  const sc = w.sc, wave = sc.waves[w.wave]!;
  const before = w.t;
  w.t += dt;

  // a server goes down: what it held is lost
  if (wave.crash && before < wave.crash.at && w.t >= wave.crash.at) {
    const s = w.servers[wave.crash.server];
    if (s?.up) {
      s.up = false; s.downAt = w.t;
      for (const q of s.queue) lose(w, q.bot, 'fail', wave.crash.server);
      s.queue = [];
    }
  }

  // new requests: real customers (random, about `real` a second) and bots (steady)
  const born = (bot: boolean, client: number) => w.flying.push({ id: w.nextId++, bot, client, born: w.t, leg: 'in', t0: w.t, server: -1 });
  const expected = wave.real * dt;
  let n = Math.floor(expected);
  if (w.rand() < expected - n) n++;
  for (let i = 0; i < n; i++) born(false, Math.floor(w.rand() * sc.customers));
  if (wave.bots) {
    for (let b = 0; b < wave.bots.count; b++) {
      w.botCarry[b] = (w.botCarry[b] ?? w.rand()) + wave.bots.rate * dt;
      while (w.botCarry[b]! >= 1) { w.botCarry[b]! -= 1; born(true, sc.customers + b); }
    }
  }

  // requests in flight arrive at the gateway, then at a server
  const still: Req[] = [];
  for (const r of w.flying) {
    if (w.t - r.t0 < TRAVEL) { still.push(r); continue; }
    if (r.leg === 'in') {
      if (w.limiter && !allowed(w, r.client)) { lose(w, r.bot, 'block', 'gate'); continue; }
      const to = route(w);
      if (to < 0) { lose(w, r.bot, 'fail', 'gate'); continue; }
      r.leg = 'out'; r.t0 = w.t; r.server = to;
      still.push(r);
      continue;
    }
    const s = w.servers[r.server]!;
    if (!s.up) lose(w, r.bot, 'fail', r.server);
    else if (s.queue.length >= sc.server.queue) lose(w, r.bot, 'drop', r.server);
    else s.queue.push({ born: r.born, bot: r.bot });
  }
  w.flying = still;

  // servers answer, oldest first
  for (const s of w.servers) {
    if (!s.up) continue;
    s.carry += sc.server.capacity * dt;
    while (s.carry >= 1 && s.queue.length) {
      s.carry -= 1;
      const q = s.queue.shift()!;
      s.served++;
      if (q.bot) { w.stats.botsServed++; continue; }
      if (w.t - q.born <= sc.patience) { w.stats.served++; w.happy = Math.min(100, w.happy + GAIN); }
      else { w.stats.slow++; w.happy = Math.max(0, w.happy - SLOW); w.recent.slow += 0.5; }
    }
    if (!s.queue.length) s.carry = Math.min(s.carry, 1); // idle capacity is not saved up
  }

  // recent losses fade over a few seconds; flashes last half a second
  const fade = Math.exp(-dt / 3);
  for (const k of Object.keys(w.recent) as Cause[]) w.recent[k] *= fade;
  w.recentServer = w.recentServer.map((x) => (x ?? 0) * fade);
  if (w.flashes.length) w.flashes = w.flashes.filter((f) => w.t - f.t < 0.5);

  if (w.happy <= 0) {
    w.phase = 'broken';
    const cause = (Object.keys(w.recent) as Cause[]).reduce((a, b) => (w.recent[b] > w.recent[a] ? b : a));
    const worst = w.recentServer.reduce((best, x, i) => ((x ?? 0) > (w.recentServer[best] ?? 0) ? i : best), 0);
    w.cause = { cause, server: cause === 'overload' || cause === 'dead-server' ? worst : null };
    return;
  }
  if (w.t >= wave.duration) {
    w.endHappy.push(w.happy);
    w.coins += wave.reward;
    w.phase = w.wave === sc.waves.length - 1 ? 'won' : 'cleared';
  }
}

/** Runs the simulation for `seconds` (or until the phase changes). */
export function advance(w: World, seconds: number) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps && w.phase === 'run'; i++) step(w);
}

/** 1–3 stars from how happy customers were at the end of each wave. */
export function starsOf(w: World): 0 | 1 | 2 | 3 {
  if (w.phase !== 'won' || !w.endHappy.length) return 0;
  const avg = w.endHappy.reduce((a, b) => a + b, 0) / w.endHappy.length;
  return avg >= 80 ? 3 : avg >= 55 ? 2 : 1;
}

/** A server's queue, 0–1 full. */
export const loadOf = (w: World, i: number) => Math.min(1, (w.servers[i]?.queue.length ?? 0) / w.sc.server.queue);
