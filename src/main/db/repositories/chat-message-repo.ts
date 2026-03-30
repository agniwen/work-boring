import type { LanguageModelUsage } from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import type { WorkspaceAgentUIMessage } from '../../agents';
import { getDb } from '../client';
import { chatMessages, type ChatMessageRow } from '../schema';

function now() {
  return Date.now();
}

function parseParts(partsJson: string) {
  return JSON.parse(partsJson) as WorkspaceAgentUIMessage['parts'];
}

export interface PersistedMessageMetadata {
  finishedAt?: number;
  modelId?: string;
  usage?: LanguageModelUsage;
  usageSource?: 'estimated' | 'provider';
}

function parseMetadata(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata) as PersistedMessageMetadata;
  } catch {
    return null;
  }
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
    id?: string;
    sessionId: string;
    role: WorkspaceAgentUIMessage['role'];
    parts: WorkspaceAgentUIMessage['parts'];
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
        id: input.id ?? nanoid(),
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
    input: {
      parts?: WorkspaceAgentUIMessage['parts'];
      status: string;
      errorText?: string | null;
      metadata?: PersistedMessageMetadata | null;
    },
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

    if ('metadata' in input) {
      updatePayload.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }

    const [message] = await db
      .update(chatMessages)
      .set(updatePayload)
      .where(eq(chatMessages.id, messageId))
      .returning();

    return message ?? null;
  }

  async listDashboardRows() {
    const db = getDb();
    const rows = await db
      .select({
        createdAt: chatMessages.createdAt,
        metadata: chatMessages.metadata,
        partsJson: chatMessages.partsJson,
        role: chatMessages.role,
        updatedAt: chatMessages.updatedAt,
      })
      .from(chatMessages)
      .orderBy(chatMessages.createdAt);

    return rows.map((row) => ({
      createdAt: row.createdAt,
      metadata: parseMetadata(row.metadata),
      parts: parseParts(row.partsJson),
      role: row.role as WorkspaceAgentUIMessage['role'],
      updatedAt: row.updatedAt,
    }));
  }

  toUIMessage(row: ChatMessageRow): WorkspaceAgentUIMessage {
    return {
      id: row.id,
      role: row.role as WorkspaceAgentUIMessage['role'],
      parts: parseParts(row.partsJson),
    };
  }
}
