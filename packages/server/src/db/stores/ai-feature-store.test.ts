import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../database-manager.js';
import { SqliteAiFeatureStore } from './ai-feature-store.js';

describe('SqliteAiFeatureStore', () => {
  let db: Database.Database;
  let store: SqliteAiFeatureStore;

  beforeEach(() => {
    const manager = new DatabaseManager(':memory:');
    manager.migrate();
    db = manager.connection;
    store = new SqliteAiFeatureStore(db);

    // Create a conversation for FK constraints
    db.prepare('INSERT INTO conversations (id, agent_id) VALUES (?, ?)').run('conv-1', 'default');
  });

  it('saves and retrieves suggestions', () => {
    store.saveSuggestions('req-1', 'conv-1', ['What next?', 'Tell me more', 'Explain further']);
    const result = store.getSuggestions('req-1');
    expect(result).toEqual(['What next?', 'Tell me more', 'Explain further']);
  });

  it('returns empty array for unknown request', () => {
    expect(store.getSuggestions('unknown')).toEqual([]);
  });

  it('saves and retrieves conversation summary', () => {
    store.saveSummary('conv-1', 'A conversation about testing');
    expect(store.getSummary('conv-1')).toBe('A conversation about testing');
  });

  it('updates existing summary', () => {
    store.saveSummary('conv-1', 'First summary');
    store.saveSummary('conv-1', 'Updated summary');
    expect(store.getSummary('conv-1')).toBe('Updated summary');
  });

  it('returns null for unknown conversation summary', () => {
    expect(store.getSummary('unknown')).toBeNull();
  });
});
