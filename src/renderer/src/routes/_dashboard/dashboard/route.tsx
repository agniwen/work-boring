import { createFileRoute } from '@tanstack/react-router';

import {
  DashboardHeaderStartContent,
  DashboardHeaderEndContent,
} from '../-components/dashboard-header-portal';

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <DashboardHeaderStartContent>Start</DashboardHeaderStartContent>
      <DashboardHeaderEndContent>End</DashboardHeaderEndContent>
      <div>
        <h2 className='mb-4 text-xl font-bold'>Dashboard 内容</h2>
        <p className='mt-2 text-gray-600'>
          上方的标题和按钮是通过 DashboardHeaderContent 渲染到 layout header 中的。
        </p>
      </div>
    </div>
  );
}
