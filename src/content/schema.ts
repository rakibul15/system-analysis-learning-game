import { z } from 'zod';

/* ---------- traffic engine rules (the simulator behind traffic levels) ---------- */

const hubRule = z.object({ capacity: z.number().int().min(1), serviceSeconds: z.number().positive() });
const outage = z.object({ hub: z.number().int().min(0), downAt: z.number().min(0), upAt: z.number().min(0), warnBefore: z.number().min(0) });

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

/* ---------- questions ---------- */

/** options[0] is always the correct answer; the UI shuffles the order per question. */
export const questionSchema = z.object({
  id: z.string().regex(/^l\d+-[a-z]\d*$/),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  explain: z.string(),
  hint: z.string().optional(),
});
export type Question = z.infer<typeof questionSchema>;

/* ---------- animated lesson ---------- */

export const nodeKinds = ['user', 'server', 'lb', 'db', 'cache', 'cdn', 'queue', 'worker', 'store', 'service', 'bot', 'step', 'clock', 'ring', 'key'] as const;

export const diagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(nodeKinds),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
export type DiagramNode = z.infer<typeof diagramNodeSchema>;

export const lessonStepSchema = z.object({
  text: z.string().min(1),
  /** Nodes that appear from this step on. If no step adds, every node shows from the start. */
  add: z.array(z.string()).optional(),
  hide: z.array(z.string()).optional(),
  /** Bright; everything else dims. */
  focus: z.array(z.string()).optional(),
  down: z.array(z.string()).optional(),
  ok: z.array(z.string()).optional(),
  /** Moving dots: request, key or message going from → to. */
  flow: z.array(z.tuple([z.string(), z.string()])).optional(),
  badges: z.record(z.string(), z.string()).optional(),
  /** The lesson stops here until this is answered. */
  ask: questionSchema.optional(),
});
export type LessonStep = z.infer<typeof lessonStepSchema>;

/* ---------- play step ---------- */

const concept = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), label: z.string().min(1), litAt: z.number().min(0) });

export const trafficPlaySchema = z.object({
  kind: z.literal('traffic'),
  intro: z.object({ kicker: z.string(), heading: z.string(), body: z.string(), rules: z.array(z.string()).min(1).max(4) }),
  rounds: z.object({ demo: trafficRulesSchema, manual: trafficRulesSchema, auto: trafficRulesSchema }),
  concepts: z.array(concept).min(1),
  captions: z.object({
    idle: z.string(), manual: z.string(), manualHubDown: z.string(), manualHubBack: z.string(),
    autoStart: z.string(), autoHubDown: z.string(), autoHubBack: z.string(), afterManual: z.string(), afterAuto: z.string(),
  }),
});
export type TrafficPlay = z.infer<typeof trafficPlaySchema>;

export const missionPlaySchema = z.object({
  kind: z.literal('missions'),
  intro: z.string(),
  missions: z.array(questionSchema).length(3),
});

/* ---------- level ---------- */

export const SIMULATOR_IDS = ['cache', 'estimation', 'ratelimit', 'hashring', 'quorum', 'shortener', 'notify', 'feed', 'chat', 'proximity', 'payment'] as const;
export type SimulatorId = (typeof SIMULATOR_IDS)[number];

export const levelSchema = z
  .object({
    id: z.number().int().min(1).max(30),
    chapter: z.number().int().min(1).max(6),
    title: z.string().min(1),
    concept: z.string().min(1),
    story: z.string().min(1),
    minutes: z.number().int().positive(),
    briefing: z.string().min(1),
    ref: z.object({ label: z.string(), url: z.string().url() }),
    predict: questionSchema,
    nodes: z.array(diagramNodeSchema).min(1),
    steps: z.array(lessonStepSchema).min(4).max(10),
    summary: z.array(z.string()).length(3),
    play: z.discriminatedUnion('kind', [trafficPlaySchema, missionPlaySchema]),
    /** an interactive simulator that replaces the three mission questions in the play step */
    simulator: z.enum(SIMULATOR_IDS).optional(),
    boss: z.array(questionSchema).length(5),
  })
  .superRefine((l, ctx) => {
    const ids = new Set(l.nodes.map((n) => n.id));
    if (ids.size !== l.nodes.length) ctx.addIssue({ code: 'custom', path: ['nodes'], message: 'duplicate node id' });
    l.steps.forEach((s, i) => {
      const refs = [...(s.add ?? []), ...(s.hide ?? []), ...(s.focus ?? []), ...(s.down ?? []), ...(s.ok ?? []), ...(s.flow ?? []).flat(), ...Object.keys(s.badges ?? {})];
      for (const r of refs) if (!ids.has(r)) ctx.addIssue({ code: 'custom', path: ['steps', i], message: `unknown node "${r}"` });
    });
    const asks = l.steps.filter((s) => s.ask).length;
    if (asks !== 2) ctx.addIssue({ code: 'custom', path: ['steps'], message: `lesson needs exactly 2 checkpoints, has ${asks}` });
    if (l.steps[l.steps.length - 1]?.ask) ctx.addIssue({ code: 'custom', path: ['steps'], message: 'last step cannot be a checkpoint' });
  });
export type Level = z.infer<typeof levelSchema>;

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  levels: number[];
  /** Map colours. */
  ground: string;
  accent: string;
}
