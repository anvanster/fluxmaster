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
      bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));
    }).not.toThrow();
  });

  it('on() receives matching events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('agent:spawned', handler);

    const event = makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' });
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
    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));

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

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));

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

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));
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

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));
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

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));

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
        bus.emit(makeEvent('agent:spawned', { agentId: `a${i}`, model: 'gpt-4o' }));
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
    ];

    for (const type of types) {
      const h = vi.fn();
      handlers.push(h);
      bus.on(type, h);
    }

    expect(types).toHaveLength(12);
    expect(handlers).toHaveLength(12);
  });

  it('unsubscribe is idempotent', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('agent:spawned', handler);

    unsub();
    unsub(); // second call should not throw

    bus.emit(makeEvent('agent:spawned', { agentId: 'a1', model: 'gpt-4o' }));
    expect(handler).not.toHaveBeenCalled();
  });
});
