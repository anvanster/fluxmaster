import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { loadConfig } from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry } from '@fluxmaster/tools';

export function runCommand(): Command {
  const cmd = new Command('run');

  cmd
    .description('Start an interactive agent session')
    .option('--config <path>', 'Path to config file', 'fluxmaster.config.json')
    .option('--agent <id>', 'Agent ID to use', 'default')
    .action(async (options: { config: string; agent: string }) => {
      // Load config
      let config;
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

      // Initialize tools and agent
      const toolRegistry = createDefaultRegistry();
      const agentManager = new AgentManager(authManager, toolRegistry);

      const mergedConfig = {
        ...agentConfig,
        maxTokens: agentConfig.maxTokens ?? config.agents.defaults.maxTokens,
        temperature: agentConfig.temperature ?? config.agents.defaults.temperature,
      };
      await agentManager.spawnAgent(mergedConfig);

      let totalUsage = { inputTokens: 0, outputTokens: 0 };

      console.log(`Agent "${agentConfig.id}" ready (model: ${agentConfig.model})`);
      console.log('Commands: /exit, /clear, /tools, /usage\n');

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
            input = await rl.question('you> ');
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
            const worker = agentManager.getAgent(options.agent);
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

          // Send message to agent
          try {
            const result = await agentManager.routeMessage(options.agent, trimmed);
            totalUsage.inputTokens += result.usage.inputTokens;
            totalUsage.outputTokens += result.usage.outputTokens;
            console.log(`\nassistant> ${result.text}\n`);
          } catch (err) {
            console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } finally {
        rl.close();
        agentManager.killAll();
        await authManager.shutdown();
      }
    });

  return cmd;
}
