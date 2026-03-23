import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard/skills')({
  component: SkillsManagement,
});

function SkillsManagement() {
  return <div>Hello "/_dashboard/skills"!</div>;
}
