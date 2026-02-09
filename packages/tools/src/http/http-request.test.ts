import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpRequestTool } from './http-request.js';

describe('http_request tool', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('has correct name and description', () => {
    expect(httpRequestTool.name).toBe('http_request');
    expect(httpRequestTool.description).toBeTruthy();
  });

  it('makes GET request and returns response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{"data":"test"}'),
    });

    const result = await httpRequestTool.execute({ url: 'https://example.com/api' });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content);
    expect(parsed.status).toBe(200);
    expect(parsed.body).toBe('{"data":"test"}');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('makes POST request with body and headers', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 201,
      headers: new Headers(),
      text: () => Promise.resolve('created'),
    });

    const result = await httpRequestTool.execute({
      url: 'https://example.com/api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"test"}',
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content);
    expect(parsed.status).toBe(201);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ method: 'POST', body: '{"name":"test"}' }),
    );
  });

  it('handles network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const result = await httpRequestTool.execute({ url: 'https://example.com/api' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Network failure');
  });

  it('handles timeout via AbortError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    const result = await httpRequestTool.execute({ url: 'https://example.com/api', timeout: 100 });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('timed out');
  });

  it('returns response headers', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'x-custom': 'value' }),
      text: () => Promise.resolve('ok'),
    });

    const result = await httpRequestTool.execute({ url: 'https://example.com/api' });
    const parsed = JSON.parse(result.content);
    expect(parsed.headers['x-custom']).toBe('value');
  });
});
