import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CopilotAuthProvider } from './copilot-provider.js';
import { AuthError } from '@fluxmaster/core';

// Mock child_process
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

// Mock gh token detector
const mockDetectGhToken = vi.fn().mockResolvedValue(null);
vi.mock('../token-detectors/gh-token-detector.js', () => ({
  detectGhToken: (...args: unknown[]) => mockDetectGhToken(...args),
}));

describe('CopilotAuthProvider', () => {
  let provider: CopilotAuthProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectGhToken.mockResolvedValue(null);
    provider = new CopilotAuthProvider({
      accountType: 'enterprise',
      port: 4141,
    });
  });

  describe('isModelAvailable', () => {
    it('returns true for known Copilot models', () => {
      expect(provider.isModelAvailable('claude-sonnet-4')).toBe(true);
      expect(provider.isModelAvailable('gpt-5')).toBe(true);
    });

    it('returns false for unknown models', () => {
      expect(provider.isModelAvailable('llama-3')).toBe(false);
    });
  });

  describe('getEndpoint', () => {
    it('throws AuthError when not initialized', async () => {
      await expect(provider.getEndpoint()).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe('isReady', () => {
    it('returns false before initialization', () => {
      expect(provider.isReady()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('marks as ready if proxy already running', async () => {
      // Mock fetch to simulate healthy proxy
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      await provider.initialize();
      expect(provider.isReady()).toBe(true);

      vi.unstubAllGlobals();
    });

    it('returns copilot endpoint when ready', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      await provider.initialize();
      const endpoint = await provider.getEndpoint();
      expect(endpoint.baseUrl).toBe('http://localhost:4141');
      expect(endpoint.apiKey).toBe('dummy');
      expect(endpoint.provider).toBe('copilot');

      vi.unstubAllGlobals();
    });
  });

  describe('shutdown', () => {
    it('kills the process and marks as not ready', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      await provider.initialize();
      expect(provider.isReady()).toBe(true);

      await provider.shutdown();
      expect(provider.isReady()).toBe(false);

      vi.unstubAllGlobals();
    });
  });

  describe('name', () => {
    it('returns copilot', () => {
      expect(provider.name).toBe('copilot');
    });
  });

  describe('gh token auto-detection', () => {
    it('auto-detects gh token when not configured', async () => {
      mockDetectGhToken.mockResolvedValue({ token: 'gho_auto', source: 'gh-cli' });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const p = new CopilotAuthProvider({ accountType: 'enterprise', port: 4141 });
      await p.initialize();

      expect(mockDetectGhToken).toHaveBeenCalled();
      expect(p.isReady()).toBe(true);
      vi.unstubAllGlobals();
    });

    it('skips detection when githubToken is explicitly set', async () => {
      mockDetectGhToken.mockResolvedValue({ token: 'gho_auto', source: 'gh-cli' });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const p = new CopilotAuthProvider({
        accountType: 'enterprise',
        port: 4141,
        githubToken: 'gho_explicit',
      });
      await p.initialize();

      expect(mockDetectGhToken).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});
