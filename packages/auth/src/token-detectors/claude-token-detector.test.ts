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
    // Default: credentials file not found, CLI not installed
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });
  });

  it('returns token from credentials file when available', async () => {
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

  it('returns null when token in credentials file is expired and CLI not available', async () => {
    const credentials = {
      claudeAiOauth: {
        accessToken: 'sk-ant-expired',
        refreshToken: 'rt_xxx',
        expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(credentials));
    // CLI not installed (default from beforeEach)

    const result = await detectClaudeToken();

    // Expired cred file returns null → falls through to CLI → CLI fails → null
    expect(result).toBeNull();
  });

  it('falls back to CLI detection when credentials file not found', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    // CLI is installed
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, '2.1.34 (Claude Code)', '');
      return {} as any;
    });

    const result = await detectClaudeToken();

    expect(result).toEqual({ token: '__claude_cli__', source: 'claude-cli' });
  });

  it('returns null when neither credentials file nor CLI available', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    const result = await detectClaudeToken();

    expect(result).toBeNull();
  });

  it('returns null when credentials file has invalid JSON', async () => {
    mockReadFile.mockResolvedValue('not json');

    const result = await detectClaudeToken();

    // Invalid JSON throws → falls through to CLI check → CLI not installed → null
    expect(result).toBeNull();
  });

  it('returns null when credentials file is missing accessToken', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ claudeAiOauth: {} }));

    const result = await detectClaudeToken();

    // No token in file → falls through to CLI check → CLI not installed → null
    expect(result).toBeNull();
  });

  it('prefers credentials file over CLI detection', async () => {
    const credentials = {
      claudeAiOauth: {
        accessToken: 'sk-ant-file',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(credentials));
    // CLI is also installed
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, '2.1.34', '');
      return {} as any;
    });

    const result = await detectClaudeToken();

    expect(result).toEqual({ token: 'sk-ant-file', source: 'credentials-file' });
    // CLI check should not be called since credentials file succeeded
    expect(mockExecFile).not.toHaveBeenCalled();
  });
});
