import { cn } from '@renderer/lib/utils';
import { CircleCheck, Compass, Hammer, Loader2 } from 'lucide-react';

type TaskInput = {
  subagentType?: 'explorer' | 'executor';
  task?: string;
  instructions?: string;
};

type TaskOutput = {
  subagentType?: string;
  stepCount?: number;
  toolCallCount?: number;
  pending?: { name?: string; input?: unknown };
  summary?: string;
  done?: boolean;
  aborted?: boolean;
  startedAt?: number;
  finishedAt?: number;
};

// Surface subagent progress: which subagent, step count, tool call count, and
// the currently running inner tool. Once the subagent finishes, show the
// summary text that the parent agent will actually see.
export function TaskCard({
  input,
  output,
  state,
}: {
  input: TaskInput | undefined;
  output: TaskOutput | undefined;
  state: string;
}) {
  const subagentType = output?.subagentType ?? input?.subagentType ?? 'explorer';
  const isRunning = !output?.done && (state === 'input-available' || state === 'output-available');
  const pending = output?.pending;
  const startedAt = output?.startedAt;
  const finishedAt = output?.finishedAt;
  const elapsed =
    startedAt && finishedAt
      ? ((finishedAt - startedAt) / 1000).toFixed(1) + 's'
      : startedAt
        ? ((Date.now() - startedAt) / 1000).toFixed(0) + 's'
        : null;

  const Icon = subagentType === 'executor' ? Hammer : Compass;

  return (
    <div className='not-prose mb-4 w-full rounded-md border bg-muted/5 px-3 py-2'>
      <div className='flex items-center gap-2'>
        <span className='flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/70'>
          {isRunning ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : output?.aborted ? (
            <Icon className='h-3.5 w-3.5 text-yellow-500' />
          ) : output?.done ? (
            <CircleCheck className='h-3.5 w-3.5 text-green-500' />
          ) : (
            <Icon className='h-3.5 w-3.5' />
          )}
        </span>
        <span className='text-sm font-medium text-foreground'>task · {subagentType}</span>
        <span className='min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground'>
          {input?.task ?? ''}
        </span>
        <span className='shrink-0 font-mono text-[11px] text-muted-foreground/60'>
          {output?.stepCount ? `${output.stepCount} step${output.stepCount === 1 ? '' : 's'}` : ''}
          {output?.toolCallCount
            ? `${output?.stepCount ? ' · ' : ''}${output.toolCallCount} call${output.toolCallCount === 1 ? '' : 's'}`
            : ''}
          {elapsed ? ` · ${elapsed}` : ''}
        </span>
      </div>

      {isRunning && pending?.name && pending.name !== '__starting__' ? (
        <div className='mt-1.5 pl-6 font-mono text-[11px] text-muted-foreground/70'>
          → {pending.name}
        </div>
      ) : null}

      {output?.done && output.summary ? (
        <div
          className={cn(
            'mt-2 max-h-40 overflow-auto rounded-md border border-border/40 bg-background px-2.5 py-1.5 text-xs leading-5 whitespace-pre-wrap text-foreground/88',
            output.aborted && 'border-yellow-500/30 text-yellow-500/90',
          )}
        >
          {output.summary}
        </div>
      ) : null}
    </div>
  );
}
