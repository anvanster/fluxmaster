import { describe, it, expect, vi } from 'vitest';
import { AgentNotFoundError } from '@fluxmaster/core';
import { AgentManager } from './agent-manager.js';

// Mock AuthManager
const mockAuthManager = {
  getEndpoint: vi.fn().mockResolvedValue({
    model: 'claude-sonnet-4',
    baseUrl: 'http://localhost:4141',
    apiKey: 'dummy',
    provider: 'copilot',
  }),
  initialize: vi.fn(),
  shutdown: vi.fn(),
  getStatus: vi.fn(),
};

// Mock ToolRegistry
const mockToolRegistry = {
  register: vi.fn(),
  get: vi.fn(),
  list: vi.fn().mockReturnValue([]),
  getForNames: vi.fn().mockReturnValue([]),
  has: vi.fn(),
  toAnthropicFormat: vi.fn().mockReturnValue([]),
  toOpenAIFormat: vi.fn().mockReturnValue([]),
};

describe('AgentManager', () => {
  it('spawnAgent creates worker and stores it', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    const worker = await manager.spawnAgent({
      id: 'test-agent',
      model: 'claude-sonnet-4',
      tools: [],
    });

    expect(worker).toBeDefined();
    expect(worker.config.id).toBe('test-agent');
    expect(manager.getAgent('test-agent')).toBe(worker);
  });

  it('spawnAgent throws for duplicate agent ID', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    await manager.spawnAgent({ id: 'dup', model: 'claude-sonnet-4', tools: [] });

    await expect(manager.spawnAgent({ id: 'dup', model: 'claude-sonnet-4', tools: [] }))
      .rejects.toThrow('Agent already exists');
  });

  it('killAgent terminates and removes worker', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    await manager.spawnAgent({ id: 'to-kill', model: 'claude-sonnet-4', tools: [] });

    manager.killAgent('to-kill');
    expect(manager.getAgent('to-kill')).toBeUndefined();
  });

  it('killAgent throws for unknown agent', () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    expect(() => manager.killAgent('nonexistent')).toThrow(AgentNotFoundError);
  });

  it('listAgents returns all active agents', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    await manager.spawnAgent({ id: 'a1', model: 'claude-sonnet-4', tools: [] });
    await manager.spawnAgent({ id: 'a2', model: 'gpt-5', tools: [] });

    const agents = manager.listAgents();
    expect(agents).toHaveLength(2);
    expect(agents.map(a => a.id)).toContain('a1');
    expect(agents.map(a => a.id)).toContain('a2');
  });

  it('routeMessage throws for unknown agent', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    await expect(manager.routeMessage('nonexistent', 'hello'))
      .rejects.toThrow(AgentNotFoundError);
  });
});
