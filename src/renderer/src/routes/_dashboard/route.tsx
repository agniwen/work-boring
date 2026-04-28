import { sidebarOpenAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { TerminalPanel } from '@renderer/components/features/terminal-panel';
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
              {/* min-h-0 lets the terminal panel below us claim height
                  without the content area refusing to shrink. */}
              <div className='flex max-h-[calc(100vh)] min-h-0 flex-1 flex-col pt-11.5'>
                <div className='min-h-0 flex-1 overflow-auto'>
                  <Outlet />
                </div>
                <TerminalPanel />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </SidebarMiddleProvider>
      </DashboardHeaderEndProvider>
    </DashboardHeaderStartProvider>
  );
}
