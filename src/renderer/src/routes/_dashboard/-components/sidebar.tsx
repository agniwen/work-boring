import { Label, ListBox } from '@heroui/react';
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sidebarOpenAtom,
  sidebarResizingAtom,
  sidebarWidthAtom,
} from '@renderer/atom/app';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { Projector, Layers, MessagesSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

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
        className={`absolute top-0 left-0 z-10 h-full shrink-0 border-r border-olive-200 pt-12 ${
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
            className='w-full gap-0.5'
          >
            {NAV_ITEMS.map((item) => (
              <ListBox.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                className='text-olive-500 data-[selected=true]:bg-olive-300/80 data-[selected=true]:font-medium data-[selected=true]:text-olive-800'
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
            isHovering || isResizing ? 'bg-olive-400' : 'bg-transparent hover:bg-olive-300'
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
