import path from 'node:path';
import { loadConfig, EventBus, type FluxmasterConfig, type Provider } from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager, createDelegateTool, ScratchpadManager, createScratchpadTools, TaskBoard, createTaskBoardTools, createFanOutTool, createMemoryTools } from '@fluxmaster/agents';
import { createDefaultRegistry, McpServerManager, BrowserManager, createBrowserTools, PluginLoader } from '@fluxmaster/tools';
import type { AppContext } from './context.js';
import { UsageTracker } from './usage-tracker.js';
import { CostCalculator } from './cost-calculator.js';
import { DatabaseManager } from './db/database-manager.js';
import { SqliteConversationStore } from './db/stores/conversation-store.js';
import { SqliteEventStore } from './db/stores/event-store.js';
import { SqliteUsageStore } from './db/stores/usage-store.js';
import { SqliteRequestStore } from './db/stores/request-store.js';
import { SqliteToolAuditStore } from './db/stores/tool-audit-store.js';
import { SqliteBudgetStore } from './db/stores/budget-store.js';
import { PersistentUsageTracker } from './persistent-usage-tracker.js';
import { EventPersister } from './events/event-persister.js';
import { RequestTracker } from './events/request-tracker.js';
import { ToolSecurityManager } from './security/tool-security-manager.js';
import { BudgetManager } from './budget/budget-manager.js';
import { SqliteWorkflowStore } from './db/stores/workflow-store.js';
import { SqliteAgentMemoryStore } from './db/stores/agent-memory-store.js';
import { WorkflowEngine } from './workflows/workflow-engine.js';

export interface BootstrapOptions {
  configPath: string;
}

export async function bootstrap(options: BootstrapOptions): Promise<AppContext> {
  const config = await loadConfig(options.configPath);

  // Initialize SQLite database
  const dbPath = path.resolve(config.database?.path ?? 'fluxmaster.db');
  const databaseManager = new DatabaseManager(dbPath, {
    walMode: config.database?.walMode ?? true,
  });
  databaseManager.migrate();

  // Create stores
  const db = databaseManager.connection;
  const conversationStore = new SqliteConversationStore(db);
  const eventStore = new SqliteEventStore(db);
  const usageStore = new SqliteUsageStore(db);
  const requestStore = new SqliteRequestStore(db);
  const toolAuditStore = new SqliteToolAuditStore(db);
  const budgetStore = new SqliteBudgetStore(db);
  const workflowStore = new SqliteWorkflowStore(db);
  const agentMemoryStore = new SqliteAgentMemoryStore(db);

  const authManager = new AuthManager({
    copilot: config.auth.copilot,
    preferDirectApi: config.auth.preferDirectApi,
  });
  await authManager.initialize();

  const toolRegistry = createDefaultRegistry();
  const mcpServerManager = new McpServerManager(toolRegistry);
  const usageTracker = new PersistentUsageTracker(usageStore);
  const eventBus = new EventBus();

  // Start event persistence and request tracking
  const eventPersister = new EventPersister(eventBus, eventStore);
  eventPersister.start();

  const requestTracker = new RequestTracker(eventBus, requestStore);
  requestTracker.start();

  // Initialize tool security
  const toolSecurityManager = new ToolSecurityManager(config.security, eventBus, toolAuditStore);

  // Track model + provider mappings for all agents
  const agentModels = new Map<string, string>();
  const agentProviders = new Map<string, Provider>();
  eventBus.on('agent:spawned', (event) => {
    agentModels.set(event.agentId, event.model);
    agentProviders.set(event.agentId, event.provider);
  });

  const costCalculator = new CostCalculator(usageTracker, config.pricing, agentModels);

  const agentManager = new AgentManager(authManager, toolRegistry, {
    mcpServerManager,
    globalMcpServers: config.mcpServers.global,
    eventBus,
    conversationStore,
    memoryStore: agentMemoryStore,
    onBeforeToolExecute: (agentId, toolName, args) =>
      toolSecurityManager.canExecute(agentId, toolName, args),
    onAfterToolExecute: (agentId, toolName) =>
      toolSecurityManager.recordExecution(agentId, toolName),
  });

  // Create collaboration managers
  const scratchpadManager = new ScratchpadManager();
  const taskBoard = new TaskBoard();

  // Register delegate tool with scratchpad context support
  toolRegistry.register(createDelegateTool(agentManager, {
    scratchpadManager,
    conversationId: 'default',
    eventBus,
  }));

  // Register fan_out tool for parallel delegation
  toolRegistry.register(createFanOutTool(agentManager, { eventBus }));

  // Register scratchpad and task board tools
  for (const tool of createScratchpadTools(scratchpadManager, 'default', { eventBus })) {
    toolRegistry.register(tool);
  }
  for (const tool of createTaskBoardTools(taskBoard, 'default', { eventBus })) {
    toolRegistry.register(tool);
  }

  await agentManager.initializeMcp();

  // Auto-spawn agents from config
  for (const agentConfig of config.agents.list) {
    try {
      // Resolve personaRef → persona
      let persona = agentConfig.persona;
      if (!persona && agentConfig.personaRef && config.personas) {
        persona = config.personas[agentConfig.personaRef];
      }

      await agentManager.spawnAgent({
        id: agentConfig.id,
        model: agentConfig.model,
        systemPrompt: agentConfig.systemPrompt,
        tools: agentConfig.tools ?? [],
        maxTokens: agentConfig.maxTokens ?? config.agents.defaults.maxTokens,
        temperature: agentConfig.temperature ?? config.agents.defaults.temperature,
        persona,
      });

      // Register memory tools for agents with memoryProtocol
      if (persona?.memoryProtocol) {
        for (const tool of createMemoryTools(agentMemoryStore, agentConfig.id)) {
          toolRegistry.register(tool);
        }
      }
    } catch {
      // Agent spawn failures are non-fatal
    }
  }

  // Load plugins
  const pluginLoader = new PluginLoader();
  for (const pluginConfig of config.plugins ?? []) {
    try {
      const plugin = await pluginLoader.load(pluginConfig.package, pluginConfig.config);
      await pluginLoader.register(plugin, toolRegistry);
    } catch {
      // Plugin failures are non-fatal
    }
  }

  // Initialize browser if configured
  if (config.browser) {
    const browserManager = new BrowserManager();
    await browserManager.launch(config.browser);
    const browserTools = createBrowserTools(browserManager);
    for (const tool of browserTools) {
      toolRegistry.register(tool);
    }
  }

  // Initialize budget manager
  const budgetManager = new BudgetManager(config.budgets ?? {}, eventBus, budgetStore);

  // Wire cost tracking to budget manager
  eventBus.on('cost:updated', (event) => {
    budgetManager.recordUsage(event.agentId, event.cost, event.unit);
  });

  // Initialize workflow engine
  const workflowEngine = new WorkflowEngine(agentManager, eventBus, workflowStore);

  return {
    config,
    authManager,
    agentManager,
    toolRegistry,
    mcpServerManager,
    usageTracker,
    eventBus,
    costCalculator,
    databaseManager,
    conversationStore,
    requestStore,
    toolAuditStore,
    toolSecurityManager,
    budgetStore,
    budgetManager,
    workflowStore,
    workflowEngine,
    scratchpadManager,
    taskBoard,
    agentModels,
    agentProviders,
  };
}

export async function shutdown(ctx: AppContext): Promise<void> {
  ctx.agentManager.killAll();
  await ctx.mcpServerManager.stopAll();
  await ctx.authManager.shutdown();
  ctx.databaseManager.close();
}
