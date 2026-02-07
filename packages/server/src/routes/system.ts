import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';
import type { HealthResponse, UsageResponse, CostResponse } from '../shared/api-types.js';

const startTime = Date.now();

export function systemRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/health
    fastify.get('/health', async () => {
      const response: HealthResponse = {
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
      return response;
    });

    // GET /api/usage
    fastify.get('/usage', async () => {
      const response: UsageResponse = {
        total: ctx.usageTracker.getTotal(),
        byAgent: ctx.usageTracker.getAll(),
      };
      return response;
    });

    // GET /api/cost
    fastify.get('/cost', async () => {
      const response: CostResponse = {
        totalCost: ctx.costCalculator.getTotalCost(),
        byAgent: ctx.costCalculator.getCostBreakdown(),
      };
      return response;
    });
  };
}
