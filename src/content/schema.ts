import { z } from 'zod';

const hubRule = z.object({
  capacity: z.number().int().min(1),
  serviceSeconds: z.number().positive(),
});

const outage = z.object({
  hub: z.number().int().min(0),
  downAt: z.number().min(0),
  upAt: z.number().min(0),
  warnBefore: z.number().min(0),
});

export const trafficRulesSchema = z
  .object({
    durationSeconds: z.number().positive().nullable(),
    spawnInterval: z.object({ start: z.number().positive(), end: z.number().positive() }),
    travelSeconds: z.object({ approach: z.number().positive(), branch: z.number().positive() }),
    hubs: z.array(hubRule).min(1).max(6),
    outages: z.array(outage),
    policy: z.enum(['manual', 'roundRobin']),
    healthCheck: z.boolean(),
    scoring: z.object({
      pointsPerParcel: z.number().int().positive(),
      comboStep: z.number().int().positive(),
      maxMultiplier: z.number().int().min(1),
      happinessLossPerDrop: z.number().min(0).max(100),
    }),
  })
  .superRefine((r, ctx) => {
    r.outages.forEach((o, i) => {
      if (o.hub >= r.hubs.length) ctx.addIssue({ code: 'custom', path: ['outages', i, 'hub'], message: 'no such hub' });
      if (o.upAt <= o.downAt) ctx.addIssue({ code: 'custom', path: ['outages', i, 'upAt'], message: 'upAt must be after downAt' });
    });
  });

/** A "concept chip" that lights up when the auto run shows it working. */
const concept = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  /** Seconds into the auto round when it lights. 0: from the start. */
  litAt: z.number().min(0),
});

export const trafficLevelSchema = z.object({
  id: z.number().int().positive(),
  chapter: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  concept: z.string().min(1),
  estMinutes: z.number().int().positive(),
  intro: z.object({
    kicker: z.string(),
    heading: z.string(),
    body: z.string(),
    rules: z.array(z.string()).min(1).max(4),
  }),
  rounds: z.object({
    /** Plays behind the intro card. */
    demo: trafficRulesSchema,
    /** The player routes by hand. */
    manual: trafficRulesSchema,
    /** Same crowd, the system routes. */
    auto: trafficRulesSchema,
  }),
  concepts: z.array(concept).min(1),
  captions: z.object({
    idle: z.string(),
    manual: z.string(),
    manualHubDown: z.string(),
    manualHubBack: z.string(),
    autoStart: z.string(),
    autoHubDown: z.string(),
    autoHubBack: z.string(),
    afterManual: z.string(),
    afterAuto: z.string(),
  }),
});

export type TrafficLevel = z.infer<typeof trafficLevelSchema>;
