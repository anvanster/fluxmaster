import { describe, it, expect, beforeEach } from 'vitest';
import { CostCalculator, type ModelPricing } from './cost-calculator.js';
import { UsageTracker } from './usage-tracker.js';

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'claude-sonnet-4': { inputPer1M: 3, outputPer1M: 15 },
  'claude-haiku-3.5': { inputPer1M: 0.8, outputPer1M: 4 },
  'claude-opus-4': { inputPer1M: 15, outputPer1M: 75 },
};

describe('CostCalculator', () => {
  let tracker: UsageTracker;
  let agentModels: Map<string, string>;
  let calc: CostCalculator;

  beforeEach(() => {
    tracker = new UsageTracker();
    agentModels = new Map();
    calc = new CostCalculator(tracker, DEFAULT_PRICING, agentModels);
  });

  it('returns zero cost when no usage recorded', () => {
    expect(calc.getTotalCost()).toBe(0);
    expect(calc.getCostBreakdown()).toEqual({});
  });

  it('calculates cost for a single agent', () => {
    agentModels.set('agent-1', 'gpt-4o');
    tracker.record('agent-1', 1_000_000, 500_000);

    const cost = calc.calculateCost('agent-1');
    // input: 1M * 2.5/1M = 2.5, output: 500K * 10/1M = 5.0
    expect(cost).toBeCloseTo(7.5);
  });

  it('calculates cost for multiple agents', () => {
    agentModels.set('agent-1', 'gpt-4o');
    agentModels.set('agent-2', 'claude-sonnet-4');
    tracker.record('agent-1', 100_000, 50_000);
    tracker.record('agent-2', 200_000, 100_000);

    const breakdown = calc.getCostBreakdown();

    // agent-1: input 100K * 2.5/1M = 0.25, output 50K * 10/1M = 0.5 → 0.75
    expect(breakdown['agent-1']).toBeCloseTo(0.75);
    // agent-2: input 200K * 3/1M = 0.6, output 100K * 15/1M = 1.5 → 2.1
    expect(breakdown['agent-2']).toBeCloseTo(2.1);
  });

  it('returns total cost across all agents', () => {
    agentModels.set('a1', 'gpt-4o-mini');
    agentModels.set('a2', 'gpt-4o-mini');
    tracker.record('a1', 1_000_000, 1_000_000);
    tracker.record('a2', 1_000_000, 1_000_000);

    // Each: input 1M * 0.15/1M = 0.15, output 1M * 0.6/1M = 0.6 → 0.75
    // Total: 1.5
    expect(calc.getTotalCost()).toBeCloseTo(1.5);
  });

  it('returns zero cost for agent with unknown model', () => {
    agentModels.set('agent-x', 'unknown-model');
    tracker.record('agent-x', 1_000_000, 1_000_000);

    expect(calc.calculateCost('agent-x')).toBe(0);
  });

  it('returns zero cost for agent with no model mapping', () => {
    tracker.record('no-model', 1_000_000, 1_000_000);

    expect(calc.calculateCost('no-model')).toBe(0);
  });

  it('handles claude-opus-4 pricing correctly', () => {
    agentModels.set('opus', 'claude-opus-4');
    tracker.record('opus', 1_000_000, 1_000_000);

    // input: 1M * 15/1M = 15, output: 1M * 75/1M = 75 → 90
    expect(calc.calculateCost('opus')).toBeCloseTo(90);
  });

  it('updates costs dynamically as usage grows', () => {
    agentModels.set('grow', 'gpt-4o');
    tracker.record('grow', 100_000, 50_000);

    const cost1 = calc.calculateCost('grow');
    // 100K * 2.5/1M + 50K * 10/1M = 0.25 + 0.5 = 0.75
    expect(cost1).toBeCloseTo(0.75);

    tracker.record('grow', 100_000, 50_000);
    const cost2 = calc.calculateCost('grow');
    // 200K * 2.5/1M + 100K * 10/1M = 0.5 + 1.0 = 1.5
    expect(cost2).toBeCloseTo(1.5);
  });

  it('getCostBreakdown only includes agents with usage', () => {
    agentModels.set('active', 'gpt-4o');
    agentModels.set('idle', 'gpt-4o');
    tracker.record('active', 100_000, 50_000);

    const breakdown = calc.getCostBreakdown();
    expect(Object.keys(breakdown)).toEqual(['active']);
  });

  it('calculateCost returns zero for agent with zero usage', () => {
    agentModels.set('zero', 'gpt-4o');
    expect(calc.calculateCost('zero')).toBe(0);
  });
});
