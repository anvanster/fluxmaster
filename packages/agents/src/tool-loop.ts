import type { ContentBlock, ToolUseBlock, AnthropicToolFormat, OpenAIToolFormat } from '@fluxmaster/core';
import { createChildLogger, retry, type RetryOptions } from '@fluxmaster/core';
import { isRetryableError } from '@fluxmaster/core';
import type { ToolRegistry } from '@fluxmaster/tools';
import type { IModelAdapter, AdapterMessage, ModelResponse } from './adapters/adapter.interface.js';

const logger = createChildLogger('tool-loop');

export interface ToolLoopOptions {
  adapter: IModelAdapter;
  model: string;
  systemPrompt?: string;
  tools: AnthropicToolFormat[] | OpenAIToolFormat[];
  toolRegistry: ToolRegistry;
  maxTokens: number;
  temperature: number;
  maxIterations?: number;
  retryOptions?: Partial<RetryOptions>;
}

export interface ToolLoopResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  iterations: number;
  allContent: ContentBlock[];
}

export async function runToolLoop(
  messages: AdapterMessage[],
  options: ToolLoopOptions,
): Promise<ToolLoopResult> {
  const maxIterations = options.maxIterations ?? 25;
  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  const allContent: ContentBlock[] = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    logger.debug({ iteration, messageCount: messages.length }, 'Sending to model');

    const response: ModelResponse = await retry(
      () => options.adapter.sendMessage({
        model: options.model,
        messages,
        systemPrompt: options.systemPrompt,
        tools: options.tools,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      }),
      {
        maxAttempts: options.retryOptions?.maxAttempts ?? 3,
        baseDelayMs: options.retryOptions?.baseDelayMs ?? 1000,
        maxDelayMs: options.retryOptions?.maxDelayMs,
        signal: options.retryOptions?.signal,
        shouldRetry: isRetryableError,
      },
    );

    totalUsage.inputTokens += response.usage.inputTokens;
    totalUsage.outputTokens += response.usage.outputTokens;
    allContent.push(...response.content);

    // Append assistant response to history
    messages.push({ role: 'assistant', content: response.content });

    if (response.stopReason === 'end_turn' || response.stopReason === 'max_tokens') {
      const text = extractText(response.content);
      return { text, usage: totalUsage, iterations: iteration + 1, allContent };
    }

    if (response.stopReason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      );

      const resultBlocks: ContentBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        logger.debug({ tool: toolUse.name, id: toolUse.id }, 'Executing tool');

        try {
          const tool = options.toolRegistry.get(toolUse.name);
          const result = await tool.execute(toolUse.input);

          resultBlocks.push({
            type: 'tool_result',
            toolUseId: toolUse.id,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
            isError: result.isError,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ tool: toolUse.name, error: message }, 'Tool execution failed');

          resultBlocks.push({
            type: 'tool_result',
            toolUseId: toolUse.id,
            content: `Error: ${message}`,
            isError: true,
          });
        }
      }

      // Append tool results as a user message
      messages.push({ role: 'user', content: resultBlocks });
      allContent.push(...resultBlocks);
    }
  }

  // Max iterations reached
  return {
    text: '[Max iterations reached]',
    usage: totalUsage,
    iterations: maxIterations,
    allContent,
  };
}

function extractText(content: ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map(b => b.text)
    .join('');
}
