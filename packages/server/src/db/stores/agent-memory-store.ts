import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { IAgentMemoryStore, AgentDecision, AgentLearning, AgentGoalRecord } from '@fluxmaster/core';

export class SqliteAgentMemoryStore implements IAgentMemoryStore {
  constructor(private db: Database.Database) {}

  saveDecision(decision: Omit<AgentDecision, 'id' | 'createdAt'>): AgentDecision {
    const id = randomUUID();
    const createdAt = new Date();
    this.db
      .prepare(
        `INSERT INTO agent_decisions (id, agent_id, decision, reasoning, outcome, confidence, context, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, decision.agentId, decision.decision, decision.reasoning, decision.outcome ?? null, decision.confidence, decision.context ?? null, createdAt.toISOString());

    return { id, createdAt, ...decision };
  }

  saveLearning(learning: Omit<AgentLearning, 'id' | 'createdAt'>): AgentLearning {
    const id = randomUUID();
    const createdAt = new Date();
    this.db
      .prepare(
        `INSERT INTO agent_learnings (id, agent_id, type, content, source, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, learning.agentId, learning.type, learning.content, learning.source, learning.confidence, createdAt.toISOString());

    return { id, createdAt, ...learning };
  }

  recall(agentId: string, query: string, limit = 10): Array<AgentDecision | AgentLearning> {
    const pattern = `%${query}%`;

    const decisions = this.db
      .prepare(
        `SELECT * FROM agent_decisions
         WHERE agent_id = ? AND (decision LIKE ? OR reasoning LIKE ? OR context LIKE ?)
         ORDER BY created_at DESC, rowid DESC LIMIT ?`,
      )
      .all(agentId, pattern, pattern, pattern, limit) as Array<{
        id: string; agent_id: string; decision: string; reasoning: string;
        outcome: string | null; confidence: number; context: string | null; created_at: string;
      }>;

    const learnings = this.db
      .prepare(
        `SELECT * FROM agent_learnings
         WHERE agent_id = ? AND (content LIKE ? OR source LIKE ?)
         ORDER BY created_at DESC, rowid DESC LIMIT ?`,
      )
      .all(agentId, pattern, pattern, limit) as Array<{
        id: string; agent_id: string; type: string; content: string;
        source: string; confidence: number; created_at: string;
      }>;

    const results: Array<AgentDecision | AgentLearning> = [
      ...decisions.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        decision: r.decision,
        reasoning: r.reasoning,
        outcome: r.outcome ?? undefined,
        confidence: r.confidence,
        context: r.context ?? undefined,
        createdAt: new Date(r.created_at),
      } as AgentDecision)),
      ...learnings.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        type: r.type as AgentLearning['type'],
        content: r.content,
        source: r.source,
        confidence: r.confidence,
        createdAt: new Date(r.created_at),
      } as AgentLearning)),
    ];

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results.slice(0, limit);
  }

  getDecisions(agentId: string, limit = 50): AgentDecision[] {
    const rows = this.db
      .prepare('SELECT * FROM agent_decisions WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(agentId, limit) as Array<{
        id: string; agent_id: string; decision: string; reasoning: string;
        outcome: string | null; confidence: number; context: string | null; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      decision: r.decision,
      reasoning: r.reasoning,
      outcome: r.outcome ?? undefined,
      confidence: r.confidence,
      context: r.context ?? undefined,
      createdAt: new Date(r.created_at),
    }));
  }

  getLearnings(agentId: string, limit = 50): AgentLearning[] {
    const rows = this.db
      .prepare('SELECT * FROM agent_learnings WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(agentId, limit) as Array<{
        id: string; agent_id: string; type: string; content: string;
        source: string; confidence: number; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      type: r.type as AgentLearning['type'],
      content: r.content,
      source: r.source,
      confidence: r.confidence,
      createdAt: new Date(r.created_at),
    }));
  }

  saveGoal(goal: Omit<AgentGoalRecord, 'id' | 'createdAt'>): AgentGoalRecord {
    const id = randomUUID();
    const createdAt = new Date();
    this.db
      .prepare(
        `INSERT INTO agent_goals (id, agent_id, goal, steps, status, reflection, iterations, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, goal.agentId, goal.goal, JSON.stringify(goal.steps), goal.status, goal.reflection ?? null, goal.iterations, createdAt.toISOString(), goal.completedAt?.toISOString() ?? null);

    return { id, createdAt, ...goal };
  }

  updateGoal(id: string, updates: Partial<Pick<AgentGoalRecord, 'status' | 'reflection' | 'iterations' | 'completedAt'>>): void {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.reflection !== undefined) {
      setClauses.push('reflection = ?');
      values.push(updates.reflection);
    }
    if (updates.iterations !== undefined) {
      setClauses.push('iterations = ?');
      values.push(updates.iterations);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt.toISOString());
    }

    if (setClauses.length === 0) return;

    values.push(id);
    this.db
      .prepare(`UPDATE agent_goals SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...values);
  }

  getActiveGoal(agentId: string): AgentGoalRecord | undefined {
    const row = this.db
      .prepare("SELECT * FROM agent_goals WHERE agent_id = ? AND status = 'active' ORDER BY created_at DESC, rowid DESC LIMIT 1")
      .get(agentId) as {
        id: string; agent_id: string; goal: string; steps: string; status: string;
        reflection: string | null; iterations: number; created_at: string; completed_at: string | null;
      } | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      agentId: row.agent_id,
      goal: row.goal,
      steps: JSON.parse(row.steps) as string[],
      status: row.status as AgentGoalRecord['status'],
      reflection: row.reflection ?? undefined,
      iterations: row.iterations,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  getGoalHistory(agentId: string, limit = 20): AgentGoalRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM agent_goals WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(agentId, limit) as Array<{
        id: string; agent_id: string; goal: string; steps: string; status: string;
        reflection: string | null; iterations: number; created_at: string; completed_at: string | null;
      }>;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      goal: r.goal,
      steps: JSON.parse(r.steps) as string[],
      status: r.status as AgentGoalRecord['status'],
      reflection: r.reflection ?? undefined,
      iterations: r.iterations,
      createdAt: new Date(r.created_at),
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
    }));
  }
}
