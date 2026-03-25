import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const chatSessions = sqliteTable(
  'chat_sessions',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    status: text().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
    lastMessageAt: integer('last_message_at', { mode: 'number' }),
    model: text(),
    systemPrompt: text('system_prompt'),
    summary: text(),
    metadata: text(),
  },
  (table) => [
    index('chat_sessions_updated_at_idx').on(table.updatedAt),
    index('chat_sessions_last_message_at_idx').on(table.lastMessageAt),
  ],
);

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text().primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: text().notNull(),
    partsJson: text('parts_json').notNull(),
    status: text().notNull().default('done'),
    sequence: integer({ mode: 'number' }).notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
    errorText: text('error_text'),
    metadata: text(),
  },
  (table) => [
    uniqueIndex('chat_messages_session_sequence_uidx').on(table.sessionId, table.sequence),
    index('chat_messages_session_created_at_idx').on(table.sessionId, table.createdAt),
  ],
);

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
