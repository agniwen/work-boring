import type { UIMessage } from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { getDb } from '../client';
import { chatMessages, type ChatMessageRow } from '../schema';

function now() {
  return Date.now();
}

function parseParts(partsJson: string) {
  return JSON.parse(partsJson) as UIMessage['parts'];
}

export class ChatMessageRepository {
  async listBySession(sessionId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.sequence);

    return rows.map((row) => this.toUIMessage(row));
  }

  async getNextSequence(sessionId: string) {
    const db = getDb();
    const rows = await db
      .select({ sequence: chatMessages.sequence })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.sequence);

    const last = rows.at(-1);
    return (last?.sequence ?? 0) + 1;
  }

  async createMessage(input: {
    sessionId: string;
    role: UIMessage['role'];
    parts: UIMessage['parts'];
    status: string;
    errorText?: string | null;
    sequence?: number;
  }) {
    const db = getDb();
    const timestamp = now();
    const sequence = input.sequence ?? (await this.getNextSequence(input.sessionId));
    const [message] = await db
      .insert(chatMessages)
      .values({
        id: nanoid(),
        sessionId: input.sessionId,
        role: input.role,
        partsJson: JSON.stringify(input.parts),
        status: input.status,
        sequence,
        createdAt: timestamp,
        updatedAt: timestamp,
        errorText: input.errorText ?? null,
        metadata: null,
      })
      .returning();

    return message;
  }

  async updateMessage(
    messageId: string,
    input: { parts?: UIMessage['parts']; status: string; errorText?: string | null },
  ) {
    const db = getDb();
    const updatePayload: Partial<typeof chatMessages.$inferInsert> = {
      status: input.status,
      updatedAt: now(),
      errorText: input.errorText ?? null,
    };

    if (input.parts) {
      updatePayload.partsJson = JSON.stringify(input.parts);
    }

    const [message] = await db
      .update(chatMessages)
      .set(updatePayload)
      .where(eq(chatMessages.id, messageId))
      .returning();

    return message ?? null;
  }

  toUIMessage(row: ChatMessageRow): UIMessage {
    return {
      id: row.id,
      role: row.role as UIMessage['role'],
      parts: parseParts(row.partsJson),
    };
  }
}
