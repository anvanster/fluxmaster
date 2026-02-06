import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServerManager } from './mcp-server-manager.js';
import { ToolRegistry } from '../registry.js';
import type { McpServerConfig, Tool } from '@fluxmaster/core';
import { z } from 'zod';

// Mock McpClient
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockListTools = vi.fn();

vi.mock('./mcp-client.js', () => ({
  McpClient: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    listTools: mockListTools,
  })),
}));

function makeMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: z.any(),
    rawJsonSchema: { type: 'object' },
    execute: vi.fn().mockResolvedValue({ content: 'ok' }),
  };
}

describe('McpServerManager', () => {
  let registry: ToolRegistry;

  const serverConfig: McpServerConfig = {
    name: 'github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ToolRegistry();
    mockListTools.mockReturnValue([
      makeMockTool('github/create_issue'),
      makeMockTool('github/list_repos'),
    ]);
  });

  it('starts a server and registers its tools', async () => {
    const manager = new McpServerManager(registry);
    const tools = await manager.startServer(serverConfig);

    expect(mockConnect).toHaveBeenCalledWith(serverConfig);
    expect(tools).toHaveLength(2);
    expect(registry.has('github/create_issue')).toBe(true);
    expect(registry.has('github/list_repos')).toBe(true);
  });

  it('stops a server and unregisters its tools', async () => {
    const manager = new McpServerManager(registry);
    await manager.startServer(serverConfig);

    expect(registry.has('github/create_issue')).toBe(true);

    await manager.stopServer('github');

    expect(mockDisconnect).toHaveBeenCalled();
    expect(registry.has('github/create_issue')).toBe(false);
    expect(registry.has('github/list_repos')).toBe(false);
  });

  it('getToolsForServer returns tools for a specific server', async () => {
    const manager = new McpServerManager(registry);
    await manager.startServer(serverConfig);

    const tools = manager.getToolsForServer('github');
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('github/create_issue');
  });

  it('stopAll disconnects all servers', async () => {
    const manager = new McpServerManager(registry);

    // Start two servers
    mockListTools
      .mockReturnValueOnce([makeMockTool('github/create_issue')])
      .mockReturnValueOnce([makeMockTool('slack/send_message')]);

    await manager.startServer(serverConfig);
    await manager.startServer({
      name: 'slack',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
    });

    expect(registry.has('github/create_issue')).toBe(true);
    expect(registry.has('slack/send_message')).toBe(true);

    await manager.stopAll();

    expect(mockDisconnect).toHaveBeenCalledTimes(2);
    expect(registry.has('github/create_issue')).toBe(false);
    expect(registry.has('slack/send_message')).toBe(false);
  });

  it('throws when starting a server that is already running', async () => {
    const manager = new McpServerManager(registry);
    await manager.startServer(serverConfig);

    await expect(manager.startServer(serverConfig))
      .rejects.toThrow('MCP server already running: github');
  });
});
