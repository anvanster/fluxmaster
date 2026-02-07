import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, type IEventStore, type StoredEvent } from '@fluxmaster/core';
import { EventPersister } from './event-persister.js';

describe('EventPersister', () => {
  let eventBus: EventBus;
  let mockStore: IEventStore;
  let savedEvents: StoredEvent[];
  let persister: EventPersister;

  beforeEach(() => {
    eventBus = new EventBus();
    savedEvents = [];
    mockStore = {
      saveEvent: vi.fn((event: StoredEvent) => savedEvents.push(event)),
      getEventsByRequest: vi.fn(() => []),
      getEventsByAgent: vi.fn(() => []),
      pruneOldEvents: vi.fn(() => 0),
    };
    persister = new EventPersister(eventBus, mockStore);
  });

  it('subscribes to all event types on start', () => {
    persister.start();

    eventBus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', timestamp: new Date() });
    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    eventBus.emit({ type: 'cost:updated', agentId: 'a1', inputTokens: 10, outputTokens: 20, cost: 0.01, timestamp: new Date() });

    expect(savedEvents).toHaveLength(3);
  });

  it('persists message:started events with correct fields', () => {
    persister.start();

    const ts = new Date();
    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: ts });

    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0].type).toBe('message:started');
    expect(savedEvents[0].agentId).toBe('a1');
    expect(savedEvents[0].requestId).toBe('r1');
    expect(savedEvents[0].timestamp).toBe(ts);
  });

  it('persists tool events', () => {
    persister.start();

    eventBus.emit({ type: 'tool:call_started', agentId: 'a1', requestId: 'r1', toolName: 'read_file', timestamp: new Date() });
    eventBus.emit({ type: 'tool:call_completed', agentId: 'a1', requestId: 'r1', toolName: 'read_file', result: 'contents', isError: false, timestamp: new Date() });

    expect(savedEvents).toHaveLength(2);
    expect(savedEvents[0].type).toBe('tool:call_started');
    expect(savedEvents[1].type).toBe('tool:call_completed');
  });

  it('unsubscribes on stop', () => {
    persister.start();
    persister.stop();

    eventBus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', timestamp: new Date() });
    expect(savedEvents).toHaveLength(0);
  });

  it('handles store errors gracefully', () => {
    const failingStore: IEventStore = {
      saveEvent: vi.fn(() => { throw new Error('DB error'); }),
      getEventsByRequest: vi.fn(() => []),
      getEventsByAgent: vi.fn(() => []),
      pruneOldEvents: vi.fn(() => 0),
    };

    const failingPersister = new EventPersister(eventBus, failingStore);
    failingPersister.start();

    // Should not throw
    expect(() => {
      eventBus.emit({ type: 'agent:spawned', agentId: 'a1', model: 'gpt-4o', timestamp: new Date() });
    }).not.toThrow();
  });
});
