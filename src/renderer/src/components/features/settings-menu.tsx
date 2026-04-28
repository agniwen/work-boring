import { Button } from '@renderer/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { GearIcon } from '@phosphor-icons/react';
import { MonitorIcon, MoonStarIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const THEME_ITEMS = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonStarIcon },
];

function SettingsMenu() {
  const { theme, setTheme } = useTheme();

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 cursor-default text-foreground/70 hover:text-foreground'
          aria-label='Settings'
        >
          <GearIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' side='top' className='w-44'>
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={isMounted ? theme : undefined}
              onValueChange={setTheme}
            >
              {THEME_ITEMS.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  <item.icon className='size-4' />
                  <span>{item.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { SettingsMenu };
