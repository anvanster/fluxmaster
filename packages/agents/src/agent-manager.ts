import type { AgentConfig, AgentStatus, McpServerConfig } from '@fluxmaster/core';
import { AgentNotFoundError, createChildLogger } from '@fluxmaster/core';
import type { AuthManager } from '@fluxmaster/auth';
import type { ToolRegistry, McpServerManager } from '@fluxmaster/tools';
import { AgentWorker } from './agent-worker.js';
import { SessionManager } from './session/session-manager.js';
import type { ToolLoopResult } from './tool-loop.js';

const logger = createChildLogger('agent-manager');

export interface AgentManagerOptions {
  mcpServerManager?: McpServerManager;
  globalMcpServers?: McpServerConfig[];
}

export interface AgentInfo {
  id: string;
  model: string;
  status: AgentStatus;
}

export class AgentManager {
  private workers: Map<string, AgentWorker> = new Map();
  private authManager: AuthManager;
  private toolRegistry: ToolRegistry;
  private sessionManager: SessionManager;
  private mcpServerManager?: McpServerManager;
  private globalMcpServers: McpServerConfig[];

  constructor(authManager: AuthManager, toolRegistry: ToolRegistry, options?: AgentManagerOptions) {
    this.authManager = authManager;
    this.toolRegistry = toolRegistry;
    this.sessionManager = new SessionManager();
    this.mcpServerManager = options?.mcpServerManager;
    this.globalMcpServers = options?.globalMcpServers ?? [];
  }

  async initializeMcp(): Promise<void> {
    if (!this.mcpServerManager || this.globalMcpServers.length === 0) return;

    for (const serverConfig of this.globalMcpServers) {
      try {
        await this.mcpServerManager.startServer(serverConfig);
        logger.info({ server: serverConfig.name }, 'Global MCP server started');
      } catch (err) {
        logger.warn({ server: serverConfig.name, error: (err as Error).message }, 'Failed to start global MCP server');
      }
    }
  }

  async spawnAgent(config: AgentConfig): Promise<AgentWorker> {
    if (this.workers.has(config.id)) {
      throw new Error(`Agent already exists: ${config.id}`);
    }

    // Start agent-level MCP servers
    if (this.mcpServerManager && config.mcpServers && config.mcpServers.length > 0) {
      for (const serverConfig of config.mcpServers) {
        try {
          await this.mcpServerManager.startServer(serverConfig);
          logger.info({ agentId: config.id, server: serverConfig.name }, 'Agent MCP server started');
        } catch (err) {
          logger.warn({ agentId: config.id, server: serverConfig.name, error: (err as Error).message },
            'Failed to start agent MCP server');
        }
      }
    }

    const endpoint = await this.authManager.getEndpoint(config.model);
    const worker = new AgentWorker(config, endpoint, this.toolRegistry, this.sessionManager);
    this.workers.set(config.id, worker);

    logger.info({ agentId: config.id, model: config.model }, 'Agent spawned');
    return worker;
  }

  async routeMessage(agentId: string, message: string): Promise<ToolLoopResult> {
    const worker = this.workers.get(agentId);
    if (!worker) {
      throw new AgentNotFoundError(agentId);
    }
    return worker.process(message);
  }

  killAgent(agentId: string): void {
    const worker = this.workers.get(agentId);
    if (!worker) {
      throw new AgentNotFoundError(agentId);
    }
    worker.terminate();
    this.workers.delete(agentId);
    logger.info({ agentId }, 'Agent killed');
  }

  getAgent(agentId: string): AgentWorker | undefined {
    return this.workers.get(agentId);
  }

  listAgents(): AgentInfo[] {
    return Array.from(this.workers.entries()).map(([id, worker]) => ({
      id,
      model: worker.config.model,
      status: worker.status,
    }));
  }

  killAll(): void {
    for (const [id] of this.workers) {
      this.killAgent(id);
    }
  }
}
