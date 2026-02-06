import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '@fluxmaster/tools';
import type { IModelAdapter, ModelResponse, StreamEvent } from './adapters/adapter.interface.js';
import { runToolLoopStream } from './tool-loop-stream.js';

function createTextResponse(text: string): ModelResponse {
  return {
    content: [{ type: 'text', text }],
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 5 },
  };
}

function createNonStreamingAdapter(): IModelAdapter {
  return {
    provider: 'mock',
    sendMessage: vi.fn().mockResolvedValue(createTextResponse('Non-streaming response')),
    // No sendMessageStream
  };
}

function createStreamingAdapter(eventSets: StreamEvent[][]): IModelAdapter {
  let callIndex = 0;
  return {
    provider: 'mock',
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn().mockImplementation(function* () {
      // Not actually used, we need async generator
    }) as any,
  };
}

// Helper to create an adapter that yields stream events
function createAsyncStreamingAdapter(eventSets: StreamEvent[][]): IModelAdapter {
  let callIndex = 0;
  return {
    provider: 'mock',
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn().mockImplementation(async function* () {
      const events = eventSets[callIndex++];
      if (!events) throw new Error(`No events for call ${callIndex - 1}`);
      for (const event of events) {
        yield event;
      }
    }),
  };
}

describe('runToolLoopStream', () => {
  it('falls back to non-streaming when adapter does not support it', async () => {
    const adapter = createNonStreamingAdapter();
    const registry = new ToolRegistry();

    const result = await runToolLoopStream(
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

    expect(result.text).toBe('Non-streaming response');
    expect(adapter.sendMessage).toHaveBeenCalledOnce();
  });

  it('streams text and collects into result', async () => {
    const adapter = createAsyncStreamingAdapter([
      [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world!' },
        { type: 'done', stopReason: 'end_turn', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
    ]);
    const registry = new ToolRegistry();

    const events: StreamEvent[] = [];
    const result = await runToolLoopStream(
      [{ role: 'user', content: 'Hi' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
        onStreamEvent: (e) => events.push(e),
      },
    );

    expect(result.text).toBe('Hello world!');
    expect(result.iterations).toBe(1);
    expect(result.usage.inputTokens).toBe(10);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('text_delta');
    expect(events[2].type).toBe('done');
  });

  it('handles tool use loop with streaming', async () => {
    const toolFn = vi.fn().mockResolvedValue({ content: 'tool result' });
    const registry = new ToolRegistry();
    registry.register({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: z.object({ q: z.string() }),
      execute: toolFn,
    });

    const adapter = createAsyncStreamingAdapter([
      // First call: model wants to use a tool
      [
        { type: 'text_delta', text: 'Let me check.' },
        { type: 'tool_use_start', toolUse: { id: 'call_1', name: 'test_tool' } },
        { type: 'tool_use_delta', text: '{"q"' },
        { type: 'tool_use_delta', text: ':"hello"}' },
        { type: 'tool_use_end', toolUse: { id: 'call_1', name: 'test_tool', input: { q: 'hello' } } },
        { type: 'done', stopReason: 'tool_use', usage: { inputTokens: 20, outputTokens: 10 } },
      ],
      // Second call: model provides final answer
      [
        { type: 'text_delta', text: 'The answer is 42.' },
        { type: 'done', stopReason: 'end_turn', usage: { inputTokens: 30, outputTokens: 15 } },
      ],
    ]);

    const result = await runToolLoopStream(
      [{ role: 'user', content: 'Ask the tool' }],
      {
        adapter,
        model: 'test-model',
        tools: [],
        toolRegistry: registry,
        maxTokens: 1024,
        temperature: 0.7,
      },
    );

    expect(result.text).toBe('The answer is 42.');
    expect(result.iterations).toBe(2);
    expect(result.usage.inputTokens).toBe(50);
    expect(result.usage.outputTokens).toBe(25);
    expect(toolFn).toHaveBeenCalledWith({ q: 'hello' });
  });

  it('accumulates content blocks from multiple stream chunks', async () => {
    const adapter = createAsyncStreamingAdapter([
      [
        { type: 'text_delta', text: 'Part 1 ' },
        { type: 'text_delta', text: 'Part 2' },
        { type: 'done', stopReason: 'end_turn', usage: { inputTokens: 5, outputTokens: 3 } },
      ],
    ]);
    const registry = new ToolRegistry();

    const result = await runToolLoopStream(
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

    expect(result.text).toBe('Part 1 Part 2');
    expect(result.allContent).toHaveLength(1);
    expect(result.allContent[0]).toEqual({ type: 'text', text: 'Part 1 Part 2' });
  });
});
