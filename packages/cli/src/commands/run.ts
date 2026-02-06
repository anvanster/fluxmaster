import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { loadConfig, type FluxmasterConfig } from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry, McpServerManager, BrowserManager, createBrowserTools, PluginLoader } from '@fluxmaster/tools';

export function runCommand(): Command {
  const cmd = new Command('run');

  cmd
    .description('Start an interactive agent session')
    .option('--config <path>', 'Path to config file', 'fluxmaster.config.json')
    .option('--agent <id>', 'Agent ID to use', 'default')
    .option('--stream', 'Enable streaming output', true)
    .option('--no-stream', 'Disable streaming output')
    .action(async (options: { config: string; agent: string; stream: boolean }) => {
      // Load config
      let config: FluxmasterConfig;
      try {
        config = await loadConfig(options.config);
      } catch {
        console.error('No config found. Run `fluxmaster init` first.');
        process.exitCode = 1;
        return;
      }

      // Find agent config
      const agentConfig = config.agents.list.find(a => a.id === options.agent);
      if (!agentConfig) {
        console.error(`Agent "${options.agent}" not found in config.`);
        process.exitCode = 1;
        return;
      }

      // Initialize auth
      const authManager = new AuthManager({
        copilot: config.auth.copilot,
        preferDirectApi: config.auth.preferDirectApi,
      });
      await authManager.initialize();

      // Initialize tools, MCP, and agent
      const toolRegistry = createDefaultRegistry();
      const mcpServerManager = new McpServerManager(toolRegistry);
      const agentManager = new AgentManager(authManager, toolRegistry, {
        mcpServerManager,
        globalMcpServers: config.mcpServers.global,
      });

      // Start global MCP servers
      await agentManager.initializeMcp();

      // Load plugins
      const pluginLoader = new PluginLoader();
      for (const pluginConfig of config.plugins ?? []) {
        try {
          const plugin = await pluginLoader.load(pluginConfig.package, pluginConfig.config);
          await pluginLoader.register(plugin, toolRegistry);
          console.log(`Plugin "${plugin.name}" loaded.`);
        } catch (err) {
          console.error(`Failed to load plugin "${pluginConfig.package}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Initialize browser if configured
      let browserManager: BrowserManager | null = null;
      if (config.browser) {
        browserManager = new BrowserManager();
        await browserManager.launch(config.browser);
        const browserTools = createBrowserTools(browserManager);
        for (const tool of browserTools) {
          toolRegistry.register(tool);
        }
      }

      const mergedConfig = {
        ...agentConfig,
        maxTokens: agentConfig.maxTokens ?? config.agents.defaults.maxTokens,
        temperature: agentConfig.temperature ?? config.agents.defaults.temperature,
      };
      await agentManager.spawnAgent(mergedConfig);

      let activeAgentId = agentConfig.id;
      let totalUsage = { inputTokens: 0, outputTokens: 0 };

      console.log(`Agent "${agentConfig.id}" ready (model: ${agentConfig.model})`);
      console.log('Commands: /exit, /clear, /tools, /usage, /agents, /agent <cmd>, /broadcast, /plugins\n');

      // REPL loop
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        let running = true;
        while (running) {
          let input: string;
          try {
            input = await rl.question(`[${activeAgentId}] you> `);
          } catch {
            // EOF or error
            break;
          }

          const trimmed = input.trim();
          if (!trimmed) continue;

          // Handle special commands
          if (trimmed === '/exit' || trimmed === '/quit') {
            console.log('Goodbye.');
            break;
          }

          if (trimmed === '/clear') {
            const worker = agentManager.getAgent(activeAgentId);
            worker?.clearHistory();
            console.log('History cleared.');
            continue;
          }

          if (trimmed === '/tools') {
            const tools = toolRegistry.list();
            if (tools.length === 0) {
              console.log('No tools registered.');
            } else {
              console.log('Available tools:');
              for (const tool of tools) {
                console.log(`  - ${tool.name}: ${tool.description}`);
              }
            }
            continue;
          }

          if (trimmed === '/usage') {
            console.log('Token usage:');
            console.log(`  Input:  ${totalUsage.inputTokens}`);
            console.log(`  Output: ${totalUsage.outputTokens}`);
            console.log(`  Total:  ${totalUsage.inputTokens + totalUsage.outputTokens}`);
            continue;
          }

          if (trimmed === '/agents' || trimmed === '/agent list') {
            const agents = agentManager.listAgents();
            if (agents.length === 0) {
              console.log('No agents running.');
            } else {
              console.log('Active agents:');
              for (const agent of agents) {
                const marker = agent.id === activeAgentId ? ' (active)' : '';
                console.log(`  - ${agent.id}: model=${agent.model} status=${agent.status}${marker}`);
              }
            }
            continue;
          }

          if (trimmed.startsWith('/agent spawn ')) {
            const args = trimmed.slice('/agent spawn '.length).trim().split(/\s+/);
            const newId = args[0];
            const model = args[1];

            if (!newId) {
              console.log('Usage: /agent spawn <id> [model]');
              continue;
            }

            // Check if agent ID exists in config
            const configEntry = config.agents.list.find(a => a.id === newId);
            const spawnConfig = configEntry
              ? {
                  ...configEntry,
                  maxTokens: configEntry.maxTokens ?? config.agents.defaults.maxTokens,
                  temperature: configEntry.temperature ?? config.agents.defaults.temperature,
                }
              : {
                  id: newId,
                  model: model || agentConfig.model,
                  tools: agentConfig.tools,
                  maxTokens: config.agents.defaults.maxTokens,
                  temperature: config.agents.defaults.temperature,
                };

            try {
              await agentManager.spawnAgent(spawnConfig);
              console.log(`Agent "${newId}" spawned (model: ${spawnConfig.model}).`);
            } catch (err) {
              console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            continue;
          }

          if (trimmed.startsWith('/agent kill ')) {
            const targetId = trimmed.slice('/agent kill '.length).trim();
            if (!targetId) {
              console.log('Usage: /agent kill <id>');
              continue;
            }
            try {
              agentManager.killAgent(targetId);
              console.log(`Agent "${targetId}" killed.`);
              if (activeAgentId === targetId) {
                const remaining = agentManager.listAgents();
                activeAgentId = remaining.length > 0 ? remaining[0].id : activeAgentId;
                if (remaining.length > 0) {
                  console.log(`Switched to agent "${activeAgentId}".`);
                }
              }
            } catch (err) {
              console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            continue;
          }

          if (trimmed.startsWith('/agent switch ')) {
            const targetId = trimmed.slice('/agent switch '.length).trim();
            if (!targetId) {
              console.log('Usage: /agent switch <id>');
              continue;
            }
            const worker = agentManager.getAgent(targetId);
            if (worker) {
              activeAgentId = targetId;
              console.log(`Switched to agent "${targetId}".`);
            } else {
              console.error(`Agent "${targetId}" not found.`);
            }
            continue;
          }

          if (trimmed === '/mcp list' || trimmed === '/mcp status') {
            const globalServers = config.mcpServers.global;
            if (globalServers.length === 0) {
              console.log('No MCP servers configured.');
            } else {
              console.log('MCP servers:');
              for (const server of globalServers) {
                console.log(`  - ${server.name}: ${server.transport} (${server.command || server.url})`);
              }
            }
            continue;
          }

          if (trimmed === '/plugins') {
            const plugins = pluginLoader.list();
            if (plugins.length === 0) {
              console.log('No plugins loaded.');
            } else {
              console.log('Loaded plugins:');
              for (const p of plugins) {
                const toolCount = p.tools?.length ?? 0;
                console.log(`  - ${p.name}@${p.version} (${toolCount} tools)`);
              }
            }
            continue;
          }

          if (trimmed.startsWith('/broadcast ')) {
            const broadcastMsg = trimmed.slice('/broadcast '.length).trim();
            if (!broadcastMsg) {
              console.log('Usage: /broadcast <message>');
              continue;
            }
            const agents = agentManager.listAgents();
            for (const agent of agents) {
              try {
                const result = await agentManager.routeMessage(agent.id, broadcastMsg);
                totalUsage.inputTokens += result.usage.inputTokens;
                totalUsage.outputTokens += result.usage.outputTokens;
                console.log(`\n[${agent.id}]> ${result.text}`);
              } catch (err) {
                console.error(`[${agent.id}] Error: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
            console.log('');
            continue;
          }

          // Send message to active agent
          try {
            let result;
            if (options.stream) {
              process.stdout.write('\nassistant> ');
              result = await agentManager.routeMessageStream(activeAgentId, trimmed, (event) => {
                if (event.type === 'text_delta' && event.text) {
                  process.stdout.write(event.text);
                } else if (event.type === 'tool_use_start' && event.toolUse) {
                  process.stdout.write(`\n[calling ${event.toolUse.name}...]\n`);
                }
              });
              process.stdout.write('\n\n');
            } else {
              result = await agentManager.routeMessage(activeAgentId, trimmed);
              console.log(`\nassistant> ${result.text}\n`);
            }
            totalUsage.inputTokens += result.usage.inputTokens;
            totalUsage.outputTokens += result.usage.outputTokens;
          } catch (err) {
            console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } finally {
        rl.close();
        agentManager.killAll();
        await pluginLoader.unloadAll(toolRegistry);
        await mcpServerManager.stopAll();
        if (browserManager) {
          await browserManager.close();
        }
        await authManager.shutdown();
      }
    });

  return cmd;
}
