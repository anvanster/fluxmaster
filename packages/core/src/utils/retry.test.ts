import { describe, it, expect, vi } from 'vitest';
import { retry } from './retry.js';

describe('retry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok');

    const result = await retry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws last error after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(retry(fn, { maxAttempts: 2, baseDelayMs: 1 }))
      .rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Abort before the delay completes
    setTimeout(() => controller.abort(), 5);

    await expect(retry(fn, {
      maxAttempts: 10,
      baseDelayMs: 1000,
      signal: controller.signal,
    })).rejects.toThrow('Retry aborted');
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('retryable'))
      .mockRejectedValueOnce(new Error('fatal'))
      .mockResolvedValue('ok');

    const shouldRetry = (err: unknown) =>
      err instanceof Error && err.message === 'retryable';

    await expect(retry(fn, { maxAttempts: 5, baseDelayMs: 1, shouldRetry }))
      .rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries when shouldRetry returns true', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('retryable'))
      .mockResolvedValue('ok');

    const shouldRetry = () => true;

    const result = await retry(fn, { maxAttempts: 3, baseDelayMs: 1, shouldRetry });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('applies exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    vi.useFakeTimers();

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = retry(fn, { maxAttempts: 3, baseDelayMs: 100 });

    // First retry: 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    // Second retry: 200ms delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});
