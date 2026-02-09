import { z } from 'zod';
import type { Tool, ToolResult, EventBus } from '@fluxmaster/core';
import type { AgentManager } from '../agent-manager.js';
import type { ScratchpadManager } from '../collaboration/scratchpad.js';

const DelegateInputSchema = z.object({
  agentId: z.string().min(1).describe('The ID of the target agent to send the message to'),
  message: z.string().min(1).describe('The message to send to the target agent'),
  includeContext: z.boolean().optional().default(false).describe('Whether to prepend shared scratchpad context to the message'),
});

export interface DelegateToolOptions {
  scratchpadManager?: ScratchpadManager;
  conversationId?: string;
  eventBus?: EventBus;
}

export function createDelegateTool(agentManager: AgentManager, options?: DelegateToolOptions): Tool {
  return {
    name: 'delegate_to_agent',
    description: 'Send a message to another agent by ID and get its response. Use this to delegate subtasks to specialized agents. Set includeContext to true to share scratchpad data.',
    inputSchema: DelegateInputSchema,
    async execute(args: unknown): Promise<ToolResult> {
      const { agentId, message, includeContext } = DelegateInputSchema.parse(args);
      const requestId = `del-${Date.now()}`;

      let fullMessage = message;
      if (includeContext && options?.scratchpadManager && options?.conversationId) {
        const entries = options.scratchpadManager.list(options.conversationId);
        if (entries.length > 0) {
          const contextBlock = entries.map((e) => `[${e.key}]: ${e.value}`).join('\n');
          fullMessage = `Shared context:\n${contextBlock}\n\n${message}`;
        }
      }

      options?.eventBus?.emit({
        type: 'orchestration:delegation_started',
        sourceAgentId: 'coordinator',
        targetAgentId: agentId,
        requestId,
        message: message.slice(0, 200),
        timestamp: new Date(),
      });

      const startTime = Date.now();
      try {
        const result = await agentManager.routeMessage(agentId, fullMessage);
        options?.eventBus?.emit({
          type: 'orchestration:delegation_completed',
          sourceAgentId: 'coordinator',
          targetAgentId: agentId,
          requestId,
          durationMs: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });
        return { content: result.text };
      } catch (err) {
        options?.eventBus?.emit({
          type: 'orchestration:delegation_completed',
          sourceAgentId: 'coordinator',
          targetAgentId: agentId,
          requestId,
          durationMs: Date.now() - startTime,
          success: false,
          timestamp: new Date(),
        });
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { content: errorMessage, isError: true };
      }
    },
  };
}
