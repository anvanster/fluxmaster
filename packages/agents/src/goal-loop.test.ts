import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGoalLoop } from './goal-loop.js';
import type { Persona, IAgentMemoryStore } from '@fluxmaster/core';
import { EventBus } from '@fluxmaster/core';
import type { ToolLoopResult } from './tool-loop.js';

const makeResult = (text: string): ToolLoopResult => ({
  text,
  usage: { inputTokens: 100, outputTokens: 50 },
  iterations: 1,
  allContent: [{ type: 'text', text }],
});

const testPersona: Persona = {
  identity: { name: 'TestAgent', role: 'tester' },
  soul: {
    coreTraits: ['thorough'],
    decisionFramework: 'Test everything',
    priorities: ['quality'],
  },
  autonomy: {
    canSelfAssign: false,
    maxGoalIterations: 5,
    reflectionEnabled: true,
    autoDecompose: true,
    confidenceThreshold: 0.7,
  },
};

describe('runGoalLoop', () => {
  let processFn: ReturnType<typeof vi.fn>;
  let eventBus: EventBus;

  beforeEach(() => {
    processFn = vi.fn();
    eventBus = new EventBus();
  });

  it('decomposes goal into steps', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('1. Analyze code\n2. Write tests\n3. Implement'))
      .mockResolvedValueOnce(makeResult('Analyzed. [GOAL_STEP_DONE]'))
      .mockResolvedValueOnce(makeResult('Tests written. [GOAL_STEP_DONE]'))
      .mockResolvedValueOnce(makeResult('Done. [GOAL_COMPLETE]'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Refactor auth module',
      persona: testPersona,
    });

    expect(result.steps).toEqual(['Analyze code', 'Write tests', 'Implement']);
    expect(result.status).toBe('completed');
    expect(result.iterations).toBe(3);
  });

  it('handles [GOAL_COMPLETE] marker', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('1. Just do it'))
      .mockResolvedValueOnce(makeResult('All done. [GOAL_COMPLETE]'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Simple task',
      persona: testPersona,
    });

    expect(result.status).toBe('completed');
    expect(result.iterations).toBe(1);
    expect(result.reflection).toContain('All done.');
  });

  it('handles [BLOCKED: reason] marker', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('1. Check permissions'))
      .mockResolvedValueOnce(makeResult('Cannot proceed. [BLOCKED: Missing API key]'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Deploy service',
      persona: testPersona,
    });

    expect(result.status).toBe('blocked');
    expect(result.iterations).toBe(1);
  });

  it('respects maxIterations', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('1. Step one\n2. Step two'))
      .mockResolvedValue(makeResult('Still working...'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Endless task',
      persona: testPersona,
      maxIterations: 3,
    });

    expect(result.status).toBe('max_iterations');
    expect(result.iterations).toBe(3);
    // 1 decomposition + 3 iterations = 4 total calls
    expect(processFn).toHaveBeenCalledTimes(4);
  });

  it('uses persona.autonomy.maxGoalIterations when maxIterations not provided', async () => {
    const limitedPersona: Persona = {
      ...testPersona,
      autonomy: { ...testPersona.autonomy!, maxGoalIterations: 2 },
    };

    processFn
      .mockResolvedValueOnce(makeResult('1. Step one'))
      .mockResolvedValue(makeResult('Working...'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Limited task',
      persona: limitedPersona,
    });

    expect(result.status).toBe('max_iterations');
    expect(result.iterations).toBe(2);
  });

  it('emits goal events', async () => {
    const events: string[] = [];
    eventBus.on('goal:started', () => events.push('started'));
    eventBus.on('goal:step_completed', () => events.push('step_completed'));
    eventBus.on('goal:completed', () => events.push('completed'));

    processFn
      .mockResolvedValueOnce(makeResult('1. Do it'))
      .mockResolvedValueOnce(makeResult('[GOAL_STEP_DONE]'))
      .mockResolvedValueOnce(makeResult('[GOAL_COMPLETE]'));

    await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Emit events task',
      persona: testPersona,
      eventBus,
    });

    expect(events).toEqual(['started', 'step_completed', 'completed']);
  });

  it('emits goal:blocked event', async () => {
    const events: Array<{ type: string; reason?: string }> = [];
    eventBus.on('goal:blocked', (e) => events.push({ type: 'blocked', reason: e.reason }));

    processFn
      .mockResolvedValueOnce(makeResult('1. Check access'))
      .mockResolvedValueOnce(makeResult('[BLOCKED: No permission]'));

    await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Blocked task',
      persona: testPersona,
      eventBus,
    });

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe('No permission');
  });

  it('saves goal to memory store', async () => {
    const mockStore: Partial<IAgentMemoryStore> = {
      saveGoal: vi.fn().mockReturnValue({ id: 'goal-1', createdAt: new Date() }),
      updateGoal: vi.fn(),
      recall: vi.fn().mockReturnValue([]),
    };

    processFn
      .mockResolvedValueOnce(makeResult('1. Do it'))
      .mockResolvedValueOnce(makeResult('[GOAL_COMPLETE]'));

    await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Save goal task',
      persona: testPersona,
      memoryStore: mockStore as IAgentMemoryStore,
    });

    expect(mockStore.saveGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'test-agent',
        goal: 'Save goal task',
        status: 'active',
      }),
    );
    expect(mockStore.updateGoal).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('handles fallback when no numbered steps found', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('Just do the thing directly'))
      .mockResolvedValueOnce(makeResult('[GOAL_COMPLETE]'));

    const result = await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Simple goal',
      persona: testPersona,
    });

    expect(result.steps).toEqual(['Execute the goal directly']);
    expect(result.status).toBe('completed');
  });

  it('passes system prompt to process function', async () => {
    processFn
      .mockResolvedValueOnce(makeResult('1. Step one'))
      .mockResolvedValueOnce(makeResult('[GOAL_COMPLETE]'));

    await runGoalLoop({
      process: processFn,
      agentId: 'test-agent',
      goal: 'Check prompt task',
      persona: testPersona,
    });

    // Second call (first iteration) should include system prompt
    const secondCall = processFn.mock.calls[1];
    expect(secondCall[1]).toContain('TestAgent');
    expect(secondCall[1]).toContain('Active Goal');
  });
});
