import type Database from 'better-sqlite3';
import type { IEventStore, StoredEvent } from '@fluxmaster/core';

export class SqliteEventStore implements IEventStore {
  constructor(private db: Database.Database) {}

  saveEvent(event: StoredEvent): void {
    this.db
      .prepare(
        `INSERT INTO events (id, type, agent_id, request_id, payload, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.type,
        event.agentId ?? null,
        event.requestId ?? null,
        event.payload,
        event.timestamp.toISOString(),
      );
  }

  getEventsByRequest(requestId: string): StoredEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events WHERE request_id = ? ORDER BY timestamp ASC')
      .all(requestId) as Array<EventRow>;

    return rows.map(toStoredEvent);
  }

  getEventsByAgent(agentId: string, limit?: number): StoredEvent[] {
    const sql = limit
      ? 'SELECT * FROM events WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM events WHERE agent_id = ? ORDER BY timestamp DESC';

    const rows = (limit
      ? this.db.prepare(sql).all(agentId, limit)
      : this.db.prepare(sql).all(agentId)) as Array<EventRow>;

    return rows.map(toStoredEvent);
  }

  pruneOldEvents(maxAgeSeconds: number): number {
    const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();
    const result = this.db
      .prepare('DELETE FROM events WHERE timestamp < ?')
      .run(cutoff);
    return result.changes;
  }
}

interface EventRow {
  id: string;
  type: string;
  agent_id: string | null;
  request_id: string | null;
  payload: string;
  timestamp: string;
}

function toStoredEvent(row: EventRow): StoredEvent {
  return {
    id: row.id,
    type: row.type,
    agentId: row.agent_id ?? undefined,
    requestId: row.request_id ?? undefined,
    payload: row.payload,
    timestamp: new Date(row.timestamp),
  };
}
