import { createHashHistory, createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { levelsById } from '@/content/levels';
import { LevelPage } from '@/pages/level/LevelPage';
import { MapPage } from '@/pages/map/MapPage';
import { PracticePage } from '@/pages/practice/PracticePage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { ReviewPage } from '@/pages/review/ReviewPage';

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p className="font-display text-2xl font-extrabold">এই রাস্তা কোথাও যায় না</p>
        <Link to="/" className="font-bold text-route-deep">শহরে ফিরুন</Link>
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound });

const mapRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: MapPage });
const reviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/review', component: ReviewPage });
const practiceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/practice', component: PracticePage });
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
  routeTree: rootRoute.addChildren([mapRoute, levelRoute, reviewRoute, practiceRoute, profileRoute]),
  // hash URLs work on any static host (GitHub Pages) with no rewrite rules
  history: createHashHistory(),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
