import { queryClient } from '@renderer/lib/query-client';
import { routeTree } from '@renderer/routeTree.gen';
import { createRouter } from '@tanstack/react-router';

export const router = createRouter({
  context: {
    queryClient,
  },
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
