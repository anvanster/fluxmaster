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

export interface CostResponse {
  totalCost: number;
  byAgent: Record<string, number>;
}

// --- Conversation DTOs ---

export interface ConversationSummaryResponse {
  id: string;
  agentId: string;
  title?: string;
  messageCount: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface ConversationListResponse {
  conversations: ConversationSummaryResponse[];
}

export interface ConversationMessagesResponse {
  messages: Array<{
    id: string;
    conversationId: string;
    agentId: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: string;
    timestamp: string;
  }>;
}

// --- Request DTOs ---

export interface ToolCallTimingResponse {
  toolName: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  isError: boolean;
}

export interface RequestDetailResponse {
  id: string;
  agentId: string;
  conversationId: string | null;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  startedAt: string;
  firstTokenAt?: string;
  completedAt?: string;
  inputTokens?: number;
  outputTokens?: number;
  iterations?: number;
  toolCalls: ToolCallTimingResponse[];
  errorMessage?: string;
  ttftMs: number | null;
  totalDurationMs: number | null;
}

export interface RequestListResponse {
  requests: RequestDetailResponse[];
}

// --- Error DTOs ---

export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}
