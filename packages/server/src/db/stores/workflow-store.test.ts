import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { WorkflowDefinition, WorkflowRun } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteWorkflowStore } from './workflow-store.js';

describe('SqliteWorkflowStore', () => {
  let db: Database.Database;
  let store: SqliteWorkflowStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteWorkflowStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeDefinition = (overrides?: Partial<WorkflowDefinition>): WorkflowDefinition => ({
    id: 'wf-1',
    name: 'Test Workflow',
    inputs: {},
    steps: [{ id: 'step-1', type: 'agent', agentId: 'researcher', message: 'Research topic' }],
    ...overrides,
  });

  const makeRun = (overrides?: Partial<WorkflowRun>): WorkflowRun => ({
    id: 'run-1',
    workflowId: 'wf-1',
    status: 'running',
    inputs: { topic: 'AI' },
    stepResults: {},
    startedAt: new Date('2024-06-15T12:00:00Z'),
    ...overrides,
  });

  describe('definitions', () => {
    it('saves and retrieves a definition', () => {
      const def = makeDefinition();
      store.saveDefinition(def);

      const retrieved = store.getDefinition('wf-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('wf-1');
      expect(retrieved!.name).toBe('Test Workflow');
      expect(retrieved!.steps).toHaveLength(1);
    });

    it('lists all definitions', () => {
      store.saveDefinition(makeDefinition({ id: 'wf-1', name: 'First' }));
      store.saveDefinition(makeDefinition({ id: 'wf-2', name: 'Second' }));

      const defs = store.listDefinitions();
      expect(defs).toHaveLength(2);
    });

    it('deletes a definition', () => {
      store.saveDefinition(makeDefinition());
      store.deleteDefinition('wf-1');
      expect(store.getDefinition('wf-1')).toBeUndefined();
    });

    it('returns undefined for nonexistent definition', () => {
      expect(store.getDefinition('nonexistent')).toBeUndefined();
    });

    it('overwrites existing definition on save', () => {
      store.saveDefinition(makeDefinition({ name: 'Original' }));
      store.saveDefinition(makeDefinition({ name: 'Updated' }));

      const def = store.getDefinition('wf-1');
      expect(def!.name).toBe('Updated');
    });
  });

  describe('runs', () => {
    beforeEach(() => {
      store.saveDefinition(makeDefinition());
    });

    it('saves and retrieves a run', () => {
      const run = makeRun();
      store.saveRun(run);

      const retrieved = store.getRun('run-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.workflowId).toBe('wf-1');
      expect(retrieved!.status).toBe('running');
      expect(retrieved!.inputs).toEqual({ topic: 'AI' });
    });

    it('updates run status and results', () => {
      store.saveRun(makeRun());
      store.updateRun('run-1', {
        status: 'completed',
        stepResults: { 'step-1': { stepId: 'step-1', status: 'completed', output: 'Done' } },
        completedAt: new Date('2024-06-15T12:05:00Z'),
      });

      const run = store.getRun('run-1');
      expect(run!.status).toBe('completed');
      expect(run!.stepResults['step-1'].output).toBe('Done');
      expect(run!.completedAt).toBeDefined();
    });

    it('lists runs for a workflow', () => {
      store.saveRun(makeRun({ id: 'run-1' }));
      store.saveRun(makeRun({ id: 'run-2' }));

      const runs = store.listRuns('wf-1');
      expect(runs).toHaveLength(2);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        store.saveRun(makeRun({ id: `run-${i}` }));
      }
      expect(store.listRuns('wf-1', { limit: 2 })).toHaveLength(2);
    });

    it('returns undefined for nonexistent run', () => {
      expect(store.getRun('nonexistent')).toBeUndefined();
    });
  });
});
