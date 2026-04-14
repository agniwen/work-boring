import { FileText } from 'lucide-react';

import { FileNamePill } from '../file-name-pill';
import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

// Read renderer. work-boring's read output is
// {path, startLine, endLine, totalLines, sizeBytes, truncated, content}.
// The server already formats content as " N | line" — we strip that prefix
// for the expanded view so copy/paste works cleanly.
export function ReadRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { path?: string };
  const rawPath = input.path ?? '...';

  const output =
    part.state === 'output-available'
      ? (part.output as {
          path?: string;
          startLine?: number;
          endLine?: number;
          totalLines?: number;
          content?: string;
          truncated?: boolean;
        })
      : undefined;

  const { totalLines, startLine, endLine, content, truncated } = output ?? {};
  const isPartialRead =
    startLine !== undefined &&
    endLine !== undefined &&
    totalLines !== undefined &&
    (startLine > 1 || endLine < totalLines);

  // Strip the "  NN | " prefix the read tool adds so the expanded view reads
  // like the source file. A trailing " | " after the number is the marker.
  const cleanContent = content
    ? content
        .split('\n')
        .map((line) => line.replace(/^\s*\d+ \| /, ''))
        .join('\n')
    : undefined;

  const expandedContent = cleanContent ? (
    <pre className='max-h-96 overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre text-foreground/88'>
      {cleanContent}
      {truncated ? '\n… (truncated)' : ''}
    </pre>
  ) : undefined;

  const meta = isPartialRead
    ? `[${startLine}–${endLine}]`
    : totalLines !== undefined
      ? `${totalLines} lines`
      : undefined;

  return (
    <ToolLayout
      errorMeta={state.error ? 'failed' : undefined}
      expandedContent={expandedContent}
      icon={<FileText className='h-3.5 w-3.5' />}
      meta={meta}
      name='Read'
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
