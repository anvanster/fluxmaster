import { Command } from 'commander';
import { loadConfig } from '@fluxmaster/core';
import { AuthManager } from '@fluxmaster/auth';

export function authCommand(): Command {
  const cmd = new Command('auth');
  cmd.description('Manage authentication providers');

  cmd
    .command('status')
    .description('Show authentication status')
    .option('--config <path>', 'Path to config file', 'fluxmaster.config.json')
    .action(async (options: { config: string }) => {
      let config;
      try {
        config = await loadConfig(options.config);
      } catch {
        console.error('No config found. Run `fluxmaster init` first.');
        process.exitCode = 1;
        return;
      }

      const authManager = new AuthManager({
        copilot: config.auth.copilot,
        preferDirectApi: config.auth.preferDirectApi,
      });

      try {
        await authManager.initialize();
      } catch {
        // Initialization failures are reported via status
      }

      const status = authManager.getStatus();

      console.log('Authentication Status:');
      console.log(`  Copilot proxy: ${status.copilot ? 'connected' : 'not available'}`);
      if (status.directProviders.length > 0) {
        console.log(`  Direct API keys: ${status.directProviders.join(', ')}`);
      } else {
        console.log('  Direct API keys: none configured');
      }

      await authManager.shutdown();
    });

  return cmd;
}
