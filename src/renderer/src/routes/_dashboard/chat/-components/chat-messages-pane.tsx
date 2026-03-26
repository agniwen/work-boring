import { ConversationEmptyState } from '@renderer/components/ai-elements/conversation';
import { Message, MessageContent } from '@renderer/components/ai-elements/message';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { cn } from '@renderer/lib/utils';
import { ArrowDownIcon, MessagesSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

import type { WorkspaceAgentUIMessage } from '../../../../../../main/agents';
import { ChatMessagePart } from './chat-message-part';

type ChatMessagesPaneProps = {
  isSessionLoading: boolean;
  isStreaming: boolean;
  messages: WorkspaceAgentUIMessage[];
  onRespondToApproval: ((approvalId: string, approved: boolean) => void) | null;
  sessionKey: string | null;
};

export function ChatMessagesPane({
  isSessionLoading,
  isStreaming,
  messages,
  onRespondToApproval,
  sessionKey,
}: ChatMessagesPaneProps) {
  const [allowSmoothResize, setAllowSmoothResize] = useState(false);

  useEffect(() => {
    setAllowSmoothResize(false);

    // Session switches replace the full transcript at once; keep scroll snapping instant until
    // the new layout settles so we do not show a follow-up animation to the bottom.
    const timeoutId = window.setTimeout(() => {
      setAllowSmoothResize(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sessionKey]);

  const { contentRef, isAtBottom, scrollRef, scrollToBottom } = useStickToBottom({
    // Session switches remount this pane; snap to the latest message without animation.
    initial: 'instant',
    resize: allowSmoothResize ? 'smooth' : 'instant',
  });

  return (
    <div
      className={cn('relative min-h-0 flex-1 opacity-100 transition-opacity', {
        'opacity-0': !allowSmoothResize,
      })}
    >
      <ScrollArea className='h-full' viewportRef={scrollRef}>
        <div
          ref={contentRef}
          className='mx-auto flex min-h-full w-full max-w-4xl flex-col gap-0 px-4 py-6 sm:px-6'
        >
          {messages.length === 0 ? (
            <ConversationEmptyState
              className='mt-24 min-h-full'
              description='Send a message to get started'
              icon={<MessagesSquare size={32} />}
              title='Start a conversation'
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
        </div>
      </ScrollArea>

      {isAtBottom ? null : (
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
  );
}
