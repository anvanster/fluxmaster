import type { Tool, AnthropicToolFormat, OpenAIToolFormat } from '@fluxmaster/core';
import { zodToJsonSchema } from './zod-to-json-schema.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool;
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getForNames(names: string[]): Tool[] {
    return names.map(name => this.get(name));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  getByPrefix(prefix: string): Tool[] {
    return Array.from(this.tools.values()).filter(t => t.name.startsWith(prefix));
  }

  private getJsonSchema(tool: Tool): Record<string, unknown> {
    return tool.rawJsonSchema ?? zodToJsonSchema(tool.inputSchema);
  }

  toAnthropicFormat(names?: string[]): AnthropicToolFormat[] {
    const tools = names ? this.getForNames(names) : this.list();
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.getJsonSchema(tool),
    }));
  }

  toOpenAIFormat(names?: string[]): OpenAIToolFormat[] {
    const tools = names ? this.getForNames(names) : this.list();
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.getJsonSchema(tool),
      },
    }));
  }
}
