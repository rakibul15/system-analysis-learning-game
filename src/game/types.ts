/*
 * "ParcelGo বাঁচাও": the learner keeps ParcelGo standing through waves of traffic by buying
 * the parts of a system (servers, a load balancer, health checks, a rate limiter). The parts are
 * the lesson: a wave breaks what is missing, the game stops and asks why, and the learner fixes
 * the design and tries the wave again.
 */

export type ToolId = 'server' | 'lb' | 'health' | 'limiter';

/** One wave of traffic, with what it throws at the system. */
export interface Wave {
  /** Short name, e.g. "সন্ধ্যার ভিড়". */
  label: string;
  /** What is coming, shown before the wave so the learner can prepare. */
  forecast: string;
  /** Seconds the wave lasts. */
  duration: number;
  /** Real customers' requests per second, spread over all customers. */
  real: number;
  /** Bots, each sending `rate` requests per second. */
  bots?: { count: number; rate: number };
  /** A server goes down `at` seconds into the wave (index into the servers, 0 = the first). */
  crash?: { server: number; at: number };
  /** Coins earned for getting through the wave. */
  reward: number;
}

/** Why the system broke: the kind of loss that drained the customers' patience most at the end. */
export type Cause = 'overload' | 'dead-server' | 'blocked' | 'slow';

/** A question asked after a break: the right option is index `answer`. */
export interface Why {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Scenario {
  id: string;
  /** The game level this scenario belongs to. */
  level: number;
  title: string;
  story: string;
  /** Coins at the start. */
  budget: number;
  /** What is already built. */
  start: { servers: number; lb: boolean; health: boolean; limiter: boolean };
  maxServers: number;
  /** What can be bought, and for how much. */
  costs: Partial<Record<ToolId, number>>;
  server: {
    /** Requests a server finishes per second. */
    capacity: number;
    /** Requests that can wait in a server's queue; more are dropped. */
    queue: number;
  };
  /** Seconds a customer waits before the answer counts as slow. */
  patience: number;
  /** How many real customers share the real traffic (each has its own rate limit bucket). */
  customers: number;
  waves: Wave[];
  /** A question for each way this scenario can break. */
  why: Partial<Record<Cause, Why>>;
}

/** Something the learner does, at a moment of the game (kept for replays and tests). */
export type Action =
  | { kind: 'buy'; tool: ToolId }
  | { kind: 'limit'; rate: number };
