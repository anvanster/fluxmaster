import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from './registry.js';
import type { Tool } from '@fluxmaster/core';

function makeTool(name: string): Tool {
  return {
    name,
    description: `Test tool: ${name}`,
    inputSchema: z.object({ input: z.string() }),
    execute: async (args) => ({ content: `executed ${name}` }),
  };
}

describe('ToolRegistry', () => {
  it('registers a tool and retrieves it by name', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('test_tool');
    registry.register(tool);

    const retrieved = registry.get('test_tool');
    expect(retrieved.name).toBe('test_tool');
  });

  it('list() returns all registered tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('tool_a'));
    registry.register(makeTool('tool_b'));

    const tools = registry.list();
    expect(tools).toHaveLength(2);
  });

  it('get() throws for unknown tool name', () => {
    const registry = new ToolRegistry();
    expect(() => registry.get('nonexistent')).toThrow('Tool not found');
  });

  it('prevents duplicate tool name registration', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('dup'));
    expect(() => registry.register(makeTool('dup'))).toThrow('Tool already registered');
  });

  it('getForNames() returns subset matching name array', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('a'));
    registry.register(makeTool('b'));
    registry.register(makeTool('c'));

    const subset = registry.getForNames(['a', 'c']);
    expect(subset).toHaveLength(2);
    expect(subset.map(t => t.name)).toEqual(['a', 'c']);
  });

  it('toAnthropicFormat() converts tool schemas', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('my_tool'));

    const formatted = registry.toAnthropicFormat();
    expect(formatted).toHaveLength(1);
    expect(formatted[0].name).toBe('my_tool');
    expect(formatted[0].input_schema).toHaveProperty('type', 'object');
    expect(formatted[0].input_schema).toHaveProperty('properties');
  });

  it('toOpenAIFormat() converts tool schemas', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('my_tool'));

    const formatted = registry.toOpenAIFormat();
    expect(formatted).toHaveLength(1);
    expect(formatted[0].type).toBe('function');
    expect(formatted[0].function.name).toBe('my_tool');
    expect(formatted[0].function.parameters).toHaveProperty('type', 'object');
  });

  it('unregister() removes a tool by name', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('removable'));

    expect(registry.has('removable')).toBe(true);
    const removed = registry.unregister('removable');
    expect(removed).toBe(true);
    expect(registry.has('removable')).toBe(false);
  });

  it('unregister() returns false for unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('getByPrefix() returns tools matching prefix', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('mcp/github/create_issue'));
    registry.register(makeTool('mcp/github/list_repos'));
    registry.register(makeTool('mcp/slack/send_message'));
    registry.register(makeTool('read_file'));

    const githubTools = registry.getByPrefix('mcp/github/');
    expect(githubTools).toHaveLength(2);
    expect(githubTools.map(t => t.name)).toContain('mcp/github/create_issue');
    expect(githubTools.map(t => t.name)).toContain('mcp/github/list_repos');
  });

  it('getByPrefix() returns empty array when no match', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('read_file'));

    expect(registry.getByPrefix('mcp/')).toEqual([]);
  });

  it('toAnthropicFormat() uses rawJsonSchema when present', () => {
    const registry = new ToolRegistry();
    const rawSchema = { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] };
    const tool: Tool = {
      name: 'mcp_tool',
      description: 'MCP tool',
      inputSchema: z.any(),
      rawJsonSchema: rawSchema,
      execute: async () => ({ content: 'ok' }),
    };
    registry.register(tool);

    const formatted = registry.toAnthropicFormat();
    expect(formatted[0].input_schema).toEqual(rawSchema);
  });

  it('toOpenAIFormat() uses rawJsonSchema when present', () => {
    const registry = new ToolRegistry();
    const rawSchema = { type: 'object', properties: { query: { type: 'string' } } };
    const tool: Tool = {
      name: 'mcp_search',
      description: 'MCP search',
      inputSchema: z.any(),
      rawJsonSchema: rawSchema,
      execute: async () => ({ content: 'results' }),
    };
    registry.register(tool);

    const formatted = registry.toOpenAIFormat();
    expect(formatted[0].function.parameters).toEqual(rawSchema);
  });
});
