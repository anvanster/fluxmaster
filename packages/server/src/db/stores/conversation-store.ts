import type Database from 'better-sqlite3';
import type { IConversationStore, StoredMessage, ConversationSummary } from '@fluxmaster/core';

export class SqliteConversationStore implements IConversationStore {
  constructor(private db: Database.Database) {}

  createConversation(id: string, agentId: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO conversations (id, agent_id) VALUES (?, ?)')
      .run(id, agentId);
  }

  saveMessage(conversationId: string, message: StoredMessage): void {
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, agent_id, role, content, tool_calls, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        conversationId,
        message.agentId,
        message.role,
        message.content,
        message.toolCalls ?? null,
        message.timestamp.toISOString(),
      );

    this.db
      .prepare('UPDATE conversations SET last_active_at = ? WHERE id = ?')
      .run(new Date().toISOString(), conversationId);
  }

  getMessages(conversationId: string): StoredMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC')
      .all(conversationId) as Array<{
        id: string;
        conversation_id: string;
        agent_id: string;
        role: 'user' | 'assistant';
        content: string;
        tool_calls: string | null;
        timestamp: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      agentId: r.agent_id,
      role: r.role,
      content: r.content,
      toolCalls: r.tool_calls ?? undefined,
      timestamp: new Date(r.timestamp),
    }));
  }

  clearMessages(conversationId: string): void {
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
  }

  listConversations(agentId: string): ConversationSummary[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.agent_id, c.title, c.created_at, c.last_active_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
         FROM conversations c
         WHERE c.agent_id = ?
         ORDER BY c.last_active_at DESC`,
      )
      .all(agentId) as Array<{
        id: string;
        agent_id: string;
        title: string | null;
        created_at: string;
        last_active_at: string;
        message_count: number;
      }>;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      title: r.title ?? undefined,
      messageCount: r.message_count,
      createdAt: new Date(r.created_at),
      lastActiveAt: new Date(r.last_active_at),
    }));
  }

  getConversation(conversationId: string): ConversationSummary | undefined {
    const row = this.db
      .prepare(
        `SELECT c.id, c.agent_id, c.title, c.created_at, c.last_active_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
         FROM conversations c WHERE c.id = ?`,
      )
      .get(conversationId) as {
        id: string;
        agent_id: string;
        title: string | null;
        created_at: string;
        last_active_at: string;
        message_count: number;
      } | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      agentId: row.agent_id,
      title: row.title ?? undefined,
      messageCount: row.message_count,
      createdAt: new Date(row.created_at),
      lastActiveAt: new Date(row.last_active_at),
    };
  }

  deleteConversation(conversationId: string): void {
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
  }

  updateConversationTitle(conversationId: string, title: string): void {
    this.db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, conversationId);
  }
}
