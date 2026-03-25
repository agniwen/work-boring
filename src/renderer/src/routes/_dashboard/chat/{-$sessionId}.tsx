import { useChat } from '@ai-sdk/react';
import {
  Card,
  Button as HeroButton,
  Label,
  ListBox,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@heroui/react';
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
import { orpc, orpcChatTransport, orpcClient } from '@renderer/lib/orpc';
import { queryClient } from '@renderer/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { UIMessage } from 'ai';
import { ArrowDownIcon, MessagesSquare, Plus, SendHorizonal, Square, Trash2 } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

import { DashboardHeaderStartContent } from '../-components/dashboard-header-portal';
import { SidebarMiddleContent } from '../-components/sidebar-portal';

export const Route = createFileRoute('/_dashboard/chat/{-$sessionId}')({
  component: Chat,
});

const newChatNavigation = {
  params: { sessionId: undefined } as { sessionId?: string },
  to: '/chat/{-$sessionId}' as const,
};

function Chat() {
  const navigate = Route.useNavigate();
  const { sessionId } = Route.useParams();
  const [pendingDraftMessage, setPendingDraftMessage] = useState<PromptInputMessage | null>(null);
  const [pendingDraftSessionId, setPendingDraftSessionId] = useState<string | null>(null);
  const sessionListQuery = useQuery(orpc.chatSession.list.queryOptions());
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return [] as UIMessage[];
      }

      return orpcClient.chatMessage.listBySession({ sessionId });
    },
    enabled: !!sessionId,
  });

  const sessions = sessionListQuery.data;
  const activeSession = sessionId
    ? (sessions?.find((session) => session.id === sessionId) ?? null)
    : null;

  useEffect(() => {
    if (!sessionId || !sessionListQuery.isSuccess) {
      return;
    }

    if (!sessions?.some((session) => session.id === sessionId)) {
      void navigate({ ...newChatNavigation, replace: true } as never);
    }
  }, [navigate, sessionId, sessionListQuery.isSuccess, sessions]);

  const navigateToNewChat = () => {
    setPendingDraftMessage(null);
    setPendingDraftSessionId(null);
    startTransition(() => {
      void navigate(newChatNavigation as never);
    });
  };

  return (
    <ChatWorkspace
      key={sessionId ? `${sessionId}:${messagesQuery.isSuccess ? 'ready' : 'loading'}` : 'new-chat'}
      activeSessionId={sessionId ?? null}
      activeSessionTitle={activeSession?.title ?? 'New Chat'}
      initialMessages={messagesQuery.data ?? []}
      isSessionLoading={!!sessionId && messagesQuery.isPending}
      onConsumePendingDraft={() => {
        setPendingDraftMessage(null);
        setPendingDraftSessionId(null);
      }}
      onCreateSession={() => {
        navigateToNewChat();
      }}
      onCreateSessionFromDraft={async (message) => {
        const session = await orpcClient.chatSession.create({});
        setPendingDraftMessage(message);
        setPendingDraftSessionId(session.id);
        await queryClient.invalidateQueries();
        startTransition(() => {
          void navigate({
            params: { sessionId: session.id } as { sessionId?: string },
            to: '/chat/{-$sessionId}',
          });
        });
      }}
      onDeleteSession={async (deletedSessionId) => {
        await orpcClient.chatSession.remove({ sessionId: deletedSessionId });
        await queryClient.invalidateQueries();
        if (deletedSessionId === sessionId) {
          navigateToNewChat();
        }
      }}
      onSelectSession={(nextSessionId) => {
        startTransition(() => {
          void navigate({
            params: { sessionId: nextSessionId } as { sessionId?: string },
            to: '/chat/{-$sessionId}',
          });
        });
      }}
      pendingDraftMessage={pendingDraftSessionId === sessionId ? pendingDraftMessage : null}
      sidebarPending={sessionListQuery.isPending}
      sessions={sessions || []}
    />
  );
}

function ChatWorkspace(props: {
  activeSessionId: string | null;
  activeSessionTitle: string;
  initialMessages: UIMessage[];
  isSessionLoading: boolean;
  onConsumePendingDraft: () => void;
  onCreateSession: () => void;
  onCreateSessionFromDraft: (message: PromptInputMessage) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
  pendingDraftMessage: PromptInputMessage | null;
  sidebarPending: boolean;
  sessions: Array<{ id: string; title: string }>;
}) {
  const { activeSessionId, onConsumePendingDraft, pendingDraftMessage } = props;
  const pendingDraftTriggeredRef = useRef(false);
  const { messages, status, sendMessage, stop } = useChat({
    id: props.activeSessionId ?? 'new-chat',
    messages: props.initialMessages,
    transport: {
      ...orpcChatTransport,
      sendMessages: (options) => {
        if (!props.activeSessionId) {
          throw new Error('Cannot send a persisted chat message without a session id.');
        }

        return orpcChatTransport.sendMessages({
          ...options,
          sessionId: props.activeSessionId,
        });
      },
    },
  });
  const { contentRef, isAtBottom, scrollRef, scrollToBottom } = useStickToBottom({
    initial: 'smooth',
    resize: 'smooth',
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!activeSessionId || !pendingDraftMessage || pendingDraftTriggeredRef.current) {
      return;
    }

    pendingDraftTriggeredRef.current = true;

    void sendMessage({ text: pendingDraftMessage?.text })
      .then(() => queryClient.invalidateQueries())
      .finally(() => {
        onConsumePendingDraft();
      });
  }, [activeSessionId, onConsumePendingDraft, pendingDraftMessage, sendMessage]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() || props.isSessionLoading) return;

    if (!props.activeSessionId) {
      void props.onCreateSessionFromDraft(message);
      return;
    }

    void sendMessage({ text: message.text }).then(() => queryClient.invalidateQueries());
  };

  return (
    <div className='-mx-2.5 -mb-2.5 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background'>
      <DashboardHeaderStartContent>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-foreground'>{props.activeSessionTitle}</span>
        </div>
      </DashboardHeaderStartContent>

      <SidebarMiddleContent>
        <div className='flex h-full min-h-0 flex-col'>
          <div className='border-b border-border/70 px-3 py-3'>
            <div className='flex items-center justify-between gap-2'>
              <div>
                <p className='text-sm font-medium'>Sessions</p>
                <p className='text-xs text-muted-foreground'>{props.sessions.length} saved chats</p>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <HeroButton
                    aria-label='New session'
                    className='size-8 min-w-8'
                    isIconOnly
                    onPress={props.onCreateSession}
                    size='sm'
                    variant='ghost'
                  >
                    <Plus className='size-4' />
                  </HeroButton>
                </TooltipTrigger>
                <TooltipContent>New session</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <ScrollArea className='flex-1'>
            <div className='py-3'>
              <ListBox
                aria-label='Sessions'
                className='w-full'
                selectedKeys={props.activeSessionId ? [props.activeSessionId] : []}
                selectionMode='single'
              >
                {props.sessions.map((session) => (
                  <ListBox.Item
                    key={session.id}
                    id={session.id}
                    textValue={session.title}
                    className='py-1 **:data-[slot=label]:text-foreground/40 data-[selected=true]:**:data-[slot=label]:text-foreground'
                    onPress={() => props.onSelectSession(session.id)}
                  >
                    <div className='flex w-full items-center justify-between gap-3'>
                      <Label className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {session.title}
                      </Label>
                      <HeroButton
                        aria-label='Delete session'
                        isIconOnly
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onPress={() => {
                          void props.onDeleteSession(session.id);
                        }}
                        size='sm'
                        variant='ghost'
                      >
                        <Trash2 className='size-4' />
                      </HeroButton>
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
              {props.sidebarPending ? (
                <div className='rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground'>
                  Loading sessions...
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </SidebarMiddleContent>

      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='relative min-h-0 flex-1'>
          <ScrollArea className='h-full' viewportClassName='scroll-smooth' viewportRef={scrollRef}>
            <div
              ref={contentRef}
              className='mx-auto flex min-h-full w-full max-w-4xl flex-col gap-0 px-4 py-6 sm:px-6'
            >
              {props.isSessionLoading ? (
                <ConversationEmptyState
                  className='mt-24 min-h-full'
                  description='Loading saved messages'
                  icon={<MessagesSquare size={32} />}
                  title='Loading conversation'
                />
              ) : messages.length === 0 ? (
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

        <div className='mx-auto w-full max-w-4xl px-4 pb-2'>
          <Card className='relative z-9999 bg-white p-0'>
            <PromptInput className='rounded-2xl' onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  className='pt-4'
                  disabled={props.isSessionLoading}
                  placeholder='Send a message...'
                />
              </PromptInputBody>
              <PromptInputFooter>
                <div className='ml-auto'>
                  {isStreaming ? (
                    <PromptInputButton tooltip='Stop generating' onClick={stop} variant='tertiary'>
                      <Square size={14} />
                    </PromptInputButton>
                  ) : (
                    <PromptInputButton
                      disabled={props.isSessionLoading}
                      tooltip='Send message'
                      type='submit'
                      variant='default'
                    >
                      <SendHorizonal size={14} />
                    </PromptInputButton>
                  )}
                </div>
              </PromptInputFooter>
            </PromptInput>
          </Card>
        </div>
      </div>
    </div>
  );
}
