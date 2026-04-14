import { MessageResponse } from '@renderer/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@renderer/components/ai-elements/reasoning';
import {
  extractRenderState,
  TOOL_RENDERERS,
  ToolLayout,
  type ToolRenderState,
} from '@renderer/components/tool-call';
import { isToolUIPart, type DynamicToolUIPart, type ToolUIPart } from 'ai';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';
import { AskUserQuestionCard } from './ask-user-question-card';
import { TaskCard } from './task-card';
import { TodoCard } from './todo-card';

export type AskUserQuestionAnswerPayload = {
  toolCallId: string;
  answers: Record<string, string | string[]>;
};

export type ChatMessagePartProps = {
  isStreaming: boolean;
  onRespondToApproval: ((approvalId: string, approved: boolean) => void) | null;
  onAnswerQuestion?: (payload: AskUserQuestionAnswerPayload) => void;
  onDeclineQuestion?: (toolCallId: string) => void;
  part: WorkspaceAgentUIMessage['parts'][number];
};

// Fallback renderer for tool types without a dedicated renderer (e.g. loadSkill,
// dynamic-tool). Uses ToolLayout with a JSON-dumped expanded view so we still
// get consistent styling and approval wiring.
function GenericToolRenderer({
  part,
  state,
  toolName,
  onApprove,
  onDeny,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  state: ToolRenderState;
  toolName: string;
  onApprove?: (id: string) => void;
  onDeny?: (id: string, reason?: string) => void;
}) {
  const output = part.state === 'output-available' ? part.output : undefined;
  const expandedContent =
    output !== undefined ? (
      <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground'>
        {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
      </pre>
    ) : undefined;

  return (
    <ToolLayout
      expandedContent={expandedContent}
      name={toolName}
      onApprove={onApprove}
      onDeny={onDeny}
      state={state}
      summary=''
    />
  );
}

export function ChatMessagePart({
  isStreaming,
  onRespondToApproval,
  onAnswerQuestion,
  onDeclineQuestion,
  part,
}: ChatMessagePartProps) {
  if (part.type === 'text') {
    return <MessageResponse isAnimating={isStreaming}>{part.text}</MessageResponse>;
  }

  if (part.type === 'reasoning') {
    return (
      <Reasoning defaultOpen={part.state === 'streaming'} isStreaming={part.state === 'streaming'}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  if (!isToolUIPart(part)) {
    return null;
  }

  // Specialized tool cards that intentionally bypass the generic ToolLayout.

  // todoWrite renders as a structured task list; its input IS its content.
  if (part.type === 'tool-todoWrite') {
    const todos =
      part.input && typeof part.input === 'object' && 'todos' in part.input
        ? ((part.input as { todos?: unknown[] }).todos ?? [])
        : [];
    return <TodoCard todos={todos as Parameters<typeof TodoCard>[0]['todos']} />;
  }

  // task renders a live subagent-progress card.
  if (part.type === 'tool-task') {
    return (
      <TaskCard
        input={part.input as Parameters<typeof TaskCard>[0]['input']}
        output={
          part.state === 'output-available' || part.state === 'output-error'
            ? (part.output as Parameters<typeof TaskCard>[0]['output'])
            : undefined
        }
        state={part.state}
      />
    );
  }

  // askUserQuestion is a client-side tool: render choice chips + submit.
  if (part.type === 'tool-askUserQuestion') {
    return (
      <AskUserQuestionCard
        input={part.input as Parameters<typeof AskUserQuestionCard>[0]['input']}
        onDecline={(toolCallId) => onDeclineQuestion?.(toolCallId)}
        onSubmit={(toolCallId, answers) => onAnswerQuestion?.({ toolCallId, answers })}
        output={part.state === 'output-available' ? part.output : undefined}
        state={part.state}
        toolCallId={part.toolCallId}
      />
    );
  }

  // Bridge the AI SDK approval callback (approvalId + boolean) to the
  // ToolLayout approval API (onApprove(id) / onDeny(id, reason)).
  const onApprove = onRespondToApproval ? (id: string) => onRespondToApproval(id, true) : undefined;
  const onDeny = onRespondToApproval ? (id: string) => onRespondToApproval(id, false) : undefined;

  const state = extractRenderState(part, isStreaming);
  const Renderer = TOOL_RENDERERS[part.type];

  if (Renderer) {
    return <Renderer onApprove={onApprove} onDeny={onDeny} part={part} state={state} />;
  }

  const toolName =
    part.type === 'dynamic-tool'
      ? part.toolName
      : part.type.startsWith('tool-')
        ? part.type.slice('tool-'.length)
        : part.type;

  return (
    <GenericToolRenderer
      onApprove={onApprove}
      onDeny={onDeny}
      part={part}
      state={state}
      toolName={toolName}
    />
  );
}
