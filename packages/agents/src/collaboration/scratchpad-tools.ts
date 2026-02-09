import { z } from 'zod';
import type { Tool, ToolResult, EventBus } from '@fluxmaster/core';
import type { ScratchpadManager } from './scratchpad.js';

export interface ScratchpadToolsOptions {
  eventBus?: EventBus;
}

export function createScratchpadTools(scratchpad: ScratchpadManager, conversationId: string, options?: ScratchpadToolsOptions): Tool[] {
  const scratchpadWrite: Tool = {
    name: 'scratchpad_write',
    description: 'Write a key-value pair to the shared scratchpad. Use this to share data, plans, or intermediate results between agents.',
    inputSchema: z.object({
      key: z.string().min(1).describe('Key to write'),
      value: z.string().describe('Value to store'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { key, value } = z.object({ key: z.string().min(1), value: z.string() }).parse(args);
      scratchpad.set(conversationId, key, value);
      options?.eventBus?.emit({
        type: 'orchestration:scratchpad_updated',
        agentId: 'unknown',
        key,
        action: 'write' as const,
        timestamp: new Date(),
      });
      return { content: `Wrote key '${key}' to scratchpad` };
    },
  };

  const scratchpadRead: Tool = {
    name: 'scratchpad_read',
    description: 'Read a value from the shared scratchpad by key.',
    inputSchema: z.object({
      key: z.string().min(1).describe('Key to read'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { key } = z.object({ key: z.string().min(1) }).parse(args);
      const value = scratchpad.get(conversationId, key);
      if (value === undefined) {
        return { content: `Key '${key}' not found in scratchpad` };
      }
      return { content: value };
    },
  };

  const scratchpadList: Tool = {
    name: 'scratchpad_list',
    description: 'List all key-value pairs in the shared scratchpad.',
    inputSchema: z.object({}),
    async execute(): Promise<ToolResult> {
      const entries = scratchpad.list(conversationId);
      if (entries.length === 0) {
        return { content: 'Scratchpad is empty' };
      }
      return { content: JSON.stringify(entries, null, 2) };
    },
  };

  return [scratchpadWrite, scratchpadRead, scratchpadList];
}
