import { loadConfig, type FluxmasterConfig } from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry, McpServerManager, BrowserManager, createBrowserTools, PluginLoader } from '@fluxmaster/tools';
import type { AppContext } from './context.js';
import { UsageTracker } from './usage-tracker.js';

export interface BootstrapOptions {
  configPath: string;
}

export async function bootstrap(options: BootstrapOptions): Promise<AppContext> {
  const config = await loadConfig(options.configPath);

  const authManager = new AuthManager({
    copilot: config.auth.copilot,
    preferDirectApi: config.auth.preferDirectApi,
  });
  await authManager.initialize();

  const toolRegistry = createDefaultRegistry();
  const mcpServerManager = new McpServerManager(toolRegistry);
  const usageTracker = new UsageTracker();

  const agentManager = new AgentManager(authManager, toolRegistry, {
    mcpServerManager,
    globalMcpServers: config.mcpServers.global,
  });

  await agentManager.initializeMcp();

  // Auto-spawn agents from config
  for (const agentConfig of config.agents.list) {
    try {
      await agentManager.spawnAgent({
        id: agentConfig.id,
        model: agentConfig.model,
        systemPrompt: agentConfig.systemPrompt,
        tools: agentConfig.tools ?? [],
        maxTokens: agentConfig.maxTokens ?? config.agents.defaults.maxTokens,
        temperature: agentConfig.temperature ?? config.agents.defaults.temperature,
      });
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

  return {
    config,
    authManager,
    agentManager,
    toolRegistry,
    mcpServerManager,
    usageTracker,
  };
}

export async function shutdown(ctx: AppContext): Promise<void> {
  ctx.agentManager.killAll();
  await ctx.mcpServerManager.stopAll();
  await ctx.authManager.shutdown();
}
