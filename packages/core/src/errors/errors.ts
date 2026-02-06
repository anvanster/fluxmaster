export class FluxmasterError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'FluxmasterError';
    this.code = code;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    };
  }
}

export class ConfigError extends FluxmasterError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class ConfigNotFoundError extends ConfigError {
  readonly path: string;

  constructor(path: string) {
    super(`Config file not found: ${path}`);
    this.name = 'ConfigNotFoundError';
    this.path = path;
  }
}

export class ConfigValidationError extends ConfigError {
  readonly issues: unknown[];

  constructor(issues: unknown[]) {
    super(`Config validation failed: ${JSON.stringify(issues)}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export class AuthError extends FluxmasterError {
  readonly provider: string;

  constructor(message: string, provider: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
    this.provider = provider;
  }
}

export class ProviderNotAvailableError extends AuthError {
  constructor(provider: string) {
    super(`No auth provider available for: ${provider}`, provider);
    this.name = 'ProviderNotAvailableError';
  }
}

export class ModelNotAvailableError extends AuthError {
  constructor(model: string) {
    super(`No auth provider can serve model: ${model}`, 'unknown');
    this.name = 'ModelNotAvailableError';
  }
}

export class AgentError extends FluxmasterError {
  constructor(message: string) {
    super(message, 'AGENT_ERROR');
    this.name = 'AgentError';
  }
}

export class AgentNotFoundError extends AgentError {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class ToolExecutionError extends FluxmasterError {
  readonly toolName: string;
  readonly originalError: Error;

  constructor(toolName: string, originalError: Error) {
    super(`Tool execution failed: ${toolName} - ${originalError.message}`, 'TOOL_EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.originalError = originalError;
  }
}
