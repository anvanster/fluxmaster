import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, AnthropicToolFormat } from '@fluxmaster/core';
import type { IModelAdapter, SendMessageOptions, ModelResponse, AdapterMessage, StreamEvent } from './adapter.interface.js';

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

  async *sendMessageStream(options: SendMessageOptions): AsyncIterable<StreamEvent> {
    const messages = this.convertMessages(options.messages);

    const stream = this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.systemPrompt,
      tools: options.tools as AnthropicToolFormat[] as any,
      messages,
    });

    let currentToolId = '';
    let currentToolName = '';
    let toolJsonAccumulator = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolId = event.content_block.id;
          currentToolName = event.content_block.name;
          toolJsonAccumulator = '';
          yield {
            type: 'tool_use_start',
            toolUse: { id: currentToolId, name: currentToolName },
          };
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', text: event.delta.text };
        } else if (event.delta.type === 'input_json_delta') {
          toolJsonAccumulator += event.delta.partial_json;
          yield { type: 'tool_use_delta', text: event.delta.partial_json };
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolId) {
          let parsedInput: unknown;
          try { parsedInput = JSON.parse(toolJsonAccumulator); } catch { parsedInput = toolJsonAccumulator; }
          yield {
            type: 'tool_use_end',
            toolUse: { id: currentToolId, name: currentToolName, input: parsedInput },
          };
          currentToolId = '';
          currentToolName = '';
          toolJsonAccumulator = '';
        }
      } else if (event.type === 'message_delta') {
        yield {
          type: 'done',
          stopReason: this.mapStopReason((event.delta as any).stop_reason ?? null),
          usage: {
            inputTokens: (event.usage as any)?.input_tokens ?? 0,
            outputTokens: (event.usage as any)?.output_tokens ?? 0,
          },
        };
      }
    }
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
