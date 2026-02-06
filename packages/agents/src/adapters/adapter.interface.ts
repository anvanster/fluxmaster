import type { ContentBlock, StopReason, AnthropicToolFormat, OpenAIToolFormat } from '@fluxmaster/core';

export interface SendMessageOptions {
  model: string;
  messages: AdapterMessage[];
  systemPrompt?: string;
  tools: AnthropicToolFormat[] | OpenAIToolFormat[];
  maxTokens: number;
  temperature: number;
}

export interface AdapterMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ModelResponse {
  content: ContentBlock[];
  stopReason: StopReason;
  usage: { inputTokens: number; outputTokens: number };
}

export interface IModelAdapter {
  readonly provider: string;
  sendMessage(options: SendMessageOptions): Promise<ModelResponse>;
}
