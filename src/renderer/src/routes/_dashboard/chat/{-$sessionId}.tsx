import { useChat } from '@ai-sdk/react';
import type { PromptInputMessage } from '@renderer/components/ai-elements/prompt-input';
import { orpc, orpcChatTransport, orpcClient } from '@renderer/lib/orpc';
import { queryClient } from '@renderer/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { startTransition, useEffect, useRef, useState } from 'react';

import { DashboardHeaderStartContent } from '../-components/dashboard-header-portal';
import { SidebarMiddleContent } from '../-components/sidebar-portal';
import type { WorkspaceAgentUIMessage } from '../../../../../main/agents';
import { ChatComposer, ChatMessagesPane, ChatSessionList } from './-components';

export const Route = createFileRoute('/_dashboard/chat/{-$sessionId}')({
  component: Chat,
});

const newChatNavigation = {
  params: { sessionId: undefined } as { sessionId?: string },
  to: '/chat/{-$sessionId}' as const,
};

function Chat() {
  const { sessionId } = Route.useParams();
  const [pendingDraftMessage, setPendingDraftMessage] = useState<PromptInputMessage | null>(null);
  const [pendingDraftSessionId, setPendingDraftSessionId] = useState<string | null>(null);
  const navigate = Route.useNavigate();

  const navigateToNewChat = () => {
    setPendingDraftMessage(null);
    setPendingDraftSessionId(null);
    startTransition(() => {
      void navigate(newChatNavigation as never);
    });
  };

  return (
    <ChatWorkspace
      activeSessionId={sessionId ?? null}
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
      pendingDraftMessage={pendingDraftSessionId === sessionId ? pendingDraftMessage : null}
    />
  );
}

function ChatWorkspace(props: {
  activeSessionId: string | null;
  onConsumePendingDraft: () => void;
  onCreateSession: () => void;
  onCreateSessionFromDraft: (message: PromptInputMessage) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  pendingDraftMessage: PromptInputMessage | null;
}) {
  const navigate = Route.useNavigate();
  const sessionListQuery = useQuery(orpc.chatSession.list.queryOptions());
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', props.activeSessionId],
    queryFn: async () => {
      if (!props.activeSessionId) {
        return [] as WorkspaceAgentUIMessage[];
      }

      return orpcClient.chatMessage.listBySession({ sessionId: props.activeSessionId });
    },
    enabled: !!props.activeSessionId,
  });

  const sessions = sessionListQuery.data;
  const activeSession = props.activeSessionId
    ? (sessions?.find((session) => session.id === props.activeSessionId) ?? null)
    : null;

  useEffect(() => {
    if (!props.activeSessionId || !sessionListQuery.isSuccess || !sessions) {
      return;
    }

    if (!sessions.some((session) => session.id === props.activeSessionId)) {
      void navigate({ ...newChatNavigation, replace: true } as never);
    }
  }, [navigate, props.activeSessionId, sessionListQuery.isSuccess, sessions]);

  if (props.activeSessionId && !messagesQuery.isSuccess) {
    return (
      <ChatWorkspaceLayout
        activeSessionId={props.activeSessionId}
        activeSessionTitle={activeSession?.title ?? 'New Chat'}
        onCreateSession={props.onCreateSession}
        onDeleteSession={props.onDeleteSession}
        sessions={sessions}
        sidebarPending={sessionListQuery.isPending}
      >
        <ChatWorkspaceLoadingBody isSessionLoading={messagesQuery.isPending} />
      </ChatWorkspaceLayout>
    );
  }

  return (
    <ChatWorkspaceLayout
      activeSessionId={props.activeSessionId}
      activeSessionTitle={activeSession?.title ?? 'New Chat'}
      onDeleteSession={props.onDeleteSession}
      onCreateSession={props.onCreateSession}
      sessions={sessions}
      sidebarPending={sessionListQuery.isPending}
    >
      <ChatWorkspaceRuntime
        key={props.activeSessionId ?? 'new-chat'}
        activeSessionId={props.activeSessionId}
        initialMessages={messagesQuery.data ?? []}
        isSessionLoading={!!props.activeSessionId && messagesQuery.isPending}
        onConsumePendingDraft={props.onConsumePendingDraft}
        onCreateSessionFromDraft={props.onCreateSessionFromDraft}
        pendingDraftMessage={props.pendingDraftMessage}
      />
    </ChatWorkspaceLayout>
  );
}

function ChatWorkspaceLayout(props: {
  activeSessionId: string | null;
  activeSessionTitle: string;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  children: React.ReactNode;
  sessions?: Array<{ id: string; title: string }>;
  sidebarPending: boolean;
}) {
  return (
    <div className='flex h-[calc(100vh-46px)] overflow-hidden pb-2 px-2'>
      <DashboardHeaderStartContent>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-foreground'>{props.activeSessionTitle}</span>
        </div>
      </DashboardHeaderStartContent>

      <SidebarMiddleContent>
        <ChatSessionList
          activeSessionId={props.activeSessionId}
          onCreateSession={props.onCreateSession}
          onDeleteSession={props.onDeleteSession}
          sessions={props.sessions}
          sidebarPending={props.sidebarPending}
        />
      </SidebarMiddleContent>

      <div className='@container/chat-workspace flex min-w-0 flex-1 flex-col'>{props.children}</div>
    </div>
  );
}

function ChatWorkspaceLoadingBody(props: { isSessionLoading: boolean }) {
  return (
    <>
      <div className='relative min-h-0 flex-1'>
        <div className='mx-auto min-h-full w-full max-w-4xl'></div>
      </div>

      <ChatComposer
        isSessionLoading={props.isSessionLoading}
        isStreaming={false}
        onStop={() => {}}
        onSubmit={() => {}}
      />
    </>
  );
}

function ChatWorkspaceRuntime(props: {
  activeSessionId: string | null;
  initialMessages: WorkspaceAgentUIMessage[];
  isSessionLoading: boolean;
  onConsumePendingDraft: () => void;
  onCreateSessionFromDraft: (message: PromptInputMessage) => Promise<void>;
  pendingDraftMessage: PromptInputMessage | null;
}) {
  const { activeSessionId, onConsumePendingDraft, pendingDraftMessage } = props;
  const pendingDraftTriggeredRef = useRef(false);
  const wasStreamingRef = useRef(false);
  const { addToolApprovalResponse, messages, status, sendMessage, stop } =
    useChat<WorkspaceAgentUIMessage>({
      id: props.activeSessionId ?? 'new-chat',
      messages: props.initialMessages,
      // Once every approval in the last assistant step has a response, resume the server-side tool
      // loop automatically without requiring another manual submit.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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

  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!activeSessionId || !pendingDraftMessage || pendingDraftTriggeredRef.current) {
      return;
    }

    pendingDraftTriggeredRef.current = true;

    void sendMessage({ text: pendingDraftMessage?.text }).finally(() => {
      onConsumePendingDraft();
    });
  }, [activeSessionId, onConsumePendingDraft, pendingDraftMessage, sendMessage]);

  useEffect(() => {
    const isCurrentlyStreaming = status === 'streaming' || status === 'submitted';

    // Approval resumptions do not go through handleSubmit, so refresh persisted queries whenever a
    // stream settles.
    if (wasStreamingRef.current && !isCurrentlyStreaming) {
      void queryClient.invalidateQueries();
    }

    wasStreamingRef.current = isCurrentlyStreaming;
  }, [status]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() || props.isSessionLoading) {
      return;
    }

    if (!props.activeSessionId) {
      void props.onCreateSessionFromDraft(message);
      return;
    }

    void sendMessage({ text: message.text });
  };

  const handleApprovalResponse = (approvalId: string, approved: boolean) => {
    void addToolApprovalResponse({
      approved,
      id: approvalId,
    });
  };

  return (
    <>
      <ChatMessagesPane
        isStreaming={isStreaming}
        messages={messages}
        onRespondToApproval={handleApprovalResponse}
      />

      <ChatComposer
        isSessionLoading={props.isSessionLoading}
        isStreaming={isStreaming}
        onStop={stop}
        onSubmit={handleSubmit}
      />
    </>
  );
}
