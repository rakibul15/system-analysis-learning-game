import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import './app/styles.css';
import { useProgress } from './entities/progress/store';
import { setSoundEnabled } from './shared/lib/sound';
import { applyTheme } from './shared/lib/theme';
import { resumeAuth } from './features/auth/auth';
import { installCrashHandlers } from './shared/lib/crash';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';

// anything that breaks is reported to the admin (crash.ts)
installCrashHandlers();

// keep the sound switch in step with saved settings on every screen
setSoundEnabled(useProgress.getState().settings.sound ?? true);
useProgress.subscribe((s) => setSoundEnabled(s.settings.sound ?? true));

// light or dark, as the learner chose (index.html already set it before the first paint)
applyTheme(useProgress.getState().settings.theme);
useProgress.subscribe((s, prev) => { if (s.settings.theme !== prev.settings.theme) applyTheme(s.settings.theme); });

// bring back a signed-in session (for guests, Firebase loads only when the landing page is idle: see warmAuth)
resumeAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
