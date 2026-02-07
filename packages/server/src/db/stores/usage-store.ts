import type Database from 'better-sqlite3';
import type { IUsageStore, UsageEntry, AggregatedUsage } from '@fluxmaster/core';

export class SqliteUsageStore implements IUsageStore {
  constructor(private db: Database.Database) {}

  recordUsage(entry: UsageEntry): void {
    this.db
      .prepare(
        `INSERT INTO usage (id, agent_id, request_id, input_tokens, output_tokens, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.agentId,
        entry.requestId ?? null,
        entry.inputTokens,
        entry.outputTokens,
        entry.timestamp.toISOString(),
      );
  }

  getAgentUsage(agentId: string): AggregatedUsage {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COUNT(*) as request_count
         FROM usage WHERE agent_id = ?`,
      )
      .get(agentId) as { input_tokens: number; output_tokens: number; request_count: number };

    return {
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      requestCount: row.request_count,
    };
  }

  getTotalUsage(): AggregatedUsage {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COUNT(*) as request_count
         FROM usage`,
      )
      .get() as { input_tokens: number; output_tokens: number; request_count: number };

    return {
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      requestCount: row.request_count,
    };
  }

  getAllUsage(): Record<string, AggregatedUsage> {
    const rows = this.db
      .prepare(
        `SELECT agent_id,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COUNT(*) as request_count
         FROM usage GROUP BY agent_id`,
      )
      .all() as Array<{ agent_id: string; input_tokens: number; output_tokens: number; request_count: number }>;

    const result: Record<string, AggregatedUsage> = {};
    for (const row of rows) {
      result[row.agent_id] = {
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        requestCount: row.request_count,
      };
    }
    return result;
  }

  getUsageHistory(agentId: string, limit?: number): UsageEntry[] {
    const sql = limit
      ? 'SELECT * FROM usage WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM usage WHERE agent_id = ? ORDER BY timestamp DESC';

    const rows = (limit
      ? this.db.prepare(sql).all(agentId, limit)
      : this.db.prepare(sql).all(agentId)) as Array<{
        id: string;
        agent_id: string;
        request_id: string | null;
        input_tokens: number;
        output_tokens: number;
        timestamp: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      requestId: r.request_id ?? undefined,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      timestamp: new Date(r.timestamp),
    }));
  }
}
