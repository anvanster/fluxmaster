import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { EventBus, type IToolAuditStore, type ToolAuditEntry } from '@fluxmaster/core';
import type { AppContext } from '../context.js';
import { UsageTracker } from '../usage-tracker.js';
import { CostCalculator } from '../cost-calculator.js';
import { errorHandler } from '../middleware/error-handler.js';
import { securityRoutes } from './security.js';

function createMockAuditStore(): IToolAuditStore {
  return {
    logToolCall: vi.fn(),
    getByAgent: vi.fn().mockReturnValue([]),
    getByTool: vi.fn().mockReturnValue([]),
    getDeniedCalls: vi.fn().mockReturnValue([]),
    pruneOldEntries: vi.fn().mockReturnValue(0),
  };
}

function createMockContext(auditStore: IToolAuditStore): AppContext {
  const usageTracker = new UsageTracker();
  return {
    config: {
      auth: { preferDirectApi: false },
      agents: { defaults: { maxTokens: 8192, temperature: 0.7 }, list: [] },
      mcpServers: { global: [] },
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      plugins: [],
      security: {
        defaultLevel: 'restricted',
        toolLevels: { bash_execute: 'dangerous' },
        agentPermissions: {},
      },
    } as any,
    authManager: {} as any,
    agentManager: {} as any,
    toolRegistry: {} as any,
    mcpServerManager: {} as any,
    usageTracker,
    eventBus: new EventBus(),
    costCalculator: new CostCalculator(usageTracker, {}, new Map()),
    databaseManager: { isOpen: true, close: vi.fn() } as any,
    conversationStore: {} as any,
    requestStore: {} as any,
    toolAuditStore: auditStore,
    toolSecurityManager: {} as any,
  } as any;
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(securityRoutes(ctx), { prefix: '/api/security' });
  return app;
}

const sampleEntry: ToolAuditEntry = {
  id: 'audit-1',
  agentId: 'agent-1',
  toolName: 'bash_execute',
  args: '{"command":"ls"}',
  result: 'denied',
  isError: false,
  permitted: false,
  denialReason: 'Tool is dangerous',
  durationMs: 0,
  timestamp: new Date('2024-01-01T00:00:00Z'),
};

describe('Security Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;
  let auditStore: IToolAuditStore;

  beforeEach(async () => {
    auditStore = createMockAuditStore();
    ctx = createMockContext(auditStore);
    app = await buildApp(ctx);
  });

  describe('GET /api/security/audit', () => {
    it('returns audit entries filtered by agentId', async () => {
      (auditStore.getByAgent as ReturnType<typeof vi.fn>).mockReturnValue([sampleEntry]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/audit?agentId=agent-1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.entries).toHaveLength(1);
      expect(auditStore.getByAgent).toHaveBeenCalledWith('agent-1', { limit: 50 });
    });

    it('returns audit entries filtered by toolName', async () => {
      (auditStore.getByTool as ReturnType<typeof vi.fn>).mockReturnValue([sampleEntry]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/audit?toolName=bash_execute',
      });

      expect(res.statusCode).toBe(200);
      expect(auditStore.getByTool).toHaveBeenCalledWith('bash_execute', { limit: 50 });
    });

    it('returns denied calls when permitted=false', async () => {
      (auditStore.getDeniedCalls as ReturnType<typeof vi.fn>).mockReturnValue([sampleEntry]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/audit?permitted=false',
      });

      expect(res.statusCode).toBe(200);
      expect(auditStore.getDeniedCalls).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  describe('GET /api/security/audit/:agentId', () => {
    it('returns per-agent audit log', async () => {
      (auditStore.getByAgent as ReturnType<typeof vi.fn>).mockReturnValue([sampleEntry]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/audit/agent-1?limit=10&offset=5',
      });

      expect(res.statusCode).toBe(200);
      expect(auditStore.getByAgent).toHaveBeenCalledWith('agent-1', { limit: 10, offset: 5 });
    });
  });

  describe('GET /api/security/denied', () => {
    it('returns recent denied calls', async () => {
      (auditStore.getDeniedCalls as ReturnType<typeof vi.fn>).mockReturnValue([sampleEntry]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/denied?limit=20',
      });

      expect(res.statusCode).toBe(200);
      expect(auditStore.getDeniedCalls).toHaveBeenCalledWith({ limit: 20 });
    });
  });

  describe('GET /api/security/policy', () => {
    it('returns current security policy', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/security/policy',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.policy.defaultLevel).toBe('restricted');
      expect(body.policy.toolLevels.bash_execute).toBe('dangerous');
    });
  });
});
