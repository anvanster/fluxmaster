import { z } from 'zod';
import { CopilotConfigSchema } from './auth.js';

export const McpServerConfigSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  env: z.record(z.string()).optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

const BrowserConfigSchema = z.object({
  headless: z.boolean().default(true),
  userDataDir: z.string().optional(),
  viewport: z.object({
    width: z.number().int().positive().default(1280),
    height: z.number().int().positive().default(720),
  }).default({}),
});

export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;

const AgentConfigSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).default([]),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  mcpServers: z.array(McpServerConfigSchema).default([]),
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
  mcpServers: z.object({
    global: z.array(McpServerConfigSchema).default([]),
  }).default({}),
  browser: BrowserConfigSchema.optional(),
});

export type FluxmasterConfig = z.infer<typeof FluxmasterConfigSchema>;

export { AgentConfigSchema, BrowserConfigSchema };
