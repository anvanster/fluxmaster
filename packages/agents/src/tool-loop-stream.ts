import type { ContentBlock, ToolUseBlock, AnthropicToolFormat, OpenAIToolFormat } from '@fluxmaster/core';
import { createChildLogger, retry, type RetryOptions } from '@fluxmaster/core';
import { isRetryableError } from '@fluxmaster/core';
import type { ToolRegistry } from '@fluxmaster/tools';
import type { IModelAdapter, AdapterMessage, StreamEvent } from './adapters/adapter.interface.js';
import { runToolLoop, type ToolLoopResult, type ToolLoopOptions } from './tool-loop.js';

const logger = createChildLogger('tool-loop-stream');

export interface StreamToolLoopOptions extends ToolLoopOptions {
  onStreamEvent?: (event: StreamEvent) => void;
}

export async function runToolLoopStream(
  messages: AdapterMessage[],
  options: StreamToolLoopOptions,
): Promise<ToolLoopResult> {
  // Fall back to non-streaming if adapter doesn't support it
  if (!options.adapter.sendMessageStream) {
    return runToolLoop(messages, options);
  }

  const maxIterations = options.maxIterations ?? 25;
  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  const allContent: ContentBlock[] = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    logger.debug({ iteration, messageCount: messages.length }, 'Streaming to model');

    // Collect content blocks from stream
    const contentBlocks: ContentBlock[] = [];
    let currentText = '';
    let stopReason: ContentBlock extends { stopReason?: string } ? string : string = 'end_turn';

    const stream = options.adapter.sendMessageStream({
      model: options.model,
      messages,
      systemPrompt: options.systemPrompt,
      tools: options.tools,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });

    for await (const event of stream) {
      options.onStreamEvent?.(event);

      switch (event.type) {
        case 'text_delta':
          currentText += event.text ?? '';
          break;

        case 'tool_use_end':
          if (event.toolUse) {
            // Flush accumulated text before tool use
            if (currentText) {
              contentBlocks.push({ type: 'text', text: currentText });
              currentText = '';
            }
            contentBlocks.push({
              type: 'tool_use',
              id: event.toolUse.id,
              name: event.toolUse.name,
              input: event.toolUse.input,
            });
          }
          break;

        case 'done':
          if (event.usage) {
            totalUsage.inputTokens += event.usage.inputTokens;
            totalUsage.outputTokens += event.usage.outputTokens;
          }
          if (event.stopReason) {
            stopReason = event.stopReason;
          }
          break;
      }
    }

    // Flush remaining text
    if (currentText) {
      contentBlocks.push({ type: 'text', text: currentText });
    }

    allContent.push(...contentBlocks);
    messages.push({ role: 'assistant', content: contentBlocks });

    if (stopReason === 'end_turn' || stopReason === 'max_tokens') {
      const text = contentBlocks
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map(b => b.text)
        .join('');
      return { text, usage: totalUsage, iterations: iteration + 1, allContent };
    }

    if (stopReason === 'tool_use') {
      const toolUseBlocks = contentBlocks.filter(
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

      messages.push({ role: 'user', content: resultBlocks });
      allContent.push(...resultBlocks);
    }
  }

  return {
    text: '[Max iterations reached]',
    usage: totalUsage,
    iterations: maxIterations,
    allContent,
  };
}
