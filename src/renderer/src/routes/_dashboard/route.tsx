import { sidebarOpenAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useAtom } from 'jotai';

import { DashboardHeader } from './-components/dashboard-header';
import {
  DashboardHeaderStartProvider,
  DashboardHeaderEndProvider,
} from './-components/dashboard-header-portal';
import { Sidebar } from './-components/sidebar';

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const [sidebarWidth] = useAtom(sidebarWidthAtom);

  return (
    <DashboardHeaderStartProvider>
      <DashboardHeaderEndProvider>
        <DashboardHeader />
        <div className='relative flex h-screen w-full flex-col overflow-hidden'>
          <Sidebar />
          <div
            className='flex h-full flex-col transition-[margin] duration-300 ease-out'
            style={{
              marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0px',
            }}
          >
            {/* 主内容 */}
            <div className='flex-1 overflow-y-auto bg-white'>
              <div className='px-2.5 pt-11.5 pb-2.5'>
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </DashboardHeaderEndProvider>
    </DashboardHeaderStartProvider>
  );
}
