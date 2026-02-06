import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

import { detectClaudeToken } from './claude-token-detector.js';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const mockExecFile = vi.mocked(execFile);
const mockReadFile = vi.mocked(readFile);

describe('detectClaudeToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token from claude CLI command when available', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, JSON.stringify({ apiKey: 'sk-ant-cli123' }), '');
      return {} as any;
    });

    const result = await detectClaudeToken();

    expect(result).toEqual({ token: 'sk-ant-cli123', source: 'claude-cli' });
  });

  it('falls back to credentials file when CLI fails', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    const credentials = {
      claudeAiOauth: {
        accessToken: 'sk-ant-file456',
        refreshToken: 'rt_xxx',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(credentials));

    const result = await detectClaudeToken();

    expect(result).toEqual({ token: 'sk-ant-file456', source: 'credentials-file' });
    expect(mockReadFile).toHaveBeenCalledWith(
      '/home/testuser/.claude/.credentials.json',
      'utf-8',
    );
  });

  it('returns null when token in credentials file is expired', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    const credentials = {
      claudeAiOauth: {
        accessToken: 'sk-ant-expired',
        refreshToken: 'rt_xxx',
        expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(credentials));

    const result = await detectClaudeToken();

    expect(result).toBeNull();
  });

  it('returns null when credentials file does not exist', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await detectClaudeToken();

    expect(result).toBeNull();
  });

  it('returns null when credentials file has invalid JSON', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    mockReadFile.mockResolvedValue('not json');

    const result = await detectClaudeToken();

    expect(result).toBeNull();
  });

  it('returns null when credentials file is missing accessToken', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    mockReadFile.mockResolvedValue(JSON.stringify({ claudeAiOauth: {} }));

    const result = await detectClaudeToken();

    expect(result).toBeNull();
  });

  it('does not read credentials file when CLI succeeds', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, JSON.stringify({ apiKey: 'sk-ant-cli' }), '');
      return {} as any;
    });

    await detectClaudeToken();

    expect(mockReadFile).not.toHaveBeenCalled();
  });
});
