import { SidebarTrigger, useSidebar } from '@renderer/components/ui/sidebar';
import { cn } from '@renderer/lib/utils';

import { DashboardHeaderEndTarget, DashboardHeaderStartTarget } from './dashboard-header-portal';

export function DashboardHeader() {
  const { open, width, isResizing } = useSidebar();

  return (
    <div className='drag-region fixed top-0 left-0 z-20 h-11 w-full'>
      <div className='flex items-center border-b border-border/80 px-4 pl-24'>
        <div className='drag-region' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <SidebarTrigger
            className='cursor-default'
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          />
        </div>
        <div
          className={cn(
            'dashboard-layout-header flex h-11 w-full flex-1 items-center',
            !isResizing && 'transition-[padding] duration-200 ease-linear',
          )}
          style={{
            paddingLeft: open ? `${width - 120}px` : '32px',
            willChange: 'padding-left',
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
