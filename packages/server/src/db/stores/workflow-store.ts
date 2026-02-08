import type Database from 'better-sqlite3';
import type { IWorkflowStore, WorkflowDefinition, WorkflowRun } from '@fluxmaster/core';

export class SqliteWorkflowStore implements IWorkflowStore {
  constructor(private db: Database.Database) {}

  saveDefinition(workflow: WorkflowDefinition): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO workflows (id, name, description, definition, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      )
      .run(workflow.id, workflow.name, workflow.description ?? null, JSON.stringify(workflow));
  }

  getDefinition(id: string): WorkflowDefinition | undefined {
    const row = this.db
      .prepare('SELECT definition FROM workflows WHERE id = ?')
      .get(id) as { definition: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.definition) as WorkflowDefinition;
  }

  listDefinitions(): WorkflowDefinition[] {
    const rows = this.db
      .prepare('SELECT definition FROM workflows ORDER BY created_at DESC')
      .all() as { definition: string }[];
    return rows.map((r) => JSON.parse(r.definition) as WorkflowDefinition);
  }

  deleteDefinition(id: string): void {
    this.db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
  }

  saveRun(run: WorkflowRun): void {
    this.db
      .prepare(
        `INSERT INTO workflow_runs (id, workflow_id, status, inputs, step_results, started_at, completed_at, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        run.id,
        run.workflowId,
        run.status,
        JSON.stringify(run.inputs),
        JSON.stringify(run.stepResults),
        run.startedAt.toISOString(),
        run.completedAt?.toISOString() ?? null,
        run.error ?? null,
      );
  }

  updateRun(runId: string, updates: Partial<WorkflowRun>): void {
    const existing = this.getRun(runId);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    this.db
      .prepare(
        `UPDATE workflow_runs SET status = ?, inputs = ?, step_results = ?, completed_at = ?, error = ?
         WHERE id = ?`,
      )
      .run(
        merged.status,
        JSON.stringify(merged.inputs),
        JSON.stringify(merged.stepResults),
        merged.completedAt?.toISOString() ?? null,
        merged.error ?? null,
        runId,
      );
  }

  getRun(runId: string): WorkflowRun | undefined {
    const row = this.db
      .prepare('SELECT * FROM workflow_runs WHERE id = ?')
      .get(runId) as RunRow | undefined;
    if (!row) return undefined;
    return toRun(row);
  }

  listRuns(workflowId: string, options?: { limit?: number }): WorkflowRun[] {
    let sql = 'SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC';
    const params: (string | number)[] = [workflowId];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as RunRow[];
    return rows.map(toRun);
  }
}

interface RunRow {
  id: string;
  workflow_id: string;
  status: string;
  inputs: string;
  step_results: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

function toRun(row: RunRow): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status as WorkflowRun['status'],
    inputs: JSON.parse(row.inputs),
    stepResults: JSON.parse(row.step_results),
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error ?? undefined,
  };
}
