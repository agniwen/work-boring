import { Pencil } from 'lucide-react';
import { useMemo } from 'react';

import { FileNamePill } from '../file-name-pill';
import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

// Edit renderer. Computes a line-level +/- count from oldString/newString and
// renders a simple side-by-side diff (removed block, added block) in the
// expanded view. This avoids pulling in a diff viewer library.
export function EditRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as {
    path?: string;
    oldString?: string;
    newString?: string;
    replaceAll?: boolean;
  };
  const rawPath = input.path ?? '...';
  const oldString = input.oldString ?? '';
  const newString = input.newString ?? '';
  const replaceAll = Boolean(input.replaceAll);

  const { additions, removals } = useMemo(() => {
    // Line-multiset diff so reordering the same lines does not over-count.
    const oldLines = oldString.split('\n');
    const newLines = newString.split('\n');

    const countLines = (lines: string[]) => {
      const counts = new Map<string, number>();
      for (const line of lines) {
        counts.set(line, (counts.get(line) ?? 0) + 1);
      }
      return counts;
    };

    const oldCounts = countLines(oldLines);
    const newCounts = countLines(newLines);

    let add = 0;
    for (const [line, count] of newCounts) {
      add += Math.max(0, count - (oldCounts.get(line) ?? 0));
    }

    let remove = 0;
    for (const [line, count] of oldCounts) {
      remove += Math.max(0, count - (newCounts.get(line) ?? 0));
    }

    return { additions: add, removals: remove };
  }, [oldString, newString]);

  const showDiff = state.approvalRequested || (!state.running && !state.error && !state.denied);

  const expandedContent =
    showDiff && !state.denied ? (
      <div className='space-y-1.5'>
        {oldString ? (
          <pre className='max-h-48 overflow-auto rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre text-red-400/90'>
            {oldString
              .split('\n')
              .map((line) => `- ${line}`)
              .join('\n')}
          </pre>
        ) : null}
        {newString ? (
          <pre className='max-h-48 overflow-auto rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre text-green-500/90'>
            {newString
              .split('\n')
              .map((line) => `+ ${line}`)
              .join('\n')}
          </pre>
        ) : null}
      </div>
    ) : undefined;

  const meta =
    showDiff && !state.denied ? (
      <span className='inline-flex items-center gap-1.5'>
        {replaceAll ? <span className='font-mono'>replaceAll</span> : null}
        <span className='text-green-500'>+{additions}</span>
        <span className='text-red-500'>-{removals}</span>
      </span>
    ) : undefined;

  return (
    <ToolLayout
      errorMeta={state.error ? 'failed' : undefined}
      expandedContent={expandedContent}
      icon={<Pencil className='h-3.5 w-3.5' />}
      meta={meta}
      name='Update'
      onApprove={onApprove}
      onDeny={onDeny}
      state={state}
      summary={
        rawPath === '...' ? (
          rawPath
        ) : (
          <FileNamePill error={Boolean(state.error)} filePath={rawPath} fullPath={rawPath} />
        )
      }
    />
  );
}
