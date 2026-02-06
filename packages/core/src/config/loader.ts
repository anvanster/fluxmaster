import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FluxmasterConfigSchema, type FluxmasterConfig } from '../types/config.js';
import { ConfigNotFoundError, ConfigValidationError } from '../errors/errors.js';

function expandEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => {
    return process.env[name] ?? '';
  });
}

function expandEnvInObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return expandEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvInObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvInObject(value);
    }
    return result;
  }
  return obj;
}

export async function loadConfig(configPath: string): Promise<FluxmasterConfig> {
  const absolutePath = path.resolve(configPath);

  let rawContent: string;
  try {
    rawContent = await fs.readFile(absolutePath, 'utf-8');
  } catch {
    throw new ConfigNotFoundError(absolutePath);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawContent);
  } catch {
    throw new ConfigValidationError([{ message: 'Invalid JSON' }]);
  }

  const expanded = expandEnvInObject(rawJson);
  const result = FluxmasterConfigSchema.safeParse(expanded);

  if (!result.success) {
    throw new ConfigValidationError(result.error.issues);
  }

  return result.data;
}

export function generateDefaultConfig(): FluxmasterConfig {
  return FluxmasterConfigSchema.parse({
    auth: {
      copilot: {
        accountType: 'individual',
        port: 4141,
      },
      preferDirectApi: false,
    },
    agents: {
      defaults: {
        maxTokens: 8192,
        temperature: 0.7,
      },
      list: [
        {
          id: 'default',
          model: 'claude-sonnet-4',
          systemPrompt: 'You are a helpful assistant.',
          tools: ['read_file', 'write_file', 'list_files', 'bash_execute'],
        },
      ],
    },
  });
}
