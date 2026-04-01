import { os, streamToEventIterator, type } from '@orpc/server';

import { createWorkspaceAgentRuntime, type WorkspaceAgentUIMessage } from '../agents';
import { ChatMessageRepository } from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';
import { ChatService } from '../services/chat-service';
import { SkillService } from '../services/skill-service';

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

  const workspaceRoot = process.cwd();
  const skillService = new SkillService({ workspaceRoot });

  // Discover skills once at startup; the list is refreshed on each chat stream
  // so newly added skills are picked up without restarting the app.
  let cachedSkills = skillService.listInstalledSkills().then((r) => r.skills);

  const workspaceAgentRuntime = createWorkspaceAgentRuntime({
    skillService,
    // Initial empty skills – will be populated once discovery completes.
    skills: [],
    workspaceRoot,
  });

  const chatService = new ChatService({
    agent: workspaceAgentRuntime.agent,
    getModelName: () => workspaceAgentRuntime.modelName,
    getSystemPrompt: () => workspaceAgentRuntime.instructions,
    messageRepository,
    sessionRepository,
    skillService,
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
    dashboard: {
      summary: os.input(emptyInput).handler(async () => chatService.getDashboardSummary()),
    },
    skills: {
      list: os.input(emptyInput).handler(async () => skillService.listInstalledSkills()),
      // Allow renderer to trigger a re-scan of skills directories.
      refresh: os.input(emptyInput).handler(async () => {
        cachedSkills = skillService.listInstalledSkills().then((r) => r.skills);
        return cachedSkills;
      }),
    },
    system: {
      info: os.input(emptyInput).handler(async () => deps.getSystemInfo()),
    },
  };
}
