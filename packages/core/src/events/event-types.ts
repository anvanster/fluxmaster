import type { AgentStatus } from '../types/agent.js';
import type { Provider } from '../types/auth.js';
import type { BudgetUnit } from '../types/budget.js';

export type FluxmasterEvent =
  | { type: 'agent:spawned'; agentId: string; model: string; provider: Provider; timestamp: Date }
  | { type: 'agent:killed'; agentId: string; timestamp: Date }
  | { type: 'agent:status_changed'; agentId: string; status: AgentStatus; previousStatus: AgentStatus; timestamp: Date }
  | { type: 'message:started'; agentId: string; requestId: string; timestamp: Date }
  | { type: 'message:text_delta'; agentId: string; requestId: string; text: string; timestamp: Date }
  | { type: 'message:completed'; agentId: string; requestId: string; text: string; usage: { inputTokens: number; outputTokens: number }; iterations: number; timestamp: Date }
  | { type: 'message:error'; agentId: string; requestId: string; error: string; timestamp: Date }
  | { type: 'tool:call_started'; agentId: string; requestId: string; toolName: string; timestamp: Date }
  | { type: 'tool:call_completed'; agentId: string; requestId: string; toolName: string; result: string; isError: boolean; timestamp: Date }
  | { type: 'mcp:server_started'; serverName: string; timestamp: Date }
  | { type: 'mcp:server_stopped'; serverName: string; timestamp: Date }
  | { type: 'cost:updated'; agentId: string; inputTokens: number; outputTokens: number; cost: number; unit: BudgetUnit; provider: Provider; timestamp: Date }
  | { type: 'security:tool_denied'; agentId: string; toolName: string; reason: string; timestamp: Date }
  | { type: 'security:rate_limited'; agentId: string; toolName: string; callsPerMinute: number; limit: number; timestamp: Date }
  | { type: 'security:audit_logged'; agentId: string; toolName: string; permitted: boolean; durationMs: number; timestamp: Date }
  | { type: 'budget:warning'; budgetId: string; threshold: number; currentCost: number; maxCost: number; timestamp: Date }
  | { type: 'budget:exceeded'; budgetId: string; currentCost: number; maxCost: number; timestamp: Date }
  | { type: 'budget:request_blocked'; agentId: string; budgetId: string; currentCost: number; maxCost: number; timestamp: Date }
  | { type: 'workflow:started'; workflowId: string; runId: string; timestamp: Date }
  | { type: 'workflow:step_started'; workflowId: string; runId: string; stepId: string; timestamp: Date }
  | { type: 'workflow:step_completed'; workflowId: string; runId: string; stepId: string; output?: string; timestamp: Date }
  | { type: 'workflow:step_failed'; workflowId: string; runId: string; stepId: string; error: string; timestamp: Date }
  | { type: 'workflow:completed'; workflowId: string; runId: string; timestamp: Date }
  | { type: 'workflow:failed'; workflowId: string; runId: string; error: string; timestamp: Date };

export type FluxmasterEventType = FluxmasterEvent['type'];

export type EventOfType<T extends FluxmasterEventType> = Extract<FluxmasterEvent, { type: T }>;
