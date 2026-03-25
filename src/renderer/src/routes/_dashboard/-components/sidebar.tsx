import { Label, ListBox, Surface } from '@heroui/react';
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sidebarOpenAtom,
  sidebarResizingAtom,
  sidebarWidthAtom,
} from '@renderer/atom/app';
import { cn } from '@renderer/lib/utils';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { Projector, Layers, MessagesSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { SidebarMiddleTarget } from './sidebar-portal';

const RESIZE_HANDLE_WIDTH = 4;

const NAV_ITEMS = [
  {
    id: '/dashboard',
    label: 'Dashboard',
    icon: <Projector size={16} />,
  },
  {
    id: '/chat',
    label: 'Chat',
    icon: <MessagesSquare size={16} />,
  },
  {
    id: '/skills',
    label: 'Skills',
    icon: <Layers size={16} />,
  },
];

export function Sidebar() {
  const [sidebarWidth, setSidebarWidth] = useAtom(sidebarWidthAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [isResizing, setIsResizing] = useAtom(sidebarResizingAtom);
  const [isHovering, setIsHovering] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // 找到当前匹配的 nav item key
  const selectedKey = NAV_ITEMS.find(
    (item) => currentPath === item.id || currentPath.startsWith(item.id + '/'),
  )?.id;

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const clampWidth = (width: number) =>
      Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = clampWidth(e.clientX);

      if (newWidth !== sidebarWidthRef.current) {
        sidebarWidthRef.current = newWidth;
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, setSidebarWidth, setIsResizing]);

  useHotkeys(
    'meta+b',
    (e) => {
      e.preventDefault();
      setSidebarOpen(!sidebarOpen);
    },
    { enableOnFormTags: true },
  );

  return (
    <>
      <div
        className={`absolute top-0 left-0 z-10 h-full shrink-0 border-r border-neutral-200 pt-12 ${
          isResizing ? '' : 'transition-transform duration-300 ease-out'
        }`}
        style={{
          width: `${sidebarWidth}px`,
          transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
          willChange: isResizing ? 'width' : 'transform',
        }}
      >
        <div className='flex h-full flex-col overflow-y-auto px-2 py-3'>
          <ListBox
            aria-label='Navigation'
            selectionMode='single'
            selectedKeys={selectedKey ? [selectedKey] : []}
            className='w-full gap-1'
          >
            {NAV_ITEMS.map((item) => (
              <ListBox.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                className='bg-transparent px-0 py-0 data-[hovered=true]:bg-transparent data-[selected=true]:bg-transparent data-[selected=true]:text-neutral-800'
                onPress={() => navigate({ to: item.id })}
              >
                {({ isSelected }) => (
                  <Surface
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-2.5 py-2', {
                      'shadow-sm': isSelected,
                    })}
                    variant={isSelected ? 'default' : 'transparent'}
                  >
                    <span>{item.icon}</span>
                    <Label>{item.label}</Label>
                  </Surface>
                )}
              </ListBox.Item>
            ))}
          </ListBox>

          <div className='mt-3 min-h-0 flex-1 overflow-hidden'>
            <SidebarMiddleTarget />
          </div>
        </div>

        <button
          className={`absolute top-0 right-0 h-full cursor-col-resize transition-colors ${
            isHovering || isResizing ? 'bg-primary' : 'bg-transparent '
          }`}
          style={{ width: `${RESIZE_HANDLE_WIDTH}px` }}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        />
      </div>
    </>
  );
}
