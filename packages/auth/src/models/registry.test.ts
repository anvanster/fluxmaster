import { describe, it, expect } from 'vitest';
import { isCopilotModel, inferProvider, getFullModelId, listCopilotModels } from './registry.js';

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
});
