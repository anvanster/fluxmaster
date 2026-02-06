import type { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  rawJsonSchema?: Record<string, unknown>;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

export interface Tool extends ToolDefinition {
  execute(args: unknown): Promise<ToolResult>;
}

export interface AnthropicToolFormat {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface OpenAIToolFormat {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
