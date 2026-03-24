import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@renderer/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@renderer/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@renderer/components/ai-elements/prompt-input';
import { useChat } from '@ai-sdk/react';
import { createFileRoute } from '@tanstack/react-router';
import { MessageSquare, SendHorizonal, Square } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/chat')({
  component: Chat,
});

function Chat() {
  const { messages, status, sendMessage, stop } = useChat({
    api: '/api/chat',
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    void sendMessage({ text: message.text });
  };

  return (
    <div className='flex h-full flex-col'>
      <Conversation className='flex-1'>
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              icon={<MessageSquare size={32} />}
              title='Start a conversation'
              description='Send a message to get started'
            />
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <MessageResponse
                        key={i}
                        isAnimating={isStreaming && i === message.parts.length - 1}
                      >
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className='border-t border-border px-4 py-3'>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder='Send a message...' />
          </PromptInputBody>
          <PromptInputFooter>
            <div className='ml-auto'>
              {isStreaming ? (
                <PromptInputButton tooltip='Stop generating' onClick={stop} variant='ghost'>
                  <Square size={14} />
                </PromptInputButton>
              ) : (
                <PromptInputButton tooltip='Send message' type='submit' variant='ghost'>
                  <SendHorizonal size={14} />
                </PromptInputButton>
              )}
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
