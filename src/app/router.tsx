import { createHashHistory, createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { levels } from '@/content/levels';
import { MapPage } from '@/pages/map/MapPage';
import { LevelPage } from '@/pages/level/LevelPage';

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

const levelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/level/$levelId',
  component: function LevelRouteView() {
    const { levelId } = levelRoute.useParams();
    const level = levels[Number(levelId)];
    if (!level) return <NotFound />;
    return <LevelPage key={level.id} level={level} />;
  },
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([mapRoute, levelRoute]),
  // hash URLs work on any static host (GitHub Pages) with no rewrite rules
  history: createHashHistory(),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
