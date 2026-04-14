import { TooltipProvider } from '@renderer/components/ui/tooltip';
import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';

export interface RouterAppContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
});

function RootComponent(): React.JSX.Element {
  return (
    // attribute="class" matches the Tailwind v4 `@custom-variant dark (&:is(.dark *))`
    // setup in global.css — next-themes toggles `.dark` on <html> for us.
    <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    </ThemeProvider>
  );
}
