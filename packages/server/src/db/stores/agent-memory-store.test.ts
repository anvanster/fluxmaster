import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { Migrator } from '../migrator.js';
import { SqliteAgentMemoryStore } from './agent-memory-store.js';

describe('SqliteAgentMemoryStore', () => {
  let db: Database.Database;
  let store: SqliteAgentMemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteAgentMemoryStore(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('decisions', () => {
    it('saves and retrieves a decision', () => {
      const decision = store.saveDecision({
        agentId: 'coordinator',
        decision: 'Delegate auth to coder',
        reasoning: 'Coder has file tools for editing auth module',
        confidence: 0.9,
        context: 'auth refactoring task',
      });

      expect(decision.id).toBeTruthy();
      expect(decision.decision).toBe('Delegate auth to coder');
      expect(decision.createdAt).toBeInstanceOf(Date);

      const all = store.getDecisions('coordinator');
      expect(all).toHaveLength(1);
      expect(all[0].decision).toBe('Delegate auth to coder');
      expect(all[0].reasoning).toBe('Coder has file tools for editing auth module');
      expect(all[0].confidence).toBe(0.9);
      expect(all[0].context).toBe('auth refactoring task');
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        store.saveDecision({
          agentId: 'coordinator',
          decision: `Decision ${i}`,
          reasoning: 'test',
          confidence: 0.5,
        });
      }

      const limited = store.getDecisions('coordinator', 3);
      expect(limited).toHaveLength(3);
    });

    it('returns only decisions for the given agent', () => {
      store.saveDecision({ agentId: 'coordinator', decision: 'A', reasoning: 'r', confidence: 0.5 });
      store.saveDecision({ agentId: 'coder', decision: 'B', reasoning: 'r', confidence: 0.5 });

      expect(store.getDecisions('coordinator')).toHaveLength(1);
      expect(store.getDecisions('coder')).toHaveLength(1);
    });
  });

  describe('learnings', () => {
    it('saves and retrieves a learning', () => {
      const learning = store.saveLearning({
        agentId: 'coordinator',
        type: 'pattern',
        content: 'Researcher is slow on large codebases',
        source: 'code review task',
        confidence: 0.8,
      });

      expect(learning.id).toBeTruthy();
      expect(learning.type).toBe('pattern');
      expect(learning.createdAt).toBeInstanceOf(Date);

      const all = store.getLearnings('coordinator');
      expect(all).toHaveLength(1);
      expect(all[0].content).toBe('Researcher is slow on large codebases');
      expect(all[0].source).toBe('code review task');
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        store.saveLearning({
          agentId: 'coordinator',
          type: 'success',
          content: `Learning ${i}`,
          source: 'test',
          confidence: 0.5,
        });
      }

      const limited = store.getLearnings('coordinator', 2);
      expect(limited).toHaveLength(2);
    });
  });

  describe('recall', () => {
    it('recalls decisions matching query', () => {
      store.saveDecision({ agentId: 'coordinator', decision: 'Use coder for auth', reasoning: 'Has file tools', confidence: 0.9 });
      store.saveDecision({ agentId: 'coordinator', decision: 'Use tester for validation', reasoning: 'Has test tools', confidence: 0.8 });

      const results = store.recall('coordinator', 'auth');
      expect(results).toHaveLength(1);
      expect((results[0] as { decision: string }).decision).toBe('Use coder for auth');
    });

    it('recalls learnings matching query', () => {
      store.saveLearning({ agentId: 'coordinator', type: 'pattern', content: 'Auth module is complex', source: 'review', confidence: 0.7 });
      store.saveLearning({ agentId: 'coordinator', type: 'success', content: 'Testing improved quality', source: 'test run', confidence: 0.9 });

      const results = store.recall('coordinator', 'complex');
      expect(results).toHaveLength(1);
      expect((results[0] as { content: string }).content).toBe('Auth module is complex');
    });

    it('combines decisions and learnings in recall', () => {
      store.saveDecision({ agentId: 'coordinator', decision: 'Refactor auth', reasoning: 'Auth is fragile', confidence: 0.9 });
      store.saveLearning({ agentId: 'coordinator', type: 'failure', content: 'Auth tests failed after refactor', source: 'auth task', confidence: 0.8 });

      const results = store.recall('coordinator', 'auth');
      expect(results).toHaveLength(2);
    });

    it('respects limit across combined results', () => {
      for (let i = 0; i < 5; i++) {
        store.saveDecision({ agentId: 'coordinator', decision: `Auth decision ${i}`, reasoning: 'auth related', confidence: 0.5 });
        store.saveLearning({ agentId: 'coordinator', type: 'success', content: `Auth learning ${i}`, source: 'auth', confidence: 0.5 });
      }

      const results = store.recall('coordinator', 'auth', 3);
      expect(results).toHaveLength(3);
    });

    it('returns empty for no matches', () => {
      store.saveDecision({ agentId: 'coordinator', decision: 'Unrelated', reasoning: 'test', confidence: 0.5 });
      const results = store.recall('coordinator', 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('goals', () => {
    it('saves and retrieves active goal', () => {
      const goal = store.saveGoal({
        agentId: 'coordinator',
        goal: 'Refactor authentication',
        steps: ['Analyze', 'Design', 'Implement'],
        status: 'active',
        iterations: 0,
      });

      expect(goal.id).toBeTruthy();
      expect(goal.steps).toEqual(['Analyze', 'Design', 'Implement']);

      const active = store.getActiveGoal('coordinator');
      expect(active).toBeDefined();
      expect(active!.goal).toBe('Refactor authentication');
      expect(active!.steps).toEqual(['Analyze', 'Design', 'Implement']);
      expect(active!.status).toBe('active');
    });

    it('updates goal status and reflection', () => {
      const goal = store.saveGoal({
        agentId: 'coordinator',
        goal: 'Test goal',
        steps: ['Step 1'],
        status: 'active',
        iterations: 0,
      });

      const completedAt = new Date();
      store.updateGoal(goal.id, {
        status: 'completed',
        reflection: 'Task completed successfully',
        iterations: 3,
        completedAt,
      });

      const history = store.getGoalHistory('coordinator');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('completed');
      expect(history[0].reflection).toBe('Task completed successfully');
      expect(history[0].iterations).toBe(3);
      expect(history[0].completedAt).toBeInstanceOf(Date);
    });

    it('returns undefined for no active goal', () => {
      const active = store.getActiveGoal('coordinator');
      expect(active).toBeUndefined();
    });

    it('getActiveGoal returns only active goals', () => {
      store.saveGoal({ agentId: 'coordinator', goal: 'Completed goal', steps: [], status: 'completed', iterations: 2 });
      store.saveGoal({ agentId: 'coordinator', goal: 'Active goal', steps: ['Do it'], status: 'active', iterations: 0 });

      const active = store.getActiveGoal('coordinator');
      expect(active!.goal).toBe('Active goal');
    });

    it('getGoalHistory returns all goals in desc order', () => {
      store.saveGoal({ agentId: 'coordinator', goal: 'First', steps: [], status: 'completed', iterations: 1 });
      store.saveGoal({ agentId: 'coordinator', goal: 'Second', steps: [], status: 'active', iterations: 0 });

      const history = store.getGoalHistory('coordinator');
      expect(history).toHaveLength(2);
      // Most recent first
      expect(history[0].goal).toBe('Second');
      expect(history[1].goal).toBe('First');
    });

    it('respects limit on goal history', () => {
      for (let i = 0; i < 5; i++) {
        store.saveGoal({ agentId: 'coordinator', goal: `Goal ${i}`, steps: [], status: 'completed', iterations: 1 });
      }

      const limited = store.getGoalHistory('coordinator', 2);
      expect(limited).toHaveLength(2);
    });
  });
});
