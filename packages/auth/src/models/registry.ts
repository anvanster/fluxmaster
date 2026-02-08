import type { Provider } from '@fluxmaster/core';

interface ModelInfo {
  id: string;
  provider: Provider | 'xai';
  fullId?: string; // Full model ID for direct API calls
  premiumMultiplier: number; // Copilot billing: 0 = free, 0.25-10 = premium request cost
}

const COPILOT_MODELS: Record<string, ModelInfo> = {
  // OpenAI — free (0x multiplier)
  'gpt-4o': { id: 'gpt-4o', provider: 'openai', premiumMultiplier: 0 },
  'gpt-4o-mini': { id: 'gpt-4o-mini', provider: 'openai', premiumMultiplier: 0 },
  'gpt-4.1': { id: 'gpt-4.1', provider: 'openai', premiumMultiplier: 0 },
  'gpt-5-mini': { id: 'gpt-5-mini', provider: 'openai', premiumMultiplier: 0 },
  // OpenAI — standard premium (1x)
  'gpt-5': { id: 'gpt-5', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.1': { id: 'gpt-5.1', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.1-codex': { id: 'gpt-5.1-codex', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.1-codex-mini': { id: 'gpt-5.1-codex-mini', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.1-codex-max': { id: 'gpt-5.1-codex-max', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.2': { id: 'gpt-5.2', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5.2-codex': { id: 'gpt-5.2-codex', provider: 'openai', premiumMultiplier: 1 },
  'gpt-5-codex': { id: 'gpt-5-codex', provider: 'openai', premiumMultiplier: 1 },
  // Anthropic — budget premium (0.33x)
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', provider: 'anthropic', fullId: 'claude-haiku-4-5-20251001', premiumMultiplier: 0.33 },
  // Anthropic — standard premium (1x)
  'claude-sonnet-4': { id: 'claude-sonnet-4', provider: 'anthropic', fullId: 'claude-sonnet-4-20250514', premiumMultiplier: 1 },
  'claude-sonnet-4.5': { id: 'claude-sonnet-4.5', provider: 'anthropic', premiumMultiplier: 1 },
  'claude-opus-4': { id: 'claude-opus-4', provider: 'anthropic', fullId: 'claude-opus-4-20250514', premiumMultiplier: 1 },
  // Anthropic — expensive premium (3x)
  'claude-opus-4.5': { id: 'claude-opus-4.5', provider: 'anthropic', fullId: 'claude-opus-4-5-20251101', premiumMultiplier: 3 },
  'claude-opus-4.6': { id: 'claude-opus-4.6', provider: 'anthropic', premiumMultiplier: 3 },
  // Google — standard premium (1x)
  'gemini-2.5-pro': { id: 'gemini-2.5-pro', provider: 'google', premiumMultiplier: 1 },
  'gemini-3-pro-preview': { id: 'gemini-3-pro-preview', provider: 'google', premiumMultiplier: 1 },
  // Google — budget premium (0.33x)
  'gemini-3-flash-preview': { id: 'gemini-3-flash-preview', provider: 'google', premiumMultiplier: 0.33 },
  // xAI — budget premium (0.25x)
  'grok-code-fast-1': { id: 'grok-code-fast-1', provider: 'xai', premiumMultiplier: 0.25 },
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

export function getCopilotMultiplier(model: string): number {
  return COPILOT_MODELS[model]?.premiumMultiplier ?? 1;
}

export function listCopilotModels(): string[] {
  return Object.keys(COPILOT_MODELS);
}
