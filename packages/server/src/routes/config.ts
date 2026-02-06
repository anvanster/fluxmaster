import type { FastifyPluginAsync } from 'fastify';
import { generateDefaultConfig } from '@fluxmaster/core';
import type { AppContext } from '../context.js';

export function configRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/config — get current config
    fastify.get('/', async () => {
      return ctx.config;
    });

    // GET /api/config/default — get default config
    fastify.get('/default', async () => {
      return generateDefaultConfig();
    });
  };
}
