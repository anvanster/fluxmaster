import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WsHandler } from './handler.js';
import type { AppContext } from '../context.js';
import { UsageTracker } from '../usage-tracker.js';
import { CostCalculator } from '../cost-calculator.js';
import { EventBus } from '@fluxmaster/core';
import { EventEmitter } from 'node:events';

function createMockSocket() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    readyState: 1,
    send: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
  }) as any;
}

function createMockContext(): AppContext {
  return {
    config: { auth: {}, agents: { defaults: {}, list: [] }, mcpServers: { global: [] }, retry: {}, plugins: [] } as any,
    authManager: {} as any,
    agentManager: {
      routeMessageStream: vi.fn().mockResolvedValue({
        text: 'Response',
        usage: { inputTokens: 100, outputTokens: 50 },
        iterations: 1,
        allContent: [],
      }),
    } as any,
    toolRegistry: {} as any,
    mcpServerManager: {} as any,
    usageTracker: new UsageTracker(),
    eventBus: new EventBus(),
    costCalculator: new CostCalculator(new UsageTracker(), {}, new Map()),
  };
}

describe('WsHandler', () => {
  let handler: WsHandler;
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockContext();
    handler = new WsHandler(ctx);
  });

  it('handles connection and tracks it', () => {
    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');
    expect(handler.connections.count()).toBe(1);
  });

  it('removes connection on close', () => {
    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');
    socket.emit('close');
    expect(handler.connections.count()).toBe(0);
  });

  it('responds to ping with pong', () => {
    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');

    socket.emit('message', JSON.stringify({ type: 'ping' }));

    // Give the async handler a tick to resolve
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
        resolve();
      }, 10);
    });
  });

  it('handles message and sends streaming events', async () => {
    // Mock routeMessageStream to call the callback
    (ctx.agentManager.routeMessageStream as any).mockImplementation(
      async (_agentId: string, _text: string, onEvent: (event: any) => void) => {
        onEvent({ type: 'text_delta', text: 'Hello' });
        onEvent({ type: 'tool_use_start', toolUse: { id: '1', name: 'read_file' } });
        return {
          text: 'Hello',
          usage: { inputTokens: 100, outputTokens: 50 },
          iterations: 1,
          allContent: [],
        };
      },
    );

    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');

    socket.emit('message', JSON.stringify({
      type: 'message',
      agentId: 'default',
      text: 'hi',
      requestId: 'req-1',
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const calls = socket.send.mock.calls.map((c: any) => JSON.parse(c[0]));
    expect(calls).toContainEqual({ type: 'text_delta', text: 'Hello', requestId: 'req-1' });
    expect(calls).toContainEqual({ type: 'tool_use_start', toolName: 'read_file', requestId: 'req-1' });
    expect(calls).toContainEqual(expect.objectContaining({ type: 'message_complete', requestId: 'req-1' }));
  });

  it('sends error on invalid JSON', async () => {
    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');

    socket.emit('message', 'not json');

    await new Promise((resolve) => setTimeout(resolve, 10));

    const calls = socket.send.mock.calls.map((c: any) => JSON.parse(c[0]));
    expect(calls).toContainEqual(expect.objectContaining({ type: 'error' }));
  });

  it('records usage after successful message', async () => {
    const socket = createMockSocket();
    handler.handleConnection(socket, 'conn-1');

    socket.emit('message', JSON.stringify({
      type: 'message',
      agentId: 'default',
      text: 'hi',
      requestId: 'req-1',
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const usage = ctx.usageTracker.getAgent('default');
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });
});
