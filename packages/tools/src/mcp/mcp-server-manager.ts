import type { Tool, McpServerConfig } from '@fluxmaster/core';
import { createChildLogger } from '@fluxmaster/core';
import type { ToolRegistry } from '../registry.js';
import { McpClient } from './mcp-client.js';

const logger = createChildLogger('mcp-server-manager');

interface ServerEntry {
  client: McpClient;
  toolNames: string[];
}

export class McpServerManager {
  private servers: Map<string, ServerEntry> = new Map();
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  async startServer(config: McpServerConfig): Promise<Tool[]> {
    if (this.servers.has(config.name)) {
      throw new Error(`MCP server already running: ${config.name}`);
    }

    const client = new McpClient();
    await client.connect(config);

    const tools = client.listTools();
    const toolNames: string[] = [];

    for (const tool of tools) {
      this.registry.register(tool);
      toolNames.push(tool.name);
    }

    this.servers.set(config.name, { client, toolNames });
    logger.info({ server: config.name, toolCount: tools.length }, 'MCP server started');

    return tools;
  }

  async stopServer(name: string): Promise<void> {
    const entry = this.servers.get(name);
    if (!entry) return;

    for (const toolName of entry.toolNames) {
      this.registry.unregister(toolName);
    }

    await entry.client.disconnect();
    this.servers.delete(name);
    logger.info({ server: name }, 'MCP server stopped');
  }

  getToolsForServer(name: string): Tool[] {
    const entry = this.servers.get(name);
    if (!entry) return [];
    return entry.toolNames.map(n => this.registry.get(n));
  }

  async stopAll(): Promise<void> {
    const names = Array.from(this.servers.keys());
    for (const name of names) {
      await this.stopServer(name);
    }
  }
}
