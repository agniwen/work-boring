import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarResizeHandle,
} from '@renderer/components/ui/sidebar';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Layers, MessagesSquare, Projector } from 'lucide-react';

import { SidebarMiddleTarget } from './sidebar-portal';

const NAV_ITEMS = [
  {
    id: '/dashboard',
    label: 'Dashboard',
    icon: Projector,
  },
  {
    id: '/chat',
    label: 'Chat',
    icon: MessagesSquare,
  },
  {
    id: '/skills',
    label: 'Skills',
    icon: Layers,
  },
];

export function AppSidebar() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;

  const selectedKey = NAV_ITEMS.find(
    (item) => currentPath === item.id || currentPath.startsWith(item.id + '/'),
  )?.id;

  return (
    <Sidebar>
      {/* Spacer for the fixed header / Electron traffic-light buttons */}
      <SidebarHeader className='h-11 p-0' />

      <SidebarContent className='text-foreground/80'>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className='space-y-0.5'>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={selectedKey === item.id}
                    tooltip={item.label}
                    onClick={() => navigate({ to: item.id })}
                    className='cursor-default text-foreground/80!'
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Portal target: chat route injects session list here */}
        <SidebarGroup className='min-h-0 flex-1 overflow-hidden'>
          <SidebarGroupContent className='h-full overflow-auto'>
            <SidebarMiddleTarget />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarResizeHandle />
    </Sidebar>
  );
}
