import { terminalOpenAtom } from '@renderer/atom/app';
import { Button } from '@renderer/components/ui/button';
import { TerminalWindowIcon } from '@phosphor-icons/react';
import { useAtom } from 'jotai';

export function TerminalToggleButton() {
  const [open, setOpen] = useAtom(terminalOpenAtom);

  return (
    <Button
      size='icon-sm'
      variant='ghost'
      aria-label='Toggle terminal'
      aria-pressed={open}
      onClick={() => setOpen((v) => !v)}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <TerminalWindowIcon />
    </Button>
  );
}
