import { createHashHistory, createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { levelsById } from '@/content/levels';
import { LevelPage } from '@/pages/level/LevelPage';
import { MapPage } from '@/pages/map/MapPage';
import { MockPage } from '@/pages/mock/MockPage';
import { IncidentPage } from '@/pages/incident/IncidentPage';
import { BuilderPage } from '@/pages/builder/BuilderPage';
import { PARTS, StudyPage, StudyReader, type Part } from '@/pages/study/StudyPage';
import { PracticePage } from '@/pages/practice/PracticePage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { ReviewPage } from '@/pages/review/ReviewPage';
import { ReadingPage } from '@/pages/reading/ReadingPage';
import { NotePage } from '@/pages/notes/NotePage';
import { tr } from '@/shared/lib/i18n';
import { AuthGate } from './AuthGate';
import { ReaderHost } from '@/features/books/ReaderHost';

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p className="font-display text-2xl font-extrabold">{tr('এই রাস্তা কোথাও যায় না', 'This road goes nowhere')}</p>
        <Link to="/" className="font-bold text-route-deep">{tr('শহরে ফিরুন', 'Back to the city')}</Link>
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({ component: () => <AuthGate><Outlet /><ReaderHost /></AuthGate>, notFoundComponent: NotFound });

const mapRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: MapPage });
const reviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/review', component: ReviewPage });
const practiceRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/practice', component: PracticePage,
  validateSearch: (s: Record<string, unknown>): { tab?: string } => (typeof s.tab === 'string' ? { tab: s.tab } : {}),
});
const mockRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mock', component: MockPage });
const incidentRoute = createRoute({ getParentRoute: () => rootRoute, path: '/incident', component: IncidentPage });
const builderRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/builder', component: BuilderPage,
  validateSearch: (s: Record<string, unknown>): { memory?: string; tab?: string } => ({ ...(typeof s.memory === 'string' ? { memory: s.memory } : {}), ...(typeof s.tab === 'string' ? { tab: s.tab } : {}) }),
});
const studyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/study', component: StudyPage });
const studyPartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/study/$part',
  component: function StudyPartView() {
    const { part } = studyPartRoute.useParams();
    return (PARTS as readonly string[]).includes(part) ? <StudyReader part={part as Part} /> : <NotFound />;
  },
});
const noteRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/notes/$noteId',
  component: function NoteView() { const { noteId } = noteRoute.useParams(); return <NotePage key={noteId} id={noteId} />; },
});
const readingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reading', component: ReadingPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage });

const levelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/level/$levelId',
  component: function LevelRouteView() {
    const { levelId } = levelRoute.useParams();
    const level = levelsById[Number(levelId)];
    if (!level) return <NotFound />;
    return <LevelPage key={level.id} level={level} />;
  },
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([mapRoute, levelRoute, reviewRoute, practiceRoute, mockRoute, incidentRoute, builderRoute, studyRoute, studyPartRoute, readingRoute, noteRoute, profileRoute]),
  // hash URLs work on any static host (GitHub Pages) with no rewrite rules
  history: createHashHistory(),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
