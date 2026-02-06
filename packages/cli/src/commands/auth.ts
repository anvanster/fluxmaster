import { Command } from 'commander';
import { execFile } from 'node:child_process';
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
      console.log(`  Claude CLI:    ${status.claudeCli ? 'detected' : 'not available'}`);
      if (status.directProviders.length > 0) {
        console.log(`  Direct API keys: ${status.directProviders.join(', ')}`);
      } else {
        console.log('  Direct API keys: none configured');
      }

      await authManager.shutdown();
    });

  cmd
    .command('login')
    .description('Set up authentication via GitHub or Claude CLI')
    .argument('<provider>', 'Provider to authenticate: github or claude')
    .action(async (provider: string) => {
      if (provider === 'github' || provider === 'gh') {
        await handleGhLogin();
      } else if (provider === 'claude') {
        await handleClaudeLogin();
      } else {
        console.error(`Unknown provider: ${provider}. Use "github" or "claude".`);
        process.exitCode = 1;
      }
    });

  return cmd;
}

async function handleGhLogin(): Promise<void> {
  // Check if gh is installed
  const ghInstalled = await isCommandAvailable('gh');
  if (!ghInstalled) {
    console.log('GitHub CLI (gh) is not installed.');
    console.log('Install it from: https://cli.github.com/');
    process.exitCode = 1;
    return;
  }

  // Check if already logged in
  const token = await runCommand('gh', ['auth', 'token']);
  if (token) {
    console.log('GitHub CLI is already authenticated.');
    console.log('Fluxmaster will auto-detect this token for Copilot models.');
  } else {
    console.log('GitHub CLI is installed but not logged in.');
    console.log('Run: gh auth login');
    console.log('Then retry: fluxmaster auth status');
  }
}

async function handleClaudeLogin(): Promise<void> {
  const claudeInstalled = await isCommandAvailable('claude');
  if (!claudeInstalled) {
    console.log('Claude CLI is not installed.');
    console.log('Install it from: https://docs.anthropic.com/en/docs/claude-code');
    process.exitCode = 1;
    return;
  }

  console.log('Claude CLI is installed.');
  console.log('If not logged in, run: claude login');
  console.log('Fluxmaster will auto-detect your Claude token for Anthropic models.');
}

function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, ['--version'], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

function runCommand(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      resolve(stdout.trim() || null);
    });
  });
}
