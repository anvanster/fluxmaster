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

  it('GET /api/system/cost — returns cost breakdown', async () => {
    ctx.usageTracker.record('default', 1_000_000, 500_000);
    const res = await app.inject({ method: 'GET', url: '/api/system/cost' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // gpt-4o: input 1M * 2.5/1M + output 500K * 10/1M = 2.5 + 5.0 = 7.5
    expect(body.totalCost).toBeCloseTo(7.5);
    expect(body.byAgent['default']).toBeCloseTo(7.5);
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
