import { describe, it, expect } from 'vitest';
import { isCopilotModel, inferProvider, getFullModelId, listCopilotModels, getCopilotMultiplier } from './registry.js';

describe('Model Registry', () => {
  describe('isCopilotModel', () => {
    it('returns true for known Copilot models', () => {
      expect(isCopilotModel('claude-sonnet-4')).toBe(true);
      expect(isCopilotModel('gpt-5')).toBe(true);
      expect(isCopilotModel('gemini-3-pro-preview')).toBe(true);
    });

    it('returns false for unknown models', () => {
      expect(isCopilotModel('gpt-99')).toBe(false);
      expect(isCopilotModel('llama-3')).toBe(false);
    });
  });

  describe('inferProvider', () => {
    it('maps claude-* to anthropic', () => {
      expect(inferProvider('claude-sonnet-4')).toBe('anthropic');
      expect(inferProvider('claude-opus-4')).toBe('anthropic');
      expect(inferProvider('claude-unknown-model')).toBe('anthropic');
    });

    it('maps gpt-* to openai', () => {
      expect(inferProvider('gpt-5')).toBe('openai');
      expect(inferProvider('gpt-4.1')).toBe('openai');
    });

    it('maps gemini-* to google', () => {
      expect(inferProvider('gemini-3-pro-preview')).toBe('google');
    });

    it('maps grok-* to xai', () => {
      expect(inferProvider('grok-4.1-fast')).toBe('xai');
    });

    it('returns unknown for unrecognized model', () => {
      expect(inferProvider('llama-3')).toBe('unknown');
    });
  });

  describe('getFullModelId', () => {
    it('returns full ID for Copilot models with mapping', () => {
      expect(getFullModelId('claude-sonnet-4')).toBe('claude-sonnet-4-20250514');
      expect(getFullModelId('claude-opus-4')).toBe('claude-opus-4-20250514');
    });

    it('returns same ID for models without mapping', () => {
      expect(getFullModelId('gpt-5')).toBe('gpt-5');
      expect(getFullModelId('unknown-model')).toBe('unknown-model');
    });
  });

  describe('listCopilotModels', () => {
    it('returns all known Copilot model names', () => {
      const models = listCopilotModels();
      expect(models).toContain('claude-sonnet-4');
      expect(models).toContain('gpt-5');
      expect(models).toContain('gemini-3-pro-preview');
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('getCopilotMultiplier', () => {
    it('returns 0 for free models', () => {
      expect(getCopilotMultiplier('gpt-4.1')).toBe(0);
      expect(getCopilotMultiplier('gpt-5-mini')).toBe(0);
    });

    it('returns fractional multiplier for budget premium models', () => {
      expect(getCopilotMultiplier('claude-haiku-4.5')).toBe(0.33);
      expect(getCopilotMultiplier('grok-code-fast-1')).toBe(0.25);
      expect(getCopilotMultiplier('gemini-3-flash-preview')).toBe(0.33);
    });

    it('returns 1 for standard premium models', () => {
      expect(getCopilotMultiplier('claude-sonnet-4')).toBe(1);
      expect(getCopilotMultiplier('claude-sonnet-4.5')).toBe(1);
      expect(getCopilotMultiplier('gpt-5')).toBe(1);
      expect(getCopilotMultiplier('gemini-2.5-pro')).toBe(1);
    });

    it('returns high multiplier for expensive premium models', () => {
      expect(getCopilotMultiplier('claude-opus-4.5')).toBe(3);
      expect(getCopilotMultiplier('claude-opus-4.6')).toBe(3);
    });

    it('defaults to 1 for unknown models', () => {
      expect(getCopilotMultiplier('some-unknown-model')).toBe(1);
    });
  });
});
