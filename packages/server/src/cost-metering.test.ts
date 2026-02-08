import { describe, it, expect, vi } from 'vitest';
import { meterUsage } from './cost-metering.js';
import type { CostCalculator } from './cost-calculator.js';

function mockCostCalculator(costForTokens: number): CostCalculator {
  return {
    calculateCostForTokens: vi.fn().mockReturnValue(costForTokens),
  } as unknown as CostCalculator;
}

describe('meterUsage', () => {
  it('returns 0 premium_requests for copilot free model', () => {
    const calc = mockCostCalculator(0);
    const result = meterUsage('copilot', 'gpt-4.1', 1000, 500, calc);
    expect(result.unit).toBe('premium_requests');
    expect(result.amount).toBe(0);
  });

  it('returns fractional premium_requests for copilot budget model', () => {
    const calc = mockCostCalculator(0);
    const result = meterUsage('copilot', 'claude-haiku-4.5', 1000, 500, calc);
    expect(result.unit).toBe('premium_requests');
    expect(result.amount).toBe(0.33);
  });

  it('returns 1 premium_request for copilot standard model', () => {
    const calc = mockCostCalculator(0);
    const result = meterUsage('copilot', 'claude-sonnet-4', 1000, 500, calc);
    expect(result.unit).toBe('premium_requests');
    expect(result.amount).toBe(1);
  });

  it('returns 3 premium_requests for copilot expensive model', () => {
    const calc = mockCostCalculator(0);
    const result = meterUsage('copilot', 'claude-opus-4.5', 1000, 500, calc);
    expect(result.unit).toBe('premium_requests');
    expect(result.amount).toBe(3);
  });

  it('returns dollar cost for direct anthropic provider', () => {
    const calc = mockCostCalculator(0.0125);
    const result = meterUsage('anthropic', 'claude-sonnet-4', 1000, 500, calc);
    expect(result.unit).toBe('cost');
    expect(result.amount).toBe(0.0125);
  });

  it('returns dollar cost for openai provider', () => {
    const calc = mockCostCalculator(0.05);
    const result = meterUsage('openai', 'gpt-5', 2000, 1000, calc);
    expect(result.unit).toBe('cost');
    expect(result.amount).toBe(0.05);
  });

  it('returns dollar cost for claude-cli provider', () => {
    const calc = mockCostCalculator(0.01);
    const result = meterUsage('claude-cli', 'claude-sonnet-4', 500, 200, calc);
    expect(result.unit).toBe('cost');
    expect(result.amount).toBe(0.01);
  });

  it('does not call costCalculator for copilot provider', () => {
    const calc = mockCostCalculator(999);
    meterUsage('copilot', 'gpt-5', 1000, 500, calc);
    expect(calc.calculateCostForTokens).not.toHaveBeenCalled();
  });

  it('calls costCalculator with correct args for non-copilot provider', () => {
    const calc = mockCostCalculator(0.05);
    meterUsage('anthropic', 'claude-sonnet-4', 1000, 500, calc);
    expect(calc.calculateCostForTokens).toHaveBeenCalledWith('claude-sonnet-4', 1000, 500);
  });
});
