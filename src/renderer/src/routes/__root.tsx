import type { QueryClient } from '@tanstack/react-query';
import { TooltipProvider } from '@renderer/components/ui/tooltip';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

export interface RouterAppContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
});

function RootComponent(): React.JSX.Element {
  return (
    <TooltipProvider>
      <Outlet />
    </TooltipProvider>
  );
}
