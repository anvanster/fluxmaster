import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxmaster/core', async () => {
  const actual = await vi.importActual<typeof import('@fluxmaster/core')>('@fluxmaster/core');
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({
      auth: { copilot: { accountType: 'individual', port: 4141 }, preferDirectApi: false },
      agents: { defaults: { maxTokens: 8192, temperature: 0.7 }, list: [] },
      mcpServers: { global: [] },
      plugins: [],
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      pricing: { 'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 } },
    }),
  };
});

vi.mock('@fluxmaster/auth', () => ({
  AuthManager: vi.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    shutdown: mockShutdown,
  })),
}));

const mockInitializeMcp = vi.fn().mockResolvedValue(undefined);
const mockKillAll = vi.fn();

vi.mock('@fluxmaster/agents', () => ({
  AgentManager: vi.fn().mockImplementation(() => ({
    initializeMcp: mockInitializeMcp,
    killAll: mockKillAll,
  })),
}));

const mockStopAll = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxmaster/tools', () => ({
  createDefaultRegistry: vi.fn().mockReturnValue({
    list: vi.fn().mockReturnValue([]),
    register: vi.fn(),
  }),
  McpServerManager: vi.fn().mockImplementation(() => ({
    startServer: vi.fn().mockResolvedValue([]),
    stopAll: mockStopAll,
  })),
  BrowserManager: vi.fn(),
  createBrowserTools: vi.fn().mockReturnValue([]),
  PluginLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({ name: 'test', version: '1.0.0', tools: [] }),
    register: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockReturnValue([]),
    unloadAll: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { bootstrap, shutdown } from './bootstrap.js';

describe('bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes all managers and returns AppContext', async () => {
    const ctx = await bootstrap({ configPath: 'fluxmaster.config.json' });

    expect(ctx.config).toBeDefined();
    expect(ctx.authManager).toBeDefined();
    expect(ctx.agentManager).toBeDefined();
    expect(ctx.toolRegistry).toBeDefined();
    expect(ctx.mcpServerManager).toBeDefined();
    expect(ctx.usageTracker).toBeDefined();
    expect(ctx.eventBus).toBeDefined();
    expect(ctx.costCalculator).toBeDefined();

    expect(mockInitialize).toHaveBeenCalledOnce();
    expect(mockInitializeMcp).toHaveBeenCalledOnce();
  });

  it('returns a functional UsageTracker', async () => {
    const ctx = await bootstrap({ configPath: 'fluxmaster.config.json' });

    ctx.usageTracker.record('test', 100, 50);
    expect(ctx.usageTracker.getAgent('test').inputTokens).toBe(100);
  });
});

describe('shutdown', () => {
  it('shuts down all managers in correct order', async () => {
    const ctx = await bootstrap({ configPath: 'fluxmaster.config.json' });
    vi.clearAllMocks();

    await shutdown(ctx);

    expect(mockKillAll).toHaveBeenCalledOnce();
    expect(mockStopAll).toHaveBeenCalledOnce();
    expect(mockShutdown).toHaveBeenCalledOnce();
  });
});
