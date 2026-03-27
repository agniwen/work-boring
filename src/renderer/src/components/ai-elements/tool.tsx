'use client';

import { Surface } from '@heroui/react';
import { Badge } from '@renderer/components/ui/badge';
import { cn } from '@renderer/lib/utils';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { CheckCircleIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';

import { CodeBlock } from './code-block';

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolProps = ComponentProps<'div'>;

export const Tool = ({ children, className, ...props }: ToolProps) => (
  <div className={cn('not-prose mb-2.5 w-full rounded-lg bg-transparent', className)} {...props}>
    {children}
  </div>
);

export type ToolHeaderProps = {
  actions?: ReactNode;
  className?: string;
  title?: string;
} & (
  | { type: ToolUIPart['type']; state: ToolUIPart['state']; toolName?: never }
  | {
      type: DynamicToolUIPart['type'];
      state: DynamicToolUIPart['state'];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart['state'], string> = {
  'approval-requested': 'Awaiting Approval',
  'approval-responded': 'Responded',
  'input-available': 'Running',
  'input-streaming': 'Pending',
  'output-available': 'Completed',
  'output-denied': 'Denied',
  'output-error': 'Error',
};

const statusIcons: Record<ToolPart['state'], ReactNode> = {
  'approval-requested': <ClockIcon className='size-4 text-yellow-600' />,
  'approval-responded': <CheckCircleIcon className='size-4 text-blue-600' />,
  'input-available': <ClockIcon className='size-4 animate-pulse' />,
  'input-streaming': <CircleIcon className='size-4' />,
  'output-available': <CheckCircleIcon className='size-4 text-green-600' />,
  'output-denied': <XCircleIcon className='size-4 text-orange-600' />,
  'output-error': <XCircleIcon className='size-4 text-red-600' />,
};

export const getStatusBadge = (status: ToolPart['state']) => (
  <Badge
    className='gap-1 rounded-full border-transparent bg-transparent px-0 py-0 text-[11px] font-normal text-muted-foreground shadow-none'
    variant='secondary'
  >
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  actions,
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName = type === 'dynamic-tool' ? toolName : type.split('-').slice(1).join('-');

  return (
    <div
      className={cn('flex items-center justify-between gap-4 px-1.5 py-1.5 text-left', className)}
      {...props}
    >
      <div className='flex min-w-0 items-center gap-2'>
        <Surface
          className='flex size-5 shrink-0 items-center justify-center rounded-md bg-transparent text-muted-foreground shadow-none'
          variant='default'
        >
          <WrenchIcon className='size-3.5' />
        </Surface>
        <span className='truncate text-sm font-medium text-foreground/90'>
          {title ?? derivedName}
        </span>
        {getStatusBadge(state)}
      </div>
      {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
    </div>
  );
};

export type ToolContentProps = ComponentProps<'div'>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <div className={cn('space-y-2 px-1.5 pb-1.5', className)} {...props} />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('max-w-full min-w-0 space-y-2 overflow-hidden', className)} {...props}>
    <h4 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
      Parameters
    </h4>
    <Surface className='max-w-full min-w-0 overflow-hidden rounded-2xl' variant='default'>
      <CodeBlock
        className='w-full max-w-full min-w-0 rounded-2xl'
        code={JSON.stringify(input, null, 2)}
        language='json'
      />
    </Surface>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolPart['output'];
  errorText: ToolPart['errorText'];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let renderedOutput = <div>{output as ReactNode}</div>;

  if (typeof output === 'object' && !isValidElement(output)) {
    renderedOutput = (
      <CodeBlock
        className='w-full max-w-full min-w-0 rounded-2xl'
        code={JSON.stringify(output, null, 2)}
        language='json'
      />
    );
  } else if (typeof output === 'string') {
    renderedOutput = (
      <CodeBlock className='w-full max-w-full min-w-0 rounded-2xl' code={output} language='json' />
    );
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <h4 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {errorText ? 'Error' : 'Result'}
      </h4>
      <Surface
        className={cn(
          'max-w-full min-w-0 overflow-hidden rounded-xl text-xs shadow-none [&_table]:w-full',
          errorText
            ? 'bg-destructive/8 px-2 py-1.5 text-destructive'
            : 'bg-muted/15 text-foreground',
        )}
        variant='default'
      >
        {errorText && <div>{errorText}</div>}
        {renderedOutput}
      </Surface>
    </div>
  );
};
