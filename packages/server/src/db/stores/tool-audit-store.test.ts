import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { ToolAuditEntry } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteToolAuditStore } from './tool-audit-store.js';

describe('SqliteToolAuditStore', () => {
  let db: Database.Database;
  let store: SqliteToolAuditStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteToolAuditStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeEntry = (overrides?: Partial<ToolAuditEntry>): ToolAuditEntry => ({
    id: 'audit-1',
    agentId: 'agent-1',
    toolName: 'read_file',
    args: '{"path":"/tmp/test.txt"}',
    result: 'file contents',
    isError: false,
    permitted: true,
    durationMs: 42,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  it('logs and retrieves a tool call by agent', () => {
    store.logToolCall(makeEntry());
    const entries = store.getByAgent('agent-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('audit-1');
    expect(entries[0].toolName).toBe('read_file');
    expect(entries[0].permitted).toBe(true);
    expect(entries[0].durationMs).toBe(42);
  });

  it('retrieves entries by tool name', () => {
    store.logToolCall(makeEntry({ id: 'a1', toolName: 'read_file' }));
    store.logToolCall(makeEntry({ id: 'a2', toolName: 'write_file' }));
    store.logToolCall(makeEntry({ id: 'a3', toolName: 'read_file' }));

    const entries = store.getByTool('read_file');
    expect(entries).toHaveLength(2);
  });

  it('retrieves denied calls only', () => {
    store.logToolCall(makeEntry({ id: 'a1', permitted: true }));
    store.logToolCall(makeEntry({ id: 'a2', permitted: false, denialReason: 'Tool is dangerous' }));
    store.logToolCall(makeEntry({ id: 'a3', permitted: false, denialReason: 'Rate limited' }));

    const denied = store.getDeniedCalls();
    expect(denied).toHaveLength(2);
    expect(denied[0].denialReason).toBeDefined();
  });

  it('respects limit on getByAgent', () => {
    for (let i = 0; i < 10; i++) {
      store.logToolCall(makeEntry({ id: `a-${i}` }));
    }
    const entries = store.getByAgent('agent-1', { limit: 3 });
    expect(entries).toHaveLength(3);
  });

  it('respects offset on getByAgent', () => {
    for (let i = 0; i < 5; i++) {
      store.logToolCall(makeEntry({
        id: `a-${i}`,
        timestamp: new Date(`2024-01-01T00:0${i}:00Z`),
      }));
    }
    const entries = store.getByAgent('agent-1', { limit: 2, offset: 2 });
    expect(entries).toHaveLength(2);
  });

  it('respects limit on getByTool', () => {
    for (let i = 0; i < 5; i++) {
      store.logToolCall(makeEntry({ id: `a-${i}`, toolName: 'bash_execute' }));
    }
    const entries = store.getByTool('bash_execute', { limit: 2 });
    expect(entries).toHaveLength(2);
  });

  it('prunes entries older than threshold', () => {
    store.logToolCall(makeEntry({ id: 'old', timestamp: new Date('2020-01-01T00:00:00Z') }));
    store.logToolCall(makeEntry({ id: 'new', timestamp: new Date() }));

    const pruned = store.pruneOldEntries(86400); // 1 day
    expect(pruned).toBe(1);

    const remaining = store.getByAgent('agent-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new');
  });

  it('handles empty result sets', () => {
    expect(store.getByAgent('nonexistent')).toHaveLength(0);
    expect(store.getByTool('nonexistent')).toHaveLength(0);
    expect(store.getDeniedCalls()).toHaveLength(0);
  });

  it('preserves denial reason on denied entries', () => {
    store.logToolCall(makeEntry({
      id: 'denied-1',
      permitted: false,
      denialReason: 'Agent not authorized for dangerous tools',
    }));

    const entries = store.getDeniedCalls();
    expect(entries[0].denialReason).toBe('Agent not authorized for dangerous tools');
    expect(entries[0].permitted).toBe(false);
  });

  it('stores error tool calls', () => {
    store.logToolCall(makeEntry({
      id: 'err-1',
      isError: true,
      result: 'Error: ENOENT',
    }));

    const entries = store.getByAgent('agent-1');
    expect(entries[0].isError).toBe(true);
    expect(entries[0].result).toBe('Error: ENOENT');
  });
});
