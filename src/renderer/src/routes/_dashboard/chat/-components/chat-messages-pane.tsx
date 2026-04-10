import { ChatsIcon } from '@phosphor-icons/react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@renderer/components/ai-elements/conversation';
import { Message, MessageContent } from '@renderer/components/ai-elements/message';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';
import { ChatMessagePart } from './chat-message-part';

type ChatMessagesPaneProps = {
  isStreaming: boolean;
  messages: WorkspaceAgentUIMessage[];
  onRespondToApproval: ((approvalId: string, approved: boolean) => void) | null;
};

export function ChatMessagesPane({
  isStreaming,
  messages,
  onRespondToApproval,
}: ChatMessagesPaneProps) {
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
          messages.map((message) => (
            <div
              className='chat-selectable w-full border-b border-border/60 py-6 first:pt-0 last:border-b-0 last:pb-0'
              key={message.id}
            >
              <Message from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => (
                    <ChatMessagePart
                      isStreaming={isStreaming && index === message.parts.length - 1}
                      key={`${message.id}:${index}`}
                      onRespondToApproval={onRespondToApproval}
                      part={part}
                    />
                  ))}
                </MessageContent>
              </Message>
            </div>
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
