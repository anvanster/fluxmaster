import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@fluxmaster/core';
import { WsEventBridge } from './ws-event-bridge.js';
import type { ConnectionManager } from '../ws/connection-manager.js';

function createMockConnectionManager(): ConnectionManager {
  return {
    broadcast: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    count: vi.fn(),
    startHeartbeat: vi.fn(),
    stopHeartbeat: vi.fn(),
    closeAll: vi.fn(),
  } as unknown as ConnectionManager;
}

describe('WsEventBridge', () => {
  it('broadcasts agent:spawned events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', provider: 'copilot', timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('agent_event');
    expect(msg.event).toBe('spawned');
    expect(msg.agentId).toBe('a1');
    expect(msg.data.model).toBe('gpt-4o');
  });

  it('broadcasts agent:killed events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'agent:killed', agentId: 'a1', timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('agent_event');
    expect(msg.event).toBe('killed');
    expect(msg.agentId).toBe('a1');
  });

  it('broadcasts agent:status_changed events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'agent:status_changed', agentId: 'a1', status: 'processing', previousStatus: 'idle', timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('agent_event');
    expect(msg.event).toBe('status_changed');
    expect(msg.data.status).toBe('processing');
    expect(msg.data.previousStatus).toBe('idle');
  });

  it('broadcasts cost:updated events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'cost:updated', agentId: 'a1', inputTokens: 100, outputTokens: 50, cost: 0.005, unit: 'cost', provider: 'anthropic', timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('cost_update');
    expect(msg.agentId).toBe('a1');
    expect(msg.cost).toBe(0.005);
    expect(msg.inputTokens).toBe(100);
    expect(msg.outputTokens).toBe(50);
  });

  it('broadcasts budget:warning events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'budget:warning', budgetId: 'global', threshold: 0.8, currentCost: 80, maxCost: 100, timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('budget_event');
    expect(msg.event).toBe('warning');
    expect(msg.budgetId).toBe('global');
    expect(msg.threshold).toBe(0.8);
  });

  it('broadcasts budget:exceeded events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'budget:exceeded', budgetId: 'global', currentCost: 101, maxCost: 100, timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('budget_event');
    expect(msg.event).toBe('exceeded');
    expect(msg.budgetId).toBe('global');
  });

  it('broadcasts budget:request_blocked events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'budget:request_blocked', agentId: 'a1', budgetId: 'a1', currentCost: 51, maxCost: 50, timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('budget_event');
    expect(msg.event).toBe('request_blocked');
    expect(msg.agentId).toBe('a1');
  });

  it('does not broadcast non-allowed events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({ type: 'message:text_delta', agentId: 'a1', requestId: 'r1', text: 'hello', timestamp: new Date() });
    bus.emit({ type: 'mcp:server_started', serverName: 'test', timestamp: new Date() });
    bus.emit({ type: 'tool:call_started', agentId: 'a1', requestId: 'r1', toolName: 'read_file', timestamp: new Date() });

    expect(cm.broadcast).not.toHaveBeenCalled();
  });

  it('stop() unsubscribes all listeners', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();
    bridge.stop();

    bus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', provider: 'copilot', timestamp: new Date() });

    expect(cm.broadcast).not.toHaveBeenCalled();
  });

  it('can be started and stopped multiple times', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);

    bridge.start();
    bridge.stop();
    bridge.start();

    bus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', provider: 'copilot', timestamp: new Date() });

    expect(cm.broadcast).toHaveBeenCalledOnce();
  });

  it('broadcasts message:completed events', () => {
    const bus = new EventBus();
    const cm = createMockConnectionManager();
    const bridge = new WsEventBridge(bus, cm);
    bridge.start();

    bus.emit({
      type: 'message:completed',
      agentId: 'a1',
      requestId: 'r1',
      text: 'Hello',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    expect(cm.broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((cm.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe('agent_event');
    expect(msg.event).toBe('message_completed');
    expect(msg.agentId).toBe('a1');
  });
});
