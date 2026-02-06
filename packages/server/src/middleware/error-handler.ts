import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  FluxmasterError,
  ConfigNotFoundError,
  ConfigValidationError,
  AuthError,
  ProviderNotAvailableError,
  ModelNotAvailableError,
  AgentNotFoundError,
  ToolExecutionError,
} from '@fluxmaster/core';
import type { ErrorResponse } from '../shared/api-types.js';

export function mapErrorToStatus(err: Error): number {
  if (err instanceof AgentNotFoundError) return 404;
  if (err instanceof ConfigNotFoundError) return 404;
  if (err instanceof ConfigValidationError) return 400;
  if (err instanceof ProviderNotAvailableError) return 503;
  if (err instanceof ModelNotAvailableError) return 503;
  if (err instanceof AuthError) return 401;
  if (err instanceof ToolExecutionError) return 502;
  if (err instanceof FluxmasterError) return 500;
  return 500;
}

export function mapErrorToCode(err: Error): string {
  if (err instanceof FluxmasterError) return err.code;
  return 'INTERNAL_ERROR';
}

export function errorHandler(
  err: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = mapErrorToStatus(err);
  const code = mapErrorToCode(err);

  const body: ErrorResponse = {
    error: err.message,
    code,
    statusCode,
  };

  reply.status(statusCode).send(body);
}
