import type { AgentStatus } from '../types/agent.js';

export type FluxmasterEvent =
  | { type: 'agent:spawned'; agentId: string; model: string; timestamp: Date }
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
  | { type: 'cost:updated'; agentId: string; inputTokens: number; outputTokens: number; cost: number; timestamp: Date };

export type FluxmasterEventType = FluxmasterEvent['type'];

export type EventOfType<T extends FluxmasterEventType> = Extract<FluxmasterEvent, { type: T }>;
