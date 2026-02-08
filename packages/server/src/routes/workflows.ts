import type { FastifyPluginAsync } from 'fastify';
import { WorkflowDefinitionSchema } from '@fluxmaster/core';
import type { AppContext } from '../context.js';
import type { WorkflowListResponse, WorkflowRunResponse, WorkflowRunListResponse } from '../shared/api-types.js';
import type { WorkflowRun } from '@fluxmaster/core';

function toRunResponse(run: WorkflowRun): WorkflowRunResponse {
  return {
    id: run.id,
    workflowId: run.workflowId,
    status: run.status,
    inputs: run.inputs,
    stepResults: run.stepResults as Record<string, unknown>,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    error: run.error,
  };
}

export function workflowRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/workflows/runs/:runId — get run status
    // Registered BEFORE /:id to avoid route conflict
    fastify.get<{ Params: { runId: string } }>('/runs/:runId', async (request, reply) => {
      const run = ctx.workflowEngine.getRunStatus(request.params.runId);
      if (!run) {
        return reply.status(404).send({ error: 'Run not found' });
      }
      return toRunResponse(run);
    });

    // POST /api/workflows — create workflow definition
    fastify.post('/', async (request, reply) => {
      const result = WorkflowDefinitionSchema.safeParse(request.body);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        return reply.status(400).send({ error: 'Invalid workflow definition', details: issues });
      }
      ctx.workflowStore.saveDefinition(result.data);
      return reply.status(201).send(result.data);
    });

    // GET /api/workflows — list all workflows
    fastify.get('/', async () => {
      const workflows = ctx.workflowStore.listDefinitions();
      const response: WorkflowListResponse = { workflows };
      return response;
    });

    // GET /api/workflows/:id — get workflow definition
    fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const def = ctx.workflowStore.getDefinition(request.params.id);
      if (!def) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      return def;
    });

    // DELETE /api/workflows/:id — delete workflow
    fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const def = ctx.workflowStore.getDefinition(request.params.id);
      if (!def) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      ctx.workflowStore.deleteDefinition(request.params.id);
      return reply.status(204).send();
    });

    // POST /api/workflows/:id/run — start a workflow run
    fastify.post<{ Params: { id: string } }>('/:id/run', async (request, reply) => {
      const def = ctx.workflowStore.getDefinition(request.params.id);
      if (!def) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      const body = request.body as { inputs?: Record<string, unknown> } | null;
      const run = await ctx.workflowEngine.startRun(request.params.id, body?.inputs);
      return toRunResponse(run);
    });

    // GET /api/workflows/:id/runs — list runs for workflow
    fastify.get<{ Params: { id: string } }>('/:id/runs', async (request) => {
      const { limit } = request.query as { limit?: string };
      const opts = limit ? { limit: Number(limit) } : undefined;
      const runs = ctx.workflowStore.listRuns(request.params.id, opts);
      const response: WorkflowRunListResponse = {
        runs: runs.map(toRunResponse),
      };
      return response;
    });
  };
}
