import { cn } from '@renderer/lib/utils';
import { ArrowRight, LayoutList, ListChecks, ListTodo } from 'lucide-react';
import type { ReactNode } from 'react';

type Todo = {
  id?: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed';
};

function CompletedIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden='true'
      className={cn('h-3.5 w-3.5', className)}
      fill='none'
      viewBox='0 0 16 16'
    >
      <circle cx='8' cy='8' fill='none' r='7' stroke='currentColor' strokeWidth='1.5' />
      <path
        d='M5 8.5L7 10.5L11 6'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.5'
      />
    </svg>
  );
}

function InProgressIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-3.5 w-3.5 items-center justify-center', className)}>
      <svg
        aria-hidden='true'
        className='absolute inset-0 h-3.5 w-3.5'
        fill='none'
        viewBox='0 0 16 16'
      >
        <circle cx='8' cy='8' fill='currentColor' r='7.25' />
      </svg>
      <ArrowRight className='relative h-2 w-2 text-background' strokeWidth={3} />
    </span>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden='true'
      className={cn('h-3.5 w-3.5', className)}
      fill='none'
      viewBox='0 0 16 16'
    >
      <circle
        cx='8'
        cy='8'
        fill='none'
        r='7'
        stroke='currentColor'
        strokeDasharray='3.5 2.5'
        strokeWidth='1.5'
      />
    </svg>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const status = todo.status ?? 'pending';
  const content = todo.content ?? '';

  return (
    <div className='flex items-start gap-2 py-0.5'>
      <span className='mt-0.5 flex shrink-0 items-center'>
        {status === 'completed' ? (
          <CompletedIcon className='text-muted-foreground/50' />
        ) : status === 'in_progress' ? (
          <InProgressIcon className='text-foreground/70' />
        ) : (
          <PendingIcon className='text-muted-foreground/40' />
        )}
      </span>
      <span
        className={cn(
          'text-xs leading-relaxed',
          status === 'completed'
            ? 'text-muted-foreground/50 line-through'
            : status === 'in_progress'
              ? 'text-foreground/90'
              : 'text-muted-foreground/70',
        )}
      >
        {content}
      </span>
    </div>
  );
}

export function TodoCard({ todos }: { todos: Todo[] }) {
  const safeTodos = todos.filter((entry): entry is Todo => Boolean(entry));
  const activeTodo = safeTodos.find((todo) => todo.status === 'in_progress');
  const completedCount = safeTodos.filter((todo) => todo.status === 'completed').length;
  const total = safeTodos.length;
  const allDone = total > 0 && completedCount === total;
  const noneStarted = completedCount === 0 && !activeTodo;

  let title: string;
  let icon: ReactNode;
  let meta: string | null = null;

  if (allDone) {
    title = 'All tasks completed';
    icon = <ListChecks className='h-3.5 w-3.5' />;
  } else if (activeTodo?.content) {
    title = activeTodo.content;
    icon = <ListTodo className='h-3.5 w-3.5' />;
    meta = `${completedCount}/${total} done`;
  } else if (noneStarted) {
    title = `${total} task${total === 1 ? '' : 's'} created`;
    icon = <LayoutList className='h-3.5 w-3.5' />;
  } else {
    title = `${total} task${total === 1 ? '' : 's'} updated`;
    icon = <ListTodo className='h-3.5 w-3.5' />;
    meta = `${completedCount}/${total} done`;
  }

  return (
    <div className='not-prose mb-4 w-full rounded-md border bg-muted/5 px-3 py-2'>
      <div className='flex items-center gap-2'>
        <span className='flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/70'>
          {icon}
        </span>
        <span className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'>{title}</span>
        {meta ? (
          <span className='shrink-0 font-mono text-[11px] text-muted-foreground/60'>{meta}</span>
        ) : null}
      </div>
      {total > 0 ? (
        <div className='mt-2 max-h-64 space-y-0.5 overflow-y-auto pl-6'>
          {safeTodos.map((todo, index) => (
            <TodoRow key={todo.id ?? index} todo={todo} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
