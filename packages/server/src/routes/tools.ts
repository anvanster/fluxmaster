import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';
import type { ToolSummary } from '../shared/api-types.js';

export function toolRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/tools — list tools
    fastify.get('/', async () => {
      const tools: ToolSummary[] = ctx.toolRegistry.list().map(t => ({
        name: t.name,
        description: t.description,
      }));
      return tools;
    });

    // GET /api/tools/:name — get tool details
    fastify.get<{ Params: { name: string } }>('/:name', async (request, reply) => {
      try {
        const tool = ctx.toolRegistry.get(request.params.name);
        return { name: tool.name, description: tool.description };
      } catch {
        return reply.status(404).send({ error: `Tool not found: ${request.params.name}` });
      }
    });
  };
}
