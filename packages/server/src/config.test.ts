import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveServerConfig, defaultServerConfig } from './config.js';

describe('resolveServerConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv('PORT', '');
    vi.stubEnv('HOST', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns defaults when no overrides or env vars', () => {
    const config = resolveServerConfig();
    expect(config).toEqual(defaultServerConfig);
  });

  it('applies explicit overrides', () => {
    const config = resolveServerConfig({ port: 8080, host: 'localhost' });
    expect(config.port).toBe(8080);
    expect(config.host).toBe('localhost');
  });

  it('reads PORT from environment', () => {
    vi.stubEnv('PORT', '9090');
    const config = resolveServerConfig();
    expect(config.port).toBe(9090);
  });

  it('reads HOST from environment', () => {
    vi.stubEnv('HOST', '127.0.0.1');
    const config = resolveServerConfig();
    expect(config.host).toBe('127.0.0.1');
  });

  it('explicit overrides take precedence over env vars', () => {
    vi.stubEnv('PORT', '9090');
    const config = resolveServerConfig({ port: 4000 });
    expect(config.port).toBe(4000);
  });
});
