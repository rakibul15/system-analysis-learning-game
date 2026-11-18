import { describe, expect, it } from 'vitest';
import { act, advance, createWorld, LIMITS, nextWave, priceOf, retryWave, starsOf, startWave, type World } from './engine';
import { scenarios } from './scenarios';
import type { Action, ToolId } from './types';

const buy = (tool: ToolId): Action => ({ kind: 'buy', tool });
const limit = (rate: number): Action => ({ kind: 'limit', rate });

/** Plays a scenario with the given actions before each wave, until it breaks or is won. */
function play(id: string, plan: Action[][], seed = 1): World {
  const w = createWorld(scenarios[id]!, seed);
  for (let i = 0; i < w.sc.waves.length; i++) {
    for (const a of plan[i] ?? []) act(w, a);
    startWave(w);
    advance(w, 120);
    if (w.phase !== 'cleared') break;
    nextWave(w);
  }
  return w;
}
const outcome = (w: World) => ({ phase: w.phase, wave: w.wave + 1, cause: w.cause?.cause ?? null });

describe('the game engine', () => {
  it('is deterministic: the same seed and actions give the same result', () => {
    const plan = [[], [buy('lb'), buy('server'), buy('server')], [buy('health')]];
    const a = play('lb', plan, 7), b = play('lb', plan, 7);
    expect(a.stats).toEqual(b.stats);
    expect(a.happy).toBe(b.happy);
  });

  it('only sells what can be bought, for what it costs', () => {
    const w = createWorld(scenarios.lb!, 1);
    expect(priceOf(w, 'health')).toBeNull(); // a health check needs a load balancer
    expect(act(w, buy('health'))).toBe(false);
    expect(act(w, buy('limiter'))).toBe(false); // not on offer here
    expect(act(w, buy('lb'))).toBe(true);
    expect(w.coins).toBe(80);
    expect(act(w, buy('server'))).toBe(false); // 100 > 80
    expect(priceOf(w, 'lb')).toBeNull(); // already built
  });

  it('a retry starts the wave again from the design and coins it began with', () => {
    const w = play('lb', [[], [buy('server'), buy('server')]]);
    expect(outcome(w)).toEqual({ phase: 'broken', wave: 2, cause: 'overload' });
    retryWave(w);
    expect(w.phase).toBe('build');
    expect(w.servers).toHaveLength(1);
    expect(w.coins).toBe(350);
    expect(w.happy).toBe(100);
  });
});

describe('level 1: the first rush', () => {
  it('breaks in the evening rush with one server, and with more servers but no load balancer', () => {
    expect(outcome(play('lb', []))).toEqual({ phase: 'broken', wave: 2, cause: 'overload' });
    expect(outcome(play('lb', [[], [buy('server'), buy('server')]]))).toEqual({ phase: 'broken', wave: 2, cause: 'overload' });
  });
  it('gets through the rush with a load balancer and three servers, then breaks when one dies unnoticed', () => {
    expect(outcome(play('lb', [[], [buy('lb'), buy('server'), buy('server')]]))).toEqual({ phase: 'broken', wave: 3, cause: 'dead-server' });
  });
  it('a health check alone is not enough: the rest must carry the load', () => {
    expect(outcome(play('lb', [[], [buy('lb'), buy('server'), buy('server')], [buy('health')]]))).toMatchObject({ phase: 'broken', wave: 3 });
  });
  it('is won with a health check and a spare server, with three stars', () => {
    const w = play('lb', [[], [buy('lb'), buy('server'), buy('server')], [buy('health'), buy('server')]]);
    expect(w.phase).toBe('won');
    expect(starsOf(w)).toBe(3);
  });
});

describe('level 4: the bot flood', () => {
  it('drowns in bots with no limiter, even with another server', () => {
    expect(outcome(play('ratelimit', []))).toEqual({ phase: 'broken', wave: 2, cause: 'overload' });
    expect(outcome(play('ratelimit', [[], [buy('server')]]))).toEqual({ phase: 'broken', wave: 2, cause: 'overload' });
  });
  it('too loose a limit lets the bots through; too strict blocks real customers in the sale', () => {
    expect(outcome(play('ratelimit', [[], [buy('limiter'), limit(16)], [buy('server')]]))).toMatchObject({ phase: 'broken', wave: 2 });
    expect(outcome(play('ratelimit', [[], [buy('limiter'), limit(1)], [buy('server')]]))).toEqual({ phase: 'broken', wave: 3, cause: 'blocked' });
  });
  it('is won with a limit that stops bots but not people, and a server for the sale', () => {
    for (const r of [4, 8]) expect(play('ratelimit', [[], [buy('limiter'), limit(r)], [buy('server')]]).phase, `limit ${r}`).toBe('won');
  });
  it('without the extra server the sale is too much even with a good limit', () => {
    expect(outcome(play('ratelimit', [[], [buy('limiter'), limit(4)]]))).toMatchObject({ phase: 'broken', wave: 3 });
  });
  it('the known solutions win on other seeds too', () => {
    for (const seed of [2, 3, 11, 42]) {
      expect(play('lb', [[], [buy('lb'), buy('server'), buy('server')], [buy('health'), buy('server')]], seed).phase, `lb seed ${seed}`).toBe('won');
      expect(play('ratelimit', [[], [buy('limiter'), limit(4)], [buy('server')]], seed).phase, `rl seed ${seed}`).toBe('won');
    }
  });
  it('the limits on offer are the ones the scenario text talks about', () => {
    expect(LIMITS).toContain(4);
  });
});
