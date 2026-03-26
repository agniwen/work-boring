import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@renderer/components/ai-elements/confirmation';
import { MessageResponse } from '@renderer/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@renderer/components/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@renderer/components/ai-elements/tool';
import { isToolUIPart } from 'ai';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';

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
  const approvalContent =
    approval && onRespondToApproval ? (
      // Keep approval actions next to the tool payload so users can review context before approving.
      <Confirmation approval={approval} state={part.state}>
        <ConfirmationRequest>
          <ConfirmationTitle>
            This tool needs approval before it can access a path outside the workspace.
          </ConfirmationTitle>
          <ConfirmationActions>
            <ConfirmationAction
              variant='outline'
              onClick={() => onRespondToApproval(approval.id, false)}
            >
              Deny
            </ConfirmationAction>
            <ConfirmationAction onClick={() => onRespondToApproval(approval.id, true)}>
              Approve
            </ConfirmationAction>
          </ConfirmationActions>
        </ConfirmationRequest>
        <ConfirmationAccepted>
          <ConfirmationTitle>Approval granted. Continuing execution.</ConfirmationTitle>
        </ConfirmationAccepted>
        <ConfirmationRejected>
          <ConfirmationTitle>Approval denied.</ConfirmationTitle>
        </ConfirmationRejected>
      </Confirmation>
    ) : null;

  const content =
    part.input !== undefined ||
    approvalContent ||
    part.state === 'output-available' ||
    part.state === 'output-error' ||
    part.state === 'output-denied' ? (
      <ToolContent>
        {part.input !== undefined ? <ToolInput input={part.input} /> : null}
        {approvalContent}
        {part.state === 'output-available' ||
        part.state === 'output-error' ||
        part.state === 'output-denied' ? (
          <ToolOutput errorText={part.errorText} output={part.output} />
        ) : null}
      </ToolContent>
    ) : null;

  if (part.type === 'dynamic-tool') {
    return (
      <Tool defaultOpen={part.state !== 'output-available'}>
        <ToolHeader state={part.state} toolName={part.toolName} type={part.type} />
        {content}
      </Tool>
    );
  }

  return (
    <Tool defaultOpen={part.state !== 'output-available'}>
      <ToolHeader state={part.state} type={part.type} />
      {content}
    </Tool>
  );
}
