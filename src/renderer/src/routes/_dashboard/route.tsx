import { sidebarOpenAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useAtom } from 'jotai';

import { DashboardHeader } from './-components/dashboard-header';
import {
  DashboardHeaderEndProvider,
  DashboardHeaderStartProvider,
} from './-components/dashboard-header-portal';
import { AppSidebar } from './-components/sidebar';
import { SidebarMiddleProvider } from './-components/sidebar-portal';

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [sidebarWidth, setSidebarWidth] = useAtom(sidebarWidthAtom);

  return (
    <DashboardHeaderStartProvider>
      <DashboardHeaderEndProvider>
        <SidebarMiddleProvider>
          <SidebarProvider
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
          >
            <AppSidebar />
            <SidebarInset>
              <DashboardHeader />
              <div className='h-full pt-11.5'>
                <div className='h-full overflow-auto'>
                  <Outlet />
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </SidebarMiddleProvider>
      </DashboardHeaderEndProvider>
    </DashboardHeaderStartProvider>
  );
}
