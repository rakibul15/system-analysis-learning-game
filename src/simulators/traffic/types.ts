/**
 * Traffic engine: the one simulation every "traffic" level is built on.
 * A level changes only the rules (how many hubs, how fast parcels arrive,
 * which hub breaks when, and who routes: the player or a policy).
 */

/** Who decides where a parcel goes at the junction. */
export type RoutingPolicy = 'manual' | 'roundRobin';

export interface HubRule {
  /** Parcels a hub can hold at once. One more and it overflows. */
  capacity: number;
  /** Seconds a hub needs to finish one parcel. */
  serviceSeconds: number;
}

/** A hub going down and coming back, in seconds from the start. */
export interface Outage {
  hub: number;
  downAt: number;
  upAt: number;
  /** Seconds of visible shaking before it goes down. */
  warnBefore: number;
}

export interface TrafficRules {
  /** Round length in seconds. `null`: runs until stopped (a background demo). */
  durationSeconds: number | null;
  /** Seconds between new parcels, eased from `start` to `end` over the round. */
  spawnInterval: { start: number; end: number };
  /** Seconds a parcel spends on the shared road and on a branch. */
  travelSeconds: { approach: number; branch: number };
  hubs: HubRule[];
  outages: Outage[];
  policy: RoutingPolicy;
  /** Health check: down hubs are skipped and parcels on the way are re-routed. */
  healthCheck: boolean;
  scoring: {
    pointsPerParcel: number;
    /** Every this many deliveries in a row adds one to the multiplier. */
    comboStep: number;
    maxMultiplier: number;
    /** Customer happiness (0–100) lost per dropped parcel; 0 ends the round. */
    happinessLossPerDrop: number;
  };
}

export type ParcelLeg = 'approach' | 'branch';

export interface Parcel {
  id: number;
  leg: ParcelLeg;
  /** Progress along the current leg, 0 → 1. */
  u: number;
  /** Hub index; set at the junction. */
  target: number;
  /** Per-parcel random phase, for the wobble animation. */
  wobble: number;
}

export interface HubState {
  queue: number;
  progress: number;
  down: boolean;
  warning: boolean;
}

export type SimStatus = 'running' | 'finished' | 'failed';

export interface SimState {
  rules: TrafficRules;
  t: number;
  status: SimStatus;
  parcels: Parcel[];
  hubs: HubState[];
  /** The junction switch: which hub the next parcel goes to. */
  switchTo: number;
  score: number;
  combo: number;
  delivered: number;
  lost: number;
  rerouted: number;
  happiness: number;
  nextSpawnIn: number;
  nextId: number;
  rrCursor: number;
  rand: () => number;
}

export type SimEvent =
  | { type: 'delivered'; hub: number; points: number; multiplier: number }
  | { type: 'dropped'; hub: number; reason: 'down' | 'overflow' }
  | { type: 'rerouted'; from: number; to: number }
  | { type: 'hubWarning'; hub: number }
  | { type: 'hubDown'; hub: number }
  | { type: 'hubUp'; hub: number }
  | { type: 'ended'; status: Exclude<SimStatus, 'running'> };
