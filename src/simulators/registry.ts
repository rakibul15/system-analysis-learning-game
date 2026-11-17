import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { KnobSpec, State } from './knob/KnobSim';

import type { SimulatorId } from '@/content/schema';
type Sim = LazyExoticComponent<ComponentType<{ onFinish: (done: number) => void }>>;

const pick = <K extends string>(p: Promise<Record<K, ComponentType<{ onFinish: (done: number) => void }>>>, k: K) => p.then((m) => ({ default: m[k] }));

type SimProps = { onFinish: (done: number) => void };
/** Wraps a declarative spec from a lazily loaded module into a simulator component. */
const knob = (load: () => Promise<Record<string, unknown>>, key: string) =>
  lazy(async () => {
    const [m, { KnobSim }] = await Promise.all([load(), import('./knob/KnobSim')]);
    const spec = m[key] as KnobSpec<State>;
    return { default: (p: SimProps) => createElement(KnobSim, { spec, onFinish: p.onFinish }) };
  });
const A = () => import('./knob/specsA');
const B = () => import('./knob/specsB');
const C = () => import('./knob/specsC');

/** Each simulator is its own chunk, loaded when its level reaches the play step. */
export const simulators: Record<SimulatorId, Sim> = {
  cache: lazy(() => pick(import('./sims/CacheSim'), 'CacheSim')),
  estimation: lazy(() => pick(import('./sims/EstimationSim'), 'EstimationSim')),
  ratelimit: lazy(() => pick(import('./sims/RateLimitSim'), 'RateLimitSim')),
  hashring: lazy(() => pick(import('./sims/HashRingSim'), 'HashRingSim')),
  quorum: lazy(() => pick(import('./sims/QuorumSim'), 'QuorumSim')),
  shortener: lazy(() => pick(import('./sims/ShortenerSim'), 'ShortenerSim')),
  notify: lazy(() => pick(import('./sims/NotifySim'), 'NotifySim')),
  feed: lazy(() => pick(import('./sims/FeedSim'), 'FeedSim')),
  chat: lazy(() => pick(import('./sims/ChatSim'), 'ChatSim')),
  proximity: lazy(() => pick(import('./sims/ProximitySim'), 'ProximitySim')),
  payment: lazy(() => pick(import('./sims/PaymentSim'), 'PaymentSim')),
  snowflake: knob(A, 'snowflake'),
  crawler: knob(A, 'crawler'),
  autocomplete: knob(A, 'autocomplete'),
  video: knob(A, 'video'),
  filesync: knob(A, 'filesync'),
  nearby: knob(A, 'nearby'),
  maps: knob(A, 'maps'),
  mq: knob(A, 'mq'),
  alerting: knob(A, 'alerting'),
  stream: knob(B, 'stream'),
  reservation: knob(B, 'reservation'),
  email: knob(B, 'email'),
  objectStore: knob(B, 'objectStore'),
  leaderboard: knob(B, 'leaderboard'),
  wallet: knob(B, 'wallet'),
  exchange: knob(B, 'exchange'),
  resilience: knob(B, 'resilience'),
  retrystorm: knob(C, 'retrystorm'),
  overload: knob(C, 'overload'),
  interview: knob(B, 'interview'),
};
