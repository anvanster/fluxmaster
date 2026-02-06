import type { ModelEndpoint, AuthManagerConfig, CopilotConfig } from '@fluxmaster/core';
import { ModelNotAvailableError, createChildLogger } from '@fluxmaster/core';
import { CopilotAuthProvider } from './providers/copilot-provider.js';
import { DirectApiProvider } from './providers/direct-api-provider.js';
import { inferProvider } from './models/registry.js';

const logger = createChildLogger('auth-manager');

export class AuthManager {
  private copilot?: CopilotAuthProvider;
  private directApi: DirectApiProvider;
  private preferDirectApi: boolean;

  constructor(config: AuthManagerConfig) {
    this.preferDirectApi = config.preferDirectApi;
    if (config.copilot) {
      this.copilot = new CopilotAuthProvider(config.copilot);
    }
    this.directApi = new DirectApiProvider();
  }

  async initialize(): Promise<void> {
    if (this.copilot) {
      try {
        await this.copilot.initialize();
      } catch (err) {
        logger.warn({ error: err }, 'Copilot initialization failed, will use direct API fallback');
      }
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

    // Path 3: Fallback to direct API
    if (this.directApi.isModelAvailable(model)) {
      logger.info({ model, path: 'direct-fallback' }, 'Using direct API (fallback)');
      return this.directApi.getEndpoint(model);
    }

    // Path 4: No provider available
    throw new ModelNotAvailableError(model);
  }

  async shutdown(): Promise<void> {
    await this.copilot?.shutdown();
    await this.directApi.shutdown();
  }

  getStatus(): { copilot: boolean; directProviders: string[] } {
    const directProviders: string[] = [];
    for (const p of ['anthropic', 'openai', 'google'] as const) {
      if (this.directApi.hasProvider(p)) {
        directProviders.push(p);
      }
    }
    return {
      copilot: this.copilot?.isReady() ?? false,
      directProviders,
    };
  }
}
