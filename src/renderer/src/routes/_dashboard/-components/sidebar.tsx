import { ChatDotsIcon, HammerIcon, CalendarCheckIcon } from '@phosphor-icons/react';
import { SettingsMenu } from '@renderer/components/features/settings-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarResizeHandle,
} from '@renderer/components/ui/sidebar';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { SidebarMiddleTarget } from './sidebar-portal';

const NAV_ITEMS = [
  {
    id: '/dashboard',
    label: 'Dashboard',
    icon: CalendarCheckIcon,
  },
  {
    id: '/chat',
    label: 'Chat',
    icon: ChatDotsIcon,
  },
  {
    id: '/skills',
    label: 'Skills',
    icon: HammerIcon,
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

        {/* Portal target: chat route injects session list here.
            min-h-0 + flex-1 lets it shrink so the footer always stays pinned. */}
        <SidebarGroup className='min-h-0 flex-1 overflow-hidden'>
          <SidebarGroupContent className='h-full overflow-auto'>
            <SidebarMiddleTarget />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='px-2 py-2'>
        <SettingsMenu />
      </SidebarFooter>

      <SidebarResizeHandle />
    </Sidebar>
  );
}
