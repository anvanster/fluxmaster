/**
 * E2E MCP Server Test
 *
 * Prerequisites: copilot-api proxy running on localhost:4141
 *   npx copilot-api@latest start --port 4141 --account-type individual
 *
 * Connects to @modelcontextprotocol/server-filesystem via stdio,
 * registers its tools, and has an agent (GPT-4o) use them.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry, McpClient } from '@fluxmaster/tools';
import type { ToolRegistry } from '@fluxmaster/tools';

const MODEL = 'gpt-4o';
const TIMEOUT = 30_000;

async function isProxyRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:4141/', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('E2E: MCP Server (filesystem)', async () => {
  const proxyAvailable = await isProxyRunning();
  if (!proxyAvailable) {
    it.skip('copilot-api proxy not running on :4141 — skipping e2e', () => {});
    return;
  }

  let authManager: AuthManager;
  let agentManager: AgentManager;
  let toolRegistry: ToolRegistry;
  let mcpClient: McpClient;
  let tmpDir: string;

  beforeAll(async () => {
    // Create temp dir with a known file
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-mcp-e2e-'));
    await fs.writeFile(path.join(tmpDir, 'test.txt'), 'Hello from MCP e2e test!');

    // Connect MCP filesystem server
    mcpClient = new McpClient();
    await mcpClient.connect({
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', tmpDir],
    });

    // Initialize auth and tools
    authManager = new AuthManager({
      copilot: { accountType: 'individual', port: 4141 },
      preferDirectApi: false,
    });
    await authManager.initialize();

    toolRegistry = createDefaultRegistry();

    // Register MCP tools in the registry
    for (const tool of mcpClient.listTools()) {
      toolRegistry.register(tool);
    }

    agentManager = new AgentManager(authManager, toolRegistry);
  }, TIMEOUT);

  afterAll(async () => {
    agentManager?.killAll();
    await mcpClient?.disconnect();
    await authManager?.shutdown();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('discovers filesystem tools from MCP server', () => {
    const tools = mcpClient.listTools();
    expect(tools.length).toBeGreaterThan(0);

    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('filesystem/read_file');
    expect(toolNames).toContain('filesystem/list_directory');
  });

  it('directly calls read_file via MCP', async () => {
    const result = await mcpClient.callTool('read_file', {
      path: path.join(tmpDir, 'test.txt'),
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('Hello from MCP e2e test!');
  }, TIMEOUT);

  it('directly calls list_directory via MCP', async () => {
    const result = await mcpClient.callTool('list_directory', {
      path: tmpDir,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('test.txt');
  }, TIMEOUT);

  it('agent uses MCP tools to read a file', async () => {
    await agentManager.spawnAgent({
      id: 'mcp-reader',
      model: MODEL,
      systemPrompt: [
        'You have access to filesystem tools prefixed with "filesystem/".',
        'When asked to read a file, use the filesystem/read_file tool.',
        'Return the file contents verbatim.',
      ].join(' '),
      tools: ['filesystem/read_file', 'filesystem/list_directory'],
      maxTokens: 256,
      temperature: 0,
    });

    const result = await agentManager.routeMessage(
      'mcp-reader',
      `Read the file at ${path.join(tmpDir, 'test.txt')} using the filesystem/read_file tool.`,
    );

    expect(result.text).toContain('Hello from MCP e2e test!');
    expect(result.iterations).toBeGreaterThanOrEqual(2); // tool_use round-trip
  }, TIMEOUT);
});
