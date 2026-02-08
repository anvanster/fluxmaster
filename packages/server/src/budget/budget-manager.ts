import { randomUUID } from 'node:crypto';
import type { EventBus, BudgetConfig, BudgetLimit, BudgetStatus, BudgetUnit, IBudgetStore } from '@fluxmaster/core';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
}

interface CostRecord {
  amount: number;
  timestamp: Date;
}

export class BudgetManager {
  private config: BudgetConfig;
  private eventBus: EventBus;
  private budgetStore: IBudgetStore;
  private costRecords: Map<string, CostRecord[]> = new Map(); // budgetId -> records
  private triggeredThresholds: Map<string, Set<number>> = new Map(); // budgetId -> thresholds

  constructor(config: BudgetConfig, eventBus: EventBus, budgetStore: IBudgetStore) {
    this.config = config;
    this.eventBus = eventBus;
    this.budgetStore = budgetStore;
  }

  checkBudget(agentId: string): BudgetCheckResult {
    // Check global budget
    if (this.config.global) {
      const globalCost = this.getCurrentCost('global', this.config.global);
      if (globalCost >= this.config.global.maxCost) {
        const unit = this.config.global.unit ?? 'cost';
        this.eventBus.emit({
          type: 'budget:request_blocked',
          agentId,
          budgetId: 'global',
          currentCost: globalCost,
          maxCost: this.config.global.maxCost,
          timestamp: new Date(),
        });
        return {
          allowed: false,
          reason: `Global budget exceeded: ${this.formatAmount(globalCost, unit)} / ${this.formatAmount(this.config.global.maxCost, unit)}`,
        };
      }
    }

    // Check per-agent budget
    const agentBudget = this.config.perAgent?.[agentId];
    if (agentBudget) {
      const agentCost = this.getCurrentCost(agentId, agentBudget);
      if (agentCost >= agentBudget.maxCost) {
        const unit = agentBudget.unit ?? 'cost';
        this.eventBus.emit({
          type: 'budget:request_blocked',
          agentId,
          budgetId: agentId,
          currentCost: agentCost,
          maxCost: agentBudget.maxCost,
          timestamp: new Date(),
        });
        return {
          allowed: false,
          reason: `Agent '${agentId}' budget exceeded: ${this.formatAmount(agentCost, unit)} / ${this.formatAmount(agentBudget.maxCost, unit)}`,
        };
      }
    }

    return { allowed: true };
  }

  recordUsage(agentId: string, amount: number, unit: BudgetUnit): void {
    const now = new Date();

    // Record to global budget — only if unit matches
    if (this.config.global && (this.config.global.unit ?? 'cost') === unit) {
      this.addRecord('global', amount, now);
      this.checkThresholds('global', this.config.global);
    }

    // Record to agent budget — only if unit matches
    const agentBudget = this.config.perAgent?.[agentId];
    if (agentBudget && (agentBudget.unit ?? 'cost') === unit) {
      this.addRecord(agentId, amount, now);
      this.checkThresholds(agentId, agentBudget);
    }
  }

  getStatus(budgetId?: string): BudgetStatus[] {
    const statuses: BudgetStatus[] = [];

    if (budgetId) {
      if (budgetId === 'global' && this.config.global) {
        statuses.push(this.buildStatus('global', this.config.global));
      } else if (this.config.perAgent?.[budgetId]) {
        statuses.push(this.buildStatus(budgetId, this.config.perAgent[budgetId]));
      }
      return statuses;
    }

    // Return all budgets
    if (this.config.global) {
      statuses.push(this.buildStatus('global', this.config.global));
    }
    for (const [id, limit] of Object.entries(this.config.perAgent ?? {})) {
      statuses.push(this.buildStatus(id, limit));
    }

    return statuses;
  }

  private addRecord(budgetId: string, cost: number, timestamp: Date): void {
    let records = this.costRecords.get(budgetId);
    if (!records) {
      records = [];
      this.costRecords.set(budgetId, records);
    }
    records.push({ amount: cost, timestamp });
  }

  private getCurrentCost(budgetId: string, limit: BudgetLimit): number {
    const records = this.costRecords.get(budgetId);
    if (!records) return 0;

    const periodStart = this.getPeriodStart(limit.period);

    return records
      .filter((r) => r.timestamp >= periodStart)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      case 'monthly':
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      case 'total':
        return new Date(0); // epoch
      default:
        return new Date(0);
    }
  }

  private checkThresholds(budgetId: string, limit: BudgetLimit): void {
    const currentCost = this.getCurrentCost(budgetId, limit);
    const percentage = currentCost / limit.maxCost;

    // Check warning thresholds
    let triggered = this.triggeredThresholds.get(budgetId);
    if (!triggered) {
      triggered = new Set();
      this.triggeredThresholds.set(budgetId, triggered);
    }

    for (const threshold of limit.warningThresholds) {
      if (percentage >= threshold && !triggered.has(threshold)) {
        triggered.add(threshold);
        this.eventBus.emit({
          type: 'budget:warning',
          budgetId,
          threshold,
          currentCost,
          maxCost: limit.maxCost,
          timestamp: new Date(),
        });
        this.budgetStore.logAlert({
          id: randomUUID(),
          budgetId,
          type: 'warning',
          unit: limit.unit ?? 'cost',
          threshold,
          currentCost,
          maxCost: limit.maxCost,
          timestamp: new Date(),
        });
      }
    }

    // Check exceeded
    if (percentage >= 1 && !triggered.has(1)) {
      triggered.add(1);
      this.eventBus.emit({
        type: 'budget:exceeded',
        budgetId,
        currentCost,
        maxCost: limit.maxCost,
        timestamp: new Date(),
      });
      this.budgetStore.logAlert({
        id: randomUUID(),
        budgetId,
        type: 'exceeded',
        unit: limit.unit ?? 'cost',
        threshold: 1,
        currentCost,
        maxCost: limit.maxCost,
        timestamp: new Date(),
      });
    }
  }

  private formatAmount(amount: number, unit: BudgetUnit): string {
    if (unit === 'premium_requests') {
      return `${amount.toFixed(1)} requests`;
    }
    return `$${amount.toFixed(2)}`;
  }

  private buildStatus(id: string, limit: BudgetLimit): BudgetStatus {
    const currentCost = this.getCurrentCost(id, limit);
    const percentage = limit.maxCost > 0 ? currentCost / limit.maxCost : 0;
    const triggered = this.triggeredThresholds.get(id);

    return {
      id,
      period: limit.period,
      unit: limit.unit ?? 'cost',
      maxCost: limit.maxCost,
      currentCost,
      percentage,
      exceeded: currentCost >= limit.maxCost,
      warningThresholds: limit.warningThresholds,
      triggeredThresholds: triggered ? Array.from(triggered).filter((t) => t < 1) : [],
    };
  }
}
