import { MessageResponse } from '@renderer/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@renderer/components/ai-elements/reasoning';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@renderer/components/ai-elements/tool';
import { Button } from '@renderer/components/ui/button';
import { isToolUIPart } from 'ai';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';
import { ToolSummary } from './tool-summary';

export type ChatMessagePartProps = {
  isStreaming: boolean;
  onRespondToApproval: ((approvalId: string, approved: boolean) => void) | null;
  part: WorkspaceAgentUIMessage['parts'][number];
};

export function ChatMessagePart({ isStreaming, onRespondToApproval, part }: ChatMessagePartProps) {
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

  const approval = 'approval' in part ? part.approval : undefined;
  const summaryContent = ToolSummary({ part });
  const hidesInlineResult = summaryContent !== null;

  // Keep approval decisions visible on the card so users can act without opening tool details.
  const approvalContent =
    approval && onRespondToApproval ? (
      <div className='flex flex-col gap-2 rounded-md bg-muted/3 px-2.5 py-2'>
        <div className='space-y-1'>
          <p className='text-xs leading-4.5 font-medium text-foreground/88'>
            This tool needs approval before it can access a path outside the workspace.
          </p>
          {part.state === 'approval-responded' && approval.approved ? (
            <p className='text-xs leading-4.5 text-green-600/90'>
              Approval granted. Continuing execution.
            </p>
          ) : null}
          {(part.state === 'approval-responded' || part.state === 'output-denied') &&
          approval.approved === false ? (
            <p className='text-xs leading-4.5 text-orange-600/90'>Approval denied.</p>
          ) : null}
        </div>
        {part.state === 'approval-requested' ? (
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='sm'
              type='button'
              variant='outline'
              onClick={() => onRespondToApproval(approval.id, false)}
            >
              Cancel
            </Button>
            <Button size='sm' type='button' onClick={() => onRespondToApproval(approval.id, true)}>
              Confirm
            </Button>
          </div>
        ) : null}
      </div>
    ) : null;

  const resultContent =
    !hidesInlineResult &&
    (part.state === 'output-available' ||
      part.state === 'output-error' ||
      part.state === 'output-denied') ? (
      <ToolOutput errorText={part.errorText} output={part.output} />
    ) : null;

  const content =
    summaryContent || approvalContent || resultContent ? (
      <ToolContent>
        {summaryContent}
        {approvalContent}
        {resultContent}
      </ToolContent>
    ) : null;

  if (part.type === 'dynamic-tool') {
    return (
      <Tool>
        <ToolHeader state={part.state} toolName={part.toolName} type={part.type} />
        {content}
      </Tool>
    );
  }

  return (
    <Tool>
      <ToolHeader state={part.state} type={part.type} />
      {content}
    </Tool>
  );
}
