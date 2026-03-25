import { and, desc, eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { getDb } from '../client';
import { chatMessages, chatSessions, type ChatSessionRow } from '../schema';

export interface CreateChatSessionInput {
  model?: string | null;
  systemPrompt?: string | null;
  title?: string;
}

const DEFAULT_CHAT_TITLE = 'New Chat';

function now() {
  return Date.now();
}

export class ChatSessionRepository {
  async list() {
    const db = getDb();
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(ne(chatSessions.status, 'deleted'))
      .orderBy(desc(chatSessions.lastMessageAt), desc(chatSessions.updatedAt));

    return sessions;
  }

  async getById(sessionId: string) {
    const db = getDb();
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), ne(chatSessions.status, 'deleted')))
      .limit(1);

    return session ?? null;
  }

  async create(input: CreateChatSessionInput = {}) {
    const db = getDb();
    const timestamp = now();
    const id = nanoid();

    const [session] = await db
      .insert(chatSessions)
      .values({
        id,
        title: input.title?.trim() || DEFAULT_CHAT_TITLE,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        lastMessageAt: null,
        model: input.model ?? null,
        systemPrompt: input.systemPrompt ?? null,
        summary: null,
        metadata: null,
      })
      .returning();

    return session;
  }

  async rename(sessionId: string, title: string) {
    const db = getDb();
    const nextTitle = title.trim() || DEFAULT_CHAT_TITLE;
    const [session] = await db
      .update(chatSessions)
      .set({
        title: nextTitle,
        updatedAt: now(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async archive(sessionId: string) {
    const db = getDb();
    const [session] = await db
      .update(chatSessions)
      .set({
        status: 'archived',
        updatedAt: now(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async remove(sessionId: string) {
    const db = getDb();
    const [session] = await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async touch(sessionId: string, timestamp = now()) {
    const db = getDb();
    await db
      .update(chatSessions)
      .set({
        updatedAt: timestamp,
        lastMessageAt: timestamp,
      })
      .where(eq(chatSessions.id, sessionId));
  }

  async updateTitleFromFirstMessage(session: ChatSessionRow, messageText: string) {
    if (session.title !== DEFAULT_CHAT_TITLE) {
      return session;
    }

    const title = messageText.trim().slice(0, 48) || DEFAULT_CHAT_TITLE;
    const renamed = await this.rename(session.id, title);
    return renamed ?? session;
  }

  async countMessages(sessionId: string) {
    const db = getDb();
    const rows = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));

    return rows.length;
  }
}
