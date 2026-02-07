import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@fluxmaster/core';
import type { EventOfType } from '@fluxmaster/core';
import { AgentManager } from '../agent-manager.js';

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

const mockToolRegistry = {
  register: vi.fn(),
  get: vi.fn(),
  list: vi.fn().mockReturnValue([]),
  getForNames: vi.fn().mockReturnValue([]),
  has: vi.fn(),
  toAnthropicFormat: vi.fn().mockReturnValue([]),
  toOpenAIFormat: vi.fn().mockReturnValue([]),
};

describe('AgentManager event bus integration', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();
  });

  it('emits agent:spawned when an agent is created', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any, { eventBus });
    const events: EventOfType<'agent:spawned'>[] = [];
    eventBus.on('agent:spawned', (e) => events.push(e));

    await manager.spawnAgent({ id: 'test', model: 'claude-sonnet-4', tools: [] });

    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe('test');
    expect(events[0].model).toBe('claude-sonnet-4');
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('emits agent:killed when an agent is terminated', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any, { eventBus });
    await manager.spawnAgent({ id: 'kill-me', model: 'gpt-4o', tools: [] });

    const events: EventOfType<'agent:killed'>[] = [];
    eventBus.on('agent:killed', (e) => events.push(e));

    manager.killAgent('kill-me');

    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe('kill-me');
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('emits agent:killed for each agent on killAll', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any, { eventBus });
    await manager.spawnAgent({ id: 'a1', model: 'gpt-4o', tools: [] });
    await manager.spawnAgent({ id: 'a2', model: 'gpt-4o', tools: [] });

    const events: EventOfType<'agent:killed'>[] = [];
    eventBus.on('agent:killed', (e) => events.push(e));

    manager.killAll();

    expect(events).toHaveLength(2);
    const ids = events.map((e) => e.agentId).sort();
    expect(ids).toEqual(['a1', 'a2']);
  });

  it('does not crash when no eventBus is provided (backward compat)', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any);
    const worker = await manager.spawnAgent({ id: 'compat', model: 'claude-sonnet-4', tools: [] });
    expect(worker).toBeDefined();

    manager.killAgent('compat');
    expect(manager.getAgent('compat')).toBeUndefined();
  });

  it('emits events with correct timestamps', async () => {
    const manager = new AgentManager(mockAuthManager as any, mockToolRegistry as any, { eventBus });
    const before = new Date();

    const spawned: EventOfType<'agent:spawned'>[] = [];
    eventBus.on('agent:spawned', (e) => spawned.push(e));

    await manager.spawnAgent({ id: 'ts-test', model: 'gpt-4o', tools: [] });
    const after = new Date();

    expect(spawned[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(spawned[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
