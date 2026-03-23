import { createFileRoute, Navigate } from '@tanstack/react-router';
import { JSX } from 'react';

export const Route = createFileRoute('/')({
  component: App,
});

function App(): JSX.Element {
  return <Navigate to='/dashboard' />;
}
