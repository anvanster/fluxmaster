import { describe, it, expect } from 'vitest';
import { BudgetPeriodSchema, BudgetLimitSchema, BudgetConfigSchema } from './budget.js';

describe('BudgetPeriodSchema', () => {
  it('accepts valid periods', () => {
    expect(BudgetPeriodSchema.parse('daily')).toBe('daily');
    expect(BudgetPeriodSchema.parse('monthly')).toBe('monthly');
    expect(BudgetPeriodSchema.parse('total')).toBe('total');
  });

  it('rejects invalid periods', () => {
    expect(() => BudgetPeriodSchema.parse('weekly')).toThrow();
    expect(() => BudgetPeriodSchema.parse('')).toThrow();
  });
});

describe('BudgetLimitSchema', () => {
  it('parses valid budget limit', () => {
    const result = BudgetLimitSchema.parse({
      maxCost: 100,
      period: 'daily',
    });
    expect(result.maxCost).toBe(100);
    expect(result.period).toBe('daily');
    expect(result.warningThresholds).toEqual([0.8, 0.9]);
  });

  it('accepts custom warning thresholds', () => {
    const result = BudgetLimitSchema.parse({
      maxCost: 50,
      period: 'monthly',
      warningThresholds: [0.5, 0.75, 0.95],
    });
    expect(result.warningThresholds).toEqual([0.5, 0.75, 0.95]);
  });

  it('rejects non-positive maxCost', () => {
    expect(() => BudgetLimitSchema.parse({ maxCost: 0, period: 'daily' })).toThrow();
    expect(() => BudgetLimitSchema.parse({ maxCost: -1, period: 'daily' })).toThrow();
  });

  it('rejects warning thresholds outside 0-1', () => {
    expect(() => BudgetLimitSchema.parse({
      maxCost: 100, period: 'daily', warningThresholds: [1.5],
    })).toThrow();
    expect(() => BudgetLimitSchema.parse({
      maxCost: 100, period: 'daily', warningThresholds: [-0.1],
    })).toThrow();
  });
});

describe('BudgetConfigSchema', () => {
  it('provides sensible defaults', () => {
    const result = BudgetConfigSchema.parse({});
    expect(result.global).toBeUndefined();
    expect(result.perAgent).toEqual({});
  });

  it('parses full config with global and per-agent budgets', () => {
    const result = BudgetConfigSchema.parse({
      global: { maxCost: 1000, period: 'monthly' },
      perAgent: {
        researcher: { maxCost: 100, period: 'daily' },
        writer: { maxCost: 50, period: 'daily', warningThresholds: [0.9] },
      },
    });
    expect(result.global!.maxCost).toBe(1000);
    expect(result.global!.period).toBe('monthly');
    expect(result.perAgent.researcher.maxCost).toBe(100);
    expect(result.perAgent.writer.warningThresholds).toEqual([0.9]);
  });
});
