import type { IAuthProvider, ModelEndpoint } from '@fluxmaster/core';
import { AuthError, createChildLogger } from '@fluxmaster/core';
import { inferProvider } from '../models/registry.js';
import { detectClaudeToken } from '../token-detectors/claude-token-detector.js';

const logger = createChildLogger('claude-cli-provider');

export class ClaudeCliProvider implements IAuthProvider {
  readonly name = 'claude-cli';
  private token: string | null = null;

  async initialize(): Promise<void> {
    const result = await detectClaudeToken();
    if (result) {
      this.token = result.token;
      logger.info({ source: result.source }, 'Claude CLI token detected');
    } else {
      logger.debug('No Claude CLI token found');
    }
  }

  async getEndpoint(model: string): Promise<ModelEndpoint> {
    if (!this.token) {
      throw new AuthError('No Claude CLI token available', 'claude-cli');
    }
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

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }
}
