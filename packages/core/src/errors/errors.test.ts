import { describe, it, expect } from 'vitest';
import {
  FluxmasterError,
  AuthError,
  ProviderNotAvailableError,
  ModelNotAvailableError,
  ConfigError,
  ConfigNotFoundError,
  ConfigValidationError,
  AgentError,
  AgentNotFoundError,
  ToolExecutionError,
} from './errors.js';

describe('FluxmasterError', () => {
  it('extends Error with code property', () => {
    const err = new FluxmasterError('test message', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('test message');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('FluxmasterError');
  });

  it('is serializable to JSON', () => {
    const err = new FluxmasterError('test', 'CODE');
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'FluxmasterError',
      message: 'test',
      code: 'CODE',
    });
  });
});

describe('AuthError', () => {
  it('has provider property', () => {
    const err = new AuthError('auth failed', 'anthropic');
    expect(err).toBeInstanceOf(FluxmasterError);
    expect(err.provider).toBe('anthropic');
    expect(err.code).toBe('AUTH_ERROR');
  });
});

describe('ProviderNotAvailableError', () => {
  it('creates message from provider name', () => {
    const err = new ProviderNotAvailableError('openai');
    expect(err.message).toContain('openai');
    expect(err.provider).toBe('openai');
  });
});

describe('ModelNotAvailableError', () => {
  it('creates message from model name', () => {
    const err = new ModelNotAvailableError('gpt-99');
    expect(err.message).toContain('gpt-99');
  });
});

describe('ConfigError', () => {
  it('extends FluxmasterError', () => {
    const err = new ConfigError('bad config');
    expect(err).toBeInstanceOf(FluxmasterError);
    expect(err.code).toBe('CONFIG_ERROR');
  });
});

describe('ConfigNotFoundError', () => {
  it('includes path in message', () => {
    const err = new ConfigNotFoundError('/some/path.json');
    expect(err.message).toContain('/some/path.json');
    expect(err.path).toBe('/some/path.json');
  });
});

describe('ConfigValidationError', () => {
  it('includes issues', () => {
    const issues = [{ path: 'auth', message: 'required' }];
    const err = new ConfigValidationError(issues);
    expect(err.issues).toEqual(issues);
    expect(err.message).toContain('auth');
  });
});

describe('AgentError', () => {
  it('extends FluxmasterError', () => {
    const err = new AgentError('agent problem');
    expect(err).toBeInstanceOf(FluxmasterError);
    expect(err.code).toBe('AGENT_ERROR');
  });
});

describe('AgentNotFoundError', () => {
  it('includes agent ID in message', () => {
    const err = new AgentNotFoundError('agent-1');
    expect(err.message).toContain('agent-1');
  });
});

describe('ToolExecutionError', () => {
  it('has toolName and originalError properties', () => {
    const original = new Error('file not found');
    const err = new ToolExecutionError('read_file', original);
    expect(err).toBeInstanceOf(FluxmasterError);
    expect(err.toolName).toBe('read_file');
    expect(err.originalError).toBe(original);
    expect(err.code).toBe('TOOL_EXECUTION_ERROR');
    expect(err.message).toContain('read_file');
    expect(err.message).toContain('file not found');
  });
});
