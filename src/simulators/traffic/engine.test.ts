import { describe, expect, it } from 'vitest';
import { createSim, multiplierFor, setSwitch, simulate, starsFor, step } from './engine';
import type { SimState, TrafficRules } from './types';
import { level03 } from '@/content/levels/level-03';
import { trafficLevelSchema } from '@/content/schema';

const { manual, auto } = level03.rounds;

/** A sensible player: send each parcel to the up hub with the shorter queue. */
const smartBot = (sim: SimState) => {
  const options = sim.hubs.map((h, i) => ({ i, ok: !h.down, q: h.queue })).filter((h) => h.ok);
  const best = options.sort((a, b) => a.q - b.q)[0];
  if (best) setSwitch(sim, best.i);
};

describe('traffic engine', () => {
  it('level 3 content passes the schema', () => {
    expect(() => trafficLevelSchema.parse(level03)).not.toThrow();
  });

  it('is deterministic for a seed', () => {
    const a = simulate(manual, smartBot, { seed: 7 });
    const b = simulate(manual, smartBot, { seed: 7 });
    expect(a.score).toBe(b.score);
    expect(a.delivered).toBe(b.delivered);
  });

  it('a player who never touches the lever loses parcels to overflow and the outage', () => {
    const sim = simulate(manual);
    expect(sim.lost).toBeGreaterThan(2);
    expect(starsFor(sim)).toBeLessThanOrEqual(1);
  });

  it('a player who balances and avoids the down hub earns three stars', () => {
    const sim = simulate(manual, smartBot);
    expect(sim.status).toBe('finished');
    expect(sim.lost).toBe(0);
    expect(starsFor(sim)).toBe(3);
  });

  it('round robin with health checks survives the same outage without drops', () => {
    const sim = simulate(auto);
    expect(sim.lost).toBe(0);
    expect(sim.rerouted).toBeGreaterThanOrEqual(0);
    expect(sim.delivered).toBeGreaterThan(10);
  });

  it('round robin without health checks drops parcels into the down hub', () => {
    const sim = simulate({ ...auto, healthCheck: false });
    expect(sim.lost).toBeGreaterThan(0);
  });

  it('sending to a down hub by hand drops the parcel with reason "down"', () => {
    const rules: TrafficRules = { ...manual, outages: [{ hub: 1, downAt: 0, upAt: 99, warnBefore: 0 }] };
    const sim = createSim(rules);
    setSwitch(sim, 1);
    const reasons: string[] = [];
    for (let i = 0; i < 60 * 6; i++) {
      for (const e of step(sim, 1 / 60)) if (e.type === 'dropped') reasons.push(e.reason);
    }
    expect(reasons.length).toBeGreaterThan(0);
    expect(new Set(reasons)).toEqual(new Set(['down']));
  });

  it('warns before an outage, then goes down, then comes back', () => {
    const sim = createSim(manual);
    const seen: string[] = [];
    for (let i = 0; i < 60 * 25; i++) {
      for (const e of step(sim, 1 / 60)) if (e.type.startsWith('hub')) seen.push(e.type);
    }
    expect(seen).toEqual(['hubWarning', 'hubDown', 'hubUp']);
  });

  it('the multiplier grows every comboStep deliveries, up to the cap', () => {
    const base = { rules: manual, combo: 0 };
    expect(multiplierFor(base)).toBe(1);
    expect(multiplierFor({ ...base, combo: 5 })).toBe(2);
    expect(multiplierFor({ ...base, combo: 10 })).toBe(3);
    expect(multiplierFor({ ...base, combo: 40 })).toBe(3);
  });

  it('a round with happiness at zero fails and earns no stars', () => {
    const rules: TrafficRules = { ...manual, scoring: { ...manual.scoring, happinessLossPerDrop: 100 }, hubs: [{ capacity: 1, serviceSeconds: 99 }, { capacity: 1, serviceSeconds: 99 }] };
    const sim = simulate(rules);
    expect(sim.status).toBe('failed');
    expect(starsFor(sim)).toBe(0);
  });

  it('ignores the switch when routing is automatic', () => {
    const sim = createSim(auto);
    setSwitch(sim, 1);
    expect(sim.switchTo).toBe(0);
  });
});
