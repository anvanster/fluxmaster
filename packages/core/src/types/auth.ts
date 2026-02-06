import { z } from 'zod';

export type Provider = 'copilot' | 'anthropic' | 'openai' | 'google' | 'claude-cli';

export interface ModelEndpoint {
  model: string;
  baseUrl: string;
  apiKey: string;
  provider: Provider;
}

export interface IAuthProvider {
  readonly name: string;
  initialize(): Promise<void>;
  getEndpoint(model: string): Promise<ModelEndpoint>;
  isModelAvailable(model: string): boolean;
  shutdown(): Promise<void>;
}

export const CopilotConfigSchema = z.object({
  accountType: z.enum(['individual', 'business', 'enterprise']).default('individual'),
  port: z.number().int().positive().default(4141),
  rateLimit: z.number().positive().optional(),
  githubToken: z.string().optional(),
  maxStartAttempts: z.number().int().positive().default(30),
});

export type CopilotConfig = z.infer<typeof CopilotConfigSchema>;

export interface DirectApiConfig {
  anthropic?: { apiKey: string; baseUrl?: string };
  openai?: { apiKey: string; baseUrl?: string };
  google?: { apiKey: string };
}

export interface AuthManagerConfig {
  copilot?: CopilotConfig;
  preferDirectApi: boolean;
}
