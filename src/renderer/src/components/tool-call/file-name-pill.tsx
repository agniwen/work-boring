import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
import { cn } from '@renderer/lib/utils';
import { FileIcon } from 'lucide-react';

// Ported and simplified from open-agents. Renders a filename as a compact pill
// with a generic file icon, optional click handler, and a tooltip showing the
// full path when different from the basename.
function basename(filePath: string) {
  const segments = filePath.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? filePath;
}

export function FileNamePill({
  filePath,
  fullPath,
  error = false,
  onClick,
}: {
  filePath: string;
  fullPath?: string;
  error?: boolean;
  onClick?: (filePath: string) => void;
}) {
  const fileName = basename(filePath);
  const tooltipPath = fullPath ?? filePath;
  const showTooltip = tooltipPath !== fileName;
  const isClickable = Boolean(onClick);

  const handleClick = (event: React.MouseEvent) => {
    if (!onClick) return;
    event.stopPropagation();
    onClick(filePath);
  };

  const baseClasses =
    'inline-flex max-w-[220px] items-center rounded border px-1.5 py-0.5 font-mono text-[12px] leading-tight transition-colors';
  const errorClasses = error
    ? 'border-red-500/30 bg-red-500/10 text-red-400'
    : 'border-border/70 bg-muted/60 text-muted-foreground';
  const hoverClasses = isClickable
    ? error
      ? 'cursor-pointer hover:border-red-500/40 hover:bg-red-500/15'
      : 'cursor-pointer hover:border-foreground/20 hover:bg-muted hover:text-foreground'
    : '';

  const pill = isClickable ? (
    <button
      className={cn(baseClasses, errorClasses, hoverClasses)}
      onClick={handleClick}
      type='button'
    >
      <FileIcon className='mr-1 h-3 w-3 shrink-0' />
      <span className='truncate'>{fileName}</span>
    </button>
  ) : (
    <span className={cn(baseClasses, errorClasses)}>
      <FileIcon className='mr-1 h-3 w-3 shrink-0' />
      <span className='truncate'>{fileName}</span>
    </span>
  );

  if (!showTooltip) return pill;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent side='top'>
        <span className='font-mono text-xs'>{tooltipPath}</span>
      </TooltipContent>
    </Tooltip>
  );
}
