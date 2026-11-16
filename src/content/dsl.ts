import type { DiagramNode, LessonStep, Level, Question, TrafficPlay } from './schema';
import { nodeKinds } from './schema';

/**
 * Compact authoring format for level content. Question ids are assigned here,
 * so content files never type them. The FIRST option is always the right answer.
 */

/** [prompt, options (first = correct), explain?, hint?] */
export type Q = [prompt: string, options: string[], explain?: string, hint?: string];
/** [id, label, kind, x, y] on a 0–100 stage. */
export type N = [id: string, label: string, kind: (typeof nodeKinds)[number], x: number, y: number];
export type S = Omit<LessonStep, 'ask'> & { ask?: Q };

export interface LevelDef {
  id: number;
  chapter: number;
  title: string;
  concept: string;
  story: string;
  minutes?: number;
  briefing: string;
  ref: Level['ref'];
  predict: Q;
  nodes: N[];
  steps: S[];
  summary: [string, string, string];
  play: TrafficPlay | { kind: 'missions'; intro: string; missions: Q[] };
  boss: Q[];
}

const toQ = (id: string, [prompt, options, explain, hint]: Q, fallback = ''): Question => ({
  id, prompt, options, explain: explain ?? fallback, ...(hint ? { hint } : {}),
});

export function level(def: LevelDef): Level {
  const p = `l${def.id}`;
  let c = 0;
  const steps: LessonStep[] = def.steps.map((s, i) => {
    const { ask, ...rest } = s;
    if (!ask) return rest;
    c += 1;
    // a checkpoint's explanation is what the next step shows
    return { ...rest, ask: toQ(`${p}-c${c}`, ask, def.steps[i + 1]?.text ?? '') };
  });
  const nodes: DiagramNode[] = def.nodes.map(([id, label, kind, x, y]) => ({ id, label, kind, x, y }));
  return {
    id: def.id,
    chapter: def.chapter,
    title: def.title,
    concept: def.concept,
    story: def.story,
    minutes: def.minutes ?? 15,
    briefing: def.briefing,
    ref: def.ref,
    predict: toQ(`${p}-p`, def.predict, 'Lesson-এ ধাপে ধাপে দেখবেন কেন।'),
    nodes,
    steps,
    summary: def.summary,
    play: def.play.kind === 'traffic' ? def.play : { kind: 'missions', intro: def.play.intro, missions: def.play.missions.map((m, i) => toQ(`${p}-m${i + 1}`, m)) },
    boss: def.boss.map((b, i) => toQ(`${p}-b${i + 1}`, b)),
  };
}
