import type { UsageTracker } from './usage-tracker.js';

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
}
