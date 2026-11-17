import { describe, expect, it } from 'vitest';
import type { KnobSpec, State } from './KnobSim';
import * as A from './specsA';
import * as B from './specsB';
import * as C from './specsC';

type Step = Record<string, unknown> | string; // a patch, or an action label

/** Plays a script against a spec the way the UI does, latching missions as they pass. */
function play(spec: KnobSpec<State>, steps: Step[]) {
  let s: State = { ...spec.init };
  const done = spec.missions.map(() => false);
  const check = () => {
    const r = Object.fromEntries(spec.model(s).readings.map((x) => [x.id, x.value]));
    spec.missions.forEach((m, i) => { if (m.ok(s, r)) done[i] = true; });
  };
  check();
  for (const step of steps) {
    if (typeof step === 'string') {
      const a = spec.actions?.find((x) => x.label === step);
      if (!a) throw new Error(`no action "${step}"`);
      s = { ...s, ...(a.run(s) as State) };
    } else s = { ...s, ...(step as State) };
    check();
  }
  return done;
}

const scripts: Record<string, [KnobSpec<State>, Step[]]> = {
  snowflake: [A.snowflake as never, [{ ts: 41, machine: 10 }, { guard: true }, 'NTP: ঘড়ি ৮০০ ms পিছোল']],
  crawler: [A.crawler as never, [{ delay: 1, dedupe: true, workers: 300 }]],
  autocomplete: [A.autocomplete as never, [{ debounce: 200 }, { mode: 'topk' }]],
  video: [A.video as never, [{ net: 'variable', abr: true, r240: true, r480: true, r720: true }, { r1080: false }]],
  filesync: [A.filesync as never, ['দুই ফোনে একসাথে offline বদল', { policy: 'copy' }, 'দুই ফোনে একসাথে offline বদল', { delta: true, block: '1', compress: true }]],
  nearby: [A.nearby as never, [{ fanout: 'near', interval: 10 }]],
  maps: [A.maps as never, [{ algo: 'tiles', live: true }]],
  mq: [A.mq as never, [{ acks: 'all', rf: 3 }, 'Leader broker crash', { commit: 'after' }, 'Consumer crash', { idem: true }, 'Consumer crash']],
  alerting: [A.alerting as never, [{ threshold: 12 }, { forMin: 2 }]],
  stream: [B.stream as never, [{ lateness: 90 }, { lateness: 5, updates: true }]],
  reservation: [B.reservation as never, ['সবাই একসাথে Book', { strategy: 'optimistic', users: 100 }, 'সবাই একসাথে Book']],
  email: [B.email as never, [{ auth: true, warm: true, suppress: true, unsub: true }]],
  objectStore: [B.objectStore as never, [{ scheme: 'ec', coldAfter: 30 }]],
  leaderboard: [B.leaderboard as never, [{ users: 100 }, { store: 'zset' }, { users: 500 }]],
  wallet: [B.wallet as never, ['কাটার পর, জমার আগে crash', { approach: 'saga' }, 'কাটার পর, জমার আগে crash']],
  exchange: [B.exchange as never, [{ engine: 'mem', seq: true, priority: 'time' }, 'একই দামে ৩টা order পাঠান']],
  resilience: [B.resilience as never, [{ breaker: true, outbox: true }]],
  retrystorm: [C.retrystorm as never, [{ retries: 3 }, { edgeOnly: true, jitter: true }, { layers: 4, edgeOnly: false, budget: true, retries: 3 }]],
  overload: [C.overload as never, [{ incoming: 5000 }, { bounded: true }, { priority: true }]],
  interview: [B.interview as never, [{ req: 5, est: 5, hld: 15, deep: 15, wrap: 5, ask: true, trade: true, diagram: true }]],
};

describe('declarative simulators', () => {
  for (const [name, [spec, steps]] of Object.entries(scripts)) {
    it(`${name}: no mission is done at the start, and all three can be done`, () => {
      expect(play(spec, []).every(Boolean)).toBe(false);
      expect(play(spec, steps)).toEqual([true, true, true]);
    });
  }
});
