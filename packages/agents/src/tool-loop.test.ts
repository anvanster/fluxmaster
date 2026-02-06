import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '@fluxmaster/tools';
import type { Tool } from '@fluxmaster/core';
import type { IModelAdapter, ModelResponse } from './adapters/adapter.interface.js';
import { runToolLoop } from './tool-loop.js';

function createMockAdapter(responses: ModelResponse[]): IModelAdapter {
  let callIndex = 0;
  return {
    provider: 'mock',
    sendMessage: vi.fn(async () => {
      const response = responses[callIndex];
      if (!response) throw new Error(`No mock response for call ${callIndex}`);
      callIndex++;
      return response;
    }),
  };
}

function createMockTool(name: string, result: string): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: z.object({ input: z.string().optional() }),
    execute: vi.fn(async () => ({ content: result })),
  };
}

describe('runToolLoop', () => {
  it('returns text response immediately when stopReason is end_turn', async () => {
    const adapter = createMockAdapter([{
      content: [{ type: 'text', text: 'Hello!' }],
      stopReason: 'end_turn',
      usage: { inputTokens: 10, outputTokens: 5 },
    }]);

    const registry = new ToolRegistry();
    const result = await runToolLoop(
      [{ role: 'user', content: 'Hi' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
      },
    );

    expect(result.text).toBe('Hello!');
    expect(result.iterations).toBe(1);
    expect(result.usage.inputTokens).toBe(10);
  });

  it('executes tool call and loops when stopReason is tool_use', async () => {
    const adapter = createMockAdapter([
      // First response: tool call
      {
        content: [
          { type: 'tool_use', id: 'call_1', name: 'my_tool', input: { input: 'test' } },
        ],
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      // Second response: final answer
      {
        content: [{ type: 'text', text: 'Tool returned: result data' }],
        stopReason: 'end_turn',
        usage: { inputTokens: 15, outputTokens: 10 },
      },
    ]);

    const registry = new ToolRegistry();
    const tool = createMockTool('my_tool', 'result data');
    registry.register(tool);

    const result = await runToolLoop(
      [{ role: 'user', content: 'Use the tool' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
      },
    );

    expect(result.text).toBe('Tool returned: result data');
    expect(result.iterations).toBe(2);
    expect(tool.execute).toHaveBeenCalledOnce();
    expect(result.usage.inputTokens).toBe(25);
    expect(result.usage.outputTokens).toBe(15);
  });

  it('handles multiple tool calls in single response', async () => {
    const adapter = createMockAdapter([
      {
        content: [
          { type: 'tool_use', id: 'call_1', name: 'tool_a', input: {} },
          { type: 'tool_use', id: 'call_2', name: 'tool_b', input: {} },
        ],
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      {
        content: [{ type: 'text', text: 'Both tools done' }],
        stopReason: 'end_turn',
        usage: { inputTokens: 20, outputTokens: 10 },
      },
    ]);

    const registry = new ToolRegistry();
    const toolA = createMockTool('tool_a', 'result_a');
    const toolB = createMockTool('tool_b', 'result_b');
    registry.register(toolA);
    registry.register(toolB);

    const result = await runToolLoop(
      [{ role: 'user', content: 'Use both' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
      },
    );

    expect(result.text).toBe('Both tools done');
    expect(toolA.execute).toHaveBeenCalledOnce();
    expect(toolB.execute).toHaveBeenCalledOnce();
  });

  it('returns error gracefully when tool execution fails', async () => {
    const adapter = createMockAdapter([
      {
        content: [
          { type: 'tool_use', id: 'call_1', name: 'failing_tool', input: {} },
        ],
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      {
        content: [{ type: 'text', text: 'I see the tool failed' }],
        stopReason: 'end_turn',
        usage: { inputTokens: 20, outputTokens: 10 },
      },
    ]);

    const registry = new ToolRegistry();
    registry.register({
      name: 'failing_tool',
      description: 'A tool that fails',
      inputSchema: z.object({}),
      execute: async () => { throw new Error('tool broke'); },
    });

    const result = await runToolLoop(
      [{ role: 'user', content: 'Try the failing tool' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
      },
    );

    expect(result.text).toBe('I see the tool failed');
    expect(result.iterations).toBe(2);
  });

  it('stops looping after maxIterations', async () => {
    // Always returns tool_use
    const adapter = createMockAdapter(
      Array.from({ length: 5 }, () => ({
        content: [
          { type: 'tool_use' as const, id: 'call', name: 'loop_tool', input: {} },
        ],
        stopReason: 'tool_use' as const,
        usage: { inputTokens: 1, outputTokens: 1 },
      })),
    );

    const registry = new ToolRegistry();
    registry.register(createMockTool('loop_tool', 'looping'));

    const result = await runToolLoop(
      [{ role: 'user', content: 'Loop forever' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
        maxIterations: 3,
      },
    );

    expect(result.text).toBe('[Max iterations reached]');
    expect(result.iterations).toBe(3);
  });
});
