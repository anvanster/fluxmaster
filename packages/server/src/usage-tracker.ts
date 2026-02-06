export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

export class UsageTracker {
  private usage: Map<string, AgentUsage> = new Map();

  record(agentId: string, inputTokens: number, outputTokens: number): void {
    const current = this.usage.get(agentId) ?? { inputTokens: 0, outputTokens: 0, requestCount: 0 };
    current.inputTokens += inputTokens;
    current.outputTokens += outputTokens;
    current.requestCount += 1;
    this.usage.set(agentId, current);
  }

  getAgent(agentId: string): AgentUsage {
    return this.usage.get(agentId) ?? { inputTokens: 0, outputTokens: 0, requestCount: 0 };
  }

  getTotal(): AgentUsage {
    let inputTokens = 0;
    let outputTokens = 0;
    let requestCount = 0;
    for (const entry of this.usage.values()) {
      inputTokens += entry.inputTokens;
      outputTokens += entry.outputTokens;
      requestCount += entry.requestCount;
    }
    return { inputTokens, outputTokens, requestCount };
  }

  getAll(): Record<string, AgentUsage> {
    return Object.fromEntries(this.usage);
  }

  reset(): void {
    this.usage.clear();
  }
}
