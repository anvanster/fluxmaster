import type { IAuthProvider, ModelEndpoint, DirectApiConfig, Provider } from '@fluxmaster/core';
import { ProviderNotAvailableError, createChildLogger } from '@fluxmaster/core';
import { inferProvider, getFullModelId } from '../models/registry.js';

const logger = createChildLogger('direct-api-provider');

const DEFAULT_BASE_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com',
};

export class DirectApiProvider implements IAuthProvider {
  readonly name = 'direct-api';
  private config: DirectApiConfig;

  constructor() {
    this.config = {
      anthropic: process.env.ANTHROPIC_API_KEY ? {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
      } : undefined,
      openai: process.env.OPENAI_API_KEY ? {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
      } : undefined,
      google: process.env.GOOGLE_API_KEY ? {
        apiKey: process.env.GOOGLE_API_KEY,
      } : undefined,
    };

    const configured = Object.entries(this.config)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    logger.info({ providers: configured }, 'Direct API providers configured');
  }

  async initialize(): Promise<void> {
    // No async initialization needed for direct API keys
  }

  hasProvider(provider: string): boolean {
    return this.config[provider as keyof DirectApiConfig] !== undefined;
  }

  async getEndpoint(model: string): Promise<ModelEndpoint> {
    const provider = inferProvider(model);
    if (provider === 'unknown' || provider === 'xai') {
      throw new ProviderNotAvailableError(provider);
    }

    const providerConfig = this.config[provider as keyof DirectApiConfig];
    if (!providerConfig) {
      throw new ProviderNotAvailableError(provider);
    }

    const baseUrl = ('baseUrl' in providerConfig ? providerConfig.baseUrl : undefined)
      ?? DEFAULT_BASE_URLS[provider]
      ?? '';

    return {
      model: getFullModelId(model),
      baseUrl,
      apiKey: providerConfig.apiKey,
      provider: provider as Provider,
    };
  }

  isModelAvailable(model: string): boolean {
    const provider = inferProvider(model);
    if (provider === 'unknown' || provider === 'xai') return false;
    return this.hasProvider(provider);
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }
}
