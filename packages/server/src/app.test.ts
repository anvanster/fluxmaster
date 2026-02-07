import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./bootstrap.js', () => ({
  bootstrap: vi.fn(),
  shutdown: vi.fn(),
}));

import { createApp } from './app.js';
import type { AppContext } from './context.js';
import { UsageTracker } from './usage-tracker.js';
import { CostCalculator } from './cost-calculator.js';
import { EventBus } from '@fluxmaster/core';

function createMockContext(): AppContext {
  return {
    config: {
      auth: { preferDirectApi: false },
      agents: { defaults: { maxTokens: 8192, temperature: 0.7 }, list: [] },
      mcpServers: { global: [] },
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      plugins: [],
    },
    authManager: {
      getStatus: vi.fn().mockReturnValue({
        copilotConfigured: false,
        copilotReady: false,
        claudeCli: false,
        directProviders: [],
      }),
    } as any,
    agentManager: {
      listAgents: vi.fn().mockReturnValue([]),
      routeMessageStream: vi.fn(),
    } as any,
    toolRegistry: {
      list: vi.fn().mockReturnValue([]),
      get: vi.fn(),
    } as any,
    mcpServerManager: {
      listRunning: vi.fn().mockReturnValue([]),
    } as any,
    usageTracker: new UsageTracker(),
    eventBus: new EventBus(),
    costCalculator: new CostCalculator(new UsageTracker(), {}, new Map()),
  };
}

describe('createApp', () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('creates a Fastify app with routes registered', async () => {
    const { app } = await createApp({ ctx });
    const res = await app.inject({ method: 'GET', url: '/api/system/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });

  it('responds to /api/agents', async () => {
    const { app } = await createApp({ ctx });
    const res = await app.inject({ method: 'GET', url: '/api/agents' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('returns WsHandler', async () => {
    const { app, wsHandler } = await createApp({ ctx });
    expect(wsHandler).toBeDefined();
    expect(wsHandler.connections).toBeDefined();
    await app.close();
  });
});
