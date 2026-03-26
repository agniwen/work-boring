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

function getLastMessage(messages: WorkspaceAgentUIMessage[]) {
  return messages.at(-1) ?? null;
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

    const lastMessage = getLastMessage(input.messages);

    if (!lastMessage || (lastMessage.role !== 'user' && lastMessage.role !== 'assistant')) {
      throw new Error('Chat streaming requires a trailing user or assistant message.');
    }

    let assistantMessageId: string;

    if (lastMessage.role === 'user') {
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
      return await createAgentUIStream({
        agent: this.deps.agent,
        uiMessages: input.messages,
        originalMessages: input.messages,
        generateMessageId: () => assistantMessageId,
        onFinish: async ({ isAborted, responseMessage }) => {
          const status = isAborted ? 'aborted' : 'done';

          await this.deps.messageRepository.updateMessage(assistantMessageId, {
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
        parts: [],
        status: 'error',
        errorText,
      });
      await this.deps.sessionRepository.touch(input.sessionId);

      throw error;
    }
  }
}
