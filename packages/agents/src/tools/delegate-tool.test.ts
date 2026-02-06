import { describe, it, expect, vi } from 'vitest';
import { createDelegateTool } from './delegate-tool.js';
import type { AgentManager } from '../agent-manager.js';

function createMockAgentManager(overrides: Partial<AgentManager> = {}): AgentManager {
  return {
    routeMessage: vi.fn().mockResolvedValue({
      text: 'Response from target agent',
      usage: { inputTokens: 10, outputTokens: 20 },
      iterations: 1,
      allContent: [],
    }),
    getAgent: vi.fn().mockReturnValue({}),
    listAgents: vi.fn().mockReturnValue([]),
    spawnAgent: vi.fn(),
    killAgent: vi.fn(),
    killAll: vi.fn(),
    ...overrides,
  } as unknown as AgentManager;
}

describe('createDelegateTool', () => {
  it('returns a Tool with correct name and description', () => {
    const manager = createMockAgentManager();
    const tool = createDelegateTool(manager);

    expect(tool.name).toBe('delegate_to_agent');
    expect(tool.description).toContain('Send a message to another agent');
  });

  it('routes message to target agent and returns response', async () => {
    const manager = createMockAgentManager();
    const tool = createDelegateTool(manager);

    const result = await tool.execute({ agentId: 'researcher', message: 'Find info about X' });

    expect(manager.routeMessage).toHaveBeenCalledWith('researcher', 'Find info about X');
    expect(result.content).toBe('Response from target agent');
    expect(result.isError).toBeUndefined();
  });

  it('returns error when target agent does not exist', async () => {
    const manager = createMockAgentManager({
      routeMessage: vi.fn().mockRejectedValue(new Error('Agent not found: unknown')),
    });
    const tool = createDelegateTool(manager);

    const result = await tool.execute({ agentId: 'unknown', message: 'hello' });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Agent not found');
  });

  it('validates input schema requires agentId and message', async () => {
    const manager = createMockAgentManager();
    const tool = createDelegateTool(manager);

    const parseResult = tool.inputSchema.safeParse({ agentId: 'a1', message: 'hi' });
    expect(parseResult.success).toBe(true);

    const badResult = tool.inputSchema.safeParse({ agentId: 'a1' });
    expect(badResult.success).toBe(false);
  });
});
