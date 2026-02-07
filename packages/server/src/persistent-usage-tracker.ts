import { randomUUID } from 'node:crypto';
import type { IUsageStore, UsageEntry } from '@fluxmaster/core';
import { UsageTracker } from './usage-tracker.js';

export class PersistentUsageTracker extends UsageTracker {
  constructor(private usageStore: IUsageStore) {
    super();
    this.hydrate();
  }

  override record(agentId: string, inputTokens: number, outputTokens: number): void {
    super.record(agentId, inputTokens, outputTokens);
    this.usageStore.recordUsage({
      id: randomUUID(),
      agentId,
      inputTokens,
      outputTokens,
      timestamp: new Date(),
    });
  }

  getUsageHistory(agentId: string, limit?: number): UsageEntry[] {
    return this.usageStore.getUsageHistory(agentId, limit);
  }

  private hydrate(): void {
    const all = this.usageStore.getAllUsage();
    for (const [agentId, usage] of Object.entries(all)) {
      // Record aggregated totals as a single entry to restore in-memory state
      if (usage.inputTokens > 0 || usage.outputTokens > 0) {
        // Use super.record to avoid re-persisting to DB
        // We need to reconstruct the requestCount too
        for (let i = 0; i < usage.requestCount; i++) {
          if (i === 0) {
            super.record(agentId, usage.inputTokens, usage.outputTokens);
          } else {
            super.record(agentId, 0, 0);
          }
        }
      }
    }
  }
}
