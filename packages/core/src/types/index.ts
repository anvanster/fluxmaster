export type {
  Provider,
  ModelEndpoint,
  IAuthProvider,
  CopilotConfig,
  DirectApiConfig,
  AuthManagerConfig,
} from './auth.js';

export { CopilotConfigSchema } from './auth.js';

export type {
  ToolDefinition,
  ToolResult,
  Tool,
  AnthropicToolFormat,
  OpenAIToolFormat,
} from './tool.js';

export type {
  AgentConfig,
  MessageRole,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,
  Message,
  AgentSession,
  AgentStatus,
  StopReason,
} from './agent.js';

export type { FluxmasterConfig, McpServerConfig, BrowserConfig } from './config.js';
export { FluxmasterConfigSchema, AgentConfigSchema, McpServerConfigSchema, BrowserConfigSchema, DatabaseConfigSchema, AiFeatureConfigSchema, ToolSecurityPolicySchema, BudgetConfigSchema } from './config.js';

export type {
  ToolPermissionLevel,
  ToolSecurityPolicy,
  AgentToolPermissions,
  FilesystemPolicy,
  NetworkPolicy,
  ToolAuditEntry,
} from './tool-security.js';
export {
  ToolPermissionLevelSchema,
  ToolSecurityPolicySchema as ToolSecurityPolicyZodSchema,
  AgentToolPermissionsSchema,
  FilesystemPolicySchema,
  NetworkPolicySchema,
  DEFAULT_TOOL_LEVELS,
} from './tool-security.js';

export type { FluxmasterPlugin, PluginConfig } from './plugin.js';

export type {
  StoredMessage,
  ConversationSummary,
  StoredEvent,
  UsageEntry,
  AggregatedUsage,
  ToolCallTiming,
  RequestRecord,
  IConversationStore,
  IEventStore,
  IUsageStore,
  IRequestStore,
  IToolAuditStore,
  IBudgetStore,
  IWorkflowStore,
} from './database.js';

export type {
  AiFeatureConfig,
  ConversationTitle,
  SuggestedFollowUp,
} from './ai-features.js';

export type {
  BudgetPeriod,
  BudgetUnit,
  BudgetLimit,
  BudgetConfig,
  BudgetStatus,
  BudgetAlert,
} from './budget.js';
export {
  BudgetPeriodSchema,
  BudgetUnitSchema,
  BudgetLimitSchema,
} from './budget.js';

export type {
  WorkflowStatus,
  StepStatus,
  WorkflowStep,
  WorkflowInput,
  WorkflowDefinition,
  StepResult,
  WorkflowRun,
} from './workflow.js';
export {
  WorkflowStatusSchema,
  StepStatusSchema,
  WorkflowStepSchema,
  WorkflowInputSchema,
  WorkflowDefinitionSchema,
} from './workflow.js';

export type {
  AgentDecision,
  AgentLearning,
  AgentGoalRecord,
  IAgentMemoryStore,
} from './agent-memory.js';

export type {
  Persona,
  PersonaIdentity,
  PersonaSoul,
  PersonaToolPreferences,
  PersonaMemoryProtocol,
  PersonaAutonomy,
} from './persona.js';
export {
  PersonaSchema,
  PersonaIdentitySchema,
  PersonaSoulSchema,
  PersonaToolPreferencesSchema,
  PersonaMemoryProtocolSchema,
  PersonaAutonomySchema,
} from './persona.js';
