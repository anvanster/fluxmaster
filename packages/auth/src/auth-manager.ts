import type { ModelEndpoint, AuthManagerConfig } from '@fluxmaster/core';
import { ModelNotAvailableError, createChildLogger } from '@fluxmaster/core';
import { CopilotAuthProvider } from './providers/copilot-provider.js';
import { DirectApiProvider } from './providers/direct-api-provider.js';
import { ClaudeCliProvider } from './providers/claude-cli-provider.js';
import { inferProvider } from './models/registry.js';

const logger = createChildLogger('auth-manager');

export class AuthManager {
  private copilot?: CopilotAuthProvider;
  private claudeCli: ClaudeCliProvider;
  private directApi: DirectApiProvider;
  private preferDirectApi: boolean;

  constructor(config: AuthManagerConfig) {
    this.preferDirectApi = config.preferDirectApi;
    if (config.copilot) {
      this.copilot = new CopilotAuthProvider(config.copilot);
    }
    this.claudeCli = new ClaudeCliProvider();
    this.directApi = new DirectApiProvider();
  }

  async initialize(): Promise<void> {
    if (this.copilot) {
      try {
        await this.copilot.initialize();
      } catch (err) {
        logger.warn({ error: err }, 'Copilot initialization failed');
      }
    }
    try {
      await this.claudeCli.initialize();
    } catch (err) {
      logger.warn({ error: err }, 'Claude CLI token detection failed');
    }
    await this.directApi.initialize();
  }

  async getEndpoint(model: string): Promise<ModelEndpoint> {
    const provider = inferProvider(model);
    logger.debug({ model, provider, preferDirect: this.preferDirectApi }, 'Resolving endpoint');

    // Path 1: Prefer direct API when configured
    if (this.preferDirectApi && this.directApi.isModelAvailable(model)) {
      logger.info({ model, path: 'direct-preferred' }, 'Using direct API (preferred)');
      return this.directApi.getEndpoint(model);
    }

    // Path 2: Use Copilot proxy if available
    if (this.copilot?.isReady() && this.copilot.isModelAvailable(model)) {
      logger.info({ model, path: 'copilot' }, 'Using Copilot proxy');
      const endpoint = await this.copilot.getEndpoint();
      return { ...endpoint, model };
    }

    // Path 3: Claude CLI token for anthropic models
    if (this.claudeCli.isModelAvailable(model)) {
      logger.info({ model, path: 'claude-cli' }, 'Using Claude CLI token');
      return this.claudeCli.getEndpoint(model);
    }

    // Path 4: Fallback to direct API
    if (this.directApi.isModelAvailable(model)) {
      logger.info({ model, path: 'direct-fallback' }, 'Using direct API (fallback)');
      return this.directApi.getEndpoint(model);
    }

    // Path 5: No provider available
    throw new ModelNotAvailableError(model);
  }

  async shutdown(): Promise<void> {
    await this.copilot?.shutdown();
    await this.claudeCli.shutdown();
    await this.directApi.shutdown();
  }

  getStatus(): { copilot: boolean; claudeCli: boolean; directProviders: string[] } {
    const directProviders: string[] = [];
    for (const p of ['anthropic', 'openai', 'google'] as const) {
      if (this.directApi.hasProvider(p)) {
        directProviders.push(p);
      }
    }
    return {
      copilot: this.copilot?.isReady() ?? false,
      claudeCli: this.claudeCli.isModelAvailable('claude-sonnet-4'),
      directProviders,
    };
  }
}
