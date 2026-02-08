import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock auth
const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxmaster/auth', () => ({
  AuthManager: vi.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    shutdown: mockShutdown,
    getStatus: vi.fn().mockReturnValue({ copilot: false, directProviders: ['anthropic'] }),
  })),
}));

// Mock agents
const mockRouteMessage = vi.fn().mockResolvedValue({
  text: 'Agent response',
  usage: { inputTokens: 100, outputTokens: 50 },
  iterations: 1,
  allContent: [],
});
const mockSpawnAgent = vi.fn().mockResolvedValue({ config: { id: 'default' }, status: 'idle' });
const mockKillAll = vi.fn();
const mockInitializeMcp = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxmaster/agents', () => ({
  AgentManager: vi.fn().mockImplementation(() => ({
    spawnAgent: mockSpawnAgent,
    routeMessage: mockRouteMessage,
    killAll: mockKillAll,
    initializeMcp: mockInitializeMcp,
    listAgents: vi.fn().mockReturnValue([]),
    getAgent: vi.fn(),
  })),
}));

vi.mock('@fluxmaster/tools', () => ({
  createDefaultRegistry: vi.fn().mockReturnValue({
    list: vi.fn().mockReturnValue([]),
    register: vi.fn(),
  }),
  McpServerManager: vi.fn().mockImplementation(() => ({
    stopAll: vi.fn().mockResolvedValue(undefined),
  })),
  PluginLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    register: vi.fn(),
    list: vi.fn().mockReturnValue([]),
    unloadAll: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('fluxmaster workflow', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-wf-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('workflow validate', () => {
    it('validates a correct YAML workflow file', async () => {
      const yaml = `
id: test-wf
name: Test Workflow
steps:
  - id: step1
    type: agent
    agentId: researcher
    message: "Hello"
`;
      await fs.writeFile(path.join(tmpDir, 'workflow.yaml'), yaml);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync(['node', 'fluxmaster', 'workflow', 'validate', path.join(tmpDir, 'workflow.yaml')]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('valid'));
      consoleSpy.mockRestore();
    });

    it('reports errors for invalid YAML workflow', async () => {
      const yaml = `
name: "Missing ID"
steps: "not-an-array"
`;
      await fs.writeFile(path.join(tmpDir, 'invalid.yaml'), yaml);

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync(['node', 'fluxmaster', 'workflow', 'validate', path.join(tmpDir, 'invalid.yaml')]);

      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
      expect(process.exitCode).toBe(1);
      errSpy.mockRestore();
      process.exitCode = undefined;
    });

    it('reports error when file does not exist', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync(['node', 'fluxmaster', 'workflow', 'validate', '/nonexistent/workflow.yaml']);

      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(process.exitCode).toBe(1);
      errSpy.mockRestore();
      process.exitCode = undefined;
    });

    it('detects duplicate step IDs', async () => {
      const yaml = `
id: dup-wf
name: Duplicate Steps
steps:
  - id: step1
    type: agent
    agentId: a1
    message: "First"
  - id: step1
    type: agent
    agentId: a2
    message: "Duplicate"
`;
      await fs.writeFile(path.join(tmpDir, 'dup.yaml'), yaml);

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync(['node', 'fluxmaster', 'workflow', 'validate', path.join(tmpDir, 'dup.yaml')]);

      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate step ID'));
      expect(process.exitCode).toBe(1);
      errSpy.mockRestore();
      process.exitCode = undefined;
    });
  });

  describe('workflow run', () => {
    it('runs a workflow file with agent steps', async () => {
      const config = {
        auth: { preferDirectApi: true },
        agents: {
          defaults: { maxTokens: 4096, temperature: 0.7 },
          list: [{ id: 'researcher', model: 'gpt-4o', tools: [] }],
        },
        mcpServers: { global: [] },
        plugins: [],
      };
      await fs.writeFile(
        path.join(tmpDir, 'fluxmaster.config.json'),
        JSON.stringify(config, null, 2),
      );

      const yaml = `
id: run-wf
name: Run Test
steps:
  - id: research
    type: agent
    agentId: researcher
    message: "Research AI"
`;
      await fs.writeFile(path.join(tmpDir, 'workflow.yaml'), yaml);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync([
        'node', 'fluxmaster', 'workflow', 'run',
        path.join(tmpDir, 'workflow.yaml'),
      ]);

      expect(mockInitialize).toHaveBeenCalled();
      expect(mockSpawnAgent).toHaveBeenCalled();
      expect(mockRouteMessage).toHaveBeenCalledWith('researcher', 'Research AI');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('completed'));
      expect(mockShutdown).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('passes --input key=value pairs to workflow', async () => {
      const config = {
        auth: { preferDirectApi: true },
        agents: {
          defaults: { maxTokens: 4096, temperature: 0.7 },
          list: [{ id: 'writer', model: 'gpt-4o', tools: [] }],
        },
        mcpServers: { global: [] },
        plugins: [],
      };
      await fs.writeFile(
        path.join(tmpDir, 'fluxmaster.config.json'),
        JSON.stringify(config, null, 2),
      );

      const yaml = `
id: input-wf
name: Input Test
inputs:
  topic:
    type: string
    description: "Topic to write about"
steps:
  - id: write
    type: agent
    agentId: writer
    message: "Write about \${topic}"
`;
      await fs.writeFile(path.join(tmpDir, 'input-wf.yaml'), yaml);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { createApp } = await import('../app.js');
      const app = createApp();
      await app.parseAsync([
        'node', 'fluxmaster', 'workflow', 'run',
        path.join(tmpDir, 'input-wf.yaml'),
        '--input', 'topic=AI Safety',
      ]);

      expect(mockRouteMessage).toHaveBeenCalledWith('writer', 'Write about AI Safety');
      consoleSpy.mockRestore();
    });
  });
});
