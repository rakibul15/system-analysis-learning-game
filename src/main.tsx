import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import './app/styles.css';
import { useProgress } from './entities/progress/store';
import { setSoundEnabled } from './shared/lib/sound';

// keep the sound switch in step with saved settings on every screen
setSoundEnabled(useProgress.getState().settings.sound ?? true);
useProgress.subscribe((s) => setSoundEnabled(s.settings.sound ?? true));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
