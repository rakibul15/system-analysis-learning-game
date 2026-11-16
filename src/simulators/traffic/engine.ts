import type { SimEvent, SimState, TrafficRules } from './types';

/** Small seeded PRNG so a round can be replayed exactly (tests, replays). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(rules: TrafficRules, seed = 1): SimState {
  if (rules.hubs.length < 1) throw new Error('A traffic level needs at least one hub');
  return {
    rules,
    t: 0,
    status: 'running',
    parcels: [],
    hubs: rules.hubs.map(() => ({ queue: 0, progress: 0, down: false, warning: false })),
    switchTo: 0,
    score: 0,
    combo: 0,
    delivered: 0,
    lost: 0,
    rerouted: 0,
    happiness: 100,
    nextSpawnIn: 0.5,
    nextId: 1,
    rrCursor: -1,
    rand: mulberry32(seed),
  };
}

/** The player's move: point the junction at a hub. Ignored unless routing is manual. */
export function setSwitch(sim: SimState, hub: number): void {
  if (sim.rules.policy !== 'manual' || sim.status !== 'running') return;
  if (hub < 0 || hub >= sim.hubs.length) return;
  sim.switchTo = hub;
}

export function multiplierFor(sim: Pick<SimState, 'combo' | 'rules'>): number {
  const { comboStep, maxMultiplier } = sim.rules.scoring;
  return Math.min(maxMultiplier, 1 + Math.floor(sim.combo / comboStep));
}

/** Stars for a finished round: a failed round earns none; fewer drops earn more. */
export function starsFor(sim: Pick<SimState, 'status' | 'lost'>): 0 | 1 | 2 | 3 {
  if (sim.status === 'failed') return 0;
  if (sim.lost === 0) return 3;
  if (sim.lost <= 2) return 2;
  return 1;
}

function isUp(sim: SimState, hub: number): boolean {
  return !sim.hubs[hub]!.down;
}

/** Round robin: the next hub in turn, skipping down hubs when health checks are on. */
function nextRoundRobin(sim: SimState): number {
  const n = sim.hubs.length;
  for (let k = 1; k <= n; k++) {
    const candidate = (sim.rrCursor + k) % n;
    if (!sim.rules.healthCheck || isUp(sim, candidate)) {
      sim.rrCursor = candidate;
      return candidate;
    }
  }
  sim.rrCursor = (sim.rrCursor + 1) % n;
  return sim.rrCursor;
}

function chooseTarget(sim: SimState): number {
  if (sim.rules.policy === 'manual') return sim.switchTo;
  const target = nextRoundRobin(sim);
  sim.switchTo = target;
  return target;
}

function firstUpHubOtherThan(sim: SimState, hub: number): number | null {
  for (let k = 1; k < sim.hubs.length; k++) {
    const candidate = (hub + k) % sim.hubs.length;
    if (isUp(sim, candidate)) return candidate;
  }
  return null;
}

/** Advance the world by `dt` seconds. Returns what happened, for sound and effects. */
export function step(sim: SimState, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  if (sim.status !== 'running' || dt <= 0) return events;
  const { rules } = sim;
  sim.t += dt;

  // Outages: warn, go down, come back.
  for (const o of rules.outages) {
    const hub = sim.hubs[o.hub];
    if (!hub) continue;
    if (!hub.warning && !hub.down && sim.t >= o.downAt - o.warnBefore && sim.t < o.downAt) {
      hub.warning = true;
      events.push({ type: 'hubWarning', hub: o.hub });
    }
    if (!hub.down && sim.t >= o.downAt && sim.t < o.upAt) {
      hub.down = true;
      hub.warning = false;
      hub.queue = 0;
      hub.progress = 0;
      events.push({ type: 'hubDown', hub: o.hub });
    }
    if (hub.down && sim.t >= o.upAt) {
      hub.down = false;
      events.push({ type: 'hubUp', hub: o.hub });
    }
  }

  // New parcels, arriving faster as the round goes on.
  sim.nextSpawnIn -= dt;
  while (sim.nextSpawnIn <= 0) {
    const k = rules.durationSeconds ? Math.min(1, sim.t / rules.durationSeconds) : 0;
    const { start, end } = rules.spawnInterval;
    sim.nextSpawnIn += start + (end - start) * k;
    sim.parcels.push({ id: sim.nextId++, leg: 'approach', u: 0, target: 0, wobble: sim.rand() * Math.PI * 2 });
  }

  // Move parcels; decide at the junction; arrive at hubs.
  const survivors = [];
  for (const p of sim.parcels) {
    if (p.leg === 'approach') {
      p.u += dt / rules.travelSeconds.approach;
      if (p.u >= 1) {
        p.leg = 'branch';
        p.u = 0;
        p.target = chooseTarget(sim);
      }
      survivors.push(p);
      continue;
    }
    p.u += dt / rules.travelSeconds.branch;
    if (p.u < 1) {
      survivors.push(p);
      continue;
    }
    const hub = sim.hubs[p.target]!;
    if (hub.down && rules.healthCheck) {
      const alt = firstUpHubOtherThan(sim, p.target);
      if (alt !== null) {
        events.push({ type: 'rerouted', from: p.target, to: alt });
        sim.rerouted++;
        p.target = alt;
        p.u = 0.4;
        survivors.push(p);
        continue;
      }
    }
    if (hub.down || hub.queue >= rules.hubs[p.target]!.capacity) {
      sim.lost++;
      sim.combo = 0;
      sim.happiness = Math.max(0, sim.happiness - rules.scoring.happinessLossPerDrop);
      events.push({ type: 'dropped', hub: p.target, reason: hub.down ? 'down' : 'overflow' });
      continue;
    }
    hub.queue++;
    sim.delivered++;
    sim.combo++;
    const multiplier = multiplierFor(sim);
    const points = rules.scoring.pointsPerParcel * multiplier;
    sim.score += points;
    events.push({ type: 'delivered', hub: p.target, points, multiplier });
  }
  sim.parcels = survivors;

  // Hubs work through their queues.
  sim.hubs.forEach((hub, i) => {
    if (hub.down || hub.queue === 0) return;
    hub.progress += dt;
    const need = rules.hubs[i]!.serviceSeconds;
    if (hub.progress >= need) {
      hub.progress -= need;
      hub.queue--;
    }
  });

  if (sim.happiness <= 0) {
    sim.status = 'failed';
    events.push({ type: 'ended', status: 'failed' });
  } else if (rules.durationSeconds !== null && sim.t >= rules.durationSeconds) {
    sim.status = 'finished';
    events.push({ type: 'ended', status: 'finished' });
  }
  return events;
}

/** Run a whole round headless with a bot deciding the switch. Used by tests and balancing. */
export function simulate(
  rules: TrafficRules,
  bot: (sim: SimState) => void = () => {},
  { seed = 1, dt = 1 / 60, maxSeconds = 600 } = {},
): SimState {
  const sim = createSim(rules, seed);
  while (sim.status === 'running' && sim.t < maxSeconds) {
    bot(sim);
    step(sim, dt);
  }
  return sim;
}
