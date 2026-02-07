import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { UsageEntry } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteUsageStore } from './usage-store.js';

describe('SqliteUsageStore', () => {
  let db: Database.Database;
  let store: SqliteUsageStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteUsageStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeEntry = (overrides?: Partial<UsageEntry>): UsageEntry => ({
    id: 'usage-1',
    agentId: 'agent-1',
    inputTokens: 100,
    outputTokens: 200,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  it('records and retrieves usage per agent', () => {
    store.recordUsage(makeEntry({ id: 'u1', agentId: 'agent-1', inputTokens: 100, outputTokens: 200 }));
    store.recordUsage(makeEntry({ id: 'u2', agentId: 'agent-1', inputTokens: 50, outputTokens: 100 }));

    const usage = store.getAgentUsage('agent-1');
    expect(usage.inputTokens).toBe(150);
    expect(usage.outputTokens).toBe(300);
    expect(usage.requestCount).toBe(2);
  });

  it('computes aggregated totals correctly', () => {
    store.recordUsage(makeEntry({ id: 'u1', agentId: 'agent-1', inputTokens: 100, outputTokens: 200 }));
    store.recordUsage(makeEntry({ id: 'u2', agentId: 'agent-2', inputTokens: 50, outputTokens: 100 }));

    const total = store.getTotalUsage();
    expect(total.inputTokens).toBe(150);
    expect(total.outputTokens).toBe(300);
    expect(total.requestCount).toBe(2);
  });

  it('returns usage history ordered by timestamp', () => {
    store.recordUsage(makeEntry({ id: 'u1', timestamp: new Date('2024-01-01T00:02:00Z') }));
    store.recordUsage(makeEntry({ id: 'u2', timestamp: new Date('2024-01-01T00:01:00Z') }));

    const history = store.getUsageHistory('agent-1');
    // DESC order — newest first
    expect(history[0].id).toBe('u1');
    expect(history[1].id).toBe('u2');
  });

  it('handles multiple records for same agent via getAllUsage', () => {
    store.recordUsage(makeEntry({ id: 'u1', agentId: 'agent-1', inputTokens: 100 }));
    store.recordUsage(makeEntry({ id: 'u2', agentId: 'agent-2', inputTokens: 50 }));

    const all = store.getAllUsage();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['agent-1'].inputTokens).toBe(100);
    expect(all['agent-2'].inputTokens).toBe(50);
  });

  it('returns zero for unknown agent', () => {
    const usage = store.getAgentUsage('nonexistent');
    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
    expect(usage.requestCount).toBe(0);
  });
});
