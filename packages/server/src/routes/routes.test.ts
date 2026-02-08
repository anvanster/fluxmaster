import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { UsageTracker } from '../usage-tracker.js';
import { CostCalculator } from '../cost-calculator.js';
import { EventBus } from '@fluxmaster/core';
import { registerRoutes } from './index.js';
import { errorHandler } from '../middleware/error-handler.js';

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  const usageTracker = new UsageTracker();
  const agentModels = new Map([['default', 'gpt-4o']]);
  const pricing = { 'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 } };
  return {
    config: {
      auth: { preferDirectApi: false },
      agents: { defaults: { maxTokens: 8192, temperature: 0.7 }, list: [] },
      mcpServers: { global: [{ name: 'filesystem', transport: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] }] },
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      plugins: [{ package: 'test-plugin', config: {} }],
    },
    authManager: {
      getStatus: vi.fn().mockReturnValue({
        copilotConfigured: true,
        copilotReady: true,
        claudeCli: false,
        directProviders: ['anthropic'],
      }),
    } as any,
    agentManager: {
      spawnAgent: vi.fn().mockResolvedValue({
        config: { id: 'test', model: 'gpt-4o' },
        status: 'idle',
      }),
      listAgents: vi.fn().mockReturnValue([
        { id: 'default', model: 'gpt-4o', status: 'idle' },
      ]),
      killAgent: vi.fn(),
      routeMessage: vi.fn().mockResolvedValue({
        text: 'Hello!',
        usage: { inputTokens: 100, outputTokens: 50 },
        iterations: 1,
        allContent: [],
      }),
      getAgent: vi.fn().mockReturnValue({
        getHistory: vi.fn().mockReturnValue([]),
        clearHistory: vi.fn(),
      }),
    } as any,
    toolRegistry: {
      list: vi.fn().mockReturnValue([
        { name: 'read_file', description: 'Read a file' },
        { name: 'write_file', description: 'Write a file' },
      ]),
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'read_file') return { name: 'read_file', description: 'Read a file' };
        throw new Error(`Tool not found: ${name}`);
      }),
    } as any,
    mcpServerManager: {
      listRunning: vi.fn().mockReturnValue(['filesystem']),
      startServer: vi.fn().mockResolvedValue([{ name: 'filesystem/read_file' }]),
      stopServer: vi.fn().mockResolvedValue(undefined),
    } as any,
    usageTracker,
    eventBus: new EventBus(),
    costCalculator: new CostCalculator(usageTracker, pricing, agentModels),
    agentModels,
    agentProviders: new Map([['default', 'copilot' as const]]),
    databaseManager: { isOpen: true, close: vi.fn() } as any,
    conversationStore: {
      createConversation: vi.fn(),
      saveMessage: vi.fn(),
      getMessages: vi.fn().mockReturnValue([]),
      clearMessages: vi.fn(),
      listConversations: vi.fn().mockReturnValue([]),
      getConversation: vi.fn(),
      deleteConversation: vi.fn(),
      updateConversationTitle: vi.fn(),
    } as any,
    requestStore: {
      saveRequest: vi.fn(),
      updateRequest: vi.fn(),
      getRequest: vi.fn(),
      listRequests: vi.fn().mockReturnValue([]),
    } as any,
    toolAuditStore: {
      logToolCall: vi.fn(),
      getByAgent: vi.fn().mockReturnValue([]),
      getByTool: vi.fn().mockReturnValue([]),
      getDeniedCalls: vi.fn().mockReturnValue([]),
      pruneOldEntries: vi.fn().mockReturnValue(0),
    } as any,
    toolSecurityManager: {} as any,
    budgetStore: {
      logAlert: vi.fn(),
      getAlerts: vi.fn().mockReturnValue([]),
      getAllAlerts: vi.fn().mockReturnValue([]),
      hasTriggeredThreshold: vi.fn().mockReturnValue(false),
    } as any,
    budgetManager: {
      checkBudget: vi.fn().mockReturnValue({ allowed: true }),
      recordUsage: vi.fn(),
      getStatus: vi.fn().mockReturnValue([]),
    } as any,
    workflowStore: {
      saveDefinition: vi.fn(),
      getDefinition: vi.fn().mockReturnValue(undefined),
      listDefinitions: vi.fn().mockReturnValue([]),
      deleteDefinition: vi.fn(),
      saveRun: vi.fn(),
      updateRun: vi.fn(),
      getRun: vi.fn(),
      listRuns: vi.fn().mockReturnValue([]),
    } as any,
    workflowEngine: {
      startRun: vi.fn(),
      getRunStatus: vi.fn(),
    } as any,
    ...overrides,
  };
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await registerRoutes(app, ctx);
  return app;
}

// ---- Agents ----

describe('Agent routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  it('POST /api/agents — spawns agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents',
      payload: { id: 'test', model: 'gpt-4o', tools: [] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe('test');
    expect(body.model).toBe('gpt-4o');
    expect(body.status).toBe('idle');
  });

  it('POST /api/agents — rejects invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents',
      payload: { id: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/agents — lists agents', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/agents' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('default');
  });

  it('DELETE /api/agents/:id — kills agent', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/agents/default' });
    expect(res.statusCode).toBe(204);
    expect(ctx.agentManager.killAgent).toHaveBeenCalledWith('default');
  });

  it('POST /api/agents/:id/message — sends message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents/default/message',
      payload: { message: 'hello' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.text).toBe('Hello!');
    expect(body.usage.inputTokens).toBe(100);
  });

  it('POST /api/agents/:id/message — rejects empty message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents/default/message',
      payload: { message: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/agents/:id/history — returns history', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/agents/default/history' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.messages).toEqual([]);
  });

  it('DELETE /api/agents/:id/history — clears history', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/agents/default/history' });
    expect(res.statusCode).toBe(204);
  });

  it('POST /api/agents/:id/message — returns 429 when budget exceeded', async () => {
    ctx = createMockContext({
      budgetManager: {
        checkBudget: vi.fn().mockReturnValue({ allowed: false, reason: 'Global budget exceeded: $100.00 / $100.00' }),
        recordUsage: vi.fn(),
        getStatus: vi.fn().mockReturnValue([]),
      } as any,
    });
    app = await buildApp(ctx);

    const res = await app.inject({
      method: 'POST',
      url: '/api/agents/default/message',
      payload: { message: 'hello' },
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe('Budget exceeded');
    expect(res.json().reason).toContain('Global budget exceeded');
  });

  it('POST /api/agents/:id/message — tracks usage', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/agents/default/message',
      payload: { message: 'hello' },
    });
    const usage = ctx.usageTracker.getAgent('default');
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });
});

// ---- Tools ----

describe('Tool routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(createMockContext());
  });

  it('GET /api/tools — lists tools', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe('read_file');
  });

  it('GET /api/tools/:name — returns tool detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools/read_file' });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('read_file');
  });

  it('GET /api/tools/:name — 404 for unknown tool', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools/unknown' });
    expect(res.statusCode).toBe(404);
  });
});

// ---- MCP ----

describe('MCP routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  it('GET /api/mcp — lists configured and running servers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcp' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.configured).toHaveLength(1);
    expect(body.running).toEqual(['filesystem']);
  });

  it('POST /api/mcp/:name/start — starts server', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/mcp/filesystem/start' });
    expect(res.statusCode).toBe(200);
    expect(res.json().toolCount).toBe(1);
  });

  it('POST /api/mcp/:name/start — 404 for unknown server', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/mcp/unknown/start' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/mcp/:name/stop — stops server', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/mcp/filesystem/stop' });
    expect(res.statusCode).toBe(204);
    expect(ctx.mcpServerManager.stopServer).toHaveBeenCalledWith('filesystem');
  });
});

// ---- Auth ----

describe('Auth routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(createMockContext());
  });

  it('GET /api/auth/status — returns auth status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.copilotConfigured).toBe(true);
    expect(body.copilotReady).toBe(true);
    expect(body.claudeCli).toBe(false);
    expect(body.directProviders).toEqual(['anthropic']);
  });
});

// ---- Config ----

describe('Config routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(createMockContext());
  });

  it('GET /api/config — returns current config', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.auth).toBeDefined();
    expect(body.agents).toBeDefined();
  });

  it('GET /api/config/default — returns default config', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/config/default' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.agents).toBeDefined();
  });
});

// ---- System ----

describe('System routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  it('GET /api/system/health — returns health status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/system/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });

  it('GET /api/system/usage — returns usage stats', async () => {
    ctx.usageTracker.record('agent-1', 100, 50);
    const res = await app.inject({ method: 'GET', url: '/api/system/usage' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total.inputTokens).toBe(100);
    expect(body.byAgent['agent-1']).toBeDefined();
  });

  it('GET /api/system/cost — returns provider-aware cost breakdown', async () => {
    ctx.usageTracker.record('default', 1_000_000, 500_000);
    const res = await app.inject({ method: 'GET', url: '/api/system/cost' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // default agent uses copilot provider with gpt-4o (0x free model)
    expect(body.totalCost).toBeCloseTo(7.5); // dollar cost still calculated
    expect(body.totalPremiumRequests).toBe(0); // gpt-4o = 0x multiplier
    expect(body.byAgent['default']).toEqual({ amount: 0, unit: 'premium_requests' });
  });

  it('GET /api/system/models — returns available models', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/system/models' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const gpt4o = body.find((m: any) => m.id === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o.provider).toBe('openai');
    expect(gpt4o.premiumMultiplier).toBe(0);
    // Check an Anthropic model
    const sonnet = body.find((m: any) => m.id === 'claude-sonnet-4');
    expect(sonnet).toBeDefined();
    expect(sonnet.provider).toBe('anthropic');
    expect(sonnet.premiumMultiplier).toBe(1);
  });
});

// ---- Plugins ----

describe('Plugin routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(createMockContext());
  });

  it('GET /api/plugins — returns plugin list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/plugins' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].package).toBe('test-plugin');
  });
});
