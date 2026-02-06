import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateDefaultConfig } from '@fluxmaster/core';

// Mock readline/promises at module level (ESM-compatible)
const mockQuestion = vi.fn();
const mockClose = vi.fn();
vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

// Mock the auth and agents packages
const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockGetEndpoint = vi.fn().mockResolvedValue({
  baseUrl: 'http://localhost:4141',
  apiKey: 'test-key',
  provider: 'anthropic',
  model: 'claude-sonnet-4',
});
const mockShutdown = vi.fn().mockResolvedValue(undefined);
const mockGetStatus = vi.fn().mockReturnValue({ copilot: false, directProviders: ['anthropic'] });

vi.mock('@fluxmaster/auth', () => ({
  AuthManager: vi.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    getEndpoint: mockGetEndpoint,
    shutdown: mockShutdown,
    getStatus: mockGetStatus,
  })),
}));

const mockProcess = vi.fn().mockResolvedValue({
  text: 'Hello! How can I help?',
  usage: { inputTokens: 100, outputTokens: 50 },
  iterations: 1,
  allContent: [],
});
const mockClearHistory = vi.fn();
const mockTerminate = vi.fn();
const mockSpawnAgent = vi.fn().mockResolvedValue({
  config: { id: 'default', model: 'claude-sonnet-4', tools: [] },
  status: 'idle',
  process: mockProcess,
  clearHistory: mockClearHistory,
  terminate: mockTerminate,
});
const mockRouteMessage = vi.fn().mockResolvedValue({
  text: 'Hello! How can I help?',
  usage: { inputTokens: 100, outputTokens: 50 },
  iterations: 1,
  allContent: [],
});
const mockKillAll = vi.fn();
const mockKillAgent = vi.fn();
const mockGetAgent = vi.fn().mockReturnValue({
  clearHistory: mockClearHistory,
});
const mockListAgents = vi.fn().mockReturnValue([
  { id: 'default', model: 'claude-sonnet-4', status: 'idle' },
]);

const mockInitializeMcp = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxmaster/agents', () => ({
  AgentManager: vi.fn().mockImplementation(() => ({
    spawnAgent: mockSpawnAgent,
    routeMessage: mockRouteMessage,
    killAll: mockKillAll,
    killAgent: mockKillAgent,
    getAgent: mockGetAgent,
    listAgents: mockListAgents,
    initializeMcp: mockInitializeMcp,
  })),
}));

vi.mock('@fluxmaster/tools', () => ({
  createDefaultRegistry: vi.fn().mockReturnValue({
    list: vi.fn().mockReturnValue([
      { name: 'read_file', description: 'Read a file' },
      { name: 'write_file', description: 'Write a file' },
    ]),
    toAnthropicFormat: vi.fn().mockReturnValue([]),
    toOpenAIFormat: vi.fn().mockReturnValue([]),
  }),
  McpServerManager: vi.fn().mockImplementation(() => ({
    startServer: vi.fn().mockResolvedValue([]),
    stopServer: vi.fn().mockResolvedValue(undefined),
    stopAll: vi.fn().mockResolvedValue(undefined),
    getToolsForServer: vi.fn().mockReturnValue([]),
  })),
}));

describe('fluxmaster run', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-run-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('requires a config file', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createApp } = await import('../app.js');
    const app = createApp();

    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('config')
    );
    consoleSpy.mockRestore();
  });

  it('starts interactive REPL and handles /exit', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('hello')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    // Agent should have been spawned
    expect(mockSpawnAgent).toHaveBeenCalled();
    // First message should be routed to agent
    expect(mockRouteMessage).toHaveBeenCalledWith('default', 'hello');
    // Readline should be closed
    expect(mockClose).toHaveBeenCalled();
    // Auth should be shut down
    expect(mockShutdown).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles /clear command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('/clear')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(mockGetAgent).toHaveBeenCalledWith('default');
    expect(mockClearHistory).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('History cleared.');
    consoleSpy.mockRestore();
  });

  it('handles /tools command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('/tools')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(consoleSpy).toHaveBeenCalledWith('Available tools:');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('read_file'));
    consoleSpy.mockRestore();
  });

  it('handles /usage command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('hello')
      .mockResolvedValueOnce('/usage')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(consoleSpy).toHaveBeenCalledWith('Token usage:');
    expect(consoleSpy).toHaveBeenCalledWith('  Input:  100');
    expect(consoleSpy).toHaveBeenCalledWith('  Output: 50');
    consoleSpy.mockRestore();
  });

  it('handles /agents command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('/agents')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(mockListAgents).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Active agents:');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('default')
    );
    consoleSpy.mockRestore();
  });

  it('handles /agent spawn command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('/agent spawn researcher gpt-5')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    // spawnAgent called twice: once for default, once for researcher
    expect(mockSpawnAgent).toHaveBeenCalledTimes(2);
    expect(mockSpawnAgent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'researcher', model: 'gpt-5' })
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('researcher')
    );
    consoleSpy.mockRestore();
  });

  it('handles /agent switch command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockGetAgent.mockImplementation((id: string) => {
      if (id === 'default' || id === 'researcher') {
        return { clearHistory: mockClearHistory };
      }
      return undefined;
    });

    mockQuestion
      .mockResolvedValueOnce('/agent switch researcher')
      .mockResolvedValueOnce('hello after switch')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(consoleSpy).toHaveBeenCalledWith('Switched to agent "researcher".');
    // Message after switch routes to researcher
    expect(mockRouteMessage).toHaveBeenCalledWith('researcher', 'hello after switch');
    consoleSpy.mockRestore();
  });

  it('handles /agent kill command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockQuestion
      .mockResolvedValueOnce('/agent kill default')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    expect(mockKillAgent).toHaveBeenCalledWith('default');
    expect(consoleSpy).toHaveBeenCalledWith('Agent "default" killed.');
    consoleSpy.mockRestore();
  });

  it('handles /broadcast command', async () => {
    const config = generateDefaultConfig();
    await fs.writeFile(
      path.join(tmpDir, 'fluxmaster.config.json'),
      JSON.stringify(config, null, 2),
    );

    mockListAgents.mockReturnValue([
      { id: 'default', model: 'claude-sonnet-4', status: 'idle' },
      { id: 'researcher', model: 'gpt-5', status: 'idle' },
    ]);

    mockQuestion
      .mockResolvedValueOnce('/broadcast summarize this')
      .mockResolvedValueOnce('/exit');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { createApp } = await import('../app.js');
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'run']);

    // Should route to both agents
    expect(mockRouteMessage).toHaveBeenCalledWith('default', 'summarize this');
    expect(mockRouteMessage).toHaveBeenCalledWith('researcher', 'summarize this');
    consoleSpy.mockRestore();
  });
});
