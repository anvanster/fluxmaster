import type { FluxmasterConfig, EventBus, IConversationStore, IRequestStore, IToolAuditStore, IBudgetStore, IWorkflowStore, Provider } from '@fluxmaster/core';
import type { AuthManager } from '@fluxmaster/auth';
import type { AgentManager } from '@fluxmaster/agents';
import type { ToolRegistry, McpServerManager } from '@fluxmaster/tools';
import type { UsageTracker } from './usage-tracker.js';
import type { CostCalculator } from './cost-calculator.js';
import type { DatabaseManager } from './db/database-manager.js';
import type { ToolSecurityManager } from './security/tool-security-manager.js';
import type { BudgetManager } from './budget/budget-manager.js';
import type { WorkflowEngine } from './workflows/workflow-engine.js';

export interface AppContext {
  config: FluxmasterConfig;
  authManager: AuthManager;
  agentManager: AgentManager;
  toolRegistry: ToolRegistry;
  mcpServerManager: McpServerManager;
  usageTracker: UsageTracker;
  eventBus: EventBus;
  costCalculator: CostCalculator;
  databaseManager: DatabaseManager;
  conversationStore: IConversationStore;
  requestStore: IRequestStore;
  toolAuditStore: IToolAuditStore;
  toolSecurityManager: ToolSecurityManager;
  budgetStore: IBudgetStore;
  budgetManager: BudgetManager;
  workflowStore: IWorkflowStore;
  workflowEngine: WorkflowEngine;
  agentModels: Map<string, string>;
  agentProviders: Map<string, Provider>;
}
