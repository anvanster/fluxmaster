import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, AnthropicToolFormat } from '@fluxmaster/core';
import type { IModelAdapter, SendMessageOptions, ModelResponse, AdapterMessage } from './adapter.interface.js';

export class AnthropicAdapter implements IModelAdapter {
  readonly provider = 'anthropic';
  private client: Anthropic;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new Anthropic({
      baseURL: baseUrl,
      apiKey,
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<ModelResponse> {
    const messages = this.convertMessages(options.messages);

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.systemPrompt,
      tools: options.tools as AnthropicToolFormat[] as any,
      messages,
    });

    return {
      content: this.parseContent(response.content),
      stopReason: this.mapStopReason(response.stop_reason),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private convertMessages(messages: AdapterMessage[]): Anthropic.MessageParam[] {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }

      // Convert ContentBlock[] to Anthropic format
      const content = msg.content.map(block => {
        switch (block.type) {
          case 'text':
            return { type: 'text' as const, text: block.text };
          case 'tool_use':
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            };
          case 'tool_result':
            return {
              type: 'tool_result' as const,
              tool_use_id: block.toolUseId,
              content: block.content,
              is_error: block.isError,
            };
          default:
            return { type: 'text' as const, text: '' };
        }
      });

      return { role: msg.role, content } as Anthropic.MessageParam;
    });
  }

  private parseContent(content: Anthropic.ContentBlock[]): ContentBlock[] {
    return content.map(block => {
      if (block.type === 'text') {
        return { type: 'text' as const, text: block.text };
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use' as const,
          id: block.id,
          name: block.name,
          input: block.input,
        };
      }
      return { type: 'text' as const, text: '' };
    });
  }

  private mapStopReason(reason: string | null): ModelResponse['stopReason'] {
    switch (reason) {
      case 'end_turn': return 'end_turn';
      case 'tool_use': return 'tool_use';
      case 'max_tokens': return 'max_tokens';
      case 'stop_sequence': return 'stop_sequence';
      default: return 'end_turn';
    }
  }
}
