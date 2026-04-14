import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { HelpCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

type Option = { label: string; description?: string };
type Question = {
  id: string;
  question: string;
  header: string;
  options: Option[];
  multiSelect?: boolean;
};

type AnswerValue = string | string[];

// Renders the askUserQuestion client-side tool. Once the user submits, the
// parent chat component receives the answer map via onSubmit and calls
// useChat.addToolResult to resume the paused agent loop.
export interface AskUserQuestionCardProps {
  toolCallId: string;
  input: { questions?: Question[] } | undefined;
  state: string;
  output: unknown;
  onSubmit: (toolCallId: string, answers: Record<string, AnswerValue>) => void;
  onDecline: (toolCallId: string) => void;
}

export function AskUserQuestionCard(props: AskUserQuestionCardProps) {
  const questions = useMemo<Question[]>(() => {
    const qs = props.input?.questions;
    return Array.isArray(qs) ? qs : [];
  }, [props.input]);

  const [draft, setDraft] = useState<Record<string, AnswerValue>>({});
  const isAnswered = props.state === 'output-available' || props.state === 'output-error';

  const allAnswered = questions.every((question) => {
    const value = draft[question.id];
    if (question.multiSelect) {
      return Array.isArray(value) && value.length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  });

  const handleSelect = (question: Question, label: string) => {
    setDraft((prev) => {
      if (question.multiSelect) {
        const current = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : [];
        const next = current.includes(label)
          ? current.filter((entry) => entry !== label)
          : [...current, label];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: label };
    });
  };

  const isSelected = (question: Question, label: string) => {
    const value = draft[question.id];
    if (question.multiSelect) {
      return Array.isArray(value) && value.includes(label);
    }
    return value === label;
  };

  // Render submitted answers as a compact readout when the step resumed.
  const submittedAnswers = useMemo(() => {
    if (!isAnswered) return null;
    const output = props.output as
      | { answers?: Record<string, AnswerValue>; declined?: boolean }
      | undefined;
    if (output?.declined) return { declined: true as const };
    return output?.answers ?? null;
  }, [isAnswered, props.output]);

  return (
    <div className='not-prose mb-4 w-full space-y-2 rounded-md border bg-muted/5 px-3 py-2.5'>
      <div className='flex items-center gap-2'>
        <HelpCircle className='h-3.5 w-3.5 text-muted-foreground/70' />
        <span className='text-sm font-medium text-foreground'>需要你确认</span>
        {isAnswered ? (
          <span className='ml-auto font-mono text-[11px] text-muted-foreground/60'>已回答</span>
        ) : null}
      </div>

      {questions.map((question) => (
        <div className='space-y-1.5' key={question.id}>
          <div className='text-xs text-foreground/90'>{question.question}</div>
          <div className='flex flex-wrap gap-1.5'>
            {question.options.map((option) => {
              const selected = isSelected(question, option.label);
              return (
                <button
                  className={cn(
                    'rounded-md border px-2 py-1 text-left text-xs transition-colors',
                    selected
                      ? 'border-foreground/40 bg-foreground/10 text-foreground'
                      : 'border-border/50 bg-background text-foreground/80 hover:bg-muted/50',
                    isAnswered && 'cursor-default opacity-60',
                  )}
                  disabled={isAnswered}
                  key={option.label}
                  onClick={() => handleSelect(question, option.label)}
                  type='button'
                >
                  <div className='font-medium'>{option.label}</div>
                  {option.description ? (
                    <div className='text-[11px] text-muted-foreground'>{option.description}</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!isAnswered ? (
        <div className='flex items-center justify-end gap-2 pt-1'>
          <Button
            onClick={() => props.onDecline(props.toolCallId)}
            size='sm'
            type='button'
            variant='ghost'
          >
            跳过
          </Button>
          <Button
            disabled={!allAnswered}
            onClick={() => props.onSubmit(props.toolCallId, draft)}
            size='sm'
            type='button'
          >
            提交
          </Button>
        </div>
      ) : submittedAnswers ? (
        <div className='pt-1 font-mono text-[11px] text-muted-foreground/70'>
          {'declined' in submittedAnswers && submittedAnswers.declined
            ? '已跳过'
            : Object.entries(submittedAnswers as Record<string, AnswerValue>)
                .map(
                  ([key, value]) =>
                    `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`,
                )
                .join(' · ')}
        </div>
      ) : null}
    </div>
  );
}
