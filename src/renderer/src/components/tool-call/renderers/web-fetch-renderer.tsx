import { Globe } from 'lucide-react';

import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

// Web-fetch renderer. Shows the URL + method in the header, status code as
// meta, and the truncated response body in the expanded view.
export function WebFetchRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { url?: string; method?: string };
  const method = input.method ?? 'GET';
  const url = input.url ?? '...';

  const output =
    part.state === 'output-available'
      ? (part.output as {
          status?: number;
          statusText?: string;
          body?: string;
          truncated?: boolean;
        })
      : undefined;

  const status = output?.status;
  const isHttpError = typeof status === 'number' && status >= 400;
  const mergedState =
    isHttpError && !state.error
      ? { ...state, error: `HTTP ${status} ${output?.statusText ?? ''}`.trim() }
      : state;

  const expandedContent = output?.body ? (
    <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground'>
      {output.body}
      {output.truncated ? '\n\n… (truncated)' : ''}
    </pre>
  ) : undefined;

  const meta =
    status !== undefined ? (
      <span className={isHttpError ? 'text-red-500' : 'text-green-500'}>
        {status}
        {output?.statusText ? ` ${output.statusText}` : ''}
      </span>
    ) : undefined;

  return (
    <ToolLayout
      errorMeta={isHttpError ? `${status}` : undefined}
      expandedContent={expandedContent}
      icon={<Globe className='h-3.5 w-3.5' />}
      meta={meta}
      name={`Fetch · ${method}`}
      onApprove={onApprove}
      onDeny={onDeny}
      state={mergedState}
      summary={url}
      summaryClassName='font-mono'
    />
  );
}
