import { sidebarOpenAtom, sidebarResizingAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useAtom } from 'jotai';

import { DashboardHeader } from './-components/dashboard-header';
import {
  DashboardHeaderStartProvider,
  DashboardHeaderEndProvider,
} from './-components/dashboard-header-portal';
import { Sidebar } from './-components/sidebar';
import { SidebarMiddleProvider } from './-components/sidebar-portal';

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const [sidebarWidth] = useAtom(sidebarWidthAtom);
  const [sidebarResizing] = useAtom(sidebarResizingAtom);

  return (
    <DashboardHeaderStartProvider>
      <DashboardHeaderEndProvider>
        <SidebarMiddleProvider>
          <DashboardHeader />
          <div className='relative flex h-screen w-full flex-col overflow-hidden'>
            <Sidebar />
            <div
              className={`flex h-full flex-col ${sidebarResizing ? '' : 'transition-[margin] duration-300 ease-out'}`}
              style={{
                // Opening the sidebar still shifts content, but hint the browser ahead of time to
                // smooth out the margin animation on large chat transcripts.
                marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0px',
                willChange: sidebarResizing ? 'margin-left' : 'margin-left',
              }}
            >
              {/* 主内容 */}
              <div
                className='min-h-0 flex-1'
                style={{
                  contain: 'paint',
                }}
              >
                <div className='h-full pt-11.5'>
                  <div className='h-full px-4'>
                    <Outlet />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarMiddleProvider>
      </DashboardHeaderEndProvider>
    </DashboardHeaderStartProvider>
  );
}
