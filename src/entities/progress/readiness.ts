import { challenges } from '@/features/builder/model';
import { incidents } from '@/features/incident/incidents';
import { levelMeta } from '@/content/meta';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import type { ProgressData } from './store';
import { masteryOf } from './selectors';

const toBn = (n: number) => bn(n, { grouping: false });

export interface ReadinessPart { id: string; label: string; weight: number; score: number; available: boolean; note: string }

const builderCount = challenges.length;
const incidentCount = incidents.length;

/** Interview readiness out of 100, with the plan's weights. Parts not built yet count as 0. */
export function readiness(p: ProgressData): { total: number; parts: ReadinessPart[] } {
  const ids = Object.keys(levelMeta).map(Number);
  const campaign = ids.reduce((s, id) => s + (p.levels[id]?.best ?? 0), 0) / (ids.length * 100);
  const mastered = ids.filter((id) => ['skilled', 'solid'].includes(masteryOf(id, p))).length / ids.length;
  const drillVolume = Math.min(1, p.estimation.attempts / 40);
  const drill = p.estimation.attempts ? (p.estimation.correct / p.estimation.attempts) * drillVolume : 0;
  const recentDesign = p.design.slice(-3);
  const mock = recentDesign.length ? (recentDesign.reduce((s, d) => s + d.score / d.max, 0) / 3) : 0;
  const avgBest = (rec: Record<string, number>, n: number) => Object.values(rec).reduce((a, b) => a + b, 0) / n;
  const builder = challenges.reduce((sum, c) => sum + (p.builds?.[c.id] ?? 0), 0) / builderCount;
  const incident = avgBest(p.incidents ?? {}, incidentCount);
  const parts: ReadinessPart[] = [
    { id: 'campaign', label: tr(`Campaign (${toBn(ids.length)} level)`, `Campaign (${ids.length} levels)`), weight: 30, score: campaign, available: true, note: tr('সব level-এর সেরা নম্বরের গড়', 'Average of your best score on every level') },
    { id: 'mock', label: tr('Mock আর design challenge', 'Mock and design challenge'), weight: 20, score: mock, available: true, note: tr('শেষ ৩টা mock বা design challenge-এর নিজের দেওয়া নম্বর', 'Your own scores on the last 3 mocks or design challenges') },
    { id: 'mastery', label: tr('দখল', 'Mastery'), weight: 15, score: mastered, available: true, note: tr('কতগুলো level "দক্ষ" বা "পাকা"', 'How many levels are "skilled" or "solid"') },
    { id: 'builder', label: 'Architecture builder', weight: 15, score: builder, available: true, note: tr(`${toBn(builderCount)}টা challenge-এর সেরা নম্বরের গড়`, `Average best score over ${builderCount} challenges`) },
    { id: 'drill', label: 'Estimation drill', weight: 10, score: drill, available: true, note: tr('নির্ভুলতা, অন্তত ৪০টা প্রশ্নে পূর্ণ মান', 'Accuracy, full marks after at least 40 questions') },
    { id: 'incident', label: 'Incident mode', weight: 10, score: incident, available: true, note: tr(`${toBn(incidentCount)}টা incident-এর সেরা নম্বরের গড়`, `Average best score over ${incidentCount} incidents`) },
  ];
  const total = parts.reduce((s, x) => s + x.weight * x.score, 0);
  return { total: Math.round(total), parts };
}
