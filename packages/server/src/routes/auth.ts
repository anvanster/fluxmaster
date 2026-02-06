import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';
import type { AuthStatusResponse } from '../shared/api-types.js';

export function authRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/auth/status
    fastify.get('/status', async () => {
      const status = ctx.authManager.getStatus();
      const response: AuthStatusResponse = {
        copilotConfigured: status.copilotConfigured,
        copilotReady: status.copilotReady,
        claudeCli: status.claudeCli,
        directProviders: status.directProviders,
      };
      return response;
    });
  };
}
