import type { ReactElement } from 'react';
import type { DiagramNode } from '@/content/schema';

/** Small line icon per component kind, the same everywhere in the game. */
export function NodeIcon({ kind, color = '#16252D' }: { kind: DiagramNode['kind']; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<DiagramNode['kind'], ReactElement> = {
    user: <><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" {...p} /></>,
    server: <><rect x="4" y="3" width="16" height="7" rx="1.5" {...p} /><rect x="4" y="14" width="16" height="7" rx="1.5" {...p} /><path d="M8 6.5h.01M8 17.5h.01" {...p} strokeWidth={3} /></>,
    lb: <><circle cx="5" cy="12" r="2.5" {...p} /><path d="M7.5 12H12m0 0l7-6m-7 6h7m-7 0l7 6" {...p} /></>,
    db: <><ellipse cx="12" cy="5.5" rx="7" ry="2.5" {...p} /><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" {...p} /></>,
    cache: <path d="M13 2L5 13h6l-1 9 8-11h-6z" {...p} />,
    cdn: <><circle cx="12" cy="12" r="9" {...p} /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" {...p} /></>,
    queue: <><rect x="3" y="6" width="4" height="12" rx="1" {...p} /><rect x="10" y="6" width="4" height="12" rx="1" {...p} /><rect x="17" y="6" width="4" height="12" rx="1" {...p} /></>,
    worker: <><circle cx="12" cy="12" r="3" {...p} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" {...p} /></>,
    store: <><path d="M3 7l9-4 9 4-9 4z" {...p} /><path d="M3 7v10l9 4 9-4V7M12 11v10" {...p} /></>,
    service: <path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" {...p} />,
    bot: <><rect x="4" y="8" width="16" height="12" rx="3" {...p} /><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6" {...p} strokeWidth={2.4} /></>,
    step: <><circle cx="12" cy="12" r="8" {...p} /><path d="M9 12l2 2 4-4" {...p} /></>,
    clock: <><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v5l3 2" {...p} /></>,
    ring: <><circle cx="12" cy="12" r="8" {...p} /><circle cx="12" cy="4" r="2" fill={color} /></>,
    key: <><circle cx="8" cy="12" r="4" {...p} /><path d="M12 12h9M18 12v3M21 12v2" {...p} /></>,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.25em', height: '1.25em', flex: 'none' }}>
      {paths[kind]}
    </svg>
  );
}
