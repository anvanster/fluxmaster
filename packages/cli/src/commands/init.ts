import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateDefaultConfig } from '@fluxmaster/core';

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Create a fluxmaster.config.json in the current directory')
    .option('--force', 'Overwrite existing config file', false)
    .option('--model <model>', 'Default model for the agent', 'claude-sonnet-4')
    .action(async (options: { force: boolean; model: string }) => {
      const configPath = path.resolve('fluxmaster.config.json');

      // Check if file already exists
      try {
        await fs.access(configPath);
        if (!options.force) {
          console.error('fluxmaster.config.json already exists. Use --force to overwrite.');
          process.exitCode = 1;
          return;
        }
      } catch {
        // File doesn't exist, good
      }

      const config = generateDefaultConfig();

      // Override model if specified
      if (options.model && config.agents.list[0]) {
        config.agents.list[0].model = options.model;
      }

      await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      console.log(`Created ${configPath}`);
    });

  return cmd;
}
