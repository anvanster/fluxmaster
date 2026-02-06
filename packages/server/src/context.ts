import type { FluxmasterConfig } from '@fluxmaster/core';
import type { AuthManager } from '@fluxmaster/auth';
import type { AgentManager } from '@fluxmaster/agents';
import type { ToolRegistry, McpServerManager } from '@fluxmaster/tools';
import type { UsageTracker } from './usage-tracker.js';

export interface AppContext {
  config: FluxmasterConfig;
  authManager: AuthManager;
  agentManager: AgentManager;
  toolRegistry: ToolRegistry;
  mcpServerManager: McpServerManager;
  usageTracker: UsageTracker;
}
