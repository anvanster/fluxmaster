import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';

export function requestRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/requests/:requestId — get request detail with timing
    fastify.get<{ Params: { requestId: string } }>('/:requestId', async (request, reply) => {
      const req = ctx.requestStore.getRequest(request.params.requestId);
      if (!req) {
        return reply.status(404).send({ error: 'Request not found' });
      }

      const ttftMs = req.firstTokenAt && req.startedAt
        ? req.firstTokenAt.getTime() - req.startedAt.getTime()
        : null;

      const totalDurationMs = req.completedAt && req.startedAt
        ? req.completedAt.getTime() - req.startedAt.getTime()
        : null;

      return {
        ...req,
        ttftMs,
        totalDurationMs,
      };
    });

    // GET /api/requests?agentId=X&limit=N&offset=N — list requests
    fastify.get<{ Querystring: { agentId?: string; limit?: string; offset?: string } }>('/', async (request, reply) => {
      const agentId = request.query.agentId;
      if (!agentId) {
        return reply.status(400).send({ error: 'agentId query parameter is required' });
      }
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const rawRequests = ctx.requestStore.listRequests(agentId, { limit, offset });
      const requests = rawRequests.map((req) => ({
        ...req,
        ttftMs: req.firstTokenAt && req.startedAt
          ? req.firstTokenAt.getTime() - req.startedAt.getTime()
          : null,
        totalDurationMs: req.completedAt && req.startedAt
          ? req.completedAt.getTime() - req.startedAt.getTime()
          : null,
      }));
      return { requests };
    });
  };
}
