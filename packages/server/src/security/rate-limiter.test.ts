import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows calls within the limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limiter.check('agent:tool', 10)).toBe(true);
      limiter.record('agent:tool');
    }
  });

  it('blocks calls exceeding the limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.record('agent:tool');
    }
    expect(limiter.check('agent:tool', 5)).toBe(false);
  });

  it('resets after the window expires', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.record('agent:tool');
    }
    expect(limiter.check('agent:tool', 5)).toBe(false);

    // Advance past the 1-minute window
    vi.advanceTimersByTime(61_000);
    expect(limiter.check('agent:tool', 5)).toBe(true);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.record('agent1:tool');
    }
    expect(limiter.check('agent1:tool', 5)).toBe(false);
    expect(limiter.check('agent2:tool', 5)).toBe(true);
  });

  it('getCallCount returns current count within window', () => {
    const limiter = new RateLimiter();
    limiter.record('agent:tool');
    limiter.record('agent:tool');
    limiter.record('agent:tool');

    expect(limiter.getCallCount('agent:tool')).toBe(3);
    expect(limiter.getCallCount('other:tool')).toBe(0);
  });

  it('sliding window evicts old entries', () => {
    const limiter = new RateLimiter();
    limiter.record('agent:tool');
    limiter.record('agent:tool');

    vi.advanceTimersByTime(30_000); // 30 seconds
    limiter.record('agent:tool');

    vi.advanceTimersByTime(31_000); // now 61s after first two
    // First two should be evicted, third remains
    expect(limiter.getCallCount('agent:tool')).toBe(1);
  });

  it('check does not consume a slot', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter.check('agent:tool', 5);
    }
    // check alone shouldn't record, so should still be allowed
    expect(limiter.check('agent:tool', 5)).toBe(true);
    expect(limiter.getCallCount('agent:tool')).toBe(0);
  });
});
