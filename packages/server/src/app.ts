import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { randomUUID } from 'node:crypto';
import type { AppContext } from './context.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { WsHandler } from './ws/handler.js';

export interface CreateAppOptions {
  ctx: AppContext;
  serveStatic?: string;
}

export async function createApp(options: CreateAppOptions): Promise<{ app: FastifyInstance; wsHandler: WsHandler }> {
  const { ctx, serveStatic } = options;

  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', requestLogger);

  await registerRoutes(app, ctx);

  const wsHandler = new WsHandler(ctx);

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket) => {
      const connectionId = randomUUID();
      wsHandler.handleConnection(socket, connectionId);
    });
  });

  if (serveStatic) {
    const fastifyStatic = await import('@fastify/static');
    await app.register(fastifyStatic.default, {
      root: serveStatic,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile('index.html');
    });
  }

  return { app, wsHandler };
}
