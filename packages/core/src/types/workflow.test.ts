import { describe, it, expect } from 'vitest';
import {
  WorkflowStepSchema,
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowRun,
  type WorkflowStep,
} from './workflow.js';

describe('Workflow types', () => {
  describe('WorkflowStepSchema', () => {
    it('validates agent step', () => {
      const step = { id: 'research', type: 'agent', agentId: 'researcher', message: 'Research topic' };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('validates parallel step', () => {
      const step = {
        id: 'multi',
        type: 'parallel',
        steps: [
          { id: 'a', type: 'agent', agentId: 'writer', message: 'Write' },
          { id: 'b', type: 'agent', agentId: 'critic', message: 'Critique' },
        ],
      };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('validates conditional step', () => {
      const step = {
        id: 'check',
        type: 'conditional',
        condition: '${research.output.includes("concerns")}',
        then: [{ id: 'review', type: 'agent', agentId: 'reviewer', message: 'Review' }],
      };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('validates loop step', () => {
      const step = {
        id: 'iterate',
        type: 'loop',
        over: '${topics}',
        as: 'topic',
        maxIterations: 5,
        steps: [{ id: 'process', type: 'agent', agentId: 'processor', message: 'Process ${topic}' }],
      };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('rejects invalid step type', () => {
      const step = { id: 'bad', type: 'unknown' };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(false);
    });

    it('rejects agent step without agentId', () => {
      const step = { id: 'bad', type: 'agent', message: 'Hi' };
      const result = WorkflowStepSchema.safeParse(step);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkflowDefinitionSchema', () => {
    it('validates a complete workflow definition', () => {
      const workflow = {
        id: 'research-pipeline',
        name: 'Research Pipeline',
        inputs: {
          topic: { type: 'string', description: 'Research topic' },
        },
        steps: [
          { id: 'research', type: 'agent', agentId: 'researcher', message: 'Research: ${topic}' },
        ],
      };
      const result = WorkflowDefinitionSchema.safeParse(workflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('research-pipeline');
        expect(result.data.steps).toHaveLength(1);
      }
    });

    it('rejects workflow without steps', () => {
      const workflow = { id: 'empty', name: 'Empty', steps: [] };
      const result = WorkflowDefinitionSchema.safeParse(workflow);
      expect(result.success).toBe(false);
    });
  });

  describe('Type interfaces', () => {
    it('WorkflowRun has correct shape', () => {
      const run: WorkflowRun = {
        id: 'run-1',
        workflowId: 'wf-1',
        status: 'running',
        inputs: { topic: 'AI' },
        stepResults: {},
        startedAt: new Date(),
      };
      expect(run.status).toBe('running');
      expect(run.inputs.topic).toBe('AI');
    });
  });
});
