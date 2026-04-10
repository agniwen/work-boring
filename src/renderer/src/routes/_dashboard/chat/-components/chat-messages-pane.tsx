import { ArrowClockwiseIcon, CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { ChatsIcon } from '@phosphor-icons/react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@renderer/components/ai-elements/conversation';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@renderer/components/ai-elements/message';
import { useState } from 'react';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';
import { ChatMessagePart } from './chat-message-part';
import { computeSkippedPartIndices } from './chat-tool-task';

type ChatMessagesPaneProps = {
  isStreaming: boolean;
  messages: WorkspaceAgentUIMessage[];
  onRegenerate: (messageId: string) => void;
  onRespondToApproval: ((approvalId: string, approved: boolean) => void) | null;
};

// Flatten a message's parts into a plain-text string for clipboard copy.
const getMessageText = (message: WorkspaceAgentUIMessage) =>
  message.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n');

function CopyMessageAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator?.clipboard?.writeText || !text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures silently
    }
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <MessageAction onClick={handleCopy} tooltip={copied ? '已复制' : '复制'}>
      <Icon size={14} />
    </MessageAction>
  );
}

export function ChatMessagesPane({
  isStreaming,
  messages,
  onRegenerate,
  onRespondToApproval,
}: ChatMessagesPaneProps) {
  const lastMessageId = messages.at(-1)?.id;
  return (
    <Conversation className='min-h-0' initial='instant' resize='smooth'>
      <ConversationContent className='mx-auto w-full max-w-4xl'>
        {messages.length === 0 ? (
          <ConversationEmptyState
            className='mt-24 min-h-full opacity-45'
            description='从发送第一条信息开始'
            icon={<ChatsIcon size={48} />}
            title='无聊工作'
          />
        ) : (
          messages.map((message) => {
            const messageText = getMessageText(message);
            const canRegenerate = message.id === lastMessageId && !isStreaming;
            const showActions =
              message.role === 'assistant' && !isStreaming && messageText.length > 0;
            // Hide stale todoWrite snapshots so only the latest plan within this message renders.
            const skippedPartIndices = computeSkippedPartIndices(message.parts);

            return (
              <div
                className='chat-selectable w-full border-b border-border/60 pb-6 last:border-b-0 last:pb-0'
                key={message.id}
              >
                <Message from={message.role}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (skippedPartIndices.has(index)) {
                        return null;
                      }
                      return (
                        <ChatMessagePart
                          isStreaming={isStreaming && index === message.parts.length - 1}
                          key={`${message.id}:${index}`}
                          onRespondToApproval={onRespondToApproval}
                          part={part}
                        />
                      );
                    })}
                  </MessageContent>
                  {showActions ? (
                    <MessageActions className='-mt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'>
                      <CopyMessageAction text={messageText} />
                      {canRegenerate ? (
                        <MessageAction
                          onClick={() => onRegenerate(message.id)}
                          tooltip='重新生成'
                        >
                          <ArrowClockwiseIcon size={14} />
                        </MessageAction>
                      ) : null}
                    </MessageActions>
                  ) : null}
                </Message>
              </div>
            );
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
