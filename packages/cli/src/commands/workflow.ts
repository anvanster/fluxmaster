import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import {
  WorkflowDefinitionSchema,
  loadConfig,
  type WorkflowDefinition,
  type WorkflowStep,
} from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry, McpServerManager } from '@fluxmaster/tools';

/**
 * Check for duplicate step IDs in a workflow definition.
 */
function findDuplicateStepIds(steps: WorkflowStep[], seen = new Set<string>()): string[] {
  const duplicates: string[] = [];
  for (const step of steps) {
    if (seen.has(step.id)) {
      duplicates.push(step.id);
    }
    seen.add(step.id);
    if (step.type === 'parallel') findDuplicateStepIds(step.steps, seen);
    if (step.type === 'conditional') {
      findDuplicateStepIds(step.then, seen);
      if (step.else) findDuplicateStepIds(step.else, seen);
    }
    if (step.type === 'loop') findDuplicateStepIds(step.steps, seen);
  }
  return duplicates;
}

/**
 * Parse and validate a YAML workflow file.
 */
function parseWorkflowFile(content: string): WorkflowDefinition {
  const raw = parseYaml(content);
  const result = WorkflowDefinitionSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid workflow definition: ${issues}`);
  }
  return result.data;
}

/**
 * Resolve ${var} references in a message template.
 */
function resolveVars(
  template: string,
  inputs: Record<string, unknown>,
  stepResults: Record<string, { output?: string }>,
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
    const trimmed = expr.trim();
    // Check inputs first
    if (trimmed in inputs) return String(inputs[trimmed]);
    // Check step results (e.g., ${step.output})
    const dotIdx = trimmed.indexOf('.');
    if (dotIdx > 0) {
      const stepId = trimmed.slice(0, dotIdx);
      const field = trimmed.slice(dotIdx + 1);
      const result = stepResults[stepId];
      if (result && field === 'output') return result.output ?? '';
    }
    return `\${${trimmed}}`;
  });
}

/**
 * Execute workflow steps sequentially using an AgentManager.
 */
async function executeSteps(
  steps: WorkflowStep[],
  agentManager: AgentManager,
  inputs: Record<string, unknown>,
  stepResults: Record<string, { output?: string }>,
): Promise<void> {
  for (const step of steps) {
    if (step.type === 'agent') {
      const message = resolveVars(step.message, inputs, stepResults);
      console.log(`  Step "${step.id}": sending to agent "${step.agentId}"...`);
      const response = await agentManager.routeMessage(step.agentId, message);
      stepResults[step.id] = { output: response.text };
      console.log(`  Step "${step.id}": completed`);
    } else if (step.type === 'parallel') {
      console.log(`  Step "${step.id}": running ${step.steps.length} steps in parallel...`);
      await Promise.all(
        step.steps.map((s) => executeSteps([s], agentManager, inputs, stepResults)),
      );
      console.log(`  Step "${step.id}": completed`);
    } else if (step.type === 'conditional') {
      const condStr = resolveVars(step.condition, inputs, stepResults).toLowerCase().trim();
      const condResult = condStr !== 'false' && condStr !== '0' && condStr !== '' && condStr !== 'null';
      if (condResult) {
        await executeSteps(step.then, agentManager, inputs, stepResults);
      } else if (step.else) {
        await executeSteps(step.else, agentManager, inputs, stepResults);
      }
    } else if (step.type === 'loop') {
      const overStr = resolveVars(step.over, inputs, stepResults);
      let items: unknown[];
      try {
        items = JSON.parse(overStr);
        if (!Array.isArray(items)) items = [items];
      } catch {
        items = overStr.split(',').map((s) => s.trim());
      }
      const maxIter = Math.min(items.length, step.maxIterations);
      for (let i = 0; i < maxIter; i++) {
        const loopInputs = { ...inputs, [step.as]: items[i] };
        await executeSteps(step.steps, agentManager, loopInputs, stepResults);
      }
    }
  }
}

export function workflowCommand(): Command {
  const cmd = new Command('workflow');
  cmd.description('Manage and run YAML workflows');

  // --- validate subcommand ---
  cmd
    .command('validate <file>')
    .description('Validate a YAML workflow file')
    .action(async (file: string) => {
      let content: string;
      try {
        content = await fs.readFile(file, 'utf-8');
      } catch {
        console.error(`File not found: ${file}`);
        process.exitCode = 1;
        return;
      }

      let definition: WorkflowDefinition;
      try {
        definition = parseWorkflowFile(content);
      } catch (err) {
        console.error(err instanceof Error ? err.message : `Invalid workflow: ${String(err)}`);
        process.exitCode = 1;
        return;
      }

      // Semantic validation
      const duplicates = findDuplicateStepIds(definition.steps);
      if (duplicates.length > 0) {
        console.error(`Duplicate step ID: '${duplicates[0]}'`);
        process.exitCode = 1;
        return;
      }

      console.log(`Workflow "${definition.name}" (${definition.id}) is valid.`);
      console.log(`  Steps: ${definition.steps.length}`);
    });

  // --- run subcommand ---
  cmd
    .command('run <file>')
    .description('Run a YAML workflow')
    .option('--config <path>', 'Path to config file', 'fluxmaster.config.json')
    .option('--input <pairs...>', 'Input key=value pairs')
    .action(async (file: string, options: { config: string; input?: string[] }) => {
      // Parse workflow file
      let content: string;
      try {
        content = await fs.readFile(file, 'utf-8');
      } catch {
        console.error(`File not found: ${file}`);
        process.exitCode = 1;
        return;
      }

      let definition: WorkflowDefinition;
      try {
        definition = parseWorkflowFile(content);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }

      // Parse input key=value pairs
      const inputs: Record<string, string> = {};
      if (options.input) {
        for (const pair of options.input) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            inputs[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
          }
        }
      }

      // Load config
      let config;
      try {
        config = await loadConfig(options.config);
      } catch {
        console.error('No config found. Run `fluxmaster init` first.');
        process.exitCode = 1;
        return;
      }

      // Bootstrap auth & agents
      const authManager = new AuthManager({
        copilot: config.auth.copilot,
        preferDirectApi: config.auth.preferDirectApi,
      });
      await authManager.initialize();

      const toolRegistry = createDefaultRegistry();
      const mcpServerManager = new McpServerManager(toolRegistry);
      const agentManager = new AgentManager(authManager, toolRegistry, {
        mcpServerManager,
        globalMcpServers: config.mcpServers.global,
      });

      await agentManager.initializeMcp();

      // Spawn agents referenced in the workflow
      const agentIds = collectAgentIds(definition.steps);
      for (const agentId of agentIds) {
        const agentConfig = config.agents.list.find((a) => a.id === agentId);
        const spawnConfig = agentConfig
          ? {
              ...agentConfig,
              maxTokens: agentConfig.maxTokens ?? config.agents.defaults.maxTokens,
              temperature: agentConfig.temperature ?? config.agents.defaults.temperature,
            }
          : {
              id: agentId,
              model: config.agents.list[0]?.model ?? 'gpt-4o',
              tools: [],
              maxTokens: config.agents.defaults.maxTokens,
              temperature: config.agents.defaults.temperature,
            };
        await agentManager.spawnAgent(spawnConfig);
      }

      console.log(`Running workflow "${definition.name}" (${definition.id})...`);

      try {
        const stepResults: Record<string, { output?: string }> = {};
        await executeSteps(definition.steps, agentManager, inputs, stepResults);
        console.log(`Workflow "${definition.name}" completed successfully.`);
      } catch (err) {
        console.error(`Workflow failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
      } finally {
        agentManager.killAll();
        await mcpServerManager.stopAll();
        await authManager.shutdown();
      }
    });

  return cmd;
}

/**
 * Collect all unique agent IDs referenced in workflow steps.
 */
function collectAgentIds(steps: WorkflowStep[], ids = new Set<string>()): Set<string> {
  for (const step of steps) {
    if (step.type === 'agent') {
      ids.add(step.agentId);
    } else if (step.type === 'parallel') {
      collectAgentIds(step.steps, ids);
    } else if (step.type === 'conditional') {
      collectAgentIds(step.then, ids);
      if (step.else) collectAgentIds(step.else, ids);
    } else if (step.type === 'loop') {
      collectAgentIds(step.steps, ids);
    }
  }
  return ids;
}
