import type { ContentBlock } from '@fluxmaster/core';

// --- Client → Server ---

export type WsClientMessage =
  | { type: 'message'; agentId: string; text: string; requestId: string }
  | { type: 'ping' };

// --- Server → Client ---

export type WsServerMessage =
  | { type: 'text_delta'; text: string; requestId: string }
  | { type: 'tool_use_start'; toolName: string; requestId: string }
  | { type: 'tool_result'; toolName: string; content: string; isError: boolean; requestId: string }
  | { type: 'message_complete'; text: string; usage: { inputTokens: number; outputTokens: number }; iterations: number; allContent: ContentBlock[]; requestId: string }
  | { type: 'error'; error: string; requestId?: string }
  | { type: 'pong' }
  | { type: 'agent_event'; event: 'spawned' | 'killed' | 'status_changed' | 'message_completed'; agentId: string; data?: Record<string, unknown> }
  | { type: 'cost_update'; agentId: string; cost: number; unit: string; inputTokens: number; outputTokens: number }
  | { type: 'ai_feature'; feature: 'title' | 'suggestions' | 'summary'; conversationId: string; requestId?: string; data: unknown }
  | { type: 'budget_event'; event: 'warning' | 'exceeded' | 'request_blocked'; budgetId: string; currentCost: number; maxCost: number; threshold?: number; agentId?: string };
