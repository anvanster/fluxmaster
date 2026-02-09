import { describe, it, expect, vi } from 'vitest';
import { createFanOutTool } from './fan-out-tool.js';
import type { AgentManager } from '../agent-manager.js';
import { EventBus } from '@fluxmaster/core';

function createMockAgentManager(responses: Record<string, string | Error>): AgentManager {
  return {
    routeMessage: vi.fn(async (agentId: string) => {
      const response = responses[agentId];
      if (response instanceof Error) throw response;
      return { text: response, usage: { inputTokens: 0, outputTokens: 0 }, iterations: 1, allContent: [] };
    }),
  } as unknown as AgentManager;
}

describe('fan_out tool', () => {
  it('has correct name and description', () => {
    const tool = createFanOutTool(createMockAgentManager({}));
    expect(tool.name).toBe('fan_out');
    expect(tool.description).toBeTruthy();
  });

  it('sends message to multiple agents in parallel', async () => {
    const manager = createMockAgentManager({
      agent1: 'response 1',
      agent2: 'response 2',
    });
    const tool = createFanOutTool(manager);

    const result = await tool.execute({
      agentIds: ['agent1', 'agent2'],
      message: 'analyze this',
    });

    const responses = JSON.parse(result.content);
    expect(responses).toHaveLength(2);
    expect(responses[0]).toEqual({ agentId: 'agent1', response: 'response 1' });
    expect(responses[1]).toEqual({ agentId: 'agent2', response: 'response 2' });
    expect(manager.routeMessage).toHaveBeenCalledTimes(2);
  });

  it('handles partial failure gracefully', async () => {
    const manager = createMockAgentManager({
      agent1: 'success',
      agent2: new Error('Agent not found'),
    });
    const tool = createFanOutTool(manager);

    const result = await tool.execute({
      agentIds: ['agent1', 'agent2'],
      message: 'test',
    });

    const responses = JSON.parse(result.content);
    expect(responses).toHaveLength(2);
    expect(responses[0]).toEqual({ agentId: 'agent1', response: 'success' });
    expect(responses[1]).toEqual({ agentId: 'agent2', error: 'Agent not found' });
  });

  it('handles all agents failing', async () => {
    const manager = createMockAgentManager({
      agent1: new Error('fail 1'),
      agent2: new Error('fail 2'),
    });
    const tool = createFanOutTool(manager);

    const result = await tool.execute({
      agentIds: ['agent1', 'agent2'],
      message: 'test',
    });

    const responses = JSON.parse(result.content);
    expect(responses.every((r: { error?: string }) => r.error)).toBe(true);
  });

  it('emits fanout_started and fanout_completed events', async () => {
    const manager = createMockAgentManager({
      agent1: 'response 1',
      agent2: 'response 2',
    });
    const eventBus = new EventBus();
    const started = vi.fn();
    const completed = vi.fn();
    eventBus.on('orchestration:fanout_started', started);
    eventBus.on('orchestration:fanout_completed', completed);

    const tool = createFanOutTool(manager, { eventBus });
    await tool.execute({ agentIds: ['agent1', 'agent2'], message: 'analyze' });

    expect(started).toHaveBeenCalledOnce();
    expect(started.mock.calls[0][0]).toMatchObject({
      type: 'orchestration:fanout_started',
      targetAgentIds: ['agent1', 'agent2'],
    });

    expect(completed).toHaveBeenCalledOnce();
    expect(completed.mock.calls[0][0]).toMatchObject({
      type: 'orchestration:fanout_completed',
      targetAgentIds: ['agent1', 'agent2'],
      results: [
        { agentId: 'agent1', success: true },
        { agentId: 'agent2', success: true },
      ],
    });
    expect(completed.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('fanout_completed reports partial failures in results', async () => {
    const manager = createMockAgentManager({
      agent1: 'ok',
      agent2: new Error('fail'),
    });
    const eventBus = new EventBus();
    const completed = vi.fn();
    eventBus.on('orchestration:fanout_completed', completed);

    const tool = createFanOutTool(manager, { eventBus });
    await tool.execute({ agentIds: ['agent1', 'agent2'], message: 'test' });

    expect(completed.mock.calls[0][0].results).toEqual([
      { agentId: 'agent1', success: true },
      { agentId: 'agent2', success: false },
    ]);
  });

  it('does not throw when eventBus is not provided', async () => {
    const manager = createMockAgentManager({ agent1: 'ok' });
    const tool = createFanOutTool(manager);
    const result = await tool.execute({ agentIds: ['agent1'], message: 'test' });
    expect(JSON.parse(result.content)).toHaveLength(1);
  });
});
