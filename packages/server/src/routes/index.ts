import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { agentRoutes } from './agents.js';
import { toolRoutes } from './tools.js';
import { mcpRoutes } from './mcp.js';
import { authRoutes } from './auth.js';
import { configRoutes } from './config.js';
import { systemRoutes } from './system.js';
import { pluginRoutes } from './plugins.js';
import { conversationRoutes } from './conversations.js';
import { requestRoutes } from './requests.js';

export async function registerRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  await app.register(agentRoutes(ctx), { prefix: '/api/agents' });
  await app.register(toolRoutes(ctx), { prefix: '/api/tools' });
  await app.register(mcpRoutes(ctx), { prefix: '/api/mcp' });
  await app.register(authRoutes(ctx), { prefix: '/api/auth' });
  await app.register(configRoutes(ctx), { prefix: '/api/config' });
  await app.register(systemRoutes(ctx), { prefix: '/api/system' });
  await app.register(pluginRoutes(ctx), { prefix: '/api/plugins' });
  await app.register(conversationRoutes(ctx), { prefix: '/api/conversations' });
  await app.register(requestRoutes(ctx), { prefix: '/api/requests' });
}
