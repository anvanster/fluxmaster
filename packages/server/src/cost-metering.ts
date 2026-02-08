import type { Provider, BudgetUnit } from '@fluxmaster/core';
import { getCopilotMultiplier } from '@fluxmaster/auth';
import type { CostCalculator } from './cost-calculator.js';

export interface MeteredUsage {
  amount: number;
  unit: BudgetUnit;
}

export function meterUsage(
  provider: Provider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costCalculator: CostCalculator,
): MeteredUsage {
  if (provider === 'copilot') {
    return {
      amount: getCopilotMultiplier(model),
      unit: 'premium_requests',
    };
  }
  return {
    amount: costCalculator.calculateCostForTokens(model, inputTokens, outputTokens),
    unit: 'cost',
  };
}
