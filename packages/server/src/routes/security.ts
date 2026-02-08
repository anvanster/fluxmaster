import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';

export function securityRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/security/audit — list audit entries with filters
    fastify.get<{
      Querystring: { agentId?: string; toolName?: string; permitted?: string; limit?: string };
    }>('/audit', async (request) => {
      const { agentId, toolName, permitted, limit: limitStr } = request.query;
      const limit = limitStr ? parseInt(limitStr, 10) : 50;

      if (agentId) {
        const entries = ctx.toolAuditStore.getByAgent(agentId, { limit });
        return { entries };
      }

      if (toolName) {
        const entries = ctx.toolAuditStore.getByTool(toolName, { limit });
        return { entries };
      }

      if (permitted === 'false') {
        const entries = ctx.toolAuditStore.getDeniedCalls({ limit });
        return { entries };
      }

      // Default: return all by getting denied + permitted from a generic query
      // Since we don't have a "getAll" method, return denied calls as the most useful default
      const entries = ctx.toolAuditStore.getDeniedCalls({ limit });
      return { entries };
    });

    // GET /api/security/audit/:agentId — per-agent audit log
    fastify.get<{
      Params: { agentId: string };
      Querystring: { limit?: string; offset?: string };
    }>('/audit/:agentId', async (request) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const entries = ctx.toolAuditStore.getByAgent(request.params.agentId, { limit, offset });
      return { entries };
    });

    // GET /api/security/denied — recent denied calls
    fastify.get<{
      Querystring: { limit?: string };
    }>('/denied', async (request) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const entries = ctx.toolAuditStore.getDeniedCalls({ limit });
      return { entries };
    });

    // GET /api/security/policy — current security policy from config
    fastify.get('/policy', async () => {
      return { policy: ctx.config.security };
    });
  };
}
