import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '@fluxmaster/core';
import type { BudgetConfig, IBudgetStore, BudgetAlert } from '@fluxmaster/core';
import { BudgetManager } from './budget-manager.js';

function makeBudgetStore(): IBudgetStore {
  return {
    logAlert: vi.fn(),
    getAlerts: vi.fn().mockReturnValue([]),
    getAllAlerts: vi.fn().mockReturnValue([]),
    hasTriggeredThreshold: vi.fn().mockReturnValue(false),
  };
}

describe('BudgetManager', () => {
  let eventBus: EventBus;
  let budgetStore: IBudgetStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    eventBus = new EventBus();
    budgetStore = makeBudgetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkBudget', () => {
    it('allows requests when no budget configured', () => {
      const manager = new BudgetManager({}, eventBus, budgetStore);
      const result = manager.checkBudget('agent-1');
      expect(result.allowed).toBe(true);
    });

    it('allows requests when under global budget', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8, 0.9] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 50, 'cost');
      const result = manager.checkBudget('agent-1');
      expect(result.allowed).toBe(true);
    });

    it('blocks requests when global budget exceeded', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 101, 'cost');
      const result = manager.checkBudget('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Global');
    });

    it('blocks requests when per-agent budget exceeded', () => {
      const config: BudgetConfig = {
        perAgent: {
          'agent-1': { maxCost: 50, period: 'total', warningThresholds: [0.8] },
        },
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 51, 'cost');
      const result = manager.checkBudget('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('agent-1');
    });

    it('allows other agents when one exceeds its budget', () => {
      const config: BudgetConfig = {
        perAgent: {
          'agent-1': { maxCost: 50, period: 'total', warningThresholds: [0.8] },
        },
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 51, 'cost');
      expect(manager.checkBudget('agent-1').allowed).toBe(false);
      expect(manager.checkBudget('agent-2').allowed).toBe(true);
    });
  });

  describe('recordCost and threshold warnings', () => {
    it('emits budget:warning when threshold crossed', () => {
      const handler = vi.fn();
      eventBus.on('budget:warning', handler);

      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 81, 'cost');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].threshold).toBe(0.8);
    });

    it('emits budget:exceeded when budget blown', () => {
      const handler = vi.fn();
      eventBus.on('budget:exceeded', handler);

      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 101, 'cost');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not re-emit threshold within same period', () => {
      const handler = vi.fn();
      eventBus.on('budget:warning', handler);

      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 81, 'cost');
      manager.recordUsage('agent-1', 5, 'cost'); // still above 0.8, shouldn't re-emit

      expect(handler).toHaveBeenCalledOnce();
    });

    it('emits for multiple thresholds as they are crossed', () => {
      const handler = vi.fn();
      eventBus.on('budget:warning', handler);

      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.5, 0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 51, 'cost'); // crosses 0.5
      manager.recordUsage('agent-1', 30, 'cost'); // crosses 0.8

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('logs alerts to budget store', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 81, 'cost');

      expect(budgetStore.logAlert).toHaveBeenCalledOnce();
      const alert = (budgetStore.logAlert as ReturnType<typeof vi.fn>).mock.calls[0][0] as BudgetAlert;
      expect(alert.type).toBe('warning');
      expect(alert.threshold).toBe(0.8);
    });

    it('emits budget:request_blocked on checkBudget when exceeded', () => {
      const handler = vi.fn();
      eventBus.on('budget:request_blocked', handler);

      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 101, 'cost');
      manager.checkBudget('agent-1');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].agentId).toBe('agent-1');
    });
  });

  describe('getStatus', () => {
    it('returns global budget status', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [0.8] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 60, 'cost');

      const statuses = manager.getStatus();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].id).toBe('global');
      expect(statuses[0].currentCost).toBeCloseTo(60);
      expect(statuses[0].percentage).toBeCloseTo(0.6);
      expect(statuses[0].exceeded).toBe(false);
    });

    it('returns per-agent budget status', () => {
      const config: BudgetConfig = {
        perAgent: {
          'agent-1': { maxCost: 50, period: 'total', warningThresholds: [0.8] },
        },
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 40, 'cost');

      const statuses = manager.getStatus();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].id).toBe('agent-1');
      expect(statuses[0].percentage).toBeCloseTo(0.8);
    });

    it('returns specific budget by id', () => {
      const config: BudgetConfig = {
        global: { maxCost: 1000, period: 'monthly', warningThresholds: [0.8] },
        perAgent: {
          'agent-1': { maxCost: 50, period: 'daily', warningThresholds: [0.8] },
        },
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 30, 'cost');

      const statuses = manager.getStatus('agent-1');
      expect(statuses).toHaveLength(1);
      expect(statuses[0].id).toBe('agent-1');
    });
  });

  describe('daily period reset', () => {
    it('resets daily costs at midnight UTC', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'daily', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 80, 'cost');
      expect(manager.checkBudget('agent-1').allowed).toBe(true);

      // Advance to next day
      vi.setSystemTime(new Date('2024-06-16T01:00:00Z'));
      const statuses = manager.getStatus();
      expect(statuses[0].currentCost).toBe(0);
      expect(manager.checkBudget('agent-1').allowed).toBe(true);
    });
  });

  describe('monthly period reset', () => {
    it('resets monthly costs at start of month', () => {
      const config: BudgetConfig = {
        global: { maxCost: 1000, period: 'monthly', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 900, 'cost');

      // Advance to next month
      vi.setSystemTime(new Date('2024-07-01T01:00:00Z'));
      const statuses = manager.getStatus();
      expect(statuses[0].currentCost).toBe(0);
    });
  });

  describe('unit-aware metering', () => {
    it('records premium_requests usage against premium_requests budget only', () => {
      const config: BudgetConfig = {
        global: { maxCost: 300, period: 'monthly', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 1, 'premium_requests');

      const statuses = manager.getStatus();
      expect(statuses[0].currentCost).toBe(1);
    });

    it('ignores cost usage when budget unit is premium_requests', () => {
      const config: BudgetConfig = {
        global: { maxCost: 300, period: 'monthly', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 50, 'cost');

      const statuses = manager.getStatus();
      expect(statuses[0].currentCost).toBe(0);
    });

    it('ignores premium_requests usage when budget unit is cost', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 3, 'premium_requests');

      const statuses = manager.getStatus();
      expect(statuses[0].currentCost).toBe(0);
    });

    it('tracks both budget types independently', () => {
      const config: BudgetConfig = {
        global: { maxCost: 300, period: 'monthly', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {
          'agent-1': { maxCost: 50, period: 'daily', unit: 'cost', warningThresholds: [] },
        },
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);

      // Copilot request — goes to global only
      manager.recordUsage('agent-1', 1, 'premium_requests');
      // Direct API cost — goes to agent only
      manager.recordUsage('agent-1', 5.50, 'cost');

      const statuses = manager.getStatus();
      const global = statuses.find((s) => s.id === 'global')!;
      const agent = statuses.find((s) => s.id === 'agent-1')!;
      expect(global.currentCost).toBe(1);
      expect(global.unit).toBe('premium_requests');
      expect(agent.currentCost).toBeCloseTo(5.50);
      expect(agent.unit).toBe('cost');
    });

    it('blocks when premium_requests budget exceeded', () => {
      const config: BudgetConfig = {
        global: { maxCost: 10, period: 'total', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 3, 'premium_requests');
      manager.recordUsage('agent-1', 3, 'premium_requests');
      manager.recordUsage('agent-1', 3, 'premium_requests');
      manager.recordUsage('agent-1', 3, 'premium_requests');

      const result = manager.checkBudget('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requests');
    });

    it('formats premium_requests in reason string', () => {
      const config: BudgetConfig = {
        global: { maxCost: 10, period: 'total', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);
      manager.recordUsage('agent-1', 11, 'premium_requests');

      const result = manager.checkBudget('agent-1');
      expect(result.reason).toContain('11.0 requests');
      expect(result.reason).toContain('10.0 requests');
      expect(result.reason).not.toContain('$');
    });

    it('includes unit in status output', () => {
      const config: BudgetConfig = {
        global: { maxCost: 300, period: 'monthly', unit: 'premium_requests', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);

      const statuses = manager.getStatus();
      expect(statuses[0].unit).toBe('premium_requests');
    });

    it('defaults unit to cost when not specified', () => {
      const config: BudgetConfig = {
        global: { maxCost: 100, period: 'total', warningThresholds: [] },
        perAgent: {},
      };
      const manager = new BudgetManager(config, eventBus, budgetStore);

      const statuses = manager.getStatus();
      expect(statuses[0].unit).toBe('cost');
    });
  });
});
