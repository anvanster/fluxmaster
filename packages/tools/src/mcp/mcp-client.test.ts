import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpClient } from './mcp-client.js';
import type { McpServerConfig } from '@fluxmaster/core';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({
      tools: [
        {
          name: 'create_issue',
          description: 'Create a GitHub issue',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title'],
          },
        },
        {
          name: 'list_repos',
          description: 'List repositories',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }),
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Issue created' }],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe('McpClient', () => {
  const stdioConfig: McpServerConfig = {
    name: 'github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: 'test-token' },
  };

  const sseConfig: McpServerConfig = {
    name: 'remote',
    transport: 'sse',
    url: 'https://mcp.example.com/sse',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects with stdio transport', async () => {
    const client = new McpClient();
    await client.connect(stdioConfig);

    const tools = client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('github/create_issue');
    expect(tools[1].name).toBe('github/list_repos');
  });

  it('connects with SSE transport', async () => {
    const client = new McpClient();
    await client.connect(sseConfig);

    const tools = client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('remote/create_issue');
  });

  it('prefixes tool names with server name', async () => {
    const client = new McpClient();
    await client.connect(stdioConfig);

    const tools = client.listTools();
    for (const tool of tools) {
      expect(tool.name).toMatch(/^github\//);
    }
  });

  it('tools have rawJsonSchema set from MCP', async () => {
    const client = new McpClient();
    await client.connect(stdioConfig);

    const tools = client.listTools();
    expect(tools[0].rawJsonSchema).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['title'],
    });
  });

  it('tool execute calls MCP callTool', async () => {
    const client = new McpClient();
    await client.connect(stdioConfig);

    const tools = client.listTools();
    const result = await tools[0].execute({ title: 'Bug report' });

    expect(result.content).toBe('Issue created');
    expect(result.isError).toBeUndefined();
  });

  it('disconnects cleanly', async () => {
    const client = new McpClient();
    await client.connect(stdioConfig);
    await client.disconnect();

    expect(client.listTools()).toEqual([]);
  });
});
