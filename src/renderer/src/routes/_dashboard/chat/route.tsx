import { useChat } from '@ai-sdk/react';
import { ConversationEmptyState } from '@renderer/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@renderer/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@renderer/components/ai-elements/prompt-input';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowDownIcon, MessagesSquare, SendHorizonal, Square } from 'lucide-react';
import { useStickToBottom } from 'use-stick-to-bottom';

import { DashboardHeaderStartContent } from '../-components/dashboard-header-portal';

export const Route = createFileRoute('/_dashboard/chat')({
  component: Chat,
});

function Chat() {
  const { messages, status, sendMessage, stop } = useChat();
  const { contentRef, isAtBottom, scrollRef, scrollToBottom } = useStickToBottom({
    initial: 'smooth',
    resize: 'smooth',
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    void sendMessage({ text: message.text });
  };

  return (
    <div className='-mx-2.5 -mb-2.5 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background'>
      <DashboardHeaderStartContent>
        <div className='flex items-center gap-2'>
          <MessagesSquare className='size-4 text-muted-foreground' />
          <span className='text-sm font-medium text-foreground'>Chat</span>
        </div>
      </DashboardHeaderStartContent>

      <div className='relative min-h-0 flex-1'>
        <ScrollArea className='h-full' viewportClassName='scroll-smooth' viewportRef={scrollRef}>
          <div
            ref={contentRef}
            className='mx-auto flex min-h-full w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6'
          >
            {messages.length === 0 && (
              <ConversationEmptyState
                icon={<MessagesSquare size={32} />}
                title='Start a conversation'
                description='Send a message to get started'
                className='mt-24 min-h-full'
              />
            )}

            {messages.map((message) => (
              <Message key={message.id} className='max-w-[85%]' from={message.role}>
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
          </div>
        </ScrollArea>

        {!isAtBottom && (
          <Button
            className='absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full'
            onClick={() => scrollToBottom()}
            size='icon'
            type='button'
            variant='outline'
          >
            <ArrowDownIcon className='size-4' />
          </Button>
        )}
      </div>

      <div className=''>
        <div className='mx-auto w-full max-w-4xl px-4 pb-1 sm:px-6'>
          <PromptInput
            className='rounded-2xl border border-border/70 bg-white shadow-xs'
            onSubmit={handleSubmit}
          >
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
    </div>
  );
}
