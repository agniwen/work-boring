// wterm CSS must come BEFORE global.css so our `.wterm` overrides
// (theme tokens, padding, border-radius) win the cascade.
import '@wterm/react/css';
import './global.css';
import { queryClient } from '@renderer/lib/query-client';
import { router } from '@renderer/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  </StrictMode>,
);
