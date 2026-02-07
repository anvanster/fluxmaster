import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { RequestRecord } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteRequestStore } from './request-store.js';

describe('SqliteRequestStore', () => {
  let db: Database.Database;
  let store: SqliteRequestStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteRequestStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeRequest = (overrides?: Partial<RequestRecord>): RequestRecord => ({
    id: 'req-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    status: 'pending',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    toolCalls: [],
    ...overrides,
  });

  it('saves and retrieves a request', () => {
    // Need to create conversation first due to FK
    db.prepare('INSERT INTO conversations (id, agent_id) VALUES (?, ?)').run('conv-1', 'agent-1');

    store.saveRequest(makeRequest());
    const req = store.getRequest('req-1');

    expect(req).toBeDefined();
    expect(req!.id).toBe('req-1');
    expect(req!.agentId).toBe('agent-1');
    expect(req!.status).toBe('pending');
  });

  it('updates request fields', () => {
    db.prepare('INSERT INTO conversations (id, agent_id) VALUES (?, ?)').run('conv-1', 'agent-1');
    store.saveRequest(makeRequest());

    store.updateRequest('req-1', {
      status: 'completed',
      firstTokenAt: new Date('2024-01-01T00:00:01Z'),
      completedAt: new Date('2024-01-01T00:00:05Z'),
      inputTokens: 100,
      outputTokens: 200,
    });

    const req = store.getRequest('req-1');
    expect(req!.status).toBe('completed');
    expect(req!.inputTokens).toBe(100);
    expect(req!.outputTokens).toBe(200);
  });

  it('updates tool calls as JSON', () => {
    db.prepare('INSERT INTO conversations (id, agent_id) VALUES (?, ?)').run('conv-1', 'agent-1');
    store.saveRequest(makeRequest());

    const toolCalls = [
      { toolName: 'read_file', startedAt: new Date('2024-01-01T00:00:02Z'), durationMs: 150, isError: false },
    ];
    store.updateRequest('req-1', { toolCalls });

    const req = store.getRequest('req-1');
    expect(req!.toolCalls).toHaveLength(1);
    expect(req!.toolCalls[0].toolName).toBe('read_file');
  });

  it('lists requests for an agent with limit', () => {
    db.prepare('INSERT INTO conversations (id, agent_id) VALUES (?, ?)').run('conv-1', 'agent-1');

    for (let i = 0; i < 5; i++) {
      store.saveRequest(makeRequest({
        id: `req-${i}`,
        startedAt: new Date(`2024-01-01T00:0${i}:00Z`),
      }));
    }

    const all = store.listRequests('agent-1');
    expect(all).toHaveLength(5);

    const limited = store.listRequests('agent-1', { limit: 3 });
    expect(limited).toHaveLength(3);
    // Newest first
    expect(limited[0].id).toBe('req-4');
  });

  it('returns undefined for non-existent request', () => {
    expect(store.getRequest('nonexistent')).toBeUndefined();
  });
});
