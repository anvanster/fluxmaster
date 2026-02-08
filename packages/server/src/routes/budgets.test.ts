import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { budgetRoutes } from './budgets.js';
import { errorHandler } from '../middleware/error-handler.js';
import type { BudgetStatus, BudgetAlert } from '@fluxmaster/core';

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    budgetManager: {
      checkBudget: vi.fn().mockReturnValue({ allowed: true }),
      recordUsage: vi.fn(),
      getStatus: vi.fn().mockReturnValue([]),
    } as any,
    budgetStore: {
      logAlert: vi.fn(),
      getAlerts: vi.fn().mockReturnValue([]),
      getAllAlerts: vi.fn().mockReturnValue([]),
      hasTriggeredThreshold: vi.fn().mockReturnValue(false),
    } as any,
    ...overrides,
  } as AppContext;
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(budgetRoutes(ctx), { prefix: '/api/budgets' });
  return app;
}

describe('Budget routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  it('GET /api/budgets — returns all budget statuses', async () => {
    const statuses: BudgetStatus[] = [
      { id: 'global', period: 'monthly', unit: 'cost', maxCost: 1000, currentCost: 250, percentage: 0.25, exceeded: false, warningThresholds: [0.8, 0.9], triggeredThresholds: [] },
      { id: 'agent-1', period: 'daily', unit: 'cost', maxCost: 50, currentCost: 30, percentage: 0.6, exceeded: false, warningThresholds: [0.8], triggeredThresholds: [] },
    ];
    (ctx.budgetManager.getStatus as ReturnType<typeof vi.fn>).mockReturnValue(statuses);

    const res = await app.inject({ method: 'GET', url: '/api/budgets' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.budgets).toHaveLength(2);
    expect(body.budgets[0].id).toBe('global');
    expect(body.budgets[1].id).toBe('agent-1');
  });

  it('GET /api/budgets/:id — returns specific budget status', async () => {
    const status: BudgetStatus = {
      id: 'global', period: 'monthly', unit: 'cost', maxCost: 1000, currentCost: 800, percentage: 0.8, exceeded: false, warningThresholds: [0.8], triggeredThresholds: [0.8],
    };
    (ctx.budgetManager.getStatus as ReturnType<typeof vi.fn>).mockReturnValue([status]);

    const res = await app.inject({ method: 'GET', url: '/api/budgets/global' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.budgets).toHaveLength(1);
    expect(body.budgets[0].id).toBe('global');
    expect(body.budgets[0].percentage).toBe(0.8);
  });

  it('GET /api/budgets/:id — returns empty for unknown budget', async () => {
    (ctx.budgetManager.getStatus as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/budgets/unknown' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.budgets).toHaveLength(0);
  });

  it('GET /api/budgets/alerts — returns all alerts', async () => {
    const alerts: BudgetAlert[] = [
      { id: 'a1', budgetId: 'global', type: 'warning', unit: 'cost', threshold: 0.8, currentCost: 80, maxCost: 100, timestamp: new Date('2024-06-15T12:00:00Z') },
      { id: 'a2', budgetId: 'global', type: 'exceeded', unit: 'cost', threshold: 1, currentCost: 101, maxCost: 100, timestamp: new Date('2024-06-15T13:00:00Z') },
    ];
    (ctx.budgetStore.getAllAlerts as ReturnType<typeof vi.fn>).mockReturnValue(alerts);

    const res = await app.inject({ method: 'GET', url: '/api/budgets/alerts' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alerts).toHaveLength(2);
    expect(body.alerts[0].budgetId).toBe('global');
    expect(body.alerts[0].type).toBe('warning');
    expect(body.alerts[1].type).toBe('exceeded');
  });

  it('GET /api/budgets/alerts — respects limit parameter', async () => {
    const alerts: BudgetAlert[] = [
      { id: 'a1', budgetId: 'global', type: 'warning', unit: 'cost', threshold: 0.8, currentCost: 80, maxCost: 100, timestamp: new Date('2024-06-15T12:00:00Z') },
    ];
    (ctx.budgetStore.getAllAlerts as ReturnType<typeof vi.fn>).mockReturnValue(alerts);

    const res = await app.inject({ method: 'GET', url: '/api/budgets/alerts?limit=1' });
    expect(res.statusCode).toBe(200);
    expect(ctx.budgetStore.getAllAlerts).toHaveBeenCalledWith({ limit: 1 });
  });
});
