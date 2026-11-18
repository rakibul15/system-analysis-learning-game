import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import './app/styles.css';
import { useProgress } from './entities/progress/store';
import { setSoundEnabled } from './shared/lib/sound';
import { resumeAuth } from './features/auth/auth';
import { installCrashHandlers } from './shared/lib/crash';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';

// anything that breaks is reported to the admin (crash.ts)
installCrashHandlers();

// keep the sound switch in step with saved settings on every screen
setSoundEnabled(useProgress.getState().settings.sound ?? true);
useProgress.subscribe((s) => setSoundEnabled(s.settings.sound ?? true));

// bring back a signed-in session (guests never download Firebase)
resumeAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
