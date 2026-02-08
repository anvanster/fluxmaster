import type Database from 'better-sqlite3';
import type { IBudgetStore, BudgetAlert } from '@fluxmaster/core';

export class SqliteBudgetStore implements IBudgetStore {
  constructor(private db: Database.Database) {}

  logAlert(alert: BudgetAlert): void {
    this.db
      .prepare(
        `INSERT INTO budget_alerts (id, budget_id, type, unit, threshold, current_cost, max_cost, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        alert.id,
        alert.budgetId,
        alert.type,
        alert.unit,
        alert.threshold,
        alert.currentCost,
        alert.maxCost,
        alert.timestamp.toISOString(),
      );
  }

  getAlerts(budgetId: string, options?: { limit?: number }): BudgetAlert[] {
    let sql = 'SELECT * FROM budget_alerts WHERE budget_id = ? ORDER BY timestamp DESC';
    const params: (string | number)[] = [budgetId];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as AlertRow[];
    return rows.map(toAlert);
  }

  getAllAlerts(options?: { limit?: number }): BudgetAlert[] {
    let sql = 'SELECT * FROM budget_alerts ORDER BY timestamp DESC';
    const params: number[] = [];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as AlertRow[];
    return rows.map(toAlert);
  }

  hasTriggeredThreshold(budgetId: string, threshold: number, since: Date): boolean {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM budget_alerts
         WHERE budget_id = ? AND threshold = ? AND timestamp >= ?`,
      )
      .get(budgetId, threshold, since.toISOString()) as { count: number };
    return row.count > 0;
  }
}

interface AlertRow {
  id: string;
  budget_id: string;
  type: string;
  unit: string;
  threshold: number;
  current_cost: number;
  max_cost: number;
  timestamp: string;
}

function toAlert(row: AlertRow): BudgetAlert {
  return {
    id: row.id,
    budgetId: row.budget_id,
    type: row.type as 'warning' | 'exceeded',
    unit: (row.unit ?? 'cost') as 'cost' | 'premium_requests',
    threshold: row.threshold,
    currentCost: row.current_cost,
    maxCost: row.max_cost,
    timestamp: new Date(row.timestamp),
  };
}
