import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sidebarOpenAtom,
  sidebarWidthAtom,
} from '@renderer/atom/app';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// 侧边栏宽度配置常量

const RESIZE_HANDLE_WIDTH = 4; // 可拖拽区域宽度（像素）

export function Sidebar() {
  const [sidebarWidth, setSidebarWidth] = useAtom(sidebarWidthAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // 处理鼠标按下开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // 添加全局样式防止文本选中
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  // 处理拖拽过程中的鼠标移动
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
      // 恢复默认样式
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

  function handleToggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  // 添加 Meta+B 快捷键来切换 sidebar
  useHotkeys(
    'meta+b',
    (e) => {
      e.preventDefault();
      handleToggleSidebar();
    },
    {
      enableOnFormTags: true, // 在表单元素中也启用
    },
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
        {/* 侧边栏内容 */}
        <div className='h-full overflow-y-auto p-4'></div>

        {/* 可拖拽的调整手柄 - 更宽的区域 */}
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
