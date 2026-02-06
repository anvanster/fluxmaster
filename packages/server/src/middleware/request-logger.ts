import type { FastifyRequest, FastifyReply } from 'fastify';
import { createChildLogger } from '@fluxmaster/core';

const logger = createChildLogger('http');

export function requestLogger(request: FastifyRequest, _reply: FastifyReply, done: () => void): void {
  logger.info({ method: request.method, url: request.url }, 'Incoming request');
  done();
}
