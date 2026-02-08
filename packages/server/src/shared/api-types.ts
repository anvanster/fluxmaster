import type { AgentStatus, ContentBlock, Message } from '@fluxmaster/core';

// Re-export core types consumed by web package
export type { FluxmasterConfig } from '@fluxmaster/core';

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
  tools?: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelInfo {
  id: string;
  provider: string;
  premiumMultiplier: number;
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

export interface AgentCostEntry {
  amount: number;
  unit: 'cost' | 'premium_requests';
}

export interface CostResponse {
  totalCost: number;
  totalPremiumRequests: number;
  byAgent: Record<string, AgentCostEntry>;
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

// --- Security DTOs ---

export interface AuditEntryResponse {
  id: string;
  agentId: string;
  toolName: string;
  args: string;
  result: string;
  isError: boolean;
  permitted: boolean;
  denialReason?: string;
  durationMs: number;
  timestamp: string;
}

export interface AuditListResponse {
  entries: AuditEntryResponse[];
}

export interface SecurityPolicyResponse {
  policy: {
    defaultLevel: string;
    toolLevels: Record<string, string>;
    agentPermissions: Record<string, {
      allowlist?: string[];
      denylist?: string[];
      maxCallsPerMinute?: number;
    }>;
  };
}

// --- Budget DTOs ---

export interface BudgetStatusResponse {
  id: string;
  period: string;
  unit: string;
  maxCost: number;
  currentCost: number;
  percentage: number;
  exceeded: boolean;
  warningThresholds: number[];
  triggeredThresholds: number[];
}

export interface BudgetListResponse {
  budgets: BudgetStatusResponse[];
}

export interface BudgetAlertResponse {
  id: string;
  budgetId: string;
  type: 'warning' | 'exceeded';
  unit: string;
  threshold: number;
  currentCost: number;
  maxCost: number;
  timestamp: string;
}

export interface BudgetAlertListResponse {
  alerts: BudgetAlertResponse[];
}

// --- Workflow DTOs ---

export interface WorkflowDefinitionResponse {
  id: string;
  name: string;
  description?: string;
  inputs: Record<string, { type: string; description?: string }>;
  steps: unknown[];
}

export interface WorkflowListResponse {
  workflows: WorkflowDefinitionResponse[];
}

export interface WorkflowRunResponse {
  id: string;
  workflowId: string;
  status: string;
  inputs: Record<string, unknown>;
  stepResults: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowRunListResponse {
  runs: WorkflowRunResponse[];
}

// --- Error DTOs ---

export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}
