import type { Provider } from '@fluxmaster/core';
import { getCopilotMultiplier } from '@fluxmaster/auth';
import type { UsageTracker } from './usage-tracker.js';
import type { AgentCostEntry } from './shared/api-types.js';

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export class CostCalculator {
  private usageTracker: UsageTracker;
  private pricing: Record<string, ModelPricing>;
  private agentModels: Map<string, string>;

  constructor(
    usageTracker: UsageTracker,
    pricing: Record<string, ModelPricing>,
    agentModels: Map<string, string>,
  ) {
    this.usageTracker = usageTracker;
    this.pricing = pricing;
    this.agentModels = agentModels;
  }

  calculateCost(agentId: string): number {
    const model = this.agentModels.get(agentId);
    if (!model) return 0;

    const price = this.pricing[model];
    if (!price) return 0;

    const usage = this.usageTracker.getAgent(agentId);
    if (usage.inputTokens === 0 && usage.outputTokens === 0) return 0;

    return (usage.inputTokens * price.inputPer1M + usage.outputTokens * price.outputPer1M) / 1_000_000;
  }

  getTotalCost(): number {
    const all = this.usageTracker.getAll();
    let total = 0;
    for (const agentId of Object.keys(all)) {
      total += this.calculateCost(agentId);
    }
    return total;
  }

  calculateCostForTokens(model: string, inputTokens: number, outputTokens: number): number {
    const price = this.pricing[model];
    if (!price) return 0;
    return (inputTokens * price.inputPer1M + outputTokens * price.outputPer1M) / 1_000_000;
  }

  getCostBreakdown(): Record<string, number> {
    const all = this.usageTracker.getAll();
    const breakdown: Record<string, number> = {};
    for (const agentId of Object.keys(all)) {
      const cost = this.calculateCost(agentId);
      if (cost > 0) {
        breakdown[agentId] = cost;
      }
    }
    return breakdown;
  }

  getProviderAwareBreakdown(agentProviders: Map<string, Provider>): Record<string, AgentCostEntry> {
    const all = this.usageTracker.getAll();
    const breakdown: Record<string, AgentCostEntry> = {};
    for (const agentId of Object.keys(all)) {
      const provider = agentProviders.get(agentId);
      const model = this.agentModels.get(agentId) ?? '';
      if (provider === 'copilot') {
        const usage = this.usageTracker.getAgent(agentId);
        breakdown[agentId] = {
          amount: getCopilotMultiplier(model) * usage.requestCount,
          unit: 'premium_requests',
        };
      } else {
        const cost = this.calculateCost(agentId);
        if (cost > 0) {
          breakdown[agentId] = { amount: cost, unit: 'cost' };
        }
      }
    }
    return breakdown;
  }

  getTotalPremiumRequests(agentProviders: Map<string, Provider>): number {
    const all = this.usageTracker.getAll();
    let total = 0;
    for (const agentId of Object.keys(all)) {
      if (agentProviders.get(agentId) === 'copilot') {
        const model = this.agentModels.get(agentId) ?? '';
        const usage = this.usageTracker.getAgent(agentId);
        total += getCopilotMultiplier(model) * usage.requestCount;
      }
    }
    return total;
  }
}
