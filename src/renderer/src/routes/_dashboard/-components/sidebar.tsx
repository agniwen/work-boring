import { Label, ListBox } from '@heroui/react';
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sidebarOpenAtom,
  sidebarWidthAtom,
} from '@renderer/atom/app';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { LayoutDashboard, MessageSquare, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const RESIZE_HANDLE_WIDTH = 4;

const NAV_ITEMS = [
  {
    id: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} />,
  },
  {
    id: '/chat',
    label: 'Chat',
    icon: <MessageSquare size={16} />,
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
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;

  // 找到当前匹配的 nav item key
  const selectedKey = NAV_ITEMS.find(
    (item) => currentPath === item.id || currentPath.startsWith(item.id + '/'),
  )?.id;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

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
        className='absolute top-0 left-0 z-10 h-full shrink-0 border-r border-olive-200 pt-12 transition-transform duration-300 ease-out'
        style={{
          width: `${sidebarWidth}px`,
          transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
          willChange: 'transform',
        }}
      >
        <div className='flex h-full flex-col overflow-y-auto px-2 py-3'>
          <ListBox
            aria-label='Navigation'
            selectionMode='single'
            selectedKeys={selectedKey ? [selectedKey] : []}
            className='w-full gap-0.5'
          >
            {NAV_ITEMS.map((item) => (
              <ListBox.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                className='text-olive-500 data-[selected=true]:bg-olive-200/80 data-[selected=true]:font-medium data-[selected=true]:text-olive-900'
                onPress={() => navigate({ to: item.id })}
              >
                <span>{item.icon}</span>
                <Label>{item.label}</Label>
              </ListBox.Item>
            ))}
          </ListBox>
        </div>

        <button
          className={`absolute top-0 right-0 h-full cursor-col-resize transition-colors ${
            isHovering || isResizing ? 'bg-olive-500' : 'bg-transparent hover:bg-olive-300'
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
