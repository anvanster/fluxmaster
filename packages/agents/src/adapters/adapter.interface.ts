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

export interface StreamEvent {
  type: 'text_delta' | 'tool_use_start' | 'tool_use_delta' | 'tool_use_end' | 'done';
  text?: string;
  toolUse?: { id: string; name: string; input?: unknown };
  usage?: { inputTokens: number; outputTokens: number };
  stopReason?: StopReason;
}

export interface IModelAdapter {
  readonly provider: string;
  sendMessage(options: SendMessageOptions): Promise<ModelResponse>;
  sendMessageStream?(options: SendMessageOptions): AsyncIterable<StreamEvent>;
}
