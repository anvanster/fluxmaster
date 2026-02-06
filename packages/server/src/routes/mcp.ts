import type { FastifyPluginAsync } from 'fastify';
import type { AppContext } from '../context.js';
import type { McpServerInfo } from '../shared/api-types.js';

export function mcpRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/mcp — list configured MCP servers
    fastify.get('/', async () => {
      const configured: McpServerInfo[] = ctx.config.mcpServers.global.map(s => ({
        name: s.name,
        transport: s.transport,
        command: s.command,
        url: s.url,
      }));
      const running = ctx.mcpServerManager.listRunning();
      return { configured, running };
    });

    // POST /api/mcp/:name/start — start an MCP server
    fastify.post<{ Params: { name: string } }>('/:name/start', async (request, reply) => {
      const serverConfig = ctx.config.mcpServers.global.find(s => s.name === request.params.name);
      if (!serverConfig) {
        return reply.status(404).send({ error: `MCP server not found in config: ${request.params.name}` });
      }
      const tools = await ctx.mcpServerManager.startServer(serverConfig);
      return { name: request.params.name, toolCount: tools.length };
    });

    // POST /api/mcp/:name/stop — stop an MCP server
    fastify.post<{ Params: { name: string } }>('/:name/stop', async (request, reply) => {
      await ctx.mcpServerManager.stopServer(request.params.name);
      return reply.status(204).send();
    });
  };
}
