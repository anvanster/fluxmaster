import type { Provider } from '@fluxmaster/core';

interface ModelInfo {
  id: string;
  provider: Provider | 'xai';
  fullId?: string; // Full model ID for direct API calls
}

const COPILOT_MODELS: Record<string, ModelInfo> = {
  'gpt-4.1': { id: 'gpt-4.1', provider: 'openai' },
  'gpt-5': { id: 'gpt-5', provider: 'openai' },
  'gpt-5-mini': { id: 'gpt-5-mini', provider: 'openai' },
  'gpt-5.1-codex': { id: 'gpt-5.1-codex', provider: 'openai' },
  'gpt-5.2-codex': { id: 'gpt-5.2-codex', provider: 'openai' },
  'claude-sonnet-4': { id: 'claude-sonnet-4', provider: 'anthropic', fullId: 'claude-sonnet-4-20250514' },
  'claude-opus-4': { id: 'claude-opus-4', provider: 'anthropic', fullId: 'claude-opus-4-20250514' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', provider: 'anthropic', fullId: 'claude-opus-4-5-20251101' },
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', provider: 'anthropic', fullId: 'claude-haiku-4-5-20251001' },
  'gemini-3-pro': { id: 'gemini-3-pro', provider: 'google' },
  'gemini-3-flash': { id: 'gemini-3-flash', provider: 'google' },
  'grok-4.1-fast': { id: 'grok-4.1-fast', provider: 'xai' },
};

export function isCopilotModel(model: string): boolean {
  return model in COPILOT_MODELS;
}

export function inferProvider(model: string): Provider | 'xai' | 'unknown' {
  const info = COPILOT_MODELS[model];
  if (info) return info.provider;

  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('grok')) return 'xai';
  return 'unknown';
}

export function getFullModelId(model: string): string {
  return COPILOT_MODELS[model]?.fullId ?? model;
}

export function listCopilotModels(): string[] {
  return Object.keys(COPILOT_MODELS);
}
