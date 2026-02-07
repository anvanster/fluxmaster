import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { StoredEvent } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteEventStore } from './event-store.js';

describe('SqliteEventStore', () => {
  let db: Database.Database;
  let store: SqliteEventStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteEventStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeEvent = (overrides?: Partial<StoredEvent>): StoredEvent => ({
    id: 'evt-1',
    type: 'message:started',
    agentId: 'agent-1',
    requestId: 'req-1',
    payload: '{"type":"message:started"}',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  it('saves and retrieves events by requestId', () => {
    store.saveEvent(makeEvent({ id: 'evt-1', requestId: 'req-1' }));
    store.saveEvent(makeEvent({ id: 'evt-2', requestId: 'req-1', type: 'message:completed' }));
    store.saveEvent(makeEvent({ id: 'evt-3', requestId: 'req-2' }));

    const events = store.getEventsByRequest('req-1');
    expect(events).toHaveLength(2);
  });

  it('retrieves events by agentId with limit', () => {
    for (let i = 0; i < 5; i++) {
      store.saveEvent(makeEvent({ id: `evt-${i}`, agentId: 'agent-1' }));
    }

    const events = store.getEventsByAgent('agent-1', 3);
    expect(events).toHaveLength(3);
  });

  it('prunes events older than threshold', () => {
    store.saveEvent(makeEvent({ id: 'old', timestamp: new Date('2020-01-01T00:00:00Z') }));
    store.saveEvent(makeEvent({ id: 'new', timestamp: new Date() }));

    const pruned = store.pruneOldEvents(86400); // 1 day
    expect(pruned).toBe(1);

    const remaining = store.getEventsByAgent('agent-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new');
  });

  it('handles empty result sets', () => {
    expect(store.getEventsByRequest('nonexistent')).toHaveLength(0);
    expect(store.getEventsByAgent('nonexistent')).toHaveLength(0);
  });

  it('preserves event ordering by timestamp', () => {
    store.saveEvent(makeEvent({ id: 'evt-2', timestamp: new Date('2024-01-01T00:02:00Z') }));
    store.saveEvent(makeEvent({ id: 'evt-1', timestamp: new Date('2024-01-01T00:01:00Z') }));

    const events = store.getEventsByRequest('req-1');
    expect(events[0].id).toBe('evt-1');
    expect(events[1].id).toBe('evt-2');
  });
});
