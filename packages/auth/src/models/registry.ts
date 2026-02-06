import type { Provider } from '@fluxmaster/core';

interface ModelInfo {
  id: string;
  provider: Provider | 'xai';
  fullId?: string; // Full model ID for direct API calls
}

const COPILOT_MODELS: Record<string, ModelInfo> = {
  // OpenAI
  'gpt-4o': { id: 'gpt-4o', provider: 'openai' },
  'gpt-4o-mini': { id: 'gpt-4o-mini', provider: 'openai' },
  'gpt-4.1': { id: 'gpt-4.1', provider: 'openai' },
  'gpt-5': { id: 'gpt-5', provider: 'openai' },
  'gpt-5-mini': { id: 'gpt-5-mini', provider: 'openai' },
  'gpt-5.1': { id: 'gpt-5.1', provider: 'openai' },
  'gpt-5.1-codex': { id: 'gpt-5.1-codex', provider: 'openai' },
  'gpt-5.1-codex-mini': { id: 'gpt-5.1-codex-mini', provider: 'openai' },
  'gpt-5.1-codex-max': { id: 'gpt-5.1-codex-max', provider: 'openai' },
  'gpt-5.2': { id: 'gpt-5.2', provider: 'openai' },
  'gpt-5.2-codex': { id: 'gpt-5.2-codex', provider: 'openai' },
  'gpt-5-codex': { id: 'gpt-5-codex', provider: 'openai' },
  // Anthropic
  'claude-sonnet-4': { id: 'claude-sonnet-4', provider: 'anthropic', fullId: 'claude-sonnet-4-20250514' },
  'claude-sonnet-4.5': { id: 'claude-sonnet-4.5', provider: 'anthropic' },
  'claude-opus-4': { id: 'claude-opus-4', provider: 'anthropic', fullId: 'claude-opus-4-20250514' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', provider: 'anthropic', fullId: 'claude-opus-4-5-20251101' },
  'claude-opus-4.6': { id: 'claude-opus-4.6', provider: 'anthropic' },
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', provider: 'anthropic', fullId: 'claude-haiku-4-5-20251001' },
  // Google
  'gemini-2.5-pro': { id: 'gemini-2.5-pro', provider: 'google' },
  'gemini-3-pro-preview': { id: 'gemini-3-pro-preview', provider: 'google' },
  'gemini-3-flash-preview': { id: 'gemini-3-flash-preview', provider: 'google' },
  // xAI
  'grok-code-fast-1': { id: 'grok-code-fast-1', provider: 'xai' },
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
