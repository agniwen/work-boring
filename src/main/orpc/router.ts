import { createDeepSeek } from '@ai-sdk/deepseek';
import { os, streamToEventIterator, type } from '@orpc/server';

import { ChatMessageRepository } from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';
import { ChatService } from '../services/chat-service';

const emptyInput = type<void>();
const createChatSessionInput = type<{ title?: string } | void>();
const chatStreamInput = type<{ sessionId: string; messages: import('ai').UIMessage[] }>();
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

function getMainEnv() {
  return {
    deepSeekApiKey: import.meta.env.MAIN_VITE_DEEPSEEK_API_KEY ?? process.env['DEEPSEEK_API_KEY'],
    deepSeekBaseUrl:
      import.meta.env.MAIN_VITE_DEEPSEEK_BASE_URL ??
      import.meta.env.MAIN_VITE_DEEPSEEK_BASEURL ??
      process.env['DEEPSEEK_BASE_URL'] ??
      process.env['DEEPSEEK_BASEURL'],
    deepSeekModel: import.meta.env.MAIN_VITE_DEEPSEEK_MODEL ?? process.env['DEEPSEEK_MODEL'],
  };
}

function getDeepSeekProvider() {
  const { deepSeekApiKey, deepSeekBaseUrl } = getMainEnv();
  const apiKey = deepSeekApiKey?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing DeepSeek API key. Set MAIN_VITE_DEEPSEEK_API_KEY in .env or DEEPSEEK_API_KEY in the process environment.',
    );
  }

  return createDeepSeek({
    apiKey,
    baseURL: deepSeekBaseUrl?.trim() || undefined,
  });
}

export function createAppRouter(deps: CreateAppRouterDeps) {
  const sessionRepository = new ChatSessionRepository();
  const messageRepository = new ChatMessageRepository();
  const chatService = new ChatService({
    getModel: () => getDeepSeekProvider()(getMainEnv().deepSeekModel?.trim() || 'deepseek-chat'),
    getModelName: () => getMainEnv().deepSeekModel?.trim() || 'deepseek-chat',
    getSystemPrompt: () => 'You are a helpful assistant for a desktop productivity app.',
    messageRepository,
    sessionRepository,
  });

  return {
    chat: {
      stream: os.input(chatStreamInput).handler(async ({ input }) => {
        const result = await chatService.streamChat(input);
        return streamToEventIterator(result.toUIMessageStream());
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
