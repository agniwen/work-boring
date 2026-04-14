import { FilePlus } from 'lucide-react';

import { FileNamePill } from '../file-name-pill';
import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

// Write renderer. work-boring input: {path, content, mode?}. We show the
// incoming content preview while the call is awaiting approval or done, and
// a +lines meta tag for quick scanning.
export function WriteRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { path?: string; content?: string; mode?: string };
  const rawPath = input.path ?? '...';
  const content = input.content ?? '';
  const mode = input.mode ?? 'overwrite';

  const totalLines = content.length === 0 ? 0 : content.split('\n').length;

  const showCode = state.approvalRequested || (!state.running && !state.error && !state.denied);

  const expandedContent =
    showCode && !state.denied && content ? (
      <pre className='max-h-96 overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre text-foreground/88'>
        {content}
      </pre>
    ) : undefined;

  const meta =
    showCode && !state.denied ? (
      <span className='inline-flex items-center gap-1.5'>
        {mode === 'append' ? <span className='font-mono'>append</span> : null}
        <span className='text-green-500'>+{totalLines}</span>
      </span>
    ) : undefined;

  return (
    <ToolLayout
      errorMeta={state.error ? 'failed' : undefined}
      expandedContent={expandedContent}
      icon={<FilePlus className='h-3.5 w-3.5' />}
      meta={meta}
      name={mode === 'append' ? 'Append' : 'Create'}
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
