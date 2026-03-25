import { sidebarOpenAtom, sidebarResizingAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isChatRoute = pathname === '/chat' || pathname.startsWith('/chat/');

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
                marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0px',
              }}
            >
              {/* 主内容 */}
              <div className='min-h-0 flex-1 bg-background'>
                <div className='h-full pt-11.5'>
                  {isChatRoute ? (
                    <div className='h-full px-4'>
                      <Outlet />
                    </div>
                  ) : (
                    <ScrollArea className='h-[calc(100vh-46px)] px-4'>
                      <Outlet />
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarMiddleProvider>
      </DashboardHeaderEndProvider>
    </DashboardHeaderStartProvider>
  );
}
