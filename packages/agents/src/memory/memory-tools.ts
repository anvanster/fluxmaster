import { z } from 'zod';
import type { Tool, ToolResult, IAgentMemoryStore } from '@fluxmaster/core';

const SaveDecisionInputSchema = z.object({
  decision: z.string().min(1),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1).optional().default(0.7),
  context: z.string().optional(),
});

const SaveLearningInputSchema = z.object({
  type: z.enum(['success', 'failure', 'pattern', 'preference']),
  content: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1).optional().default(0.7),
});

const RecallInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional().default(10),
});

export function createMemoryTools(memoryStore: IAgentMemoryStore, agentId: string): Tool[] {
  return [
    {
      name: 'memory_save_decision',
      description: 'Save a decision you made along with your reasoning. This helps you learn from past decisions in future interactions.',
      inputSchema: SaveDecisionInputSchema as z.ZodType<unknown>,
      async execute(args: unknown): Promise<ToolResult> {
        const input = SaveDecisionInputSchema.parse(args);
        const saved = memoryStore.saveDecision({
          agentId,
          decision: input.decision,
          reasoning: input.reasoning,
          confidence: input.confidence,
          context: input.context,
        });
        return { content: `Decision saved (id: ${saved.id}): "${input.decision}"` };
      },
    },
    {
      name: 'memory_save_learning',
      description: 'Save a learning or insight for future reference. Use this when you discover patterns, encounter failures, or find successful approaches.',
      inputSchema: SaveLearningInputSchema as z.ZodType<unknown>,
      async execute(args: unknown): Promise<ToolResult> {
        const input = SaveLearningInputSchema.parse(args);
        const saved = memoryStore.saveLearning({
          agentId,
          type: input.type,
          content: input.content,
          source: input.source,
          confidence: input.confidence,
        });
        return { content: `Learning saved (id: ${saved.id}): [${input.type}] "${input.content}"` };
      },
    },
    {
      name: 'memory_recall',
      description: 'Recall past decisions and learnings relevant to a topic. Use this before making important decisions to build on past experience.',
      inputSchema: RecallInputSchema as z.ZodType<unknown>,
      async execute(args: unknown): Promise<ToolResult> {
        const input = RecallInputSchema.parse(args);
        const results = memoryStore.recall(agentId, input.query, input.limit);

        if (results.length === 0) {
          return { content: `No memories found matching "${input.query}".` };
        }

        const lines: string[] = [`Found ${results.length} relevant memories:\n`];
        for (const mem of results) {
          if ('decision' in mem) {
            lines.push(`- [Decision] (confidence: ${mem.confidence}) ${mem.decision}`);
            lines.push(`  Reasoning: ${mem.reasoning}`);
            if (mem.outcome) lines.push(`  Outcome: ${mem.outcome}`);
          } else {
            lines.push(`- [Learning/${mem.type}] (confidence: ${mem.confidence}) ${mem.content}`);
            lines.push(`  Source: ${mem.source}`);
          }
        }

        return { content: lines.join('\n') };
      },
    },
  ];
}
