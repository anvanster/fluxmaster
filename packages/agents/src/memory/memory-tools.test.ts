import { describe, it, expect, vi } from 'vitest';
import { createMemoryTools } from './memory-tools.js';
import type { IAgentMemoryStore, AgentDecision, AgentLearning } from '@fluxmaster/core';

function createMockStore(): IAgentMemoryStore {
  return {
    saveDecision: vi.fn().mockImplementation((d) => ({ id: 'dec-1', createdAt: new Date(), ...d })),
    saveLearning: vi.fn().mockImplementation((l) => ({ id: 'lrn-1', createdAt: new Date(), ...l })),
    recall: vi.fn().mockReturnValue([]),
    getDecisions: vi.fn().mockReturnValue([]),
    getLearnings: vi.fn().mockReturnValue([]),
    saveGoal: vi.fn(),
    updateGoal: vi.fn(),
    getActiveGoal: vi.fn(),
    getGoalHistory: vi.fn(),
  };
}

describe('memory tools', () => {
  it('creates three tools', () => {
    const store = createMockStore();
    const tools = createMemoryTools(store, 'agent-1');
    expect(tools).toHaveLength(3);
    expect(tools.map(t => t.name)).toEqual([
      'memory_save_decision',
      'memory_save_learning',
      'memory_recall',
    ]);
  });

  describe('memory_save_decision', () => {
    it('saves a decision and returns confirmation', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'coordinator');
      const tool = tools[0];

      const result = await tool.execute({
        decision: 'Delegate auth to coder',
        reasoning: 'Coder has file tools',
        confidence: 0.9,
        context: 'auth refactoring',
      });

      expect(store.saveDecision).toHaveBeenCalledWith({
        agentId: 'coordinator',
        decision: 'Delegate auth to coder',
        reasoning: 'Coder has file tools',
        confidence: 0.9,
        context: 'auth refactoring',
      });
      expect(result.content).toContain('Decision saved');
      expect(result.content).toContain('Delegate auth to coder');
    });

    it('uses default confidence', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'agent-1');
      await tools[0].execute({ decision: 'Test', reasoning: 'Because' });

      expect(store.saveDecision).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.7 }),
      );
    });

    it('rejects invalid input', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'agent-1');
      await expect(tools[0].execute({ decision: '' })).rejects.toThrow();
    });
  });

  describe('memory_save_learning', () => {
    it('saves a learning and returns confirmation', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'coordinator');
      const tool = tools[1];

      const result = await tool.execute({
        type: 'pattern',
        content: 'Researcher is slow on large repos',
        source: 'code review task',
        confidence: 0.8,
      });

      expect(store.saveLearning).toHaveBeenCalledWith({
        agentId: 'coordinator',
        type: 'pattern',
        content: 'Researcher is slow on large repos',
        source: 'code review task',
        confidence: 0.8,
      });
      expect(result.content).toContain('Learning saved');
      expect(result.content).toContain('pattern');
    });

    it('rejects invalid type', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'agent-1');
      await expect(tools[1].execute({ type: 'invalid', content: 'x', source: 'y' })).rejects.toThrow();
    });
  });

  describe('memory_recall', () => {
    it('returns formatted results when memories found', async () => {
      const store = createMockStore();
      const mockDecision: AgentDecision = {
        id: 'dec-1', agentId: 'coordinator', decision: 'Use coder for auth',
        reasoning: 'Has file tools', confidence: 0.9, createdAt: new Date(),
      };
      const mockLearning: AgentLearning = {
        id: 'lrn-1', agentId: 'coordinator', type: 'pattern',
        content: 'Auth module is complex', source: 'review', confidence: 0.7, createdAt: new Date(),
      };
      vi.mocked(store.recall).mockReturnValue([mockDecision, mockLearning]);

      const tools = createMemoryTools(store, 'coordinator');
      const result = await tools[2].execute({ query: 'auth' });

      expect(store.recall).toHaveBeenCalledWith('coordinator', 'auth', 10);
      expect(result.content).toContain('2 relevant memories');
      expect(result.content).toContain('Use coder for auth');
      expect(result.content).toContain('Auth module is complex');
    });

    it('returns empty message when no memories found', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'agent-1');
      const result = await tools[2].execute({ query: 'nonexistent' });

      expect(result.content).toContain('No memories found');
    });

    it('passes limit to store', async () => {
      const store = createMockStore();
      const tools = createMemoryTools(store, 'agent-1');
      await tools[2].execute({ query: 'test', limit: 5 });

      expect(store.recall).toHaveBeenCalledWith('agent-1', 'test', 5);
    });
  });
});
