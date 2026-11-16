import { trafficLevelSchema, type TrafficLevel } from '../schema';
import { level03 } from './level-03';

/** Playable levels, checked against the schema when the app loads. */
export const levels: Record<number, TrafficLevel> = Object.fromEntries(
  [level03].map((l) => [l.id, trafficLevelSchema.parse(l)]),
);

export interface MapStop {
  id: number;
  num: string;
  name: string;
  concept: string;
  desc: string;
  /** Position on the 1600×900 city map. */
  x: number;
  y: number;
  /** Must be finished before this stop opens. */
  requires: number | null;
}

/** Chapter ১ on the city map. Only levels in `levels` are playable yet. */
export const chapterOneStops: MapStop[] = [
  { id: 1, num: '১', name: 'প্রথম দোকান', concept: 'Single server', x: 224, y: 702, requires: null,
    desc: 'একটা server-এই web, database, সব। শুরু করা সহজ, কিন্তু ওটা পড়ে গেলে পুরো দোকান বন্ধ।' },
  { id: 2, num: '২', name: 'আলাদা গুদাম', concept: 'Database tier', x: 544, y: 522, requires: null,
    desc: 'Web আর database আলাদা বাড়িতে গেলে দুটোকে আলাদাভাবে বড় করা যায়।' },
  { id: 3, num: '৩', name: 'Traffic controller', concept: 'Load balancer', x: 896, y: 576, requires: null,
    desc: 'দুইটা hub, একটা দরজা। ভিড়ের সময় আপনি নিজে parcel ভাগ করবেন, তারপর দেখবেন load balancer কীভাবে সেটা নিজে করে।' },
  { id: 4, num: '৪', name: 'দ্রুত তাক', concept: 'Cache', x: 1184, y: 342, requires: 3,
    desc: 'বারবার চাওয়া জিনিস হাতের কাছের তাকে রাখলে গুদামে দৌড়াতে হয় না।' },
];
