import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, type IRequestStore, type RequestRecord } from '@fluxmaster/core';
import { RequestTracker } from './request-tracker.js';

describe('RequestTracker', () => {
  let eventBus: EventBus;
  let mockStore: IRequestStore;
  let savedRequests: RequestRecord[];
  let updatedRequests: Map<string, Partial<RequestRecord>>;
  let tracker: RequestTracker;

  beforeEach(() => {
    eventBus = new EventBus();
    savedRequests = [];
    updatedRequests = new Map();
    mockStore = {
      saveRequest: vi.fn((req: RequestRecord) => savedRequests.push(req)),
      updateRequest: vi.fn((id: string, updates: Partial<RequestRecord>) => {
        const existing = updatedRequests.get(id) ?? {};
        updatedRequests.set(id, { ...existing, ...updates });
      }),
      getRequest: vi.fn(),
      listRequests: vi.fn().mockReturnValue([]),
    };
    tracker = new RequestTracker(eventBus, mockStore);
  });

  it('creates request record on message:started', () => {
    tracker.start();

    eventBus.emit({
      type: 'message:started',
      agentId: 'a1',
      requestId: 'r1',
      timestamp: new Date(),
    });

    expect(savedRequests).toHaveLength(1);
    expect(savedRequests[0].id).toBe('r1');
    expect(savedRequests[0].agentId).toBe('a1');
    expect(savedRequests[0].status).toBe('pending');
  });

  it('records first token time on first text_delta', () => {
    tracker.start();
    const started = new Date('2024-01-01T00:00:00Z');
    const firstToken = new Date('2024-01-01T00:00:01Z');

    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: started });
    eventBus.emit({ type: 'message:text_delta', agentId: 'a1', requestId: 'r1', text: 'H', timestamp: firstToken });
    // Second delta should not update TTFT
    eventBus.emit({ type: 'message:text_delta', agentId: 'a1', requestId: 'r1', text: 'i', timestamp: new Date('2024-01-01T00:00:02Z') });

    const updates = updatedRequests.get('r1');
    expect(updates?.status).toBe('streaming');
    expect(updates?.firstTokenAt).toEqual(firstToken);
    // updateRequest should be called twice: once for streaming status + TTFT, once skipped for 2nd delta
    expect(mockStore.updateRequest).toHaveBeenCalledTimes(1);
  });

  it('tracks tool call timings', () => {
    tracker.start();

    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    eventBus.emit({ type: 'tool:call_started', agentId: 'a1', requestId: 'r1', toolName: 'read_file', timestamp: new Date('2024-01-01T00:00:02Z') });
    eventBus.emit({ type: 'tool:call_completed', agentId: 'a1', requestId: 'r1', toolName: 'read_file', result: 'ok', isError: false, timestamp: new Date('2024-01-01T00:00:03Z') });

    const updates = updatedRequests.get('r1');
    expect(updates?.toolCalls).toBeDefined();
    expect(updates!.toolCalls!).toHaveLength(1);
    expect(updates!.toolCalls![0].toolName).toBe('read_file');
    expect(updates!.toolCalls![0].isError).toBe(false);
  });

  it('finalizes request on message:completed', () => {
    tracker.start();

    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    eventBus.emit({ type: 'message:completed', agentId: 'a1', requestId: 'r1', text: 'done', usage: { inputTokens: 100, outputTokens: 200 }, iterations: 1, timestamp: new Date() });

    const updates = updatedRequests.get('r1');
    expect(updates?.status).toBe('completed');
    expect(updates?.inputTokens).toBe(100);
    expect(updates?.outputTokens).toBe(200);
  });

  it('marks error on message:error', () => {
    tracker.start();

    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    eventBus.emit({ type: 'message:error', agentId: 'a1', requestId: 'r1', error: 'timeout', timestamp: new Date() });

    const updates = updatedRequests.get('r1');
    expect(updates?.status).toBe('error');
    expect(updates?.errorMessage).toBe('timeout');
  });

  it('unsubscribes on stop', () => {
    tracker.start();
    tracker.stop();

    eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    expect(savedRequests).toHaveLength(0);
  });

  it('handles store errors gracefully', () => {
    const failingStore: IRequestStore = {
      saveRequest: vi.fn(() => { throw new Error('DB error'); }),
      updateRequest: vi.fn(),
      getRequest: vi.fn(),
      listRequests: vi.fn().mockReturnValue([]),
    };
    const failingTracker = new RequestTracker(eventBus, failingStore);
    failingTracker.start();

    expect(() => {
      eventBus.emit({ type: 'message:started', agentId: 'a1', requestId: 'r1', timestamp: new Date() });
    }).not.toThrow();
  });
});
