import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { WorkflowDefinition, WorkflowRun } from '@fluxmaster/core';
import { workflowRoutes } from './workflows.js';
import { errorHandler } from '../middleware/error-handler.js';

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    workflowStore: {
      saveDefinition: vi.fn(),
      getDefinition: vi.fn().mockReturnValue(undefined),
      listDefinitions: vi.fn().mockReturnValue([]),
      deleteDefinition: vi.fn(),
      saveRun: vi.fn(),
      updateRun: vi.fn(),
      getRun: vi.fn().mockReturnValue(undefined),
      listRuns: vi.fn().mockReturnValue([]),
    } as any,
    workflowEngine: {
      startRun: vi.fn().mockResolvedValue({
        id: 'run-1',
        workflowId: 'wf-1',
        status: 'completed',
        inputs: {},
        stepResults: {},
        startedAt: new Date('2024-06-15T12:00:00Z'),
        completedAt: new Date('2024-06-15T12:01:00Z'),
      }),
      getRunStatus: vi.fn(),
    } as any,
    ...overrides,
  } as AppContext;
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(workflowRoutes(ctx), { prefix: '/api/workflows' });
  return app;
}

describe('Workflow routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  it('POST /api/workflows — creates a workflow from JSON', async () => {
    const workflow = {
      id: 'wf-1',
      name: 'Test',
      steps: [{ id: 's1', type: 'agent', agentId: 'a1', message: 'Hi' }],
    };
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows',
      payload: workflow,
    });
    expect(res.statusCode).toBe(201);
    expect(ctx.workflowStore.saveDefinition).toHaveBeenCalledOnce();
  });

  it('POST /api/workflows — rejects invalid workflow', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows',
      payload: { name: 'No ID' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/workflows — lists workflows', async () => {
    const wf: WorkflowDefinition = {
      id: 'wf-1', name: 'Test', inputs: {},
      steps: [{ id: 's1', type: 'agent', agentId: 'a1', message: 'Hi' }],
    };
    (ctx.workflowStore.listDefinitions as ReturnType<typeof vi.fn>).mockReturnValue([wf]);

    const res = await app.inject({ method: 'GET', url: '/api/workflows' });
    expect(res.statusCode).toBe(200);
    expect(res.json().workflows).toHaveLength(1);
  });

  it('GET /api/workflows/:id — returns workflow', async () => {
    const wf: WorkflowDefinition = {
      id: 'wf-1', name: 'Test', inputs: {},
      steps: [{ id: 's1', type: 'agent', agentId: 'a1', message: 'Hi' }],
    };
    (ctx.workflowStore.getDefinition as ReturnType<typeof vi.fn>).mockReturnValue(wf);

    const res = await app.inject({ method: 'GET', url: '/api/workflows/wf-1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe('wf-1');
  });

  it('GET /api/workflows/:id — 404 for unknown', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/workflows/unknown' });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/workflows/:id — deletes workflow', async () => {
    (ctx.workflowStore.getDefinition as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'wf-1' });

    const res = await app.inject({ method: 'DELETE', url: '/api/workflows/wf-1' });
    expect(res.statusCode).toBe(204);
    expect(ctx.workflowStore.deleteDefinition).toHaveBeenCalledWith('wf-1');
  });

  it('POST /api/workflows/:id/run — starts a run', async () => {
    (ctx.workflowStore.getDefinition as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'wf-1' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/workflows/wf-1/run',
      payload: { inputs: { topic: 'AI' } },
    });
    expect(res.statusCode).toBe(200);
    expect(ctx.workflowEngine.startRun).toHaveBeenCalledWith('wf-1', { topic: 'AI' });
  });

  it('GET /api/workflows/runs/:runId — returns run status', async () => {
    const run: WorkflowRun = {
      id: 'run-1', workflowId: 'wf-1', status: 'completed',
      inputs: {}, stepResults: {}, startedAt: new Date('2024-06-15T12:00:00Z'),
      completedAt: new Date('2024-06-15T12:01:00Z'),
    };
    (ctx.workflowEngine.getRunStatus as ReturnType<typeof vi.fn>).mockReturnValue(run);

    const res = await app.inject({ method: 'GET', url: '/api/workflows/runs/run-1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('completed');
  });

  it('GET /api/workflows/:id/runs — lists runs for workflow', async () => {
    const runs: WorkflowRun[] = [
      { id: 'run-1', workflowId: 'wf-1', status: 'completed', inputs: {}, stepResults: {}, startedAt: new Date('2024-06-15T12:00:00Z') },
    ];
    (ctx.workflowStore.listRuns as ReturnType<typeof vi.fn>).mockReturnValue(runs);

    const res = await app.inject({ method: 'GET', url: '/api/workflows/wf-1/runs' });
    expect(res.statusCode).toBe(200);
    expect(res.json().runs).toHaveLength(1);
  });
});
