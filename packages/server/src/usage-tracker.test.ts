import { describe, it, expect, beforeEach } from 'vitest';
import { UsageTracker } from './usage-tracker.js';

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it('returns zero usage for unknown agent', () => {
    const usage = tracker.getAgent('unknown');
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0, requestCount: 0 });
  });

  it('records usage for an agent', () => {
    tracker.record('agent-1', 100, 50);
    const usage = tracker.getAgent('agent-1');
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 50, requestCount: 1 });
  });

  it('accumulates usage across multiple records', () => {
    tracker.record('agent-1', 100, 50);
    tracker.record('agent-1', 200, 100);
    const usage = tracker.getAgent('agent-1');
    expect(usage).toEqual({ inputTokens: 300, outputTokens: 150, requestCount: 2 });
  });

  it('tracks usage per agent independently', () => {
    tracker.record('agent-1', 100, 50);
    tracker.record('agent-2', 200, 100);

    expect(tracker.getAgent('agent-1')).toEqual({ inputTokens: 100, outputTokens: 50, requestCount: 1 });
    expect(tracker.getAgent('agent-2')).toEqual({ inputTokens: 200, outputTokens: 100, requestCount: 1 });
  });

  it('computes total usage across all agents', () => {
    tracker.record('agent-1', 100, 50);
    tracker.record('agent-2', 200, 100);
    tracker.record('agent-1', 50, 25);

    const total = tracker.getTotal();
    expect(total).toEqual({ inputTokens: 350, outputTokens: 175, requestCount: 3 });
  });

  it('returns all agent usage entries', () => {
    tracker.record('agent-1', 100, 50);
    tracker.record('agent-2', 200, 100);

    const all = tracker.getAll();
    expect(all).toEqual({
      'agent-1': { inputTokens: 100, outputTokens: 50, requestCount: 1 },
      'agent-2': { inputTokens: 200, outputTokens: 100, requestCount: 1 },
    });
  });

  it('resets all usage data', () => {
    tracker.record('agent-1', 100, 50);
    tracker.record('agent-2', 200, 100);
    tracker.reset();

    expect(tracker.getTotal()).toEqual({ inputTokens: 0, outputTokens: 0, requestCount: 0 });
    expect(tracker.getAll()).toEqual({});
  });
});
