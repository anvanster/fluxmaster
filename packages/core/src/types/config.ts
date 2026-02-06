import { z } from 'zod';
import { CopilotConfigSchema } from './auth.js';

const AgentConfigSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).default([]),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const FluxmasterConfigSchema = z.object({
  auth: z.object({
    copilot: CopilotConfigSchema.optional(),
    preferDirectApi: z.boolean().default(false),
  }),
  agents: z.object({
    defaults: z.object({
      maxTokens: z.number().int().positive().default(8192),
      temperature: z.number().min(0).max(2).default(0.7),
    }).default({}),
    list: z.array(AgentConfigSchema).default([]),
  }).default({}),
});

export type FluxmasterConfig = z.infer<typeof FluxmasterConfigSchema>;

export { AgentConfigSchema };
