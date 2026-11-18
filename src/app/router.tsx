import { createHashHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router';
import { loadLevel } from '@/content/load';
import { loadNote } from '@/content/notes';
import { MapPage } from '@/pages/map/MapPage';
import { PARTS, type Part } from '@/pages/study/parts';
import { tr } from '@/shared/lib/i18n';
import { LoadFailed, PageLoading } from '@/shared/ui/Loading';
import { AuthGate } from './AuthGate';
import { ReaderHost } from '@/features/books/ReaderHost';

/*
 * Only the map is in the first download. Every other screen, and each chapter's
 * content, is fetched the first time it is opened (and kept offline after that).
 */
const LevelPage = lazyRouteComponent(() => import('@/pages/level/LevelPage'), 'LevelPage');
const MockPage = lazyRouteComponent(() => import('@/pages/mock/MockPage'), 'MockPage');
const IncidentPage = lazyRouteComponent(() => import('@/pages/incident/IncidentPage'), 'IncidentPage');
const BuilderPage = lazyRouteComponent(() => import('@/pages/builder/BuilderPage'), 'BuilderPage');
const StudyPage = lazyRouteComponent(() => import('@/pages/study/StudyPage'), 'StudyPage');
const StudyReader = lazyRouteComponent(() => import('@/pages/study/StudyPage'), 'StudyReader');
const PracticePage = lazyRouteComponent(() => import('@/pages/practice/PracticePage'), 'PracticePage');
const ProfilePage = lazyRouteComponent(() => import('@/pages/profile/ProfilePage'), 'ProfilePage');
const ReviewPage = lazyRouteComponent(() => import('@/pages/review/ReviewPage'), 'ReviewPage');
const ReadingPage = lazyRouteComponent(() => import('@/pages/reading/ReadingPage'), 'ReadingPage');
const NotePage = lazyRouteComponent(() => import('@/pages/notes/NotePage'), 'NotePage');
const DeepPage = lazyRouteComponent(() => import('@/pages/deep/DeepPage'), 'DeepPage');
const AdminPage = lazyRouteComponent(() => import('@/pages/admin/AdminPage'), 'AdminPage');


function LoadError({ reset }: ErrorComponentProps) {
  return <LoadFailed onRetry={() => { reset(); void router.invalidate(); }} />;
}

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
  loader: ({ params }) => loadNote(params.noteId),
  component: function NoteView() { const note = noteRoute.useLoaderData(); return <NotePage key={note?.id} note={note} />; },
});
const deepRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/deep/$deepId',
  component: function DeepView() { const { deepId } = deepRoute.useParams(); return <DeepPage key={deepId} id={deepId} />; },
});
const readingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reading', component: ReadingPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage });
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminPage });

const levelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/level/$levelId',
  loader: ({ params }) => loadLevel(Number(params.levelId)),
  component: function LevelRouteView() {
    const level = levelRoute.useLoaderData();
    if (!level) return <NotFound />;
    return <LevelPage key={level.id} level={level} />;
  },
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([mapRoute, levelRoute, reviewRoute, practiceRoute, mockRoute, incidentRoute, builderRoute, studyRoute, studyPartRoute, readingRoute, noteRoute, deepRoute, profileRoute, adminRoute]),
  // hash URLs work on any static host (GitHub Pages) with no rewrite rules
  history: createHashHistory(),
  scrollRestoration: true,
  defaultPendingComponent: () => <PageLoading />,
  defaultPendingMs: 150,
  defaultErrorComponent: LoadError,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
