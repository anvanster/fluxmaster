import type { AgentStatus, ContentBlock, Message } from '@fluxmaster/core';

// --- Agent DTOs ---

export interface SpawnAgentRequest {
  id: string;
  model: string;
  systemPrompt?: string;
  tools?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface SendMessageRequest {
  message: string;
}

export interface AgentInfoResponse {
  id: string;
  model: string;
  status: AgentStatus;
}

export interface MessageResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  iterations: number;
  allContent: ContentBlock[];
}

export interface HistoryResponse {
  messages: Message[];
}

// --- Tool DTOs ---

export interface ToolSummary {
  name: string;
  description: string;
}

// --- MCP DTOs ---

export interface McpServerInfo {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  url?: string;
}

// --- Auth DTOs ---

export interface AuthStatusResponse {
  copilotConfigured: boolean;
  copilotReady: boolean;
  claudeCli: boolean;
  directProviders: string[];
}

// --- System DTOs ---

export interface HealthResponse {
  status: 'ok';
  uptime: number;
}

export interface UsageResponse {
  total: { inputTokens: number; outputTokens: number; requestCount: number };
  byAgent: Record<string, { inputTokens: number; outputTokens: number; requestCount: number }>;
}

// --- Error DTOs ---

export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}
