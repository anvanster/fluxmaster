import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError } from './client';

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches JSON successfully', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await apiFetch('/test');
    expect(result).toEqual({ data: 'test' });
  });

  it('throws ApiError on non-ok response', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found', code: 'NOT_FOUND' }),
    });

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);
  });

  it('returns undefined for 204 responses', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch('/test');
    expect(result).toBeUndefined();
  });
});
