import { FolderSearch } from 'lucide-react';

import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

function truncatePath(path: string) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 2) return path;
  return `…/${segments.slice(-2).join('/')}`;
}

// Glob renderer. work-boring's glob output uses `matches: [{path, size, modifiedAt}]`.
export function GlobRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { pattern?: string; path?: string };
  const pattern = input.pattern ?? '...';
  const path = input.path;

  const output =
    part.state === 'output-available'
      ? (part.output as {
          matches?: Array<{ path: string }>;
          baseDir?: string;
          truncated?: boolean;
          count?: number;
        })
      : undefined;

  const matches = Array.isArray(output?.matches) ? output.matches : [];
  const truncated = Boolean(output?.truncated);

  const expandedContent =
    output && matches.length > 0 ? (
      <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground'>
        Found {matches.length} file{matches.length === 1 ? '' : 's'}
        {truncated ? ' (truncated)' : ''}
        {'\n\n'}
        {matches.map((file) => file.path).join('\n')}
      </pre>
    ) : output ? (
      <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground'>
        No files
      </pre>
    ) : undefined;

  return (
    <ToolLayout
      expandedContent={expandedContent}
      icon={<FolderSearch className='h-3.5 w-3.5' />}
      meta={output ? `${matches.length} file${matches.length === 1 ? '' : 's'}` : undefined}
      name='Glob'
      onApprove={onApprove}
      onDeny={onDeny}
      state={state}
      summary={
        <>
          <span className='font-mono'>&apos;{pattern}&apos;</span>
          {path ? (
            <span className='ml-1.5 text-muted-foreground/60'>in {truncatePath(path)}</span>
          ) : null}
        </>
      }
    />
  );
}
