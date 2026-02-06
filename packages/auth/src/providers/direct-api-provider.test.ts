import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectApiProvider } from './direct-api-provider.js';
import { ProviderNotAvailableError } from '@fluxmaster/core';

describe('DirectApiProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('hasProvider', () => {
    it('detects ANTHROPIC_API_KEY from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const provider = new DirectApiProvider();
      expect(provider.hasProvider('anthropic')).toBe(true);
    });

    it('returns false when key not set', () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new DirectApiProvider();
      expect(provider.hasProvider('openai')).toBe(false);
    });
  });

  describe('getEndpoint', () => {
    it('returns endpoint with correct base URL for Anthropic', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const provider = new DirectApiProvider();

      const endpoint = await provider.getEndpoint('claude-sonnet-4');
      expect(endpoint.apiKey).toBe('sk-ant-test');
      expect(endpoint.baseUrl).toBe('https://api.anthropic.com');
      expect(endpoint.provider).toBe('anthropic');
      expect(endpoint.model).toBe('claude-sonnet-4-20250514');
    });

    it('returns endpoint with custom ANTHROPIC_BASE_URL', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.ANTHROPIC_BASE_URL = 'https://custom-proxy.example.com';
      const provider = new DirectApiProvider();

      const endpoint = await provider.getEndpoint('claude-sonnet-4');
      expect(endpoint.baseUrl).toBe('https://custom-proxy.example.com');
    });

    it('returns OpenAI endpoint correctly', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = new DirectApiProvider();

      const endpoint = await provider.getEndpoint('gpt-5');
      expect(endpoint.apiKey).toBe('sk-test');
      expect(endpoint.baseUrl).toBe('https://api.openai.com/v1');
      expect(endpoint.provider).toBe('openai');
    });

    it('throws ProviderNotAvailableError for unconfigured provider', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const provider = new DirectApiProvider();

      await expect(provider.getEndpoint('claude-sonnet-4'))
        .rejects.toBeInstanceOf(ProviderNotAvailableError);
    });

    it('throws for unknown model prefix', async () => {
      const provider = new DirectApiProvider();

      await expect(provider.getEndpoint('llama-3'))
        .rejects.toBeInstanceOf(ProviderNotAvailableError);
    });
  });

  describe('isModelAvailable', () => {
    it('returns true when provider key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const provider = new DirectApiProvider();
      expect(provider.isModelAvailable('claude-sonnet-4')).toBe(true);
    });

    it('returns false when provider key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const provider = new DirectApiProvider();
      expect(provider.isModelAvailable('claude-sonnet-4')).toBe(false);
    });
  });

  describe('name', () => {
    it('returns direct-api', () => {
      const provider = new DirectApiProvider();
      expect(provider.name).toBe('direct-api');
    });
  });
});
