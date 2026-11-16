import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import type { SimulatorId } from '@/content/schema';
type Sim = LazyExoticComponent<ComponentType<{ onFinish: (done: number) => void }>>;

const pick = <K extends string>(p: Promise<Record<K, ComponentType<{ onFinish: (done: number) => void }>>>, k: K) => p.then((m) => ({ default: m[k] }));

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
};
