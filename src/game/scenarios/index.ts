import type { Scenario } from '../types';
import { lbScenario } from './lb';
import { rateLimitScenario } from './ratelimit';

/** The scenarios built so far, by id. */
export const scenarios: Record<string, Scenario> = { lb: lbScenario, ratelimit: rateLimitScenario };
