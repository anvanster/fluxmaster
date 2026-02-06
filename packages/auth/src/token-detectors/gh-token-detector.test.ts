import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock child_process before importing the module
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { detectGhToken } from './gh-token-detector.js';
import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);

describe('detectGhToken', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns GH_TOKEN env var when set', async () => {
    process.env.GH_TOKEN = 'gho_test123';

    const result = await detectGhToken();

    expect(result).toEqual({ token: 'gho_test123', source: 'env-var' });
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('returns GITHUB_TOKEN env var when GH_TOKEN not set', async () => {
    process.env.GITHUB_TOKEN = 'ghp_fallback456';

    const result = await detectGhToken();

    expect(result).toEqual({ token: 'ghp_fallback456', source: 'env-var' });
  });

  it('prefers GH_TOKEN over GITHUB_TOKEN', async () => {
    process.env.GH_TOKEN = 'gho_primary';
    process.env.GITHUB_TOKEN = 'ghp_secondary';

    const result = await detectGhToken();

    expect(result).toEqual({ token: 'gho_primary', source: 'env-var' });
  });

  it('runs gh auth token when no env var set', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, 'gho_fromcli\n', '');
      return {} as any;
    });

    const result = await detectGhToken();

    expect(result).toEqual({ token: 'gho_fromcli', source: 'gh-cli' });
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'token'],
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function),
    );
  });

  it('returns null when gh command fails', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not logged in'), '', 'not logged in');
      return {} as any;
    });

    const result = await detectGhToken();

    expect(result).toBeNull();
  });

  it('returns null when gh is not installed', async () => {
    const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(err, '', '');
      return {} as any;
    });

    const result = await detectGhToken();

    expect(result).toBeNull();
  });

  it('returns null when gh returns empty output', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, '', '');
      return {} as any;
    });

    const result = await detectGhToken();

    expect(result).toBeNull();
  });
});
