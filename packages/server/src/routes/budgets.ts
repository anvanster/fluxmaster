import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';
import type { BudgetListResponse, BudgetAlertListResponse } from '../shared/api-types.js';

export function budgetRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/budgets/alerts — list all budget alerts
    // Registered BEFORE /:id to avoid route conflict
    fastify.get('/alerts', async (request) => {
      const { limit } = request.query as { limit?: string };
      const opts = limit ? { limit: Number(limit) } : undefined;
      const alerts = ctx.budgetStore.getAllAlerts(opts);
      const response: BudgetAlertListResponse = {
        alerts: alerts.map((a) => ({
          id: a.id,
          budgetId: a.budgetId,
          type: a.type,
          unit: a.unit,
          threshold: a.threshold,
          currentCost: a.currentCost,
          maxCost: a.maxCost,
          timestamp: a.timestamp.toISOString(),
        })),
      };
      return response;
    });

    // GET /api/budgets — list all budget statuses
    fastify.get('/', async () => {
      const statuses = ctx.budgetManager.getStatus();
      const response: BudgetListResponse = { budgets: statuses };
      return response;
    });

    // GET /api/budgets/:id — get specific budget status
    fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
      const statuses = ctx.budgetManager.getStatus(request.params.id);
      const response: BudgetListResponse = { budgets: statuses };
      return response;
    });
  };
}
