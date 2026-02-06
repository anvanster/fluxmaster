import { describe, it, expect } from 'vitest';
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
import { mapErrorToStatus, mapErrorToCode } from './error-handler.js';

describe('mapErrorToStatus', () => {
  it('maps AgentNotFoundError to 404', () => {
    expect(mapErrorToStatus(new AgentNotFoundError('x'))).toBe(404);
  });

  it('maps ConfigNotFoundError to 404', () => {
    expect(mapErrorToStatus(new ConfigNotFoundError('/path'))).toBe(404);
  });

  it('maps ConfigValidationError to 400', () => {
    expect(mapErrorToStatus(new ConfigValidationError([]))).toBe(400);
  });

  it('maps ProviderNotAvailableError to 503', () => {
    expect(mapErrorToStatus(new ProviderNotAvailableError('copilot'))).toBe(503);
  });

  it('maps ModelNotAvailableError to 503', () => {
    expect(mapErrorToStatus(new ModelNotAvailableError('gpt-5'))).toBe(503);
  });

  it('maps AuthError to 401', () => {
    expect(mapErrorToStatus(new AuthError('bad auth', 'test'))).toBe(401);
  });

  it('maps ToolExecutionError to 502', () => {
    expect(mapErrorToStatus(new ToolExecutionError('tool', new Error('fail')))).toBe(502);
  });

  it('maps generic FluxmasterError to 500', () => {
    expect(mapErrorToStatus(new FluxmasterError('something', 'UNKNOWN'))).toBe(500);
  });

  it('maps unknown Error to 500', () => {
    expect(mapErrorToStatus(new Error('unknown'))).toBe(500);
  });
});

describe('mapErrorToCode', () => {
  it('returns error code for FluxmasterError', () => {
    expect(mapErrorToCode(new AgentNotFoundError('x'))).toBe('AGENT_ERROR');
  });

  it('returns INTERNAL_ERROR for unknown errors', () => {
    expect(mapErrorToCode(new Error('unknown'))).toBe('INTERNAL_ERROR');
  });
});
