import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { authCommand } from './commands/auth.js';
import { runCommand } from './commands/run.js';
import { workflowCommand } from './commands/workflow.js';

export function createApp(): Command {
  const program = new Command();

  program
    .name('fluxmaster')
    .description('Multi-agent orchestrator with GitHub Copilot authentication')
    .version('0.1.0');

  program.addCommand(initCommand());
  program.addCommand(authCommand());
  program.addCommand(runCommand());
  program.addCommand(workflowCommand());

  return program;
}
