import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';
import type { FluxmasterEvent, EventOfType } from './event-types.js';

function makeEvent<T extends FluxmasterEvent['type']>(
  type: T,
  extra: Omit<EventOfType<T>, 'type' | 'timestamp'>,
): EventOfType<T> {
  return { type, timestamp: new Date(), ...extra } as EventOfType<T>;
}

describe('EventBus', () => {
  it('emit with no listeners does not throw', () => {
    const bus = new EventBus();
    expect(() => {
      bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));
    }).not.toThrow();
  });

  it('on() receives matching events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('agent:spawned', handler);

    const event = makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' });
    bus.emit(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('on() does not receive non-matching events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('agent:spawned', handler);

    bus.emit(makeEvent('agent:killed', { agentId: 'a1' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns unsubscribe function', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('agent:spawned', handler);

    unsub();
    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires handler exactly once', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('agent:killed', handler);

    bus.emit(makeEvent('agent:killed', { agentId: 'a1' }));
    bus.emit(makeEvent('agent:killed', { agentId: 'a2' }));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('multiple listeners on same event all fire', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const h3 = vi.fn();
    bus.on('agent:spawned', h1);
    bus.on('agent:spawned', h2);
    bus.on('agent:spawned', h3);

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
    expect(h3).toHaveBeenCalledOnce();
  });

  it('removeAllListeners(type) removes only that type', () => {
    const bus = new EventBus();
    const spawnHandler = vi.fn();
    const killHandler = vi.fn();
    bus.on('agent:spawned', spawnHandler);
    bus.on('agent:killed', killHandler);

    bus.removeAllListeners('agent:spawned');

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));
    bus.emit(makeEvent('agent:killed', { agentId: 'a1' }));

    expect(spawnHandler).not.toHaveBeenCalled();
    expect(killHandler).toHaveBeenCalledOnce();
  });

  it('removeAllListeners() removes everything', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('agent:spawned', h1);
    bus.on('agent:killed', h2);

    bus.removeAllListeners();

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));
    bus.emit(makeEvent('agent:killed', { agentId: 'a1' }));

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('listenerCount returns correct count', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('agent:spawned')).toBe(0);

    bus.on('agent:spawned', () => {});
    bus.on('agent:spawned', () => {});
    bus.on('agent:killed', () => {});

    expect(bus.listenerCount('agent:spawned')).toBe(2);
    expect(bus.listenerCount('agent:killed')).toBe(1);
    expect(bus.listenerCount('message:started')).toBe(0);
  });

  it('handler errors do not prevent other handlers from firing', () => {
    const bus = new EventBus();
    const h1 = vi.fn(() => { throw new Error('boom'); });
    const h2 = vi.fn();
    bus.on('agent:spawned', h1);
    bus.on('agent:spawned', h2);

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('emit provides correct event payload', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('message:completed', handler);

    const event = makeEvent('message:completed', {
      agentId: 'a1',
      requestId: 'r1',
      text: 'Hello',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 2,
    });
    bus.emit(event);

    const received = handler.mock.calls[0][0] as EventOfType<'message:completed'>;
    expect(received.agentId).toBe('a1');
    expect(received.requestId).toBe('r1');
    expect(received.text).toBe('Hello');
    expect(received.usage.inputTokens).toBe(100);
    expect(received.usage.outputTokens).toBe(50);
    expect(received.iterations).toBe(2);
  });

  it('concurrent emit and unsubscribe does not crash', () => {
    const bus = new EventBus();
    const handlers: (() => void)[] = [];

    for (let i = 0; i < 10; i++) {
      handlers.push(bus.on('agent:spawned', () => {}));
    }

    // Unsubscribe half while emitting
    expect(() => {
      for (let i = 0; i < 5; i++) {
        handlers[i]();
        bus.emit(makeEvent('agent:spawned', { agentId: `a${i}`, model: 'gpt-4o', provider: 'openai' }));
      }
    }).not.toThrow();
  });

  it('supports all event types', () => {
    const bus = new EventBus();
    const handlers: vi.Mock[] = [];
    const types: FluxmasterEvent['type'][] = [
      'agent:spawned', 'agent:killed', 'agent:status_changed',
      'message:started', 'message:text_delta', 'message:completed', 'message:error',
      'tool:call_started', 'tool:call_completed',
      'mcp:server_started', 'mcp:server_stopped',
      'cost:updated',
      'security:tool_denied', 'security:rate_limited', 'security:audit_logged',
      'budget:warning', 'budget:exceeded', 'budget:request_blocked',
      'workflow:started', 'workflow:step_started', 'workflow:step_completed',
      'workflow:step_failed', 'workflow:completed', 'workflow:failed',
    ];

    for (const type of types) {
      const h = vi.fn();
      handlers.push(h);
      bus.on(type, h);
    }

    expect(types).toHaveLength(24);
    expect(handlers).toHaveLength(24);
  });

  it('unsubscribe is idempotent', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('agent:spawned', handler);

    unsub();
    unsub(); // second call should not throw

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o', provider: 'openai' }));
    expect(handler).not.toHaveBeenCalled();
  });

  describe('security events', () => {
    it('emits security:tool_denied with reason', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('security:tool_denied', handler);

      const event = makeEvent('security:tool_denied', {
        agentId: 'a1',
        toolName: 'bash_execute',
        reason: 'Tool classified as dangerous',
      });
      bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      const received = handler.mock.calls[0][0] as EventOfType<'security:tool_denied'>;
      expect(received.agentId).toBe('a1');
      expect(received.toolName).toBe('bash_execute');
      expect(received.reason).toBe('Tool classified as dangerous');
    });

    it('emits security:rate_limited with limit info', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('security:rate_limited', handler);

      const event = makeEvent('security:rate_limited', {
        agentId: 'a1',
        toolName: 'write_file',
        callsPerMinute: 65,
        limit: 60,
      });
      bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      const received = handler.mock.calls[0][0] as EventOfType<'security:rate_limited'>;
      expect(received.callsPerMinute).toBe(65);
      expect(received.limit).toBe(60);
    });

    it('emits budget:warning with threshold info', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('budget:warning', handler);

      const event = makeEvent('budget:warning', {
        budgetId: 'global',
        threshold: 0.8,
        currentCost: 80,
        maxCost: 100,
      });
      bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      const received = handler.mock.calls[0][0] as EventOfType<'budget:warning'>;
      expect(received.threshold).toBe(0.8);
    });

    it('emits budget:exceeded when budget is blown', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('budget:exceeded', handler);

      bus.emit(makeEvent('budget:exceeded', {
        budgetId: 'agent-1',
        currentCost: 105,
        maxCost: 100,
      }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('emits budget:request_blocked when request denied', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('budget:request_blocked', handler);

      bus.emit(makeEvent('budget:request_blocked', {
        agentId: 'agent-1',
        budgetId: 'global',
        currentCost: 110,
        maxCost: 100,
      }));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].agentId).toBe('agent-1');
    });

    it('emits security:audit_logged with execution details', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('security:audit_logged', handler);

      const event = makeEvent('security:audit_logged', {
        agentId: 'a1',
        toolName: 'read_file',
        permitted: true,
        durationMs: 42,
      });
      bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      const received = handler.mock.calls[0][0] as EventOfType<'security:audit_logged'>;
      expect(received.permitted).toBe(true);
      expect(received.durationMs).toBe(42);
    });
  });

  describe('workflow events', () => {
    it('emits workflow:started', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('workflow:started', handler);

      bus.emit(makeEvent('workflow:started', { workflowId: 'wf-1', runId: 'run-1' }));
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].workflowId).toBe('wf-1');
    });

    it('emits workflow:step_completed with output', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('workflow:step_completed', handler);

      bus.emit(makeEvent('workflow:step_completed', { workflowId: 'wf-1', runId: 'run-1', stepId: 's1', output: 'result' }));
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].output).toBe('result');
    });

    it('emits workflow:failed with error', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.on('workflow:failed', handler);

      bus.emit(makeEvent('workflow:failed', { workflowId: 'wf-1', runId: 'run-1', error: 'Step failed' }));
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].error).toBe('Step failed');
    });
  });
});
