import type { AgentConfig, AgentStatus } from '@fluxmaster/core';
import { AgentNotFoundError, createChildLogger } from '@fluxmaster/core';
import type { AuthManager } from '@fluxmaster/auth';
import type { ToolRegistry } from '@fluxmaster/tools';
import { AgentWorker } from './agent-worker.js';
import { SessionManager } from './session/session-manager.js';
import type { ToolLoopResult } from './tool-loop.js';

const logger = createChildLogger('agent-manager');

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

  constructor(authManager: AuthManager, toolRegistry: ToolRegistry) {
    this.authManager = authManager;
    this.toolRegistry = toolRegistry;
    this.sessionManager = new SessionManager();
  }

  async spawnAgent(config: AgentConfig): Promise<AgentWorker> {
    if (this.workers.has(config.id)) {
      throw new Error(`Agent already exists: ${config.id}`);
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
