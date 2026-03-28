import { queryClient } from '@renderer/lib/query-client';
import { routeTree } from '@renderer/routeTree.gen';
import { createHashHistory, createRouter } from '@tanstack/react-router';

const history = window.location.protocol === 'file:' ? createHashHistory() : undefined;

export const router = createRouter({
  context: {
    queryClient,
  },
  history,
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
