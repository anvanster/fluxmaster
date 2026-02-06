import OpenAI from 'openai';
import type { ContentBlock, OpenAIToolFormat } from '@fluxmaster/core';
import type { IModelAdapter, SendMessageOptions, ModelResponse, AdapterMessage } from './adapter.interface.js';

export class OpenAIAdapter implements IModelAdapter {
  readonly provider = 'openai';
  private client: OpenAI;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new OpenAI({
      baseURL: baseUrl,
      apiKey,
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<ModelResponse> {
    const messages = this.convertMessages(options.messages, options.systemPrompt);

    const response = await this.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      tools: options.tools as OpenAIToolFormat[],
      messages,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choice returned from OpenAI');
    }

    return {
      content: this.parseContent(choice.message),
      stopReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  private convertMessages(
    messages: AdapterMessage[],
    systemPrompt?: string,
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({ role: msg.role, content: msg.content } as OpenAI.ChatCompletionMessageParam);
        continue;
      }

      // Convert ContentBlock[] to OpenAI format
      if (msg.role === 'assistant') {
        const textParts = msg.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('');

        const toolCalls = msg.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({
            id: b.id,
            type: 'function' as const,
            function: { name: b.name, arguments: JSON.stringify(b.input) },
          }));

        result.push({
          role: 'assistant',
          content: textParts || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        } as OpenAI.ChatCompletionMessageParam);
      } else {
        // User messages with tool results
        for (const block of msg.content) {
          if (block.type === 'tool_result') {
            result.push({
              role: 'tool',
              tool_call_id: block.toolUseId,
              content: block.content,
            } as OpenAI.ChatCompletionMessageParam);
          }
        }
      }
    }

    return result;
  }

  private parseContent(message: OpenAI.ChatCompletionMessage): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    if (message.content) {
      blocks.push({ type: 'text', text: message.content });
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        blocks.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return blocks;
  }

  private mapFinishReason(reason: string | null): ModelResponse['stopReason'] {
    switch (reason) {
      case 'stop': return 'end_turn';
      case 'tool_calls': return 'tool_use';
      case 'length': return 'max_tokens';
      default: return 'end_turn';
    }
  }
}
