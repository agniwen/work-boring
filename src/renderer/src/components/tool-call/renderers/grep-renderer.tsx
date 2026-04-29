import { Search } from 'lucide-react';

import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

type GrepMatch = { path: string; lineNumber: number; content?: string };

function truncatePath(path: string) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 2) return path;
  return `…/${segments.slice(-2).join('/')}`;
}

function getUniqueFiles(matches: GrepMatch[]) {
  const seen = new Set<string>();
  for (const match of matches) seen.add(match.path);
  return [...seen];
}

// Grep renderer. codez's grep output uses
// {matches: [{path, lineNumber, content}]} — note `path`/`lineNumber`, not the
// open-agents `file`/`line` field names.
export function GrepRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { pattern?: string; path?: string };
  const pattern = input.pattern ?? '...';
  const path = input.path;

  const output =
    part.state === 'output-available'
      ? (part.output as { matches?: GrepMatch[]; truncated?: boolean })
      : undefined;

  const matches = Array.isArray(output?.matches) ? output.matches : [];
  const uniqueFiles = getUniqueFiles(matches);
  const truncated = Boolean(output?.truncated);

  const expandedContent = output ? (
    <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground'>
      {matches.length > 0 ? (
        <>
          Found {matches.length} match{matches.length === 1 ? '' : 'es'} in {uniqueFiles.length}{' '}
          file
          {uniqueFiles.length === 1 ? '' : 's'}
          {truncated ? ' (truncated)' : ''}
          {'\n\n'}
          {uniqueFiles.join('\n')}
        </>
      ) : (
        'No matches'
      )}
    </pre>
  ) : undefined;

  return (
    <ToolLayout
      expandedContent={expandedContent}
      icon={<Search className='h-3.5 w-3.5' />}
      meta={output ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : undefined}
      name='Grep'
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
