import type Database from 'better-sqlite3';

export class SqliteAiFeatureStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveSuggestions(requestId: string, conversationId: string, suggestions: string[]): void {
    this.db.prepare(
      'INSERT INTO suggestions (request_id, conversation_id, suggestions) VALUES (?, ?, ?)',
    ).run(requestId, conversationId, JSON.stringify(suggestions));
  }

  getSuggestions(requestId: string): string[] {
    const row = this.db.prepare(
      'SELECT suggestions FROM suggestions WHERE request_id = ?',
    ).get(requestId) as { suggestions: string } | undefined;
    if (!row) return [];
    return JSON.parse(row.suggestions);
  }

  saveSummary(conversationId: string, summary: string): void {
    this.db.prepare(
      `INSERT INTO conversation_summaries (conversation_id, summary, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(conversation_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at`,
    ).run(conversationId, summary);
  }

  getSummary(conversationId: string): string | null {
    const row = this.db.prepare(
      'SELECT summary FROM conversation_summaries WHERE conversation_id = ?',
    ).get(conversationId) as { summary: string } | undefined;
    return row?.summary ?? null;
  }
}
