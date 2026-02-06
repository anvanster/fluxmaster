import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager } from './auth-manager.js';
import { ModelNotAvailableError } from '@fluxmaster/core';

// Mock child_process to prevent real process spawning
vi.mock('node:child_process', () => {
  const EventEmitter = require('node:events');
  const { Readable } = require('node:stream');
  return {
    spawn: vi.fn(() => {
      const proc = new EventEmitter();
      proc.stdout = new Readable({ read() {} });
      proc.stderr = new Readable({ read() {} });
      proc.kill = vi.fn();
      return proc;
    }),
    execFile: vi.fn(),
  };
});

// Mock gh token detector (used by CopilotAuthProvider)
vi.mock('./token-detectors/gh-token-detector.js', () => ({
  detectGhToken: vi.fn().mockResolvedValue(null),
}));

// Mock claude token detector (used by ClaudeCliProvider)
const mockDetectClaude = vi.fn().mockResolvedValue(null);
vi.mock('./token-detectors/claude-token-detector.js', () => ({
  detectClaudeToken: (...args: unknown[]) => mockDetectClaude(...args),
}));

// Mock fetch globally for copilot health checks
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('AuthManager', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    fetchMock.mockReset();
    mockDetectClaude.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('routing - preferDirectApi=false (default)', () => {
    it('routes via Copilot when proxy is running and model is available', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const manager = new AuthManager({
        copilot: { accountType: 'enterprise', port: 4141 },
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('copilot');
      expect(endpoint.baseUrl).toBe('http://localhost:4141');
      expect(endpoint.model).toBe('claude-sonnet-4');

      await manager.shutdown();
    });

    it('falls back to direct API when Copilot is not configured', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const manager = new AuthManager({
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('anthropic');
      expect(endpoint.apiKey).toBe('sk-ant-test');

      await manager.shutdown();
    });

    it('falls back to direct API when Copilot proxy fails to start', async () => {
      fetchMock.mockRejectedValue(new Error('connection refused'));
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const manager = new AuthManager({
        copilot: { accountType: 'enterprise', port: 4141, maxStartAttempts: 1 },
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('anthropic');
      expect(endpoint.apiKey).toBe('sk-ant-test');

      await manager.shutdown();
    });
  });

  describe('routing - preferDirectApi=true', () => {
    it('routes via direct API when key is available', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const manager = new AuthManager({
        preferDirectApi: true,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('anthropic');
      expect(endpoint.apiKey).toBe('sk-ant-test');

      await manager.shutdown();
    });
  });

  describe('routing - Claude CLI token', () => {
    it('routes via Claude CLI when token detected and no copilot', async () => {
      mockDetectClaude.mockResolvedValue({ token: 'sk-ant-claude', source: 'claude-cli' });

      const manager = new AuthManager({
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('anthropic');
      expect(endpoint.apiKey).toBe('sk-ant-claude');
      expect(endpoint.baseUrl).toBe('https://api.anthropic.com');

      await manager.shutdown();
    });

    it('prefers Copilot over Claude CLI when both available', async () => {
      fetchMock.mockResolvedValue({ ok: true });
      mockDetectClaude.mockResolvedValue({ token: 'sk-ant-claude', source: 'claude-cli' });

      const manager = new AuthManager({
        copilot: { accountType: 'enterprise', port: 4141 },
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('claude-sonnet-4');
      expect(endpoint.provider).toBe('copilot');

      await manager.shutdown();
    });

    it('does not use Claude CLI for non-anthropic models', async () => {
      mockDetectClaude.mockResolvedValue({ token: 'sk-ant-claude', source: 'claude-cli' });
      process.env.OPENAI_API_KEY = 'sk-openai-test';

      const manager = new AuthManager({
        preferDirectApi: false,
      });
      await manager.initialize();

      const endpoint = await manager.getEndpoint('gpt-5');
      expect(endpoint.provider).toBe('openai');

      await manager.shutdown();
    });
  });

  describe('error cases', () => {
    it('throws ModelNotAvailableError when no provider can serve model', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const manager = new AuthManager({
        preferDirectApi: false,
      });
      await manager.initialize();

      await expect(manager.getEndpoint('claude-sonnet-4'))
        .rejects.toBeInstanceOf(ModelNotAvailableError);

      await manager.shutdown();
    });
  });

  describe('getStatus', () => {
    it('reports copilot, claude CLI, and direct providers', async () => {
      fetchMock.mockResolvedValue({ ok: true });
      mockDetectClaude.mockResolvedValue({ token: 'sk-ant-claude', source: 'claude-cli' });
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const manager = new AuthManager({
        copilot: { accountType: 'enterprise', port: 4141 },
        preferDirectApi: false,
      });
      await manager.initialize();

      const status = manager.getStatus();
      expect(status.copilot).toBe(true);
      expect(status.claudeCli).toBe(true);
      expect(status.directProviders).toContain('anthropic');

      await manager.shutdown();
    });
  });
});
