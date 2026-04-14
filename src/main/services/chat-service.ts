import {
  createAgentUIStream,
  createUIMessageStream,
  isToolUIPart,
  type LanguageModelUsage,
  type UIMessageChunk,
} from 'ai';

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

// Safety cap on the external step loop. In practice the model almost always
// stops earlier (either finishReason !== tool-calls, or a tool requests
// approval / user input). This exists to catch runaway behavior.
const MAX_AGENT_STEPS = 30;
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

// Detect whether the assistant turn should pause and wait for the user before
// the outer loop starts another step. This mirrors open-agents'
// `shouldPauseForToolInteraction`: we stop if any tool is awaiting approval or
// is a client-side tool (no execute, state stays at input-available).
function shouldPauseForToolInteraction(parts: WorkspaceAgentUIMessage['parts']) {
  for (const part of parts) {
    if (!isToolUIPart(part)) {
      continue;
    }

    if (part.state === 'approval-requested') {
      return true;
    }

    if (part.state === 'input-available') {
      // A tool call with input-available AND no later output means the AI SDK
      // yielded control because the tool has no server-side execute (e.g.
      // askUserQuestion). The UI will collect the answer and resubmit.
      return true;
    }
  }

  return false;
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

  async streamChat(input: StreamChatInput): Promise<ReadableStream<UIMessageChunk>> {
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
      // Continuations (approval responses, ask-user-question answers) reuse the
      // existing assistant row so the external loop can resume its parts.
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

    const deps = this.deps;
    const sessionId = input.sessionId;
    // Reload skills at the start of this chat turn so newly added skills appear
    // without restarting the app. This is a single fetch for the whole loop —
    // within a turn the set does not change.
    const { skills } = await deps.skillService.listInstalledSkills();
    const skillOptions = skills.map((s) => ({
      name: s.name,
      description: s.description,
      location: s.location,
    }));

    return createUIMessageStream<WorkspaceAgentUIMessage>({
      originalMessages: input.messages,
      generateId: () => assistantMessageId,
      onError: (error) => (error instanceof Error ? error.message : 'Unknown agent stream error'),
      // The single entry point for the entire multi-step agent turn. Each
      // iteration runs ONE agent step (stepCountIs(1)) and then decides
      // explicitly whether to continue, pause for the user, or terminate.
      execute: async ({ writer }) => {
        let aggregatedUsage = createEmptyUsage();
        let currentMessages: WorkspaceAgentUIMessage[] = input.messages;
        let lastAssistantResponse: WorkspaceAgentUIMessage | null = null;
        let finalStatus: 'done' | 'aborted' | 'error' = 'done';
        let finalErrorText: string | null = null;

        try {
          for (let stepIndex = 0; stepIndex < MAX_AGENT_STEPS; stepIndex += 1) {
            let stepFinishReason: string | undefined;
            let stepAssistant: WorkspaceAgentUIMessage | undefined;
            let stepAborted = false;
            let stepErrorMessage: string | null = null;

            const stepStream = await createAgentUIStream<
              { skills: typeof skillOptions; subagentModel?: unknown },
              WorkspaceAgent['tools']
            >({
              agent: deps.agent,
              uiMessages: currentMessages,
              options: { skills: skillOptions },
              originalMessages: currentMessages,
              generateMessageId: () => assistantMessageId,
              onStepFinish: ({ usage, finishReason }) => {
                aggregatedUsage = mergeUsage(aggregatedUsage, usage);
                stepFinishReason = finishReason;
              },
              onFinish: ({ isAborted, responseMessage }) => {
                stepAborted = isAborted;
                stepAssistant = responseMessage as WorkspaceAgentUIMessage;
              },
              onError: (error) => {
                stepErrorMessage = error instanceof Error ? error.message : String(error);
                return stepErrorMessage ?? 'Unknown agent stream error';
              },
            });

            // Forward every UI chunk from this step into the outer writer. We
            // iterate explicitly (rather than writer.merge) so the `for await`
            // only resolves once this step's stream closes — at which point
            // onFinish has already fired and we can inspect the step result
            // before starting the next iteration.
            for await (const chunk of stepStream) {
              writer.write(chunk);
            }

            if (stepErrorMessage) {
              finalStatus = 'error';
              finalErrorText = stepErrorMessage;
              break;
            }

            if (stepAborted) {
              finalStatus = 'aborted';
              if (stepAssistant) lastAssistantResponse = stepAssistant;
              break;
            }

            if (stepAssistant) {
              lastAssistantResponse = stepAssistant;

              // Persist this step's progress. The same assistant row accumulates
              // parts across steps because the AI SDK keeps the id stable via
              // generateMessageId.
              await deps.messageRepository.updateMessage(assistantMessageId, {
                metadata: {
                  finishedAt: Date.now(),
                  modelId: deps.getModelName(),
                  usage: aggregatedUsage,
                  usageSource: 'provider',
                },
                parts: stepAssistant.parts,
                status: 'streaming',
                errorText: null,
              });
            }

            // Continuation decision — mirrors open-agents' chat.ts:
            //   - tool-calls + no human pause → loop again
            //   - anything else (stop / length / content-filter / error)    → done
            //   - awaiting approval / ask-user-question                      → pause
            const assistantParts = stepAssistant?.parts ?? lastAssistantResponse?.parts ?? [];
            const shouldContinue =
              stepFinishReason === 'tool-calls' && !shouldPauseForToolInteraction(assistantParts);

            if (!shouldContinue) {
              break;
            }

            // Rebuild the message list for the next step: replace the previous
            // trailing message (placeholder/user/assistant-in-progress) with the
            // updated assistant so the model sees its own prior tool calls and
            // results and knows to continue the turn.
            if (stepAssistant) {
              const rebuilt = currentMessages.filter(
                (message) => message.role !== 'assistant' || message.id !== assistantMessageId,
              );
              currentMessages = [...rebuilt, stepAssistant];
            }
          }
        } catch (error) {
          finalStatus = 'error';
          finalErrorText = error instanceof Error ? error.message : 'Unknown chat stream error';
        }

        // Finalize the persisted assistant row. If the loop paused because a
        // tool needs the user (approval/ask-user-question), we still record
        // status 'streaming' so the next request continues the same row.
        const paused =
          finalStatus === 'done' &&
          lastAssistantResponse !== null &&
          shouldPauseForToolInteraction(lastAssistantResponse.parts);

        await deps.messageRepository.updateMessage(assistantMessageId, {
          metadata: {
            finishedAt: Date.now(),
            modelId: deps.getModelName(),
            usage: aggregatedUsage,
            usageSource: 'provider',
          },
          parts: lastAssistantResponse?.parts ?? [],
          status: paused ? 'streaming' : finalStatus,
          errorText: finalErrorText,
        });
        await deps.sessionRepository.touch(sessionId);
      },
    });
  }
}
