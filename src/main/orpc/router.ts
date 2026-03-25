import { os, streamToEventIterator, type } from '@orpc/server';

import { createWorkspaceAgentRuntime, type WorkspaceAgentUIMessage } from '../agents';
import { ChatMessageRepository } from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';
import { ChatService } from '../services/chat-service';

const emptyInput = type<void>();
const createChatSessionInput = type<{ title?: string } | void>();
const chatStreamInput = type<{ sessionId: string; messages: WorkspaceAgentUIMessage[] }>();
const chatSessionByIdInput = type<{ sessionId: string }>();
const renameChatSessionInput = type<{ sessionId: string; title: string }>();

export interface SystemInfo {
  appName: string;
  appVersion: string;
  databasePath: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
}

interface CreateAppRouterDeps {
  getSystemInfo: () => Promise<SystemInfo> | SystemInfo;
}

export function createAppRouter(deps: CreateAppRouterDeps) {
  const sessionRepository = new ChatSessionRepository();
  const messageRepository = new ChatMessageRepository();
  const workspaceAgentRuntime = createWorkspaceAgentRuntime();
  const chatService = new ChatService({
    agent: workspaceAgentRuntime.agent,
    getModelName: () => workspaceAgentRuntime.modelName,
    getSystemPrompt: () => workspaceAgentRuntime.instructions,
    messageRepository,
    sessionRepository,
  });

  return {
    chat: {
      stream: os.input(chatStreamInput).handler(async ({ input }) => {
        return streamToEventIterator(await chatService.streamChat(input));
      }),
    },
    chatMessage: {
      listBySession: os
        .input(chatSessionByIdInput)
        .handler(async ({ input }) => chatService.listMessages(input.sessionId)),
    },
    chatSession: {
      archive: os
        .input(chatSessionByIdInput)
        .handler(async ({ input }) => chatService.archiveSession(input.sessionId)),
      create: os
        .input(createChatSessionInput)
        .handler(async ({ input }) => chatService.createSession(input ?? {})),
      get: os
        .input(chatSessionByIdInput)
        .handler(async ({ input }) => chatService.getSession(input.sessionId)),
      list: os.input(emptyInput).handler(async () => chatService.listSessions()),
      remove: os
        .input(chatSessionByIdInput)
        .handler(async ({ input }) => chatService.removeSession(input.sessionId)),
      rename: os
        .input(renameChatSessionInput)
        .handler(async ({ input }) => chatService.renameSession(input.sessionId, input.title)),
    },
    system: {
      info: os.input(emptyInput).handler(async () => deps.getSystemInfo()),
    },
  };
}
