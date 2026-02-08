import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { BudgetAlert } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteBudgetStore } from './budget-store.js';

describe('SqliteBudgetStore', () => {
  let db: Database.Database;
  let store: SqliteBudgetStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteBudgetStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeAlert = (overrides?: Partial<BudgetAlert>): BudgetAlert => ({
    id: 'alert-1',
    budgetId: 'global',
    type: 'warning',
    unit: 'cost',
    threshold: 0.8,
    currentCost: 80,
    maxCost: 100,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  });

  it('logs and retrieves alerts by budgetId', () => {
    store.logAlert(makeAlert({ id: 'a1', budgetId: 'global' }));
    store.logAlert(makeAlert({ id: 'a2', budgetId: 'agent-1' }));

    const alerts = store.getAlerts('global');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].budgetId).toBe('global');
  });

  it('retrieves all alerts', () => {
    store.logAlert(makeAlert({ id: 'a1', budgetId: 'global' }));
    store.logAlert(makeAlert({ id: 'a2', budgetId: 'agent-1' }));

    const alerts = store.getAllAlerts();
    expect(alerts).toHaveLength(2);
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      store.logAlert(makeAlert({ id: `a-${i}` }));
    }
    expect(store.getAlerts('global', { limit: 3 })).toHaveLength(3);
    expect(store.getAllAlerts({ limit: 5 })).toHaveLength(5);
  });

  it('checks if threshold has been triggered since a date', () => {
    store.logAlert(makeAlert({
      id: 'a1',
      budgetId: 'global',
      threshold: 0.8,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    }));

    // Check for threshold triggered after an earlier date
    expect(store.hasTriggeredThreshold('global', 0.8, new Date('2024-01-01T00:00:00Z'))).toBe(true);

    // Check for threshold not triggered after a later date
    expect(store.hasTriggeredThreshold('global', 0.8, new Date('2024-01-02T00:00:00Z'))).toBe(false);

    // Check for different threshold
    expect(store.hasTriggeredThreshold('global', 0.9, new Date('2024-01-01T00:00:00Z'))).toBe(false);
  });

  it('handles empty result sets', () => {
    expect(store.getAlerts('nonexistent')).toHaveLength(0);
    expect(store.getAllAlerts()).toHaveLength(0);
    expect(store.hasTriggeredThreshold('global', 0.8, new Date())).toBe(false);
  });

  it('stores exceeded alert type', () => {
    store.logAlert(makeAlert({ id: 'a1', type: 'exceeded', threshold: 1.0 }));
    const alerts = store.getAlerts('global');
    expect(alerts[0].type).toBe('exceeded');
  });
});
