import { tr } from '@/shared/lib/i18n';

/** The study pages (reference) each level links to. */
export const refs = {
  p1: { label: tr('Part ১', 'Part 1') + ' · Vol 1 ch 1–4', url: 'https://claude.ai/artifact/4kDTu1AmLVtPHLHYhErHsQ' },
  p2: { label: tr('Part ২', 'Part 2') + ' · Vol 1 ch 5–7', url: 'https://claude.ai/artifact/RxN1Ckon3rcby9ToMR5NV9' },
  p3: { label: tr('Part ৩', 'Part 3') + ' · Vol 1 ch 8–11', url: 'https://claude.ai/artifact/7AqGVW8pk7fWJiqWmAcJuA' },
  p4: { label: tr('Part ৪', 'Part 4') + ' · Vol 1 ch 12–15', url: 'https://claude.ai/artifact/1yo3fTxa2GFkPVrMPvjbBL' },
  p5: { label: tr('Part ৫', 'Part 5') + ' · Vol 2 ch 1–6', url: 'https://claude.ai/artifact/UzK5zTCczv755TmC5wd5nW' },
  p6: { label: tr('Part ৬', 'Part 6') + ' · Vol 2 ch 7–13', url: 'https://claude.ai/artifact/Nn8AKccYz8UhDWu7hyvcEf' },
  p7: { label: tr('Part ৭', 'Part 7') + ' · Architecture guide', url: 'https://claude.ai/artifact/9e1fLLeNbLhFFXBCyvZqnW' },
  hub: { label: tr('Hub ও cheat sheet', 'Hub and cheat sheet'), url: 'https://claude.ai/artifact/34s2vZos1VQkixaWE5NUSL' },
} as const;
