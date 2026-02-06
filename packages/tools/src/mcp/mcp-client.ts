import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Tool, ToolResult } from '@fluxmaster/core';
import type { McpServerConfig } from '@fluxmaster/core';
import { z } from 'zod';

export class McpClient {
  private client: Client | null = null;
  private tools: Tool[] = [];
  private serverName: string = '';

  async connect(config: McpServerConfig): Promise<void> {
    this.serverName = config.name;

    this.client = new Client({
      name: 'fluxmaster',
      version: '1.0.0',
    });

    let transport;
    if (config.transport === 'stdio') {
      transport = new StdioClientTransport({
        command: config.command!,
        args: config.args || [],
        env: { ...process.env as Record<string, string>, ...config.env },
      });
    } else {
      transport = new SSEClientTransport(new URL(config.url!));
    }

    await this.client.connect(transport);

    // Discover tools
    const result = await this.client.listTools();
    this.tools = result.tools.map(mcpTool => this.wrapTool(mcpTool));
  }

  private wrapTool(mcpTool: { name: string; description?: string; inputSchema?: Record<string, unknown> }): Tool {
    const prefixedName = `${this.serverName}/${mcpTool.name}`;
    const originalName = mcpTool.name;
    const rawSchema = mcpTool.inputSchema as Record<string, unknown> | undefined;
    const client = this;

    return {
      name: prefixedName,
      description: mcpTool.description || '',
      inputSchema: z.any(),
      rawJsonSchema: rawSchema,
      execute: (args: unknown): Promise<ToolResult> => {
        return client.callTool(originalName, args);
      },
    };
  }

  listTools(): Tool[] {
    return this.tools;
  }

  async callTool(name: string, args: unknown): Promise<ToolResult> {
    if (!this.client) {
      return { content: 'MCP client not connected', isError: true };
    }

    const result = await this.client.callTool({
      name,
      arguments: args as Record<string, unknown>,
    });

    // Extract text content from MCP response
    const content = Array.isArray(result.content)
      ? result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n')
      : String(result.content);

    return {
      content,
      isError: result.isError ? true : undefined,
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.tools = [];
  }
}
