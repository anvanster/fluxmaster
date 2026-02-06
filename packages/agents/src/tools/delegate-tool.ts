import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';
import type { AgentManager } from '../agent-manager.js';

const DelegateInputSchema = z.object({
  agentId: z.string().min(1).describe('The ID of the target agent to send the message to'),
  message: z.string().min(1).describe('The message to send to the target agent'),
});

export function createDelegateTool(agentManager: AgentManager): Tool {
  return {
    name: 'delegate_to_agent',
    description: 'Send a message to another agent by ID and get its response. Use this to delegate subtasks to specialized agents.',
    inputSchema: DelegateInputSchema,
    async execute(args: unknown): Promise<ToolResult> {
      const { agentId, message } = DelegateInputSchema.parse(args);

      try {
        const result = await agentManager.routeMessage(agentId, message);
        return { content: result.text };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { content: errorMessage, isError: true };
      }
    },
  };
}
