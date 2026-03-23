import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent(): React.JSX.Element {
  return (
    <>
      <Outlet />
    </>
  );
}
