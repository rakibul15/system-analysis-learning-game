/** The study hub and its parts, by URL segment. Kept apart so the router can check a URL without loading the study screens. */
export const PARTS = ['hub', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;
export type Part = (typeof PARTS)[number];
