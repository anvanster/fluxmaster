import type Database from 'better-sqlite3';
import type { IToolAuditStore, ToolAuditEntry } from '@fluxmaster/core';

export class SqliteToolAuditStore implements IToolAuditStore {
  constructor(private db: Database.Database) {}

  logToolCall(entry: ToolAuditEntry): void {
    this.db
      .prepare(
        `INSERT INTO tool_audit_log (id, agent_id, tool_name, args, result, is_error, permitted, denial_reason, duration_ms, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.agentId,
        entry.toolName,
        entry.args,
        entry.result,
        entry.isError ? 1 : 0,
        entry.permitted ? 1 : 0,
        entry.denialReason ?? null,
        entry.durationMs,
        entry.timestamp.toISOString(),
      );
  }

  getByAgent(agentId: string, options?: { limit?: number; offset?: number }): ToolAuditEntry[] {
    const limit = options?.limit;
    const offset = options?.offset ?? 0;

    let sql = 'SELECT * FROM tool_audit_log WHERE agent_id = ? ORDER BY timestamp DESC';
    const params: (string | number)[] = [agentId];

    if (limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const rows = this.db.prepare(sql).all(...params) as AuditRow[];
    return rows.map(toAuditEntry);
  }

  getByTool(toolName: string, options?: { limit?: number }): ToolAuditEntry[] {
    let sql = 'SELECT * FROM tool_audit_log WHERE tool_name = ? ORDER BY timestamp DESC';
    const params: (string | number)[] = [toolName];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as AuditRow[];
    return rows.map(toAuditEntry);
  }

  getDeniedCalls(options?: { limit?: number }): ToolAuditEntry[] {
    let sql = 'SELECT * FROM tool_audit_log WHERE permitted = 0 ORDER BY timestamp DESC';
    const params: number[] = [];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as AuditRow[];
    return rows.map(toAuditEntry);
  }

  pruneOldEntries(maxAgeSeconds: number): number {
    const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();
    const result = this.db
      .prepare('DELETE FROM tool_audit_log WHERE timestamp < ?')
      .run(cutoff);
    return result.changes;
  }
}

interface AuditRow {
  id: string;
  agent_id: string;
  tool_name: string;
  args: string;
  result: string;
  is_error: number;
  permitted: number;
  denial_reason: string | null;
  duration_ms: number;
  timestamp: string;
}

function toAuditEntry(row: AuditRow): ToolAuditEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    toolName: row.tool_name,
    args: row.args,
    result: row.result,
    isError: row.is_error === 1,
    permitted: row.permitted === 1,
    denialReason: row.denial_reason ?? undefined,
    durationMs: row.duration_ms,
    timestamp: new Date(row.timestamp),
  };
}
