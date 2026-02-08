import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, type WorkflowDefinition, type IWorkflowStore } from '@fluxmaster/core';
import { WorkflowEngine } from './workflow-engine.js';

function makeMockAgentManager() {
  return {
    routeMessage: vi.fn().mockResolvedValue({
      text: 'Agent response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      allContent: [],
    }),
  };
}

function makeMockWorkflowStore(): IWorkflowStore {
  const definitions = new Map<string, WorkflowDefinition>();
  const runs = new Map<string, any>();
  return {
    saveDefinition: vi.fn((d: WorkflowDefinition) => definitions.set(d.id, d)),
    getDefinition: vi.fn((id: string) => definitions.get(id)),
    listDefinitions: vi.fn(() => Array.from(definitions.values())),
    deleteDefinition: vi.fn((id: string) => definitions.delete(id)),
    saveRun: vi.fn((run: any) => runs.set(run.id, run)),
    updateRun: vi.fn((id: string, updates: any) => {
      const existing = runs.get(id);
      if (existing) runs.set(id, { ...existing, ...updates });
    }),
    getRun: vi.fn((id: string) => runs.get(id)),
    listRuns: vi.fn(() => Array.from(runs.values())),
  };
}

describe('WorkflowEngine', () => {
  let agentManager: ReturnType<typeof makeMockAgentManager>;
  let workflowStore: IWorkflowStore;
  let eventBus: EventBus;
  let engine: WorkflowEngine;

  const simpleWorkflow: WorkflowDefinition = {
    id: 'simple-wf',
    name: 'Simple',
    inputs: {},
    steps: [
      { id: 'step1', type: 'agent' as const, agentId: 'researcher', message: 'Research AI' },
    ],
  };

  const multiStepWorkflow: WorkflowDefinition = {
    id: 'multi-wf',
    name: 'Multi Step',
    inputs: {},
    steps: [
      { id: 'step1', type: 'agent' as const, agentId: 'researcher', message: 'Research' },
      { id: 'step2', type: 'agent' as const, agentId: 'writer', message: 'Write about ${step1.output}' },
    ],
  };

  beforeEach(() => {
    agentManager = makeMockAgentManager();
    workflowStore = makeMockWorkflowStore();
    eventBus = new EventBus();
    engine = new WorkflowEngine(agentManager as any, eventBus, workflowStore);
  });

  describe('startRun', () => {
    it('executes a simple single-step workflow', async () => {
      workflowStore.saveDefinition(simpleWorkflow);

      const run = await engine.startRun('simple-wf');

      expect(run.status).toBe('completed');
      expect(run.stepResults['step1'].status).toBe('completed');
      expect(run.stepResults['step1'].output).toBe('Agent response');
      expect(agentManager.routeMessage).toHaveBeenCalledWith('researcher', 'Research AI');
    });

    it('passes step output to subsequent steps via variable resolution', async () => {
      workflowStore.saveDefinition(multiStepWorkflow);
      agentManager.routeMessage
        .mockResolvedValueOnce({ text: 'AI is cool', usage: { inputTokens: 10, outputTokens: 5 }, iterations: 1, allContent: [] })
        .mockResolvedValueOnce({ text: 'Article about AI', usage: { inputTokens: 10, outputTokens: 5 }, iterations: 1, allContent: [] });

      const run = await engine.startRun('multi-wf');

      expect(run.status).toBe('completed');
      expect(agentManager.routeMessage).toHaveBeenCalledTimes(2);
      expect(agentManager.routeMessage).toHaveBeenNthCalledWith(2, 'writer', 'Write about AI is cool');
    });

    it('resolves input variables', async () => {
      const wf: WorkflowDefinition = {
        id: 'input-wf',
        name: 'Input',
        inputs: { topic: { type: 'string' } },
        steps: [{ id: 's1', type: 'agent', agentId: 'a1', message: 'Research ${topic}' }],
      };
      workflowStore.saveDefinition(wf);

      const run = await engine.startRun('input-wf', { topic: 'quantum computing' });

      expect(agentManager.routeMessage).toHaveBeenCalledWith('a1', 'Research quantum computing');
      expect(run.status).toBe('completed');
    });

    it('executes parallel steps concurrently', async () => {
      const wf: WorkflowDefinition = {
        id: 'parallel-wf',
        name: 'Parallel',
        inputs: {},
        steps: [{
          id: 'multi',
          type: 'parallel',
          steps: [
            { id: 'a', type: 'agent', agentId: 'writer', message: 'Write' },
            { id: 'b', type: 'agent', agentId: 'critic', message: 'Critique' },
          ],
        }],
      };
      workflowStore.saveDefinition(wf);

      const run = await engine.startRun('parallel-wf');

      expect(run.status).toBe('completed');
      expect(run.stepResults['a'].status).toBe('completed');
      expect(run.stepResults['b'].status).toBe('completed');
      expect(agentManager.routeMessage).toHaveBeenCalledTimes(2);
    });

    it('executes conditional then branch when condition is truthy', async () => {
      const wf: WorkflowDefinition = {
        id: 'cond-wf',
        name: 'Conditional',
        inputs: {},
        steps: [
          { id: 'research', type: 'agent', agentId: 'r', message: 'Research' },
          {
            id: 'check',
            type: 'conditional',
            condition: 'true',
            then: [{ id: 'review', type: 'agent', agentId: 'rev', message: 'Review' }],
            else: [{ id: 'skip', type: 'agent', agentId: 'skip', message: 'Skip' }],
          },
        ],
      };
      workflowStore.saveDefinition(wf);

      const run = await engine.startRun('cond-wf');

      expect(run.status).toBe('completed');
      expect(run.stepResults['review']).toBeDefined();
      expect(run.stepResults['review'].status).toBe('completed');
      expect(run.stepResults['skip']).toBeUndefined();
    });

    it('executes conditional else branch when condition is falsy', async () => {
      const wf: WorkflowDefinition = {
        id: 'cond-else-wf',
        name: 'Conditional Else',
        inputs: {},
        steps: [{
          id: 'check',
          type: 'conditional',
          condition: 'false',
          then: [{ id: 'yes', type: 'agent', agentId: 'y', message: 'Yes' }],
          else: [{ id: 'no', type: 'agent', agentId: 'n', message: 'No' }],
        }],
      };
      workflowStore.saveDefinition(wf);

      const run = await engine.startRun('cond-else-wf');

      expect(run.stepResults['yes']).toBeUndefined();
      expect(run.stepResults['no']).toBeDefined();
      expect(run.stepResults['no'].status).toBe('completed');
    });

    it('handles agent error in step', async () => {
      workflowStore.saveDefinition(simpleWorkflow);
      agentManager.routeMessage.mockRejectedValue(new Error('Agent crashed'));

      const run = await engine.startRun('simple-wf');

      expect(run.status).toBe('failed');
      expect(run.stepResults['step1'].status).toBe('failed');
      expect(run.stepResults['step1'].error).toBe('Agent crashed');
    });

    it('throws for unknown workflow', async () => {
      await expect(engine.startRun('nonexistent')).rejects.toThrow('Workflow not found');
    });

    it('emits workflow events', async () => {
      workflowStore.saveDefinition(simpleWorkflow);

      const events: string[] = [];
      eventBus.on('workflow:started', () => events.push('started'));
      eventBus.on('workflow:step_started', () => events.push('step_started'));
      eventBus.on('workflow:step_completed', () => events.push('step_completed'));
      eventBus.on('workflow:completed', () => events.push('completed'));

      await engine.startRun('simple-wf');

      expect(events).toEqual(['started', 'step_started', 'step_completed', 'completed']);
    });

    it('saves run to store', async () => {
      workflowStore.saveDefinition(simpleWorkflow);

      await engine.startRun('simple-wf');

      expect(workflowStore.saveRun).toHaveBeenCalledOnce();
      expect(workflowStore.updateRun).toHaveBeenCalled();
    });
  });

  describe('getRunStatus', () => {
    it('returns run from store', async () => {
      workflowStore.saveDefinition(simpleWorkflow);
      const run = await engine.startRun('simple-wf');

      const status = engine.getRunStatus(run.id);
      expect(status).toBeDefined();
    });
  });
});
