import type { IAuthProvider, ModelEndpoint } from '@fluxmaster/core';
import { AuthError, createChildLogger } from '@fluxmaster/core';
import { inferProvider } from '../models/registry.js';
import { detectClaudeToken } from '../token-detectors/claude-token-detector.js';

const logger = createChildLogger('claude-cli-provider');

const CLAUDE_CLI_SENTINEL = '__claude_cli__';

export class ClaudeCliProvider implements IAuthProvider {
  readonly name = 'claude-cli';
  private token: string | null = null;
  private source: string | null = null;

  async initialize(): Promise<void> {
    const result = await detectClaudeToken();
    if (result) {
      this.token = result.token;
      this.source = result.source;
      logger.info({ source: result.source }, 'Claude CLI token detected');
    } else {
      logger.debug('No Claude CLI token found');
    }
  }

  async getEndpoint(model: string): Promise<ModelEndpoint> {
    if (!this.token) {
      throw new AuthError('No Claude CLI token available', 'claude-cli');
    }

    if (this.token === CLAUDE_CLI_SENTINEL) {
      // CLI-based auth: calls go through `claude -p` subprocess, not direct API
      return {
        model,
        baseUrl: '__claude_cli__',
        apiKey: CLAUDE_CLI_SENTINEL,
        provider: 'claude-cli',
      };
    }

    // Credentials-file based auth: direct API call with extracted token
    return {
      model,
      baseUrl: 'https://api.anthropic.com',
      apiKey: this.token,
      provider: 'anthropic',
    };
  }

  isModelAvailable(model: string): boolean {
    if (!this.token) return false;
    return inferProvider(model) === 'anthropic';
  }

  isCliMode(): boolean {
    return this.token === CLAUDE_CLI_SENTINEL;
  }

  isDetected(): boolean {
    return this.token !== null;
  }

  getSource(): string | null {
    return this.source;
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }
}
