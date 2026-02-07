import type Database from 'better-sqlite3';
import type { IRequestStore, RequestRecord, ToolCallTiming } from '@fluxmaster/core';

export class SqliteRequestStore implements IRequestStore {
  constructor(private db: Database.Database) {}

  saveRequest(request: RequestRecord): void {
    this.db.prepare(`
      INSERT INTO requests (id, agent_id, conversation_id, status, started_at, first_token_at, completed_at, input_tokens, output_tokens, iterations, tool_calls, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      request.id,
      request.agentId,
      request.conversationId,
      request.status,
      request.startedAt.toISOString(),
      request.firstTokenAt?.toISOString() ?? null,
      request.completedAt?.toISOString() ?? null,
      request.inputTokens ?? null,
      request.outputTokens ?? null,
      request.iterations ?? null,
      JSON.stringify(request.toolCalls),
      request.errorMessage ?? null,
    );
  }

  updateRequest(requestId: string, updates: Partial<RequestRecord>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
    if (updates.firstTokenAt !== undefined) { sets.push('first_token_at = ?'); values.push(updates.firstTokenAt.toISOString()); }
    if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(updates.completedAt.toISOString()); }
    if (updates.inputTokens !== undefined) { sets.push('input_tokens = ?'); values.push(updates.inputTokens); }
    if (updates.outputTokens !== undefined) { sets.push('output_tokens = ?'); values.push(updates.outputTokens); }
    if (updates.iterations !== undefined) { sets.push('iterations = ?'); values.push(updates.iterations); }
    if (updates.toolCalls !== undefined) { sets.push('tool_calls = ?'); values.push(JSON.stringify(updates.toolCalls)); }
    if (updates.errorMessage !== undefined) { sets.push('error_message = ?'); values.push(updates.errorMessage); }

    if (sets.length === 0) return;

    values.push(requestId);
    this.db.prepare(`UPDATE requests SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  getRequest(requestId: string): RequestRecord | undefined {
    const row = this.db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  listRequests(agentId: string, options?: { limit?: number; offset?: number }): RequestRecord[] {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const rows = this.db.prepare(
      'SELECT * FROM requests WHERE agent_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?',
    ).all(agentId, limit, offset) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): RequestRecord {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      conversationId: (row.conversation_id as string) ?? null,
      status: row.status as RequestRecord['status'],
      startedAt: new Date(row.started_at as string),
      firstTokenAt: row.first_token_at ? new Date(row.first_token_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      inputTokens: row.input_tokens as number | undefined,
      outputTokens: row.output_tokens as number | undefined,
      iterations: row.iterations as number | undefined,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls as string) as ToolCallTiming[] : [],
      errorMessage: row.error_message as string | undefined,
    };
  }
}
