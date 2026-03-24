import { sidebarOpenAtom, sidebarResizingAtom, sidebarWidthAtom } from '@renderer/atom/app';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { useAtom, useAtomValue } from 'jotai';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

import { DashboardHeaderStartTarget, DashboardHeaderEndTarget } from './dashboard-header-portal';

export function DashboardHeader() {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [sidebarResizing] = useAtom(sidebarResizingAtom);
  const sidebarWidth = useAtomValue(sidebarWidthAtom);
  function handleToggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }
  return (
    <div className='drag-region fixed top-0 left-0 z-20 h-11.5 w-full'>
      <div className='flex items-center pl-24'>
        <div className='drag-region' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button
            variant='ghost'
            className='text-olive-500'
            onClick={handleToggleSidebar}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeft />}
          </Button>
        </div>
        <div
          className={cn(
            'dashboard-layout-header flex h-11.5 w-full flex-1 items-center px-4',
            !sidebarResizing && 'transition-[padding]',
          )}
          style={{
            paddingLeft: sidebarOpen ? `${sidebarWidth - 120}px` : '32px',
          }}
        >
          <div className='flex w-full items-center justify-between'>
            <DashboardHeaderStartTarget />
            <DashboardHeaderEndTarget />
          </div>
        </div>
      </div>
    </div>
  );
}
