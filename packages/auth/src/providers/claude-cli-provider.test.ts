import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../token-detectors/claude-token-detector.js', () => ({
  detectClaudeToken: vi.fn(),
}));

import { ClaudeCliProvider } from './claude-cli-provider.js';
import { detectClaudeToken } from '../token-detectors/claude-token-detector.js';

const mockDetect = vi.mocked(detectClaudeToken);

describe('ClaudeCliProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('name is claude-cli', () => {
    const provider = new ClaudeCliProvider();
    expect(provider.name).toBe('claude-cli');
  });

  it('isModelAvailable returns false before initialization', () => {
    const provider = new ClaudeCliProvider();
    expect(provider.isModelAvailable('claude-sonnet-4')).toBe(false);
  });

  it('detects token during initialization', async () => {
    mockDetect.mockResolvedValue({ token: 'sk-ant-test', source: 'claude-cli' });

    const provider = new ClaudeCliProvider();
    await provider.initialize();

    expect(provider.isModelAvailable('claude-sonnet-4')).toBe(true);
  });

  it('isModelAvailable returns true only for anthropic models', async () => {
    mockDetect.mockResolvedValue({ token: 'sk-ant-test', source: 'claude-cli' });

    const provider = new ClaudeCliProvider();
    await provider.initialize();

    expect(provider.isModelAvailable('claude-sonnet-4')).toBe(true);
    expect(provider.isModelAvailable('claude-opus-4')).toBe(true);
    expect(provider.isModelAvailable('gpt-5')).toBe(false);
    expect(provider.isModelAvailable('gemini-3-pro')).toBe(false);
  });

  it('getEndpoint returns anthropic endpoint with detected token', async () => {
    mockDetect.mockResolvedValue({ token: 'sk-ant-real', source: 'credentials-file' });

    const provider = new ClaudeCliProvider();
    await provider.initialize();

    const endpoint = await provider.getEndpoint('claude-sonnet-4');

    expect(endpoint.baseUrl).toBe('https://api.anthropic.com');
    expect(endpoint.apiKey).toBe('sk-ant-real');
    expect(endpoint.provider).toBe('anthropic');
    expect(endpoint.model).toBe('claude-sonnet-4');
  });

  it('getEndpoint throws when no token detected', async () => {
    mockDetect.mockResolvedValue(null);

    const provider = new ClaudeCliProvider();
    await provider.initialize();

    await expect(provider.getEndpoint('claude-sonnet-4')).rejects.toThrow();
  });

  it('isModelAvailable returns false when no token detected', async () => {
    mockDetect.mockResolvedValue(null);

    const provider = new ClaudeCliProvider();
    await provider.initialize();

    expect(provider.isModelAvailable('claude-sonnet-4')).toBe(false);
  });

  it('shutdown is a no-op', async () => {
    const provider = new ClaudeCliProvider();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });
});
