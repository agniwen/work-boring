import { convertToModelMessages, streamText, type UIMessage } from 'ai';

import { ChatMessageRepository } from '../db/repositories/chat-message-repo';
import { ChatSessionRepository } from '../db/repositories/chat-session-repo';

interface StreamChatInput {
  messages: UIMessage[];
  sessionId: string;
}

interface ChatServiceDeps {
  getModel: () => Parameters<typeof streamText>[0]['model'];
  getModelName: () => string;
  getSystemPrompt: () => string;
  messageRepository: ChatMessageRepository;
  sessionRepository: ChatSessionRepository;
}

type StreamTextResult = ReturnType<typeof streamText>;

function extractLastUserMessage(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];

    if (message?.role === 'user') {
      return message;
    }
  }

  return null;
}

function getTextFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function toAssistantParts(text: string): UIMessage['parts'] {
  if (!text.trim()) {
    return [];
  }

  return [{ type: 'text', text }];
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

  async streamChat(input: StreamChatInput): Promise<StreamTextResult> {
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

    const result = streamText({
      model: this.deps.getModel(),
      system: this.deps.getSystemPrompt(),
      messages: await convertToModelMessages(input.messages),
    });

    void Promise.resolve(result.text).then(
      async (text) => {
        await this.deps.messageRepository.updateMessage(assistantMessage.id, {
          parts: toAssistantParts(text),
          status: 'done',
        });
        await this.deps.sessionRepository.touch(input.sessionId);
      },
      async (error) => {
        const status = error instanceof Error && error.name === 'AbortError' ? 'aborted' : 'error';

        await this.deps.messageRepository.updateMessage(assistantMessage.id, {
          parts: [],
          status,
          errorText: error instanceof Error ? error.message : 'Unknown chat stream error',
        });
        await this.deps.sessionRepository.touch(input.sessionId);
      },
    );

    return result;
  }
}
