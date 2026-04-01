import { createAgentUIStream, type LanguageModelUsage } from 'ai';

import type { WorkspaceAgent, WorkspaceAgentUIMessage } from '../agents';
import {
  ChatMessageRepository,
  type PersistedMessageMetadata,
} from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';
import type { SkillService } from './skill-service';

interface StreamChatInput {
  messages: WorkspaceAgentUIMessage[];
  sessionId: string;
}

interface ChatServiceDeps {
  agent: WorkspaceAgent;
  getModelName: () => string;
  getSystemPrompt: () => string;
  messageRepository: ChatMessageRepository;
  sessionRepository: ChatSessionRepository;
  skillService: SkillService;
}

type AgentUIMessageStream = Awaited<ReturnType<typeof createAgentUIStream>>;
const DASHBOARD_DAYS = 14;

export interface DashboardDailyActivity {
  date: string;
  promptCount: number;
  tokenCount: number;
}

export interface DashboardSummary {
  activeSessionCount: number;
  daily: DashboardDailyActivity[];
  latestSession: Awaited<ReturnType<ChatSessionRepository['getLatest']>>;
  todayPromptCount: number;
  todayTokenCount: number;
  totalPromptCount: number;
  totalTokenCount: number;
}

function getLastMessage(messages: WorkspaceAgentUIMessage[]) {
  return messages.at(-1) ?? null;
}

function getTextFromParts(parts: WorkspaceAgentUIMessage['parts']) {
  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function getTextFromMessage(message: WorkspaceAgentUIMessage) {
  return getTextFromParts(message.parts);
}

function getLocalDayKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyUsage(): LanguageModelUsage {
  return {
    cachedInputTokens: undefined,
    inputTokenDetails: {
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
      noCacheTokens: undefined,
    },
    inputTokens: undefined,
    outputTokenDetails: {
      reasoningTokens: undefined,
      textTokens: undefined,
    },
    outputTokens: undefined,
    reasoningTokens: undefined,
    totalTokens: undefined,
  };
}

function sumTokenValue(left?: number, right?: number) {
  if (left === undefined && right === undefined) {
    return undefined;
  }

  return (left ?? 0) + (right ?? 0);
}

function mergeUsage(
  current: LanguageModelUsage,
  next: LanguageModelUsage | undefined,
): LanguageModelUsage {
  if (!next) {
    return current;
  }

  return {
    cachedInputTokens: sumTokenValue(current.cachedInputTokens, next.cachedInputTokens),
    inputTokenDetails: {
      cacheReadTokens: sumTokenValue(
        current.inputTokenDetails?.cacheReadTokens,
        next.inputTokenDetails?.cacheReadTokens,
      ),
      cacheWriteTokens: sumTokenValue(
        current.inputTokenDetails?.cacheWriteTokens,
        next.inputTokenDetails?.cacheWriteTokens,
      ),
      noCacheTokens: sumTokenValue(
        current.inputTokenDetails?.noCacheTokens,
        next.inputTokenDetails?.noCacheTokens,
      ),
    },
    inputTokens: sumTokenValue(current.inputTokens, next.inputTokens),
    outputTokenDetails: {
      reasoningTokens: sumTokenValue(
        current.outputTokenDetails?.reasoningTokens,
        next.outputTokenDetails?.reasoningTokens,
      ),
      textTokens: sumTokenValue(
        current.outputTokenDetails?.textTokens,
        next.outputTokenDetails?.textTokens,
      ),
    },
    outputTokens: sumTokenValue(current.outputTokens, next.outputTokens),
    reasoningTokens: sumTokenValue(current.reasoningTokens, next.reasoningTokens),
    totalTokens: sumTokenValue(current.totalTokens, next.totalTokens),
  };
}

function estimateTokensFromText(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmedText.length / 4));
}

function getUsageTokenCount(metadata: PersistedMessageMetadata | null, fallbackText: string) {
  const usage = metadata?.usage;
  const totalTokens = usage?.totalTokens ?? sumTokenValue(usage?.inputTokens, usage?.outputTokens);

  if (totalTokens !== undefined) {
    return totalTokens;
  }

  return estimateTokensFromText(fallbackText);
}

export class ChatService {
  constructor(private readonly deps: ChatServiceDeps) {}

  async listSessions() {
    return this.deps.sessionRepository.list();
  }

  async createSession(input?: { title?: string }) {
    return this.deps.sessionRepository.create({
      title: input?.title,
      model: this.deps.getModelName(),
      systemPrompt: this.deps.getSystemPrompt(),
    });
  }

  async getSession(sessionId: string) {
    return this.deps.sessionRepository.getById(sessionId);
  }

  async renameSession(sessionId: string, title: string) {
    return this.deps.sessionRepository.rename(sessionId, title);
  }

  async archiveSession(sessionId: string) {
    return this.deps.sessionRepository.archive(sessionId);
  }

  async removeSession(sessionId: string) {
    return this.deps.sessionRepository.remove(sessionId);
  }

  async listMessages(sessionId: string) {
    return this.deps.messageRepository.listBySession(sessionId);
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [sessions, latestSession, messageRows] = await Promise.all([
      this.deps.sessionRepository.list(),
      this.deps.sessionRepository.getLatest(),
      this.deps.messageRepository.listDashboardRows(),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyMap = new Map<string, DashboardDailyActivity>();

    for (let index = DASHBOARD_DAYS - 1; index >= 0; index -= 1) {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - index);
      const dayKey = getLocalDayKey(date.getTime());

      dailyMap.set(dayKey, {
        date: dayKey,
        promptCount: 0,
        tokenCount: 0,
      });
    }

    let totalPromptCount = 0;
    let totalTokenCount = 0;

    for (const message of messageRows) {
      const messageText = getTextFromParts(message.parts);

      if (message.role === 'user') {
        totalPromptCount += 1;
        const day = dailyMap.get(getLocalDayKey(message.createdAt));

        if (day) {
          day.promptCount += 1;
        }
      }

      if (message.role === 'assistant') {
        const tokenCount = getUsageTokenCount(message.metadata, messageText);
        totalTokenCount += tokenCount;
        const finishedAt = message.metadata?.finishedAt ?? message.updatedAt;
        const day = dailyMap.get(getLocalDayKey(finishedAt));

        if (day) {
          day.tokenCount += tokenCount;
        }
      }
    }

    const today = dailyMap.get(getLocalDayKey(Date.now()));

    return {
      activeSessionCount: sessions.length,
      daily: [...dailyMap.values()],
      latestSession,
      todayPromptCount: today?.promptCount ?? 0,
      todayTokenCount: today?.tokenCount ?? 0,
      totalPromptCount,
      totalTokenCount,
    };
  }

  async streamChat(input: StreamChatInput): Promise<AgentUIMessageStream> {
    const session = await this.deps.sessionRepository.getById(input.sessionId);

    if (!session) {
      throw new Error(`Chat session not found: ${input.sessionId}`);
    }

    const lastMessage = getLastMessage(input.messages);

    if (!lastMessage || (lastMessage.role !== 'user' && lastMessage.role !== 'assistant')) {
      throw new Error('Chat streaming requires a trailing user or assistant message.');
    }

    let assistantMessageId: string;

    if (lastMessage.role === 'user') {
      // Fresh user turns persist a new user row and create a new assistant placeholder.
      const lastUserText = getTextFromMessage(lastMessage);
      const userSequence = await this.deps.messageRepository.getNextSequence(input.sessionId);

      await this.deps.messageRepository.createMessage({
        sessionId: input.sessionId,
        role: 'user',
        parts: lastMessage.parts,
        status: 'done',
        sequence: userSequence,
      });

      await this.deps.sessionRepository.updateTitleFromFirstMessage(session, lastUserText);

      const assistantMessage = await this.deps.messageRepository.createMessage({
        sessionId: input.sessionId,
        role: 'assistant',
        parts: [],
        status: 'streaming',
        sequence: userSequence + 1,
      });

      assistantMessageId = assistantMessage.id;
    } else {
      // Approval/tool continuations reuse the existing assistant row instead of duplicating history.
      const assistantMessage =
        (await this.deps.messageRepository.updateMessage(lastMessage.id, {
          parts: lastMessage.parts,
          status: 'streaming',
          errorText: null,
        })) ??
        (await this.deps.messageRepository.createMessage({
          id: lastMessage.id,
          sessionId: input.sessionId,
          role: 'assistant',
          parts: lastMessage.parts,
          status: 'streaming',
        }));

      assistantMessageId = assistantMessage.id;
    }

    await this.deps.sessionRepository.touch(input.sessionId);

    try {
      let aggregatedUsage = createEmptyUsage();

      // Re-discover skills on each stream so new skills are picked up without restarting.
      const { skills } = await this.deps.skillService.listInstalledSkills();

      return await createAgentUIStream({
        agent: this.deps.agent,
        uiMessages: input.messages,
        options: {
          skills: skills.map((s) => ({
            name: s.name,
            description: s.description,
            location: s.location,
          })),
        },
        // Pass original messages so AI SDK can continue the last assistant message in place after
        // approvals instead of emitting a duplicate assistant turn.
        originalMessages: input.messages,
        generateMessageId: () => assistantMessageId,
        // Record step usage in main so dashboard metrics survive renderer reloads.
        onStepFinish: ({ usage }) => {
          aggregatedUsage = mergeUsage(aggregatedUsage, usage);
        },
        onFinish: async ({ isAborted, responseMessage }) => {
          const status = isAborted ? 'aborted' : 'done';

          await this.deps.messageRepository.updateMessage(assistantMessageId, {
            metadata: {
              finishedAt: Date.now(),
              modelId: this.deps.getModelName(),
              usage: aggregatedUsage,
              usageSource: 'provider',
            },
            parts: responseMessage.parts,
            status,
            errorText: null,
          });
          await this.deps.sessionRepository.touch(input.sessionId);
        },
        onError: (error) => {
          return error instanceof Error ? error.message : 'Unknown agent stream error';
        },
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unknown chat stream error';

      await this.deps.messageRepository.updateMessage(assistantMessageId, {
        metadata: null,
        parts: [],
        status: 'error',
        errorText,
      });
      await this.deps.sessionRepository.touch(input.sessionId);

      throw error;
    }
  }
}
