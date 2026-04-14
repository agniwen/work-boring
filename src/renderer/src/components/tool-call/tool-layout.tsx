import { cn } from '@renderer/lib/utils';
import { CircleX, Loader2, Minus, OctagonPause, Plus } from 'lucide-react';
import type React from 'react';
import { type ReactNode, useEffect, useState } from 'react';

import { ApprovalButtons } from './approval-buttons';
import type { ToolRenderState } from './tool-state';

// Ported from open-agents. Uniform collapsible layout for every tool call card:
// status dot → name → short summary → meta tag, with an expanded content panel,
// approval buttons, and first-class error/interrupted header states.

export type ToolLayoutProps = {
  name: string;
  summary: ReactNode;
  summaryClassName?: string;
  meta?: ReactNode;
  /** Push meta to the far right of the header row. */
  rightAlignMeta?: boolean;
  /** Short label shown right-aligned in the error header (e.g. "exit 1"). */
  errorMeta?: ReactNode;
  state: ToolRenderState;
  children?: ReactNode;
  expandedContent?: ReactNode;
  onApprove?: (id: string) => void;
  onDeny?: (id: string, reason?: string) => void;
  defaultExpanded?: boolean;
  /** Tool-specific icon (Lucide element). */
  icon?: ReactNode;
  nameClassName?: string;
};

function StatusIndicator({ state }: { state: ToolRenderState }) {
  if (state.interrupted) {
    return <span className='inline-block h-2 w-2 rounded-full border border-yellow-500' />;
  }

  if (state.running) {
    return <Loader2 className='h-3 w-3 animate-spin text-yellow-500' />;
  }

  const color = state.denied
    ? 'bg-red-500'
    : state.approvalRequested
      ? 'bg-yellow-500'
      : state.error
        ? 'bg-red-500'
        : 'bg-green-500';

  return <span className={cn('inline-block h-2 w-2 rounded-full', color)} />;
}

function hasRenderableContent(value: ReactNode) {
  return value !== null && value !== undefined && value !== false && value !== '';
}

const EXPANDED_CONTENT_TRANSITION_MS = 200;

function trimErrorPrefix(message: string) {
  return message.replace(/^Error:\s*/i, '').trim();
}

export function ToolLayout({
  name,
  summary,
  summaryClassName,
  meta,
  rightAlignMeta = false,
  errorMeta,
  state,
  children,
  expandedContent,
  onApprove,
  onDeny,
  defaultExpanded = false,
  icon,
  nameClassName,
}: ToolLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const showApprovalButtons = Boolean(state.approvalRequested && state.approvalId);
  const errorMessage = state.error && !state.denied ? trimErrorPrefix(state.error) : undefined;
  const hasError = Boolean(errorMessage);
  const isInterrupted = Boolean(state.interrupted);
  const hasExpandedDetails = hasRenderableContent(expandedContent) || hasError || isInterrupted;
  const hasMeta = hasRenderableContent(meta);
  const hasSummary =
    typeof summary === 'string'
      ? summary.trim().length > 0
      : summary !== null && summary !== undefined;
  const isExpandedPanelVisible = isExpanded && hasExpandedDetails;
  const [shouldRenderExpandedContent, setShouldRenderExpandedContent] = useState(
    defaultExpanded && hasExpandedDetails,
  );

  const showErrorHeader = hasError;
  const showInterruptedHeader = isInterrupted && !hasError;
  const showErrorExpanded = hasError && isExpandedPanelVisible;
  const showInterruptedExpanded = isInterrupted && !hasError && isExpandedPanelVisible;
  const hasErrorMeta = hasRenderableContent(errorMeta);
  const hasTrailingMeta = !showErrorHeader && !showInterruptedHeader && hasMeta;

  useEffect(() => {
    if (!hasExpandedDetails) {
      setShouldRenderExpandedContent(false);
      return;
    }

    if (isExpandedPanelVisible) {
      setShouldRenderExpandedContent(true);
      return;
    }

    if (!shouldRenderExpandedContent) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderExpandedContent(false);
    }, EXPANDED_CONTENT_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [hasExpandedDetails, isExpandedPanelVisible, shouldRenderExpandedContent]);

  const handleToggle = () => {
    if (!hasExpandedDetails) {
      return;
    }

    const nextExpanded = !isExpanded;

    if (nextExpanded) {
      setShouldRenderExpandedContent(true);
    }

    setIsExpanded(nextExpanded);
  };

  const isRunning = state.running;
  const resolvedIcon = isRunning ? (
    <Loader2 className='h-3.5 w-3.5 animate-spin text-muted-foreground' />
  ) : (
    (icon ?? <StatusIndicator state={state} />)
  );

  return (
    <div className='-mx-1.5 mb-2 rounded-md border border-transparent bg-transparent'>
      <div
        className={cn(
          // Use a named group (`group/tool`) so the hover +/- icon swap only
          // responds to THIS header's hover. The outer <Message> wrapper also
          // sets a bare `group` class, which would otherwise make every
          // ToolLayout inside the message flip its icon when the user hovers
          // anywhere in the message.
          'group/tool flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm select-none',
          hasExpandedDetails && 'cursor-pointer transition-colors hover:bg-muted/50',
        )}
        {...(hasExpandedDetails && {
          onClick: handleToggle,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleToggle();
            }
          },
          role: 'button',
          tabIndex: 0,
          'aria-expanded': isExpanded,
        })}
      >
        <span className='flex size-4 shrink-0 items-center justify-center text-muted-foreground/70'>
          {showErrorHeader ? (
            <>
              <CircleX className='h-3.5 w-3.5 text-red-500 group-hover/tool:hidden' />
              {isExpandedPanelVisible ? (
                <Minus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              ) : (
                <Plus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              )}
            </>
          ) : showInterruptedHeader ? (
            <>
              <OctagonPause className='h-3.5 w-3.5 text-yellow-500 group-hover/tool:hidden' />
              {isExpandedPanelVisible ? (
                <Minus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              ) : (
                <Plus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              )}
            </>
          ) : hasExpandedDetails && !isRunning ? (
            <>
              <span className='group-hover/tool:hidden'>{resolvedIcon}</span>
              {isExpandedPanelVisible ? (
                <Minus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              ) : (
                <Plus className='hidden h-3.5 w-3.5 text-muted-foreground group-hover/tool:block' />
              )}
            </>
          ) : (
            resolvedIcon
          )}
        </span>

        <span
          className={cn(
            'min-w-0 shrink truncate leading-none font-medium',
            showErrorHeader
              ? 'text-red-500'
              : showInterruptedHeader
                ? 'text-yellow-500'
                : state.denied
                  ? 'text-red-500'
                  : 'text-foreground',
            nameClassName,
          )}
        >
          {name}
        </span>

        <div className='flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden'>
          {hasSummary ? (
            <span
              className={cn(
                'min-w-0 shrink truncate font-mono text-[13px] leading-none',
                showErrorHeader
                  ? 'text-red-400/80'
                  : showInterruptedHeader
                    ? 'text-yellow-400/80'
                    : 'text-muted-foreground',
                summaryClassName,
              )}
            >
              {summary}
            </span>
          ) : null}

          {rightAlignMeta || showErrorHeader || showInterruptedHeader ? (
            <span className='flex-1' />
          ) : null}

          {showErrorHeader && hasErrorMeta ? (
            <span className='inline-flex shrink-0 items-center gap-1.5 font-mono text-[12px] leading-none text-red-400/70'>
              {errorMeta}
            </span>
          ) : null}

          {hasTrailingMeta ? (
            <span className='inline-flex shrink-0 items-center gap-1.5 font-mono text-[12px] leading-none text-muted-foreground/60'>
              {meta}
            </span>
          ) : null}
        </div>
      </div>

      {children}

      {showApprovalButtons ? (
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role='presentation'
        >
          <ApprovalButtons approvalId={state.approvalId!} onApprove={onApprove} onDeny={onDeny} />
        </div>
      ) : null}

      {state.denied ? (
        <div className='mt-2 text-sm text-red-500'>
          Denied{state.denialReason ? `: ${state.denialReason}` : ''}
        </div>
      ) : null}

      {hasExpandedDetails ? (
        <div
          aria-hidden={!isExpandedPanelVisible}
          className={cn(
            'grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] motion-reduce:transition-none',
            isExpandedPanelVisible
              ? 'mt-1.5 grid-rows-[1fr] opacity-100 duration-200 ease-out'
              : 'pointer-events-none grid-rows-[0fr] opacity-0 duration-150 ease-out',
          )}
          inert={!isExpandedPanelVisible}
        >
          <div className='min-h-0'>
            {shouldRenderExpandedContent ? (
              <div className='space-y-2 pb-1'>
                {showErrorExpanded && !hasRenderableContent(expandedContent) ? (
                  <pre className='max-h-48 overflow-auto rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-red-400'>
                    {errorMessage}
                  </pre>
                ) : null}
                {showInterruptedExpanded ? (
                  <pre className='rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-yellow-500'>
                    interrupted
                  </pre>
                ) : null}
                {expandedContent}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
