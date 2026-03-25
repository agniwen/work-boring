import { createAgentUIStream } from 'ai';

import type { WorkspaceAgent, WorkspaceAgentUIMessage } from '../agents';
import { ChatMessageRepository } from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';

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
}

type AgentUIMessageStream = Awaited<ReturnType<typeof createAgentUIStream>>;

function extractLastUserMessage(messages: WorkspaceAgentUIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];

    if (message?.role === 'user') {
      return message;
    }
  }

  return null;
}

function getTextFromMessage(message: WorkspaceAgentUIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
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

  async streamChat(input: StreamChatInput): Promise<AgentUIMessageStream> {
    const session = await this.deps.sessionRepository.getById(input.sessionId);

    if (!session) {
      throw new Error(`Chat session not found: ${input.sessionId}`);
    }

    const lastUserMessage = extractLastUserMessage(input.messages);

    if (!lastUserMessage) {
      throw new Error('Missing user message to persist.');
    }

    const lastUserText = getTextFromMessage(lastUserMessage);
    const userSequence = await this.deps.messageRepository.getNextSequence(input.sessionId);
    await this.deps.messageRepository.createMessage({
      sessionId: input.sessionId,
      role: 'user',
      parts: lastUserMessage.parts,
      status: 'done',
      sequence: userSequence,
    });

    await this.deps.sessionRepository.updateTitleFromFirstMessage(session, lastUserText);
    await this.deps.sessionRepository.touch(input.sessionId);

    const assistantMessage = await this.deps.messageRepository.createMessage({
      sessionId: input.sessionId,
      role: 'assistant',
      parts: [],
      status: 'streaming',
      sequence: userSequence + 1,
    });

    try {
      return await createAgentUIStream({
        agent: this.deps.agent,
        uiMessages: input.messages,
        originalMessages: input.messages,
        generateMessageId: () => assistantMessage.id,
        onFinish: async ({ isAborted, responseMessage }) => {
          const status = isAborted ? 'aborted' : 'done';

          await this.deps.messageRepository.updateMessage(assistantMessage.id, {
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

      await this.deps.messageRepository.updateMessage(assistantMessage.id, {
        parts: [],
        status: 'error',
        errorText,
      });
      await this.deps.sessionRepository.touch(input.sessionId);

      throw error;
    }
  }
}
