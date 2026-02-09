import { z } from 'zod';
import type { Tool, ToolResult, EventBus } from '@fluxmaster/core';
import type { AgentManager } from '../agent-manager.js';

const inputSchema = z.object({
  agentIds: z.array(z.string().min(1)).min(1).describe('Array of agent IDs to send the message to'),
  message: z.string().min(1).describe('Message to send to all agents in parallel'),
});

export interface FanOutToolOptions {
  eventBus?: EventBus;
}

export function createFanOutTool(agentManager: AgentManager, options?: FanOutToolOptions): Tool {
  return {
    name: 'fan_out',
    description: 'Send the same message to multiple agents in parallel and collect all responses. Useful for getting multiple perspectives or parallelizing work.',
    inputSchema,
    async execute(args: unknown): Promise<ToolResult> {
      const { agentIds, message } = inputSchema.parse(args);
      const requestId = `fan-${Date.now()}`;

      options?.eventBus?.emit({
        type: 'orchestration:fanout_started',
        sourceAgentId: 'coordinator',
        targetAgentIds: agentIds,
        requestId,
        timestamp: new Date(),
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(
        agentIds.map((id) => agentManager.routeMessage(id, message)),
      );

      const responses = results.map((result, i) => {
        if (result.status === 'fulfilled') {
          return { agentId: agentIds[i], response: result.value.text };
        }
        return { agentId: agentIds[i], error: result.reason?.message ?? String(result.reason) };
      });

      options?.eventBus?.emit({
        type: 'orchestration:fanout_completed',
        sourceAgentId: 'coordinator',
        targetAgentIds: agentIds,
        requestId,
        results: results.map((r, i) => ({
          agentId: agentIds[i],
          success: r.status === 'fulfilled',
        })),
        durationMs: Date.now() - startTime,
        timestamp: new Date(),
      });

      return { content: JSON.stringify(responses, null, 2) };
    },
  };
}
