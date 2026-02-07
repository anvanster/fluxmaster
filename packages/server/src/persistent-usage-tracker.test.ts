import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { Migrator } from './db/migrator.js';
import { SqliteUsageStore } from './db/stores/usage-store.js';
import { PersistentUsageTracker } from './persistent-usage-tracker.js';

describe('PersistentUsageTracker', () => {
  let db: Database.Database;
  let usageStore: SqliteUsageStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    usageStore = new SqliteUsageStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('persists usage to store on record()', () => {
    const tracker = new PersistentUsageTracker(usageStore);
    tracker.record('agent-1', 100, 200);

    const dbUsage = usageStore.getAgentUsage('agent-1');
    expect(dbUsage.inputTokens).toBe(100);
    expect(dbUsage.outputTokens).toBe(200);
    expect(dbUsage.requestCount).toBe(1);
  });

  it('hydrates from store on construction', () => {
    // Pre-populate DB
    usageStore.recordUsage({
      id: 'u1',
      agentId: 'agent-1',
      inputTokens: 100,
      outputTokens: 200,
      timestamp: new Date(),
    });
    usageStore.recordUsage({
      id: 'u2',
      agentId: 'agent-1',
      inputTokens: 50,
      outputTokens: 100,
      timestamp: new Date(),
    });

    const tracker = new PersistentUsageTracker(usageStore);
    const usage = tracker.getAgent('agent-1');
    expect(usage.inputTokens).toBe(150);
    expect(usage.outputTokens).toBe(300);
    expect(usage.requestCount).toBe(2);
  });

  it('in-memory getAgent/getTotal still works', () => {
    const tracker = new PersistentUsageTracker(usageStore);
    tracker.record('a1', 10, 20);
    tracker.record('a2', 30, 40);

    expect(tracker.getAgent('a1').inputTokens).toBe(10);
    expect(tracker.getTotal().inputTokens).toBe(40);
    expect(tracker.getTotal().requestCount).toBe(2);
  });

  it('getUsageHistory delegates to store', () => {
    const tracker = new PersistentUsageTracker(usageStore);
    tracker.record('agent-1', 100, 200);
    tracker.record('agent-1', 50, 100);

    const history = tracker.getUsageHistory('agent-1');
    expect(history).toHaveLength(2);
  });

  it('inherits all UsageTracker behavior', () => {
    const tracker = new PersistentUsageTracker(usageStore);
    tracker.record('a1', 10, 20);

    const all = tracker.getAll();
    expect(all['a1']).toBeDefined();
    expect(all['a1'].inputTokens).toBe(10);
  });
});
