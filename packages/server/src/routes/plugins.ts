import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';

export function pluginRoutes(_ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/plugins — list loaded plugins
    fastify.get('/', async () => {
      // Plugin info is static from config; loaded at bootstrap time
      return _ctx.config.plugins ?? [];
    });
  };
}
